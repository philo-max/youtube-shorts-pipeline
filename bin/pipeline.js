const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');
const csv = require('csv-parser');
require('dotenv').config();

// Try importing Remotion renderer and media-utils
let bundle, renderMedia, selectComposition;
try {
  ({ bundle } = require('@remotion/bundler'));
  ({ renderMedia, selectComposition } = require('@remotion/renderer'));
} catch (err) {
  console.error("Failed to load Remotion libraries. Make sure to run 'npm install' first.");
  process.exit(1);
}

// Configuration & Default Paths
const CSV_PATH = parseArg('--csv') || path.join('test-data', 'storyboard.csv');
const IMAGES_DIR = parseArg('--images') || path.join('test-data', 'images');
const OUTPUT_PATH = parseArg('--output') || path.join('out', 'video.mp4');
const CHECK_ONLY = hasArg('--check-only');
const FORCE_LOCAL_TTS = hasArg('--local-tts') || process.env.USE_LOCAL_TTS === 'true';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const WECOM_WEBHOOK_URL = process.env.WECOM_WEBHOOK_URL;

// Directories under public/ for Remotion's static server access
const PUBLIC_DIR = path.resolve('public');
const TEMP_AUDIO_DIR = path.join(PUBLIC_DIR, 'temp', 'audio');
const TEMP_IMAGES_DIR = path.join(PUBLIC_DIR, 'temp', 'images');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');

// Helper to parse CLI arguments
function parseArg(flag) {
  const index = process.argv.indexOf(flag);
  return index > -1 && process.argv[index + 1] ? process.argv[index + 1] : null;
}

function hasArg(flag) {
  return process.argv.indexOf(flag) > -1;
}

// Send Webhook alert
async function sendNotification(isSuccess, message, details = '') {
  if (!WECOM_WEBHOOK_URL) {
    console.log(`[Notification (Simulated)] Status: ${isSuccess ? 'SUCCESS' : 'FAILED'} | Message: ${message}`);
    return;
  }

  const payload = {
    msgtype: 'markdown',
    markdown: {
      content: `### 🎬 真相库短视频流水线通知\n` +
               `**状态**: ${isSuccess ? '✅ 渲染成功' : '❌ 任务失败'}\n` +
               `**信息**: ${message}\n` +
               (details ? `**详情**:\n> ${details}\n` : '') +
               `**时间**: ${new Date().toLocaleString()}`
    }
  };

  try {
    await axios.post(WECOM_WEBHOOK_URL, payload);
    console.log('[Notification] Webhook notification sent successfully.');
  } catch (err) {
    console.error(`[Notification] Failed to send webhook: ${err.message}`);
  }
}

// Ensure required directories exist
function ensureDirectories() {
  fs.mkdirSync(TEMP_AUDIO_DIR, { recursive: true });
  fs.mkdirSync(TEMP_IMAGES_DIR, { recursive: true });
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
}

// Copy default assets (logo, BGM) into public/assets
function copyDefaultAssets() {
  const defaultBgm = process.env.DEFAULT_BGM_PATH || 'assets/bgm.mp3';
  const defaultLogo = process.env.DEFAULT_LOGO_PATH || 'assets/logo.png';

  if (fs.existsSync(defaultBgm)) {
    fs.copyFileSync(defaultBgm, path.join(ASSETS_DIR, 'bgm.mp3'));
  } else {
    console.warn(`[Assets] Warning: Background music not found at ${defaultBgm}. Generating blank space.`);
  }

  if (fs.existsSync(defaultLogo)) {
    fs.copyFileSync(defaultLogo, path.join(ASSETS_DIR, 'logo.png'));
  } else {
    console.warn(`[Assets] Warning: Channel logo not found at ${defaultLogo}.`);
  }
}

// Robust mapping of CSV headers (Chinese and English fallbacks)
function mapCSVRow(row) {
  const keys = Object.keys(row);
  const idKey = keys.find(k => k.includes('编号') || k.toLowerCase().includes('id'));
  const textKey = keys.find(k => k.includes('台词') || k.includes('文案') || k.toLowerCase().includes('text') || k.toLowerCase().includes('script') || k.toLowerCase().includes('subtitles'));
  const imgKey = keys.find(k => k.includes('图片') || k.toLowerCase().includes('image') || k.toLowerCase().includes('pic'));

  if (!idKey || !textKey || !imgKey) {
    throw new Error(`CSV headers mismatch. Found columns: [${keys.join(', ')}]. Must contain columns for Shot ID, Text/Script, and Image File.`);
  }

  return {
    id: row[idKey] ? row[idKey].trim() : '',
    text: row[textKey] ? row[textKey].trim() : '',
    image: row[imgKey] ? row[imgKey].trim() : ''
  };
}

// Parse CSV into storyboard items
function parseStoryboard() {
  return new Promise((resolve, reject) => {
    const items = [];
    if (!fs.existsSync(CSV_PATH)) {
      return reject(new Error(`CSV storyboard file not found at: ${CSV_PATH}`));
    }

    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (row) => {
        try {
          items.push(mapCSVRow(row));
        } catch (e) {
          reject(e);
        }
      })
      .on('end', () => {
        resolve(items);
      })
      .on('error', reject);
  });
}

// Validate that images exist
function validateMaterials(storyboardItems) {
  const missingImages = [];
  const validItems = [];

  for (const item of storyboardItems) {
    if (!item.id || !item.text) continue; // skip empty lines

    const imagePath = path.join(IMAGES_DIR, item.image);
    if (!fs.existsSync(imagePath)) {
      missingImages.push({ id: item.id, file: item.image });
    } else {
      // Copy image to public temp directory
      const extension = path.extname(item.image) || '.jpg';
      const destinationName = `image_${item.id}${extension}`;
      fs.copyFileSync(imagePath, path.join(TEMP_IMAGES_DIR, destinationName));
      
      validItems.push({
        ...item,
        localImagePath: `temp/images/${destinationName}`
      });
    }
  }

  if (missingImages.length > 0) {
    const details = missingImages.map(m => `镜头 ${m.id}: 缺少图片素材 "${m.file}"`).join('\n');
    throw new Error(`素材完整性校验失败：有 ${missingImages.length} 个镜头缺少图片素材。\n${details}`);
  }

  return validItems;
}

// Local Speech Synthesis for Windows (SAPI TTS) - Offline & free fallback
function generateLocalTTS(text, outputAudioPath) {
  const wavePath = path.resolve(outputAudioPath);
  
  // SAPI.SpVoice COM Object is built into Windows
  const psCommand = `
    $speech = New-Object -ComObject SAPI.SpVoice;
    $stream = New-Object -ComObject SAPI.SpFileStream;
    $stream.Open('${wavePath.replace(/'/g, "''")}', 3, $false);
    $speech.AudioOutputStream = $stream;
    $speech.Speak('${text.replace(/'/g, "''")}');
    $stream.Close();
  `.trim().replace(/\n/g, ' ');

  try {
    execSync(`powershell -Command "${psCommand}"`, { stdio: 'ignore' });
  } catch (err) {
    throw new Error(`Local Windows TTS generation failed: ${err.message}`);
  }
}

// ElevenLabs Voice Synthesis (API call)
async function generateElevenLabsTTS(text, outputAudioPath) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API Key is missing. Add ELEVENLABS_API_KEY to your .env file or use local TTS fallback.");
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
  
  try {
    const response = await axios({
      method: 'POST',
      url: url,
      headers: {
        'accept': 'audio/mpeg',
        'content-type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      data: {
        text: text,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      },
      responseType: 'arraybuffer'
    });

    fs.writeFileSync(outputAudioPath, Buffer.from(response.data));
  } catch (err) {
    let details = err.message;
    if (err.response && err.response.data) {
      try {
        const errObj = JSON.parse(Buffer.from(err.response.data).toString());
        details = errObj.detail ? errObj.detail.message : JSON.stringify(errObj);
      } catch (_) {}
    }
    throw new Error(`ElevenLabs TTS failed: ${details}`);
  }
}

// Generate all audio assets
async function generateAudios(items) {
  const audioList = [];

  for (const item of items) {
    const isWav = FORCE_LOCAL_TTS;
    const extension = isWav ? '.wav' : '.mp3';
    const audioFileName = `audio_${item.id}${extension}`;
    const outputAudioPath = path.join(TEMP_AUDIO_DIR, audioFileName);
    const relativeAudioPath = `temp/audio/${audioFileName}`;

    // Caching check: skip generation if the file already exists
    if (fs.existsSync(outputAudioPath)) {
      console.log(`[TTS] Using cached audio for shot ${item.id}`);
    } else {
      console.log(`[TTS] Generating audio for shot ${item.id} (${FORCE_LOCAL_TTS ? 'Local TTS' : 'ElevenLabs'})...`);
      if (FORCE_LOCAL_TTS) {
        generateLocalTTS(item.text, outputAudioPath);
      } else {
        await generateElevenLabsTTS(item.text, outputAudioPath);
      }
    }

    audioList.push({
      ...item,
      localAudioPath: relativeAudioPath,
      absoluteAudioPath: outputAudioPath
    });
  }

  return audioList;
}

// Measure durations of each generated audio file
async function measureAudioDurations(items) {
  const processed = [];
  for (const item of items) {
    try {
      const duration = await getAudioDuration(item.absoluteAudioPath);
      processed.push({
        id: item.id,
        text: item.text,
        imagePath: item.localImagePath,
        audioPath: item.localAudioPath,
        durationInSeconds: duration + 0.3 // Add a brief 300ms buffer for smoother transitions
      });
    } catch (err) {
      throw new Error(`Failed to measure duration of audio for shot ${item.id}: ${err.message}`);
    }
  }
  return processed;
}

// Get duration of audio file (WAV header parser and Windows COM fallbacks)
async function getAudioDuration(filePath) {
  // Windows Media Player COM Object (works for MP3 & WAV on Windows, very reliable)
  const absPath = path.resolve(filePath);
  const psCommand = `
    $wmp = New-Object -ComObject WMPlayer.OCX;
    $media = $wmp.newMedia('${absPath.replace(/'/g, "''")}');
    $media.duration;
  `.trim().replace(/\n/g, ' ');

  try {
    const output = execSync(`powershell -Command "${psCommand}"`, { encoding: 'utf8' }).trim();
    const duration = parseFloat(output);
    if (!isNaN(duration) && duration > 0) {
      console.log(`[Duration] WMPlayer COM parsed duration: ${duration.toFixed(2)}s`);
      return duration;
    }
  } catch (err) {
    // fallback
  }

  // Fast WAV header fallback for standard PCM WAV files
  if (filePath.endsWith('.wav')) {
    try {
      const buffer = fs.readFileSync(filePath);
      const byteRate = buffer.readUInt32LE(28);
      const subChunk2Size = buffer.readUInt32LE(40);
      if (byteRate > 0 && subChunk2Size > 0) {
        const duration = subChunk2Size / byteRate;
        if (duration > 0 && duration < 3600) { // must be less than 1 hour to avoid weird header errors
          console.log(`[Duration] WAV header parsed duration: ${duration.toFixed(2)}s`);
          return duration;
        }
      }
    } catch (e) {
      // fallback
    }
  }

  throw new Error(`无法获取音频时长: ${filePath}`);
}

// Main execution loop
async function run() {
  const startTime = Date.now();
  console.log('🚀 Starting Automated Shorts Pipeline...');
  
  try {
    ensureDirectories();
    copyDefaultAssets();

    // 1. Parsing CSV
    console.log('[Step 1/5] Parsing CSV storyboard...');
    const rawItems = await parseStoryboard();
    console.log(`Parsed ${rawItems.length} shots from CSV.`);

    // 2. Validate Images
    console.log('[Step 2/5] Performing completeness check on images...');
    const validatedItems = validateMaterials(rawItems);
    console.log('Completeness check passed. All images are available.');

    if (CHECK_ONLY) {
      console.log('Check-only mode active. Skipping TTS and video rendering.');
      process.exit(0);
    }

    // 3. Generate Audio via ElevenLabs or Local SAPI
    console.log('[Step 3/5] Generating voiceover audio...');
    const itemWithAudios = await generateAudios(validatedItems);

    // 4. Measure audio and construct Input Props JSON
    console.log('[Step 4/5] Measuring audio durations...');
    const finalShots = await measureAudioDurations(itemWithAudios);
    
    const inputProps = {
      title: process.env.VIDEO_TITLE || path.basename(CSV_PATH, '.csv'),
      introDurationInSeconds: 3,
      outroDurationInSeconds: 5,
      bgmPath: fs.existsSync(path.join(ASSETS_DIR, 'bgm.mp3')) ? 'assets/bgm.mp3' : '',
      logoPath: fs.existsSync(path.join(ASSETS_DIR, 'logo.png')) ? 'assets/logo.png' : '',
      shots: finalShots
    };

    // Write input props to public/temp/input.json for reference
    fs.writeFileSync(
      path.join(PUBLIC_DIR, 'temp', 'input.json'),
      JSON.stringify(inputProps, null, 2)
    );

    // 5. Bundle & Render Remotion video
    console.log('[Step 5/5] Compiling and rendering video with Remotion...');
    const entry = path.resolve('src/index.ts');
    
    console.log('Bundling Remotion project...');
    const bundleLocation = await bundle(entry);

    console.log('Selecting Remotion composition...');
    const comps = await selectComposition({
      serveUrl: bundleLocation,
      id: 'ShortsTemplate',
      inputProps,
    });

    console.log(`Video composition loaded. Total frames: ${comps.durationInFrames} (${(comps.durationInFrames / comps.fps).toFixed(1)} seconds)`);

    console.log('Rendering video frames (MP4)...');
    await renderMedia({
      composition: comps,
      serveUrl: bundleLocation,
      outputLocation: path.resolve(OUTPUT_PATH),
      inputProps,
      codec: 'h264',
      onProgress: ({ progress }) => {
        const pct = (progress * 100).toFixed(0);
        process.stdout.write(`Rendering Progress: ${pct}%\r`);
      }
    });
    console.log('\nVideo rendered successfully!');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✨ Completed successfully in ${elapsed} seconds.`);
    console.log(`Output Video Path: ${path.resolve(OUTPUT_PATH)}`);

    // Send Webhook notification
    await sendNotification(
      true, 
      `短视频渲染成功！成片已输出。`, 
      `**成片路径**: \`${path.resolve(OUTPUT_PATH)}\`\n**视频时长**: \`${(comps.durationInFrames / comps.fps).toFixed(1)} 秒\`\n**渲染耗时**: \`${elapsed} 秒\``
    );

  } catch (error) {
    console.error('❌ Pipeline failed with error:', error.message);
    
    // Send failure webhook notification
    await sendNotification(
      false,
      `视频自动化渲染流水线异常中断。`,
      `**错误原因**:\n${error.message}`
    );
    process.exit(1);
  }
}

run();

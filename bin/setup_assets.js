const fs = require('fs');
const path = require('path');

// Target paths
const LOGO_SRC = "C:/Users/Tismi/.gemini/antigravity-ide/brain/e4e62c56-43b2-4400-82db-2431f4ceddcd/truth_library_logo_1782826768822.png";
const IMG1_SRC = "C:/Users/Tismi/.gemini/antigravity-ide/brain/e4e62c56-43b2-4400-82db-2431f4ceddcd/ancient_library_test_1782826787663.png";
const IMG2_SRC = "C:/Users/Tismi/.gemini/antigravity-ide/brain/e4e62c56-43b2-4400-82db-2431f4ceddcd/mars_artifact_test_1782826802962.png";
const IMG3_SRC = "C:/Users/Tismi/.gemini/antigravity-ide/brain/e4e62c56-43b2-4400-82db-2431f4ceddcd/cyberpunk_city_test_1782826826136.png";

const ASSETS_DIR = path.resolve('assets');
const IMAGES_DIR = path.resolve('test-data/images');
const TEST_DATA_DIR = path.resolve('test-data');

function setup() {
  console.log('Starting assets setup...');

  // Ensure directories exist
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  // 1. Copy generated images
  console.log('Copying logo and image assets...');
  if (fs.existsSync(LOGO_SRC)) fs.copyFileSync(LOGO_SRC, path.join(ASSETS_DIR, 'logo.png'));
  if (fs.existsSync(IMG1_SRC)) fs.copyFileSync(IMG1_SRC, path.join(IMAGES_DIR, '1.jpg'));
  if (fs.existsSync(IMG2_SRC)) fs.copyFileSync(IMG2_SRC, path.join(IMAGES_DIR, '2.jpg'));
  if (fs.existsSync(IMG3_SRC)) fs.copyFileSync(IMG3_SRC, path.join(IMAGES_DIR, '3.jpg'));

  // 2. Generate silent background music WAV file
  console.log('Generating silent background music (WAV)...');
  const bgmPath = path.join(ASSETS_DIR, 'bgm.mp3');
  createSilentWav(bgmPath, 60); // 60 seconds silence

  // 3. Generate storyboard CSV
  console.log('Writing test storyboard.csv...');
  const csvContent = 
`镜头编号,解说台词,图片文件名
1,"今天我们来揭秘古老图书馆的第一个秘密，据说这里保存着世界上所有的禁忌真相。",1.jpg
2,"随后我们在火星表面发现了一个神秘的红色发光装置，它所蕴含的力量完全超越了人类现有的科技认知。",2.jpg
3,"而在霓虹闪烁的未来都市中，无数人为了寻找这两份真相而汇聚在雨夜的街头，故事才刚刚开始。",3.jpg
`;
  fs.writeFileSync(path.join(TEST_DATA_DIR, 'storyboard.csv'), csvContent.trim(), 'utf8');

  console.log('Assets setup completed successfully.');
}

function createSilentWav(filePath, durationSeconds) {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const subChunk2Size = sampleRate * numChannels * (bitsPerSample / 8) * durationSeconds;
  const chunkSize = 36 + subChunk2Size;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20);  // AudioFormat (PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(subChunk2Size, 40);

  const pcmData = Buffer.alloc(subChunk2Size); // fill with 0 (silence)
  const fileBuffer = Buffer.concat([header, pcmData]);
  fs.writeFileSync(filePath, fileBuffer);
}

setup();

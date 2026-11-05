'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {bundle} = require('@remotion/bundler');
const {selectComposition, renderMedia} = require('@remotion/renderer');
const {validateStoryboard} = require('./schema');
const {buildTimeline} = require('./timeline');

async function main() {
 const file = path.resolve(process.argv[2] || 'mangaflow/example.storyboard.json');
 const output = path.resolve(process.argv[3] || 'out/mangaflow.mp4');
 const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'mangaflow-'));
 try {
 const board = validateStoryboard(JSON.parse(fs.readFileSync(file,'utf8')));
 const shots = board.shots.map(shot=>({
  ...shot, visual: {...shot.visual,
   imagePath: shot.visual.imagePath ? stage(shot.visual.imagePath, shot.id, 'image', workspace, path.dirname(file)) : undefined,
   videoPath: shot.visual.videoPath ? stage(shot.visual.videoPath, shot.id, 'video', workspace, path.dirname(file)) : undefined
  },
  audioPath: shot.audioPath ? stage(shot.audioPath, shot.id, 'audio', workspace, path.dirname(file)) : undefined
 }));
 const props = {title:board.title || 'MangaFlow Studio',shots,transitionFrames:10};
 const timeline = buildTimeline({shots},30,10);
 console.log('Shots:',shots.length,'frames:',timeline.durationInFrames);
 fs.mkdirSync(path.dirname(output),{recursive:true});
 const serveUrl = await bundle({entryPoint:path.resolve(__dirname,'..','src','index.ts'),publicDir:workspace});
 const composition = await selectComposition({serveUrl,id:'MangaFlow',inputProps:props});
 await renderMedia({serveUrl,composition,inputProps:props,outputLocation:output,codec:'h264'});
 console.log('Exported:',output);
 } finally {
  fs.rmSync(workspace,{recursive:true,force:true,maxRetries:3,retryDelay:200});
 }
}
function stage(input,id,kind,workspace,baseDir) {
 const candidates = path.isAbsolute(input) ? [path.resolve(input)] : [path.resolve(baseDir,input),path.resolve(process.cwd(),input)];
 const full = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || candidates[0];
 if (!fs.existsSync(full) || !fs.statSync(full).isFile()) throw new Error('Missing '+kind+': '+full);
 const destDir = path.join(workspace,'mangaflow-assets');
 fs.mkdirSync(destDir,{recursive:true});
 const ext = path.extname(full).toLowerCase();
 const safeId = id.replace(/[^a-zA-Z0-9_-]/g,'_');
 const crypto = require('node:crypto');
 const digest = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex').slice(0,16);
 const filename = kind+'-'+safeId+'-'+digest+ext;
 fs.copyFileSync(full,path.join(destDir,filename));
 return 'mangaflow-assets/'+filename;
}
main().catch(e=>{console.error(e);process.exitCode=1});

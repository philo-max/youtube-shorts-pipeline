'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {app, ipcMain} = require('electron');
const {validateStoryboard} = require('../mangaflow/schema');

function registerMangaFlowIpc({onProgress = () => {}} = {}) {
 const root = path.join(app.getPath('userData'), 'mangaflow');
 const projectDir = path.join(root, 'projects');
 const outputDir = path.join(root, 'exports');
 fs.mkdirSync(projectDir, {recursive:true});
 fs.mkdirSync(outputDir, {recursive:true});
 const safeId = id => {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error('Invalid project ID');
  return id;
 };
 const projectFile = id => path.join(projectDir, safeId(id) + '.json');
 ipcMain.handle('mangaflow:list-projects', () => fs.readdirSync(projectDir).filter(x=>x.endsWith('.json')).map(x=>x.slice(0,-5)));
 ipcMain.handle('mangaflow:load-project', (_event,id) => JSON.parse(fs.readFileSync(projectFile(id),'utf8')));
 ipcMain.handle('mangaflow:save-project', (_event,id,board) => {
  validateStoryboard(board);
  const dest = projectFile(id);
  const tmp = dest + '.tmp';
  fs.writeFileSync(tmp,JSON.stringify(board,null,2),'utf8');
  fs.renameSync(tmp,dest);
  return {id};
 });
 let active = null;
 ipcMain.handle('mangaflow:render-project', (_event,id) => {
  if (active) throw new Error('Another render is in progress');
  const input = projectFile(id);
  if (!fs.existsSync(input)) throw new Error('Project not found');
  const output = path.join(outputDir,safeId(id)+'.mp4');
  const script = path.join(__dirname,'..','mangaflow','render.js');
  // Electron's bundled Node runtime can run a Node script with this flag.
  // Production packaging must unpack the renderer and test Remotion native dependencies.
  const env = {...process.env,ELECTRON_RUN_AS_NODE:'1'};
  const child = spawn(process.execPath,[script,input,output],{cwd:path.join(__dirname,'..'),env,windowsHide:true});
  active = child;
  onProgress({status:'running',id});
  child.stdout.on('data',chunk=>onProgress({status:'log',id,message:String(chunk).slice(0,2000)}));
  child.stderr.on('data',chunk=>onProgress({status:'error-log',id,message:String(chunk).slice(0,2000)}));
  child.on('error',err=>{active=null;onProgress({status:'failed',id,message:err.message})});
  child.on('close',code=>{active=null;onProgress({status:code===0?'completed':'failed',id,output:code===0?output:undefined,exitCode:code})});
  return {started:true,id};
 });
 ipcMain.handle('mangaflow:cancel-render', () => {
  if (!active) return false;
  active.kill();
  return true;
 });
}
module.exports={registerMangaFlowIpc};

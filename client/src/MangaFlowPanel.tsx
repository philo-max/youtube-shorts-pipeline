import React, {useEffect, useState} from 'react';

type Shot = {id:string;durationSeconds:number;dialogue?:{text?:string;speakerId?:string};visual:{mode:'motion_comic'|'image_to_video'|'video_import';imagePath?:string;videoPath?:string}};
type Board = {version:number;title:string;shots:Shot[]};
type Bridge = {
 listProjects:()=>Promise<string[]>;
 loadProject:(id:string)=>Promise<Board>;
 saveProject:(id:string,board:Board)=>Promise<unknown>;
 renderProject:(id:string)=>Promise<unknown>;
 cancelRender:()=>Promise<boolean>;
 onRenderEvent:(cb:(event:{status:string;message?:string;output?:string})=>void)=>()=>void;
};
const bridge = ():Bridge|undefined => (window as unknown as {electronAPI?:{mangaFlow?:Bridge}}).electronAPI?.mangaFlow;
const sample = ():Board => ({version:1,title:'新漫剧',shots:[{id:'shot_001',durationSeconds:4,dialogue:{speakerId:'narrator',text:'故事从这里开始。'},visual:{mode:'motion_comic',imagePath:'test-data/images/1.jpg'}}]});
export function MangaFlowPanel(){
 const [id,setId]=useState('demo');
 const [projects,setProjects]=useState<string[]>([]);
 const [board,setBoard]=useState<Board>(sample);
 const [status,setStatus]=useState('待命');
 const api=bridge();
 useEffect(()=>{if(!api)return;void api.listProjects().then(setProjects).catch(e=>setStatus(String(e)));return api.onRenderEvent(e=>setStatus(e.message||e.output||e.status));},[]);
 const run=async(action:()=>Promise<unknown>)=>{try{await action();setStatus('操作已提交');}catch(e){setStatus(String(e));}};
 if(!api)return <div style={{padding:24}}>MangaFlow 桌面工作台需要在 Electron 中运行。</div>;
 return <main style={{padding:24,color:'#eee',background:'#15151b',minHeight:'100vh',fontFamily:'sans-serif'}}>
  <h1>MangaFlow Studio</h1>
  <label>项目 ID <input value={id} onChange={e=>setId(e.target.value)} /></label>
  <button onClick={()=>run(async()=>{const result=await api.loadProject(id);setBoard(result);})}>读取</button>
  <button onClick={()=>run(async()=>{await api.saveProject(id,board);setProjects(await api.listProjects());})}>保存</button>
  <button onClick={()=>run(()=>api.renderProject(id))}>渲染 MP4</button>
  <button onClick={()=>run(()=>api.cancelRender())}>取消渲染</button>
  <p>已有项目：{projects.join('、')||'暂无'}</p>
  <label>标题 <input value={board.title} onChange={e=>setBoard({...board,title:e.target.value})}/></label>
  {board.shots.map((shot,i)=><section key={shot.id} style={{border:'1px solid #555',padding:12,marginTop:12}}>
   <strong>镜头 {i+1}：{shot.id}</strong>
   <select value={shot.visual.mode} onChange={e=>setBoard({...board,shots:board.shots.map((s,j)=>j===i?{...s,visual:{...s.visual,mode:e.target.value as Shot['visual']['mode']}}:s)})}>
    <option value="motion_comic">动态漫画</option><option value="image_to_video">图生视频</option><option value="video_import">导入视频</option>
   </select>
   <input aria-label="镜头时长" type="number" min="0.1" step="0.1" value={shot.durationSeconds} onChange={e=>setBoard({...board,shots:board.shots.map((s,j)=>j===i?{...s,durationSeconds:Number(e.target.value)}:s)})}/>
   <input aria-label="图片路径" placeholder="图片路径" value={shot.visual.imagePath||''} onChange={e=>setBoard({...board,shots:board.shots.map((s,j)=>j===i?{...s,visual:{...s.visual,imagePath:e.target.value}}:s)})}/>
   <input aria-label="视频路径" placeholder="视频路径（可选）" value={shot.visual.videoPath||''} onChange={e=>setBoard({...board,shots:board.shots.map((s,j)=>j===i?{...s,visual:{...s.visual,videoPath:e.target.value}}:s)})}/>
   <textarea aria-label="台词" value={shot.dialogue?.text||''} onChange={e=>setBoard({...board,shots:board.shots.map((s,j)=>j===i?{...s,dialogue:{...s.dialogue,text:e.target.value}}:s)})}/>
  </section>)}
  <button onClick={()=>setBoard({...board,shots:[...board.shots,{id:'shot_'+String(Date.now()),durationSeconds:4,dialogue:{text:''},visual:{mode:'motion_comic',imagePath:''}}]})}>添加镜头</button>
  <p role="status">状态：{status}</p>
 </main>;
}

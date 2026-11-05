import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {makeTimeline} from './timeline';
import type {MangaProps, MangaShot} from './types';

const source = (path: string) => /^(https?:|data:|blob:)/.test(path) ? path : staticFile(path.replace(/^\/+/, ''));

const ShotVisual: React.FC<{shot: MangaShot; durationFrames: number; overlapFrames: number}> = ({shot, durationFrames, overlapFrames}) => {
 const frame = useCurrentFrame();
 const hasVideo = shot.visual.mode !== 'motion_comic' && !!shot.visual.videoPath;
 const opacity = overlapFrames > 0 ? interpolate(frame, [0, overlapFrames], [0, 1], {extrapolateLeft:'clamp',extrapolateRight:'clamp'}) : 1;
 const scale = interpolate(frame, [0, durationFrames], [1, 1.08], {extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 return <AbsoluteFill style={{backgroundColor:'#111', opacity, overflow:'hidden'}}>
  {hasVideo ? <OffthreadVideo src={source(shot.visual.videoPath!)} style={{width:'100%',height:'100%',objectFit:'cover'}}/> :
   shot.visual.imagePath ? <Img src={source(shot.visual.imagePath)} style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${scale})`}}/> : null}
  {shot.audioPath ? <Audio src={source(shot.audioPath)}/> : null}
  {shot.dialogue?.text ? <div style={{position:'absolute',bottom:100,left:'8%',right:'8%',textAlign:'center',fontSize:48,fontWeight:700,color:'#fff',textShadow:'0 3px 12px #000',fontFamily:'sans-serif'}}>{shot.dialogue.text}</div> : null}
 </AbsoluteFill>;
};

export const MangaFlowComposition: React.FC<MangaProps> = ({shots, transitionFrames = 10}) => {
 const {fps} = useVideoConfig();
 const timeline = makeTimeline(shots, fps, transitionFrames);
 return <AbsoluteFill style={{backgroundColor:'#000'}}>{timeline.map(({shot,startFrame,durationFrames,overlapFrames}) =>
  <Sequence key={shot.id} from={startFrame} durationInFrames={durationFrames} layout="none">
   <ShotVisual shot={shot} durationFrames={durationFrames} overlapFrames={overlapFrames}/>
  </Sequence>)}</AbsoluteFill>;
};

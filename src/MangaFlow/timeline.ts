import type {MangaShot} from './types';
export function makeTimeline(shots: MangaShot[], fps: number, transitionFrames = 10) {
 if (!Number.isFinite(fps) || fps <= 0 || !Number.isInteger(transitionFrames) || transitionFrames < 0) throw new Error('Invalid timeline settings');
 let cursor = 0;
 return shots.map((shot, index) => {
  if (!Number.isFinite(shot.durationSeconds) || shot.durationSeconds <= 0) throw new Error('Invalid shot duration: ' + shot.id);
  const durationFrames = Math.max(1, Math.round(shot.durationSeconds * fps));
  const previousFrames = index ? Math.max(1, Math.round(shots[index - 1].durationSeconds * fps)) : 0;
  const overlapFrames = index ? Math.min(transitionFrames, durationFrames - 1, previousFrames - 1) : 0;
  cursor -= overlapFrames;
  const startFrame = cursor;
  cursor += durationFrames;
  return {shot, startFrame, durationFrames, overlapFrames};
 });
}
export function timelineDuration(shots: MangaShot[], fps: number, transitionFrames = 10) {
 const entries = makeTimeline(shots, fps, transitionFrames);
 const last = entries[entries.length - 1];
 return last ? last.startFrame + last.durationFrames : 1;
}

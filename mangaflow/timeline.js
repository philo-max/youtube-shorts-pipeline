'use strict';
const {validateStoryboard} = require('./schema');
function buildTimeline(storyboard, fps = 30, transitionFrames = 10) {
  validateStoryboard(storyboard);
  if (!Number.isInteger(fps) || fps <= 0) throw new Error('Invalid fps');
  if (!Number.isInteger(transitionFrames) || transitionFrames < 0) throw new Error('Invalid transitionFrames');
  let cursor = 0;
  const shots = storyboard.shots.map((shot, index) => {
    const durationFrames = Math.max(1, Math.round(shot.durationSeconds * fps));
    const previous = index ? storyboard.shots[index - 1] : null;
    const prevFrames = previous ? Math.max(1, Math.round(previous.durationSeconds * fps)) : 0;
    const overlapFrames = index ? Math.min(transitionFrames, durationFrames - 1, prevFrames - 1) : 0;
    cursor -= overlapFrames;
    const item = {...shot, startFrame: cursor, durationFrames, overlapFrames};
    cursor += durationFrames;
    return item;
  });
  return {fps, durationInFrames: cursor, shots};
}
module.exports = {buildTimeline};

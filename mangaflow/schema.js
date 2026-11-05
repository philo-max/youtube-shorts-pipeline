'use strict';
const MODES = new Set(['motion_comic', 'image_to_video', 'video_import']);
function validateStoryboard(data) {
  if (!data || !Array.isArray(data.shots) || data.shots.length === 0) throw new Error('shots must be a nonempty array');
  const ids = new Set();
  for (const shot of data.shots) {
    if (!shot || typeof shot.id !== 'string' || !shot.id.trim() || ids.has(shot.id)) throw new Error('Invalid or duplicate shot id');
    ids.add(shot.id);
    if (!shot.visual || !MODES.has(shot.visual.mode)) throw new Error('Invalid visual mode for ' + shot.id);
    if (!Number.isFinite(shot.durationSeconds) || shot.durationSeconds <= 0) throw new Error('Invalid duration for ' + shot.id);
    if (shot.visual.mode === 'motion_comic' && !shot.visual.imagePath) throw new Error('Missing image for ' + shot.id);
    if (shot.visual.mode !== 'motion_comic' && !shot.visual.videoPath && !shot.visual.imagePath) throw new Error('Missing media for ' + shot.id);
  }
  return data;
}
function fromLegacyCsvRows(rows) {
  return validateStoryboard({version: 1, shots: rows.map(row => ({
    id: String(row.id), durationSeconds: Number(row.durationSeconds || 4),
    dialogue: {text: row.text || '', speakerId: 'narrator'},
    visual: {mode: 'motion_comic', imagePath: row.imagePath || row.image}
  }))});
}
module.exports = {MODES, validateStoryboard, fromLegacyCsvRows};

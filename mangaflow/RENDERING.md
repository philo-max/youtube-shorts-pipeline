# Hybrid renderer preview

This milestone adds a separate Remotion composition named `MangaFlow`, leaving the legacy `ShortsTemplate` intact.

## Quick start

1. Install dependencies: `npm install`.
2. Ensure `test-data/images/1.jpg` and `2.jpg` exist, or replace paths in `mangaflow/example.storyboard.json`.
3. Run `node --test mangaflow/timeline.test.js`.
4. Run `node mangaflow/render.js mangaflow/example.storyboard.json out/mangaflow.mp4`.

The example's second shot currently has no videoPath and therefore displays its image fallback. To exercise real hybrid rendering, set its `visual.videoPath` to a valid local MP4 file. The renderer stages local media under `public/mangaflow-assets/`.

## Limitations

- Dialogue is displayed as a static caption throughout its shot, not word-aligned subtitles.
- Overlaps currently fade in the incoming shot only; no audio crossfade.
- No AI generation provider is wired up.
- EXE and APK builds are not implemented.
- GitHub CI performs static checks; no rendered-video smoke test yet.
- Media paths are intended for trusted local project files. Do not expose the renderer directly to unauthenticated network input.

# MangaFlow Studio v0.1 (incremental migration)

This folder is an isolated foundation for the hybrid manga-video pipeline. The original `npm run render` is unchanged.

- `schema.js`: validated shot contract and legacy CSV-row adapter.
- `timeline.js`: deterministic frame allocation with bounded overlaps.
- `example.storyboard.json`: hybrid motion-comic / image-to-video sample.
- `timeline.test.js`: Node built-in unit tests.

Run: `node --test mangaflow/timeline.test.js`.

**Not yet implemented:** video-shot Remotion integration, media providers, persistence, UI, rendering of this JSON, and end-to-end validation. The example references legacy test images and is illustrative only.

Next: wire a separate MangaFlow Remotion composition and video component without changing the legacy composition.

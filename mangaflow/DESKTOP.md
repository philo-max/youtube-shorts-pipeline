# Electron integration (development)

The Electron main process registers `desktop/mangaflow-ipc.js` and preload exposes `window.electronAPI.mangaFlow`.

The UI prototype is `client/src/MangaFlowPanel.tsx`. It is **not mounted into the existing client router yet**; this is intentionally non-disruptive to the original studio.

Supported operations: list/load/save JSON projects, start/cancel rendering, receive status events.

Known gaps:
- Packaged EXE rendering is not verified. Remotion bundling may need resources unpacked from ASAR, bundled FFmpeg and a writable temporary workspace.
- The renderer expects trusted paths to local media; relative media paths are resolved against the process working directory, not the project directory.
- No media file picker, timeline drag-and-drop, or project asset relocation yet.
- No APK build yet.
- UI component is a prototype and has not passed a browser integration test.

Recommended next step: mount the component behind a MangaFlow tab, validate a full render on Windows, then implement Electron Builder packaging.

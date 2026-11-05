# MangaFlow Studio: standalone distribution contract

Target artifacts for v1.0:
- Windows: portable EXE and/or installer EXE, built with Electron Builder.
- Android: installable APK, built with Capacitor and Android Gradle tooling.

**Standalone means** no Node.js, Python, development server, or separate local backend installation is required to launch. Offline project editing and asset import must work. Cloud AI providers still require network access and user-provided credentials. Fully offline AI generation is **not** promised.

Architecture:
- Share React UI, project schema, editing logic and provider contracts.
- Windows: bundle a local backend/worker and Remotion renderer, package FFmpeg/FFprobe for supported architectures, store data in per-user app data.
- Android: Capacitor shell and native media composition/export plugin. Do not assume Electron, Node.js, or Remotion Node renderer runs on Android. Use scoped app storage and Android document picker.
- Store credentials in platform secure storage; never bake provider keys into APK/EXE.
- Each platform must produce MP4 from a fixture containing both a motion-comic shot and a pre-existing video shot, without connecting to a desktop or self-hosted server.

Release gates:
1. Clean Windows installation launches offline without development dependencies.
2. Clean Android installation launches offline without development dependencies.
3. Import/edit/save/reopen project offline on both platforms.
4. Export a 9:16 H.264/AAC MP4 using local assets on each platform.
5. AI provider calls fail gracefully without connectivity; no secrets embedded in binaries.
6. CI builds EXE and APK as downloadable GitHub Actions artifacts; publish GitHub Releases after manual device smoke tests.

Status: design contract only. APK/EXE packaging, Android renderer, CI and device verification are not implemented yet.

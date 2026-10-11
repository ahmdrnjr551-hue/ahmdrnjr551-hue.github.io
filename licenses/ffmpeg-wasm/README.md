# FFmpeg WebAssembly notices and corresponding-source access

RAVA ships the unmodified single-thread `@ffmpeg/core` **0.12.10** binary, with native FFmpeg **n5.1.4**, libass/FriBidi/HarfBuzz and encoders including GPL libraries. It is GPL-2.0-or-later; this GPL-3.0-or-later application distributes the combination under GPLv3. The TypeScript `@ffmpeg/ffmpeg` loader and utility use the upstream MIT license.

The exact core release commit **71aa99d37c02a7b4c435275ca9ef50e612f6efa1**, its source archive, Docker build recipe and configuration are included here. `SOURCE-MANIFEST.json` gives clear equivalent download access to the unmodified linked libraries at the refs used by that recipe. Follow repository/tag or branch source links when a sourceArchive tag is not a tag. zimg may require its submodules. Emscripten 3.1.40 is the generally available compiler/system-library toolchain. The JavaScript loader source is at https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v12.15/packages/ffmpeg (MIT); its full source is available from https://codeload.github.com/ffmpegwasm/ffmpeg.wasm/tar.gz/v12.15.

No modified FFmpeg core or proprietary codec has been added. The core source/build archive is not evidence of a locally executed FFmpeg-core rebuild; the tested binary is the locked official npm package. It contains older native library versions: JS package audits do not certify native decoder security. Use trusted media; this is not a claim of CVE-free production decoding.

Core download is approximately 31 MB, served from the application’s own origin. Video/audio is not sent to ffmpegwasm or an external model. On public Pages, these licenses and source directions remain available beside the binary and through the repository.

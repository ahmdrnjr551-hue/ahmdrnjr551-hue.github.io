# RAVA Studio 0.2.0 — functional local browser editor

**Open:** https://ahmdrnjr551-hue.github.io/ · [Persian start guide](START-HERE-browser.fa.md).

The placeholder/status page has been replaced with the actual shared editor. Media import, analysis and H.264/AAC rendering use real single-thread FFmpeg/ffprobe WebAssembly in your browser. Original media/projects are held in local IndexedDB; no media is uploaded to GitHub or a rendering server. Portable source-inclusive ZIP backup and tested offline reload/export are available.

Bounds: 64 MB/source, 256 MB local media/exports, MP4 H264/AAC at 720p/30fps, 120 seconds and 12 media clips per render. Keep originals and downloaded project/backup outside browser storage. The 31 MB engine downloads on first processing. Not a 4K/GPU/native device/semantic AI guarantee.

Corresponding frontend source, locks and build script are in `frontend-source/`: `npm ci && npm run build:browser`. GPL/MIT/font notices and exact FFmpeg core build/source directions are in `licenses/`.

Historical hosting-method verification remains in ASSESSMENT.fa.md / hosting-verification-history.html. Current executed tests/public checks are added to the release evidence when complete; do not confuse the historical static-host test with the current browser worker edition. No paid service or private data is included.

## Verified release downloads and evidence

- [Complete 0.2 source + built web + server/native sources + executed reports](downloads/RAVA-Studio-0.2.0-source.zip)
- [SHA256](downloads/RAVA-Studio-0.2.0-source.zip.sha256)
- [Standalone built browser bundle](RAVA-frontend-bundle.zip) (serve via HTTP/HTTPS, not file://)
- [Actual executed test report](reports/TEST_REPORT.md)
- [Detailed case CSV](reports/test-cases-0.2.csv)

186 unique local cases passed; the same 26 browser cases were repeated against this actual public Pages URL and passed, for 212 recorded executions. No paid infrastructure created. This is a functional bounded 0.2 release, not every feature of a commercial editor or a physical/native APK test.

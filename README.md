# RAVA Studio 0.2.0 — functional local browser editor

**Open:** https://ahmdrnjr551-hue.github.io/ · [Persian start guide](START-HERE-browser.fa.md).

The placeholder/status page has been replaced with the actual shared editor. Media import, analysis and H.264/AAC rendering use real single-thread FFmpeg/ffprobe WebAssembly in your browser. Original media/projects are held in local IndexedDB; no media is uploaded to GitHub or a rendering server. Portable source-inclusive ZIP backup and tested offline reload/export are available.

Bounds: 64 MB/source, 256 MB local media/exports, MP4 H264/AAC at 720p/30fps, 120 seconds and 12 media clips per render. Keep originals and downloaded project/backup outside browser storage. The 31 MB engine downloads on first processing. Not a 4K/GPU/native device/semantic AI guarantee.

Corresponding frontend source, locks and build script are in `frontend-source/`: `npm ci && npm run build:browser`. GPL/MIT/font notices and exact FFmpeg core build/source directions are in `licenses/`.

Historical hosting-method verification remains in ASSESSMENT.fa.md / hosting-verification-history.html. Current executed tests/public checks are added to the release evidence when complete; do not confuse the historical static-host test with the current browser worker edition. No paid service or private data is included.

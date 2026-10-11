# RAVA Studio · GitHub Pages verification

Owner-authorized frontend publication for https://ahmdrnjr551-hue.github.io.

**This is a deployment-status/project page, not a fully deployed video editor.** The built frontend is downloadable, and its corresponding source and dependency lockfile are included. The Python/FFmpeg rendering backend is not hosted here. No passwords, provider keys, runtime database, or private media are included.

See ASSESSMENT.fa.md and static-test-evidence.json for the executed local static-host test and architectural requirements.

To rebuild the corresponding frontend: cd frontend-source; npm ci; npx vite build --config apps/web/vite.config.ts. The backend-dependent app still requires a functioning server; do not claim import/export works from a static host alone.

License: GPL-3.0; third-party notices and font licenses are included.

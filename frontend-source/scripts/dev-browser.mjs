import {spawn} from 'node:child_process';
import {copyFileSync,mkdirSync} from 'node:fs';
mkdirSync('apps/web/public/build',{recursive:true});for(const file of ['ffmpeg-core.js','ffmpeg-core.wasm'])copyFileSync('node_modules/@ffmpeg/core/dist/esm/'+file,'apps/web/public/build/'+file);
const p=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','apps/web/vite.config.ts','--host','0.0.0.0'],{env:{...process.env,VITE_RAVA_MODE:'browser'},stdio:'inherit'});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>p.kill(signal));p.on('exit',code=>process.exit(code??0));

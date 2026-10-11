import {copyFileSync,mkdirSync,readdirSync,writeFileSync,cpSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
mkdirSync('apps/web/public/build',{recursive:true});
for(const file of ['ffmpeg-core.js','ffmpeg-core.wasm'])copyFileSync('node_modules/@ffmpeg/core/dist/esm/'+file,'apps/web/public/build/'+file);
const env={...process.env,VITE_RAVA_MODE:'browser'};
for(const [file,args] of [['node_modules/typescript/bin/tsc',['--noEmit']],['node_modules/vite/bin/vite.js',['build','--config','apps/web/vite.config.ts']]]){
 const p=spawnSync(process.execPath,[file,...args],{env,stdio:'inherit'});if(p.status!==0)process.exit(p.status??1);
}

const shell=['./','./index.html','./rava.svg','./icon-192.png','./manifest.webmanifest',...readdirSync('apps/web/dist/assets').map(x=>'./assets/'+x),...readdirSync('apps/web/dist/fonts').filter(x=>x.endsWith('.ttf')).map(x=>'./fonts/'+x)];
writeFileSync('apps/web/dist/app-precache.json',JSON.stringify({version:'0.2.0-v3',files:shell}));

cpSync('licenses','apps/web/dist/licenses',{recursive:true});
for(const file of ['LICENSE','THIRD-PARTY-NOTICES.md','START-HERE-browser.fa.md'])copyFileSync(file,'apps/web/dist/'+file);

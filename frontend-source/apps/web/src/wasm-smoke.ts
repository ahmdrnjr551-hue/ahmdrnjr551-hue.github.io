import {FFmpeg} from '@ffmpeg/ffmpeg';
import {FFFSType} from '@ffmpeg/ffmpeg';
async function smoke(){
 const f=new FFmpeg(),logs:string[]=[];f.on('log',e=>logs.push(e.message));
 await f.load({coreURL:location.origin+'/build/ffmpeg-core.js',wasmURL:location.origin+'/build/ffmpeg-core.wasm'});
 const source=await(await fetch('/wasm-test-fixture.mp4')).blob();await f.createDir('/inputs');await f.mount(FFFSType.WORKERFS,{files:[new File([source],'source.mp4')]},'/inputs');
 await f.ffprobe(['-v','error','-show_format','-show_streams','-of','json','/inputs/source.mp4','-o','/source-info.json']);
 const sourceInfo=JSON.parse(await f.readFile('/source-info.json','utf8') as string);
 const args=['-v','error','-i','/inputs/source.mp4','-t','2','-vf','scale=320:180','-r','30','-c:v','libx264','-preset','ultrafast','-threads','1','-c:a','aac','-ar','48000','-movflags','+faststart','/out.mp4'];
 const start=performance.now();const code=await f.exec(args,90000);if(code!==0)throw new Error('WASM encode failed '+code+' '+logs.slice(-8).join('\n'));
 await f.ffprobe(['-v','error','-show_format','-show_streams','-of','json','/out.mp4','-o','/output-info.json']);
 const info=JSON.parse(await f.readFile('/output-info.json','utf8') as string);
 const decoded=await f.exec(['-v','error','-i','/out.mp4','-f','null','-'],60000);if(decoded!==0)throw new Error('Decode failed');
 const data=await f.readFile('/out.mp4') as Uint8Array;const url=URL.createObjectURL(new Blob([new Uint8Array(data)],{type:'video/mp4'}));(document.querySelector('#video') as HTMLVideoElement).src=url;
 const result={code,decoded,sourceInfo,info,bytes:data.length,wallSeconds:(performance.now()-start)/1000,logs:logs.slice(0,15)};
 (window as unknown as {wasmResult:unknown}).wasmResult=result;document.querySelector('#status')!.textContent=JSON.stringify(result,null,2);
 f.terminate();
}
smoke().catch(e=>{(window as unknown as {wasmError:unknown}).wasmError=String(e);document.querySelector('#status')!.textContent=String(e)});

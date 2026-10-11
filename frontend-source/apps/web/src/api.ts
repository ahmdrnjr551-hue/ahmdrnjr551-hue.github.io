import type {Job} from '../../../packages/timeline-engine';
export const BROWSER_MODE=import.meta.env.VITE_RAVA_MODE==='browser';
export class APIError extends Error {constructor(message:string,public status:number){super(message);this.name='APIError';}}
function errorText(data:unknown):string {
  if(data&&typeof data==='object'&&'detail'in data){const d=(data as {detail:unknown}).detail;return typeof d==='string'?d:JSON.stringify(d);}
  return 'The server could not complete this operation.';
}
export async function api<T>(path:string,method='GET',body?:unknown):Promise<T>{
  if(BROWSER_MODE){try{return await(await import('./browser/api')).browserAPI<T>(path,method,body);}catch(e){throw new APIError((e as Error).message,(e as {status?:number}).status??400);}}
  let response:Response;
  try{response=await fetch(path,{method,credentials:'same-origin',headers:body!==undefined?{'Content-Type':'application/json'}:undefined,body:body!==undefined?JSON.stringify(body):undefined});}
  catch{throw new APIError('Rendering server is unreachable. Local timeline edits are retained; reconnect to import/process/export.',0);}
  if(!response.ok){const data:unknown=await response.json().catch(()=>null);throw new APIError(errorText(data),response.status);}
  return await response.json() as T;
}
export function upload(file:File,onProgress:(percent:number)=>void,route='/api/media/import',fields?:Record<string,string>):Promise<Job<{media:import('../../../packages/timeline-engine').Media}>>{
  if(BROWSER_MODE)return import('./browser/api').then(m=>m.browserUpload(file,onProgress,route,fields));
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open('POST',route);xhr.responseType='json';xhr.timeout=180000;
    xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(e.loaded/e.total);};
    xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300)resolve(xhr.response);else reject(new APIError(errorText(xhr.response),xhr.status));};
    xhr.onerror=()=>reject(new APIError('Upload connection failed. Reconnect and retry; no success was reported.',0));
    xhr.ontimeout=()=>reject(new APIError('Upload timed out. Try a smaller source.',0));
    const data=new FormData();data.append('file',file);for(const [key,value] of Object.entries(fields??{}))data.append(key,value);xhr.send(data);
  });
}
export async function waitJob<T>(initial:Job<T>,update:(j:Job<T>)=>void):Promise<T>{
  let job=initial;update(job);
  while(job.status==='queued'||job.status==='running'){
    await new Promise(r=>setTimeout(r,450));
    job=await api<Job<T>>(`/api/jobs/${job.id}`);update(job);
  }
  if(job.status!=='complete'||job.result===null)throw new APIError(job.error||`Job ${job.status}. You can safely retry.`,job.status==='cancelled'?499:400);
  return job.result;
}
export function downloadText(name:string,text:string,mime='application/json'):void {
  const url=URL.createObjectURL(new Blob([text],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export const humanSize=(bytes:number):string=>bytes<1024*1024?`${Math.round(bytes/1024)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;

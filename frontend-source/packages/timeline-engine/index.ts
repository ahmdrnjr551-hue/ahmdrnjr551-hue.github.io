import type {Project, Clip, Media, Track, ClipKind, Keyframe, Cue, Marker, Effects} from './types';
export * from './types';
export const uuid = (): string => globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const copy = <T,>(value: T): T => structuredClone(value);
export const clamp = (n: number, min: number, max: number): number => Math.max(min, Math.min(max, n));
export const clipDuration = (c: Clip): number => (c.out - c.in) / c.speed;
export const clipEnd = (c: Clip): number => c.start + clipDuration(c);
export const projectDuration = (p: Project): number => Math.max(0, ...p.clips.map(clipEnd));
export const frameTime = (time: number, fps: number): number => Math.max(0, Math.round(time * fps) / fps);
export const formatTime = (time: number, fps = 30): string => {
  const frames = Math.max(0, Math.floor(time * fps + 1e-5));
  const total = Math.floor(frames / fps);
  return `${Math.floor(total / 60).toString().padStart(2,'0')}:${(total % 60).toString().padStart(2,'0')}:${Math.floor(frames % fps).toString().padStart(2,'0')}`;
};
export const shortTime = (t: number): string => `${Math.floor(t / 60).toString().padStart(2,'0')}:${Math.floor(t % 60).toString().padStart(2,'0')}`;
export const DEFAULT_EFFECTS: Effects = {brightness: 0, contrast: 1, saturation: 1, warmth: 0, blur: 0, sharpen: 0, vignette: false, zoom: 1, x: 0, y: 0, opacity: 1, fit: 'contain', pipScale: .32, motionBlur: false, chromaColor: null, chromaSimilarity: .15};
export function emptyProject(name = 'Untitled sequence'): Project {
  const now = new Date().toISOString();
  return {version: 1, id: uuid(), name, revision: 0, createdAt: now, updatedAt: now, width: 1920, height: 1080, fps: 30,
    tracks: [
      {id:'video-main',name:'Main footage',kind:'video',locked:false,hidden:false,muted:false},
      {id:'overlay-main',name:'Overlays',kind:'overlay',locked:false,hidden:false,muted:false},
      {id:'text-main',name:'Titles & captions',kind:'text',locked:false,hidden:false,muted:false},
      {id:'audio-main',name:'Music & sound',kind:'audio',locked:false,hidden:false,muted:false}
    ], clips:[],markers:[],settings:{lowMemory:true,previewQuality:'540'},messages:[]};
}
export function newClip(kind: ClipKind, trackId: string, mediaId: string | null, duration: number, name='Clip'): Clip {
  return {id:uuid(),trackId,mediaId,name,kind,start:0,in:0,out:duration,speed:1,volume:1,fadeIn:0,fadeOut:0,reverse:false,freeze:false,noiseReduction:false,normalize:false,duck:false,effects:{...DEFAULT_EFFECTS},text:'',textStyle:{fontSize:48,color:'#FFFFFF',background:true,align:'center',position:'bottom',bold:true,animation:'none'},keyframes:[]};
}
export function assertEditable(p: Project, clipId: string): Clip {
  const c = p.clips.find(c => c.id === clipId);
  if (!c) throw new Error('Select a clip first.');
  if (p.tracks.find(t => t.id === c.trackId)?.locked) throw new Error('This track is locked. Unlock it first.');
  return c;
}
export function validateProject(raw: unknown): Project {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid RAVA project document.');
  const p = copy(raw) as Project;
  if (p.version !== 1 || !p.id || !p.name || !Array.isArray(p.tracks) || !Array.isArray(p.clips) || !Array.isArray(p.markers) || !Array.isArray(p.messages) || !p.settings) throw new Error('Unsupported or incomplete project format.');
  if (p.clips.length > 256 || p.clips.filter(c=>c.kind!=='text').length>48 || p.tracks.length > 12) throw new Error('Project exceeds the 256-clip (48 media) / 12-track safety limit.');
  if (![p.width,p.height,p.fps,p.revision].every(Number.isFinite) || p.width < 64 || p.height < 64 || p.width > 4096 || p.height > 4096 || p.width % 2 || p.height % 2 || p.fps < 12 || p.fps > 60 || p.width*p.height > 8847360) throw new Error('Unsupported project dimensions/frame rate.');
  if (new Set(p.tracks.map(t=>t.id)).size !== p.tracks.length || new Set(p.clips.map(c=>c.id)).size !== p.clips.length) throw new Error('Duplicate track/clip IDs.');
  const allowed: Record<string,string[]> = {video:['video','image'],overlay:['video','image'],audio:['audio','video'],text:['text']};
  for (const c of p.clips) {
    const t = p.tracks.find(t=>t.id === c.trackId);
    if (!t || !allowed[t.kind]?.includes(c.kind)) throw new Error('Clip placed on an incompatible/missing track.');
    if (![c.start,c.in,c.out,c.speed,c.volume,c.fadeIn,c.fadeOut].every(Number.isFinite) || c.start < 0 || c.in < 0 || c.out <= c.in || c.speed < .25 || c.speed > 4 || clipDuration(c) < .015 || c.volume < 0 || c.volume > 2 || c.fadeIn < 0 || c.fadeOut < 0 || c.fadeIn+c.fadeOut > clipDuration(c)+.001) throw new Error('Invalid clip timing, speed, volume or fades.');
    if (c.kind !== 'text' && !c.mediaId) throw new Error('Media clip has no source reference.');
    if (!c.effects || !c.textStyle || !Array.isArray(c.keyframes)) throw new Error('Clip settings are incomplete.');
    if (c.reverse && c.out-c.in > 15) throw new Error('Reverse is limited to 15 source seconds in low-memory mode.');
    const seen = new Set<string>();
    for (const k of c.keyframes) {
      if (!['volume','brightness'].includes(k.property) || !Number.isFinite(k.time) || !Number.isFinite(k.value) || k.time < 0 || k.time > clipDuration(c)+.001) throw new Error('Invalid keyframe timing.');
      const [lo,hi] = k.property === 'volume' ? [0,2] : [-.5,.5];
      if (k.value < lo || k.value > hi || seen.has(`${k.property}:${k.time}`)) throw new Error('Invalid or duplicate keyframe.');
      seen.add(`${k.property}:${k.time}`);
    }
  }
  if (projectDuration(p) > 1800.001) throw new Error('This edition supports timelines up to 30 minutes.');
  return p;
}
function edited(p: Project): Project {p.updatedAt = new Date().toISOString(); return validateProject(p);}
function fixFades(c: Clip): void {
  const duration = clipDuration(c);
  if (c.fadeIn+c.fadeOut > duration) {
    const ratio = duration/(c.fadeIn+c.fadeOut);
    c.fadeIn *= ratio; c.fadeOut *= ratio;
  }
  c.keyframes = c.keyframes.filter(k=>k.time <= duration+1e-7);
}
export function patchClip(p: Project, id: string, patch: Partial<Clip>): Project {
  assertEditable(p,id);
  const next=copy(p), c=next.clips.find(c=>c.id===id)!;
  Object.assign(c,patch);
  fixFades(c);
  return edited(next);
}
export function addMedia(p: Project, media: Media, trackId?: string, time?: number): Project {
  const next=copy(p);
  let track=next.tracks.find(t=>t.id===trackId);
  if (!track) track=next.tracks.find(t=>t.kind===(media.kind==='audio'?'audio':'video')&&!t.locked);
  if (!track || track.locked) throw new Error('No compatible unlocked track is available.');
  const duration=media.kind==='image'?5:media.duration;
  const c=newClip(media.kind,track.id,media.id,duration,media.name);
  c.start=frameTime(time??Math.max(0,...next.clips.filter(c=>c.trackId===track!.id).map(clipEnd)),next.fps);
  if (track.kind==='overlay') {c.effects.x=.7;c.effects.y=.65;}
  next.clips.push(c);
  return edited(next);
}
export function addTitle(p: Project, text: string, start=0, duration=3): Project {
  const next=copy(p);
  const track=next.tracks.find(t=>t.kind==='text'&&!t.locked);
  if (!track) throw new Error('Unlock a caption/text track first.');
  if (!text.trim()) throw new Error('Enter caption text first.');
  const c=newClip('text',track.id,null,duration,'Title'); c.start=frameTime(start,p.fps); c.text=text;
  if (/[\u0600-\u06ff]/.test(text)) c.textStyle.align='right';
  next.clips.push(c);return edited(next);
}
export function keyframeValue(c: Clip, prop: Keyframe['property'], time: number): number {
  const points=c.keyframes.filter(k=>k.property===prop).sort((a,b)=>a.time-b.time);
  const defaultValue=prop==='volume'?c.volume:c.effects.brightness;
  if (!points.length) return defaultValue;
  if (time<=points[0].time) return points[0].value;
  for(let i=1;i<points.length;i++) if(time<=points[i].time) {const a=points[i-1],b=points[i];return a.value+(b.value-a.value)*(time-a.time)/(b.time-a.time);}
  return points.at(-1)!.value;
}
export function upsertKeyframe(p: Project,id:string,property:Keyframe['property'],time:number,value:number): Project {
  const c=assertEditable(p,id),t=Math.min(clipDuration(c),frameTime(clamp(time,0,clipDuration(c)),p.fps));
  const keyframes=c.keyframes.filter(k=>!(k.property===property&&Math.abs(k.time-t)<1e-6));
  keyframes.push({property,time:t,value});keyframes.sort((a,b)=>a.time-b.time);
  return patchClip(p,id,{keyframes});
}
export function splitClip(p: Project,id:string,time:number): Project {
  const c=assertEditable(p,id), t=frameTime(time,p.fps), offset=t-c.start, d=clipDuration(c);
  if(offset<1/p.fps-.000001 || d-offset<1/p.fps-.000001) throw new Error('Place the playhead inside the clip, at least one frame from either edge.');
  const next=copy(p),left=next.clips.find(c=>c.id===id)!,right=copy(left);
  right.id=uuid();right.start=t;right.name=`${c.name} · split`;
  if(c.freeze) {left.out=c.in+offset*c.speed;right.out=c.in+(d-offset)*c.speed;}
  else if(c.reverse) {const point=c.out-offset*c.speed;left.in=point;right.out=point;}
  else {const point=c.in+offset*c.speed;left.out=point;right.in=point;}
  left.fadeOut=0;right.fadeIn=0;
  for (const property of ['volume','brightness'] as const) {
    if(c.keyframes.some(k=>k.property===property)) {
      const value=keyframeValue(c,property,offset);
      left.keyframes=left.keyframes.filter(k=>k.property!==property).concat(c.keyframes.filter(k=>k.property===property&&k.time<offset),[{property,time:offset,value}]);
      right.keyframes=right.keyframes.filter(k=>k.property!==property).concat([{property,time:0,value}],c.keyframes.filter(k=>k.property===property&&k.time>offset).map(k=>({...k,time:k.time-offset})));
    }
  }
  fixFades(left);fixFades(right);
  next.clips.splice(next.clips.findIndex(c=>c.id===id)+1,0,right);
  return edited(next);
}
export function trimClip(p:Project,id:string,sourceIn:number,sourceOut:number,ripple=false):Project {
  const c=assertEditable(p,id);if(sourceIn<0||sourceOut<=sourceIn)throw new Error('Out-point must be after in-point.');
  const next=copy(p),target=next.clips.find(c=>c.id===id)!;const oldEnd=clipEnd(c);
  target.in=sourceIn;target.out=sourceOut;fixFades(target);
  const delta=clipEnd(target)-oldEnd;
  if(ripple) for(const other of next.clips) if(other.id!==id&&other.start>=oldEnd-.000001) {
    if(next.tracks.find(t=>t.id===other.trackId)?.locked)throw new Error('Ripple would change a locked track. Unlock it first.');
    other.start=Math.max(0,other.start+delta);
  }
  return edited(next);
}
export function trimEdge(p:Project,id:string,edge:'left'|'right',time:number,mediaDuration:number):Project {
  const c=assertEditable(p,id), next=copy(p),n=next.clips.find(c=>c.id===id)!;
  const end=clipEnd(c),t=frameTime(time,p.fps),min=1/p.fps;
  if(edge==='left') {
    const nt=clamp(t,Math.max(0,c.start-c.in/c.speed),end-min),delta=nt-c.start;
    n.start=nt;
    if(c.kind==='text'||c.kind==='image'||c.freeze){n.in=0;n.out=(end-nt)*c.speed;if(c.freeze){n.in=c.in;n.out=c.in+(end-nt)*c.speed;}}
    else if(c.reverse)n.out=clamp(c.out-delta*c.speed,c.in+min*c.speed,mediaDuration);
    else n.in=clamp(c.in+delta*c.speed,0,c.out-min*c.speed);
    n.keyframes=c.keyframes.filter(k=>k.time>=delta).map(k=>({...k,time:k.time-delta}));
  }else {
    const maxEnd=c.kind==='image'||c.kind==='text'?1800:c.start+(mediaDuration-c.in)/c.speed;
    const nt=clamp(t,c.start+min,maxEnd);
    if(c.reverse&&!c.freeze)n.in=Math.max(0,c.out-(nt-c.start)*c.speed);
    else n.out=n.in+(nt-c.start)*c.speed;
  }
  fixFades(n);return edited(next);
}
export function moveClip(p:Project,id:string,start:number,trackId?:string):Project {
  const c=assertEditable(p,id), next=copy(p),n=next.clips.find(c=>c.id===id)!;
  const target=next.tracks.find(t=>t.id===(trackId??c.trackId));
  if(!target||target.locked)throw new Error('Target track is locked or missing.');
  n.start=frameTime(start,p.fps);n.trackId=target.id;return edited(next);
}
export function deleteClip(p:Project,id:string,ripple=false):Project {
  const c=assertEditable(p,id),next=copy(p);next.clips=next.clips.filter(c=>c.id!==id);
  if(ripple)for(const other of next.clips)if(other.start>=clipEnd(c)-.000001){
    if(next.tracks.find(t=>t.id===other.trackId)?.locked)throw new Error('Ripple would shift a locked track.');
    other.start=Math.max(0,other.start-clipDuration(c));
  }
  return edited(next);
}
export function duplicateClip(p:Project,id:string):Project {
  const c=assertEditable(p,id),next=copy(p),n=copy(c);n.id=uuid();n.name=`${c.name} · copy`;
  n.start=Math.max(0,...next.clips.filter(x=>x.trackId===c.trackId).map(clipEnd));next.clips.push(n);return edited(next);
}
export function pasteClip(p:Project,clip:Clip,time:number):Project {
  const next=copy(p),track=next.tracks.find(t=>t.id===clip.trackId);
  if(!track||track.locked)throw new Error('Paste requires an unlocked matching track.');
  const n=copy(clip);n.id=uuid();n.start=frameTime(time,p.fps);next.clips.push(n);return edited(next);
}
export function patchTrack(p:Project,id:string,patch:Partial<Track>):Project {
  const next=copy(p),t=next.tracks.find(t=>t.id===id);if(!t)throw new Error('Track not found.');Object.assign(t,patch);return edited(next);
}
export function addTrack(p:Project,kind:Track['kind']):Project {
  const next=copy(p);next.tracks.push({id:uuid(),name:`${kind} ${p.tracks.filter(t=>t.kind===kind).length+1}`,kind,hidden:false,locked:false,muted:false});return edited(next);
}
export function addMarker(p:Project,time:number,label:string):Project {
  const next=copy(p);next.markers.push({id:uuid(),time:frameTime(time,p.fps),label:label||'Marker',color:'#A78BFA'});return edited(next);
}
export function removeMarker(p:Project,id:string):Project {const next=copy(p);next.markers=next.markers.filter(m=>m.id!==id);return edited(next);}
export function snapTime(p:Project,time:number,excludeId?:string,threshold=.12):number {
  const points=[0,...p.clips.filter(c=>c.id!==excludeId).flatMap(c=>[c.start,clipEnd(c)]),...p.markers.map(m=>m.time)];
  const nearest=points.reduce((best,v)=>Math.abs(v-time)<Math.abs(best-time)?v:best,points[0]);
  return frameTime(Math.abs(nearest-time)<=threshold?nearest:time,p.fps);
}
export function mapSubtitles(p:Project,cues:Cue[],mediaId?:string):Project {
  let next=copy(p);
  const intervals = mediaId ? p.clips.filter(c=>c.kind==='video'&&c.mediaId===mediaId&&!c.reverse&&!c.freeze) : [];
  if(mediaId&&!intervals.length)throw new Error('No forward-playing source clips are available to map these subtitles.');
  const track=next.tracks.find(t=>t.kind==='text'&&!t.locked);if(!track)throw new Error('Unlock a caption track first.');
  for(const cue of cues){
    const mapped=mediaId?intervals.flatMap(c=>{
      const a=Math.max(c.in,cue.start),b=Math.min(c.out,cue.end);
      return b>a? [{start:c.start+(a-c.in)/c.speed,end:c.start+(b-c.in)/c.speed}]:[];
    }):[{start:cue.start,end:cue.end}];
    for(const region of mapped){if(region.end-region.start<.02)continue;const c=newClip('text',track.id,null,region.end-region.start,'Caption');c.start=region.start;c.text=cue.text;if(/[\u0600-\u06ff]/.test(cue.text))c.textStyle.align='right';next.clips.push(c);}
  }
  return edited(next);
}
export interface History {past:Project[];present:Project;future:Project[];}
export function history(p:Project):History{return {past:[],present:copy(p),future:[]};}
export function commit(h:History,p:Project):History{return {past:[...h.past,copy(h.present)].slice(-50),present:edited(copy(p)),future:[]};}
export function undo(h:History):History {if(!h.past.length)return h;return {past:h.past.slice(0,-1),present:copy(h.past.at(-1)!),future:[copy(h.present),...h.future].slice(0,50)};}
export function redo(h:History):History {if(!h.future.length)return h;return {past:[...h.past,copy(h.present)].slice(-50),present:copy(h.future[0]),future:h.future.slice(1)};}

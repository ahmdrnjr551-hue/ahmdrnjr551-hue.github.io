import {useEffect,useRef,useState} from 'react';
import {Play,Pause,SkipBack,SkipForward,ChevronLeft,ChevronRight,Maximize,Film,MonitorPlay,ScanLine,ChevronDown} from 'lucide-react';
import {clipDuration,clipEnd,projectDuration,formatTime,clamp,keyframeValue} from '../../../packages/timeline-engine';
import type {Project,Media,Clip,RenderResult} from '../../../packages/timeline-engine';
import {IconButton,Spinner} from './ui';
import type {TranslationKey} from './i18n';
type T=(k:TranslationKey)=>string;
function sourceTime(c:Clip,time:number):number {return c.freeze?c.in:(c.reverse?c.out-(time-c.start)*c.speed:c.in+(time-c.start)*c.speed);}
function syncElement(el:HTMLMediaElement|null,desired:number,playing:boolean,speed:number):void {
 if(!el)return;el.playbackRate=speed;
 if(el.readyState>=1&&Number.isFinite(desired)){if(!playing||Math.abs(el.currentTime-desired)>.14){try{el.currentTime=Math.max(0,Math.min(Number.isFinite(el.duration)?el.duration-.001:desired,desired));}catch{/* Metadata load triggers another synchronization. */}}}
 if(playing){if(el.paused)void el.play().catch(()=>{/* Browser may require the user's Play gesture for audio. */});}else el.pause();
}
function fade(c:Clip,time:number):number {const rel=time-c.start,d=clipDuration(c);return Math.max(0,Math.min(1,c.fadeIn?rel/c.fadeIn:1,c.fadeOut?(d-rel)/c.fadeOut:1));}
function VideoLayer({c,m,time,playing,lowMemory,original}:{c:Clip;m:Media;time:number;playing:boolean;lowMemory:boolean;original:boolean}){
 const ref=useRef<HTMLVideoElement>(null),desired=sourceTime(c,time),fx=c.effects;
 useEffect(()=>{syncElement(ref.current,desired,playing&&!c.reverse&&!c.freeze,c.speed);},[desired,playing,c.reverse,c.freeze,c.speed]);
 const filter=`brightness(${1+keyframeValue(c,'brightness',time-c.start)}) contrast(${fx.contrast}) saturate(${fx.saturation}) blur(${fx.blur*.35}px) ${fx.warmth>0?`sepia(${fx.warmth*.15})`:''}`;
 const style={width:'100%',height:'100%',objectFit:fx.fit as 'contain'|'cover',objectPosition:`${(fx.x+1)*50}% ${(fx.y+1)*50}%`,filter,transform:`scale(${fx.zoom})`,transformOrigin:`${(fx.x+1)*50}% ${(fx.y+1)*50}%`} as const;
 return <>{c.kind==='image'?<img src={original?m.sourceUrl:m.url} alt={m.name} draggable={false} style={style}/>:<video ref={ref} src={original?m.sourceUrl:m.url} poster={m.thumbnail??undefined} style={style} muted playsInline disableRemotePlayback disablePictureInPicture controlsList="noremoteplayback" preload={lowMemory?'metadata':'auto'} onLoadedMetadata={()=>syncElement(ref.current,desired,playing&&!c.reverse&&!c.freeze,c.speed)}/>} {fx.vignette&&<div className="preview-vignette"/>}</>;
}
function AudioLayer({c,m,time,playing}:{c:Clip;m:Media;time:number;playing:boolean}){
 const ref=useRef<HTMLAudioElement>(null),desired=sourceTime(c,time);
 useEffect(()=>{if(ref.current)ref.current.volume=clamp(keyframeValue(c,'volume',time-c.start)*fade(c,time),0,1);syncElement(ref.current,desired,playing&&!c.freeze&&!c.reverse,c.speed);},[desired,playing,c,time]);
 return <audio ref={ref} src={m.url} preload="metadata" onLoadedMetadata={()=>syncElement(ref.current,desired,playing&&!c.freeze&&!c.reverse,c.speed)}/>;
}
function Rendered({result,time,playing}:{result:RenderResult;time:number;playing:boolean}){const ref=useRef<HTMLVideoElement>(null);useEffect(()=>syncElement(ref.current,time,playing,1),[time,playing]);return <video ref={ref} src={result.url} playsInline disableRemotePlayback disablePictureInPicture controlsList="noremoteplayback" preload="metadata" className="rendered-video" onLoadedMetadata={()=>syncElement(ref.current,time,playing,1)}/>;}
export function Preview({project,media,time,onTime,playing,onPlaying,t,onRender,rendering,rendered,useRendered,onMode,notify}:{project:Project;media:Media[];time:number;onTime:(v:number)=>void;playing:boolean;onPlaying:(v:boolean)=>void;t:T;onRender:()=>void;rendering:boolean;rendered:RenderResult|null;useRendered:boolean;onMode:(v:boolean)=>void;notify:(s:string)=>void}){
 const stage=useRef<HTMLDivElement>(null),surround=useRef<HTMLDivElement>(null),[height,setHeight]=useState(400),[box,setBox]=useState({width:0,height:0});
 useEffect(()=>{const observer=new ResizeObserver(e=>{const r=e[0].contentRect,ratio=project.width/project.height,w=Math.min(r.width,r.height*ratio);setBox({width:w,height:w/ratio});});if(surround.current)observer.observe(surround.current);return()=>observer.disconnect();},[project.width,project.height]);
 useEffect(()=>{const observer=new ResizeObserver(e=>setHeight(e[0].contentRect.height));if(stage.current)observer.observe(stage.current);return()=>observer.disconnect();},[]);
 const duration=projectDuration(project),tracks=new Map(project.tracks.map(t=>[t.id,t]));
 const active=project.clips.filter(c=>time>=c.start-1e-5&&time<clipEnd(c)-1e-5),video=active.filter(c=>(c.kind==='video'||c.kind==='image')&&tracks.get(c.trackId)?.kind!=='audio'&&!tracks.get(c.trackId)?.hidden).sort((a,b)=>Number(tracks.get(a.trackId)?.kind==='overlay')-Number(tracks.get(b.trackId)?.kind==='overlay')||project.tracks.findIndex(t=>t.id===a.trackId)-project.tracks.findIndex(t=>t.id===b.trackId)||a.start-b.start);
 const captions=active.filter(c=>c.kind==='text'&&!tracks.get(c.trackId)?.hidden);
 const audio=active.filter(c=>!tracks.get(c.trackId)?.muted&&c.volume>0&&!c.reverse&&!c.freeze&&media.find(m=>m.id===c.mediaId)?.hasAudio);
 const hasMedia=project.clips.some(c=>c.kind==='video'||c.kind==='image');
 const step=(dir:number)=>{onPlaying(false);onTime(clamp(Math.round(time*project.fps+dir)/project.fps,0,duration));};
 return <section className="preview-panel"><div className="panel-heading"><span><ScanLine size={14}/>{t('preview')}<span className="panel-subtitle">{project.width} × {project.height}</span></span><div className="preview-options"><span className="ratio-chip">{project.width>project.height?'16:9':project.width<project.height?'9:16':'1:1'}</span><button className={`preview-mode ${useRendered?'render-mode':''}`} onClick={()=>rendered?onMode(!useRendered):notify(t('previewNote'))}>{useRendered?t('rendered'):t('sourcePreview')}<ChevronDown size={12}/></button></div></div>
 <div className="preview-surround" ref={surround}><div ref={stage} className={`preview-stage ${!hasMedia?'empty-stage':''}`} style={{aspectRatio:`${project.width}/${project.height}`,width:box.width?`${box.width}px`:undefined,height:box.height?`${box.height}px`:undefined}}>
 {rendered&&useRendered?<Rendered result={rendered} time={time} playing={playing}/>:<>
 {video.map(c=>{const m=media.find(m=>m.id===c.mediaId);if(!m)return null;const overlay=tracks.get(c.trackId)?.kind==='overlay',fx=c.effects;return <div key={c.id} className="preview-layer" style={overlay?{width:`${fx.pipScale*100}%`,height:`${fx.pipScale*100}%`,left:`${(1-fx.pipScale)*(fx.x+1)*50}%`,top:`${(1-fx.pipScale)*(fx.y+1)*50}%`,opacity:fx.opacity*fade(c,time)}:{opacity:fx.opacity*fade(c,time)}}><VideoLayer c={c} m={m} time={time} playing={playing} lowMemory={project.settings.lowMemory} original={project.settings.previewQuality==='source'}/></div>;})}
 {captions.map(c=><div key={c.id} className={`preview-caption ${c.textStyle.position} ${c.textStyle.background?'caption-bg':''}`} dir="auto" style={{fontSize:Math.max(10,c.textStyle.fontSize*height/project.height),fontWeight:c.textStyle.bold?700:400,color:c.textStyle.color,textAlign:c.textStyle.align,opacity:c.textStyle.animation==='fade'?clamp(Math.min((time-c.start)/.15,(clipEnd(c)-time)/.15),0,1):1}}>{c.text}</div>)}
 {audio.map(c=>{const m=media.find(m=>m.id===c.mediaId)!;return <AudioLayer key={c.id} c={c} m={m} time={time} playing={playing}/>;})}
 {!hasMedia&&<div className="empty-preview-content"><div className="empty-preview-icon"><Film size={28}/></div><h3>{t('title')}</h3><p>{t('emptyTimeline')}</p></div>}
 </>}
 </div></div>
 <div className="preview-controls"><div className="timecode"><span>{formatTime(time,project.fps)}</span><span className="time-separator">/</span><span className="duration-code">{formatTime(duration,project.fps)}</span></div><div className="transport"><IconButton label="Go to start" onClick={()=>{onPlaying(false);onTime(0);}}><SkipBack size={16}/></IconButton><IconButton label={t('stepBack')} onClick={()=>step(-1)}><ChevronLeft size={17}/></IconButton><button className="play-button" aria-label={t('play')} onClick={()=>{if(time>=duration&&duration>0)onTime(0);onPlaying(!playing);}} disabled={!hasMedia}>{playing?<Pause size={19} fill="currentColor"/>:<Play size={19} fill="currentColor"/>}</button><IconButton label={t('stepForward')} onClick={()=>step(1)}><ChevronRight size={17}/></IconButton><IconButton label="Go to end" onClick={()=>{onPlaying(false);onTime(Math.max(0,duration-1/project.fps));}}><SkipForward size={16}/></IconButton></div><div className="preview-control-end"><button className="text-button render-preview-button" onClick={onRender} disabled={rendering||!hasMedia}>{rendering?<Spinner/>:<MonitorPlay size={15}/>}<span>{t('renderPreview')}</span></button><IconButton label="Fullscreen preview" onClick={()=>{void stage.current?.requestFullscreen().catch(()=>notify('Fullscreen is not permitted in this browser context.'));}}><Maximize size={15}/></IconButton></div></div>
 </section>;
}

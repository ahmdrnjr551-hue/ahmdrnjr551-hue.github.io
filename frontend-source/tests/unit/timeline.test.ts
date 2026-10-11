import {describe,it,expect} from 'vitest';
import {emptyProject,addMedia,splitClip,trimClip,trimEdge,deleteClip,duplicateClip,moveClip,patchTrack,patchClip,addTitle,mapSubtitles,upsertKeyframe,keyframeValue,snapTime,addMarker,history,commit,undo,redo,projectDuration,clipDuration,validateProject,frameTime,pasteClip,copy,addTrack} from '../../packages/timeline-engine';
import type {Media} from '../../packages/timeline-engine';
const media:Media={id:'fixture',name:'fixture.mp4',kind:'video',duration:10,width:320,height:180,fps:30,hasAudio:true,videoCodec:'h264',audioCodec:'aac',size:1000,mime:'video/mp4',url:'/test',sourceUrl:'/test',thumbnail:null,waveform:[.1,.5,.8],proxy:false,warnings:[],analysis:null};
const create=()=>addMedia(emptyProject(),media);

describe('non-destructive timeline',()=>{
  it('creates an empty valid project',()=>{const p=emptyProject();expect(validateProject(p)).toEqual(p);expect(projectDuration(p)).toBe(0);});
  it('adds real media metadata to a video track',()=>{const p=create();expect(p.clips[0].mediaId).toBe(media.id);expect(projectDuration(p)).toBe(10);});
  it('does not mutate original project during edits',()=>{const p=create(),snapshot=JSON.stringify(p);splitClip(p,p.clips[0].id,4);expect(JSON.stringify(p)).toBe(snapshot);});
  it('splits precisely at a frame boundary and preserves source span',()=>{const p=create(),n=splitClip(p,p.clips[0].id,4.001);expect(n.clips).toHaveLength(2);expect(n.clips[0].out).toBe(4);expect(n.clips[1].in).toBe(4);expect(n.clips[1].start).toBe(4);expect(projectDuration(n)).toBe(10);});
  it('splits correctly at 2x speed',()=>{let p=create();p=patchClip(p,p.clips[0].id,{speed:2});const n=splitClip(p,p.clips[0].id,2);expect(n.clips[0].out).toBe(4);expect(n.clips[1].in).toBe(4);expect(projectDuration(n)).toBe(5);});
  it('splits reverse playback without changing source ordering',()=>{let p=create();p=patchClip(p,p.clips[0].id,{reverse:true});const n=splitClip(p,p.clips[0].id,3);expect(n.clips[0].in).toBe(7);expect(n.clips[0].out).toBe(10);expect(n.clips[1].in).toBe(0);expect(n.clips[1].out).toBe(7);expect(n.clips[1].start).toBe(3);});
  it('preserves a freeze source frame when split',()=>{let p=create();p=patchClip(p,p.clips[0].id,{freeze:true});const n=splitClip(p,p.clips[0].id,3);expect(n.clips[0].in).toBe(0);expect(n.clips[1].in).toBe(0);expect(projectDuration(n)).toBe(10);});
  it('rejects split on an edge',()=>{const p=create();expect(()=>splitClip(p,p.clips[0].id,0)).toThrow('inside');expect(()=>splitClip(p,p.clips[0].id,10)).toThrow('inside');});
  it('trims in source-time rather than destructive re-encoding',()=>{const p=create(),n=trimClip(p,p.clips[0].id,2,8);expect(n.clips[0].in).toBe(2);expect(n.clips[0].out).toBe(8);expect(clipDuration(n.clips[0])).toBe(6);expect(p.clips[0].out).toBe(10);});
  it('rejects reversed trim bounds',()=>{const p=create();expect(()=>trimClip(p,p.clips[0].id,8,2)).toThrow('after');});
  it('supports left handle trim with stable out-point',()=>{const p=create(),n=trimEdge(p,p.clips[0].id,'left',2,10);expect(n.clips[0].start).toBe(2);expect(n.clips[0].in).toBe(2);expect(projectDuration(n)).toBe(10);});
  it('supports right handle trim',()=>{const p=create(),n=trimEdge(p,p.clips[0].id,'right',6,10);expect(n.clips[0].out).toBe(6);expect(projectDuration(n)).toBe(6);});
  it('ripple deletion shifts subsequent tracks and preserves gaps otherwise',()=>{let p=create();p=splitClip(p,p.clips[0].id,4);const n=deleteClip(p,p.clips[0].id,true);expect(n.clips[0].start).toBe(0);expect(projectDuration(n)).toBe(6);const m=deleteClip(p,p.clips[0].id,false);expect(m.clips[0].start).toBe(4);});
  it('ripple trim shifts following clips by the true timeline delta',()=>{let p=create();p=splitClip(p,p.clips[0].id,4);const n=trimClip(p,p.clips[0].id,1,4,true);expect(n.clips[1].start).toBe(3);expect(projectDuration(n)).toBe(9);});
  it('duplicates with a unique ID at the track end',()=>{const p=create(),n=duplicateClip(p,p.clips[0].id);expect(n.clips[1].id).not.toBe(n.clips[0].id);expect(n.clips[1].start).toBe(10);expect(projectDuration(n)).toBe(20);});
  it('pastes a copied clip without mutation',()=>{const p=create(),c=copy(p.clips[0]),n=pasteClip(p,c,14);expect(c.start).toBe(0);expect(n.clips[1].start).toBe(14);});
  it('moves and frame-snaps clips',()=>{const p=create(),n=moveClip(p,p.clips[0].id,2.013);expect(n.clips[0].start).toBe(2);});
  it('rejects incompatible track placement',()=>{const p=create();expect(()=>moveClip(p,p.clips[0].id,0,'text-main')).toThrow('incompatible');});
  it('allows an original video as an audio-only track clip',()=>{const p=create(),n=moveClip(p,p.clips[0].id,0,'audio-main');expect(n.clips[0].trackId).toBe('audio-main');});
  it('locks edits while preserving visibility/mute state',()=>{let p=create();p=patchTrack(p,'video-main',{locked:true,hidden:true,muted:true});expect(()=>splitClip(p,p.clips[0].id,4)).toThrow('locked');expect(()=>deleteClip(p,p.clips[0].id)).toThrow('locked');expect(p.tracks[0].hidden).toBe(true);});
  it('blocks ripple changes to a locked affected track',()=>{let p=create();p=addTitle(p,'locked',10,2);p=patchTrack(p,'text-main',{locked:true});expect(()=>deleteClip(p,p.clips[0].id,true)).toThrow('locked');});
  it('supports extra tracks with stable unique IDs',()=>{const p=create(),n=addTrack(p,'audio');expect(n.tracks).toHaveLength(5);expect(new Set(n.tracks.map(t=>t.id)).size).toBe(5);});
  it('undo and redo restore all editing decisions',()=>{const p=create(),h=commit(history(p),splitClip(p,p.clips[0].id,4));expect(undo(h).present.clips).toHaveLength(1);expect(redo(undo(h)).present.clips).toHaveLength(2);});
  it('new edits invalidate the redo branch',()=>{const p=create(),h=undo(commit(history(p),splitClip(p,p.clips[0].id,4)));expect(commit(h,trimClip(h.present,p.clips[0].id,1,8)).future).toHaveLength(0);});
  it('snaps to markers and clip edges',()=>{const p=addMarker(create(),3,'Beat');expect(snapTime(p,3.07)).toBe(3);expect(snapTime(p,9.94)).toBe(10);expect(snapTime(p,5.5)).toBe(5.5);});
  it('rejects duplicate IDs and corrupt timing',()=>{const p=create();p.clips.push(copy(p.clips[0]));expect(()=>validateProject(p)).toThrow('Duplicate');const n=create();n.clips[0].out=NaN;expect(()=>validateProject(n)).toThrow('Invalid');});
  it('rejects unsupported schema versions',()=>{const p=create();expect(()=>validateProject({...p,version:2})).toThrow('Unsupported');});
  it('bounds reverse buffers',()=>{let p=addMedia(emptyProject(),{...media,duration:30});expect(()=>patchClip(p,p.clips[0].id,{reverse:true})).toThrow('15');});
  it('clamps fades after shorter trims',()=>{let p=create();p=patchClip(p,p.clips[0].id,{fadeIn:2,fadeOut:2});p=trimClip(p,p.clips[0].id,0,2);expect(p.clips[0].fadeIn+p.clips[0].fadeOut).toBe(2);});
});

describe('subtitles, RTL content and keyframes',()=>{
  it('keeps Persian text unchanged with RTL alignment',()=>{const p=addTitle(create(),'سلام دنیا؛ RAVA 2026',0,2);expect(p.clips[1].text).toBe('سلام دنیا؛ RAVA 2026');expect(p.clips[1].textStyle.align).toBe('right');});
  it('maps source captions to split and speed-adjusted timeline',()=>{let p=create();p=trimClip(p,p.clips[0].id,2,8);p=patchClip(p,p.clips[0].id,{speed:2,start:1});p=mapSubtitles(p,[{start:3,end:5,text:'Hello'}],media.id);const c=p.clips.find(c=>c.kind==='text')!;expect(c.start).toBe(1.5);expect(clipDuration(c)).toBe(1);});
  it('clips subtitles at source boundaries',()=>{let p=create();p=trimClip(p,p.clips[0].id,2,8);p=mapSubtitles(p,[{start:0,end:3,text:'a'},{start:7,end:10,text:'b'}],media.id);const captions=p.clips.filter(c=>c.kind==='text');expect(captions[0].start).toBe(0);expect(clipDuration(captions[0])).toBe(1);expect(captions[1].start).toBe(5);});
  it('rejects automatic caption mapping onto reverse/frozen clips',()=>{let p=create();p=patchClip(p,p.clips[0].id,{reverse:true});expect(()=>mapSubtitles(p,[{start:1,end:2,text:'x'}],media.id)).toThrow('forward');});
  it('linearly interpolates audio automation',()=>{let p=create(),id=p.clips[0].id;p=upsertKeyframe(p,id,'volume',0,0);p=upsertKeyframe(p,id,'volume',4,1);expect(keyframeValue(p.clips[0],'volume',2)).toBe(.5);expect(keyframeValue(p.clips[0],'volume',8)).toBe(1);});
  it('splits keyframe curves continuously',()=>{let p=create(),id=p.clips[0].id;p=upsertKeyframe(p,id,'brightness',0,0);p=upsertKeyframe(p,id,'brightness',8,.4);p=splitClip(p,id,4);expect(keyframeValue(p.clips[0],'brightness',4)).toBe(.2);expect(keyframeValue(p.clips[1],'brightness',0)).toBe(.2);expect(keyframeValue(p.clips[1],'brightness',2)).toBeCloseTo(.3);});
  it('replaces duplicate keyframes and rejects invalid values',()=>{let p=create(),id=p.clips[0].id;p=upsertKeyframe(p,id,'volume',1,.5);p=upsertKeyframe(p,id,'volume',1,.8);expect(p.clips[0].keyframes).toHaveLength(1);expect(()=>upsertKeyframe(p,id,'volume',1,3)).toThrow('keyframe');});
  it('quantizes frame time for 24/30/60 fps',()=>{expect(frameTime(.1,24)).toBeCloseTo(2/24);expect(frameTime(.1,30)).toBe(.1);expect(frameTime(.1,60)).toBe(.1);});
});

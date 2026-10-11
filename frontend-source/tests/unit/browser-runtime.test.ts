import {describe,it,expect} from 'vitest';
import {emptyProject,newClip,DEFAULT_EFFECTS,validateProject} from '../../packages/timeline-engine';
import type {Project,Media,ExportOptions} from '../../packages/timeline-engine';
import {buildRender,atempo} from '../../apps/web/src/browser/render';
import {makeAss,escapeAss,parseSRT,envelope} from '../../apps/web/src/browser/subtitles';
import {audioSignals,visualSignals} from '../../apps/web/src/browser/signals';
import {planLocal,assistantLocal} from '../../apps/web/src/browser/planning';
const opts:ExportOptions={format:'mp4',codec:'h264',width:320,height:180,fps:25,quality:'draft',videoBitrate:0,audioBitrate:128,sampleRate:48000,preview:false};
const m:Media={id:'source',name:'sample',kind:'video',duration:8,width:640,height:360,fps:25,hasAudio:true,videoCodec:'h264',audioCodec:'aac',size:1000,mime:'video/mp4',url:'',sourceUrl:'',thumbnail:null,waveform:[],proxy:false,warnings:[],analysis:null};
function fixture():Project{const p=emptyProject();p.width=320;p.height=180;p.fps=25;p.clips=[newClip('video','video-main','source',2)];return p;}
const build=(p=fixture(),o=opts)=>buildRender(p,o,new Map([[m.id,m]]),new Map([[m.id,'/inputs/source.mp4']]),'/out.mp4');
describe('browser render command and safety',()=>{
 it('uses real FFmpeg graph, MP4 H264/AAC, original path and bounded size',()=>{const b=build();expect(b.args).toContain('/inputs/source.mp4');expect(b.args).toContain('libx264');expect(b.args).toContain('aac');expect(b.args).toContain('-fs');expect(b.expected.duration).toBe(2);});
 it('refuses empty timelines',()=>expect(()=>build(emptyProject())).toThrow());
 it('refuses missing originals',()=>expect(()=>buildRender(fixture(),opts,new Map(),new Map(),'/o')).toThrow('missing'));
 it('refuses source outpoint past duration',()=>{const p=fixture();p.clips[0].out=10;expect(()=>build(p)).toThrow('out-point');});
 it('refuses unsupported browser encoders',()=>expect(()=>build(fixture(),{...opts,codec:'hevc'})).toThrow('H.264'));
 it('refuses unsupported browser containers',()=>expect(()=>build(fixture(),{...opts,format:'webm'})).toThrow('MP4'));
 it('bounds resolution and fps',()=>{expect(()=>build(fixture(),{...opts,width:1920,height:1080})).toThrow('limited');expect(()=>build(fixture(),{...opts,fps:60})).toThrow('limited');});
 it('bounds render duration and media decoder count',()=>{const p=fixture();p.clips[0].start=121;expect(()=>build(p)).toThrow('120');const many=fixture();many.clips=Array.from({length:13},()=>newClip('video','video-main','source',2));expect(()=>build(many)).toThrow('12 media');});
 it('builds volume and brightness keyframe expressions',()=>{const p=fixture(),c=p.clips[0];c.keyframes=[{property:'volume',time:0,value:0},{property:'volume',time:2,value:1},{property:'brightness',time:0,value:0},{property:'brightness',time:2,value:.1}];const graph=build(p).args.join(' ');expect(graph).toContain('volume=');expect(graph).toContain('if(lt(t,');expect(envelope(c,'volume',1)).toContain('(t-0)/2');});
 it('freeze uses repeated frame and explicit timestamps, not black padding',()=>{const p=fixture();p.clips[0].freeze=true;const b=build(p);expect(b.args.join(' ')).toContain('loop=loop=-1:size=1');expect(b.args.join(' ')).toContain('setpts=N/(25*TB)');});
 it('separates visual hide and audio mute',()=>{const p=fixture();p.tracks[0].hidden=true;expect(build(p).args.join(' ')).not.toContain('overlay=x');expect(build(p).args.join(' ')).toContain('volume=');p.tracks[0].muted=true;expect(build(p).args).not.toContain('/inputs/source.mp4');});
 it('builds image PIP without replacing the base sequence',()=>{const p=fixture(),im={...m,id:'image',kind:'image' as const,hasAudio:false};p.clips.push(newClip('image','overlay-main','image',2));const b=buildRender(p,opts,new Map([[m.id,m],[im.id,im]]),new Map([[m.id,'/inputs/s.mp4'],[im.id,'/inputs/i.png']]),'/o');expect(b.args).toContain('-loop');expect(b.args.join(' ')).toContain('main_w-overlay_w');});
 it('builds denoise, normalization and ducking only when appropriate',()=>{const p=fixture(),a=newClip('audio','audio-main','source',2);a.duck=true;p.clips[0].noiseReduction=true;p.clips[0].normalize=true;p.clips.push(a);const graph=build(p).args.join(' ');expect(graph).toContain('afftdn');expect(graph).toContain('dynaudnorm');expect(graph).toContain('sidechaincompress');});
 it('tempo chain handles 0.25 and 4 without invalid atempo',()=>{expect(atempo(.25)).toEqual(['atempo=0.5','atempo=0.5']);expect(atempo(4)).toEqual(['atempo=2','atempo=2']);});
 it('never modifies the project',()=>{const p=fixture(),before=structuredClone(p);build(p);expect(p).toEqual(before);});
});
describe('local captions and validation',()=>{
 it('parses BOM, mixed-script cues and decimal milliseconds',()=>{const a=parseSRT('\uFEFF1\n00:00:00,750 --> 00:00:01,900\nسلام RAVA ۲۰۲۶!\n');expect(a[0]).toEqual({start:.75,end:1.9,text:'سلام RAVA ۲۰۲۶!'});});
 it('rejects reversed timing, invalid seconds, empty and oversize SRT',()=>{for(const text of ['', '1\n00:00:00,999 --> 00:00:00,000\nx','1\n00:00:61,000 --> 00:01:10,000\nx','x'.repeat(1048577)])expect(()=>parseSRT(text)).toThrow();});
 it('removes HTML tags while keeping Unicode',()=>expect(parseSRT('1\n00:00:00,000 --> 00:00:01,000\n<b>سلام</b>')[0].text).toBe('سلام'));
 it('escapes ASS commands and preserves Persian joining characters',()=>{expect(escapeAss('{\\pos(0,0)}\nسلام')).toBe('｛＼pos(0,0)｝\\Nسلام');});
 it('creates correct portrait ASS and excludes hidden tracks',()=>{const p=fixture();const c=newClip('text','text-main',null,2);c.text='سلام RAVA';p.clips.push(c);expect(makeAss(p,360,640)).toContain('PlayResY: 640');expect(build(p).ass).toContain('سلام RAVA');p.tracks[2].hidden=true;expect(build(p).ass).toBeNull();});
 it.each(['brightness','contrast','saturation','warmth','blur','sharpen','zoom','x','y','opacity','pipScale','chromaSimilarity'])('rejects non-finite %s in imported projects',key=>{const p=fixture();(p.clips[0].effects as unknown as Record<string,unknown>)[key]=NaN;expect(()=>validateProject(p)).toThrow('effect');});
 it('rejects injected effect colors and text overrides',()=>{const p=fixture();p.clips[0].effects.chromaColor='#00ff00:foo';expect(()=>validateProject(p)).toThrow();const q=fixture();q.clips[0].textStyle.color='bad';expect(()=>validateProject(q)).toThrow();});
 it('rejects speed/freeze on image and text',()=>{const p=fixture(),c=newClip('text','text-main',null,2);c.freeze=true;p.clips=[c];expect(()=>validateProject(p)).toThrow();});
});
describe('honest bounded sampled signals and proposals',()=>{
 it('measures actual frame difference, luma and contrast',()=>{const a=visualSignals(new Uint8Array([0,0,255,255]),2,1,2);expect(a[0].brightness).toBe(0);expect(a[1].motion).toBe(1);expect(a[1].time).toBe(2);});
 it('finds real silence and amplitude onsets',()=>{const f=new Float32Array(8000);f.fill(0);f.fill(.2,4000);const a=audioSignals(new Uint8Array(f.buffer),1);expect(a.silences[0].end).toBeCloseTo(.5);expect(a.onsets.length).toBeGreaterThan(0);});
 it('does not invent a plan or freeform assistant detections without analysis',()=>{expect(()=>planLocal({project:fixture(),mediaId:'source',style:'auto',intensity:'clean',targetDuration:3,aspect:'16:9',prompt:''},m)).toThrow('Analyze');expect(assistantLocal(fixture(),'make it cinematic',[m]).proposal).toBeNull();});
 it('audio enhancement remains an editable reviewed proposal and respects locks',()=>{const p=fixture(),r=assistantLocal(p,'reduce noise',[m]);expect(r.proposal?.requiresConfirmation).toBe(true);expect(r.proposal?.project.clips[0].noiseReduction).toBe(true);expect(p.clips[0].noiseReduction).toBe(false);p.tracks[0].locked=true;expect(assistantLocal(p,'reduce noise',[m]).proposal?.project.clips[0].noiseReduction).toBe(false);});
 it('slow replay does not fabricate a best-moment detection',()=>{const r=assistantLocal(fixture(),'slow replay',[m]);expect(r.proposal?.project.clips.at(-1)?.speed).toBe(.5);expect(r.message).toContain('not an AI-recognized');});
 it('caption requests route to manual/SRT instead of invented speech',()=>expect(assistantLocal(fixture(),'زیرنویس فارسی',[m]).action).toBe('captions'));
});

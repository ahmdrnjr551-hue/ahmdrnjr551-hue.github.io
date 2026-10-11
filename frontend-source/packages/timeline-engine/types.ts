export type MediaKind = 'video' | 'audio' | 'image';
export type ClipKind = MediaKind | 'text';
export type TrackKind = 'video' | 'audio' | 'text' | 'overlay';
export type Style = 'auto' | 'gaming' | 'funny' | 'cinematic' | 'youtube' | 'shorts' | 'documentary' | 'travel' | 'sports' | 'custom';
export type Intensity = 'clean' | 'creator' | 'extreme';
export interface Effects {
  brightness: number; contrast: number; saturation: number; warmth: number;
  blur: number; sharpen: number; vignette: boolean; zoom: number; x: number; y: number;
  opacity: number; fit: 'contain' | 'cover'; pipScale: number; motionBlur: boolean;
  chromaColor: string | null; chromaSimilarity: number;
}
export interface TextStyle {
  fontSize: number; color: string; background: boolean; align: 'left' | 'center' | 'right';
  position: 'top' | 'center' | 'bottom'; bold: boolean; animation: 'none' | 'fade';
}
export interface Keyframe {property: 'volume' | 'brightness'; time: number; value: number;}
export interface Clip {
  id: string; trackId: string; mediaId: string | null; name: string; kind: ClipKind;
  start: number; in: number; out: number; speed: number; volume: number;
  fadeIn: number; fadeOut: number; reverse: boolean; freeze: boolean;
  noiseReduction: boolean; normalize: boolean; duck: boolean;
  effects: Effects; text: string; textStyle: TextStyle; keyframes: Keyframe[];
}
export interface Track {id: string; name: string; kind: TrackKind; locked: boolean; hidden: boolean; muted: boolean;}
export interface Marker {id: string; time: number; label: string; color: string;}
export interface Message {id: string; role: 'user' | 'assistant'; text: string; time: string;}
export interface Project {
  version: 1; id: string; name: string; revision: number; createdAt: string; updatedAt: string;
  width: number; height: number; fps: number; tracks: Track[]; clips: Clip[]; markers: Marker[];
  settings: {lowMemory: boolean; previewQuality: '360' | '540' | 'source'};
  messages: Message[];
}
export interface AnalysisEvent {start: number; end: number; label: string; confidence: string;}
export interface Highlight extends AnalysisEvent {time: number; score: number; evidence: string;}
export interface Issue {label: string; evidence: string; confidence: string;}
export interface FrameSample {time: number; brightness: number; contrast: number; motion: number; darkFraction: number;}
export interface Analysis {
  mediaId: string; engine: string; semanticVision: boolean; sampleInterval: number; sampleCount: number;
  coverage: string; scenes: AnalysisEvent[]; highlights: Highlight[]; silences: AnalysisEvent[]; onsets: number[];
  motion: number; medianBrightness: number; recommendedStyle: Style; styleName: string; reason: string;
  suggestedStructure: string[]; musicMood: string; transitions: string; captions: string; color: string;
  issues: Issue[]; estimatedRenderSeconds: number; estimatedOutputDuration: number; processingSeconds: number;
  uncertainties: string[]; samples: FrameSample[];
}
export interface Media {
  id: string; name: string; kind: MediaKind; duration: number; width: number; height: number; fps: number;
  hasAudio: boolean; videoCodec: string | null; audioCodec: string | null; size: number; mime: string;
  url: string; sourceUrl: string; thumbnail: string | null; waveform: number[]; proxy: boolean;
  warnings: string[]; analysis: Analysis | null; license?: string;
}
export interface Decision {sourceIn: number; sourceOut: number; timelineStart: number; duration: number; reason: string; confidence: string;}
export interface Proposal {
  id?: string; provider?: string; style?: Style; styleName?: string; reason?: string;
  summary: string; project: Project; decisions?: Decision[]; warnings?: string[]; requiresConfirmation: boolean;
  estimatedOutputDuration?: number;
}
export interface ExportOptions {
  format: 'mp4' | 'webm'; codec: 'h264' | 'hevc' | 'vp9'; width?: number; height?: number;
  fps?: number; quality: 'draft' | 'standard' | 'high'; videoBitrate: number; audioBitrate: number;
  sampleRate: 44100 | 48000; preview: boolean;
}
export interface QC {
  passed: boolean; checks: string[]; duration: number; videoCodec: string; audioCodec: string;
  audioSampleRate: string; avStartDelta: number; safeCorrections: string[]; notChecked: string[];
}
export interface RenderResult {url: string; filename: string; size: number; qualityControl: QC; width: number; height: number; fps: number; duration: number; warnings: string[]; codec: string;}
export interface Job<T = unknown> {
  id: string; kind: string; status: 'queued' | 'running' | 'complete' | 'error' | 'cancelled' | 'interrupted';
  progress: number; createdAt: string; updatedAt: string; error: string | null; result: T | null; message?: string;
}
export interface Cue {start: number; end: number; text: string; confidence?: number | null;}
export interface Transcription {mediaId: string; cues: Cue[]; words: unknown[]; language: string; provider: string; requiresReview: boolean; accuracy: string;}
export interface Capabilities {
  ffmpeg: string; codecs: {h264: boolean; hevc: boolean; vp9: boolean}; subtitleShaping: boolean;
  activeRenderer: string; gpuVerified: boolean; hardwareMethodsCompiled: string[]; maxUploadMB: number;
  maxStorageMB: number; maxDuration: number; maxClips: number; maxConcurrentRenderJobs: number;
  privacy: string; storageUsed: number; authEnabled: boolean;
  providers: {
    planning: {local: boolean; externalConfigured: boolean; model: string};
    vision: {local: boolean; externalConfigured: boolean; model: string};
    transcription: {localConfigured: boolean; externalConfigured: boolean; model: string};
    speechSynthesis: boolean; requiresExplicitConsent: boolean; externalData: string;
  };
}

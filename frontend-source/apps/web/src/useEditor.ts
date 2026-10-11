import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {emptyProject,history,commit,undo,redo,validateProject,copy} from '../../../packages/timeline-engine';
import type {Project,History} from '../../../packages/timeline-engine';
import {api,APIError} from './api';
const signature=(p:Project):string=>JSON.stringify({...p,revision:0,updatedAt:''});
export function useEditor(notify:(message:string,kind?:'info'|'error'|'success')=>void){
  const [h,setHistory]=useState<History>(()=>history(emptyProject()));
  const [ready,setReady]=useState(false);
  const [saveStatus,setSaveStatus]=useState<'saved'|'saving'|'local'|'conflict'>('local');
  const [recovered,setRecovered]=useState(false);
  const project=h.present,projectRef=useRef(project);projectRef.current=project;
  const revision=useRef(0),lastSaved=useRef(''),saving=useRef(false),blocked=useRef(false);
  const notifyRef=useRef(notify);notifyRef.current=notify;
  const saveRef=useRef<()=>Promise<void>>(async()=>{});
  const load=useCallback((p:Project,readRecovery=true)=>{
    const valid=validateProject(p);let next=valid;blocked.current=false;setRecovered(false);
    revision.current=valid.revision;lastSaved.current=signature(valid);
    if(readRecovery){try{const local=localStorage.getItem(`rava-recovery-${valid.id}`);if(local){const candidate=validateProject(JSON.parse(local));if(candidate.updatedAt>valid.updatedAt&&signature(candidate)!==signature(valid)){next={...candidate,revision:valid.revision};setRecovered(true);}}}catch{/* A corrupt browser snapshot is never substituted for the valid server project. */}}
    else setRecovered(false);
    setHistory(history(next));setSaveStatus(signature(next)===lastSaved.current?'saved':'local');setReady(true);
  },[]);
  const change=useCallback((p:Project)=>{
    try{setHistory(current=>commit(current,validateProject(p)));}catch(e){notifyRef.current((e as Error).message,'error');}
  },[]);
  const operation=useCallback((fn:(p:Project)=>Project)=>{
    try{const next=fn(projectRef.current);setHistory(current=>commit(current,next));}catch(e){notifyRef.current((e as Error).message,'error');}
  },[]);
  const newProject=useCallback((name?:string)=>{const p=emptyProject(name);load(p,false);lastSaved.current='';setSaveStatus('local');},[load]);
  const save=useCallback(async()=>{
    if(saving.current||blocked.current)return;
    const snapshot=copy(projectRef.current),id=snapshot.id,hash=signature(snapshot);
    if(hash===lastSaved.current){setSaveStatus('saved');return;}
    saving.current=true;setSaveStatus('saving');
    try{
      const result=await api<Project>(`/api/projects/${id}`,'PUT',{...snapshot,revision:revision.current});
      // A late save response must never overwrite a project opened while it was in flight.
      if(projectRef.current.id===id){revision.current=result.revision;lastSaved.current=hash;setSaveStatus('saved');
        setHistory(h=>({...h,present:{...h.present,revision:result.revision}}));}
    }catch(e){if(projectRef.current.id===id){setSaveStatus((e as APIError).status===409?'conflict':'local');if((e as APIError).status===409)blocked.current=true;notifyRef.current((e as Error).message,'error');}}
    finally{saving.current=false;if(!blocked.current&&lastSaved.current!==signature(projectRef.current))setTimeout(()=>void saveRef.current(),900);}
  },[]);
  saveRef.current=save;
  const content=useMemo(()=>signature(project),[project]);
  useEffect(()=>{
    if(!ready)return;
    try{localStorage.setItem(`rava-recovery-${project.id}`,JSON.stringify(project));localStorage.setItem('rava-last-project',project.id);}catch{notifyRef.current('Browser recovery storage is full. Download the project file as a backup.','error');}
    if(content===lastSaved.current)return;
    setSaveStatus('local');const timer=setTimeout(()=>void saveRef.current(),1200);return()=>clearTimeout(timer);
  },[content,ready,project.id]);
  useEffect(()=>{const handler=()=>{try{localStorage.setItem(`rava-recovery-${projectRef.current.id}`,JSON.stringify(projectRef.current));}catch{/* Explicit download remains available. */}};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);},[]);
  return {project,h,ready,saveStatus,recovered,setRecovered,load,newProject,change,operation,save,undo:()=>setHistory(undo),redo:()=>setHistory(redo)};
}

import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import {BROWSER_MODE} from './api';
import './styles.css';
class ErrorBoundary extends React.Component<{children:React.ReactNode},{error:string|null}>{state:{error:string|null}={error:null};static getDerivedStateFromError(error:Error){return{error:error.message};}render(){return this.state.error?<div className="fatal-error"><h1>RAVA hit a recoverable interface error.</h1><p>{this.state.error}</p><p>Your saved project and browser recovery snapshot are retained. Reload and check reports if it repeats.</p><button onClick={()=>window.location.reload()}>Reload workspace</button></div>:this.props.children;}}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App/></ErrorBoundary>);

if(BROWSER_MODE&&import.meta.env.PROD&&'serviceWorker'in navigator)window.addEventListener('load',()=>{void navigator.serviceWorker.register(new URL('sw.js',document.baseURI)).catch(()=>{/* Editor still works online; do not pretend offline caching succeeded. */});});

import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
export default defineConfig({
  root: resolve(process.cwd(),'apps/web'),plugins:[react()],optimizeDeps:{exclude:['@ffmpeg/ffmpeg']},
  server:{host:'0.0.0.0',port:5173,allowedHosts:true,proxy:{'/api':{target:'http://127.0.0.1:8000',changeOrigin:false}}},
  preview:{host:'0.0.0.0',port:4173,allowedHosts:true},
  build:{outDir:'dist',emptyOutDir:true},
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
export default defineConfig({
 plugins:[react(),tailwindcss()],
 server:{host:'127.0.0.1',port:5189},
 optimizeDeps:{entries:['weaveos.html']},
 build:{outDir:'dist-weaveos',rolldownOptions:{input:resolve(import.meta.dirname,'weaveos.html')}},
})

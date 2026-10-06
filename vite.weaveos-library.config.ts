import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
export default defineConfig({plugins:[react()],build:{outDir:'dist-library',lib:{entry:resolve(import.meta.dirname,'src/weaveos/index.ts'),formats:['es'],fileName:'index'},rolldownOptions:{external:(id)=>!id.startsWith('.')&&!id.startsWith('/')},minify:false}})

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import './studio.css'
import { Studio } from './studio'
createRoot(document.getElementById('root')!).render(<StrictMode><Studio/></StrictMode>)

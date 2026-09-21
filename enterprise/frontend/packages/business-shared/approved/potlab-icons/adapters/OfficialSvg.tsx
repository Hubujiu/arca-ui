import React,{useEffect,useRef} from 'react';

const templates=new Map<string,Promise<string>>();
function loadTemplate(url:string){
  let pending=templates.get(url);
  if(!pending){
    pending=fetch(url).then(async response=>{
      if(!response.ok)throw Error(`SVG ${response.status}`);
      // Only local, captured Potlab assets are passed here. Geometry and animation stay intact.
      const text=await response.text();
      const doc=new DOMParser().parseFromString(text,'image/svg+xml');
      if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw Error('Invalid SVG');
      doc.querySelectorAll('script,foreignObject,iframe').forEach(e=>e.remove());
      doc.querySelectorAll('*').forEach(e=>Array.from(e.attributes).forEach(a=>{
        if(/^on/i.test(a.name)||(/href$/i.test(a.name)&&!a.value.startsWith('#')))e.removeAttribute(a.name);
      }));
      return new XMLSerializer().serializeToString(doc.documentElement)
        .replace(/#265bff\b/gi,'var(--potlab-accent, #3B3F46)')
        .replace(/#0a0a30\b/gi,'var(--potlab-ink, #202536)');
    }).catch(error=>{templates.delete(url);throw error;});
    templates.set(url,pending);
  }
  return pending;
}

export function OfficialSvg({url}:{url:string}){
  const host=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    let cancelled=false;
    const element=host.current!;
    const shadow=element.shadowRoot||element.attachShadow({mode:'open'});
    element.dataset.svgReady='false';
    delete element.dataset.iconLoadError;
    loadTemplate(url).then(svg=>{
      if(cancelled)return;
      // A shadow root isolates original IDs, keyframes and universal static styles.
      // Custom properties inherit across it, so colours update without refetching or restarting motion.
      shadow.innerHTML='<style>:host{display:inline-flex;width:100%;height:100%}svg{display:block;width:100%;height:100%}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}</style>'+svg;
      element.dataset.svgReady='true';
    }).catch(error=>{if(!cancelled){element.dataset.iconLoadError=String(error);}});
    return()=>{cancelled=true;};
  },[url]);
  return <span ref={host} aria-hidden="true" data-official-svg data-svg-source={url} style={{display:'inline-flex',width:'100%',height:'100%'}}/>;
}

import {useId,useLayoutEffect,useRef,useState,type ReactNode} from 'react'
import {motion,useReducedMotion} from 'motion/react'
import {X} from 'lucide-react'
import {Tabs,TabsList,TabsTrigger,TabsContent} from './reui/tabs'
import {springs} from './motion-tokens'

export type WorkspaceTab={id:string;title:string;icon?:ReactNode;pinned?:boolean;disabled?:boolean;content:ReactNode}
export type WorkspaceTabsProps={items:readonly WorkspaceTab[];value:string|null;onValueChange:(id:string)=>void;onClose?:(id:string)=>void;label:string;className?:string}
/** Controlled navigation only. The owner handles routes, dirty guards and removal. */
export function WorkspaceTabs({items,value,onValueChange,onClose,label,className=''}:WorkspaceTabsProps){
 const id=useId(),reduced=useReducedMotion(),list=useRef<HTMLDivElement>(null),bar=useRef<HTMLDivElement>(null)
 const itemById=new Map(items.map(item=>[item.id,item]))
 const[positions,setPositions]=useState<{id:string;left:number;top:number}[]>([])
 useLayoutEffect(()=>{
  const node=list.current,container=bar.current;if(!node||!container)return
  const measure=()=>{const box=container.getBoundingClientRect();setPositions(Array.from(node.querySelectorAll<HTMLElement>('[data-workspace-tab-id]')).map(tab=>{const rect=tab.getBoundingClientRect();return{id:tab.dataset.workspaceTabId!,left:rect.right-box.left-29,top:rect.top-box.top+8.5}}))}
  measure();const observer=new ResizeObserver(measure);observer.observe(node);for(const tab of node.querySelectorAll('[data-workspace-tab-id]'))observer.observe(tab)
  node.addEventListener('scroll',measure,{passive:true});return()=>{observer.disconnect();node.removeEventListener('scroll',measure)}
 },[items])
 return <Tabs className={`wo-tabs ${className}`} value={value} onValueChange={next=>{if(typeof next==='string'&&items.some(item=>item.id===next&&!item.disabled))onValueChange(next)}}>
  <div className="wo-tabs-bar" ref={bar}>
   <TabsList ref={list} className="wo-tabs-list" aria-label={label} activateOnFocus>
    {items.map(item=><TabsTrigger key={item.id} value={item.id} data-workspace-tab-id={item.id} disabled={item.disabled} className={`wo-tabs-trigger ${!item.pinned&&onClose?'has-close':''}`}>
     {value===item.id&&<motion.span className="wo-tabs-indicator" layoutId={`workspace-tab-${id}`} aria-hidden="true" transition={reduced?{duration:0}:springs.layout}/>}
     {item.icon&&<span className="wo-tabs-icon" aria-hidden="true">{item.icon}</span>}<span className="wo-tabs-title">{item.title}</span>
    </TabsTrigger>)}
   </TabsList>
   {/* Close controls are visual siblings, never interactive descendants of tablist/tab. */}
   <div className="wo-tabs-close-layer">{positions.map(position=>{const item=itemById.get(position.id);return item&&!item.pinned&&onClose?<button key={item.id} className="wo-tabs-close" type="button" aria-label={`关闭${item.title}`} disabled={item.disabled} style={{left:position.left,top:position.top}} onClick={()=>onClose(item.id)}><X size={13} aria-hidden="true"/></button>:null})}</div>
  </div>
  {items.map(item=><TabsContent key={item.id} value={item.id} className="wo-tabs-panel">{item.content}</TabsContent>)}
 </Tabs>
}

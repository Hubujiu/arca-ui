import {useId,type ReactNode} from 'react'
import {motion,useReducedMotion} from 'motion/react'
import {X} from 'lucide-react'
import {Tabs,TabsList,TabsTrigger,TabsContent} from './reui/tabs'
import {springs} from './motion-tokens'

export type WorkspaceTab={id:string;title:string;icon?:ReactNode;pinned?:boolean;disabled?:boolean;content:ReactNode}
export type WorkspaceTabsProps={items:readonly WorkspaceTab[];value:string|null;onValueChange:(id:string)=>void;onClose?:(id:string)=>void;label:string;className?:string}
/** Controlled navigation only. The owner handles routes, dirty guards and removal. */
export function WorkspaceTabs({items,value,onValueChange,onClose,label,className=''}:WorkspaceTabsProps){
 const id=useId(),reduced=useReducedMotion()
 return <Tabs className={`wo-tabs ${className}`} value={value} onValueChange={next=>{if(typeof next==='string'&&items.some(item=>item.id===next&&!item.disabled))onValueChange(next)}}>
  <TabsList className="wo-tabs-list" aria-label={label} activateOnFocus>
   {items.map(item=><div key={item.id} className="wo-tabs-item" role="presentation" data-active={value===item.id||undefined}>
    {value===item.id&&<motion.span className="wo-tabs-indicator" layoutId={`workspace-tab-${id}`} aria-hidden="true" transition={reduced?{duration:0}:springs.layout}/>}
    <TabsTrigger value={item.id} disabled={item.disabled} className={`wo-tabs-trigger ${!item.pinned&&onClose?'has-close':''}`}>
     {item.icon&&<span className="wo-tabs-icon" aria-hidden="true">{item.icon}</span>}<span className="wo-tabs-title">{item.title}</span>
    </TabsTrigger>
    {!item.pinned&&onClose&&<button className="wo-tabs-close" type="button" aria-label={`关闭${item.title}`} disabled={item.disabled} onClick={()=>onClose(item.id)}><X size={13} aria-hidden="true"/></button>}
   </div>)}
  </TabsList>
  {items.map(item=><TabsContent key={item.id} value={item.id} className="wo-tabs-panel">{item.content}</TabsContent>)}
 </Tabs>
}

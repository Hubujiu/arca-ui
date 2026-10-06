import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { animate, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import { originTransform } from './geometry'
import { springs } from './motion-tokens'
import { useWeaveColorMode } from './theme-context'

interface Context {
 open: boolean
 origin: RefObject<HTMLElement | null>
 actions: RefObject<Dialog.Root.Actions | null>
}
const MorphContext = createContext<Context | null>(null)
function useMorph() { const context=useContext(MorphContext); if(!context) throw new Error('MorphDialog parts require MorphDialog'); return context }
export interface MorphDialogProps {
 children: ReactNode
 open?: boolean
 defaultOpen?: boolean
 onOpenChange?: (open: boolean, details: Dialog.Root.ChangeEventDetails) => void
}
/** Base UI owns modal semantics. Motion only owns the visible geometry. */
export function MorphDialog({children,open:controlled,defaultOpen=false,onOpenChange}:MorphDialogProps) {
 const [internal,setInternal]=useState(defaultOpen)
 const open=controlled ?? internal
 const origin=useRef<HTMLElement|null>(null)
 const actions=useRef<Dialog.Root.Actions|null>(null)
 const [triggerId,setTriggerId]=useState<string|null>(null)
 const context=useMemo(()=>({open,origin,actions}),[open])
 return <MorphContext.Provider value={context}><Dialog.Root open={open} triggerId={triggerId} actionsRef={actions} onOpenChange={(next,details)=>{
   onOpenChange?.(next,details)
   if(details.isCanceled) return
   if(next && details.trigger instanceof HTMLElement){origin.current=details.trigger;setTriggerId(details.trigger.id || null)}
   if(!next) details.preventUnmountOnClose()
   if(controlled===undefined) setInternal(next)
 }}>{children}</Dialog.Root></MorphContext.Provider>
}
export const MorphDialogTrigger=Dialog.Trigger
export const MorphDialogClose=Dialog.Close
export const MorphDialogTitle=Dialog.Title
export const MorphDialogDescription=Dialog.Description
export interface MorphDialogContentProps {
 children: ReactNode
 className?: string
 initialFocus?: Dialog.Popup.Props['initialFocus']
 finalFocus?: Dialog.Popup.Props['finalFocus']
 theme?: 'light'|'dark'
}
export function MorphDialogContent({children,className='',initialFocus,finalFocus,theme:override}:MorphDialogContentProps) {
 const inherited=useWeaveColorMode()
 const theme=override ?? inherited
 return <Dialog.Portal><div className="wo-theme wo-overlay-root" data-theme={theme}><Dialog.Backdrop className="wo-backdrop"/><Dialog.Viewport className="wo-dialog-viewport"><AnimatedPopup className={className} initialFocus={initialFocus} finalFocus={finalFocus}>{children}</AnimatedPopup></Dialog.Viewport></div></Dialog.Portal>
}
function AnimatedPopup({children,className,initialFocus,finalFocus}:Omit<MorphDialogContentProps,'theme'>) {
 const {open,origin,actions}=useMorph()
 const panel=useRef<HTMLDivElement|null>(null)
 const initializedElement=useRef<HTMLDivElement|null>(null)
 const reduced=useReducedMotion() ?? false
 useLayoutEffect(()=>{
   const el=panel.current
   if(!el) return
   let cancelled=false
   // offset measurements are unaffected by the in-flight transform.
   const box={x:(window.innerWidth-el.offsetWidth)/2,y:(window.innerHeight-el.offsetHeight)/2,width:el.offsetWidth,height:el.offsetHeight}
   const source=origin.current?.isConnected ? origin.current.getBoundingClientRect() : null
   const from=reduced ? null : originTransform(source,box)
   const fresh=initializedElement.current!==el
   if(fresh) {
     el.style.opacity=from ? '0.3' : '0'
     if(from) el.style.transform=`translate(${from.x}px, ${from.y}px) scale(${from.scaleX}, ${from.scaleY})`
     initializedElement.current=el
   }
   // Supply fresh-node keyframes explicitly: DOM animation values must not
   // infer individual x/scale properties from an imperatively assigned transform.
   const target=open
     ? fresh && from
       ? {x:[from.x,0],y:[from.y,0],scaleX:[from.scaleX,1],scaleY:[from.scaleY,1],opacity:[0.3,1]}
       : {x:0,y:0,scaleX:1,scaleY:1,opacity:1}
     : {...(from ?? {x:0,y:0,scaleX:1,scaleY:1}),opacity:0}
   const animation=animate(el,target,reduced ? {duration:0.12} : {...springs.surface,opacity:{duration:open?0.18:0.2}})
   animation.then(()=>{if(cancelled) return; if(open) el.style.transform='none'; else actions.current?.unmount()})
   return ()=>{cancelled=true;animation.stop()}
 },[open,reduced,origin,actions])
 return <Dialog.Popup ref={panel} className={`wo-dialog ${className}`} data-motion={reduced?'reduced':'spring'} initialFocus={initialFocus} finalFocus={finalFocus}>
   {children}
   <Dialog.Close className="wo-icon-button wo-close" aria-label="关闭窗口"><X size={18} aria-hidden="true"/></Dialog.Close>
 </Dialog.Popup>
}

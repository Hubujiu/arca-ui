import{createContext,useContext,useId,type ComponentProps}from'react'
import{Tooltip as ReUITooltip,TooltipTrigger as ReUITooltipTrigger,TooltipContent as ReUITooltipContent}from'./reui/tooltip'
import{Progress as ReUIProgress,ProgressLabel,ProgressValue}from'./reui/progress'
import{Skeleton as ReUISkeleton}from'./reui/skeleton'
import{useWeaveColorMode}from'./theme-context'
export{TooltipProvider}from'./reui/tooltip'
const TooltipDescriptionContext=createContext<string|undefined>(undefined)
export function Tooltip(props:ComponentProps<typeof ReUITooltip>){const id=useId();return <TooltipDescriptionContext.Provider value={id}><ReUITooltip {...props}/></TooltipDescriptionContext.Provider>}
export function TooltipTrigger(props:ComponentProps<typeof ReUITooltipTrigger>){const id=useContext(TooltipDescriptionContext);const descriptions=[props['aria-describedby'],id].filter(Boolean).join(' ')||undefined;return <ReUITooltipTrigger {...props} aria-describedby={descriptions}/>}
export function TooltipContent(props:ComponentProps<typeof ReUITooltipContent>){const theme=useWeaveColorMode();const id=useContext(TooltipDescriptionContext);return <ReUITooltipContent {...props} id={id??props.id} role="tooltip" data-theme={theme} className={`wo-theme wo-tooltip ${typeof props.className==='string'?props.className:''}`}/>}
export type ProgressProps=Omit<ComponentProps<typeof ReUIProgress>,'value'|'min'|'max'|'children'> & {label:string;value:number|null;showValue?:boolean}
export function Progress({label,value,showValue=true,className,...props}:ProgressProps){if(value!==null&&(!Number.isFinite(value)||value<0||value>100))throw new RangeError('Progress value must be null or a finite number between 0 and 100');return <ReUIProgress {...props} min={0} max={100} value={value} className={`wo-progress ${typeof className==='string'?className:''}`}><ProgressLabel>{label}</ProgressLabel>{value!==null&&showValue?<ProgressValue/>:null}</ReUIProgress>}
export function Skeleton(props:ComponentProps<typeof ReUISkeleton>){return <ReUISkeleton {...props} aria-hidden="true" className={`wo-skeleton ${props.className??''}`}/>}

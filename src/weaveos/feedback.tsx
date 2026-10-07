import type{ComponentProps}from'react'
import{TooltipContent as ReUITooltipContent}from'./reui/tooltip'
import{Progress as ReUIProgress,ProgressLabel,ProgressValue}from'./reui/progress'
import{Skeleton as ReUISkeleton}from'./reui/skeleton'
import{useWeaveColorMode}from'./theme-context'
export{Tooltip,TooltipTrigger,TooltipProvider}from'./reui/tooltip'
export function TooltipContent(props:ComponentProps<typeof ReUITooltipContent>){const theme=useWeaveColorMode();return <ReUITooltipContent {...props} data-theme={theme} className={`wo-theme wo-tooltip ${typeof props.className==='string'?props.className:''}`}/>}
export type ProgressProps=Omit<ComponentProps<typeof ReUIProgress>,'value'|'min'|'max'|'children'> & {label:string;value:number|null;showValue?:boolean}
export function Progress({label,value,showValue=true,className,...props}:ProgressProps){if(value!==null&&(!Number.isFinite(value)||value<0||value>100))throw new RangeError('Progress value must be null or a finite number between 0 and 100');return <ReUIProgress {...props} min={0} max={100} value={value} className={`wo-progress ${typeof className==='string'?className:''}`}><ProgressLabel>{label}</ProgressLabel>{value!==null&&showValue?<ProgressValue/>:null}</ReUIProgress>}
export function Skeleton(props:ComponentProps<typeof ReUISkeleton>){return <ReUISkeleton {...props} aria-hidden="true" className={`wo-skeleton ${props.className??''}`}/>}

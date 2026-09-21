import { ActionSurface } from "@/components/controls";
import {useState} from "react";
import {AppModal} from "@/shared/ui";
import {AutomationRunDetail} from "./AutomationRuns";
export function AutomationNoticeAction({runId,onOpen}:{runId:string;onOpen?:()=>void}) {
  const [open,setOpen]=useState(false);
  return <><ActionSurface type="button"  onClick={()=>{onOpen?.();setOpen(true);}}>查看自动化运行</ActionSurface><AppModal open={open} onOpenChange={setOpen} title="自动化运行详情" className="max-w-3xl">{open&&<AutomationRunDetail id={runId}/>}</AppModal></>;
}

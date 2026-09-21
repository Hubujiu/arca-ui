import { ArrowDown, ArrowUp } from "@/shared/icons/catalog";
import { PlusAction, TrashAction } from "@/shared/icons/motion";
import { Button } from "@/components/motion/button";
import { Input } from "@/components/motion/input";
import { Checkbox } from "@/components/motion/checkbox";
import type { LowcodeField } from "./field-model";
import { addChoice, choiceLabel } from "./choices";

export function ChoiceOptionsSettings({field,onChange,disabled=false}:{field:LowcodeField;onChange:(patch:Partial<LowcodeField>)=>void;disabled?:boolean}) {
  const options=field.options ?? [];
  const move=(index:number,offset:number)=>{const next=[...options];[next[index],next[index+offset]]=[next[index+offset],next[index]];onChange({options:next});};
  return <fieldset disabled={disabled} className="min-w-0 space-y-3" aria-label="选项设置">
    <p className="text-caption leading-5 text-muted-foreground">修改名称会保留已有选择、默认值和条件。最多 100 项，每项名称最多 128 个字符。</p>
    {options.map((key,index)=><div key={key} className="space-y-1 rounded-control border border-border p-2">
      <Input label={`选项 ${index+1} 显示名称`} value={choiceLabel(field,key)} maxLength={128} onChange={label=>onChange({choiceConfig:{...field.choiceConfig,displayLabels:{...field.choiceConfig?.displayLabels,[key]:label}}})}/>
      <div className="flex items-center justify-end gap-1"><Button size="icon" variant="ghost" aria-label={`上移选项 ${index+1}`} disabled={disabled||index===0} onClick={()=>move(index,-1)}><span className="inline-flex size-3.5"><ArrowUp /></span></Button><Button size="icon" variant="ghost" aria-label={`下移选项 ${index+1}`} disabled={disabled||index===options.length-1} onClick={()=>move(index,1)}><span className="inline-flex size-3.5"><ArrowDown /></span></Button><Button size="icon" variant="ghost" aria-label={`删除选项 ${index+1}`} onClick={()=>{const colors={...field.choiceConfig?.colors},displayLabels={...field.choiceConfig?.displayLabels};delete colors[key];delete displayLabels[key];onChange({options:options.filter(value=>value!==key),choiceConfig:{...field.choiceConfig,colors,displayLabels}});}}><TrashAction size={14}/></Button></div>
    </div>)}
    <Button size="sm" variant="outline" disabled={disabled||options.length>=100} onClick={()=>onChange(addChoice(field))}><PlusAction size={14}/>添加选项</Button>
    <Checkbox label="允许其他选项并补充文字" checked={!!field.choiceConfig?.allowOther} onCheckedChange={allowOther=>onChange({choiceConfig:{...field.choiceConfig,allowOther}})}/>
    {field.choiceConfig?.allowOther&&<><Input label="其他选项名称" value={field.choiceConfig.otherLabel ?? "其他"} maxLength={128} onChange={otherLabel=>onChange({choiceConfig:{...field.choiceConfig,otherLabel}})}/><Input label="其他文本最多字符数" type="number" min={1} max={500} value={String(field.choiceConfig.otherMaxLength ?? 500)} onChange={value=>onChange({choiceConfig:{...field.choiceConfig,otherMaxLength:Number(value)}})}/><p className="text-caption leading-5 text-muted-foreground">选择后必须填写补充文字，内容单独保存。多选最多包含一项其他文本。</p></>}
  </fieldset>;
}

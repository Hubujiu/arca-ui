import {useId, type ComponentProps, type ReactNode} from 'react'
import {Input} from './primitives'
import {Textarea as ReUITextarea} from './reui/textarea'
import {RadioGroup,RadioGroupItem} from './reui/radio-group'

export function Textarea(props:ComponentProps<typeof ReUITextarea>){return <ReUITextarea {...props} className={`wo-textarea ${props.className??''}`}/>}
export type FieldPresentation={id?:string;label:string;hint?:string;error?:string;required?:boolean;readOnly?:boolean;disabled?:boolean}
function FieldFrame({id,label,hint,error,required,children}:FieldPresentation & {id:string;children:ReactNode}){
 return <div className="wo-field-control"><label id={`${id}-label`} htmlFor={id}>{label}{required?<span aria-hidden="true"> *</span>:null}</label>{children}{hint?<p id={`${id}-hint`} className="wo-field-hint">{hint}</p>:null}{error?<p id={`${id}-error`} className="wo-error" role="alert">{error}</p>:null}</div>
}
function descriptions(id:string,hint?:string,error?:string){return [hint?`${id}-hint`:null,error?`${id}-error`:null].filter(Boolean).join(' ')||undefined}
export type DecimalInputProps=FieldPresentation & {value:string|null;onValueChange:(value:string|null)=>void;placeholder?:string;name?:string}
export function DecimalInput({id:given,label,hint,error,value,onValueChange,required,readOnly,disabled,placeholder,name}:DecimalInputProps){
 const generated=useId(), id=given??generated
 return <FieldFrame {...{id,label,hint,error,required}}><Input id={id} name={name} type="text" inputMode="decimal" value={value??''} onChange={event=>{if(!readOnly&&!disabled)onValueChange(event.target.value===''?null:event.target.value)}} required={required} readOnly={readOnly} disabled={disabled} placeholder={placeholder} aria-invalid={error?true:undefined} aria-describedby={descriptions(id,hint,error)}/></FieldFrame>
}
export type NullableBooleanInputProps=FieldPresentation & {value:boolean|null;onValueChange:(value:boolean|null)=>void;name?:string}
export function NullableBooleanInput({id:given,label,hint,error,value,onValueChange,required,readOnly,disabled,name}:NullableBooleanInputProps){
 const generated=useId(),id=given??generated
 return <FieldFrame {...{id,label,hint,error,required}}><RadioGroup id={id} name={name} className="wo-radio-group" aria-labelledby={`${id}-label`} aria-describedby={descriptions(id,hint,error)} aria-invalid={error?true:undefined} aria-required={required||undefined} value={value===null?'unset':String(value)} readOnly={readOnly} disabled={disabled} onValueChange={next=>{if(!readOnly&&!disabled&&(next==='unset'||next==='true'||next==='false'))onValueChange(next==='unset'?null:next==='true')}}>{([{value:'unset',label:'未填写'},{value:'true',label:'是'},{value:'false',label:'否'}]).map(option=><label key={option.value} className="wo-radio-option"><RadioGroupItem value={option.value} className="wo-radio"/>{option.label}</label>)}</RadioGroup></FieldFrame>
}

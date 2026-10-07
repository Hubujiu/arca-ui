import type { ReactNode, ComponentProps } from 'react'
import { Button as BaseButton } from '@base-ui/react/button'
import { Button as ReUIButton } from './reui/button'
import { Input as ReUIInput } from './reui/input'
import { Checkbox as ReUICheckbox } from './reui/checkbox'
import { Switch as ReUISwitch } from './reui/switch'
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox'
import { Switch as BaseSwitch } from '@base-ui/react/switch'
import { Select as BaseSelect } from '@base-ui/react/select'
import { Check, ChevronDown, LoaderCircle } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { springs } from './motion-tokens'
import { useWeaveColorMode } from './theme-context'

export function Button({children,className='',variant='primary',busy=false,...props}:BaseButton.Props & {variant?:'primary'|'secondary'|'ghost'|'danger';busy?:boolean}) {
 const reduced=useReducedMotion()
 return <ReUIButton {...props} disabled={props.disabled||busy} aria-busy={busy||undefined} variant={variant==='primary'?'default':variant==='danger'?'destructive':variant} className={`wo-button wo-button-${variant} ${className}`} render={<motion.button whileTap={reduced?undefined:{scale:0.97}} transition={springs.press}/>}>{busy?<LoaderCircle size={16} className="wo-spin" aria-hidden="true"/>:null}{children}</ReUIButton>
}
export function Input(props:ComponentProps<typeof ReUIInput>){return <ReUIInput {...props} className={`wo-input ${typeof props.className==='string'?props.className:''}`}/>}
export function Checkbox({label,...props}:BaseCheckbox.Root.Props & {label:string}) {
 return <label className="wo-check-label"><ReUICheckbox {...props} className="wo-checkbox"/><span>{label}</span></label>
}
export function Switch({label,...props}:BaseSwitch.Root.Props & {label:string}) {
 return <label className="wo-switch-label"><span>{label}</span><ReUISwitch {...props} className="wo-switch"/></label>
}
export function Select({label,value,onValueChange,options,disabled=false}:{label:string;value:string|null;onValueChange:(value:string|null)=>void;options:{value:string;label:string}[];disabled?:boolean}) {
 const theme=useWeaveColorMode()
 return <BaseSelect.Root value={value} onValueChange={onValueChange} items={options} disabled={disabled}>
  <BaseSelect.Trigger className="wo-select" aria-label={label}><BaseSelect.Value/><BaseSelect.Icon><ChevronDown size={15} aria-hidden="true"/></BaseSelect.Icon></BaseSelect.Trigger>
  <BaseSelect.Portal><BaseSelect.Positioner data-theme={theme} className="wo-theme wo-select-positioner" sideOffset={6} alignItemWithTrigger={false}><BaseSelect.Popup className="wo-select-popup"><BaseSelect.List>{options.map(option=><BaseSelect.Item key={option.value} value={option.value} className="wo-select-item"><BaseSelect.ItemText>{option.label}</BaseSelect.ItemText><BaseSelect.ItemIndicator><Check size={14}/></BaseSelect.ItemIndicator></BaseSelect.Item>)}</BaseSelect.List></BaseSelect.Popup></BaseSelect.Positioner></BaseSelect.Portal>
 </BaseSelect.Root>
}
export function Badge({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'success'|'warning'}){return <span className={`wo-badge wo-badge-${tone}`}>{children}</span>}

import React, { forwardRef, useState,useImperativeHandle } from 'react';
import assets from './icons.json';
import {glyphName,ReviewGlyph} from '../adapters/ReviewGlyphs';
import {OfficialSvg} from '../adapters/OfficialSvg';
import {useReducedMotion} from 'motion/react';
const aliases: Record<string,string> = {
  Check:'Check',CheckIcon:'Check',CheckCheck:'Check',CheckCircle:'Check Circle',CircleCheck:'Check Circle',CheckCircle2:'Check Circle',CheckSquare:'Check Square',CheckSquare2:'Check Square',
  X:'Close Square',XIcon:'Close Square',XCircle:'Close Square',Close:'Close Square',Search:'Search',SearchIcon:'Search',Plus:'Plus',PlusIcon:'Plus',PlusSignIcon:'Plus',Minus:'Minus',MinusIcon:'Minus',
  ChevronDown:'Chevron Down',ChevronUp:'Chevron Up',ChevronLeft:'Chevron Left',ChevronRight:'Chevron Right',ChevronsUpDown:'Chevron Down',ChevronDownIcon:'Chevron Down',ChevronUpIcon:'Chevron Up',ChevronLeftIcon:'Chevron Left',ChevronRightIcon:'Chevron Right',
  ArrowRight:'Arrow Right',ArrowLeft:'Arrow Left',ArrowUp:'Arrow Up',ArrowDown:'Arrow Down',ArrowUpRight:'Trending',TrendingUp:'Trending',TrendingUpIcon:'Trending',ArrowUpRightIcon:'Trending',
  Loader2:'Loader 1',LoaderCircle:'Loader 1',Loader:'Loader 1',RefreshCw:'Refresh',RotateCcw:'Refresh 2',RefreshCcw:'Refresh 2',
  Trash:'Trash',Trash2:'Trash',Delete:'Trash',Download:'Download',Upload:'Cloud Upload',CloudUpload:'Cloud Upload',UploadCloud:'Cloud Upload',
  FileText:'Article',File:'Article',Image:'Image',ImageIcon:'Image',FileImage:'Image',Eye:'Eye',EyeOff:'Eye Off',Info:'Info',InfoIcon:'Info',CircleAlert:'Exclamation Circle',AlertCircle:'Exclamation Circle',AlertTriangle:'Exclamation Triangle',TriangleAlert:'Exclamation Triangle',
  User:'User',UserRound:'User',UserIcon:'User',Settings:'Setting',Settings2:'Setting 2',SettingsIcon:'Setting',Bell:'Notification',BellIcon:'Notification',BellOff:'Notification Off',Clock:'Clock Circle',ClockIcon:'Clock Circle',
  Mail:'Mail',Send:'Send',Share:'Share',Share2:'Share',Link:'Link',Link2:'Link',Unlink:'Link Off',Lock:'Lock',LockKeyhole:'Lock',ShieldCheck:'Shield Check',LogOut:'Log Out',LogIn:'Log In',
  Heart:'Heart',Star:'Star',Bookmark:'Bookmark',Archive:'Archive',ChartBar:'Chart',BarChart3:'Chart',SlidersHorizontal:'Slider',Sliders:'Slider',MessageCircle:'Chat',MessageSquare:'Chat 2',MapPin:'Location',Compass:'Compass',Pencil:'Edit',PencilLine:'Edit',Edit:'Edit',Edit2:'Edit',Edit3:'Edit',
  HiOutlineArrowLeft:'Arrow Left',HiOutlineArrowRight:'Arrow Right',ArrowLeft01Icon:'Arrow Left',Edit03Icon:'Edit',Link01Icon:'Link',
  SidebarLeftIcon:'Chevron Left',PanelLeftClose:'Chevron Left',PanelLeftOpen:'Chevron Right',PanelLeft:'Chevron Left',
  HiMinus:'Minus',HiPlus:'Plus',FaBell:'Notification',FaTasks:'Check Square',BsCheckLg:'Check',FaCheckCircle:'Check Circle',FaRedo:'Refresh 2',FaPen:'Edit',MdDraw:'Edit',PiFunnelSimpleBold:'Slider',RiBubbleChartFill:'Chart',
};
export function resolveIcon(name:string){
  if(assets.some(x=>x.name.trim()===name))return name;
  if(aliases[name])return aliases[name];
  const simple=name.replace(/Icon$/,'');
  return aliases[simple] || null;
}
export const PotlabIcon=forwardRef<HTMLSpanElement,any>(function PotlabIcon({name, size=18,className='',style:customStyle,onClick,active=false,official=false,strokeWidth,fill,stroke,duration,isAnimated,color,accentColor,inkColor,tone,...props},ref){
  const [hover,setHover]=useState(false); const resolved=resolveIcon(name);const reduce=useReducedMotion();
  const style={'--potlab-accent':accentColor||(tone==='inverse'?'color-mix(in srgb,var(--ui-accent,#265bff) 65%,white)':undefined),'--potlab-ink':inkColor||(tone==='inverse'?'#fff':undefined),...customStyle} as React.CSSProperties;
  if(!official&&glyphName(name))return <span ref={ref} {...props} data-icon-designed={name} className={`potlab-icon review-glyph ${className}`} style={{display:'inline-flex',verticalAlign:'middle',alignItems:'center',justifyContent:'center',lineHeight:0,width:size,height:size,flexShrink:0,color,...style}} onClick={onClick}><ReviewGlyph name={name}/></span>;
  const item=assets.find(x=>x.name.trim()===resolved);
  if(!item)return <span ref={ref} {...props} data-icon-gap={name} title={`Potlab 缺少：${name}`} className={`icon-gap ${className}`} style={{display:'inline-block',width:size,height:size,flexShrink:0,...style}} onClick={onClick} aria-label={props['aria-label']||name}/>;
  return <span ref={ref} {...props} data-potlab-official={item.slug} className={`potlab-icon ${className}`} style={{display:'inline-flex',verticalAlign:'middle',alignItems:'center',justifyContent:'center',lineHeight:0,width:size,height:size,flexShrink:0,...style}} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={onClick}><OfficialSvg url={((hover||active)&&!reduce ? item.url : item.staticUrl)||item.url}/></span>;
});
export const iconFactory=(name:string)=>forwardRef<HTMLSpanElement,any>((props,ref)=><PotlabIcon name={name} {...props} ref={ref}/>);
export const actionIconFactory=(name:string)=>forwardRef<any,any>((props,ref)=>{const [active,setActive]=useState(false);useImperativeHandle(ref,()=>({startAnimation:()=>setActive(true),stopAnimation:()=>setActive(false)}),[]);return <PotlabIcon name={name} {...props} active={active}/>});
export function IconPlaceholder({lucide,...props}:any){return <PotlabIcon name={lucide} {...props}/>}
export function HugeiconsIcon({icon,...props}:any){return <PotlabIcon name={String(icon)} {...props}/>}

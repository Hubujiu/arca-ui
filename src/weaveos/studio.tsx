import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowDownLeft, ArrowUpRight, Boxes, Check, ChevronRight, CircleHelp, Code2, Columns3, CreditCard, ExternalLink, Grid2X2, Layers, LayoutPanelLeft, Moon, PanelLeftClose, PanelLeftOpen, Plus, Search, SlidersHorizontal, Sparkles, Sun, Type, Users, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, Input, Select, Switch, Checkbox, Badge } from './primitives'
import { MorphDialog, MorphDialogContent, MorphDialogTrigger, MorphDialogTitle, MorphDialogDescription, MorphDialogClose } from './morph-dialog'
import { DataWorkspaceDemo } from './data-workspace'
import { springs } from './motion-tokens'
import { WeaveTheme } from './theme'

const nav=[{label:'总览',icon:Grid2X2},{label:'基础控件',icon:SlidersHorizontal},{label:'窗口与浮层',icon:Layers},{label:'导航与布局',icon:LayoutPanelLeft},{label:'数据工作区',icon:Columns3}]
function Mark(){return <svg width="27" height="27" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M4 7L10 22L16 7M12 7L18 22L24 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function Section({title,tag,children,className=''}:{title:string;tag?:string;children:ReactNode;className?:string}){return <section className={`wo-section ${className}`}><header className="wo-section-header"><h2>{title}</h2>{tag&&<span>{tag}</span>}</header>{children}</section>}

export function Studio(){
 const [collapsed,setCollapsed]=useState(false)
 const [section,setSection]=useState('总览')
 const [theme,setTheme]=useState<'light'|'dark'>('light')
 const [open,setOpen]=useState(false)
 const [appName,setAppName]=useState('')
 const [group,setGroup]=useState<string|null>('team')
 const [busy,setBusy]=useState(false)
 const [fail,setFail]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [switchValue,setSwitchValue]=useState(false)
 const [selected,setSelected]=useState('全部')
 const [search,setSearch]=useState('')
 const nameRef=useRef<HTMLInputElement>(null)
 const reduced=useReducedMotion()
 async function save(){
  if(!appName.trim()){setError('请输入应用名称');nameRef.current?.focus();return}
  setBusy(true);setError('')
  // Demo-only promise: no business API or production persistence is claimed.
  await new Promise(resolve=>setTimeout(resolve,900))
  if(fail){setError('保存失败，请重试');setBusy(false);return}
  setBusy(false);setOpen(false);setNotice('应用已创建')
 }
 return <WeaveTheme className="wo-studio" data-testid="studio" theme={theme}>
  <aside className={`wo-sidebar ${collapsed?'is-collapsed':''}`} data-testid="sidebar" data-collapsed={collapsed}>
   <div className="wo-brand-row">{collapsed?<button className="wo-brand-toggle" aria-label="展开侧边栏" onClick={()=>setCollapsed(false)}><span className="wo-brand-symbol"><Mark/></span><PanelLeftOpen className="wo-expand-glyph" data-testid="expand-glyph" size={22}/></button>:<><div className="wo-brand"><Mark/><span>WeaveOS</span></div><button className="wo-icon-button" aria-label="收起侧边栏" onClick={()=>setCollapsed(true)}><PanelLeftClose size={17}/></button></>}</div>
   <div className="wo-sidebar-body"><div className="wo-workspace"><span className="wo-workspace-icon"><Boxes size={18}/></span><span className="wo-nav-text"><strong>设计工作区</strong><small>Arca / Base UI</small></span><ChevronRight className="wo-nav-text" size={14}/></div>
    <div className="wo-nav-caption">组件库</div>
    <nav aria-label="组件导航">{nav.map(({label,icon:Icon})=><button key={label} className={`wo-nav-item ${section===label?'is-active':''}`} aria-label={label} aria-current={section===label?'page':undefined} onClick={()=>setSection(label)}><Icon size={18}/><span className="wo-nav-text">{label}</span>{section===label&&<span className="wo-nav-dot"/>}</button>)}</nav>
    <div className="wo-nav-caption">资源</div><a className="wo-nav-item" href="https://reui.io/docs" target="_blank" rel="noreferrer"><Code2 size={18}/><span className="wo-nav-text">ReUI 文档</span><ExternalLink className="wo-nav-text" size={13}/></a>
   </div>
   <div className="wo-sidebar-footer"><div className="wo-user-avatar">W</div><span className="wo-nav-text"><strong>WeaveOS UI</strong><small>本地交互演示</small></span><CircleHelp size={17} className="wo-nav-text"/></div>
  </aside>
  <main className="wo-workspace-card" data-testid="workspace-card">
   <header className="wo-topbar"><div className="wo-breadcrumb"><span>组件库</span><ChevronRight size={13}/><strong>{section}</strong></div><div className="wo-top-actions"><label className="wo-search"><Search size={16}/><input aria-label="搜索组件" placeholder="搜索组件" value={search} onChange={e=>setSearch(e.target.value)}/><kbd>⌘ K</kbd></label><button className="wo-icon-button" aria-label={theme==='light'?'深色模式':'浅色模式'} onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</button><div className="wo-top-divider"/><a className="wo-icon-button" aria-label="组件库源码" href="https://github.com/Hubujiu/arca-ui" target="_blank" rel="noreferrer"><Code2 size={18}/></a></div></header>
   <div className="wo-page-scroll"><div className="wo-page">
    {section!=='数据工作区'&&<div className="wo-page-heading"><div><div className="wo-eyebrow">WEAVEOS / COMPONENTS</div><h1>{section==='总览'?'组件工作室':section}</h1><p>统一的细节，自然的交互</p></div><Badge>Base UI</Badge></div>}
    {search?<div className="wo-search-results"><h2>搜索结果</h2>{nav.filter(n=>n.label.includes(search)).map(n=><Button key={n.label} variant="secondary" onClick={()=>{setSection(n.label);setSearch('')}}>{n.label}<ArrowUpRight size={16}/></Button>)}{nav.every(n=>!n.label.includes(search))&&<p>没有匹配的组件分类</p>}</div>:null}
    {(section==='总览'||section==='窗口与浮层')&&<>
     <MorphDialog open={open} onOpenChange={(next,details)=>{if(busy){details.cancel();return}setOpen(next);if(next){setError('');setNotice('')}}}>
      <Section title="窗口，沿来路展开" tag="01 / INTERACTION" className="wo-motion-section">
       <div className="wo-motion-toolbar"><div className="wo-toolbar-label"><span className="wo-little-mark"><Mark/></span><span>我的应用</span></div><MorphDialogTrigger render={<Button/>}><Plus size={15}/>新建应用</MorphDialogTrigger></div>
       <div className="wo-app-canvas"><div className="wo-apps-row"><div className="wo-app-tile"><div className="wo-app-icon"><Users size={25} strokeWidth={1.5}/></div><strong>人事管理</strong><small>成员 · 假勤</small></div><div className="wo-app-tile"><div className="wo-app-icon"><CreditCard size={25} strokeWidth={1.5}/></div><strong>财务管理</strong><small>报销 · 费用</small></div><MorphDialogTrigger className="wo-app-tile wo-app-create" aria-label="从卡片打开"><div className="wo-app-icon wo-dashed"><Plus size={25} strokeWidth={1.5}/></div><strong>创建应用</strong><small>从这里开始</small></MorphDialogTrigger></div><div className="wo-motion-hint"><ArrowUpRight size={15}/><span>点击按钮或卡片，体验打开与收回</span></div></div>
       <div className="wo-demo-footer"><span><span className="wo-status-dot"/>弹簧动效</span><span>来源缩放<ArrowDownLeft size={14}/></span></div>
      </Section>
      <MorphDialogContent theme={theme} initialFocus={nameRef}>
       <div className="wo-dialog-emblem"><Boxes size={24} strokeWidth={1.5}/></div><MorphDialogTitle className="wo-dialog-title">创建应用</MorphDialogTitle><MorphDialogDescription className="wo-dialog-description">给新的工作空间起一个名字</MorphDialogDescription>
       <form className="wo-form" onSubmit={e=>{e.preventDefault();void save()}}><label className="wo-field"><span>应用名称</span><Input ref={nameRef} value={appName} onChange={e=>setAppName(e.target.value)} placeholder="例如：客户管理" disabled={busy}/></label><div className="wo-field"><span>应用分组</span><Select label="应用分组" value={group} onValueChange={setGroup} disabled={busy} options={[{value:'team',label:'团队应用'},{value:'personal',label:'个人应用'},{value:'none',label:'未分组'}]}/></div><label className="wo-field"><span>描述 <small>可选</small></span><textarea className="wo-input wo-textarea" placeholder="这个应用用来做什么？" disabled={busy}/></label><div className="wo-demo-options"><Checkbox label="模拟保存失败" checked={fail} onCheckedChange={setFail} disabled={busy}/><span>交互演示</span></div>{error&&<p role="alert" className="wo-error">{error}</p>}<div className="wo-dialog-footer"><MorphDialogClose render={<Button variant="secondary" disabled={busy}/>}>取消</MorphDialogClose><Button type="submit" busy={busy}>{busy?'保存中':'创建'}</Button></div></form>
      </MorphDialogContent>
     </MorphDialog>
     <div role="status" className={notice?'wo-toast':'wo-sr-only'}>{notice&&<><Check size={17}/><span>{notice}</span><button className="wo-icon-button" aria-label="关闭提示" onClick={()=>setNotice('')}><X size={15}/></button></>}</div>
    </>}
    {(section==='总览'||section==='基础控件')&&<>
      <div className="wo-foundation-grid"><Section title="按钮" tag="ACTION"><div className="wo-button-samples"><Button><Plus size={16}/>新增记录</Button><Button variant="secondary">导出</Button><Button variant="ghost">取消</Button><Button disabled>不可用</Button></div></Section><Section title="选择与切换" tag="CONTROL"><div className="wo-choice-samples"><Switch label="允许编辑" checked={switchValue} onCheckedChange={setSwitchValue}/><Checkbox label="保存为草稿"/></div></Section></div>
      <div className="wo-foundation-grid"><Section title="输入" tag="INPUT"><div className="wo-input-samples"><label className="wo-field"><span>项目名称</span><Input placeholder="输入项目名称"/></label><div className="wo-field"><span>状态</span><Select label="项目状态" value={group} onValueChange={setGroup} options={[{value:'team',label:'进行中'},{value:'personal',label:'已完成'},{value:'none',label:'未开始'}]}/></div></div></Section><Section title="状态" tag="FEEDBACK"><div className="wo-status-samples"><Badge tone="success"><span className="wo-status-dot"/>已启用</Badge><Badge tone="warning">待审批</Badge><Badge>草稿</Badge></div><div className="wo-inline-message"><Check size={17}/><span>所有更改已保存</span><small>状态示例</small></div></Section></div>
    </>}
    {(section==='总览'||section==='导航与布局')&&<Section title="导航" tag="NAVIGATION"><div className="wo-navigation-demo"><div className="wo-segmented" role="tablist" aria-label="示例状态">{['全部','进行中','已完成'].map(label=><button key={label} role="tab" aria-selected={selected===label} onClick={()=>setSelected(label)}>{selected===label&&<motion.span layoutId="segment" className="wo-segment-indicator" transition={reduced?{duration:0}:springs.layout}/>}<span>{label}</span></button>)}</div><div className="wo-breadcrumb"><span>应用</span><ChevronRight size={13}/><span>人事管理</span><ChevronRight size={13}/><strong>成员</strong></div><div className="wo-nav-demo-panel" role="tabpanel">{selected==='全部'?'全部工作事项':selected==='进行中'?'正在处理的事项':'已完成的事项'}<Badge>{selected}</Badge></div></div></Section>}
    {section==='数据工作区'&&<DataWorkspaceDemo/>}
    {section==='总览'&&<div className="wo-token-grid"><div><Type size={19}/><span>字形</span><strong className="wo-type-sample">Aa 字</strong><small>Geist · System</small></div><div><Columns3 size={19}/><span>间距</span><div className="wo-spacing-bars"><i/><i/><i/><i/><i/></div><small>4 · 8 · 12 · 16 · 24</small></div><div><Sparkles size={19}/><span>色彩</span><div className="wo-swatches"><i/><i/><i/><i/><i/></div><small>黑白与中性色</small></div></div>}
    <div className="wo-page-note"><span>Arca · 为 WeaveOS 构建</span><span>React / Base UI / Motion</span></div>
   </div></div>
  </main>
 </WeaveTheme>
}

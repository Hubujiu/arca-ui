import{useState}from'react'
import{LayoutDashboard,Users,BriefcaseBusiness,Wallet,ArrowUpRight}from'lucide-react'
import{WorkspaceTabs,type WorkspaceTab}from'./workspace-tabs'
import{Button,Checkbox,Badge}from'./primitives'
const initial:WorkspaceTab[]=[
 {id:'home',title:'工作台',pinned:true,icon:<LayoutDashboard size={16}/>,content:<div className="wo-tabs-demo-content"><span className="wo-tabs-demo-eyebrow">WORKSPACE</span><h3>开始今天的工作</h3><p>应用、记录与待办，集中在这里</p><div className="wo-tabs-demo-cards"><article><Users size={21}/><strong>人事管理</strong><span>成员与假勤<ArrowUpRight size={13}/></span></article><article><Wallet size={21}/><strong>财务管理</strong><span>报销与费用<ArrowUpRight size={13}/></span></article></div></div>},
 {id:'people',title:'人事管理',icon:<Users size={16}/>,content:<div className="wo-tabs-demo-content"><span className="wo-tabs-demo-eyebrow">PEOPLE</span><h3>人事管理</h3><p>成员与假勤</p><div className="wo-tabs-demo-empty">选择一张表单开始工作</div></div>},
 {id:'crm',title:'客户管理',disabled:true,icon:<BriefcaseBusiness size={16}/>,content:<div>客户与商机</div>},
 {id:'finance',title:'财务管理',icon:<Wallet size={16}/>,content:<div className="wo-tabs-demo-content"><span className="wo-tabs-demo-eyebrow">FINANCE</span><h3>财务管理</h3><p>报销与费用</p><div className="wo-tabs-demo-empty">本月收支与审批记录</div></div>},
]
export function WorkspaceTabsDemo(){
 const[items,setItems]=useState(initial),[value,setValue]=useState<string|null>('home'),[refuse,setRefuse]=useState(false),[pending,setPending]=useState<string|null>(null)
 const pendingItem=items.find(item=>item.id===pending)
 function remove(){if(!pending)return;setItems(old=>old.filter(item=>item.id!==pending));if(value===pending)setValue('home');setPending(null)}
 return <section className="wo-tabs-demo" aria-label="工作区标签页" data-testid="workspace-tabs-demo">
  <header><h2>工作区标签页</h2><Badge>受控组件</Badge></header>
  <WorkspaceTabs items={items} value={value} onValueChange={id=>{if(!refuse)setValue(id)}} onClose={setPending} label="应用标签页"/>
  <div className="wo-tabs-demo-controls"><Checkbox label="暂不接受切换" checked={refuse} onCheckedChange={setRefuse}/><div role="status" aria-label="标签操作">{pendingItem?`请求关闭：${pendingItem.title}`:''}</div>{pendingItem&&<Button variant="secondary" onClick={remove}>确认移除标签</Button>}</div>
 </section>
}

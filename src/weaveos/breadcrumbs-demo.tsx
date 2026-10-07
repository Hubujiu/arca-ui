import {useState} from 'react'
import {Breadcrumbs} from './breadcrumbs'
export function BreadcrumbsDemo(){
 const [request,setRequest]=useState('尚无导航请求')
 const items=[{id:'workspace',label:'工作台',href:'/weaveos.html#workspace'},{id:'people',label:'人事管理',href:'/weaveos.html#people'},{id:'members',label:'成员记录',href:'/must-not-navigate'}]
 return <section className="wo-section" aria-label="面包屑组件" data-testid="breadcrumbs-demo">
  <header className="wo-section-header"><h2>面包屑</h2><span>NAVIGATION</span></header>
  <div className="wo-breadcrumbs-demo">
   <Breadcrumbs label="应用路径" items={items} onNavigate={(item,event)=>{event.preventDefault();setRequest(`导航请求：${item.id}`)}}/>
   <Breadcrumbs label="单级路径" items={[{id:'home',label:'工作台'}]}/>
   <Breadcrumbs label="无链接路径" items={[{id:'plain',label:'未配置路由'},{id:'current',label:'查看记录'}]}/>
   <Breadcrumbs label="长路径" items={[{id:'long',label:'跨区域人事与组织发展管理中心'.repeat(4),href:'/weaveos.html#long'},{id:'detail',label:'成员详情'}]}/>
   <p className="wo-breadcrumbs-status" role="status">{request}</p>
  </div>
 </section>
}

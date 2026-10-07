import {Fragment} from 'react'
import type {MouseEvent} from 'react'
import {Breadcrumb,BreadcrumbList,BreadcrumbItem,BreadcrumbLink,BreadcrumbPage,BreadcrumbSeparator} from './reui/breadcrumb'

export interface BreadcrumbEntry {id:string;label:string;href?:string}
export interface BreadcrumbsProps {
 items:readonly BreadcrumbEntry[]
 label?:string
 className?:string
 /** The host may preventDefault for its own router or unsaved-change guard. */
 onNavigate?:(item:BreadcrumbEntry,event:MouseEvent<HTMLAnchorElement>)=>void
}
/** Native ancestor links; current page and navigation state remain host-owned. */
export function Breadcrumbs({items,label='页面路径',className='',onNavigate}:BreadcrumbsProps){
 if(items.length===0)return null
 return <Breadcrumb aria-label={label} className={`wo-breadcrumbs ${className}`}><BreadcrumbList>
  {items.map((item,index)=><Fragment key={item.id}>
   {index>0&&<BreadcrumbSeparator/>}
   <BreadcrumbItem>{index===items.length-1
    ? <BreadcrumbPage>{item.label}</BreadcrumbPage>
    : item.href
     ? <BreadcrumbLink href={item.href} onClick={event=>onNavigate?.(item,event)}>{item.label}</BreadcrumbLink>
     : <span>{item.label}</span>}
   </BreadcrumbItem>
  </Fragment>)}
 </BreadcrumbList></Breadcrumb>
}

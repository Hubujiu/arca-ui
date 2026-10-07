import {useId,useState} from 'react'
import type {ReactNode} from 'react'
import {ArrowDown,ArrowUp,ArrowUpDown,ChevronLeft,ChevronRight} from 'lucide-react'
import {Button,Checkbox,Input} from './primitives'
import {paginationWindow,parsePageInput} from './pagination'
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from './reui/table'
export interface DataColumn<T>{key:string;header:string;cell:(row:T)=>ReactNode;dataType?:'number'|'time'|'text';sortable?:boolean;align?:'start'|'end'}
export interface TableSort{key:string;direction:'asc'|'desc'}
export interface DataTableProps<T>{label:string;rows:readonly T[];columns:readonly DataColumn<T>[];rowKey:(row:T)=>string;hiddenColumns?:readonly string[];sort?:TableSort|null;onSortChange?:(sort:TableSort|null)=>void;selectedKeys?:ReadonlySet<string>;onSelectionChange?:(keys:Set<string>)=>void;loading?:boolean;error?:string;refreshRequired?:boolean;onRefresh?:()=>void;emptyMessage?:string}
/** Renders exactly the supplied page. Queries, permissions and request ordering belong to the host. */
export function DataTable<T>({label,rows,columns,rowKey,hiddenColumns=[],sort,onSortChange,selectedKeys,onSelectionChange,loading=false,error,refreshRequired=false,onRefresh,emptyMessage='暂无记录'}:DataTableProps<T>){
 const shown=columns.filter(c=>!hiddenColumns.includes(c.key)),keys=rows.map(rowKey),count=keys.filter(k=>selectedKeys?.has(k)).length
 const blocked=loading||refreshRequired
 const select=(next:Set<string>)=>onSelectionChange?.(next)
 return <div className="wo-table-region">
  {refreshRequired?<div className="wo-table-notice" role="alert"><span>数据已更新，请刷新后继续</span><Button variant="secondary" onClick={onRefresh} busy={loading}>刷新记录</Button></div>:null}
  {error?<div className="wo-table-notice" role="alert"><span>{error}</span>{onRefresh?<Button variant="secondary" onClick={onRefresh} busy={loading}>重试</Button>:null}</div>:null}
  <div className="wo-table-scroll" aria-busy={loading}><Table aria-label={label} className="wo-table"><TableHeader><TableRow>
   {onSelectionChange?<TableHead scope="col" className="wo-table-select"><Checkbox label="选择当前页记录" checked={rows.length>0&&count===rows.length} indeterminate={count>0&&count<rows.length} disabled={blocked||!rows.length} onCheckedChange={checked=>{const next=new Set(selectedKeys);keys.forEach(k=>checked?next.add(k):next.delete(k));select(next)}}/></TableHead>:null}
   {shown.map(c=>{const active=sort?.key===c.key,sortable=c.sortable&&c.dataType!=='text'&&(c.dataType==='number'||c.dataType==='time')&&onSortChange;return <TableHead key={c.key} scope="col" className={c.align==='end'?'wo-table-number':undefined} aria-sort={active?(sort.direction==='asc'?'ascending':'descending'):sortable?'none':undefined}>{sortable?<button type="button" className="wo-table-sort" disabled={blocked} aria-label={`排序：${c.header}`} onClick={()=>onSortChange(active?(sort.direction==='asc'?{key:c.key,direction:'desc'}:null):{key:c.key,direction:'asc'})}>{c.header}{active?(sort.direction==='asc'?<ArrowUp size={13}/>:<ArrowDown size={13}/>):<ArrowUpDown size={13}/>}</button>:c.header}</TableHead>})}
  </TableRow></TableHeader><TableBody>{rows.map(row=>{const key=rowKey(row);return <TableRow key={key} data-selected={selectedKeys?.has(key)||undefined}>{onSelectionChange?<TableCell className="wo-table-select"><Checkbox label={`选择记录 ${key}`} checked={selectedKeys?.has(key)??false} disabled={blocked} onCheckedChange={checked=>{const next=new Set(selectedKeys);if(checked)next.add(key);else next.delete(key);select(next)}}/></TableCell>:null}{shown.map(c=><TableCell key={c.key} className={c.align==='end'?'wo-table-number':undefined}>{c.cell(row)}</TableCell>)}</TableRow>})}{!rows.length?<TableRow><TableCell colSpan={Math.max(1,shown.length+(onSelectionChange?1:0))} className="wo-table-empty">{loading?'正在加载…':emptyMessage}</TableCell></TableRow>:null}</TableBody></Table></div>
  <span role="status" className="wo-sr-only">{loading?'正在加载记录':''}</span>
 </div>
}
export interface PaginationProps{page:number;pageSize:number;total:number;onPageChange:(page:number)=>void;disabled?:boolean}
export function Pagination({page,pageSize,total,onPageChange,disabled=false}:PaginationProps){
 const [input,setInput]=useState(''),[invalid,setInvalid]=useState(false),id=useId()
 const count=Number.isSafeInteger(total)&&total>=0&&Number.isSafeInteger(pageSize)&&pageSize>0?Math.max(1,Math.ceil(total/pageSize)):0
 const valid=Number.isSafeInteger(page)&&page>=1&&page<=count,blocked=disabled||!valid
 return <nav aria-label="表格分页" className="wo-pagination"><span className="wo-pagination-total">共 {total.toLocaleString('en-US')} 条</span><span className="wo-sr-only" aria-live="polite">当前第 {page} 页</span><div className="wo-pagination-pages"><Button variant="ghost" aria-label="上一页" disabled={blocked||page<=1} onClick={()=>onPageChange(page-1)}><ChevronLeft size={15}/></Button>{paginationWindow(page,count).map((n,i)=>n==='gap'?<span key={`gap-${i}`} className="wo-pagination-gap" aria-hidden="true">…</span>:<Button key={n} variant={n===page?'secondary':'ghost'} aria-label={`第 ${n} 页`} aria-current={n===page?'page':undefined} disabled={blocked} onClick={()=>{if(n!==page)onPageChange(n)}}>{n}</Button>)}<Button variant="ghost" aria-label="下一页" disabled={blocked||page>=count} onClick={()=>onPageChange(page+1)}><ChevronRight size={15}/></Button></div><form className="wo-pagination-jump" onSubmit={e=>{e.preventDefault();if(blocked)return;const next=parsePageInput(input,count);setInvalid(next===null);if(next!==null){onPageChange(next);setInput('')}}}><label htmlFor={id}>跳至</label><Input id={id} aria-label="跳转页码" inputMode="numeric" value={input} disabled={blocked} aria-invalid={invalid||undefined} aria-describedby={invalid?`${id}-error`:undefined} onChange={e=>{setInput(e.target.value);setInvalid(false)}} placeholder={String(page)}/><span>页</span>{invalid?<span id={`${id}-error`} role="alert" className="wo-error">请输入 1–{count} 的整数</span>:null}</form></nav>
}

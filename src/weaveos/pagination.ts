const valid=(page:number,total:number)=>Number.isSafeInteger(page)&&Number.isSafeInteger(total)&&total>=1&&page>=1&&page<=total
export function paginationWindow(page:number,pageCount:number):(number|'gap')[] {
 if(!valid(page,pageCount))return []
 if(pageCount<=7)return Array.from({length:pageCount},(_,i)=>i+1)
 const start=page<=3?2:page>=pageCount-2?pageCount-3:page-1
 const end=page<=3?4:page>=pageCount-2?pageCount-1:page+1
 const result:(number|'gap')[]=[1]
 if(start>2)result.push('gap')
 for(let n=start;n<=end;n++)result.push(n)
 if(end<pageCount-1)result.push('gap')
 result.push(pageCount)
 return result
}
export function parsePageInput(input:string,pageCount:number):number|null {
 if(!/^\d+$/.test(input.trim()))return null
 const page=Number(input.trim())
 return valid(page,pageCount)?page:null
}

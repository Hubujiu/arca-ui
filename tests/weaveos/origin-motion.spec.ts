import {test,expect} from '@playwright/test'

test('window geometry really travels from and returns toward the trigger',async({page})=>{
 await page.goto('/weaveos.html')
 const trigger=page.getByRole('button',{name:'新建应用',exact:true})
 await trigger.click()
 const dialog=page.getByRole('dialog',{name:'创建应用',exact:true})
 await expect(dialog).toHaveCSS('transform','none')
 const opened=await dialog.boundingBox();expect(opened).not.toBeNull()
 const samples=page.evaluate(()=>new Promise<{width:number;x:number;y:number}[]>(resolve=>{
  const values:{width:number;x:number;y:number}[]=[];const start=performance.now()
  function sample(){const el=document.querySelector('[role="dialog"]');if(el){const b=el.getBoundingClientRect();values.push({width:b.width,x:b.x,y:b.y})}if(performance.now()-start>900){resolve(values);return}requestAnimationFrame(sample)}sample()
 }))
 await page.keyboard.press('Escape');const closing=await samples
 expect(closing.some(b=>b.width<opened!.width*.65)).toBe(true)
 await expect(dialog).toHaveCount(0)
 // Opening after a full close must start small again, not inherit the old expanded frame.
 const openingSamples=page.evaluate(()=>new Promise<number[]>(resolve=>{
  const widths:number[]=[];const start=performance.now();function sample(){const el=document.querySelector('[role="dialog"]');if(el)widths.push(el.getBoundingClientRect().width);if(performance.now()-start>900){resolve(widths);return}requestAnimationFrame(sample)}sample()
 }))
 await trigger.click();const opening=await openingSamples
 expect(opening.some(w=>w<opened!.width*.65)).toBe(true)
 await expect(dialog).toHaveCSS('transform','none')
 const final=await dialog.boundingBox();expect(Math.abs(final!.x+final!.width/2-720)).toBeLessThan(2)
})

// Additional acceptance for application-controlled success closure, not original TDD.
test('successful save returns the window toward its source too',async({page})=>{
 await page.goto('/weaveos.html')
 await page.getByRole('button',{name:'新建应用',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'创建应用',exact:true})
 await expect(dialog).toHaveCSS('transform','none')
 const opened=await dialog.boundingBox()
 await dialog.getByLabel('应用名称').fill('受控关闭测试')
 const samples=page.evaluate(()=>new Promise<number[]>(resolve=>{
  const widths:number[]=[];const start=performance.now();function sample(){const el=document.querySelector('[role="dialog"]');if(el)widths.push(el.getBoundingClientRect().width);if(performance.now()-start>2200){resolve(widths);return}requestAnimationFrame(sample)}sample()
 }))
 await dialog.getByRole('button',{name:'创建',exact:true}).click()
 await expect(page.getByRole('status')).toContainText('应用已创建')
 expect((await samples).some(w=>w<opened!.width*.65)).toBe(true)
 await expect(dialog).toHaveCount(0)
})

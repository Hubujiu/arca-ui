import {test,expect} from '@playwright/test'
import {armGeometry,finishGeometry,expectOrigin} from './motion-observer'

for(const name of ['新建应用','从卡片打开'])test(`window geometry opens from and returns to its actual ${name} source`,async({page})=>{
 await page.goto('/weaveos.html')
 const trigger=page.getByRole('button',{name,exact:true})
 const source=await trigger.boundingBox();expect(source).not.toBeNull()
 const dialog=page.getByRole('dialog',{name:'创建应用',exact:true})
 for(let cycle=0;cycle<2;cycle++){
  await armGeometry(page)
  await trigger.click()
  await expect(dialog).toHaveCSS('transform','none')
  expectOrigin(await finishGeometry(page),source!)
  const opened=await dialog.boundingBox();expect(opened).not.toBeNull()
  const viewport=page.viewportSize()!
  expect(Math.abs(opened!.x+opened!.width/2-viewport.width/2)).toBeLessThan(2)
  expect(Math.abs(opened!.y+opened!.height/2-viewport.height/2)).toBeLessThan(2)
  await armGeometry(page)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  expectOrigin(await finishGeometry(page),source!)
  await expect(trigger).toBeFocused()
 }
})

test('successful save returns the window to its source too',async({page})=>{
 await page.goto('/weaveos.html')
 const trigger=page.getByRole('button',{name:'新建应用',exact:true})
 const source=await trigger.boundingBox();expect(source).not.toBeNull()
 await trigger.click()
 const dialog=page.getByRole('dialog',{name:'创建应用',exact:true})
 await expect(dialog).toHaveCSS('transform','none')
 await dialog.getByLabel('应用名称').fill('受控关闭测试')
 await armGeometry(page)
 await dialog.getByRole('button',{name:'创建',exact:true}).click()
 await expect(page.getByRole('status')).toContainText('应用已创建')
 await expect(dialog).toHaveCount(0)
 expectOrigin(await finishGeometry(page),source!)
})

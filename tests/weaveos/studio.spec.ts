import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {armGeometry,finishGeometry,expectStationary} from './motion-observer'

test.beforeEach(async ({ page }) => { await page.goto('/weaveos.html') })

test('shell uses collapsible icon rail and edge-to-edge content card', async ({ page }) => {
 const shell = page.getByTestId('workspace-card')
 await expect(shell).toBeVisible()
 const b = await shell.boundingBox(); expect(b!.y).toBe(0); expect(b!.x + b!.width).toBe(1440); expect(b!.height).toBe(1000)
 await page.getByRole('button', { name: '收起侧边栏' }).click()
 await expect(page.getByTestId('sidebar')).toHaveAttribute('data-collapsed','true')
 await expect(page.getByRole('button', { name: '展开侧边栏' })).toBeVisible()
 await page.getByRole('button', { name: '展开侧边栏' }).hover()
 await expect(page.getByTestId('expand-glyph')).toHaveCSS('opacity', '1')
 await page.getByRole('button', { name: '展开侧边栏' }).click()
 await expect(page.getByTestId('sidebar')).toHaveAttribute('data-collapsed','false')
})

test('source dialog has accessible title, focus isolation and restores origin', async ({ page }) => {
 const trigger=page.getByRole('button',{name:'新建应用',exact:true}); await trigger.click()
 const dialog=page.getByRole('dialog',{name:'创建应用',exact:true}); await expect(dialog).toBeVisible()
 await expect(dialog.getByLabel('应用名称')).toBeFocused()
 // Base UI uses aria-hidden focus sentinels and redirects them on the next
 // animation frame. Actual background focus is still forbidden, even briefly.
 await page.evaluate(()=>{
  const escaped:string[]=[];(window as unknown as {v042FocusEscapes:string[]}).v042FocusEscapes=escaped
  document.addEventListener('focusin',event=>{const target=event.target;if(target instanceof HTMLElement && !target.closest('[role="dialog"]') && !target.hasAttribute('data-base-ui-focus-guard'))escaped.push(target.outerHTML)})
 })
 for(let i=0;i<10;i++) { await page.keyboard.press('Tab'); await expect.poll(()=>dialog.evaluate(el=>el.contains(document.activeElement)),{timeout:1000}).toBe(true) }
 expect(await page.evaluate(()=>(window as unknown as {v042FocusEscapes:string[]}).v042FocusEscapes)).toEqual([])
 await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused()
})

test('second source restores its own focus', async ({page})=>{
 const trigger=page.getByRole('button',{name:'从卡片打开'}); await trigger.click()
 await expect(page.getByRole('dialog',{name:'创建应用',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'关闭窗口',exact:true}).click()
 await expect(page.getByRole('dialog')).toHaveCount(0); await expect(trigger).toBeFocused()
})

test('close during opening and repeat never leaves an overlay or locked page', async ({page})=>{
 const trigger=page.getByRole('button',{name:'新建应用',exact:true})
 for(let i=0;i<3;i++) { await trigger.click(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0) }
 await trigger.click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape')
 await expect(page.getByRole('dialog')).toHaveCount(0)
 await expect(page.getByRole('button',{name:'收起侧边栏'})).toBeEnabled()
})

test('save feedback waits for result and errors retain editable input', async ({page})=>{
 await page.getByRole('button',{name:'新建应用',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'创建应用',exact:true})
 await dialog.getByLabel('应用名称').fill('测试应用')
 await dialog.getByRole('checkbox',{name:'模拟保存失败'}).check()
 await dialog.getByRole('button',{name:'创建',exact:true}).click()
 await expect(dialog.getByRole('button',{name:'保存中'})).toBeDisabled()
 await expect(page.getByText('应用已创建',{exact:true})).toHaveCount(0)
 await expect(dialog.getByRole('alert')).toContainText('保存失败')
 await expect(dialog.getByLabel('应用名称')).toHaveValue('测试应用')
 await dialog.getByRole('checkbox',{name:'模拟保存失败'}).uncheck()
 await dialog.getByRole('button',{name:'创建',exact:true}).click()
 await expect(page.getByRole('status')).toContainText('应用已创建')
 await expect(dialog).toBeHidden()
})

test('nested select Escape dismisses only the list, then dialog', async ({page})=>{
 await page.getByRole('button',{name:'新建应用',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'创建应用',exact:true})
 await dialog.getByRole('combobox',{name:'应用分组'}).click()
 await expect(page.getByRole('listbox')).toBeVisible()
 await page.keyboard.press('Escape'); await expect(page.getByRole('listbox')).toBeHidden(); await expect(dialog).toBeVisible()
 await page.keyboard.press('Escape'); await expect(dialog).toBeHidden()
})

test('reduced motion preserves usable modal without scale displacement', async ({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'}); await page.reload()
 await armGeometry(page)
 await page.getByRole('button',{name:'新建应用',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'创建应用',exact:true})
 await expect(dialog).toHaveAttribute('data-motion','reduced')
 await expect(dialog).toHaveCSS('opacity','1')
 await expect(dialog).toHaveCSS('transform', 'none')
 const target=await dialog.boundingBox();expect(target).not.toBeNull()
 expectStationary(await finishGeometry(page),target!)
 await armGeometry(page)
 await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0)
 expectStationary(await finishGeometry(page),target!)
})

test('mobile view fits viewport and dialog remains operable', async ({page})=>{
 await page.setViewportSize({width:390,height:844}); await page.reload()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
 await page.getByRole('button',{name:'新建应用',exact:true}).click()
 const dialog=page.getByRole('dialog',{name:'创建应用',exact:true}); await expect(dialog).toBeVisible()
 const b=await dialog.boundingBox(); expect(b!.x).toBeGreaterThanOrEqual(8); expect(b!.x+b!.width).toBeLessThanOrEqual(382)
 await page.keyboard.press('Escape'); await expect(dialog).toBeHidden()
})

test('theme controls, basic controls and component navigation work', async ({page})=>{
 await page.getByRole('button',{name:'基础控件',exact:true}).click()
 await expect(page.getByRole('heading',{name:'基础控件',exact:true})).toBeVisible()
 await page.getByLabel('项目名称').fill('WeaveOS')
 await page.getByRole('switch',{name:'允许编辑'}).click(); await expect(page.getByRole('switch',{name:'允许编辑'})).toBeChecked()
 await page.getByRole('checkbox',{name:'保存为草稿'}).check()
 await page.getByRole('button',{name:'深色模式'}).click()
 await expect(page.getByTestId('studio')).toHaveAttribute('data-theme','dark')
})

test('studio and open modal have no serious accessibility violations', async ({page})=>{
 for(const modal of [false,true]) {
 if(modal) {
  await page.getByRole('button',{name:'新建应用',exact:true}).click()
  await expect(page.getByRole('dialog')).toHaveCSS('opacity','1')
  await expect(page.getByRole('dialog')).toHaveCSS('transform','none')
 }
 const result=await new AxeBuilder({page}).analyze()
 expect(result.violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([])
 }
})

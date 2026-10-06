import { test, expect } from '@playwright/test'
// Visual checkpoints, not automatic approval of the current appearance.
test('capture component studio review images', async ({page})=>{
 await page.goto('/weaveos.html'); await expect(page.getByRole('heading',{name:'组件工作室',exact:true})).toBeVisible()
 await page.evaluate(()=>document.fonts.ready)
 const capture=async(name:string)=>{const b=await page.screenshot({fullPage:false});console.log(`V042_SCREENSHOT:${name}:${b.toString('base64')}`)}
 await capture('01-studio-desktop')
 await page.getByRole('button',{name:'新建应用',exact:true}).click(); await expect(page.getByRole('dialog')).toHaveCSS('transform','none'); await capture('02-origin-dialog')
 await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0)
 await page.getByRole('button',{name:'收起侧边栏'}).click(); await expect(page.getByTestId('sidebar')).toHaveAttribute('data-collapsed','true'); await capture('03-icon-rail')
 await page.getByRole('button',{name:'基础控件',exact:true}).click();await page.getByRole('button',{name:'深色模式'}).click();await capture('04-controls-dark')
 await page.getByRole('button',{name:'浅色模式'}).click();await page.getByRole('button',{name:'总览',exact:true}).click();await page.setViewportSize({width:390,height:844});await capture('05-studio-mobile')
})

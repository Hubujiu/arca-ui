import {test,expect} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.beforeEach(async({page})=>{await page.goto('/weaveos.html');await page.getByRole('button',{name:'导航与布局',exact:true}).click()})

test('breadcrumbs expose ancestor links and exactly one noninteractive current page',async({page})=>{
 const section=page.getByRole('region',{name:'面包屑组件'})
 const nav=section.getByRole('navigation',{name:'应用路径'})
 await expect(nav.getByRole('listitem')).toHaveCount(3)
 await expect(nav.getByRole('link',{name:'工作台',exact:true})).toHaveAttribute('href','/weaveos.html#workspace')
 await expect(nav.getByRole('link',{name:'人事管理',exact:true})).toHaveAttribute('href','/weaveos.html#people')
 const current=nav.locator('[aria-current="page"]');await expect(current).toHaveCount(1);await expect(current).toHaveText('成员记录')
 await expect(current).not.toHaveAttribute('href');expect(await current.evaluate(el=>(el as HTMLElement).tabIndex)).toBe(-1)
 await expect(section.getByRole('navigation',{name:'单级路径'}).locator('[aria-current="page"]')).toHaveText('工作台')
 await expect(section.getByRole('navigation',{name:'无链接路径'}).getByRole('link',{name:'未配置路由',exact:true})).toHaveCount(0)
})

test('breadcrumb navigation remains owned by the host and works from keyboard',async({page})=>{
 const section=page.getByRole('region',{name:'面包屑组件'})
 const nav=section.getByRole('navigation',{name:'应用路径'});const before=page.url()
 const ancestor=nav.getByRole('link',{name:'人事管理',exact:true});await ancestor.focus();await page.keyboard.press('Enter')
 await expect(section.getByRole('status')).toHaveText('导航请求：people')
 expect(page.url()).toBe(before);await expect(nav.locator('[aria-current="page"]')).toHaveText('成员记录')
 await nav.getByRole('link',{name:'工作台',exact:true}).click();await expect(section.getByRole('status')).toHaveText('导航请求：workspace')
 await expect(nav.locator('[aria-current="page"]')).toHaveText('成员记录')
})

test('long breadcrumb labels remain accessible and fit a narrow dark viewport',async({page})=>{
 await page.getByRole('button',{name:'深色模式',exact:true}).click();await page.setViewportSize({width:390,height:844})
 const section=page.getByRole('region',{name:'面包屑组件'});await section.scrollIntoViewIfNeeded()
 const long='跨区域人事与组织发展管理中心'.repeat(4)
 await expect(section.getByRole('navigation',{name:'长路径'}).getByRole('link',{name:long,exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
 const audit=await new AxeBuilder({page}).include('[data-testid="breadcrumbs-demo"]').analyze();expect(audit.violations).toEqual([])
 await page.setViewportSize({width:1440,height:1000});await section.scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/weaveos-breadcrumbs-dark.png'})
})

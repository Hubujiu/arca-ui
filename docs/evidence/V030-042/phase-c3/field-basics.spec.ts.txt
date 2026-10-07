import {test,expect} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
test.beforeEach(async({page})=>{await page.goto('/weaveos.html');await page.getByRole('button',{name:'基础控件',exact:true}).click()})
test('decimal string retains every digit and trailing zero through edits and blur',async({page})=>{
 const value='9007199254740993.123456789012345600'
 await page.getByLabel('精确金额',{exact:true}).fill(value);await page.getByLabel('精确金额',{exact:true}).press('Tab')
 await expect(page.getByLabel('精确金额',{exact:true})).toHaveValue(value)
 await expect(page.getByTestId('decimal-value')).toHaveText(JSON.stringify(value))
})
test('decimal zero remains a string while clearing produces explicit null',async({page})=>{
 const input=page.getByLabel('精确金额',{exact:true});await input.fill('0');await expect(page.getByTestId('decimal-value')).toHaveText('"0"')
 await input.fill('');await expect(page.getByTestId('decimal-value')).toHaveText('null')
})
test('nullable Boolean keeps null false and true separate',async({page})=>{
 const group=page.getByRole('radiogroup',{name:'审批布尔'})
 await expect(page.getByTestId('boolean-value')).toHaveText('null')
 await group.getByRole('radio',{name:'否',exact:true}).check();await expect(page.getByTestId('boolean-value')).toHaveText('false')
 await group.getByRole('radio',{name:'是',exact:true}).check();await expect(page.getByTestId('boolean-value')).toHaveText('true')
 await group.getByRole('radio',{name:'未填写',exact:true}).check();await expect(page.getByTestId('boolean-value')).toHaveText('null')
})
test('readonly fields cannot emit edits, including Boolean pointer and keyboard',async({page})=>{
 await page.getByRole('checkbox',{name:'字段只读'}).check()
 await expect(page.getByLabel('精确金额',{exact:true})).toHaveAttribute('readonly','')
 const group=page.getByRole('radiogroup',{name:'审批布尔'});await group.getByRole('radio',{name:'是',exact:true}).click();await page.keyboard.press('ArrowRight')
 await expect(page.getByTestId('boolean-value')).toHaveText('null')
 await expect(page.getByLabel('补充说明',{exact:true})).toHaveAttribute('readonly','')
})
test('multiline text preserves Unicode newlines and intentional empty text',async({page})=>{
 const value='第一行：费用说明\n第二行：🚀'
 await page.getByLabel('补充说明',{exact:true}).fill(value);await expect(page.getByTestId('textarea-value')).toHaveText(JSON.stringify(value))
 await page.getByLabel('补充说明',{exact:true}).fill('');await expect(page.getByTestId('textarea-value')).toHaveText('""')
})
test('field errors are associated with inputs and settled controls remain accessible',async({page})=>{
 await page.getByRole('checkbox',{name:'模拟字段错误'}).check()
 const input=page.getByLabel('精确金额',{exact:true});await expect(input).toHaveAttribute('aria-invalid','true')
 const described=await input.getAttribute('aria-describedby');expect(described).toBeTruthy()
 const error=page.getByText('金额不能为空',{exact:true});await expect(error).toBeVisible();expect(described?.split(' ')).toContain(await error.getAttribute('id'))
 const section=page.getByRole('region',{name:'项目字段控件'});await section.scrollIntoViewIfNeeded()
 const result=await new AxeBuilder({page}).include('[data-testid="field-basics"]').analyze();expect(result.violations).toEqual([])
 await page.screenshot({path:'test-results/weaveos-field-basics.png',fullPage:false})
})

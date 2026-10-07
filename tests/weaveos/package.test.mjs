import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as ui from '../../dist-library/index.js'
const directory=new URL('../../dist-library/',import.meta.url)
test('consumer artifact exports controls, theme and source-aware dialog',()=>{
 const approved=['Button','Input','Checkbox','Switch','Select','Badge','WeaveTheme','MorphDialog','MorphDialogTrigger','MorphDialogContent','MorphDialogTitle','MorphDialogDescription','MorphDialogClose','springs','originTransform','DataTable','Pagination','FilterManager','validateFilter','WorkspaceTabs','Breadcrumbs','Textarea','DecimalInput','NullableBooleanInput','Tooltip','TooltipProvider','TooltipTrigger','TooltipContent','Progress','Skeleton']
 assert.deepEqual(Object.keys(ui).sort(),approved.sort(),'the approved public component surface is exact, including every delivered control')
})
test('package has typed exports, explicit React peers and safe unpublished metadata',()=>{
 const p=JSON.parse(fs.readFileSync(new URL('package.json',directory)))
 assert.equal(p.name,'@weaveos/ui');assert.equal(p.private,true)
 assert.equal(p.exports['.'].types,'./index.d.ts');assert.equal(p.exports['.'].import,'./index.js')
 assert.equal(p.exports['./styles.css'],'./styles.css')
 assert.ok(p.peerDependencies.react);assert.ok(p.peerDependencies['react-dom']);assert.equal(p.peerDependencies['@base-ui/react'],'1.8.0')
 assert.ok(fs.existsSync(new URL('index.d.ts',directory)))
})
test('artifact has no source aliases or demo app and CSS stays scoped',()=>{
 const js=fs.readFileSync(new URL('index.js',directory),'utf8')
 assert.ok(!js.includes('@/'));assert.ok(!js.includes('createRoot('));assert.ok(!js.includes('模拟保存失败'))
 const css=fs.existsSync(new URL('styles.css',directory))?fs.readFileSync(new URL('styles.css',directory),'utf8'):''
 assert.ok(css.includes('.wo-breadcrumbs'));assert.ok(css.includes('.wo-table'));assert.ok(css.includes('.wo-pagination'));assert.ok(css.includes('.wo-filter'));assert.ok(css.includes('.wo-theme'));assert.ok(css.includes('.wo-dialog'));assert.ok(!/(^|})\s*body\s*\{/.test(css));assert.ok(!css.includes('@import "tailwindcss"'))
})
test('distributed license and source attribution accompany components',()=>{
 for(const name of ['REUI-LICENSE.txt','THIRD-PARTY.md'])assert.ok(fs.existsSync(new URL(name,directory)),`missing ${name}`)
})

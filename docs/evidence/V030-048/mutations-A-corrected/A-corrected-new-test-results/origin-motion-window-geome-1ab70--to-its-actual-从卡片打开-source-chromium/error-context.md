# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: origin-motion.spec.ts >> window geometry opens from and returns to its actual 从卡片打开 source
- Location: tests/weaveos/origin-motion.spec.ts:4:36

# Error details

```
Error: window must visit actual source bounds {"x":935,"y":371.296875,"width":173,"height":156}; first={"x":633.5,"y":422.06597900390625,"width":173,"height":155.86798095703125}; last={"x":500,"y":204.75,"width":440,"height":590.5}

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]: WeaveOS
        - button [ref=e10] [cursor=pointer]
      - generic [ref=e14]:
        - generic [ref=e27]:
          - strong [ref=e28]: 设计工作区
          - generic [ref=e29]: Arca / Base UI
        - generic [ref=e32]: 组件库
        - navigation [ref=e33]:
          - button [ref=e34] [cursor=pointer]:
            - generic [ref=e37]: 总览
          - button [ref=e39] [cursor=pointer]:
            - generic [ref=e41]: 基础控件
          - button [ref=e42] [cursor=pointer]:
            - generic [ref=e47]: 窗口与浮层
          - button [ref=e48] [cursor=pointer]:
            - generic [ref=e53]: 导航与布局
          - button [ref=e54] [cursor=pointer]:
            - generic [ref=e57]: 数据工作区
        - generic [ref=e58]: 资源
        - link [ref=e59] [cursor=pointer]:
          - /url: https://reui.io/docs
          - generic [ref=e64]: ReUI 文档
      - generic [ref=e69]:
        - generic [ref=e70]: W
        - generic [ref=e71]:
          - strong [ref=e72]: WeaveOS UI
          - generic [ref=e73]: 本地交互演示
    - main [ref=e77]:
      - generic [ref=e78]:
        - generic [ref=e79]:
          - generic [ref=e80]: 组件库
          - strong [ref=e83]: 总览
        - generic [ref=e84]:
          - generic [ref=e85]:
            - textbox [ref=e89]:
              - /placeholder: 搜索组件
            - generic [ref=e90]: ⌘ K
          - button [ref=e91] [cursor=pointer]
          - link [ref=e95] [cursor=pointer]:
            - /url: https://github.com/Hubujiu/arca-ui
      - generic [ref=e101]:
        - generic [ref=e102]:
          - generic [ref=e103]:
            - generic [ref=e104]: WEAVEOS / COMPONENTS
            - heading [level=1] [ref=e105]: 组件工作室
            - paragraph [ref=e106]: 统一的细节，自然的交互
          - generic [ref=e107]: Base UI
        - generic [ref=e108]:
          - generic [ref=e109]:
            - heading [level=2] [ref=e110]: 窗口，沿来路展开
            - generic [ref=e111]: 01 / INTERACTION
          - generic [ref=e112]:
            - generic [ref=e113]: 我的应用
            - button [ref=e118] [cursor=pointer]: 新建应用
          - generic [ref=e119]:
            - generic [ref=e120]:
              - generic [ref=e121]:
                - strong [ref=e128]: 人事管理
                - generic [ref=e129]: 成员 · 假勤
              - generic [ref=e130]:
                - strong [ref=e134]: 财务管理
                - generic [ref=e135]: 报销 · 费用
              - button [expanded] [ref=e136] [cursor=pointer]:
                - strong [ref=e139]: 创建应用
                - generic [ref=e140]: 从这里开始
            - generic [ref=e141]: 点击按钮或卡片，体验打开与收回
          - generic [ref=e146]:
            - generic [ref=e147]: 弹簧动效
            - generic [ref=e149]: 来源缩放
        - status [ref=e153]
        - generic [ref=e154]:
          - generic [ref=e155]:
            - generic [ref=e156]:
              - heading [level=2] [ref=e157]: 按钮
              - generic [ref=e158]: ACTION
            - generic [ref=e159]:
              - button [ref=e160] [cursor=pointer]: 新增记录
              - button [ref=e161] [cursor=pointer]: 导出
              - button [ref=e162] [cursor=pointer]: 取消
              - button [disabled]: 不可用
          - generic [ref=e163]:
            - generic [ref=e164]:
              - heading [level=2] [ref=e165]: 选择与切换
              - generic [ref=e166]: CONTROL
            - generic [ref=e167]:
              - generic [ref=e168] [cursor=pointer]:
                - generic [ref=e169]: 允许编辑
                - switch [ref=e170]
                - checkbox [aria-hidden] [ref=e171]
              - generic [ref=e172] [cursor=pointer]:
                - checkbox [ref=e173]
                - checkbox [aria-hidden] [ref=e174]
                - generic [ref=e175]: 保存为草稿
        - generic [ref=e176]:
          - generic [ref=e177]:
            - generic [ref=e178]:
              - heading [level=2] [ref=e179]: 输入
              - generic [ref=e180]: INPUT
            - generic [ref=e181]:
              - generic [ref=e182]:
                - generic [ref=e183]: 项目名称
                - textbox [ref=e184]:
                  - /placeholder: 输入项目名称
              - generic [ref=e185]:
                - generic [ref=e186]: 状态
                - combobox [ref=e187] [cursor=pointer]:
                  - generic [ref=e188]: 进行中
                - textbox [aria-hidden] [ref=e192]: team
          - generic [ref=e193]:
            - generic [ref=e194]:
              - heading [level=2] [ref=e195]: 状态
              - generic [ref=e196]: FEEDBACK
            - generic [ref=e197]:
              - generic [ref=e198]: 已启用
              - generic [ref=e200]: 待审批
              - generic [ref=e201]: 草稿
            - generic [ref=e202]:
              - generic [ref=e205]: 所有更改已保存
              - generic [ref=e206]: 状态示例
        - generic [ref=e207]:
          - generic [ref=e208]:
            - heading [level=2] [ref=e209]: 导航
            - generic [ref=e210]: NAVIGATION
          - generic [ref=e211]:
            - tablist [ref=e212]:
              - tab [selected] [ref=e213] [cursor=pointer]: 全部
              - tab [ref=e215] [cursor=pointer]: 进行中
              - tab [ref=e216] [cursor=pointer]: 已完成
            - generic [ref=e217]:
              - generic [ref=e218]: 应用
              - generic [ref=e221]: 人事管理
              - strong [ref=e224]: 成员
            - tabpanel [ref=e225]:
              - text: 全部工作事项
              - generic [ref=e226]: 全部
        - generic [ref=e227]:
          - generic [ref=e228]:
            - generic [ref=e231]: 字形
            - strong [ref=e232]: Aa 字
            - generic [ref=e233]: Geist · System
          - generic [ref=e234]:
            - generic [ref=e237]: 间距
            - generic [ref=e244]: 4 · 8 · 12 · 16 · 24
          - generic [ref=e245]:
            - generic [ref=e249]: 色彩
            - generic [ref=e256]: 黑白与中性色
        - generic [ref=e257]:
          - generic [ref=e258]: Arca · 为 WeaveOS 构建
          - generic [ref=e259]: React / Base UI / Motion
  - dialog [ref=e262]:
    - heading "创建应用" [level=2] [ref=e274]
    - paragraph [ref=e275]: 给新的工作空间起一个名字
    - generic [ref=e276]:
      - generic [ref=e277]:
        - generic [ref=e278]: 应用名称
        - textbox "应用名称" [active] [ref=e279]:
          - /placeholder: 例如：客户管理
      - generic [ref=e280]:
        - generic [ref=e281]: 应用分组
        - combobox "应用分组" [ref=e282] [cursor=pointer]:
          - generic [ref=e283]: 团队应用
        - textbox [aria-hidden] [ref=e287]: team
      - generic [ref=e288]:
        - generic [ref=e289]: 描述 可选
        - textbox "描述 可选" [ref=e290]:
          - /placeholder: 这个应用用来做什么？
      - generic [ref=e291]:
        - generic [ref=e292] [cursor=pointer]:
          - checkbox "模拟保存失败" [ref=e293]
          - checkbox [aria-hidden] [ref=e294]
          - generic [ref=e295]: 模拟保存失败
        - generic [ref=e296]: 交互演示
      - generic [ref=e297]:
        - button "取消" [ref=e298] [cursor=pointer]
        - button "创建" [ref=e299] [cursor=pointer]
    - button "关闭窗口" [ref=e300] [cursor=pointer]
```

# Test source

```ts
  1  | import {expect} from '@playwright/test'
  2  | import type {Page} from '@playwright/test'
  3  | export type Box={x:number;y:number;width:number;height:number}
  4  | 
  5  | // Observe before the interaction, including the first committed layout. Sampling
  6  | // cannot infer the expected origin from the component's own geometry function.
  7  | export async function armGeometry(page:Page){
  8  |  await page.evaluate(()=>{
  9  |   type Capture={values:{x:number;y:number;width:number;height:number}[];stop:()=>void}
  10 |   const host=window as typeof window&{weaveGeometry?:Capture}
  11 |   host.weaveGeometry?.stop()
  12 |   const values:Capture['values']=[]
  13 |   let frame=0,active=true
  14 |   const sample=()=>{const el=document.querySelector('[role="dialog"]');if(el){const b=el.getBoundingClientRect();if(b.width>0&&b.height>0)values.push({x:b.x,y:b.y,width:b.width,height:b.height})}}
  15 |   const observer=new MutationObserver(sample)
  16 |   observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style']})
  17 |   const tick=()=>{sample();if(active)frame=requestAnimationFrame(tick)}
  18 |   tick()
  19 |   host.weaveGeometry={values,stop:()=>{active=false;cancelAnimationFrame(frame);observer.disconnect()}}
  20 |  })
  21 | }
  22 | export async function finishGeometry(page:Page):Promise<Box[]>{
  23 |  return page.evaluate(()=>{
  24 |   const capture=(window as typeof window&{weaveGeometry?:{values:{x:number;y:number;width:number;height:number}[];stop:()=>void}}).weaveGeometry
  25 |   if(!capture)throw new Error('geometry observation was not armed')
  26 |   capture.stop();return capture.values
  27 |  })
  28 | }
  29 | export function expectOrigin(samples:Box[],source:Box){
  30 |  expect(samples.length,'actual rendered geometry samples').toBeGreaterThan(0)
  31 |  const near=samples.some(b=>Math.abs(b.x-source.x)<=6&&Math.abs(b.y-source.y)<=6&&Math.abs(b.width-source.width)<=6&&Math.abs(b.height-source.height)<=6)
> 32 |  expect(near,`window must visit actual source bounds ${JSON.stringify(source)}; first=${JSON.stringify(samples[0])}; last=${JSON.stringify(samples.at(-1))}`).toBe(true)
     |                                                                                                                                                               ^ Error: window must visit actual source bounds {"x":935,"y":371.296875,"width":173,"height":156}; first={"x":633.5,"y":422.06597900390625,"width":173,"height":155.86798095703125}; last={"x":500,"y":204.75,"width":440,"height":590.5}
  33 | }
  34 | export function expectStationary(samples:Box[],target:Box){
  35 |  expect(samples.length,'reduced-motion transition must actually be observed').toBeGreaterThan(0)
  36 |  for(const b of samples){
  37 |   expect(Math.abs(b.x-target.x)).toBeLessThanOrEqual(1)
  38 |   expect(Math.abs(b.y-target.y)).toBeLessThanOrEqual(1)
  39 |   expect(Math.abs(b.width-target.width)).toBeLessThanOrEqual(1)
  40 |   expect(Math.abs(b.height-target.height)).toBeLessThanOrEqual(1)
  41 |  }
  42 | }
  43 | 
```
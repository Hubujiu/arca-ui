# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: filter-manager.spec.ts >> constructs AND with an OR subgroup and persists exact conditions
- Location: tests/weaveos/filter-manager.spec.ts:14:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

@@ -15,10 +15,10 @@
            },
          ],
          "operator": "or",
        },
      ],
-     "operator": "and",
+     "operator": "or",
    },
    "id": Any<String>,
    "name": "财务检查",
  }
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - complementary [aria-hidden] [ref=e4]:
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
          - button [ref=e38] [cursor=pointer]:
            - generic [ref=e40]: 基础控件
          - button [ref=e41] [cursor=pointer]:
            - generic [ref=e46]: 窗口与浮层
          - button [ref=e47] [cursor=pointer]:
            - generic [ref=e52]: 导航与布局
          - button [ref=e53] [cursor=pointer]:
            - generic [ref=e56]: 数据工作区
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
      - generic [aria-hidden] [ref=e78]:
        - generic [ref=e79]:
          - generic [ref=e80]: 组件库
          - strong [ref=e83]: 数据工作区
        - generic [ref=e84]:
          - generic [ref=e85]:
            - textbox [ref=e89]:
              - /placeholder: 搜索组件
            - generic [ref=e90]: ⌘ K
          - button [ref=e91] [cursor=pointer]
          - link [ref=e95] [cursor=pointer]:
            - /url: https://github.com/Hubujiu/arca-ui
      - generic [ref=e101]:
        - region "数据工作区" [ref=e102]:
          - generic [aria-hidden] [ref=e103]:
            - generic [ref=e104]:
              - text: DATA WORKSPACE
              - heading [level=1] [ref=e105]: 报销记录
            - generic [ref=e106]: 组件预览
          - generic [aria-hidden] [ref=e107]:
            - generic [ref=e108]: 已选 0 条
            - generic [ref=e109]:
              - generic [ref=e110]:
                - generic [ref=e111]: 全部记录
                - button [expanded] [ref=e112] [cursor=pointer]: 自定义筛选
                - status [ref=e113]: "[{\"id\":\"pending\",\"name\":\"待审批\",\"filter\":{\"operator\":\"and\",\"children\":[{\"fieldId\":\"status\",\"operator\":\"eq\",\"value\":\"审批中\"}]}},{\"id\":\"large\",\"name\":\"大额报销\",\"filter\":{\"operator\":\"and\",\"children\":[{\"fieldId\":\"amount\",\"operator\":\"gte\",\"value\":\"2000\"}]}},{\"id\":\"1f7adc8b-666d-4807-9e89-eef52d681a2a\",\"name\":\"财务检查\",\"filter\":{\"operator\":\"or\",\"children\":[{\"fieldId\":\"reason\",\"operator\":\"eq\",\"value\":\"差旅\"},{\"operator\":\"or\",\"children\":[{\"fieldId\":\"reason\",\"operator\":\"eq\",\"value\":\"客户\"}]}]}}]"
              - button [ref=e114] [cursor=pointer]
              - button [ref=e115] [cursor=pointer]: 显示字段
          - generic [aria-hidden] [ref=e116]:
            - table [ref=e119]:
              - rowgroup [ref=e120]:
                - row [ref=e121]:
                  - columnheader [ref=e122]:
                    - generic [ref=e123] [cursor=pointer]:
                      - checkbox [ref=e124]
                      - checkbox [aria-hidden] [ref=e125]
                      - generic [ref=e126]: 选择当前页记录
                  - columnheader [ref=e127]: 编号
                  - columnheader [ref=e128]: 申请人
                  - columnheader [ref=e129]: 事由
                  - columnheader [ref=e130]:
                    - button [ref=e131] [cursor=pointer]: 金额
                  - columnheader [ref=e135]:
                    - button [ref=e136] [cursor=pointer]: 申请日期
                  - columnheader [ref=e140]: 状态
              - rowgroup [ref=e141]:
                - row [ref=e142]:
                  - cell [ref=e143]:
                    - generic [ref=e144] [cursor=pointer]:
                      - checkbox [ref=e145]
                      - checkbox [aria-hidden] [ref=e146]
                      - generic [ref=e147]: 选择记录 BX-00001
                  - cell [ref=e148]: BX-00001
                  - cell [ref=e149]:
                    - generic [ref=e150]:
                      - generic [aria-hidden] [ref=e151]: 林
                      - text: 林亦
                  - cell [ref=e152]: 项目差旅
                  - cell [ref=e153]: ¥ 1,280.00
                  - cell [ref=e154]: 2026-10-07
                  - cell [ref=e155]:
                    - generic [ref=e156]: 已通过
                - row [ref=e157]:
                  - cell [ref=e158]:
                    - generic [ref=e159] [cursor=pointer]:
                      - checkbox [ref=e160]
                      - checkbox [aria-hidden] [ref=e161]
                      - generic [ref=e162]: 选择记录 BX-00002
                  - cell [ref=e163]: BX-00002
                  - cell [ref=e164]:
                    - generic [ref=e165]:
                      - generic [aria-hidden] [ref=e166]: 陈
                      - text: 陈清
                  - cell [ref=e167]: 办公用品
                  - cell [ref=e168]: ¥ 560.00
                  - cell [ref=e169]: 2026-10-06
                  - cell [ref=e170]:
                    - generic [ref=e171]: 审批中
                - row [ref=e172]:
                  - cell [ref=e173]:
                    - generic [ref=e174] [cursor=pointer]:
                      - checkbox [ref=e175]
                      - checkbox [aria-hidden] [ref=e176]
                      - generic [ref=e177]: 选择记录 BX-00003
                  - cell [ref=e178]: BX-00003
                  - cell [ref=e179]:
                    - generic [ref=e180]:
                      - generic [aria-hidden] [ref=e181]: 周
                      - text: 周予
                  - cell [ref=e182]: 客户拜访
                  - cell [ref=e183]: ¥ 2,360.00
                  - cell [ref=e184]: 2026-10-05
                  - cell [ref=e185]:
                    - generic [ref=e186]: 审批中
                - row [ref=e187]:
                  - cell [ref=e188]:
                    - generic [ref=e189] [cursor=pointer]:
                      - checkbox [ref=e190]
                      - checkbox [aria-hidden] [ref=e191]
                      - generic [ref=e192]: 选择记录 BX-00004
                  - cell [ref=e193]: BX-00004
                  - cell [ref=e194]:
                    - generic [ref=e195]:
                      - generic [aria-hidden] [ref=e196]: 许
                      - text: 许知
                  - cell [ref=e197]: 技术培训
                  - cell [ref=e198]: ¥ 890.00
                  - cell [ref=e199]: 2026-10-04
                  - cell [ref=e200]:
                    - generic [ref=e201]: 已通过
                - row [ref=e202]:
                  - cell [ref=e203]:
                    - generic [ref=e204] [cursor=pointer]:
                      - checkbox [ref=e205]
                      - checkbox [aria-hidden] [ref=e206]
                      - generic [ref=e207]: 选择记录 BX-00005
                  - cell [ref=e208]: BX-00005
                  - cell [ref=e209]:
                    - generic [ref=e210]:
                      - generic [aria-hidden] [ref=e211]: 林
                      - text: 林亦
                  - cell [ref=e212]: 项目差旅
                  - cell [ref=e213]: ¥ 1,280.00
                  - cell [ref=e214]: 2026-10-03
                  - cell [ref=e215]:
                    - generic [ref=e216]: 审批中
                - row [ref=e217]:
                  - cell [ref=e218]:
                    - generic [ref=e219] [cursor=pointer]:
                      - checkbox [ref=e220]
                      - checkbox [aria-hidden] [ref=e221]
                      - generic [ref=e222]: 选择记录 BX-00006
                  - cell [ref=e223]: BX-00006
                  - cell [ref=e224]:
                    - generic [ref=e225]:
                      - generic [aria-hidden] [ref=e226]: 陈
                      - text: 陈清
                  - cell [ref=e227]: 办公用品
                  - cell [ref=e228]: ¥ 560.00
                  - cell [ref=e229]: 2026-10-02
                  - cell [ref=e230]:
                    - generic [ref=e231]: 审批中
                - row [ref=e232]:
                  - cell [ref=e233]:
                    - generic [ref=e234] [cursor=pointer]:
                      - checkbox [ref=e235]
                      - checkbox [aria-hidden] [ref=e236]
                      - generic [ref=e237]: 选择记录 BX-00007
                  - cell [ref=e238]: BX-00007
                  - cell [ref=e239]:
                    - generic [ref=e240]:
                      - generic [aria-hidden] [ref=e241]: 周
                      - text: 周予
                  - cell [ref=e242]: 客户拜访
                  - cell [ref=e243]: ¥ 2,360.00
                  - cell [ref=e244]: 2026-10-01
                  - cell [ref=e245]:
                    - generic [ref=e246]: 已通过
                - row [ref=e247]:
                  - cell [ref=e248]:
                    - generic [ref=e249] [cursor=pointer]:
                      - checkbox [ref=e250]
                      - checkbox [aria-hidden] [ref=e251]
                      - generic [ref=e252]: 选择记录 BX-00008
                  - cell [ref=e253]: BX-00008
                  - cell [ref=e254]:
                    - generic [ref=e255]:
                      - generic [aria-hidden] [ref=e256]: 许
                      - text: 许知
                  - cell [ref=e257]: 技术培训
                  - cell [ref=e258]: ¥ 890.00
                  - cell [ref=e259]: 2026-10-07
                  - cell [ref=e260]:
                    - generic [ref=e261]: 审批中
                - row [ref=e262]:
                  - cell [ref=e263]:
                    - generic [ref=e264] [cursor=pointer]:
                      - checkbox [ref=e265]
                      - checkbox [aria-hidden] [ref=e266]
                      - generic [ref=e267]: 选择记录 BX-00009
                  - cell [ref=e268]: BX-00009
                  - cell [ref=e269]:
                    - generic [ref=e270]:
                      - generic [aria-hidden] [ref=e271]: 林
                      - text: 林亦
                  - cell [ref=e272]: 项目差旅
                  - cell [ref=e273]: ¥ 1,280.00
                  - cell [ref=e274]: 2026-10-06
                  - cell [ref=e275]:
                    - generic [ref=e276]: 审批中
                - row [ref=e277]:
                  - cell [ref=e278]:
                    - generic [ref=e279] [cursor=pointer]:
                      - checkbox [ref=e280]
                      - checkbox [aria-hidden] [ref=e281]
                      - generic [ref=e282]: 选择记录 BX-00010
                  - cell [ref=e283]: BX-00010
                  - cell [ref=e284]:
                    - generic [ref=e285]:
                      - generic [aria-hidden] [ref=e286]: 陈
                      - text: 陈清
                  - cell [ref=e287]: 办公用品
                  - cell [ref=e288]: ¥ 560.00
                  - cell [ref=e289]: 2026-10-05
                  - cell [ref=e290]:
                    - generic [ref=e291]: 已通过
                - row [ref=e292]:
                  - cell [ref=e293]:
                    - generic [ref=e294] [cursor=pointer]:
                      - checkbox [ref=e295]
                      - checkbox [aria-hidden] [ref=e296]
                      - generic [ref=e297]: 选择记录 BX-00011
                  - cell [ref=e298]: BX-00011
                  - cell [ref=e299]:
                    - generic [ref=e300]:
                      - generic [aria-hidden] [ref=e301]: 周
                      - text: 周予
                  - cell [ref=e302]: 客户拜访
                  - cell [ref=e303]: ¥ 2,360.00
                  - cell [ref=e304]: 2026-10-04
                  - cell [ref=e305]:
                    - generic [ref=e306]: 审批中
                - row [ref=e307]:
                  - cell [ref=e308]:
                    - generic [ref=e309] [cursor=pointer]:
                      - checkbox [ref=e310]
                      - checkbox [aria-hidden] [ref=e311]
                      - generic [ref=e312]: 选择记录 BX-00012
                  - cell [ref=e313]: BX-00012
                  - cell [ref=e314]:
                    - generic [ref=e315]:
                      - generic [aria-hidden] [ref=e316]: 许
                      - text: 许知
                  - cell [ref=e317]: 技术培训
                  - cell [ref=e318]: ¥ 890.00
                  - cell [ref=e319]: 2026-10-03
                  - cell [ref=e320]:
                    - generic [ref=e321]: 审批中
                - row [ref=e322]:
                  - cell [ref=e323]:
                    - generic [ref=e324] [cursor=pointer]:
                      - checkbox [ref=e325]
                      - checkbox [aria-hidden] [ref=e326]
                      - generic [ref=e327]: 选择记录 BX-00013
                  - cell [ref=e328]: BX-00013
                  - cell [ref=e329]:
                    - generic [ref=e330]:
                      - generic [aria-hidden] [ref=e331]: 林
                      - text: 林亦
                  - cell [ref=e332]: 项目差旅
                  - cell [ref=e333]: ¥ 1,280.00
                  - cell [ref=e334]: 2026-10-02
                  - cell [ref=e335]:
                    - generic [ref=e336]: 已通过
                - row [ref=e337]:
                  - cell [ref=e338]:
                    - generic [ref=e339] [cursor=pointer]:
                      - checkbox [ref=e340]
                      - checkbox [aria-hidden] [ref=e341]
                      - generic [ref=e342]: 选择记录 BX-00014
                  - cell [ref=e343]: BX-00014
                  - cell [ref=e344]:
                    - generic [ref=e345]:
                      - generic [aria-hidden] [ref=e346]: 陈
                      - text: 陈清
                  - cell [ref=e347]: 办公用品
                  - cell [ref=e348]: ¥ 560.00
                  - cell [ref=e349]: 2026-10-01
                  - cell [ref=e350]:
                    - generic [ref=e351]: 审批中
                - row [ref=e352]:
                  - cell [ref=e353]:
                    - generic [ref=e354] [cursor=pointer]:
                      - checkbox [ref=e355]
                      - checkbox [aria-hidden] [ref=e356]
                      - generic [ref=e357]: 选择记录 BX-00015
                  - cell [ref=e358]: BX-00015
                  - cell [ref=e359]:
                    - generic [ref=e360]:
                      - generic [aria-hidden] [ref=e361]: 周
                      - text: 周予
                  - cell [ref=e362]: 客户拜访
                  - cell [ref=e363]: ¥ 2,360.00
                  - cell [ref=e364]: 2026-10-07
                  - cell [ref=e365]:
                    - generic [ref=e366]: 审批中
                - row [ref=e367]:
                  - cell [ref=e368]:
                    - generic [ref=e369] [cursor=pointer]:
                      - checkbox [ref=e370]
                      - checkbox [aria-hidden] [ref=e371]
                      - generic [ref=e372]: 选择记录 BX-00016
                  - cell [ref=e373]: BX-00016
                  - cell [ref=e374]:
                    - generic [ref=e375]:
                      - generic [aria-hidden] [ref=e376]: 许
                      - text: 许知
                  - cell [ref=e377]: 技术培训
                  - cell [ref=e378]: ¥ 890.00
                  - cell [ref=e379]: 2026-10-06
                  - cell [ref=e380]:
                    - generic [ref=e381]: 已通过
                - row [ref=e382]:
                  - cell [ref=e383]:
                    - generic [ref=e384] [cursor=pointer]:
                      - checkbox [ref=e385]
                      - checkbox [aria-hidden] [ref=e386]
                      - generic [ref=e387]: 选择记录 BX-00017
                  - cell [ref=e388]: BX-00017
                  - cell [ref=e389]:
                    - generic [ref=e390]:
                      - generic [aria-hidden] [ref=e391]: 林
                      - text: 林亦
                  - cell [ref=e392]: 项目差旅
                  - cell [ref=e393]: ¥ 1,280.00
                  - cell [ref=e394]: 2026-10-05
                  - cell [ref=e395]:
                    - generic [ref=e396]: 审批中
                - row [ref=e397]:
                  - cell [ref=e398]:
                    - generic [ref=e399] [cursor=pointer]:
                      - checkbox [ref=e400]
                      - checkbox [aria-hidden] [ref=e401]
                      - generic [ref=e402]: 选择记录 BX-00018
                  - cell [ref=e403]: BX-00018
                  - cell [ref=e404]:
                    - generic [ref=e405]:
                      - generic [aria-hidden] [ref=e406]: 陈
                      - text: 陈清
                  - cell [ref=e407]: 办公用品
                  - cell [ref=e408]: ¥ 560.00
                  - cell [ref=e409]: 2026-10-04
                  - cell [ref=e410]:
                    - generic [ref=e411]: 审批中
                - row [ref=e412]:
                  - cell [ref=e413]:
                    - generic [ref=e414] [cursor=pointer]:
                      - checkbox [ref=e415]
                      - checkbox [aria-hidden] [ref=e416]
                      - generic [ref=e417]: 选择记录 BX-00019
                  - cell [ref=e418]: BX-00019
                  - cell [ref=e419]:
                    - generic [ref=e420]:
                      - generic [aria-hidden] [ref=e421]: 周
                      - text: 周予
                  - cell [ref=e422]: 客户拜访
                  - cell [ref=e423]: ¥ 2,360.00
                  - cell [ref=e424]: 2026-10-03
                  - cell [ref=e425]:
                    - generic [ref=e426]: 已通过
                - row [ref=e427]:
                  - cell [ref=e428]:
                    - generic [ref=e429] [cursor=pointer]:
                      - checkbox [ref=e430]
                      - checkbox [aria-hidden] [ref=e431]
                      - generic [ref=e432]: 选择记录 BX-00020
                  - cell [ref=e433]: BX-00020
                  - cell [ref=e434]:
                    - generic [ref=e435]:
                      - generic [aria-hidden] [ref=e436]: 许
                      - text: 许知
                  - cell [ref=e437]: 技术培训
                  - cell [ref=e438]: ¥ 890.00
                  - cell [ref=e439]: 2026-10-02
                  - cell [ref=e440]:
                    - generic [ref=e441]: 审批中
            - status [ref=e442]
          - navigation "表格分页" [ref=e443]:
            - generic [aria-hidden] [ref=e444]: 共 10,000,000 条
            - generic [ref=e445]: 当前第 1 页
            - combobox [aria-hidden] [ref=e446] [cursor=pointer]:
              - generic [ref=e447]: 20 条 / 页
            - textbox [aria-hidden] [ref=e451]: "20"
            - generic [aria-hidden] [ref=e452]:
              - button [disabled]
              - button [ref=e453] [cursor=pointer]: "1"
              - button [ref=e454] [cursor=pointer]: "2"
              - button [ref=e455] [cursor=pointer]: "3"
              - button [ref=e456] [cursor=pointer]: "4"
              - generic [aria-hidden] [ref=e457]: …
              - button [ref=e458] [cursor=pointer]: "500000"
              - button [ref=e459] [cursor=pointer]
            - generic [aria-hidden] [ref=e460]:
              - generic [ref=e461]: 跳至
              - textbox [ref=e462]:
                - /placeholder: "1"
              - generic [ref=e463]: 页
          - group [aria-hidden] [ref=e464]:
            - generic [ref=e465] [cursor=pointer]: 演示控制
            - generic [ref=e466] [cursor=pointer]:
              - checkbox [ref=e467]
              - checkbox [aria-hidden] [ref=e468]
              - generic [ref=e469]: 暂停模拟响应
            - generic [ref=e470] [cursor=pointer]:
              - checkbox [ref=e471]
              - checkbox [aria-hidden] [ref=e472]
              - generic [ref=e473]: 模拟查询失败
            - button [ref=e474] [cursor=pointer]: 模拟相关数据变化
            - status [ref=e475]: "0"
            - status [ref=e476]: "{\"page\":1,\"sort\":null}"
        - generic [aria-hidden] [ref=e477]:
          - generic [ref=e478]: Arca · 为 WeaveOS 构建
          - generic [ref=e479]: React / Base UI / Motion
  - dialog [ref=e482]:
    - heading "自定义筛选" [level=2] [ref=e483]
    - paragraph [ref=e484]: 选择一个筛选应用到当前表格
    - generic [ref=e485]:
      - generic [ref=e486]:
        - generic [ref=e487]:
          - strong [ref=e488]: 待审批
          - generic [ref=e489]: 1 项条件
        - button "编辑：待审批" [ref=e490] [cursor=pointer]
        - button "删除：待审批" [ref=e491] [cursor=pointer]
        - button "应用：待审批" [ref=e492] [cursor=pointer]: 应用
      - generic [ref=e493]:
        - generic [ref=e494]:
          - strong [ref=e495]: 大额报销
          - generic [ref=e496]: 1 项条件
        - button "编辑：大额报销" [ref=e497] [cursor=pointer]
        - button "删除：大额报销" [ref=e498] [cursor=pointer]
        - button "应用：大额报销" [ref=e499] [cursor=pointer]: 应用
      - generic [ref=e500]:
        - generic [ref=e501]:
          - strong [ref=e502]: 财务检查
          - generic [ref=e503]: 2 项条件
        - button "编辑：财务检查" [ref=e504] [cursor=pointer]
        - button "删除：财务检查" [ref=e505] [cursor=pointer]
        - button "应用：财务检查" [ref=e506] [cursor=pointer]: 应用
    - generic [ref=e507]:
      - button "关闭" [ref=e508] [cursor=pointer]
      - button "新建筛选" [ref=e509] [cursor=pointer]
    - button "关闭窗口" [ref=e510] [cursor=pointer]
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test'
  2  | import AxeBuilder from '@axe-core/playwright'
  3  | test.beforeEach(async({page})=>{await page.goto('/weaveos.html');await page.getByRole('button',{name:'数据工作区',exact:true}).click();await page.getByRole('button',{name:'自定义筛选',exact:true}).click()})
  4  | test('opens saved-filter management first, with only one preset applied',async({page})=>{
  5  |  const dialog=page.getByRole('dialog',{name:'自定义筛选'});await expect(dialog).toBeVisible()
  6  |  await expect(dialog).toHaveCSS('opacity','1');await page.screenshot({path:'test-results/weaveos-filter-manager.png'})
  7  |  await dialog.getByRole('button',{name:'应用：待审批'}).click()
  8  |  await expect(page.getByTestId('filter-applied')).toHaveText('待审批')
  9  |  await page.getByRole('button',{name:'自定义筛选',exact:true}).click()
  10 |  await dialog.getByRole('button',{name:'应用：大额报销'}).click()
  11 |  await expect(page.getByTestId('filter-applied')).toHaveText('大额报销')
  12 |  await page.getByRole('button',{name:'清除筛选'}).click();await expect(page.getByTestId('filter-applied')).toHaveText('全部记录')
  13 | })
  14 | test('constructs AND with an OR subgroup and persists exact conditions',async({page})=>{
  15 |  const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'新建筛选'}).click()
  16 |  await dialog.getByLabel('筛选名称').fill('财务检查')
  17 |  await dialog.getByLabel('条件值 1.1',{exact:true}).fill('差旅')
  18 |  await dialog.getByRole('button',{name:'添加或条件组 1',exact:true}).click()
  19 |  await expect(dialog.getByRole('group',{name:'或条件组 1.2',exact:true})).toBeVisible()
  20 |  await dialog.getByLabel('条件值 1.2.1',{exact:true}).fill('客户')
  21 |  await page.screenshot({path:'test-results/weaveos-filter-nested.png'})
  22 |  await dialog.getByRole('button',{name:'保存筛选',exact:true}).click()
  23 |  await expect(dialog.getByRole('button',{name:'应用：财务检查'})).toBeVisible()
  24 |  const saved=JSON.parse(await page.getByTestId('filter-saved').innerText()).find((preset:{name:string})=>preset.name==='财务检查')
> 25 |  expect(saved).toEqual({id:expect.any(String),name:'财务检查',filter:{operator:'and',children:[{fieldId:'reason',operator:'eq',value:'差旅'},{operator:'or',children:[{fieldId:'reason',operator:'eq',value:'客户'}]}]}})
     |                ^ Error: expect(received).toEqual(expected) // deep equality
  26 | })
  27 | test('failed persistence retains editor and never reports saved',async({page})=>{
  28 |  await page.getByRole('dialog').getByRole('button',{name:'新建筛选'}).click()
  29 |  await page.getByLabel('筛选名称').fill('失败不丢失')
  30 |  await page.getByRole('checkbox',{name:'模拟筛选保存失败'}).check()
  31 |  await page.getByRole('button',{name:'保存筛选',exact:true}).click()
  32 |  await expect(page.getByRole('alert')).toContainText('模拟保存失败')
  33 |  await expect(page.getByLabel('筛选名称')).toHaveValue('失败不丢失')
  34 |  await expect(page.getByTestId('filter-saved')).not.toContainText('失败不丢失')
  35 | })
  36 | test('dirty Escape asks before discarding and restores source focus',async({page})=>{
  37 |  await page.getByRole('button',{name:'新建筛选'}).click();await page.getByLabel('筛选名称').fill('未保存')
  38 |  await page.keyboard.press('Escape')
  39 |  const dialog=page.getByRole('dialog');await expect(dialog.getByText('放弃未保存的修改？')).toBeVisible()
  40 |  await dialog.getByRole('button',{name:'继续编辑'}).click();await expect(page.getByLabel('筛选名称')).toHaveValue('未保存')
  41 |  await page.keyboard.press('Escape');await dialog.getByRole('button',{name:'放弃修改'}).click();await expect(dialog).toBeHidden()
  42 |  await expect(page.getByRole('button',{name:'自定义筛选',exact:true})).toBeFocused()
  43 | })
  44 | test('text comparisons exclude range operators and editor is accessible',async({page})=>{
  45 |  await page.getByRole('button',{name:'新建筛选'}).click()
  46 |  await page.getByRole('combobox',{name:'比较方式 1.1'}).click()
  47 |  await expect(page.getByRole('option')).toHaveText(['等于','不等于'])
  48 |  await page.keyboard.press('Escape')
  49 |  const scan=await new AxeBuilder({page}).include('[role="dialog"]').analyze();expect(scan.violations).toEqual([])
  50 |  await page.screenshot({path:'test-results/weaveos-filter-editor.png',fullPage:false})
  51 | })
  52 | test('applying a preset emits a page-one host query without client-side table filtering',async({page})=>{
  53 |  await page.getByRole('button',{name:'应用：待审批'}).click()
  54 |  await expect.poll(async()=>JSON.parse(await page.getByTestId('table-request').innerText())).toEqual({page:1,sort:null,filter:{operator:'and',children:[{fieldId:'status',operator:'eq',value:'审批中'}]}})
  55 | })
  56 | test('editing a saved preset preserves identity, saving alone does not apply',async({page})=>{
  57 |  await page.getByRole('button',{name:'编辑：待审批'}).click();await expect(page.getByLabel('筛选名称')).toHaveValue('待审批')
  58 |  await page.getByLabel('筛选名称').fill('我的待办');await page.getByRole('button',{name:'保存筛选',exact:true}).click()
  59 |  await expect(page.getByRole('button',{name:'应用：我的待办'})).toBeVisible()
  60 |  await expect(page.getByRole('button',{name:'应用：待审批'})).toHaveCount(0)
  61 |  await expect(page.getByTestId('filter-applied')).toHaveText('全部记录')
  62 | })
  63 | test('deleting a preset requires confirmation and cancellation preserves it',async({page})=>{
  64 |  await page.getByRole('button',{name:'删除：待审批'}).click();await page.getByRole('button',{name:'取消',exact:true}).click()
  65 |  await expect(page.getByRole('button',{name:'应用：待审批'})).toBeVisible()
  66 |  await page.getByRole('button',{name:'删除：待审批'}).click();await page.getByRole('button',{name:'确认删除'}).click()
  67 |  await expect(page.getByRole('button',{name:'应用：待审批'})).toHaveCount(0)
  68 | })
  69 | 
```
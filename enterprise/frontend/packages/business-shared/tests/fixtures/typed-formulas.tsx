import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import "../../src/styles.css";
import {FieldRenderer} from "../../src/lowcode/FieldRenderer";
import {CalculationEditor} from "../../src/lowcode/CalculationEditor";
import {RuleEditor} from "../../src/lowcode/RuleEditor";
import {RecordPrint} from "../../src/lowcode/RecordPrint";
import {resolveFieldRules,validateValues,type TableSchema,type LowcodeField} from "../../src/lowcode/field-model";
import type {Rule} from "../../src/lowcode/rules";
const directory={people:[],units:[],positions:[]};
const original:TableSchema={name:"字符串与日期公式",description:"",titleFieldId:"caption",fields:[
{id:"name",label:"名称",type:"text"},{id:"start",label:"起始日期",type:"date"},{id:"offset",label:"偏移天数",type:"number"},
{id:"caption",label:"组合名称",type:"formula",formulaConfig:{resultType:"text",expression:{op:"CONCAT",left:{op:"UPPER",operand:{op:"TRIM",operand:{op:"FIELD",fieldId:"name"}}},right:{op:"TEXT",value:"-完成"}}}},
{id:"due",label:"计算到期日",type:"formula",formulaConfig:{resultType:"date",expression:{op:"DATE_ADD_DAYS",left:{op:"FIELD",fieldId:"start"},right:{op:"FIELD",fieldId:"offset"}}}},
{id:"length",label:"名称字符数",type:"formula",formulaConfig:{resultType:"number",expression:{op:"LENGTH",operand:{op:"FIELD",fieldId:"caption"}}}},
{id:"difference",label:"相隔天数",type:"formula",formulaConfig:{resultType:"number",expression:{op:"DATE_DIFF_DAYS",left:{op:"FIELD",fieldId:"due"},right:{op:"FIELD",fieldId:"start"}}}},
{id:"note",label:"文本条件已满足",type:"text",visibleWhen:{fieldId:"caption",operator:"CONTAINS",value:"AB"}}
],printConfig:{fieldIds:["caption","due"],columns:2,orientation:"portrait",showMetadata:false}};
function Fixture(){
  const [schema,setSchema]=useState(original),[values,setValues]=useState<Record<string,unknown>>({name:"　ab中　",start:"2024-02-28",offset:1}),[selected,setSelected]=useState("caption"),[rule,setRule]=useState<Rule>({fieldId:"caption",operator:"CONTAINS",value:"AB"}),[printing,setPrinting]=useState(false),[submitted,setSubmitted]=useState(false);
  const prepared=resolveFieldRules(schema,values),errors=validateValues(schema,values),field=schema.fields.find(field=>field.id===selected)!;
  (window as unknown as {typedFormulaFixture:unknown}).typedFormulaFixture={schema,values,prepared,errors,rule};
  const button="rounded-lg border px-3 py-2 text-sm";
  return <main className="mx-auto max-w-6xl space-y-5 p-5"><h1 className="text-2xl font-semibold">字符串与日期公式</h1><div className="flex flex-wrap gap-3"><button className={button} onClick={()=>setSelected("caption")}>配置文本公式</button><button className={button} onClick={()=>setSelected("due")}>配置日期公式</button><button className={button} onClick={()=>setSubmitted(true)}>校验当前值</button><button className={button} onClick={()=>setPrinting(true)}>查看打印快照</button><button className={button} onClick={()=>{setSchema(original);setValues({name:"　ab中　",start:"2024-02-28",offset:1});setSelected("caption");setRule({fieldId:"caption",operator:"CONTAINS",value:"AB"});}}>恢复示例</button></div>
  <div className="grid gap-6 lg:grid-cols-[1fr_1fr]"><section data-testid="formula-form" className="min-w-0 rounded-xl border p-4"><FieldRenderer schema={schema} value={values} onChange={setValues} directory={directory} errors={submitted?errors:{}}/></section><section data-testid="formula-settings" className="min-w-0 rounded-xl border p-4"><CalculationEditor field={field} fields={schema.fields} disabled={false} onChange={patch=>setSchema(current=>({...current,fields:current.fields.map(item=>item.id===field.id?{...item,...patch} as LowcodeField:item)}))}/></section></div>
  <section data-testid="formula-rule" className="rounded-xl border p-4"><h2 className="mb-3 font-medium">条件比较值编辑</h2><RuleEditor value={rule} onChange={setRule} fields={schema.fields} directory={directory}/></section>
  <output data-testid="formula-status" className="block break-words">{submitted?Object.keys(errors).length?Object.values(errors).join("；"):"校验通过":"修改输入后实时计算"}</output>
  {printing&&<RecordPrint row={{id:"10000000-0000-4000-8000-000000000001",tableId:"10000000-0000-4000-8000-000000000002",revision:1,title:"公式快照",data:prepared.values,createdAt:"2026-09-12T00:00:00Z",createdBy:"10000000-0000-4000-8000-000000000001",creatorName:"验收成员",updatedAt:"2026-09-12T00:00:00Z",canUpdate:false,canDelete:false,pendingChange:false}} schema={schema} directory={directory} onClose={()=>setPrinting(false)}/>}
  </main>;
}
const root=createRoot(document.getElementById("root")!);root.render(<Fixture/>);if(import.meta.hot)import.meta.hot.dispose(()=>root.unmount());

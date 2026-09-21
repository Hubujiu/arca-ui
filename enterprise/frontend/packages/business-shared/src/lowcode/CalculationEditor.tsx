import { FieldSelect, Input } from "@/shared/ui";
import type { LowcodeField } from "./field-model";
import { numericField, formulaResultType, scalarFieldType, validateFormula, validateSummary, type Expression, type FormulaResultType, type SummaryConfig } from "./calculations";
const labels:Record<FormulaResultType,string>={number:"数值",text:"文本",date:"日期"};
export const initialExpression=(type:FormulaResultType):Expression=>type==="number"?{op:"CONST",value:0}:type==="date"?{op:"DATE",value:"2000-01-01"}:{op:"TEXT",value:""};
const operations:{value:Expression["op"];label:string;type?:FormulaResultType}[]=[
  {value:"CONST",label:"固定数字",type:"number"},{value:"TEXT",label:"固定文本",type:"text"},{value:"DATE",label:"固定日期",type:"date"},{value:"FIELD",label:"引用字段"},
  {value:"ADD",label:"加法（＋）",type:"number"},{value:"SUB",label:"减法（－）",type:"number"},{value:"MUL",label:"乘法（×）",type:"number"},{value:"DIV",label:"除法（÷）",type:"number"},
  {value:"LENGTH",label:"字符数量",type:"number"},{value:"DATE_DIFF_DAYS",label:"相隔天数（左日期减右日期）",type:"number"},
  {value:"CONCAT",label:"拼接文本",type:"text"},{value:"TRIM",label:"去除首尾空白",type:"text"},{value:"UPPER",label:"英文字母转大写",type:"text"},{value:"LOWER",label:"英文字母转小写",type:"text"},{value:"DATE_ADD_DAYS",label:"日期加减天数",type:"date"}
];
export function CalculationEditor({ field, fields, onChange, disabled, allowedResultTypes=["number","text","date"] }: { field: LowcodeField; fields: LowcodeField[]; onChange: (patch: Partial<LowcodeField>) => void; disabled: boolean;allowedResultTypes?:FormulaResultType[] }) {
  function expressionEditor(value: Expression, change: (value: Expression) => void, depth: number,expected:FormulaResultType) {
    const sources=fields.filter(entry=>entry.id!==field.id&&scalarFieldType(entry)===expected);
    const leftType:FormulaResultType=value.op.startsWith("DATE_")?"date":value.op==="CONCAT"?"text":"number",rightType:FormulaResultType=value.op==="DATE_DIFF_DAYS"?"date":value.op==="CONCAT"?"text":"number";
    return <div className="min-w-0 space-y-3"><FieldSelect label={`取值或运算（${labels[expected]}）`} value={value.op} options={operations.filter(operation=>(operation.value==="FIELD"?sources.length:operation.type===expected)&&(depth<4||["CONST","TEXT","DATE","FIELD"].includes(operation.value)))} onChange={op=>{
      if(op==="CONST"||op==="TEXT"||op==="DATE")change(initialExpression(expected));
      else if(op==="FIELD")change({op,fieldId:sources[0].id});
      else if(op==="TRIM"||op==="UPPER"||op==="LOWER"||op==="LENGTH")change({op,operand:initialExpression("text")});
      else change({op:op as "ADD",left:initialExpression(op.startsWith("DATE_")?"date":op==="CONCAT"?"text":"number"),right:initialExpression(op==="DATE_DIFF_DAYS"?"date":op==="CONCAT"?"text":"number")});
    }}/>
      {value.op==="CONST"?<Input label="固定数字" type="number" step="any" min={-1e15} max={1e15} value={String(value.value)} onChange={next=>{if(Number.isFinite(Number(next)))change({op:"CONST",value:Number(next)});}}/>:
        value.op==="TEXT"||value.op==="DATE"?<Input label={value.op==="TEXT"?"固定文本":"固定日期（YYYY-MM-DD）"} type={value.op==="DATE"?"date":"text"} maxLength={value.op==="TEXT"?20000:10} value={value.value} onChange={next=>change({...value,value:next})}/>:
        value.op==="FIELD"?<FieldSelect label={`${labels[expected]}字段`} value={value.fieldId} options={sources.map(entry=>({value:entry.id,label:entry.label}))} onChange={fieldId=>change({op:"FIELD",fieldId})}/>:
        "operand" in value?<div className="border-l-2 border-border pl-3">{expressionEditor(value.operand,operand=>change({...value,operand}),depth+1,"text")}</div>:
        "left" in value?<div className="space-y-3 border-l-2 border-border pl-3"><div className="space-y-2"><h4 className="text-caption font-medium text-muted-foreground">{value.op==="DATE_ADD_DAYS"?"起始日期":"左值"}</h4>{expressionEditor(value.left,left=>change({...value,left}),depth+1,leftType)}</div><div className="space-y-2"><h4 className="text-caption font-medium text-muted-foreground">{value.op==="DATE_ADD_DAYS"?"偏移天数（整数，负数向前）":"右值"}</h4>{expressionEditor(value.right,right=>change({...value,right}),depth+1,rightType)}</div></div>:null}
    </div>;
  }
  if (field.type === "formula") {
    const type=formulaResultType(field),expression=field.formulaConfig?.expression??initialExpression(type),errors=validateFormula({expression,resultType:type},fields);
    return <fieldset disabled={disabled} className="min-w-0 space-y-3 border-t border-border pt-4"><h3 className="text-caption font-semibold text-muted-foreground">计算公式</h3>
      {allowedResultTypes.length>1&&<FieldSelect label="公式结果类型" value={type} options={allowedResultTypes.map(value=>({value,label:labels[value]}))} onChange={next=>{const resultType=next as FormulaResultType;onChange({formulaConfig:{resultType,expression:initialExpression(resultType)},readOnly:true,numericConfig:undefined,minimum:undefined,maximum:undefined});}}/>}
      {expressionEditor(expression,expression=>onChange({formulaConfig:{resultType:type,expression},readOnly:true}),1,type)}
      {errors.length>0&&<p role="alert" className="text-caption text-destructive">{errors[0]}</p>}<p className="text-caption leading-5 text-muted-foreground">最多四层、31 个节点。缺失输入时结果为空；文本最多 10000 字符。日期按自然日计算，不使用当前时间；英文字母大小写转换保留其他字符。服务端重新计算，非法日期和除零会阻止保存。</p></fieldset>;
  }
  const config = field.summaryConfig ?? { subtableId: "", operation: "COUNT" as const }, subtables = fields.filter((entry) => entry.type === "subtable"), table = subtables.find((entry) => entry.id === config.subtableId), children = table?.subtableConfig?.fields.filter(numericField) ?? [], errors = validateSummary(config, fields);
  function update(patch: Partial<SummaryConfig>) { const next = { ...config, ...patch }; if (next.operation === "COUNT") delete next.fieldId; onChange({ summaryConfig: next, readOnly: true }); }
  return <fieldset disabled={disabled} className="min-w-0 space-y-3 border-t border-border pt-4"><h3 className="text-caption font-semibold text-muted-foreground">子表汇总</h3>
    <FieldSelect label="来源子表" value={config.subtableId} options={subtables.map((entry) => ({ value: entry.id, label: entry.label }))} onChange={(subtableId) => update({ subtableId, operation: "COUNT", fieldId: undefined })} />
    <FieldSelect label="汇总方式" value={config.operation} options={[{ value: "COUNT", label: "行数" }, { value: "SUM", label: "求和" }, { value: "AVG", label: "平均值" }, { value: "MIN", label: "最小值" }, { value: "MAX", label: "最大值" }]} onChange={(operation) => update({ operation: operation as SummaryConfig["operation"], fieldId: operation === "COUNT" ? undefined : children[0]?.id })} />
    {config.operation !== "COUNT" && <FieldSelect label="汇总字段" value={config.fieldId ?? ""} options={children.map((entry) => ({ value: entry.id, label: entry.label }))} onChange={(fieldId) => update({ fieldId })} />}
    {!!errors.length && <p role="alert" className="text-caption text-destructive">{errors[0]}</p>}<p className="text-caption leading-5 text-muted-foreground">仅汇总有效数字。空子表求和与计数为 0，平均、最大、最小值为空。</p>
  </fieldset>;
}

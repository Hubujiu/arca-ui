import { chineseAmount } from "./extended-fields";
import { numericLookup } from "./relations";
import type { LowcodeField } from "./field-model";
import { decimal, decimalAdd, decimalCompare, decimalDivide, decimalMultiply, decimalNumber, decimalRound, type Decimal } from "./decimal";
export type FormulaResultType = "number" | "text" | "date";
export type Expression = { op: "CONST"; value: number } | {op:"TEXT"|"DATE";value:string} | { op: "FIELD"; fieldId: string } | {op:"TRIM"|"UPPER"|"LOWER"|"LENGTH";operand:Expression} | { op: "ADD" | "SUB" | "MUL" | "DIV" | "CONCAT" | "DATE_ADD_DAYS" | "DATE_DIFF_DAYS"; left: Expression; right: Expression };
export type FormulaConfig={expression:Expression;resultType?:FormulaResultType};
export type SummaryConfig = { subtableId: string; operation: "SUM" | "AVG" | "MIN" | "MAX" | "COUNT"; fieldId?: string };
export function computedField(field: LowcodeField) { return field.type === "formula" || field.type === "summary" || field.type === "lookup" || field.type === "chineseAmount"; }
export const formulaResultType=(field:Pick<LowcodeField,"formulaConfig">):FormulaResultType=>field.formulaConfig?.resultType??"number";
export function numericField(field: LowcodeField) { return (["number", "progress", "rating", "summary"].includes(field.type) || field.type==="formula"&&formulaResultType(field)==="number" || numericLookup(field)) && !["idCard", "phone", "digits"].includes(field.format ?? ""); }
export function scalarFieldType(field:LowcodeField):FormulaResultType|undefined {
  if(numericField(field))return "number";
  if(field.type==="formula")return formulaResultType(field);
  if(field.type==="date")return "date";
  if(["text","textarea","email","phone","url","serial","idCard","chineseAmount"].includes(field.type)||field.type==="lookup"&&!numericLookup(field)||field.type==="number"&&["idCard","phone","digits"].includes(field.format??""))return "text";
}
export function expressionDependencies(expression: Expression): Set<string> {
  const result = new Set<string>();
  const visit = (node: Expression, depth: number) => {
    if (!node || depth > 4) return;
    if (node.op === "FIELD") result.add(node.fieldId);
    else if("operand" in node)visit(node.operand,depth+1);
    else if("left" in node) { visit(node.left, depth + 1); visit(node.right, depth + 1); }
  };
  visit(expression, 1); return result;
}
export function calculationDependencies(field: LowcodeField): Set<string> {
  return field.type === "chineseAmount" && field.amountConfig ? new Set([field.amountConfig.sourceFieldId]) : field.type === "lookup" && field.lookupConfig ? new Set([field.lookupConfig.relationFieldId]) : field.type === "formula" && field.formulaConfig ? expressionDependencies(field.formulaConfig.expression) : field.type === "summary" && field.summaryConfig ? new Set([field.summaryConfig.subtableId]) : new Set();
}
const binary=["ADD","SUB","MUL","DIV","CONCAT","DATE_ADD_DAYS","DATE_DIFF_DAYS"],unary=["TRIM","UPPER","LOWER","LENGTH"];
function outputType(op:string):FormulaResultType {
  if(["ADD","SUB","MUL","DIV","CONST","LENGTH","DATE_DIFF_DAYS"].includes(op))return "number";
  if(["DATE","DATE_ADD_DAYS"].includes(op))return "date";
  if(["TEXT","CONCAT","TRIM","UPPER","LOWER"].includes(op))return "text";
  throw new Error("公式运算符无效");
}
const leftType=(op:string):FormulaResultType=>op.startsWith("DATE_")?"date":op==="CONCAT"?"text":"number";
const rightType=(op:string):FormulaResultType=>op==="DATE_DIFF_DAYS"?"date":op==="CONCAT"?"text":"number";
function requireType(expected:FormulaResultType,actual:FormulaResultType|undefined){if(expected!==actual)throw new Error("公式操作数或结果类型不匹配（数值、文本和日期不能混用）");}
function textValue(value:unknown):string {if(typeof value!=="string"||[...value].length>10000)throw new Error("公式文本必须是最多10000个字符的字符串");return value;}
export function formulaDate(value:unknown):string {
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.startsWith("0000"))throw new Error("公式日期需要0001至9999年的有效YYYY-MM-DD日期");
  const date=new Date(value+"T00:00:00Z");if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw new Error("公式日期无效");return value;
}
export function validateExpression(expression: unknown, fields: LowcodeField[], resultType:FormulaResultType="number"): string[] {
  const errors: string[] = []; let nodes = 0;
  const visit = (value: unknown, expected:FormulaResultType, depth: number) => {
    if (++nodes > 31 || depth > 4) { errors.push("公式最多 4 层、31 个节点"); return; }
    if (!value || typeof value !== "object" || Array.isArray(value)) { errors.push("公式节点必须为对象"); return; }
    const node = value as Record<string, unknown>,op=String(node.op);
    const keys=(allowed:string[])=>{if(Object.keys(node).length!==allowed.length||Object.keys(node).some(key=>!allowed.includes(key)))throw new Error("公式缺少必要项或包含未知配置项");};
    try {
      if(op==="FIELD"){keys(["op","fieldId"]);const field=fields.find(field=>field.id===node.fieldId);if(!field)throw new Error("公式引用字段不存在");requireType(expected,scalarFieldType(field));return;}
      requireType(expected,outputType(op));
      if(["CONST","TEXT","DATE"].includes(op)){
        keys(["op","value"]);
        if(op==="CONST"){if(typeof node.value!=="number")throw new Error("公式常量需要数字");decimal(node.value);}
        else if(op==="DATE")formulaDate(node.value);else textValue(node.value);
      }else if(unary.includes(op)){keys(["op","operand"]);visit(node.operand,"text",depth+1);}
      else if(binary.includes(op)){keys(["op","left","right"]);visit(node.left,leftType(op),depth+1);visit(node.right,rightType(op),depth+1);}
    }catch(error){errors.push(error instanceof Error?error.message:"公式无效");}
  };
  if(!["number","text","date"].includes(resultType))return ["公式结果类型无效"];
  visit(expression,resultType,1); return errors;
}
export function validateFormula(config:unknown,fields:LowcodeField[]):string[]{
  if(!config||typeof config!=="object"||Array.isArray(config)||Object.keys(config).some(key=>!["expression","resultType"].includes(key))||!("expression" in config))return ["公式配置无效"];
  const value=config as FormulaConfig;return validateExpression(value.expression,fields,Object.hasOwn(value,"resultType")?value.resultType as FormulaResultType:"number");
}
export function validateSummary(config: unknown, fields: LowcodeField[]): string[] {
  if (!config || typeof config !== "object" || Array.isArray(config)) return ["汇总配置无效"];
  const value = config as Record<string, unknown>, table = fields.find((field) => field.id === value.subtableId && field.type === "subtable");
  if (Object.keys(value).some((key) => !["subtableId", "operation", "fieldId"].includes(key)) || !table || !["SUM", "AVG", "MIN", "MAX", "COUNT"].includes(String(value.operation))) return ["请选择有效子表和汇总方式"];
  if (value.operation === "COUNT" ? Object.hasOwn(value, "fieldId") : !table.subtableConfig?.fields.some((field) => field.id === value.fieldId && numericField(field))) return ["计数不需要字段，其他汇总必须选择子表数值字段"];
  return [];
}
function evaluateExpression(expression: Expression, data: Record<string, unknown>,expected:FormulaResultType,depth=1,count={nodes:0}): Decimal | string | undefined {
  if(!expression||depth>4||++count.nodes>31)throw new Error("公式最多 4 层、31 个节点");
  if(expression.op==="FIELD"){
    const value=data[expression.fieldId];if(value===undefined||value===null)return undefined;
    if(expected==="date")return formulaDate(value);if(expected==="text")return textValue(value);
    if(typeof value!=="number")throw new Error("公式引用的字段需要数字");return decimal(value);
  }
  requireType(expected,outputType(expression.op));
  if(expression.op==="CONST")return decimal(expression.value);
  if(expression.op==="TEXT")return textValue(expression.value);
  if(expression.op==="DATE")return formulaDate(expression.value);
  if("operand" in expression){
    const raw=evaluateExpression(expression.operand,data,"text",depth+1,count);if(raw===undefined)return undefined;
    const text=textValue(raw);
    if(expression.op==="LENGTH")return decimal([...text].length);
    if(expression.op==="TRIM")return text.replace(/^[\u0009-\u000D\u0020\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+|[\u0009-\u000D\u0020\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]+$/g,"");
    return expression.op==="UPPER"?text.replace(/[a-z]/g,char=>char.toUpperCase()):text.replace(/[A-Z]/g,char=>char.toLowerCase());
  }
  if(!("left" in expression))throw new Error("公式运算符无效");
  const left=evaluateExpression(expression.left,data,leftType(expression.op),depth+1,count),right=evaluateExpression(expression.right,data,rightType(expression.op),depth+1,count);
  if(left===undefined||right===undefined)return undefined;
  if(expression.op==="CONCAT")return textValue(textValue(left)+textValue(right));
  if(expression.op==="DATE_DIFF_DAYS")return decimal((Date.parse(formulaDate(left)+"T00:00:00Z")-Date.parse(formulaDate(right)+"T00:00:00Z"))/86400000);
  if(expression.op==="DATE_ADD_DAYS"){
    const days=decimalNumber(right as Decimal);if(!Number.isInteger(days)||Math.abs(days)>3660000)throw new Error("日期偏移天数必须为范围内的整数");
    return formulaDate(new Date(Date.parse(formulaDate(left)+"T00:00:00Z")+days*86400000).toISOString().slice(0,10));
  }
  if(typeof left==="string"||typeof right==="string")throw new Error("公式需要数字操作数");
  if (expression.op === "ADD" || expression.op === "SUB") return decimalAdd(left, right, expression.op === "SUB");
  if (expression.op === "MUL") return decimalMultiply(left, right);
  return decimalDivide(left, right);
}
export function evaluateCalculation(field: LowcodeField, data: Record<string, unknown>): number | string | undefined {
  if (field.type === "chineseAmount") return chineseAmount(data[field.amountConfig?.sourceFieldId ?? ""], field.amountConfig?.unit);
  let result: Decimal | undefined;
  if (field.type === "formula") {
    if (!field.formulaConfig) throw new Error("尚未配置公式");
    const type=formulaResultType(field);if(!["number","text","date"].includes(type)||Object.hasOwn(field.formulaConfig,"resultType")&&field.formulaConfig.resultType==null)throw new Error("公式结果类型无效");
    const value=evaluateExpression(field.formulaConfig.expression, data,type);
    if(type!=="number")return value as string|undefined;
    result=value as Decimal|undefined;
  } else if (field.type === "summary") {
    const config = field.summaryConfig;
    if (!config) throw new Error("尚未配置汇总");
    const rows = data[config.subtableId];
    if (rows !== undefined && !Array.isArray(rows)) throw new Error("汇总来源需要子表数据");
    const entries = Array.isArray(rows) ? rows : [];
    if (config.operation === "COUNT") result = decimal(entries.length);
    else {
      const values: Decimal[] = [];
      for (const row of entries) {
        const value = row?.values?.[config.fieldId!];
        if (value === undefined || value === null) continue;
        if (typeof value !== "number") throw new Error("汇总字段需要数字");
        values.push(decimal(value));
      }
      if (config.operation === "SUM" || config.operation === "AVG") {
        const sum = values.reduce((sum, value) => decimalAdd(sum, value), decimal(0));
        result = config.operation === "SUM" ? sum : values.length ? decimalDivide(sum, decimal(values.length)) : undefined;
      } else if (values.length) result = values.reduce((best, value) => (config.operation === "MIN" ? decimalCompare(value, best) < 0 : decimalCompare(value, best) > 0) ? value : best);
    }
  }
  return result ? decimalNumber(decimalRound(result, field.numericConfig?.decimalPlaces ?? 2)) : undefined;
}

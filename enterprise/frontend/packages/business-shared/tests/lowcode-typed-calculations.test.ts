import test from "node:test";
import assert from "node:assert/strict";
import {evaluateCalculation,validateFormula,numericField,calculationDependencies,type Expression,type FormulaResultType} from "../src/lowcode/calculations";
import {dataJsonSchema,fieldValueLabel,initialValues,resolveFieldRules,validateFieldConfigs,validateValues,type LowcodeField,type TableSchema} from "../src/lowcode/field-model";
import {compatibleDefault,defaultConfigIssues} from "../src/lowcode/field-defaults";
import {ruleMatches,ruleOperators,validateRule} from "../src/lowcode/rules";
import {lookupNumberSource,lookupTextSource} from "../src/lowcode/relations";
import {printFields,recordTitle} from "../src/lowcode/record-presentation";
const text=(value:string):Expression=>({op:"TEXT",value}),date=(value:string):Expression=>({op:"DATE",value}),num=(value:number):Expression=>({op:"CONST",value}),ref=(fieldId:string):Expression=>({op:"FIELD",fieldId});
const formula=(id:string,resultType:FormulaResultType,expression:Expression):LowcodeField=>({id,label:id,type:"formula",readOnly:true,formulaConfig:{expression,resultType}});
const schema=(fields:LowcodeField[]):TableSchema=>({name:"类型公式",description:"",fields});
test("text operations use fixed whitespace, ASCII case and code point lengths",()=>{
  const caption=formula("caption","text",{op:"CONCAT",left:{op:"UPPER",operand:{op:"TRIM",operand:ref("name")}},right:text("-完成")});
  assert.equal(evaluateCalculation(caption,{name:"\u3000abé中\u00a0"}),"ABé中-完成");
  assert.equal(evaluateCalculation(formula("x","text",{op:"LOWER",operand:text("ABCÉ中")}),{}),"abcÉ中");
  assert.equal(evaluateCalculation(formula("x","number",{op:"LENGTH",operand:text("😀中")}),{}),2);
  assert.equal(evaluateCalculation(formula("x","text",text("😀".repeat(10000))),{}),"😀".repeat(10000));
  assert.throws(()=>evaluateCalculation(formula("x","text",{op:"CONCAT",left:text("x".repeat(10000)),right:text("x")}),{}),/10000/);
});
test("date operations handle leap days and negative differences without time zones",()=>{
  assert.equal(evaluateCalculation(formula("x","date",{op:"DATE_ADD_DAYS",left:date("2024-02-28"),right:num(1)}),{}),"2024-02-29");
  assert.equal(evaluateCalculation(formula("x","date",{op:"DATE_ADD_DAYS",left:date("2024-03-01"),right:num(-1)}),{}),"2024-02-29");
  assert.equal(evaluateCalculation(formula("x","number",{op:"DATE_DIFF_DAYS",left:date("2024-02-28"),right:date("2024-03-01")}),{}),-2);
  for(const value of ["2023-02-29","1900-02-29","0000-01-01","10000-01-01","2024-13-01","2024-01-01T00:00:00Z"])assert.throws(()=>evaluateCalculation(formula("x","date",date(value)),{}),/日期/);
  for(const value of [0.5,3660001])assert.throws(()=>evaluateCalculation(formula("x","date",{op:"DATE_ADD_DAYS",left:date("2024-01-01"),right:num(value)}),{}),/整数/);
  assert.throws(()=>evaluateCalculation(formula("x","date",{op:"DATE_ADD_DAYS",left:date("9999-12-31"),right:num(1)}),{}),/日期/);
});
test("missing and null inputs propagate while typed constants and operands never coerce",()=>{
  assert.equal(evaluateCalculation(formula("x","text",{op:"CONCAT",left:ref("missing"),right:text("x")}),{missing:null}),undefined);
  assert.equal(evaluateCalculation(formula("x","number",{op:"LENGTH",operand:ref("missing")}),{}),undefined);
  assert.equal(evaluateCalculation(formula("x","date",{op:"DATE_ADD_DAYS",left:ref("missing"),right:num(1)}),{}),undefined);
  assert.throws(()=>evaluateCalculation(formula("x","text",ref("text")),{text:1}),/字符串/);
  for(const [op,resultType] of [["CONST","number"],["TEXT","text"],["DATE","date"]] as const)assert.ok(validateFormula({resultType,expression:{op,value:null}},[]).length);
  assert.ok(validateFormula({resultType:null,expression:num(1)},[]).length);
  assert.ok(validateFormula({resultType:"unknown",expression:num(1)},[]).length);
  assert.throws(()=>evaluateCalculation(formula("x","unknown" as FormulaResultType,ref("value")),{value:1}),/类型/);
});
test("closed AST validates field types, all dependency edges, depth and cycles",()=>{
  const name:LowcodeField={id:"name",label:"名称",type:"text"};const caption=formula("caption","text",{op:"TRIM",operand:ref("name")});
  assert.deepEqual([...calculationDependencies(caption)],["name"]);assert.deepEqual(validateFieldConfigs(schema([caption,name])),{});
  for(const config of [{resultType:"number",expression:ref("name")},{resultType:"text",expression:num(1)},{resultType:"date",expression:ref("name")},{resultType:"text",expression:{op:"EVAL",script:"alert(1)"}},{resultType:"text",expression:text("okay"),unknown:1}])assert.ok(validateFormula(config,[name]).length);
  let deep:Expression=text("x");for(let i=0;i<4;i++)deep={op:"TRIM",operand:deep};assert.ok(validateFormula({resultType:"text",expression:deep},[]).length);
  assert.ok(Object.keys(validateFieldConfigs(schema([formula("first","text",ref("second")),formula("second","text",{op:"UPPER",operand:ref("first")})]))).length);
});
test("recomputation, JSON schema, title and print retain text and date results",()=>{
  const caption=formula("caption","text",{op:"UPPER",operand:ref("name")}),due=formula("due","date",{op:"DATE_ADD_DAYS",left:ref("start"),right:num(1)});
  const definition={...schema([caption,due,{id:"name",label:"名称",type:"text"},{id:"start",label:"开始",type:"date"}]),titleFieldId:"caption"};
  const data={name:"abc",start:"2024-02-28",caption:999,due:999},prepared=resolveFieldRules(definition,data);
  assert.deepEqual(prepared.errors,{});assert.equal(prepared.values.caption,"ABC");assert.equal(prepared.values.due,"2024-02-29");assert.deepEqual(validateValues(definition,data),{});
  const properties=dataJsonSchema(definition).properties as Record<string,Record<string,unknown>>;assert.equal(properties.caption.type,"string");assert.equal(properties.due.format,"date");assert.equal(properties.caption.maxLength,10000);
  assert.equal(recordTitle(definition,prepared.values),"ABC");assert.equal(fieldValueLabel(due,prepared.values.due),"2024-02-29");assert.deepEqual(printFields(definition,prepared.values,["caption","due"]).map(field=>field.id),["caption","due"]);
  assert.equal(numericField(caption),false);assert.equal(lookupNumberSource(due),false);assert.equal(lookupTextSource(caption),true);
});
test("typed defaults initialize once and rules use text/date domains",()=>{
  const caption=formula("caption","text",text("初始")),due=formula("due","date",date("2024-02-29"));
  const target:LowcodeField={id:"name",label:"名称",type:"text",defaultConfig:{source:"FORMULA",formulaConfig:caption.formulaConfig!}};
  assert.deepEqual(defaultConfigIssues(target,[]),[]);assert.equal(initialValues(schema([target])).name,"初始");assert.equal(resolveFieldRules(schema([target]),{name:"手工修改"},{mode:"edit",existing:{name:"手工修改"}}).values.name,"手工修改");
  assert.ok(defaultConfigIssues({...target,type:"number"},[]).length);assert.equal(compatibleDefault({id:"start",label:"日期",type:"date"},due),true);
  assert.deepEqual(validateRule({fieldId:"caption",operator:"CONTAINS",value:"初"},[caption]),[]);assert.ok(!ruleOperators(caption).includes("GT"));
  assert.equal(ruleMatches({fieldId:"due",operator:"GT",value:"2024-01-01"},{due:"2024-02-29"},[due]),true);
  const snapshot={...caption,formulaConfig:{resultType:"text"}} as LowcodeField;assert.equal(numericField(snapshot),false);assert.equal(fieldValueLabel(snapshot,"审批快照"),"审批快照");
});
test("numeric consumers reject text formulas while legacy precision remains unchanged",()=>{
  const caption=formula("caption","text",text("text")),lines:LowcodeField={id:"lines",label:"明细",type:"subtable",subtableConfig:{fields:[caption]}};
  assert.ok(validateFieldConfigs(schema([lines,{id:"sum",label:"合计",type:"summary",summaryConfig:{subtableId:"lines",operation:"SUM",fieldId:"caption"}}])).sum);
  assert.ok(validateFieldConfigs(schema([{...caption,numericConfig:{decimalPlaces:2}}])).caption);
  assert.ok(validateFieldConfigs(schema([caption,{id:"amount",label:"大写",type:"chineseAmount",amountConfig:{sourceFieldId:"caption"}}])).amount);
  assert.equal(evaluateCalculation({id:"legacy",label:"旧公式",type:"formula",formulaConfig:{expression:{op:"DIV",left:num(2),right:num(3)}}},{}),0.67);
});

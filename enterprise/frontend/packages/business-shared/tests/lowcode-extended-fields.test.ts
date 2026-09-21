import assert from "node:assert/strict";
import { test } from "node:test";
import { chineseAmount, validLocation } from "../src/lowcode/extended-fields";
import { createField, dataJsonSchema, fieldValueLabel, resolveFieldRules, validateFieldConfigs, validateValues, type LowcodeField, type TableSchema } from "../src/lowcode/field-model";
const schema = (fields: LowcodeField[]): TableSchema => ({ name: "扩展字段", description: "", fields });
const number: LowcodeField = { id: "number", label: "金额", type: "number" };
const upper: LowcodeField = { id: "upper", label: "大写金额", type: "chineseAmount", amountConfig: { sourceFieldId: "number", unit: "元" } };
const layout = (fieldIds: string[], id = "tabs"): LowcodeField => ({ id, label: id, type: "tabs", layoutConfig: { sections: [{ id: "basic", title: "基本信息", fieldIds, collapsed: true }] } });
test("Chinese uppercase uses decimal HALF_UP, zero bridges and bounded values", () => {
  for (const [input, result] of [[0,"零元整"], [0.05,"零元伍分"], [-1.005,"负壹元零壹分"], [15678,"壹万伍仟陆佰柒拾捌元整"], [10001,"壹万零壹元整"], [100000001,"壹亿零壹元整"], [100010001,"壹亿零壹万零壹元整"], [10.1,"壹拾元壹角整"]] as const) assert.equal(chineseAmount(input), result);
  assert.equal(chineseAmount(undefined), undefined);
  assert.equal(chineseAmount(1,"圆"),"壹圆整");
  assert.throws(() => chineseAmount(1e15)); assert.throws(() => chineseAmount("1")); assert.throws(() => chineseAmount(Infinity));
});
test("derived amount ignores tampering and is computed after source formulas regardless of order", () => {
  const source: LowcodeField = { id: "number", label: "计算", type: "formula", formulaConfig: { expression: { op: "CONST", value: 1.005 } }, numericConfig: { decimalPlaces: 2 } };
  const definition = schema([upper, source]);
  assert.deepEqual(validateFieldConfigs(definition), {});
  assert.equal(resolveFieldRules(definition, { upper: "伪造", number: 500 }).values.upper, "壹元零壹分");
  assert.deepEqual(validateValues(definition,{upper:"伪造",number:500}),{});
  assert.equal(resolveFieldRules(schema([upper,number]), {upper:"伪造"}).values.upper,undefined);
});
test("amount source and cross calculation visibility cycles are rejected", () => {
  assert.ok(validateFieldConfigs(schema([upper])).upper);
  assert.ok(validateFieldConfigs(schema([upper,{...number,type:"text"}])).upper);
  assert.ok(Object.keys(validateFieldConfigs(schema([upper,{...number,visibleWhen:{fieldId:"upper",operator:"NOT_EMPTY"}}]))).length);
});
test("layout references retain flat values and required validation in collapsed sections", () => {
  const definition = schema([layout(["number"]), {...number,required:true}]);
  assert.deepEqual(validateFieldConfigs(definition),{});
  assert.ok(validateValues(definition,{}).number);
  assert.deepEqual(resolveFieldRules(definition,{number:5}).values,{number:5});
  assert.equal((dataJsonSchema(definition).properties as Record<string,unknown>).tabs,undefined);
  assert.ok(Object.keys(validateValues(definition,{number:5,tabs:"forged"})).length);
});
test("layout rejects missing duplicate cross container and nested references", () => {
  for (const fields of [[number,layout(["missing"])],[number,layout(["number","number"])],[number,layout(["number"]),layout(["number"],"second")],[number,layout(["tabs"])]]) assert.ok(Object.keys(validateFieldConfigs(schema(fields))).length);
  assert.deepEqual(validateFieldConfigs(schema([number,layout([])])),{});
});
test("location validates numeric coordinates, allowed range, extra keys and text lengths", () => {
  const location: LowcodeField = { id:"place",label:"位置",type:"location", locationConfig: { bounds: {south:20,north:40,west:100,east:125} } };
  const definition = schema([location]);
  assert.deepEqual(validateValues(definition,{place:{latitude:20,longitude:125,address:"边界"}}),{});
  for (const value of [{latitude:19,longitude:125},{latitude:NaN,longitude:110},{latitude:30,longitude:110,script:"x"},{latitude:"30",longitude:110},{latitude:30,longitude:110,address:"x".repeat(501)}]) assert.ok(validateValues(definition,{place:value}).place);
  assert.equal(validLocation({latitude:90,longitude:-180}),true);
  assert.ok(validateFieldConfigs(schema([{...location,locationConfig:{bounds:{south:40,north:20,west:100,east:125}}}])).place);
});
test("richtext markup alone cannot satisfy mandatory input and list labels are plain text", () => {
  const field: LowcodeField = {id:"body",label:"正文",type:"richtext",required:true};
  assert.ok(validateValues(schema([field]),{body:"<p><br>&nbsp;</p>"}).body);
  assert.deepEqual(validateValues(schema([field]),{body:"<p><b>正文</b></p>"}),{});
  assert.equal(fieldValueLabel(field,"<p><b>正文</b></p>",{people:[],units:[],positions:[]}),"正文");
});
test("fixed images use unique UUID references and supported dimensions", () => {
  const id="aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", image = createField("displayImage");
  image.imageConfig={fileIds:[id],layout:"row",widthPercent:75};
  assert.deepEqual(validateFieldConfigs(schema([image,number])),{});
  for (const config of [{fileIds:[id,id.toUpperCase()]},{fileIds:["https://example.com/a.png"]},{fileIds:[id],widthPercent:101}]) assert.ok(validateFieldConfigs(schema([{...image,imageConfig:config},number]))[image.id]);
});

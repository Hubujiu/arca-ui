import test from "node:test";
import assert from "node:assert/strict";
import { addChoice, changeOtherText, choiceControlValue, choiceFromControl, choiceLabel, choiceValueError, otherChoiceToken } from "../src/lowcode/choices";
import { dataJsonSchema, fieldValueLabel, validateFieldConfigs, validateValues, type LowcodeField, type TableSchema } from "../src/lowcode/field-model";
import { ruleEmpty, ruleMatches, ruleSummary } from "../src/lowcode/rules";
import { recordTitle } from "../src/lowcode/record-presentation";
const field=(type:LowcodeField["type"]="select",allowOther=true):LowcodeField=>({id:"choice",label:"选项",type,options:["old","opt123"],choiceConfig:{displayLabels:{old:"新名称",opt123:"第二项"},allowOther,otherMaxLength:10}});
const schema=(value:LowcodeField):TableSchema=>({name:"选择表",description:"",fields:[value],titleFieldId:value.type==="select"?value.id:undefined});
const directory={people:[],units:[],positions:[]};
test("stable keys survive display renames, defaults and rules while titles render labels",()=>{
  const selected={...field("select",false),defaultValue:"old"};
  assert.deepEqual(validateFieldConfigs(schema(selected)),{});
  assert.deepEqual(validateValues(schema(selected),{choice:"old"}),{});
  assert.ok(validateValues(schema(selected),{choice:"新名称"}).choice);
  const rule={fieldId:"choice",operator:"EQ" as const,value:"old"};
  assert.equal(ruleMatches(rule,{choice:"old"},[selected]),true);
  assert.equal(ruleSummary(rule,[selected]),"选项 等于 新名称");
  assert.equal(fieldValueLabel(selected,"old",directory),"新名称");
  assert.equal(choiceLabel({...selected,choiceConfig:{displayLabels:{}}},"constructor"),"constructor");
  assert.equal(recordTitle(schema(selected),{choice:"old"}),"新名称");
});
test("other is allowed only as an explicit closed, nonblank, bounded object",()=>{
  const selected=field();
  assert.deepEqual(validateValues(schema(selected),{choice:{other:"客户补充"}}),{});
  for(const value of ["客户补充",{other:" "},{other:"12345678901"},{other:1},{other:"补充",extra:true}])assert.ok(validateValues(schema(selected),{choice:value},false).choice);
  assert.ok(validateValues(schema(field("select",false)),{choice:{other:"补充"}}).choice);
  assert.equal(recordTitle(schema(selected),{choice:{other:"客户补充"}}),"客户补充");
});
test("multi selection permits one other and retains known-option condition semantics",()=>{
  const selected=field("multiselect"),value=["old",{other:"补充"}];
  assert.deepEqual(validateValues(schema(selected),{choice:value}),{});
  assert.equal(ruleMatches({fieldId:"choice",operator:"CONTAINS",value:"old"},{choice:value},[selected]),true);
  assert.equal(choiceLabel(selected,value),"新名称、补充");
  for(const invalid of [["old","old"],[{other:"甲"},{other:"乙"}],["old",{other:" "}]])assert.ok(choiceValueError(selected,invalid));
  assert.equal(ruleEmpty({other:" \n"}),true);assert.equal(ruleEmpty([{other:" "}]),true);assert.equal(ruleEmpty(["old",{other:" "}]),false);
});
test("UI token cannot collide with stored options or leak into values",()=>{
  const selected={...field("multiselect"),options:["__other__","old"]},value=["old",{other:"补充"}];
  assert.equal(otherChoiceToken(selected),"__other___");
  assert.deepEqual(choiceControlValue(selected,value),["old","__other___"]);
  assert.deepEqual(choiceFromControl(selected,["old","__other___"],value),value);
  assert.deepEqual(changeOtherText(value,"新的"),["old",{other:"新的"}]);
  assert.deepEqual(choiceFromControl(field(),otherChoiceToken(field()),undefined),{other:""});
});
test("designer new options receive stable unique keys separate from editable labels",()=>{
  const selected=field(),patch=addChoice(selected),key=patch.options!.at(-1)!;
  assert.match(key,/^opt[a-f0-9]{32}$/);
  assert.equal(patch.choiceConfig!.displayLabels![key],"选项 3");
  const renamed={...selected,...patch,choiceConfig:{...patch.choiceConfig,displayLabels:{...patch.choiceConfig?.displayLabels,[key]:"重命名"}}};
  assert.equal(renamed.options!.at(-1),key);assert.equal(choiceLabel(renamed,key),"重命名");
});
test("closed config and JSON schema validate other defaults without weakening legacy enum",()=>{
  for(const config of [{displayLabels:{missing:"不存在"}},{displayLabels:{old:" "}},{otherMaxLength:501},{allowOther:"yes"},{script:"bad"}])assert.ok(Object.keys(validateFieldConfigs(schema({...field(),choiceConfig:config as LowcodeField["choiceConfig"]}))).length);
  assert.deepEqual(validateFieldConfigs(schema({...field(),defaultValue:{other:"默认补充"}})),{});
  const properties=dataJsonSchema(schema(field("select",false))).properties as Record<string,Record<string,unknown>>;
  assert.deepEqual(properties.choice.enum,["old","opt123"]);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultConfigIssues, defaultValidationValues, initializeFieldDefaults, collectDefaultLookupQueries, type DefaultConfig } from "../src/lowcode/field-defaults";
import { initialValues, validateFieldConfigs, validateValues, type LowcodeField, type TableSchema } from "../src/lowcode/field-model";
import type { Directory } from "../src/organization/model";
const field = (id: string, type: LowcodeField["type"], defaultConfig?: DefaultConfig): LowcodeField => ({ id, label: id, type, ...(defaultConfig ? { defaultConfig } : {}) });
const schema = (...fields: LowcodeField[]): TableSchema => ({ name: "Defaults", description: "", fields });
const formula: DefaultConfig = { source: "FORMULA", formulaConfig: { expression: { op: "MUL", left: { op: "FIELD", fieldId: "amount" }, right: { op: "CONST", value: 3 } } } };

test("defaults follow dependency order once and preserve provided, null and blank values", () => {
  const config = schema(field("copy", "number", { source: "FIELD", fieldId: "total" }), field("total", "number", formula), field("amount", "number"));
  assert.deepEqual(initializeFieldDefaults(config, { amount: 4 }).values, { amount: 4, total: 12, copy: 12 });
  assert.deepEqual(initializeFieldDefaults(config, { amount: 9, total: 12, copy: 12 }).values, { amount: 9, total: 12, copy: 12 });
  assert.equal(initializeFieldDefaults(config, { amount: 9, copy: null }).values.copy, null);
  const text = schema(field("from", "text"), field("to", "text", { source: "FIELD", fieldId: "from" }));
  assert.deepEqual(initializeFieldDefaults(text, { from: "source", to: "" }).values, { from: "source", to: "" });
  const constants = schema(field("value", "number", { source: "FORMULA", formulaConfig: { expression: { op: "CONST", value: 17 } } }));
  assert.deepEqual(initialValues(constants), { value: 17 });
  assert.deepEqual(initialValues(constants, undefined, undefined, false), {});
});

test("closed configuration rejects unknown sources, incompatible fields and dependency cycles", () => {
  const amount = field("amount", "number"), target = field("copy", "number", { source: "FIELD", fieldId: "amount" });
  for (const bad of [{ source: "SCRIPT", script: "fetch()" }, { source: "FIELD", fieldId: "amount", extra: true }, { source: "FIELD", fieldId: "missing" }, { source: "FIELD", fieldId: "copy" }, { source: "INITIATOR_DEPARTMENT", actor: "forged" }])
    assert.ok(defaultConfigIssues({ ...target, defaultConfig: bad as DefaultConfig }, [amount, target]).length);
  assert.ok(defaultConfigIssues({ ...target, defaultValue: 1 }, [amount, target]).length);
  assert.ok(defaultConfigIssues(field("copy", "signature", { source: "FIELD", fieldId: "amount" }), [amount]).length);
  const cycle = schema(field("first", "number", { source: "FIELD", fieldId: "second" }), field("second", "number", { source: "FIELD", fieldId: "first" }));
  assert.ok(Object.keys(validateFieldConfigs(cycle)).length);
  const calculationCycle = schema(field("first", "number", { source: "FIELD", fieldId: "second" }), { ...field("second", "formula"), formulaConfig: { expression: { op: "FIELD", fieldId: "first" } } });
  assert.ok(Object.keys(validateFieldConfigs(calculationCycle)).length);
  assert.deepEqual(validateFieldConfigs(schema(target, amount)), {});
});

test("clearing linked defaults keeps the request marker while validation sees an absent field", () => {
  const target = field("copy", "number", { source: "FIELD", fieldId: "amount" }), config = schema(field("amount", "number"), target);
  const data = { amount: 9, copy: null };
  assert.deepEqual(defaultValidationValues(config, data), { amount: 9 });
  assert.deepEqual(data, { amount: 9, copy: null });
  assert.deepEqual(validateValues(config, data, true), {});
  assert.ok(validateValues(schema(config.fields[0], { ...target, required: true }), data, true).copy);
});

test("authorized lookup initializes only after resolving and is not queried again for snapshots", () => {
  const relation = { ...field("link", "relation"), relationConfig: { tableId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" } };
  const target = field("copy", "number", { source: "LOOKUP", lookupConfig: { relationFieldId: "link", targetFieldId: "price", resultType: "number" } });
  const config = schema(relation, target), values = { link: ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"] };
  assert.equal(collectDefaultLookupQueries(config, values).size, 1);
  assert.deepEqual(initializeFieldDefaults(config, values).values, values);
  let calls = 0;
  const resolver = () => { calls++; return 12.345; };
  const initialized = initializeFieldDefaults(config, values, { lookupResolver: resolver });
  assert.equal(initialized.values.copy, 12.35);
  assert.equal(collectDefaultLookupQueries(config, initialized.values).size, 0);
  initializeFieldDefaults(config, initialized.values, { lookupResolver: resolver }); assert.equal(calls, 1);
  assert.equal(initializeFieldDefaults(config, values, { lookupResolver: () => { throw new Error("没有读取权限"); } }).errors.copy, "没有读取权限");
  assert.equal(initializeFieldDefaults(config, values, { lookupResolver: () => null }).values.copy, null);
});

test("department linkage uses nearest department, explicit in-scope leader and enabled bound members", () => {
  const directory: Directory = { units: [{ id: "dept", name: "部门", kind: "DEPARTMENT", leaderId: "leader" }, { id: "team", parentId: "dept", name: "小组", kind: "TEAM" }], positions: [], people: [
    { id: "me", username: "me", displayName: "我", orgUnitId: "team", enabled: true, loginBound: true, systemRole: "USER" },
    { id: "leader", username: "leader", displayName: "负责人", orgUnitId: "dept", enabled: true, loginBound: true, systemRole: "USER" },
    { id: "disabled", username: "disabled", displayName: "禁用", orgUnitId: "team", enabled: false, loginBound: true, systemRole: "USER" },
    { id: "unbound", username: "unbound", displayName: "未绑定", orgUnitId: "team", enabled: true, loginBound: false, systemRole: "USER" },
  ] };
  const config = schema(field("department", "department", { source: "INITIATOR_DEPARTMENT" }), field("members", "members", { source: "DEPARTMENT_MEMBERS", departmentFieldId: "department" }), field("single", "member", { source: "DEPARTMENT_MEMBERS", departmentFieldId: "department" }), field("leader", "member", { source: "DEPARTMENT_LEADER", departmentFieldId: "department" }));
  const result = initializeFieldDefaults(config, {}, { directory, user: { id: "me", displayName: "我" } });
  assert.deepEqual(result.values, { department: "dept", members: ["leader", "me"], single: null, leader: "leader" });
  directory.people[1].orgUnitId = "outside";
  assert.equal(initializeFieldDefaults(config, {}, { directory, user: { id: "me", displayName: "我" } }).values.leader, null);
});

test("formula failures are explicit and default config survives save/reload", () => {
  const target = field("result", "number", { source: "FORMULA", formulaConfig: { expression: { op: "DIV", left: { op: "CONST", value: 1 }, right: { op: "CONST", value: 0 } } } });
  assert.ok(initializeFieldDefaults(schema(target), {}).errors.result);
  assert.deepEqual(validateFieldConfigs(JSON.parse(JSON.stringify(schema(field("amount", "number"), field("total", "number", formula))))), {});
});

test("position defaults use directory membership once and reject ambiguous single-member results", () => {
  const directory:Directory={units:[],positions:[{id:"job",name:"会计"},{id:"other",name:"其他"}],people:[
    {id:"one",username:"one",displayName:"一",positionId:"job",enabled:true,loginBound:true,systemRole:"USER"},
    {id:"off",username:"off",displayName:"停用",positionId:"job",enabled:false,loginBound:true,systemRole:"USER"},
    {id:"unbound",username:"unbound",displayName:"未绑定",positionId:"job",enabled:true,loginBound:false,systemRole:"USER"},
  ]};
  const job=field("job","positions"),many=field("many","members",{source:"POSITION_MEMBERS",positionFieldId:"job"}),single=field("single","member",{source:"POSITION_MEMBERS",positionFieldId:"job"}),config=schema(job,many,single);
  const first=initializeFieldDefaults(config,{job:["job","job"]},{directory});
  assert.deepEqual(first.values,{job:["job","job"],many:["one"],single:"one"});assert.deepEqual(first.errors,{});
  directory.people.push({id:"two",username:"two",displayName:"二",positionId:"job",enabled:true,loginBound:true,systemRole:"USER"});
  assert.ok(initializeFieldDefaults(config,{job:["job"]},{directory}).errors.single?.includes("多位"));
  assert.deepEqual(initializeFieldDefaults(config,first.values,{directory}).values,first.values);
  assert.deepEqual(initializeFieldDefaults(config,{job:["job"],many:[],single:null},{directory}).values,{job:["job"],many:[],single:null});
  assert.ok(initializeFieldDefaults(config,{job:["missing"]},{directory}).errors.many);
  assert.deepEqual(validateFieldConfigs(JSON.parse(JSON.stringify(config))),{});
  assert.ok(defaultConfigIssues({...many,defaultConfig:{source:"POSITION_MEMBERS",positionFieldId:"job",people:["forged"]} as DefaultConfig},config.fields).length);
  assert.ok(defaultConfigIssues(many,[field("job","department"),many]).length);
  for(let n=0;n<19;n++)directory.people.push({id:`p${n}`,username:`p${n}`,displayName:"成员",positionId:"job",enabled:true,loginBound:true,systemRole:"USER"});
  assert.ok(initializeFieldDefaults(config,{job:["job"]},{directory}).errors.many?.includes("二十"));
});

import assert from "node:assert/strict";
import {test} from "node:test";
import {applyFormLayout,validateFormLayouts,type FormLayout} from "../src/lowcode/form-layouts";
import {validateValues,type TableSchema} from "../src/lowcode/field-model";
const layout:FormLayout={id:"compact",name:"紧凑布局",columns:3,fieldOrder:["amount"],widths:{title:8}};
const schema:TableSchema&{layouts:FormLayout[]}={name:"布局",description:"",fields:[{id:"title",label:"标题",type:"text",required:true,column:3},{id:"amount",label:"金额",type:"number"}],layouts:[layout]};
test("alternate arrangements append every omitted field and preserve validation",()=>{
 const applied=applyFormLayout(schema,"compact");assert.deepEqual(applied.fields.map(field=>field.id),["amount","title"]);assert.equal(applied.fields[1].width,8);assert.equal(applied.fields[1].column,undefined);assert.equal(schema.fields[0].column,3);
 assert.ok(validateValues(applied,{amount:10}).title);assert.equal(validateFormLayouts(schema),undefined);
});
test("layout references and bounds are closed",()=>{
 for(const invalid of [{...layout,fieldOrder:["missing"]},{...layout,widths:{title:13}},{...layout,fieldOrder:["title","title"]}])assert.ok(validateFormLayouts({...schema,layouts:[invalid]}));
 assert.ok(validateFormLayouts({...schema,defaultLayoutId:"missing"}));
});

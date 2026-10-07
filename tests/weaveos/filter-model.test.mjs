import test from 'node:test'
import assert from 'node:assert/strict'
import {validateFilter} from '../../src/weaveos/filter-model.ts'
const fields=[{id:'person',label:'身份',type:'text'},{id:'amount',label:'金额',type:'number'},{id:'date',label:'日期',type:'time'}]
const leaf=(fieldId='person',operator='eq',value='A')=>({fieldId,operator,value})
const group=(children,operator='and')=>({operator,children})
test('AND and OR compose without flattening or changing meaning',()=>{
 const f=group([leaf('person','neq','A'),group([leaf('person','neq','B'),leaf('amount','gt','9007199254740993.01')],'or')]);const before=JSON.stringify(f)
 assert.equal(validateFilter(f,fields),null);assert.equal(JSON.stringify(f),before)
})
test('text supports only equal or not equal, numeric supports all six',()=>{
 for(const op of ['eq','neq'])assert.equal(validateFilter(group([leaf('person',op)]),fields),null)
 for(const op of ['gt','gte','lt','lte'])assert.ok(validateFilter(group([leaf('person',op)]),fields))
 for(const op of ['eq','neq','gt','gte','lt','lte'])assert.equal(validateFilter(group([leaf('amount',op,'12.30')]),fields),null)
})
test('depth three is valid and depth four is rejected',()=>{
 assert.equal(validateFilter(group([group([group([leaf()])])]),fields),null)
 assert.ok(validateFilter(group([group([group([group([leaf()])])])]),fields))
})
test('condition budget is twenty, independent of grouping',()=>{
 assert.equal(validateFilter(group(Array.from({length:20},()=>leaf())),fields),null)
 assert.ok(validateFilter(group(Array.from({length:21},()=>leaf())),fields))
})
test('unknown fields, operators, empty groups and malformed leaves fail closed',()=>{
 for(const f of [null,{},group([]),group([leaf('unknown')]),group([leaf('person','contains')]),group([{fieldId:'person',operator:'eq'}]),group([leaf('amount','eq','Infinity')]),group([leaf('amount','eq','12oops')])])assert.ok(validateFilter(f,fields))
})
test('empty text is an explicit valid equality, exact decimal strings remain unchanged',()=>{
 assert.equal(validateFilter(group([leaf('person','eq','')]),fields),null)
 assert.equal(validateFilter(group([leaf('amount','gte','-0.000000000000000000001')]),fields),null)
})
test('oversized and cyclic filters are rejected without throwing',()=>{
 assert.ok(validateFilter(group([leaf('person','eq','字'.repeat(6000))]),fields))
 const circular=group([]);circular.children.push(circular);assert.ok(validateFilter(circular,fields))
})

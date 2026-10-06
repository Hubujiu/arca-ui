import test from 'node:test'
import assert from 'node:assert/strict'
import { originTransform } from '../../src/weaveos/geometry.ts'
const panel={x:400,y:200,width:600,height:400}
test('opening starts at the source center with its size',()=>assert.deepEqual(originTransform({x:100,y:80,width:60,height:40},panel),{x:-570,y:-300,scaleX:0.1,scaleY:0.1}))
test('each distinct source yields its own trajectory',()=>assert.deepEqual(originTransform({x:1000,y:700,width:120,height:80},panel),{x:360,y:340,scaleX:0.2,scaleY:0.2}))
test('absent source uses no displacement',()=>assert.equal(originTransform(null,panel),null))
test('invalid or zero rectangles fall back safely',()=>{for(const rect of [{...panel,width:0},{...panel,height:-1},{...panel,x:NaN},{...panel,y:Infinity}]) assert.equal(originTransform(rect,panel),null)})
test('no division by zero from an unmeasured panel',()=>assert.equal(originTransform(panel,{...panel,width:0}),null))

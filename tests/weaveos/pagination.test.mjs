import test from 'node:test';import assert from 'node:assert/strict';
import {paginationWindow,parsePageInput} from '../../src/weaveos/pagination.ts';
test('small pages list exact pages; large totals use bounded windows',()=>{assert.deepEqual(paginationWindow(1,1),[1]);assert.deepEqual(paginationWindow(3,5),[1,2,3,4,5]);assert.deepEqual(paginationWindow(500,1000000),[1,'gap',499,500,501,'gap',1000000]);});
test('first and last pages retain nearby navigation without enumerating total',()=>{assert.deepEqual(paginationWindow(1,10),[1,2,3,4,'gap',10]);assert.deepEqual(paginationWindow(10,10),[1,'gap',7,8,9,10]);assert.ok(paginationWindow(500000,1000000).length<=7);});
test('page input accepts only in-range integers, not coercions or partial numbers',()=>{assert.equal(parsePageInput(' 123 ',1000),123);for(const value of ['','0','-1','2.5','1e2','10oops','1001','Infinity'])assert.equal(parsePageInput(value,1000),null);});
test('invalid page metadata cannot produce navigable links',()=>{for(const [page,count]of [[0,10],[1,0],[11,10],[NaN,10],[1,Infinity]])assert.deepEqual(paginationWindow(page,count),[]);});

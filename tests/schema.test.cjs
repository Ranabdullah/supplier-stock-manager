const test=require('node:test'),assert=require('node:assert/strict'),schema=require('../data-schema.js');
test('legacy backups gain missing collections without changing caller data',()=>{
 const raw={suppliers:[{id:'s1',name:"O'Brien"}],orders:[]};
 const value=schema.normalise(raw);assert.deepEqual(value.products,[]);assert.equal(raw.products,undefined);
});
test('invalid or hostile backups are rejected before replacement',()=>{
 for(const raw of [{suppliers:{},orders:[]},JSON.parse('{"suppliers":[],"orders":[],"__proto__":{"polluted":true}}'),{suppliers:[{id:"x');alert(1)//",name:'Bad'}],orders:[]},{suppliers:[],orders:[{id:'o',type:'order',items:[{qty:-1,cost:2}]}]}])
  assert.throws(()=>schema.normalise(raw));
 assert.equal({}.polluted,undefined);
});

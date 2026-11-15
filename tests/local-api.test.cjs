const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
test('local folder backups enforce origin, token, version and private asset boundaries',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'stock-local-'));process.env.DATA_DIR=temp;
 const server=await require('../local-server.cjs').startServer(0),origin='http://127.0.0.1:'+server.address().port;
 try{
  for(const file of ['/package.json','/cloudflare/worker.mjs','/Local%20Data/backup.json','/.git/config','/node_modules/xlsx/package.json'])assert.equal((await fetch(origin+file)).status,404);
  const state=await fetch(origin+'/api/local-backup').then(r=>r.json());assert.equal(state.version,0);
  const body={version:0,backup:{product:'supplier-stock-manager',format:1,records:{suppliers:[],orders:[]}}};
  const save=(version,headers={})=>fetch(origin+'/api/local-backup',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Buyer-Backup-Token':state.token,...headers},body:JSON.stringify({...body,version})});
  assert.equal((await save(0,{Origin:'https://untrusted.invalid'})).status,403);
  assert.equal((await save(0,{'X-Buyer-Backup-Token':'wrong'})).status,403);
  assert.equal((await save(0)).status,200);assert.equal((await save(0)).status,409);
  for(let v=1;v<13;v++)assert.equal((await save(v)).status,200);
  assert.equal(fs.readdirSync(path.join(temp,'Local Data','Previous Backups')).length,10);
 }finally{await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true,force:true});delete process.env.DATA_DIR;}
});

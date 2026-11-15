const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Miniflare, convertV4MiniflareOptions } = require('miniflare');
let mf, db;
const vault = (size = 32) => ({ salt: crypto.randomBytes(16).toString('base64'), iv: crypto.randomBytes(12).toString('base64'), data: crypto.randomBytes(size).toString('base64') });
before(async () => {
  mf = new Miniflare(convertV4MiniflareOptions({ name: 'app', modules: true, scriptPath: path.resolve('cloudflare/worker.mjs'), compatibilityDate: '2026-10-01',
    d1Databases: ['DB'], bindings: { JWT_SECRET: crypto.randomBytes(32).toString('hex'), MIGRATION_PENDING: 'false' },
    assets: { directory: path.resolve('dist'), binding: 'ASSETS', routerConfig: { has_user_worker: true }, run_worker_first: ['/api/*'] },
    ratelimits: Object.fromEntries(['AUTH_LIMIT','LOGIN_LIMIT','REGISTER_LIMIT'].map((name,i) => [name,{ namespace_id: String(i+1), simple: { limit: name === 'LOGIN_LIMIT' ? 10 : 60, period: 60 } }]))
  }));
  db = await mf.getD1Database('DB');
  const schema = fs.readFileSync('cloudflare/migrations/0001_vault.sql','utf8').replace(/--[^\n]*/g,'');
  await db.batch(schema.split(';').filter(s => s.trim()).map(s => db.prepare(s)));
});
after(async () => { await mf?.dispose(); });
async function api(route, body, token, method = 'POST', extra = {}) {
  const res = await mf.dispatchFetch('https://app.example' + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await res.text();
  assert.ok(res.headers.get('content-type')?.includes('application/json'), text.slice(0,1500));
  return { status: res.status, body: JSON.parse(text), headers: res.headers };
}
test('Cloudflare runtime: accounts, isolation, atomic conflicts, large vaults, revocation and deletion', async () => {
  const signup = { email: 'one@example.invalid', authVerifier: 'a'.repeat(64), encryptedVault: vault() };
  const first = await api('/api/auth/register', signup);
  assert.equal(first.status,201,JSON.stringify(first.body));
  const secondVault = vault();
  const second = await api('/api/auth/register',{ ...signup,email:'two@example.invalid',encryptedVault:secondVault });
  assert.equal(second.status,201);
  assert.equal((await api('/api/auth/register',signup)).status,409);
  assert.equal((await api('/api/auth/login',{email:signup.email,authVerifier:'b'.repeat(64)})).status,401);
  assert.equal((await api('/api/vault',null,null,'GET')).status,401);
  assert.deepEqual((await api('/api/vault',null,second.body.token,'GET')).body.encryptedVault,secondVault);
  const large = vault(2400000);
  assert.equal((await api('/api/vault',{version:1,encryptedVault:large},first.body.token)).status,200);
  assert.deepEqual((await api('/api/vault',null,first.body.token,'GET')).body.encryptedVault,large,'Vault over D1 row limit survives chunking');
  const writes = await Promise.all([vault(),vault()].map(v => api('/api/vault',{version:2,encryptedVault:v},first.body.token)));
  assert.deepEqual(writes.map(w => w.status).sort(),[200,409]);
  assert.equal((await api('/api/vault',null,first.body.token,'GET')).body.version,3);
  assert.equal((await api('/api/vault',{version:3.5,encryptedVault:vault()},first.body.token)).status,400);
  assert.equal((await api('/api/auth/logout',null,first.body.token)).status,200);
  assert.equal((await api('/api/vault',null,first.body.token,'GET')).status,401);
  assert.equal((await api('/api/account',null,second.body.token,'DELETE')).status,200);
  await api('/api/auth/register',{...signup,email:'two@example.invalid'});
  assert.equal((await api('/api/vault',null,second.body.token,'GET')).status,401);
  assert.equal((await api('/api/health',null,null,'GET')).headers.get('cache-control'),'no-store');
  assert.equal((await api('/api/auth/login',signup,null,'POST',{Origin:'https://evil.example'})).status,403);
  assert.equal((await api('/api/not-a-route',null,null,'GET')).status,404);
});
test('Cloudflare local rate binding limits repeated authentication attempts', async () => {
  const statuses=[];
  for(let i=0;i<11;i++) statuses.push((await api('/api/auth/login',{email:'limited@example.com',authVerifier:'d'.repeat(64)})).status);
  assert.equal(statuses.at(-1),429);
});
test('public assets load and private repository files are unavailable', async () => {
  for(const file of ['/','/data-schema.js','/vendor/reports.js','/vendor/pdf.worker.min.mjs']) assert.equal((await mf.dispatchFetch('https://app.example'+file)).status,200,file);
  for(const file of ['/Local%20Data/backup.json','/cloudflare/worker.mjs','/.cloudflare-auth','/migration-private/test.json','/installer.exe']) assert.equal((await mf.dispatchFetch('https://app.example'+file)).status,404,file);
});

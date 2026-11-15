/* Manual encrypted cloud backup. The buyer deploys the accompanying Worker/D1. */
(() => {
  const adapter = window.BUYER_DATA_ADAPTER;
  if (!adapter) return;
  const hosted = window.STOCK_HOSTED;
  const enc = new TextEncoder(), dec = new TextDecoder();
  let token = null, version = null, activeEmail = null, activeOrigin = null, activePassword = null;
  const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
  function b64(bytes) { let out=''; for(let i=0;i<bytes.length;i+=32768)out+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(out); }
  const fromB64 = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
  async function material(password) { return crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey','deriveBits']); }
  async function encrypt(data,password) {
    const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
    const key=await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:600000},await material(password),{name:'AES-GCM',length:256},false,['encrypt']);
    return {salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(JSON.stringify(data)))))};
  }
  async function decrypt(data,password) {
    const key=await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:fromB64(data.salt),iterations:600000},await material(password),{name:'AES-GCM',length:256},false,['decrypt']);
    return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(data.iv)},key,fromB64(data.data))));
  }
  async function verifier(email,password) {
    return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode('buyer-backup:'+adapter.id+':'+email),iterations:600000},await material(password),256));
  }
  function snapshot() { return {product:adapter.id,format:1,records:adapter.capture()}; }
  const style=document.createElement('style');style.textContent='#buyerCloudPanel{position:fixed;inset:0;background:#0008;z-index:20000;padding:16px;overflow:auto;font:14px/1.5 system-ui;color:#17243c}#buyerCloudPanel form{max-width:460px;margin:40px auto;background:white;padding:24px;border-radius:16px}#buyerCloudPanel label{display:block;margin:12px 0 4px}#buyerCloudPanel input{box-sizing:border-box;width:100%;padding:10px;border:1px solid #bbc9df;border-radius:8px;font:16px system-ui}#buyerCloudPanel button{margin:8px 6px 0 0;padding:10px;border:1px solid #bbc9df;border-radius:8px;cursor:pointer;background:#eef4ff;color:#0b57d0}#buyerCloudStatus{overflow-wrap:anywhere}';document.head.appendChild(style);
  const open=document.createElement('button');open.id='buyerCloudOpen';open.textContent='Cloud backup';open.style.cssText='position:fixed;bottom:16px;left:16px;z-index:9999;border:0;border-radius:10px;background:#0b57d0;color:white;padding:12px;cursor:pointer';
  const panel=document.createElement('section');panel.id='buyerCloudPanel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Your encrypted cloud backup');
  panel.innerHTML='<form><h2>Your cloud backup</h2><p>Deploy the included Cloudflare Worker/D1 on your own account first. Local use works without it. Backups are manual; saving replaces the current cloud copy only after confirmation.</p><label for="buyerCloudUrl">Your app / API address</label><input id="buyerCloudUrl" type="url" placeholder="https://your-app.your-account.workers.dev"><label for="buyerCloudEmail">Cloud account email</label><input id="buyerCloudEmail" type="email" autocomplete="username"><label for="buyerCloudPassword">Master password (12+ characters)</label><input id="buyerCloudPassword" type="password" autocomplete="current-password"><p>Keep this password. It encrypts the backup and cannot be recovered. It stays in this browser; the API receives a derived verifier. Browser editor PINs and API tokens are excluded from the backup.</p><button type="button" data-action="register">Create my cloud account</button><button type="button" data-action="login">Sign in</button><button type="button" data-action="save">Save cloud backup</button><button type="button" data-action="restore">Restore cloud backup</button><button type="button" data-action="delete">Delete cloud account</button><button type="button" data-action="close">Close / sign out</button><p id="buyerCloudStatus" role="status"></p></form>';
  function field(id){return panel.querySelector('#'+id);}
  const local=document.createElement('div');local.innerHTML='<h3>Local backup — no cloud account needed</h3><p>These JSON files contain your app records without encryption. Keep them private.</p><button type="button" data-action="export-local">Export local backup</button><label>Choose a local backup to restore<input id="buyerLocalBackupFile" type="file" accept=".json,application/json"></label><button type="button" data-action="restore-local">Restore local backup</button>';
  panel.querySelector('form').insertBefore(local,panel.querySelector('h2').nextSibling);
  const status=text=>{field('buyerCloudStatus').textContent=text;};
  function inputs() {
    const value=field('buyerCloudUrl').value.trim()||location.origin;
    const url=new URL(value);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)))throw new Error('Use HTTPS or your local test server.');
    if(url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('Use just the app origin, without a path, password or query.');
    if(url.origin!==location.origin)throw new Error('Open your deployed app at '+url.origin+' to use its cloud backup. Export local records here, then import them at that address.');
    const email=field('buyerCloudEmail').value.trim().toLowerCase(),password=field('buyerCloudPassword').value;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<12)throw new Error('Enter an email and a master password of at least 12 characters.');
    return {origin:url.origin,email,password};
  }
  async function api(origin,path,method='GET',body) {
    const res=await fetch(origin+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(70000)});
    let data;try{data=await res.json();}catch{throw new Error('Cloud API is missing. Follow docs/SETUP.md; local data is preserved.');}
    if(!res.ok)throw new Error(res.status===409?'Cloud changed or the account already exists. Sign in, review and retry.':data.error||'Cloud request failed.');return data;
  }
  async function act(action) {
    if(action==='export-local'){
      const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=adapter.id+'-backup-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Local backup exported. Keep this unencrypted file private.');return;
    }
    if(action==='restore-local'){
      const file=field('buyerLocalBackupFile').files[0];if(!file)throw new Error('Choose a JSON backup file first.');if(file.size>15*1024*1024)throw new Error('Local backup exceeds 15 MB.');const value=JSON.parse(await file.text());
      if(value.product!==adapter.id||value.format!==1||!adapter.valid(value.records))throw new Error('This backup is invalid or belongs to another product.');
      if(!confirm('Replace this browser’s app records with the selected local backup? Export your current data first.'))return;
      await adapter.restore(value.records);location.reload();return;
    }
    if(action==='close') {
      if(hosted && token && !confirm('Sign out and discard any changes you have not saved to your account?'))return;
      try{if(token&&activeOrigin)await api(activeOrigin,'/api/auth/logout','POST');}catch{}
      token=null;version=null;activeEmail=null;activeOrigin=null;activePassword=null;field('buyerCloudPassword').value='';if(hosted){location.replace(location.pathname);return;}
      panel.hidden=true;open.focus();return;
    }
    if(window.STOCK_DEMO)throw new Error('The public demo has no cloud database. Deploy your own copy using the GitHub setup guide. Local export and import still work.');
    const {origin,email,password}=inputs();
    if(action==='register'||action==='login') {
      token=null;version=null;activeEmail=null;activeOrigin=null;activePassword=null;
      const body={email,authVerifier:await verifier(email,password)};
      if(action==='register')body.encryptedVault=await encrypt(hosted?{product:adapter.id,format:1,records:defaultDB()}:snapshot(),password);
      const data=await api(origin,'/api/auth/'+(action==='register'?'register':'login'),'POST',body);
      const restored=data.encryptedVault?await decrypt(data.encryptedVault,password):null;
      if(hosted&&restored&&(restored.product!==adapter.id||restored.format!==1||!adapter.valid(restored.records)))throw new Error('This account backup could not be opened.');
      token=data.token;version=data.version;activeEmail=email;activeOrigin=origin;activePassword=password;
      localStorage.setItem('buyer_cloud_origin_'+adapter.id,origin);
      if(hosted){
        adapter.replaceSession(restored?.records||defaultDB());
        document.getElementById('shell').style.display='flex';
        panel.hidden=true;
        syncHostedButtons();
      }
      status('Signed in. Create account stores the initial encrypted backup; sign-in does not overwrite local data.');return;
    }
    if(!token||activeEmail!==email||activeOrigin!==origin||activePassword!==password)throw new Error('Sign in to this cloud account and address first.');
    if(action==='delete'){
      if(!confirm('Delete this cloud account and its encrypted backup permanently? Export or restore any needed cloud copy first. Local records will remain.'))return;
      await api(origin,'/api/account','DELETE');token=null;version=null;activePassword=null;field('buyerCloudPassword').value='';if(hosted){location.replace(location.pathname);return;}status('Cloud account deleted. Local records remain.');return;
    }
    if(action==='save') {
      if(!confirm('Replace this account’s cloud backup with the current local data? Keep an exported backup first.'))return;
      const result=await api(origin,'/api/vault','POST',{encryptedVault:await encrypt(snapshot(),password),version});version=result.version;
      status('Encrypted backup saved to your own cloud. Other devices must sign in and restore to load it.');
    } else if(action==='restore') {
      const data=await api(origin,'/api/vault');const value=await decrypt(data.encryptedVault,password);
      if(value.product!==adapter.id||value.format!==1||!adapter.valid(value.records))throw new Error('Backup does not match this product or has invalid records.');
      if(!confirm('Replace local app data with this cloud backup? Export your current data first.'))return;
      await adapter.restore(value.records);version=data.version;status('Backup restored. Reloading the app.');location.reload();
    }
  }
  panel.querySelector('form').onsubmit=e=>e.preventDefault();
  panel.addEventListener('click',async event=>{const button=event.target.closest('button[data-action]');if(!button)return;const buttons=[...panel.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{status('Working…');await act(button.dataset.action);}catch(error){status(error.message+' Your existing local data remains available.');}finally{buttons.forEach(b=>b.disabled=false);}});
  open.onclick=()=>{field('buyerCloudUrl').value=localStorage.getItem('buyer_cloud_origin_'+adapter.id)||location.origin;panel.hidden=false;field('buyerCloudEmail').focus();};
  document.body.append(open,panel);
  function syncHostedButtons(){
    if(!hosted)return;
    for(const a of ['register','login']) panel.querySelector('[data-action="'+a+'"]').hidden=!!token;
    for(const a of ['save','restore','delete','close']) panel.querySelector('[data-action="'+a+'"]').hidden=!token;
    local.hidden=!token;
    field('buyerCloudEmail').readOnly=!!token;
    field('buyerCloudPassword').hidden=!!token;
    panel.querySelector('label[for=buyerCloudPassword]').hidden=!!token;
    open.textContent='Account & save';
  }
  if(hosted){
    document.getElementById('lock-screen').style.display='none';
    document.getElementById('shell').style.display='none';
    panel.querySelector('h2').textContent='Your Supplier Ledger account';
    panel.querySelector('form > p').textContent='Create an empty workspace or sign in to your saved records. Use Account & save to keep changes before closing.';
    field('buyerCloudUrl').value=location.origin;
    field('buyerCloudUrl').hidden=true;
    panel.querySelector('label[for=buyerCloudUrl]').hidden=true;
    const demo=document.createElement('a');demo.href='https://supplier-stock-manager-demo.ranakaharian1.workers.dev/';demo.textContent='Explore the fictional demo';panel.querySelector('form').append(demo);
    panel.hidden=false;
    syncHostedButtons();
  }
})();

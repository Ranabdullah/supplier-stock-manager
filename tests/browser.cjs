const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'supplier-browser-'));process.env.DATA_DIR=temp;
(async()=>{const server=await require('../local-server.cjs').startServer(0),origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:process.env.CI?undefined:'chrome',headless:true});
 const errors=[],external=[];fs.mkdirSync('test-results',{recursive:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(origin)&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))external.push(r.url())});
  await page.goto(origin);await page.locator('#buyerGuideContinue').click();
  await page.locator('#setup-pw').fill('LocalDemo42');await page.locator('#setup-pw2').fill('LocalDemo42');await page.locator('#btn-setup-pw').click();
  assert.equal(await page.evaluate(()=>db.suppliers.length),0,'fresh edition is empty');
  await page.locator('#btn-add-supplier').click();await page.locator('#modal-sup-name').fill("Demo O'Brien Wholesale");await page.locator('#modal-save-sup').click();
  assert.equal(await page.evaluate(()=>db.suppliers.length),1,'supplier creation UI');
  await page.evaluate(async()=>{
   const line={product:"O'Brien cable",category:"Cables');window.XSS=true;//",colour:'Blue',code:'D1',ean:'',store:'Demo shop',qty:10,cost:2.5,arrivedQty:8};
   db=StockSchema.normalise({...defaultDB(),businessName:'Demo Supply Studio',suppliers:[{id:'demo',name:'Demo eBay Wholesale',openingBalance:50}],orders:[{id:'order1',supplierId:'demo',type:'order',date:'2026-11-01',deliveryCost:5,paidAmount:10,items:[line]},{id:'return1',supplierId:'demo',type:'return',date:'2026-11-02',items:[{...line,qty:2,arrivedQty:0}]}],supplierPayments:[{id:'pay1',supplierId:'demo',date:'2026-11-03',amount:20}],categories:[line.category]});
   await saveDB();setView('stock');
  });
  const totals=await page.evaluate(()=>({order:orderTotals(db.orders[0]),stock:aggregateStock()[0].qty,financial:computeSupplierFinancials('demo')}));
  assert.equal(totals.order.value,30);assert.equal(totals.stock,6);assert.equal(totals.financial.totalPaid,30);assert.equal(totals.financial.remainingBalance,50);assert.equal(totals.financial.isOnline,false,'supplier name never implies paid');
  await page.getByRole('button',{name:'Rename / Merge'}).first().click();assert.equal(await page.evaluate(()=>!!window.XSS),false);await page.evaluate(()=>closeModal());
  await page.locator('button[title^="Edit product name"]').first().click();await page.evaluate(()=>closeModal());
  console.log('PASS core UI, stock, payments and safe names');
  // Real downloaded reports, not mocked library calls.
  const getDownload=async(action,name)=>{const pending=page.waitForEvent('download');await page.evaluate(action);const d=await pending,file=path.join(temp,name);await d.saveAs(file);return file;};
  const pdf=await getDownload(()=>exportStock('pdf'),'stock.pdf');assert.equal(fs.readFileSync(pdf).subarray(0,4).toString(),'%PDF');
  const workbook=await getDownload(()=>exportStock('xlsx'),'stock.xlsx');const XLSX=require('xlsx'),book=XLSX.readFile(workbook);assert.ok(book.SheetNames.length);assert.ok(JSON.stringify(XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1})).includes("O'Brien cable"));
  await page.waitForFunction(()=>!!window.pdfjsLib);
  const pdfText=await page.evaluate(async bytes=>extractPdfText(new File([new Uint8Array(bytes)],'stock.pdf',{type:'application/pdf'})),[...fs.readFileSync(pdf)]);assert.ok(pdfText.some(x=>x.includes('Stock')),'current PDF reader processes actual report');
  console.log('PASS actual PDF/XLSX export and PDF text reading');
  const ocr=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=1000;c.height=170;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,c.width,c.height);x.fillStyle='black';x.font='bold 64px Arial';x.fillText('DEMO INVOICE 123',30,110);const blob=await new Promise(r=>c.toBlob(r));return extractImageText(new File([blob],'invoice.png',{type:'image/png'}))});assert.ok(ocr.join(' ').includes('123'),'local OCR worker/core/language load');
  const before=await page.evaluate(()=>JSON.stringify(db));await page.evaluate(()=>{window.confirm=()=>true;});
  await page.locator('#file-import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"suppliers":{},"orders":[]}')});await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('Import stopped'));assert.equal(await page.evaluate(()=>JSON.stringify(db)),before,'invalid import preserves data');
  await page.evaluate(async()=>{await saveIDB({...defaultDB(),orders:[...db.orders,...db.orders.map(o=>({...o,id:o.id+'-old'}))],meta:{savedAt:1}})});await page.reload();await page.waitForSelector('#shell',{state:'visible'});assert.equal(await page.evaluate(()=>db.orders.length),2,'older larger IDB copy cannot resurrect deleted records');
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});await page.evaluate(()=>setView('stock'));if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)){console.log('Overflowing elements',await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(e).position!=='fixed').slice(0,12).map(e=>({tag:e.tagName,id:e.id,cls:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right}))));await page.screenshot({path:'test-results/overflow.png'});}assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no page overflow at '+width)}
  await page.evaluate(async()=>{db=defaultDB();await BUYER_EXAMPLE();setView('home');});
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/workspace-desktop.png',fullPage:false});
  await page.evaluate(()=>document.getElementById('toast').classList.remove('show'));await page.screenshot({path:'docs/preview.png',fullPage:false});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/workspace-mobile.png',fullPage:false});
  assert.deepEqual(errors,[]);assert.deepEqual(external,[],'all reporting and OCR assets are served locally');
  console.log('PASS: empty start, supplier UI, financial totals, stock/returns, safe names, actual PDF/XLSX export, PDF reading, local OCR, import validation, recovery ordering and 320–1440px layouts.');
 }finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true,force:true});delete process.env.DATA_DIR;}
})().catch(e=>{console.error(e);process.exitCode=1});

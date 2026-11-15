const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
if(path.dirname(out)!==root||path.basename(out)!=='dist')throw Error('Unsafe build destination');
if(fs.existsSync(out)){
 if(fs.lstatSync(out).isSymbolicLink())throw Error('Build destination cannot be a link');
 fs.rmSync(out,{recursive:true});
}
fs.mkdirSync(out,{recursive:true});
// Explicit source allowlist: private folders, databases and credentials never ship.
for(const file of ['index.html','_headers','data-schema.js','buyer-cloud.js','buyer-examples.js','buyer-guide.js','buyer-phone.js','buyer-phone.css'])fs.copyFileSync(path.join(root,file),path.join(out,file));
fs.writeFileSync(path.join(out,'app-config.js'),'window.STOCK_DEMO='+process.argv.includes('--demo')+';window.STOCK_HOSTED='+process.argv.includes('--hosted')+';\n');
const vendor=path.join(out,'vendor');fs.mkdirSync(vendor,{recursive:true});
require('esbuild').buildSync({entryPoints:[path.join(root,'scripts/reports.js')],bundle:true,minify:true,format:'iife',platform:'browser',target:'es2022',outfile:path.join(vendor,'reports.js'),legalComments:'eof'});
function copy(from,to){const target=path.join(vendor,to);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,'node_modules',from),target);}
copy('xlsx/dist/xlsx.full.min.js','xlsx.full.min.js');
copy('pdfjs-dist/build/pdf.min.mjs','pdf.min.mjs');copy('pdfjs-dist/build/pdf.worker.min.mjs','pdf.worker.min.mjs');
fs.writeFileSync(path.join(vendor,'pdf-loader.mjs'),"import * as pdf from './pdf.min.mjs';pdf.GlobalWorkerOptions.workerSrc=new URL('./pdf.worker.min.mjs',import.meta.url).href;window.pdfjsLib=pdf;\n");
copy('tesseract.js/dist/worker.min.js','ocr/worker.min.js');
copy('tesseract.js/dist/worker.min.js.LICENSE.txt','licenses/ocr-worker.txt');
for(const file of fs.readdirSync(path.join(root,'node_modules/tesseract.js-core')))if(/\.wasm(?:\.js)?$|^tesseract-core.*\.js$/.test(file))copy('tesseract.js-core/'+file,'ocr/'+file);
copy('@tesseract.js-data/eng/4.0.0/eng.traineddata.gz','ocr/lang/eng.traineddata.gz');
for(const [pkg,file] of [['jspdf','LICENSE'],['jspdf-autotable','LICENSE.txt'],['pdfjs-dist','LICENSE'],['xlsx','LICENSE'],['tesseract.js','LICENSE.md'],['tesseract.js-core','LICENSE']]){
 const from=path.join(root,'node_modules',pkg,file);if(fs.existsSync(from))copy(pkg+'/'+file,'licenses/'+pkg.replaceAll('/','-')+'.txt');
}
const manifest=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else manifest.push({file:path.relative(out,full).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex')});}}
walk(out);fs.writeFileSync(path.join(out,'asset-manifest.json'),JSON.stringify(manifest,null,2));
console.log('Built allowlisted app and locally served reporting/OCR libraries:',manifest.length,'assets.');

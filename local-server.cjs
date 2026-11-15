const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,publicRoot=path.join(root,'dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.wasm':'application/wasm','.gz':'application/gzip','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.ico':'image/x-icon'};
async function startServer(port=Number(process.env.PORT)||8102){
 const backup=require('./local-backup.cjs')(process.env.DATA_DIR||root,'supplier-stock-manager');
 const server=http.createServer(async(req,res)=>{try{
  const suffix=':'+req.socket.localPort;
  if(!['127.0.0.1'+suffix,'localhost'+suffix].includes(req.headers.host)){res.writeHead(403);return res.end();}
  const url=new URL(req.url,'http://localhost');
  if(await backup(req,res,url))return;
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  const relative=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';
  if(relative.split('/').some(p=>p.startsWith('.'))||!mime[path.extname(relative)]){res.writeHead(404);return res.end();}
  const target=path.resolve(publicRoot,relative);
  if(!target.startsWith(publicRoot+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':mime[path.extname(target)],'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()'});
  if(req.method==='HEAD')res.end();else fs.createReadStream(target).pipe(res);
 }catch{res.writeHead(400);res.end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});
 return server;
}
module.exports={startServer};
if(require.main===module)startServer().then(server=>{
 const address='http://127.0.0.1:'+server.address().port+'/';console.log('Open '+address+' — keep this window open.');
 if(process.argv.includes('--open')&&process.platform==='win32')require('node:child_process').spawn('explorer.exe',[address],{shell:false,detached:true,windowsHide:true,stdio:'ignore'}).unref();
}).catch(error=>{console.error('Could not start local app:',error.message);process.exitCode=1});

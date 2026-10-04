import {mkdtempSync,writeFileSync,readFileSync,readdirSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {spawnSync,spawn} from 'node:child_process';
import {chownSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const own=fileURLToPath(new URL('./',import.meta.url));
const temp=mkdtempSync(join(tmpdir(),'zuku-editor-consumer-'));
const consumer=join(temp,'consumer');let browser,server,chrome,profile;
const run=(command,args,cwd)=>{const r=spawnSync(command,args,{cwd,encoding:'utf8',timeout:120000});assert.equal(r.status,0,r.stderr);return r.stdout;};
try {
 run('npm',['pack','--json','--pack-destination',temp],own);
 const archive=join(temp,readdirSync(temp).find(n=>n.endsWith('.tgz')));mkdirSync(consumer);
 writeFileSync(join(consumer,'package.json'),JSON.stringify({name:'independent-zuku-editor-consumer',private:true,type:'module'}));
 run('npm',['install','--ignore-scripts','--no-audit','--no-fund',archive],consumer);
 writeFileSync(join(consumer,'node.mjs'),`import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{editorUrl,createEditorFrame}from'@zuku/editor';assert.ok(editorUrl.endsWith('/dist/index.html'));assert.equal(typeof createEditorFrame,'function');assert.throws(()=>createEditorFrame(),/browser document/);assert.ok(WebAssembly.validate(readFileSync(new URL('runtime/zwf_runtime.wasm',editorUrl))));`);
 run(process.execPath,['node.mjs'],consumer);
 writeFileSync(join(consumer,'consumer.ts'),`import{editorUrl,createEditorFrame}from'@zuku/editor';const u:string=editorUrl;const frame:HTMLIFrameElement=createEditorFrame({url:u,width:1280,height:800});void frame;\n// @ts-expect-error dimensions are numeric\ncreateEditorFrame({width:'100%'});`);
 run(process.execPath,[resolve(own,'../../node_modules/typescript/bin/tsc'),'--noEmit','--strict','--module','NodeNext','--moduleResolution','NodeNext','--target','ES2022','--lib','ES2022,DOM','consumer.ts'],consumer);
 const prefix='/node_modules/@zuku/editor';
 writeFileSync(join(consumer,'host.mjs'),`import{createEditorFrame}from'${prefix}/index.js';localStorage.setItem('zuku-editor-isolation-test','dummy');let refused=false;try{createEditorFrame({url:'https://example.invalid/editor'})}catch{refused=true}window.urlRefused=refused;document.body.append(createEditorFrame());`);
 const requests=[],statuses=[],editorCookies=[];
 server=createServer((req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;requests.push(path);
  if(path.startsWith('/node_modules/@zuku/editor/dist/'))editorCookies.push(req.headers.cookie??'');
  res.setHeader('Access-Control-Allow-Origin','*');
  if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><script type="module" src="/host.mjs"></script>');return;}
  if(path==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const local=resolve(consumer,'.'+path);
  if(!local.startsWith(consumer+sep)){res.writeHead(404);res.end();return;}
  try {const bytes=readFileSync(local);res.setHeader('Content-Type',path.endsWith('.html')?'text/html':path.endsWith('.json')?'application/json':path.endsWith('.css')?'text/css':path.endsWith('.wasm')?'application/wasm':path.endsWith('.png')?'image/png':path.endsWith('.svg')?'image/svg+xml':'text/javascript');res.end(bytes);}catch{statuses.push(path);res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const {chromium}=createRequire(import.meta.url)(process.env.ZUKU_EDITOR_PLAYWRIGHT_MODULE);
 const gpuArgs=['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader-webgl'];
 if(process.getuid?.()===0 && process.env.ZUKU_EDITOR_BROWSER_UID){
  const uid=Number(process.env.ZUKU_EDITOR_BROWSER_UID);assert.ok(Number.isInteger(uid)&&uid>0);
  profile=mkdtempSync(join(tmpdir(),'zuku-editor-browser-'));chownSync(profile,uid,uid);
  const log=[];
  chrome=spawn(process.env.ZUKU_EDITOR_BROWSER_EXECUTABLE,[...gpuArgs,'--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--disable-default-apps','--disable-dev-shm-usage','about:blank'],{uid,gid:uid,cwd:profile,env:{PATH:'/usr/bin:/bin',HOME:profile,XDG_CONFIG_HOME:profile,XDG_CACHE_HOME:profile,LANG:'C.UTF-8'},stdio:['ignore','ignore','pipe']});
  chrome.stderr.on('data',c=>{if(log.length<100)log.push(c.toString());});
  let active;
  for(let i=0;i<100;i++){try{active=readFileSync(join(profile,'DevToolsActivePort'),'utf8').trim().split('\n');break;}catch{if(chrome.exitCode!==null)throw Error('Supervised sandbox browser exited before readiness');await new Promise(r=>setTimeout(r,100));}}
  assert.ok(active,'Supervised browser readiness timeout');
  browser=await chromium.connectOverCDP(`http://127.0.0.1:${active[0]}`);
 }else{browser=await chromium.launch({executablePath:process.env.ZUKU_EDITOR_BROWSER_EXECUTABLE,chromiumSandbox:true,args:gpuArgs});}
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[],external=[],consoleErrors=[];
 await page.context().addCookies([{name:'zuku_editor_parent_test',value:'dummy',url:origin}]);
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(origin)&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))external.push(r.url());});
 await page.goto(origin);await page.waitForSelector('iframe');
 const frame=page.frames().find(f=>f.parentFrame());
 try {
  await frame.waitForFunction(()=>!!window.nl&&document.querySelectorAll('canvas').length>0,null,{timeout:30000});
 } catch(e) {const state=await frame.evaluate(()=>({api:!!window.nl,canvases:document.querySelectorAll('canvas').length,progress:document.querySelector('#progress-message')?.textContent,visibleText:document.body.innerText.slice(-2000),webgl:!!document.createElement('canvas').getContext('webgl2'),offscreen:!!new OffscreenCanvas(1,1).getContext('webgl2'),origin:self.origin}));if(process.env.ZUKU_EDITOR_PROOF_PATH)writeFileSync(process.env.ZUKU_EDITOR_PROOF_PATH,JSON.stringify({failed:true,errors,consoleErrors,state,external,missing:statuses,requests},null,2));throw e;}
 const isolation=await frame.evaluate(()=>({origin:self.origin,parentStorage:localStorage.getItem('zuku-editor-isolation-test'),permissions:{camera:document.featurePolicy?.allowsFeature('camera'),microphone:document.featurePolicy?.allowsFeature('microphone'),fullscreen:document.featurePolicy?.allowsFeature('fullscreen')},canvas:document.querySelectorAll('canvas').length,webgl:!!document.createElement('canvas').getContext('webgl2')}));
 assert.equal(isolation.origin,'null');assert.equal(isolation.parentStorage,null);assert.deepEqual(isolation.permissions,{camera:false,microphone:false,fullscreen:false});
 const packedWasm=await frame.evaluate(async()=>{const response=await fetch(new URL('runtime/zwf_runtime.wasm',document.baseURI),{credentials:'omit',redirect:'error'});if(!response.ok)throw new Error('Packaged WASM response failed');const bytes=await response.arrayBuffer();const module=await WebAssembly.compile(bytes);const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');return {sha256:digest,bytes:bytes.byteLength,exports:WebAssembly.Module.exports(module).map(x=>x.name),mime:response.headers.get('content-type')};});
 assert.equal(packedWasm.sha256,createHash('sha256').update(readFileSync(resolve(own,'dist/runtime/zwf_runtime.wasm'))).digest('hex'));assert.equal(packedWasm.mime,'application/wasm');
 const sandbox=await page.locator('iframe').getAttribute('sandbox');assert.ok(!sandbox.includes('allow-same-origin'));assert.equal(await page.locator('iframe').getAttribute('allow'),'');assert.equal(await page.evaluate(()=>window.urlRefused),true);
 const beforeTabs=await frame.locator('#screen-tab-area > *').count();await frame.locator('#screen-tab-add').click();await frame.waitForFunction(n=>document.querySelectorAll('#screen-tab-area > *').length>n,beforeTabs);
 const beforeLayers=await frame.locator('.timeline-layer-controller:visible').count();await frame.locator('#timeline-layer-add').click();await frame.waitForFunction(n=>[...document.querySelectorAll('.timeline-layer-controller')].filter(x=>x.getBoundingClientRect().height>0).length>n,beforeLayers);
 await frame.locator('#tools-rectangle').click();
 const beforeObjects=await frame.locator('#stage-area .display-object').count();
 const stage=await frame.locator('#stage').boundingBox();assert.ok(stage);
 await page.mouse.move(stage.x+60,stage.y+60);await page.mouse.down();await page.mouse.move(stage.x+160,stage.y+120,{steps:10});await page.mouse.up();
 await frame.waitForFunction(n=>document.querySelectorAll('#stage-area .display-object').length>n,beforeObjects);
 const beforeScale=await frame.locator('#screen-scale').inputValue();const beforeStage=await frame.locator('#stage').evaluate(e=>({width:e.style.width,height:e.style.height}));await frame.locator('#screen-scale').fill('125');await frame.locator('#screen-scale').press('Enter');assert.equal(await frame.locator('#screen-scale').inputValue(),'125');await frame.waitForFunction(previous=>document.querySelector('#stage').style.width!==previous.width,beforeStage);const afterStage=await frame.locator('#stage').evaluate(e=>({width:e.style.width,height:e.style.height}));assert.equal(parseFloat(afterStage.width)/parseFloat(beforeStage.width),125/Number(beforeScale));
 const stageImage=await frame.locator('#stage').screenshot();
 const pixels=await page.evaluate(async encoded=>{const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);const data=context.getImageData(0,0,canvas.width,canvas.height).data;let black=0;for(let i=0;i<data.length;i+=4)if(data[i]<10&&data[i+1]<10&&data[i+2]<10&&data[i+3]===255)black++;return {width:canvas.width,height:canvas.height,blackPixels:black};},stageImage.toString('base64'));assert.ok(pixels.blackPixels>5000,JSON.stringify(pixels));
 assert.ok(editorCookies.length>0);assert.ok(editorCookies.every(cookie=>!cookie.includes('zuku_editor_parent_test')),'Credentialless frame assets received host cookie');
 assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(external.length,0);assert.equal(statuses.length,0,JSON.stringify(statuses));
 if(process.env.ZUKU_EDITOR_SCREENSHOT_PATH)await page.locator('iframe').screenshot({path:process.env.ZUKU_EDITOR_SCREENSHOT_PATH});
 const proof={pass:true,artifactSha256:createHash('sha256').update(readFileSync(archive)).digest('hex'),nodeConsumer:true,nodeValidatesPackagedWasm:true,browserCompilesPackagedWasm:packedWasm,typecheck:true,actualIframeBoot:true,actualCanvasPresent:isolation.canvas>0,actualWebGL2:isolation.webgl,permissions:isolation.permissions,actualRenderedRectanglePixels:pixels,defaultOpaqueSandbox:true,parentStorageIsolated:true,hostCookiesNotSentToEditorAssets:true,remoteUrlRejected:true,uiActions:{newProject:true,newLayer:true,rectangleDrawCreatesDisplayObject:true,stageZoomChangesActualStageSize:true},previousZoom:beforeScale,beforeStage,afterStage,pageErrors:errors,consoleErrors,externalRequests:external,missingAssets:statuses,network:'loopback static installed package assets only'};
 if(process.env.ZUKU_EDITOR_PROOF_PATH)writeFileSync(process.env.ZUKU_EDITOR_PROOF_PATH,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
} finally {if(browser){if(chrome){try{await(await browser.newBrowserCDPSession()).send('Browser.close');}catch{}}await browser.close();}if(chrome&&chrome.exitCode===null){await new Promise(r=>{chrome.once('exit',r);setTimeout(()=>{if(chrome.exitCode===null)chrome.kill('SIGTERM');r();},3000);});}if(server)await new Promise(r=>server.close(r));rmSync(temp,{recursive:true,force:true});if(profile)rmSync(profile,{recursive:true,force:true});}

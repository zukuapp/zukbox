import {build,mergeConfig} from 'vite';
import {readFileSync,writeFileSync,mkdirSync,cpSync,rmSync,readdirSync,chmodSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const own=fileURLToPath(new URL('./',import.meta.url));
const root=resolve(own,'../..');
if(process.cwd()!==root)process.chdir(root);
const {default:config}=await import('../../vite.config.ts');
let html=readFileSync(resolve(root,'index.html'),'utf8');
html=html.replace(/https:\/\/ajaxorg.github.io\/ace-builds\/src-min\//g,'/assets/vendor/ace/')
.replaceAll('./src/css/style.scss','../../src/css/style.scss').replaceAll('./src/js/main.ts','./bootstrap.ts')
.replaceAll('./assets/','/assets/').replace(' onContextmenu="return false;"','');
const csp="default-src 'none'; script-src 'self' blob: 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; media-src 'self' data: blob:; font-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'";
html=html.replace('<meta charset="UTF-8">',`<meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="${csp}">`);
const entry=resolve(own,'entry.html');writeFileSync(entry,html);
try {
 await build(mergeConfig(config,{base:'./',resolve:{alias:[
  {find:'./TimelineLayerControllerNameTextFocusOutEventUseCase',replacement:resolve(root,'src/js/timeline/application/TimelineLayerController/usecase/TimelineLayerControllerNameTextFocusoutEventUseCase.ts')},
  {find:'@/config/LanguageConfig',replacement:resolve(own,'language-config.ts')},
  {find:'@zukbox/runtime/player',replacement:resolve(root,'../runtime/js/zwf-player.mjs')},
  {find:'@zukbox/runtime',replacement:resolve(root,'../runtime/js/zwf-loader.mjs')},
  {find:'@',replacement:resolve(root,'src/js')},
  {find:'@next2d-core-internal',replacement:resolve(root,'../player/packages/core/src')}
 ]},build:{outDir:resolve(own,'dist'),emptyOutDir:true,rollupOptions:{input:entry}}}));
 const generated=resolve(own,'dist/npm/editor/entry.html');
 html=readFileSync(generated,'utf8').replaceAll('../../assets/','./assets/').replaceAll('/assets/vendor/ace/','./assets/vendor/ace/').replaceAll('./assets/img/logo.svg','./branding/zuku-logo-dark.png');
 writeFileSync(resolve(own,'dist/index.html'),html);rmSync(resolve(own,'dist/npm'),{recursive:true,force:true});
 const vendor=resolve(own,'dist/assets/vendor/ace');mkdirSync(vendor,{recursive:true});
 cpSync(resolve(own,'node_modules/ace-builds/src-min'),vendor,{recursive:true});
 cpSync(resolve(root,'../runtime/dist/zwf_runtime.wasm'),resolve(own,'dist/runtime/zwf_runtime.wasm'));
 rmSync(resolve(own,'dist/CNAME'),{force:true});
 cpSync(resolve(root,'.github/branding'),resolve(own,'dist/branding'),{recursive:true});
 const publicModes=directory=>{chmodSync(directory,0o755);for(const item of readdirSync(directory,{withFileTypes:true})){const path=resolve(directory,item.name);if(item.isDirectory())publicModes(path);else chmodSync(path,0o644);}};
 publicModes(resolve(own,'dist'));
} finally {rmSync(entry,{force:true});}

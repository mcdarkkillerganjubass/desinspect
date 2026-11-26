// Run with Node 22+; CHROME_BIN can point to a Chromium/Chrome executable.
const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const {spawn} = require('node:child_process');
const {mkdtempSync, readFileSync, writeFileSync, copyFileSync, rmSync, existsSync} = require('node:fs');
const {join, resolve} = require('node:path');
const {tmpdir, homedir} = require('node:os');
const repo = resolve(__dirname, '..');
const browser = process.env.CHROME_BIN || join(homedir(), 'Library/Caches/ms-playwright/chromium-1161/chrome-mac/Chromium.app/Contents/MacOS/Chromium');
assert(existsSync(browser), 'Set CHROME_BIN to a Chrome/Chromium executable');
const delay = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, message) {
  for (let i=0;i<100;i++) {const result = await fn(); if(result) return result; await delay(50);}
  throw Error(`Timeout: ${message}`);
}
class CDP {
  static async connect(url) {const c = new CDP(); c.socket = new WebSocket(url); c.pending = new Map(); c.errors=[]; c.id = 0; await new Promise((r,j) => {c.socket.onopen = r; c.socket.onerror = j;}); c.socket.onmessage = e => {const m = JSON.parse(e.data); if(m.method==='Runtime.exceptionThrown')c.errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); if(m.id) {const p=c.pending.get(m.id); if(p) {c.pending.delete(m.id); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result);}}}; return c;}
  call(method, params = {}) {const id=++this.id; return new Promise((resolve,reject) => {this.pending.set(id,{resolve,reject}); this.socket.send(JSON.stringify({id,method,params}));});}
  async eval(expression, contextId) {const r=await this.call('Runtime.evaluate',{expression,contextId,awaitPromise:true,returnByValue:true,userGesture:true}); if(r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value;}
  close() {this.socket.close();}
}
const sandbox = mkdtempSync(join(tmpdir(),'design-inspect-test-'));
let chrome, page, worker;
const sockets = new Set();
const makeServer = () => {
  const server = createServer((req,res) => {
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Content-Security-Policy',"font-src 'none'");
    if (req.url.startsWith('/frame')) res.end(`<!doctype html><style>:root{font-size:20px;--frame-space:30px}#inside{padding:var(--frame-space);border-radius:48px 24px 8px 0}</style><div id="card"><button id="inside">Frame button</button><span>Sibling</span></div><div id="dropdown" hidden>Menu</div><script>const button=document.querySelector('#inside'),menu=document.querySelector('#dropdown');button.onclick=()=>menu.hidden=!menu.hidden;button.onblur=()=>menu.hidden=true;document.addEventListener('pointerdown',e=>{if(e.target!==button)menu.hidden=true},true);</script>`);
    else res.end(`<!doctype html><title>Frame test</title><style>body{font:16px system-ui}iframe{width:330px;height:220px;display:block;margin:8px}</style><button id="main">Main</button><iframe id="same" src="/frame"></iframe><iframe id="cross" src="http://localhost:${other.address().port}/frame"></iframe><iframe id="blocked" src="http://127.0.0.1:${other.address().port}/frame"></iframe>`);
  });
  server.on('connection', socket => {sockets.add(socket); socket.on('close',()=>sockets.delete(socket));});
  return server;
};
const other = makeServer(), main = makeServer();
const listen = server => new Promise(r => server.listen(0,r));
async function nodes() {
  const {root} = await page.call('DOM.getDocument',{depth:-1,pierce:true});
  const all=[]; const walk=n=>{all.push(n); for(const c of [...(n.children||[]),...(n.shadowRoots||[]),...(n.contentDocument?[n.contentDocument]:[])]) walk(c);}; walk(root); return all;
}
async function panelNode(selector) {
  for(let attempt=0;attempt<4;attempt++) {
    const all=await nodes();
    const node=all.find(n => {const a=n.attributes||[]; const attrs={}; for(let i=0;i<a.length;i+=2)attrs[a[i]]=a[i+1]; return selector(attrs,n);});
    assert(node,'Panel control not found');
    try{return (await page.call('DOM.resolveNode',{nodeId:node.nodeId})).object.objectId;}
    catch(error){if(!error.message.includes('No node with given id') || attempt===3)throw error;await delay(20);}
  }
}
async function control(selector, expression) {
  return (await page.call('Runtime.callFunctionOn',{objectId:await panelNode(selector),functionDeclaration:`function(){${expression}}`,returnByValue:true})).result.value;
}
async function mode(next) {
  const rect=await control(a=>a['data-mode']===next,'const r=this.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};');
  await page.call('Input.dispatchMouseEvent',{type:'mousePressed',...rect,button:'left',clickCount:1});
  await page.call('Input.dispatchMouseEvent',{type:'mouseReleased',...rect,button:'left',clickCount:1});
}
async function panelText() {return control(a=>a.class==='panel',"return this.querySelector('.selection-header').textContent+this.querySelector('.content').textContent;");}
async function frameMeasurements(id) {
  const frame=(await nodes()).find(n=>{const a=n.attributes||[];return a.some((v,i)=>i%2===0 && v==='id' && a[i+1]===id);});
  const descendants=[];
  const walk=n=>{if(!n)return;descendants.push(n);for(const c of n.children||[])walk(c);}; walk(frame.contentDocument);
  const host=descendants.find(n=>n.localName==='design-inspect-overlay');
  assert(host,'Frame overlay available to DevTools');
  const {nodeId}=await page.call('DOM.querySelector',{nodeId:host.shadowRoots[0].nodeId,selector:'svg'});
  const {object}=await page.call('DOM.resolveNode',{nodeId});
  return (await page.call('Runtime.callFunctionOn',{objectId:object.objectId,functionDeclaration:'function(){return this.textContent}',returnByValue:true})).result.value;
}
async function frameContext(id) {
  const {frameTree}=await page.call('Page.getFrameTree');
  const f=frameTree.childFrames.find(f=>f.frame.name===id);
  assert(f, `Missing frame ${id}`);
  return (await page.call('Page.createIsolatedWorld',{frameId:f.frame.id,worldName:'design-inspect-test'})).executionContextId;
}
const clickInside = ctx => page.eval("document.querySelector('#inside').click()",ctx);
(async () => {
  await listen(other); await listen(main);
  const extension=join(sandbox,'extension'); require('node:fs').mkdirSync(extension);
  const manifest=JSON.parse(readFileSync(join(repo,'manifest.json')));
  // Only the test copy pre-grants localhost; 127.0.0.1 stays denied.
  manifest.host_permissions=process.env.EYEDROPPER_TEST?['<all_urls>']:['http://localhost/*'];
  writeFileSync(join(extension,'manifest.json'),JSON.stringify(manifest));
  for(const file of ['background.js','geometry.js','css-values.js','layout-icons.js','spacing.js','box-model.js','inspect.js','frame-access.html','frame-access.js']) copyFileSync(join(repo,file),join(extension,file));
  require('node:fs').mkdirSync(join(extension,'fonts'));
  for(const file of ['InterVariable.woff2','LICENSE.txt'])copyFileSync(join(repo,'fonts',file),join(extension,'fonts',file));
  chrome=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${join(sandbox,'profile')}`,'--remote-debugging-port=0',`--disable-extensions-except=${extension}`,`--load-extension=${extension}`],{stdio:['ignore','ignore','pipe']});
  let stderr=''; chrome.stderr.on('data',b=>stderr+=b);
  const port=await until(()=>{try{return readFileSync(join(sandbox,'profile','DevToolsActivePort'),'utf8').split('\n')[0];}catch{return null;}},'debugging port');
  const targets=()=>fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());
  const target=await until(async()=>(await targets()).find(t=>t.type==='service_worker' && t.url.startsWith('chrome-extension://') && t.url.endsWith('/background.js')),'extension worker');
  worker=await CDP.connect(target.webSocketDebuggerUrl);
  await worker.call('Runtime.enable');
  const url=`http://localhost:${main.address().port}/`;
  const tabId=await worker.eval(`chrome.tabs.create({url:${JSON.stringify(url)}}).then(t=>t.id)`);
  const pageTarget=await until(async()=>(await targets()).find(t=>t.url===url),'test page');
  page=await CDP.connect(pageTarget.webSocketDebuggerUrl);
  await page.call('Page.enable'); await page.call('DOM.enable'); await page.call('Runtime.enable');
  await until(()=>page.eval("document.querySelectorAll('iframe').length===3 && [...document.querySelectorAll('iframe')].every(f=>f.contentWindow)"),'frames loaded');
  await worker.eval(`toggle({id:${tabId}})`);
  await until(()=>page.eval("[...document.fonts].some(font=>font.family.includes('Design Inspect Inter') && font.status==='loaded')"),'Bundled Inter loaded despite page font CSP');
  assert.equal(await control(a=>a.class==='panel','return getComputedStyle(this).fontSize'),'13px','Default panel font size');
  assert.equal(await control(a=>a.class==='panel','return getComputedStyle(this).lineHeight'),'15.6px','120 percent line height');
  assert.equal(await control(a=>a.class==='panel',"return getComputedStyle(this).fontFamily.includes('Design Inspect Inter')"),true);
  assert.equal(await control(a=>a.class==='panel',"return [...this.querySelectorAll('*')].every(node=>parseFloat(getComputedStyle(node).fontSize)>=11)"),true,'No content below 11px');
  assert.equal(await control(a=>a.class==='panel','return Math.round(this.getBoundingClientRect().width)'),340,'Minimum initial panel width');
  if(process.env.HOVER_TEST) {
    await page.eval(`{
      const style=document.createElement('style');style.textContent='#hover-target {position:fixed;left:20px;top:20px;width:120px;height:80px;background:rgb(0, 0, 0)} #hover-target:hover {background:rgb(255, 0, 0)}';document.head.append(style);
      const target=document.createElement('div');target.id='hover-target';document.body.append(target);
      for(const type of ['pointerout','pointerleave','mouseout','mouseleave'])target.addEventListener(type,()=>target.dataset[type]='left');
    }`);
    await mode('use');
    await page.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:50,y:50});
    assert.equal(await page.eval("getComputedStyle(document.querySelector('#hover-target')).backgroundColor"),'rgb(255, 0, 0)','CSS hover activates in Use');
    await mode('inspect');
    await page.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:50,y:50});
    await page.eval("document.querySelector('#hover-target').dataset.pointerout='';document.querySelector('#hover-target').dataset.pointerleave='';document.querySelector('#hover-target').dataset.mouseout='';document.querySelector('#hover-target').dataset.mouseleave=''");
    await page.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:200,y:120});
    assert.equal(await page.eval("getComputedStyle(document.querySelector('#hover-target')).backgroundColor"),'rgb(0, 0, 0)','Normal Inspect releases CSS hover');
    for(const type of ['pointerout','pointerleave','mouseout','mouseleave'])assert.equal(await page.eval(`document.querySelector('#hover-target').dataset.${type}`),'left',`Normal Inspect delivers ${type}`);
    // Exercise the pinned event path without attaching a second debugger to headless Chrome.
    await worker.eval(`send(${tabId},0,{type:'toggle-pinned-inspect',mode:'inspect',pinned:true})`);
    await page.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:50,y:50});
    await page.eval("document.querySelector('#hover-target').dataset.mouseleave=''");
    await page.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:200,y:120});
    assert.equal(await page.eval("document.querySelector('#hover-target').dataset.mouseleave"),'','Pinned Inspect suppresses hover leave');
    await mode('use');
    await page.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:50,y:50});
    await page.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:200,y:120});
    assert.equal(await page.eval("document.querySelector('#hover-target').dataset.mouseleave"),'left','Use restores hover leave events');
    console.log('PASS: ordinary Inspect releases CSS and event hover; pinned event path suppresses leave; Use restores leave');return;
  }
  if(process.env.EYEDROPPER_TEST) {
    await page.eval(`const swatch=document.createElement('div');swatch.id='pipette-target';swatch.style.cssText='position:fixed;left:20px;top:20px;width:100px;height:100px;--sample:rgb(12, 34, 56);background:var(--sample);z-index:100';document.body.append(swatch);`);
    await control(a=>'data-eyedropper' in a,'this.click()');
    assert.equal(await control(a=>'data-eyedropper' in a,"return this.getAttribute('aria-pressed')"),'true');
    await page.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:50,y:50});
    await until(async()=>(await control(a=>a.class==='eyedropper-name','return this.textContent'))==='sample','Variable identified from actual pixel');
    assert.equal(await control(a=>a.class==='eyedropper-value','return this.textContent'),'rgb(12, 34, 56)');
    assert.deepEqual((await control(a=>a.class==='eyedropper-swatch','return getComputedStyle(this).backgroundColor')).match(/\d+/g).map(Number).map((v,i)=>Math.abs(v-[12,34,56][i])<=1),[true,true,true]);
    assert.equal(await control(a=>a.class==='measurements','return this.children.length'),0,'No overlay contaminates pixel');
    await page.eval("document.querySelector('#pipette-target').style.background='linear-gradient(#ff0000,#ff0000)'");await delay(800);
    await until(async()=>(await control(a=>a.class==='eyedropper-name','return this.textContent'))==='#FF0000','Rendered gradient pixel, not DOM background variable');
    await page.call('Input.dispatchMouseEvent',{type:'mousePressed',x:50,y:50,button:'left',clickCount:1});await page.call('Input.dispatchMouseEvent',{type:'mouseReleased',x:50,y:50,button:'left',clickCount:1});
    assert.equal((await panelText()).includes('Click an element'),true,'Pipette click preserves selection');
    await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await page.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
    assert.equal(await control(a=>'data-eyedropper' in a,"return this.getAttribute('aria-pressed')"),'false');
    await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'i',code:'KeyI'});await page.call('Input.dispatchKeyEvent',{type:'keyUp',key:'i',code:'KeyI'});
    assert.equal(await control(a=>'data-eyedropper' in a,"return this.getAttribute('aria-pressed')"),'true','I activates');
    const cross=await frameContext('cross');
    await page.eval("document.body.style.cssText='margin:0;--frame-ink:#19ab47;background:var(--frame-ink)';",cross);
    const point=await page.eval("(()=>{const r=document.querySelector('#cross').getBoundingClientRect();return {x:r.left+100,y:r.top+120};})()");
    await page.call('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
    await until(async()=>(await control(a=>a.class==='eyedropper-name','return this.textContent'))==='frame-ink','Cross-origin variable sampled in shared popover').catch(async error=>{console.error('Frame sample:',await control(a=>a.class==='eyedropper-popover','return this.textContent'));throw error;});
    assert((await control(a=>a.class==='eyedropper-swatch','return getComputedStyle(this).backgroundColor')).match(/\d+/g).map(Number).every((v,i)=>Math.abs(v-[25,171,71][i])<=3));
    await worker.eval('globalThis.savedCapture=chrome.tabs.captureVisibleTab;chrome.tabs.captureVisibleTab=async()=>{throw Error("Test capture refused")};pixelCache.clear();lastCapture=0');
    await page.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:50,y:50});
    await until(async()=>(await control(a=>a.class==='eyedropper-name','return this.textContent'))==='Color unavailable','Capture errors are visible');
    assert((await control(a=>a.class==='eyedropper-value','return this.textContent')).includes('Test capture refused'));
    await worker.eval('chrome.tabs.captureVisibleTab=globalThis.savedCapture;delete globalThis.savedCapture;lastCapture=0');
    await mode('use');assert.equal(await control(a=>'data-eyedropper' in a,'return this.disabled'),true);
    assert.equal(await control(a=>a.class==='eyedropper-popover','return this.hidden'),true);
    await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'i',code:'KeyI'});await page.call('Input.dispatchKeyEvent',{type:'keyUp',key:'i',code:'KeyI'});
    assert.equal(await control(a=>'data-eyedropper' in a,"return this.getAttribute('aria-pressed')"),'false','Use cannot activate pipette');
    await mode('inspect');assert.equal(await control(a=>'data-eyedropper' in a,"return this.getAttribute('aria-pressed')"),'false','Inspect starts with pipette off');
    if(process.env.SCREENSHOT_PATH){await control(a=>'data-eyedropper' in a,'this.click()');await page.call('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await until(async()=>(await control(a=>a.class==='eyedropper-name','return this.textContent'))==='frame-ink','Screenshot popover content');await worker.eval('for(const item of pixelCache.values())item.time=Date.now()+10000');await until(async()=>await control(a=>a.class==='eyedropper-popover','return !this.hidden'),'Visible popover');const screenshot=await page.call('Page.captureScreenshot');writeFileSync(process.env.SCREENSHOT_PATH,Buffer.from(screenshot.data,'base64'));}
    await worker.eval(`toggle({id:${tabId}})`);await until(()=>page.eval("!document.querySelector('design-inspect-overlay')"),'Pipette cleanup');
    console.log('PASS: actual screenshot pixels, CSS variables, gradients, cross-origin iframe coordinates, I/Escape, Inspect-only, selection preserved, cleanup');return;
  }
  const same=await frameContext('same'), cross=await frameContext('cross');
  await until(()=>page.eval("!!document.querySelector('design-inspect-overlay')",same),'same-origin inspector');
  await until(()=>page.eval("!!document.querySelector('design-inspect-overlay')",cross),'cross-origin inspector');
  assert.equal(await page.eval("document.querySelector('#cross').contentDocument===null"),true,'Fixture must be cross-origin');
  assert.equal((await nodes()).filter(n=>n.attributes?.includes('panel')).length,1,'One panel across accessible frames');
  await until(async()=>(await control(a=>a.class==='frame-access','return !this.hidden;')),'permission button for denied domain');
  await control(a=>a.class==='frame-access','this.click();');
  const accessTarget=await until(async()=>(await targets()).find(t=>t.url.includes('/frame-access.html?tab=')),'permission page');
  const access=await CDP.connect(accessTarget.webSocketDebuggerUrl);
  try {
    await until(()=>access.eval("document.querySelector('#grant')?.disabled === false"),'permission list loaded');
    assert.equal(await access.eval("document.querySelector('#origins').textContent"),'http://127.0.0.1/*','Only the missing frame domain is requested');
    await access.call('Page.close');
  } finally {access.close();}
  // Keep a deterministic pair of rectangles clear of the floating panel.
  await page.eval(`{
    const scene=document.createElement('div');scene.id='measure-scene';scene.style.cssText='position:fixed;inset:0;background:#f4f5f8;z-index:1000000';
    for(const [id,css] of [['measure-a','left:60px;top:160px;width:120px;height:60px'],['measure-b','left:300px;top:310px;width:140px;height:80px']]) {
      const box=document.createElement('div');box.id=id;box.textContent=id==='measure-a'?'Selected':'Compare';box.style.cssText='position:absolute;box-sizing:border-box;border:1px solid #c3c9d3;border-radius:8px;background:white;color:#404858;padding:16px;font:14px system-ui;'+css;scene.append(box);
    }document.body.append(scene);document.querySelector('#measure-a').click();document.querySelector('#measure-b').dispatchEvent(new MouseEvent('pointermove',{bubbles:true,altKey:true}));
  }`);
  const overlay = expression => control(a=>a.class==='panel',`const svg=this.getRootNode().querySelector('svg');${expression}`);
  const axes = () => overlay("return [...svg.querySelectorAll('.measure-axis')].map(n=>n.dataset.axis)");
  await page.eval(`{
    const fixture=document.createElement('div');fixture.id='spacing-fixture';fixture.style.cssText='position:absolute;left:20px;top:30px;width:300px;height:120px;box-sizing:border-box;padding:20px;margin:14px;border:2px solid #777;display:flex;gap:24px;background:white';
    for(let i=0;i<2;i++){const child=document.createElement('div');child.style.cssText='flex:none;width:60px;height:50px;background:#d9dce3';fixture.append(child);}
    document.querySelector('#measure-scene').append(fixture);fixture.click();
  }`);
  await until(async()=>(await overlay("return ['margin','padding','gap'].every(kind=>svg.querySelector('.spacing-'+kind))")),'Margin, padding and flex-gap areas');
  assert.equal(await control(a=>a.class==='panel',"return this.querySelector('[data-group=Layout] dt').textContent"),'gap','Nonzero gap first in Layout');
  assert.equal(await overlay("return svg.querySelector('.spacing-gap').getBBox().width"),24,'Only declared flex gap is painted');
  for(const [kind,expected] of [['margin','rgb(237, 189, 128)'],['padding','rgb(162, 213, 180)'],['gap','rgb(165, 140, 255)']]) {
    assert.equal(await overlay(`return getComputedStyle(svg.querySelector('.spacing-${kind}')).fill`),expected,`${kind} overlay palette`);
    const panelColor=kind==='gap' ? "return getComputedStyle(this.querySelector('dt[data-spacing=gap]')).color" : `return getComputedStyle(this.querySelector('.box-${kind}')).color`;
    assert.equal(await control(a=>a.class==='panel',panelColor),kind==='gap'?'rgb(185, 170, 255)':expected,`${kind} panel color`);
  }
  if(process.env.SPACING_SCREENSHOT_PATH) {
    const shot=await page.call('Page.captureScreenshot',{format:'png',clip:{x:10,y:10,width:350,height:200,scale:1}});
    writeFileSync(process.env.SPACING_SCREENSHOT_PATH,Buffer.from(shot.data,'base64'));
  }
  await mode('use');await until(async()=>(await overlay("return svg.querySelectorAll('[class^=spacing-]').length"))===0,'Use hides spacing fills');
  await mode('inspect');
  await page.eval("document.querySelector('#spacing-fixture').style.display='grid';document.querySelector('#spacing-fixture').style.gridTemplateColumns='60px 60px'");
  await until(async()=>(await overlay("return svg.querySelector('.spacing-gap')?.getBBox().height"))===76,'Grid gap spans content tracks');
  await page.eval("document.querySelector('#spacing-fixture').remove();document.querySelector('#measure-a').click();document.querySelector('#measure-b').dispatchEvent(new MouseEvent('pointermove',{bubbles:true,altKey:true}))");
  await until(async()=>(await axes()).length===2,'two nonzero measurement axes');
  assert.equal(await overlay("return getComputedStyle(svg.querySelector('.measure-label')).fill"),'rgb(0, 0, 0)','Black text on label backing');
  assert.equal(await overlay("return getComputedStyle(svg.querySelector('.measure-label-bg')).fill"),'rgb(255, 106, 0)','Orange label backing');
  assert.equal(await overlay("return getComputedStyle(svg.querySelector('.measure-label')).stroke"),'none','No text outline');
  assert.equal(await overlay("return getComputedStyle(svg.querySelector('.measure-label')).fontWeight"),'400','Regular-weight label text');
  assert.equal(await overlay("return getComputedStyle(svg.querySelector('.measure-axis')).strokeWidth"),'1px','Thin measurement lines');
  assert.equal(await overlay("return svg.querySelectorAll('.measure-label-bg').length"),2,'Label backings on low-contrast light background');
  assert.equal(await overlay("return svg.querySelectorAll('.measure-halo').length"),0,'No line casings');
  await page.eval("document.querySelector('#measure-scene').style.background='#101010'");
  await until(async()=>(await overlay("return svg.querySelectorAll('.measure-label-bg').length"))===2,'Label backings remain on dark background');
  assert.equal(await overlay("return getComputedStyle(svg.querySelector('.measure-label')).fill"),'rgb(0, 0, 0)','Label text always black');
  await page.eval("document.querySelector('#measure-scene').style.background='#404040'");
  await until(async()=>(await overlay("return svg.querySelectorAll('.measure-label-bg').length"))===2,'Label backing on medium-dark background');
  assert.equal(await overlay("return svg.querySelectorAll('.measure-halo').length"),0,'Lines stay unoutlined when label backings appear');
  await page.eval("document.querySelector('#measure-scene').style.background='linear-gradient(#101010,#101010)'");
  await until(async()=>(await overlay("return svg.querySelectorAll('.measure-label-bg').length"))===2,'Unknown gradient background uses label backing');
  await page.eval("document.querySelector('#measure-scene').style.background='#ff6a00'");
  await until(async()=>(await overlay("return svg.querySelectorAll('.measure-label-bg').length"))===2,'Label backing when background matches orange');
  await page.eval("document.querySelector('#measure-scene').style.background='#f4f5f8'");
  await new Promise(resolve=>setTimeout(resolve,150));
  await page.eval("window.originalMeasureStyles=['measure-a','measure-b'].map(id=>document.getElementById(id).style.cssText);Object.assign(document.querySelector('#measure-a').style,{width:'2px',height:'2px',padding:'0',border:'0'});Object.assign(document.querySelector('#measure-b').style,{left:'64px',top:'164px',width:'2px',height:'2px',padding:'0',border:'0'})");
  await until(async()=>await overlay("const boxes=[...svg.querySelectorAll('.measure-label-bg')].map(n=>n.getBBox());if(boxes.length!==2)return false;const [a,b]=boxes;return a.x+a.width+4<=b.x || b.x+b.width+4<=a.x || a.y+a.height+4<=b.y || b.y+b.height+4<=a.y;"),'Nearby measurement badges separated');
  await page.eval("['measure-a','measure-b'].forEach((id,i)=>document.getElementById(id).style.cssText=window.originalMeasureStyles[i])");
  await until(async()=>await overlay("return svg.querySelector('[data-axis=x]')?.getAttribute('d').startsWith('M 180 190 L 300 190')"),'Original geometry restored');
  const horizontal=await overlay("return svg.querySelector('[data-axis=x]').getAttribute('d')");
  assert(horizontal.startsWith('M 180 190 L 300 190'),'Horizontal line starts at selected right-edge midpoint');
  const guides=await overlay("return [...svg.querySelectorAll('.measure-line.measure-guide')].map(n=>n.getAttribute('d'))");
  assert.equal(guides.length,2,'Perpendicular dashed connectors for both axes');
  assert(guides.includes('M 300 190 L 300 350'),'Dashed connector reaches target edge midpoint');
  if(process.env.MEASUREMENT_SCREENSHOT_PATH) {
    const shot=await page.call('Page.captureScreenshot',{format:'png',clip:{x:30,y:130,width:415,height:300,scale:1}});
    writeFileSync(process.env.MEASUREMENT_SCREENSHOT_PATH,Buffer.from(shot.data,'base64'));
  }
  await page.eval("document.querySelector('#measure-b').style.top='160px'");
  await until(async()=>(await axes()).length===1,'Aligned vertical axis is hidden');
  assert.equal(await overlay("return svg.querySelector('.measure-label').textContent"),'120px');
  await page.eval("document.querySelector('#measure-b').style.cssText=document.querySelector('#measure-a').style.cssText");
  await until(async()=>(await axes()).length===0,'Coincident rectangles have no lines or zero labels');
  await page.eval("document.querySelector('#measure-scene').remove()");
  await clickInside(cross);
  await until(async()=>(await panelText()).includes('frame-space'),'remote CSS in top panel');
  assert.equal(await control(a=>a.class==='panel',"return !!this.querySelector('.frame-name')"),false,'Frame name omitted from panel');
  await page.eval("document.querySelector('#inside').setAttribute('data-size','s');document.querySelector('#inside').className='very-long-class-name-'.repeat(15)",cross);
  await until(async()=>await control(a=>a.class==='name','return this.scrollWidth>this.clientWidth'),'Selected name truncated to one line');
  await control(a=>a.class==='element-info icon-button','this.click()');
  assert.equal(await control(a=>a.class==='element-details','return this.hidden'),false,'Attribute panel opens');
  assert((await control(a=>a.class==='element-details','return this.textContent')).includes('data-size="s"'),'All DOM attributes available');
  await control(a=>a.class==='element-tree-toggle icon-button','this.click()');
  assert.equal(await control(a=>a.class==='element-details','return this.hidden'),true);
  await control(a=>a['data-relation']==='parent','this.click()');
  await until(async()=>(await control(a=>a.class==='name','return this.textContent'))==='div#card','Hierarchy parent routed to selected iframe');
  await control(a=>a.class==='element-tree-toggle icon-button','this.click()');
  assert.equal(await control(a=>a.class==='element-tree',"return this.querySelectorAll('[data-relation=child]').length"),2,'All immediate children in hierarchy');
  await control(a=>a['data-relation']==='child','this.click()');
  await until(async()=>(await control(a=>a.class==='name','return this.textContent')).startsWith('button#inside'),'Hierarchy child selection');
  await page.eval("document.querySelector('#inside').removeAttribute('class')",cross);
  const headerBefore=await control(a=>a.class==='panel',"return [this.querySelector('header'),this.querySelector('.selection-header'),this.querySelector('.identity-row')].map(n=>n.getBoundingClientRect().top)");
  await control(a=>a.class==='content','this.scrollTop=this.scrollHeight');
  assert.deepEqual(await control(a=>a.class==='panel',"return [this.querySelector('header'),this.querySelector('.selection-header'),this.querySelector('.identity-row')].map(n=>n.getBoundingClientRect().top)"),headerBefore,'Header and selected name fixed while properties scroll');
  assert.equal(await control(a=>a.class==='panel','return this.scrollTop'),0,'Panel itself does not scroll');
  await control(a=>a.class==='content','this.scrollTop=0');
  const resizeBefore=await control(a=>a.class==='panel','const r=this.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,width:r.width};');
  await page.call('Input.dispatchMouseEvent',{type:'mousePressed',x:resizeBefore.left,y:resizeBefore.top+60,button:'left',clickCount:1});
  await page.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:resizeBefore.left-40,y:resizeBefore.top+60,button:'left',buttons:1});
  await page.call('Input.dispatchMouseEvent',{type:'mouseReleased',x:resizeBefore.left-40,y:resizeBefore.top+60,button:'left',clickCount:1});
  assert.equal(await control(a=>a.class==='panel','return Math.round(this.getBoundingClientRect().width)'),380,'Horizontal resize handle expands panel');
  const heightBefore=await control(a=>a.class==='panel','return this.getBoundingClientRect().height');
  await control(a=>a['data-edge']==='bottom',"this.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}))");
  assert.equal(await control(a=>a.class==='panel','return this.getBoundingClientRect().height'),heightBefore-16,'Bottom handle reduces height with keyboard');
  await control(a=>a['data-edge']==='top',"this.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))");
  assert.equal(await control(a=>a.class==='panel','return this.getBoundingClientRect().height'),heightBefore-32,'Top handle reduces height with keyboard');
  await control(a=>a.class==='panel',"this.style.height='auto'");
  await control(a=>a.class==='panel',"this.style.width='420px';this.style.left='auto';this.style.right='16px'");
  assert.equal(await control(a=>a.class==='size-table',"return this.querySelectorAll('tr').length"),2,'Frame dimensions in combined shared table');
  assert.equal(await control(a=>a.class==='box-model',"return this.querySelectorAll('.box-value').length"),12,'All box model sides in shared panel');
  assert.equal(await control(a=>a.class==='box-model',"return this.querySelectorAll('.radius-marker').length"),3,'Frame corner radii in shared panel');
  assert.equal(await control(a=>a.class==='box-model',"return [...this.querySelectorAll('.box-source-label')].filter(n=>n.textContent==='Padding').length"),1,'Repeated variable grouped into one source row');
  assert.equal(await control(a=>a.class==='box-model',"return this.querySelector('.value-descriptions').hidden"),true,'Remote computed values start collapsed');
  await control(a=>a.class==='box-model',"this.querySelector('.value-toggle').click()");
  assert.equal(await control(a=>a.class==='box-model',"return this.querySelector('.value-descriptions').hidden"),false,'Eye reveals remote variable values');
  if(process.env.SCREENSHOT_PATH) {
    const clip=await control(a=>a.class==='panel',"const r=this.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};");
    const shot=await page.call('Page.captureScreenshot',{format:'png',clip});
    writeFileSync(process.env.SCREENSHOT_PATH,Buffer.from(shot.data,'base64'));
  }
  await control(a=>a.class==='unit-select',"this.value='rem';this.dispatchEvent(new Event('change',{bubbles:true,composed:true}));");
  await until(async()=>(await panelText()).includes('1.5rem'),'Frame-local rem base');
  assert.equal(await control(a=>a.class==='box-model',"return this.querySelector('.value-descriptions').hidden"),false,'Remote reveal persists after unit update');
  async function enter(modifiers=0) {
    await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,modifiers});
    await page.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,modifiers});
  }
  await enter(8);
  await until(async()=>(await panelText()).includes('div#card'),'Shift+Enter routed to selected frame');
  await enter();
  await until(async()=>(await panelText()).includes('2 elements selected'),'Enter selects frame children');
  await clickInside(cross);
  await until(async()=>(await panelText()).includes('button#inside'),'Click selects a single child');
  const targetPoint=await page.eval("(()=>{const r=document.querySelector('span').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()",cross);
  const framePoint=await page.eval("(()=>{const f=document.querySelector('#cross'),r=f.getBoundingClientRect();return {x:r.left+f.clientLeft,y:r.top+f.clientTop};})()");
  await page.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:framePoint.x+targetPoint.x,y:framePoint.y+targetPoint.y});
  await page.eval("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Alt',altKey:true,bubbles:true}))");
  await until(async()=>(await frameMeasurements('cross')).includes('rem'),'Alt measurement with keyboard focus in another frame');
  await page.eval("window.dispatchEvent(new KeyboardEvent('keyup',{key:'Alt',altKey:false,bubbles:true}))");
  await until(async()=>(await frameMeasurements('cross'))==='','Alt release clears frame measurement');
  await mode('use');
  await until(()=>page.eval("document.querySelector('#inside').click();returnValue=document.querySelector('#dropdown').hidden;returnValue===false",cross),'Use allows frame interactions');
  await page.eval("document.querySelector('#inside').focus()",cross);
  await mode('inspect');
  await delay(100);
  assert.equal(await page.eval("document.querySelector('#dropdown').hidden",cross),false,'Dropdown survives switch from top panel');
  assert.equal(await page.eval("document.activeElement.id",cross),'inside','Frame focus survives switch');
  await clickInside(cross); await delay(100);
  assert.equal(await page.eval("document.querySelector('#dropdown').hidden",cross),false,'Inspect blocks frame clicks');
  // New frames inherit settings and appear without toggling the extension.
  await page.eval("const f=document.createElement('iframe');f.id='dynamic';f.name='dynamic';f.src='/frame';document.body.append(f)");
  const dynamic=await until(async()=>{try{return await frameContext('dynamic');}catch{return null;}},'dynamic frame');
  await until(()=>page.eval("!!document.querySelector('design-inspect-overlay')",dynamic),'dynamic frame inspector');
  await clickInside(dynamic);
  await until(async()=>(await panelText()).includes('frame-space'),'dynamic frame selection');
  await page.eval("document.querySelector('#dynamic').remove()");
  await until(async()=>(await panelText()).includes('Click an element'),'removed frame clears remote selection');
  await worker.eval(`toggle({id:${tabId}})`);
  await until(()=>page.eval("!document.querySelector('design-inspect-overlay')"),'Main-page cleanup');
  await until(()=>page.eval("!document.querySelector('design-inspect-overlay')",same),'Same-origin frame cleanup');
  await until(()=>page.eval("!document.querySelector('design-inspect-overlay')",cross),'Cross-origin frame cleanup after pending attachment');
  console.log('PASS: thin midpoint measurements, persistent separated orange badges, dashed guides, zero suppression, same/cross-origin frames, shared panel, permissions, variables/rem, shortcuts, mode sync, dropdown focus, dynamic frames, cleanup');
})().catch(error=>{console.error(error);if(page?.errors.length)console.error(page.errors.join('\n'));process.exitCode=1;}).finally(async()=>{
  page?.close(); worker?.close();
  if(chrome && chrome.exitCode===null) {chrome.kill('SIGTERM'); await Promise.race([new Promise(r=>chrome.once('exit',r)),delay(2000)]); if(chrome.exitCode===null) chrome.kill('SIGKILL');}
  for(const socket of sockets) socket.destroy(); main.close(); other.close();
  rmSync(sandbox,{recursive:true,force:true});
});

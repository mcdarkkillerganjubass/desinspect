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
  call(method, params = {}) {const id=++this.id; return new Promise((resolve,reject) => {const timeout=setTimeout(()=>{this.pending.delete(id);reject(Error(`CDP timeout: ${method}`));},10000);this.pending.set(id,{resolve:value=>{clearTimeout(timeout);resolve(value);},reject:error=>{clearTimeout(timeout);reject(error);}});this.socket.send(JSON.stringify({id,method,params}));});}
  async eval(expression, contextId) {const r=await this.call('Runtime.evaluate',{expression,contextId,awaitPromise:true,returnByValue:true,userGesture:true}); if(r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value;}
  close() {this.socket.close();}
}
const sandbox = mkdtempSync(join(tmpdir(),'design-inspect-test-'));
let chrome, page, worker;
const sockets = new Set();
const makeServer = () => {
  const server = createServer((req,res) => {
    const pathname=new URL(req.url,'http://localhost').pathname;
    const fixtureFiles=['design-tokens.js','figma-icons.js','geometry.js','css-values.js','layout-icons.js','spacing.js','box-model.js','inspect.js'];
    if(pathname==='/browser.html'||fixtureFiles.some(file=>pathname==='/'+file)||['/fonts/InterVariable.woff2','/fonts/GoogleSansCode.ttf'].includes(pathname)){
      const file=pathname==='/browser.html'?'tests/browser.html':pathname.slice(1);
      res.setHeader('Content-Type',pathname.endsWith('.js')?'application/javascript':pathname.endsWith('.html')?'text/html':'application/octet-stream');res.end(readFileSync(join(repo,file)));return;
    }
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
async function clickNoteMenu(label) {
  const rect=await control(a=>a.class?.split(' ').includes('review-note-menu'),`const b=[...this.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(label)}),r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};`);
  await page.call('Input.dispatchMouseEvent',{type:'mousePressed',...rect,button:'left',clickCount:1});
  await page.call('Input.dispatchMouseEvent',{type:'mouseReleased',...rect,button:'left',clickCount:1});
}
async function mode(next) {
  const rect=await control(a=>a['data-mode']===next,'const r=this.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};');
  await page.call('Input.dispatchMouseEvent',{type:'mousePressed',...rect,button:'left',clickCount:1});
  await page.call('Input.dispatchMouseEvent',{type:'mouseReleased',...rect,button:'left',clickCount:1});
}
async function panelText() {return control(a=>a.class==='panel',"return this.querySelector('.selection-header').textContent+this.querySelector('.content').textContent+[...this.querySelectorAll('.box-var')].map(b=>b.getAttribute('aria-label')).join(' ')+this.getRootNode().querySelector('#box-variable-tooltip').textContent;");}
async function frameMeasurements(id) {
  const frame=(await nodes()).find(n=>{const a=n.attributes||[];return a.some((v,i)=>i%2===0 && v==='id' && a[i+1]===id);});
  const descendants=[];
  const walk=n=>{if(!n)return;descendants.push(n);for(const c of n.children||[])walk(c);}; walk(frame.contentDocument);
  const host=descendants.find(n=>n.localName==='design-inspect-overlay');
  assert(host,'Frame overlay available to DevTools');
  const {nodeId}=await page.call('DOM.querySelector',{nodeId:host.shadowRoots[0].nodeId,selector:'svg'});
  const {object}=await page.call('DOM.resolveNode',{nodeId});
  return (await page.call('Runtime.callFunctionOn',{objectId:object.objectId,functionDeclaration:"function(){return [...this.querySelectorAll('.measure-label')].map(n=>n.textContent).join(' ')}",returnByValue:true})).result.value;
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
  for(const file of ['background.js','design-tokens.js','figma-icons.js','geometry.js','css-values.js','layout-icons.js','spacing.js','box-model.js','review.js','review-overrides.js','review-panel.js','inspect.js']) copyFileSync(join(repo,file),join(extension,file));
  require('node:fs').cpSync(join(repo,'assets','icons'),join(extension,'assets','icons'),{recursive:true});
  require('node:fs').mkdirSync(join(extension,'assets','fix-notes'),{recursive:true});
  for(const file of ['copyAll','record','pencil','complete','copy','more','folder','delete','edit'])copyFileSync(join(repo,'assets','fix-notes',file+'.svg'),join(extension,'assets','fix-notes',file+'.svg'));
  require('node:fs').mkdirSync(join(extension,'fonts'));
  for(const file of ['InterVariable.woff2','LICENSE.txt','GoogleSansCode.ttf','GoogleSansCode-OFL.txt','ZillaSlab-Medium.ttf','ZillaSlab-OFL.txt'])copyFileSync(join(repo,'fonts',file),join(extension,'fonts',file));
  chrome=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${join(sandbox,'profile')}`,'--remote-debugging-port=0',`--disable-extensions-except=${extension}`,`--load-extension=${extension}`],{stdio:['ignore','ignore','pipe']});
  let stderr=''; chrome.stderr.on('data',b=>stderr+=b);
  const port=await until(()=>{try{return readFileSync(join(sandbox,'profile','DevToolsActivePort'),'utf8').split('\n')[0];}catch{return null;}},'debugging port');
  const targets=()=>fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());
  const target=await until(async()=>(await targets()).find(t=>t.type==='service_worker' && t.url.startsWith('chrome-extension://') && t.url.endsWith('/background.js')),'extension worker');
  worker=await CDP.connect(target.webSocketDebuggerUrl);
  await worker.call('Runtime.enable');
  const url=`http://localhost:${main.address().port}/${process.env.BROWSER_TEST?'browser.html':''}`;
  const tabId=await worker.eval(`chrome.tabs.create({url:${JSON.stringify(url)}}).then(t=>t.id)`);
  const pageTarget=await until(async()=>(await targets()).find(t=>t.url===url),'test page');
  page=await CDP.connect(pageTarget.webSocketDebuggerUrl);
  await page.call('Page.enable'); await page.call('DOM.enable'); await page.call('Runtime.enable');
  if(process.env.BROWSER_TEST){
    await until(()=>page.eval("['pass','fail'].includes(document.body.dataset.result)"),'Standalone browser checks');
    const result=await page.eval("({status:document.body.dataset.result,text:document.querySelector('#result').textContent})");
    assert.equal(result.status,'pass',result.text);console.log(result.text);return;
  }
  await until(()=>page.eval("document.querySelectorAll('iframe').length===3 && [...document.querySelectorAll('iframe')].every(f=>f.contentWindow)"),'frames loaded');
  await worker.eval(`toggle({id:${tabId}})`);
  await until(()=>page.eval("[...document.fonts].some(font=>font.family.includes('Design Inspect Inter') && font.status==='loaded')"),'Bundled Inter loaded despite page font CSP');
  assert.equal(await control(a=>a.class==='panel',"const s=getComputedStyle(this);return Math.round(this.getBoundingClientRect().width)===Math.min(parseFloat(s.getPropertyValue('--di-size-panel-min-width')),innerWidth-parseFloat(s.getPropertyValue('--di-size-panel-viewport-clearance')));"),true,'Panel opens at minimum width');
  assert.equal(await control(a=>a.class==='panel',"const s=getComputedStyle(this),clearance=parseFloat(s.getPropertyValue('--di-size-panel-viewport-clearance')),minimum=parseFloat(s.getPropertyValue('--di-size-panel-min-height'));return Math.abs(this.getBoundingClientRect().height-Math.min(innerHeight-clearance,Math.max(minimum,innerHeight*.3)))<1;"),true,'Panel opens at 30 percent viewport height within size limits');
  assert.equal(await control(a=>a.class==='panel','return getComputedStyle(this).fontSize'),'13px','Default panel font size');
  assert.equal(await control(a=>a.class==='panel','return getComputedStyle(this).lineHeight'),'15.6px','120 percent line height');
  assert.equal(await control(a=>a.class==='panel',"return getComputedStyle(this).fontFamily.includes('Design Inspect Inter')"),true);
  assert.equal(await control(a=>a.class==='panel',"return [...this.querySelectorAll('*')].every(node=>parseFloat(getComputedStyle(node).fontSize)>=11)"),true,'No content below 11px');
  if(process.env.NOTES_TEST) {
    const review=()=>worker.eval(`reviewStore.run(${tabId},'get')`);
    const copyText=async()=>{const result=await worker.eval(`chrome.scripting.executeScript({target:{tabId:${tabId}},func:()=>globalThis.__notesCopied})`);return result[0].result;};
    const ui=expression=>control(a=>a.class==='panel',expression);
    const shot=async name=>{
      if(!process.env.NOTES_SCREENSHOT_DIR)return;
      const clip=await ui("const r=this.querySelector('.reviews').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:2};");
      const result=await page.call('Page.captureScreenshot',{format:'png',clip});writeFileSync(join(process.env.NOTES_SCREENSHOT_DIR,name+'.png'),Buffer.from(result.data,'base64'));
    };
    const editColor=async color=>{
      await page.eval("document.querySelector('#main').click()");
      await until(()=>ui("return !!this.querySelector('[data-edit-property=color]')"),'Color value ready');
      await control(a=>a['data-edit-property']==='color','this.click()');
      await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),'return !this.hidden'),'Editor ready');
      await control(a=>a.class?.split(' ').includes('review-editor'),`this.querySelector('input').value=${JSON.stringify(color)};this.requestSubmit()`);
      await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),"return this.hidden || !!this.querySelector('[role=alert]').textContent"),'Edit saved');
      assert(await control(a=>a.class?.split(' ').includes('review-editor'),'return this.hidden'),'Color edit succeeds');
    };
    await page.call('Emulation.setDeviceMetricsOverride',{width:800,height:1400,deviceScaleFactor:1,mobile:false});
    await ui("this.style.height='1271px';this.style.width='375px'");
    await until(()=>ui("return !!this.querySelector('.review-notes-empty')"),'Designed empty state');
    assert.equal(await ui("return this.lastElementChild.classList.contains('reviews')"),true,'Notes fixed at panel bottom');
    assert(await ui("const s=getComputedStyle(this.querySelector('.reviews'));return s.borderTopLeftRadius==='12px'&&s.borderTopRightRadius==='12px'"),'Fix notes top radii are 12px');
    assert.equal(await ui("return this.querySelector('.review-notes-title').textContent"),'Fix notes');
    assert.equal(await ui("return !!this.querySelector('.review-copy-all,.review-new')"),false,'Empty state omits actions');
    await ui("this.querySelector('[data-theme-choice=light]').click()");
    await until(()=>page.eval("[...document.fonts].some(f=>f.family==='Design Inspect Notes Heading'&&f.status==='loaded')"),'Notes heading font loaded');
    assert(await ui("const t=this.querySelector('.review-notes-title'),s=getComputedStyle(t);return s.paddingLeft==='0px'&&s.paddingTop==='0px'"),'Notes title does not inherit property-heading padding');
    await shot('empty');
    await worker.eval(`chrome.scripting.executeScript({target:{tabId:${tabId}},func:()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{globalThis.__notesCopied=text;}}});}})`);
    await editColor('red');
    let state=await review(),first=state.document.id;
    await until(()=>ui("return [...this.querySelectorAll('.review-note-asset img')].every(img=>img.complete&&img.naturalWidth>0)"),'Packaged Figma icons loaded');
    assert.equal(await ui("return this.querySelector('.review-note-count').textContent"),'1','Combined edit count');
    assert.equal(await ui("return this.querySelector('.review-card .review-note-asset').dataset.asset"),'record','Active note recording dot');
    assert.match(await ui("return this.querySelector('.review-note-meta>span').textContent"),/^\d{2}\/\d{2}$/,'Date omits year');
    assert.match(await ui("return this.querySelector('.review-note-time time').textContent"),/^\d{2}:\d{2}:\d{2}$/);
    for(const theme of ['light','dark']){
      await ui(`this.querySelector('[data-theme-choice=${theme}]').click()`);
      assert(await ui("const ref=getComputedStyle(this.querySelector('.settings-button'));return [...this.querySelectorAll('.header-button')].every(b=>{const s=getComputedStyle(b);return s.backgroundColor===ref.backgroundColor&&s.color===ref.color})"),'Delete, Copy all and Start new reuse header colors in '+theme);
      assert(await ui("const buttons=[this.querySelector('.settings-button'),...this.querySelectorAll('.header-button')];for(const b of buttons)b.dataset.pointerPressed='true';const ref=getComputedStyle(buttons[0]),expected=ref.backgroundColor;const same=buttons.every(b=>getComputedStyle(b).backgroundColor===expected);for(const b of buttons)delete b.dataset.pointerPressed;return same"),'Secondary buttons reuse header pressed state in '+theme);
    }
    const changedAt=state.document.updatedAt,expected=(await worker.eval(`reviewStore.run(${tabId},'export',{id:${JSON.stringify(first)}})`)).markdown;
    await control(a=>a.class?.split(' ').includes('review-copy'),'this.click()');
    await until(async()=>(await copyText())===expected,'Copy note Markdown');
    await until(()=>ui("const hint=this.getRootNode().querySelector('.copy-feedback');return hint.textContent==='Fixes copied'&&!hint.hidden"),'Copy success tooltip');
    assert(await ui("const b=this.querySelector('.review-copy').getBoundingClientRect(),h=this.getRootNode().querySelector('.copy-feedback').getBoundingClientRect();return h.bottom<=b.top"),'Copy tooltip appears above button');
    assert.equal((await review()).document.updatedAt,changedAt,'Copy does not alter edit time');
    await control(a=>a.class?.includes('review-new'),'this.click()');
    await until(async()=>(await review()).document?.id!==first,'Start new note');
    state=await review();const second=state.document.id;assert.equal(state.document.records.length,0);assert(state.completed.some(d=>d.id===first));
    assert.equal(await page.eval("getComputedStyle(document.querySelector('#main')).color"),'rgb(0, 0, 0)','New note clears old live preview');
    await editColor('blue');
    await control(a=>a.class?.includes('review-complete'),'this.click()');
    await until(async()=>(await review()).completed.some(d=>d.id===second),'Complete recording');
    assert.equal(await ui("return !!this.querySelector('.review-new,.review-complete,.review-compare')"),false,'Completed notes have no recording controls');
    assert.equal(await ui("return this.querySelector('.review-card .review-note-asset').dataset.asset"),'folder','Completed folder icon');
    await editColor('green');const third=(await review()).document.id;assert.notEqual(third,second,'First subsequent edit starts a note automatically');
    await control(a=>a.class?.includes('review-more'),'this.click()');
    for(const theme of ['dark','light']) {
      await ui(`this.querySelector('[data-theme-choice=${theme}]').click()`);
      assert(await ui("const root=this.getRootNode(),menu=root.querySelector('.review-note-menu'),settings=this.querySelector('.settings-menu'),a=getComputedStyle(menu),b=getComputedStyle(settings);return ['color','backgroundColor','borderRadius','borderColor','boxShadow'].every(p=>a[p]===b[p])&&getComputedStyle(menu.querySelector('button')).color===a.color"),'Note dropdown matches unit/theme surface and text in '+theme);
      assert(await ui("const a=getComputedStyle(this.querySelector('.review-editor')),b=getComputedStyle(this.querySelector('.settings-menu'));return ['color','backgroundColor','borderRadius','borderColor','boxShadow'].every(p=>a[p]===b[p])"),'Value dropdown matches unit/theme surface in '+theme);
    }
    await control(a=>a.class?.includes('review-more'),'this.click()');
    assert.deepEqual(await control(a=>a.class?.split(' ').includes('review-note-menu'),"return [...this.querySelectorAll('button')].map(b=>b.textContent)"),['Download','Delete']);
    await clickNoteMenu('Delete');
    await until(async()=>!(await review()).document,'Delete active note');assert(!(await review()).completed.some(d=>d.id===third));
    await editColor('purple');assert.notEqual((await review()).document.id,third,'Editing after deletion starts a new note');
    const expectedAll=(await worker.eval(`reviewStore.run(${tabId},'export-all')`)).markdown;
    await control(a=>a.class?.includes('review-copy-all'),'this.click()');
    await until(async()=>(await copyText())===expectedAll,'Copy all in latest-first order');
    assert(expectedAll.indexOf('purple')<expectedAll.indexOf('blue'));
    await shot('active');
    // Seed additional completed notes through the same persisted model for overflow checks.
    const record=(await review()).document.records[0];
    for(let i=0;i<6;i++){
      await worker.eval(`reviewStore.run(${tabId},'new')`);
      await worker.eval(`reviewStore.run(${tabId},'change',${JSON.stringify({kind:'comment',context:record.context,elementId:record.elementId,identity:record.identity,comment:'Overflow note '+i})})`);
    }
    await worker.eval(`toggle({id:${tabId}})`);await worker.eval(`toggle({id:${tabId}})`);
    await ui("this.style.height='1271px';this.style.width='375px'");
    await until(()=>ui("return this.querySelectorAll('.review-card').length>=8"),'Overflow note list');
    await until(()=>ui("return [...this.querySelectorAll('.review-note-asset img')].every(img=>img.complete&&img.naturalWidth>0)"),'Overflow icons loaded');
    assert(await ui("const n=this.querySelector('.reviews'),l=this.querySelector('.review-notes-list');return n.getBoundingClientRect().height<=this.getBoundingClientRect().height*.3+1 && l.scrollHeight>l.clientHeight"),'Entire notes section capped at 30 percent');
    const headerTop=await ui("return this.querySelector('.review-notes-header').getBoundingClientRect().top");
    await ui("this.querySelector('.review-notes-list').scrollTop=1000");
    assert.equal(await ui("return this.querySelector('.review-notes-header').getBoundingClientRect().top"),headerTop,'Header does not scroll');
    await ui("this.querySelector('.review-notes-list').scrollTop=0");await shot('overflow');
    await control(a=>a.class?.includes('review-complete'),'this.click()');
    await until(()=>ui("return !this.querySelector('[data-status=recording]')"),'All notes completed');await shot('completed');
    await ui("this.style.height='400px'");
    await until(()=>ui("return this.querySelector('.reviews').getBoundingClientRect().height<=this.getBoundingClientRect().height*.3+1"),'Height cap follows panel resize');
    console.log('PASS: Figma note assets, empty state, bottom placement, 30% cap, fixed header, copy/tooltip, copy all, Start new, complete, delete, automatic recording, overflow');return;
  }
  if(process.env.SPACING_EDIT_TEST){
    await page.eval(`{const el=document.createElement('div');el.id='spacing-edit-target';el.style.cssText='position:fixed;left:20px;top:20px;width:280px;height:180px;box-sizing:border-box;padding:20px;margin:12px;display:flex;gap:24px';for(let i=0;i<2;i++){const c=document.createElement('span');c.style.cssText='flex:none;width:60px;height:60px';el.append(c);}document.body.append(el);el.click();}`);
    const state=()=>worker.eval(`reviewStore.run(${tabId},'get')`);
    const cases=[['padding-left','paddingLeft','22px'],['margin-left','marginLeft','18px'],['column-gap','columnGap','30px'],['row-gap','rowGap','32px']];
    for(const [property,computed,value]of cases){
      if(property==='row-gap'){await page.eval("document.querySelector('#spacing-edit-target').style.flexDirection='column'");await until(()=>control(a=>a.class==='panel',"return this.getRootNode().querySelector('svg.measurements .spacing-gap')?.getBBox().height===24"),'Column flex gap geometry refreshed');}
      const point=await page.eval(`(()=>{const el=document.querySelector('#spacing-edit-target'),r=el.getBoundingClientRect(),s=getComputedStyle(el);return ${JSON.stringify(property)}==='margin-left'?{x:r.left+r.width/2,y:r.top-6}:${JSON.stringify(property)}==='padding-left'?{x:r.left+8,y:r.top+r.height/2}:${JSON.stringify(property)}==='row-gap'?{x:r.left+parseFloat(s.paddingLeft)+20,y:r.top+parseFloat(s.paddingTop)+60+parseFloat(s.rowGap)/2}:{x:r.left+parseFloat(s.paddingLeft)+60+parseFloat(s.columnGap)/2,y:r.top+parseFloat(s.paddingTop)+20}})()`);
      await page.call('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
      await until(async()=>{try{return await control(a=>a['data-spacing-edit']===property&&a.role==='button','return !!this.getBoundingClientRect().width')}catch{return false}},'Clickable '+property+' badge');
      const badge=await control(a=>a['data-spacing-edit']===property&&a.role==='button','const r=this.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}');
      await page.call('Input.dispatchMouseEvent',{type:'mouseMoved',...badge});
      await page.call('Input.dispatchMouseEvent',{type:'mousePressed',...badge,button:'left',clickCount:1});
      await page.call('Input.dispatchMouseEvent',{type:'mouseReleased',...badge,button:'left',clickCount:1});
      await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),`return !this.hidden&&this.querySelector('input')?.getAttribute('aria-label')===${JSON.stringify('CSS value for '+property)}`),'Badge opens correct editor: '+property);
      assert(await control(a=>a.class?.split(' ').includes('review-editor'),`const r=this.getBoundingClientRect();return Math.abs(r.left-Math.max(8,Math.min(${badge.x},innerWidth-r.width-8)))<1&&Math.abs(r.top-(${badge.y}+4))<1`),'Editor anchors to numeric badge click');
      await control(a=>a.class?.split(' ').includes('review-editor'),`this.querySelector('input').value=${JSON.stringify(value)};this.requestSubmit()`);
      await until(async()=>await page.eval(`getComputedStyle(document.querySelector('#spacing-edit-target')).${computed}`)===value,'Badge edit preview');
      assert((await state()).document.records.some(r=>r.parameters[property]?.target.expression===value),'Badge edit is recorded');
      assert(await control(a=>a.class==='panel',"return this.querySelector('.name').textContent.includes('spacing-edit-target')"),'Badge click preserves selected element');
    }
    await page.eval("document.querySelector('#spacing-edit-target').remove()");
    for(const id of ['same','cross']){
      const ctx=await frameContext(id);await clickInside(ctx);
      await until(()=>control(a=>a.class==='panel',"return this.querySelector('.name')?.textContent.includes('inside')"),'Frame selection ready');
      const offset=await page.eval(`(()=>{const f=document.querySelector('#${id}'),r=f.getBoundingClientRect();return {x:r.left+f.clientLeft,y:r.top+f.clientTop}})()`);
      const point=await page.eval("(()=>{const r=document.querySelector('#inside').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+8}})()",ctx);
      await page.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x+offset.x,y:point.y+offset.y});
      const frameBadge=async()=>{
        const all=await nodes(),f=all.find(n=>{const a=n.attributes||[];return a.some((v,i)=>i%2===0&&v==='id'&&a[i+1]===id)}),children=[];
        const walk=n=>{if(!n)return;children.push(n);for(const c of n.children||[])walk(c)};walk(f.contentDocument);
        const h=children.find(n=>n.localName==='design-inspect-overlay');
        const {nodeId}=await page.call('DOM.querySelector',{nodeId:h.shadowRoots[0].nodeId,selector:'[data-spacing-edit=padding-top][role=button]'});if(!nodeId)return null;
        const {object}=await page.call('DOM.resolveNode',{nodeId});return (await page.call('Runtime.callFunctionOn',{objectId:object.objectId,functionDeclaration:'function(){const r=this.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}',returnByValue:true})).result.value;
      };
      const badge=await until(frameBadge,'Frame spacing number');
      const click={x:badge.x+offset.x,y:badge.y+offset.y};
      await page.call('Input.dispatchMouseEvent',{type:'mouseMoved',...click});
      await page.call('Input.dispatchMouseEvent',{type:'mousePressed',...click,button:'left',clickCount:1});
      await page.call('Input.dispatchMouseEvent',{type:'mouseReleased',...click,button:'left',clickCount:1});
      await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),"return !this.hidden&&this.querySelector('input')?.getAttribute('aria-label')==='CSS value for padding-top'"),'Frame badge opens editor');
      assert(await control(a=>a.class?.split(' ').includes('review-editor'),`const r=this.getBoundingClientRect();return Math.abs(r.left-Math.max(8,Math.min(${click.x},innerWidth-r.width-8)))<1&&Math.abs(r.top-(${click.y}+4))<1`),'Frame popup uses translated click coordinates');
      await control(a=>a.class?.split(' ').includes('review-editor'),"this.querySelector('input').value='40px';this.requestSubmit()");
      await until(async()=>await page.eval("getComputedStyle(document.querySelector('#inside')).paddingTop",ctx)==='40px','Frame overlay edit applies');
    }
    console.log('PASS: real clicks on margin, padding and gap numbers open the correct editor, apply preview and record changes');return;
  }
  if(process.env.REVIEW_TEST) {
    await page.eval(readFileSync(join(repo,'review-overrides.js'),'utf8'));
    await page.eval(`(()=>{
      const check=(value,message)=>{if(!value)throw Error(message);};
      const el=document.createElement('div');el.style.cssText='--space:16px;padding:var(--space);width:100px!important;font:var(--font, 16px/20px serif);color:blue';document.body.append(el);
      const initial=el.style.cssText,o=designInspectOverrides.create(document);o.setContext('desktop');
      const commit=(p,v)=>o.commit(el,p,o.prepare(el,p,v,()=>({value:'var(--space)',declaration:'padding'})));
      commit('padding-top','24px');commit('padding-right','30px');
      check(getComputedStyle(el).paddingTop==='24px','Padding preview');
      o.reset(el,'padding-top');check(getComputedStyle(el).paddingTop==='16px'&&getComputedStyle(el).paddingRight==='30px','Independent shorthand reset');
      o.compare(false);check(getComputedStyle(el).paddingRight==='16px','Before variable shorthand');
      o.compare(true);check(getComputedStyle(el).paddingRight==='30px','After variable shorthand');
      commit('width','120px');check(el.style.getPropertyPriority('width')==='important','Override important');
      o.reset(el,'width');check(el.style.width==='100px'&&el.style.getPropertyPriority('width')==='important','Restore inline important');
      let rejected=false;try{commit('padding-top','not-css');}catch{rejected=true;}check(rejected,'Invalid CSS rejected');
      commit('font-size','22px');o.reset(el,'font-size');check(getComputedStyle(el).fontSize==='16px','Font shorthand restoration');
      el.style.color='red';o.clear();check(el.style.color==='red'&&getComputedStyle(el).paddingRight==='16px','Unrelated application styles retained');
      const changed=designInspectOverrides.create(document);changed.setContext('desktop');changed.commit(el,'padding-top',changed.prepare(el,'padding-top','24px'));
      el.style.paddingRight='10px';changed.count();check(changed.lost,'External family mutation reported');changed.clear();
      check(getComputedStyle(el).paddingRight==='10px'&&getComputedStyle(el).paddingTop==='16px','External family change retained, owned override removed');el.remove();
    })()`);
    await page.eval(`(()=>{
      const el=document.createElement('div');el.className='base';el.style.cssText='width:100px;color:blue';document.body.append(el);const o=designInspectOverrides.create(document);o.setContext('a');
      const commit=(p,v)=>o.commit(el,p,o.prepare(el,p,v));
      commit('@class','changed');o.compare(false);if(el.className!=='base')throw Error('Before restores attributes');o.compare(true);if(el.className!=='changed')throw Error('After restores attribute targets');o.reset(el,'@class');
      commit('width','120px');commit('@style','color:green');if(el.style.color!=='green'||el.style.width)throw Error('Style attribute is applied as a whole');o.reset(el,'@style');if(getComputedStyle(el).width!=='120px')throw Error('Reset style restores current CSS overrides');o.clear();if(el.style.width!=='100px'||el.className!=='base')throw Error('Cleanup restores original attributes');el.remove();
    })()`);
    const review=()=>worker.eval(`reviewStore.run(${tabId},'get')`);
    const editValue=async(property,value)=>{
      await control(a=>a['data-edit-property']===property||(property.startsWith('font-')&&a['data-edit-property']==='font'),'this.click()');
      await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),'return !this.hidden'),'CSS editor opens');
      await control(a=>a.class?.split(' ').includes('review-editor'),`if(!this.querySelector('input,select'))[...this.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(property)}||b.textContent==='All — '+${JSON.stringify(property)}||(${JSON.stringify(property)}==='font'&&b.textContent==='Variable')).click()`);
      await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),"return !!this.querySelector('input,select')"),'Property input opens');
      assert(await control(a=>a.class?.split(' ').includes('review-editor'),"const e=this.querySelector('input,select'),s=getComputedStyle(e);return e.clientHeight-parseFloat(s.paddingTop)-parseFloat(s.paddingBottom)>=parseFloat(s.lineHeight)"),'Editor field fits its text line without vertical clipping');
      if(property==='box-sizing')assert(await control(a=>a.class?.split(' ').includes('review-editor'),"const e=this.querySelector('select'),s=getComputedStyle(e);return s.appearance==='none'&&parseFloat(s.paddingRight)>=32&&!!this.querySelector('.review-select-chevron .figma-icon')"),'Select reuses header chevron and reserves its right padding');
      if(property==='box-sizing')assert(await control(a=>a.class?.split(' ').includes('review-editor'),"return !!this.querySelector('select')&&[...this.querySelector('select').options].some(o=>o.value==='border-box')"),'Finite keyword property uses a select');
      await control(a=>a.class?.split(' ').includes('review-editor'),`this.querySelector('input,select').value=${JSON.stringify(value)};this.requestSubmit()`);
      await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),"return this.hidden || !!this.querySelector('[role=alert]').textContent"),'CSS commit finishes');
      assert.equal(await control(a=>a.class?.split(' ').includes('review-editor'),'return this.hidden'),true,await control(a=>a.class?.split(' ').includes('review-editor'),"return this.querySelector('[role=alert]')?.textContent"));
    };
    const resetValue=async(property)=>{
      await control(a=>a['data-edit-property']===property||(property.startsWith('font-')&&a['data-edit-property']==='font'),'this.click()');
      await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),'return !this.hidden'),'Reset editor opens');
      await control(a=>a.class?.split(' ').includes('review-editor'),`if(!this.querySelector('input,select'))[...this.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(property)}||b.textContent==='All — '+${JSON.stringify(property)}||(${JSON.stringify(property)}==='font'&&b.textContent==='Variable')).click()`);
      await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),"return !!this.querySelector('input,select')"),'Reset property opens');
      await control(a=>a.class?.split(' ').includes('review-editor'),"this.querySelector('[aria-label=\"Delete edit\"]').click()");
      await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),'return this.hidden'),'Reset completes');
    };
    await page.eval(`{const parent=document.createElement('div');parent.id='inherited-font-parent';parent.style.cssText='--inherited-font:14px/20px serif;font:var(--inherited-font)';const child=document.createElement('span');child.id='inherited-font-child';child.textContent='Inherited font';parent.append(child);document.body.append(parent);child.click();}`);
    await until(()=>control(a=>a.class==='panel',"return !!this.querySelector('[data-edit-property=font]')"),'Inherited font groups in table');
    await control(a=>a['data-edit-property']==='font','this.click()');
    assert(await control(a=>a.class?.split(' ').includes('review-editor'),"const h=getComputedStyle(this.querySelector('.review-menu-title')),o=getComputedStyle(this.querySelector('.review-option'));return h.fontFamily===o.fontFamily&&h.fontSize===o.fontSize&&Number(h.fontWeight)>Number(o.fontWeight)"),'Compound dropdown heading matches option font with stronger weight');
    await control(a=>a.class?.split(' ').includes('review-editor'),"[...this.querySelectorAll('button')].find(b=>b.textContent==='Variable').click()");
    await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),"return !!this.querySelector('input')"),'Inherited variable editor');
    assert.equal(await control(a=>a.class?.split(' ').includes('review-editor'),"return this.querySelector('input').value"),'var(--inherited-font)','Inherited font editing preserves variable rather than computed shorthand');
    await control(a=>a.class?.split(' ').includes('review-editor'),"this.querySelector('input').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,composed:true}))");
    await page.eval("document.querySelector('#inherited-font-parent').remove()");
    await page.eval(`{const el=document.createElement('button');el.id='review-target';el.className='original';el.setAttribute('aria-label','Original label');el.setAttribute('data-testid','original-test');el.textContent='Review target';el.style.cssText='--alternate-font:18px/24px serif;--brand:rgb(12,34,56);border:.0625rem solid var(--brand);--font:14px/20px serif;font:var(--font);--space:16px;padding:var(--space);width:100px;transform:scale(2)';document.body.append(el);el.click();}`);
    await until(()=>control(a=>a.class==='panel',"return !!this.querySelector('[data-edit-property=padding-top]')"),'Editable selection');
    assert.equal((await review()).document,null,'Selection does not start recording');
    for(const [property,expected]of [['border-width','.0625rem'],['border-color','var(--brand)']]){
      await control(a=>a['data-edit-property']===property,'this.click()');
      await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),"return !!this.querySelector('input') && !this.hidden"),'Border component editor opens');
      assert.equal(await control(a=>a.class?.split(' ').includes('review-editor'),"return this.querySelector('input').value"),expected,'Editor receives only the selected border component');
      await control(a=>a.class?.split(' ').includes('review-editor'),"this.querySelector('input').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,composed:true}))");
    }

    assert.deepEqual(await control(a=>a.class==='panel',"return [...this.querySelectorAll('.border-component')].map(line=>line.querySelector('.token')?.textContent||line.textContent)"),['.0625rem','solid','brand'],'Border shorthand is split into width, style, and color token without duplicates');
    assert(await control(a=>a.class==='panel',"const line=this.querySelector('.border-component[data-border-part=color]'),swatch=line.querySelector('.color-preview'),top=swatch.getBoundingClientRect().top;return Math.abs(top-line.getBoundingClientRect().top-2)<.1 && top>this.querySelector('.border-component[data-border-part=style]').getBoundingClientRect().top"),'Border swatch aligns with color, below width and style');
    assert(await control(a=>a.class==='content',"return this.lastElementChild.classList.contains('review-comment')&&this.lastElementChild.previousElementSibling.classList.contains('element-attributes')"),'Comment follows attributes as the last content block');
    await control(a=>a['data-edit-property']==='padding-top','this.click()');
    await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),'return !this.hidden'),'Invalid-value editor opens');
    assert.equal(await control(a=>a.class?.split(' ').includes('review-editor'),"return this.querySelector('input').value"),'var(--space)','Spacing variable initializes as its source reference');
    await control(a=>a.class?.split(' ').includes('review-editor'),"this.querySelector('input').value='invalid-css';this.requestSubmit()");
    await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),"return this.querySelector('[role=alert]').textContent.includes('Invalid value')"),'Invalid CSS error shown');
    assert.equal((await review()).document,null,'Invalid input does not start recording');
    await control(a=>a.class?.split(' ').includes('review-editor'),"const input=this.querySelector('input');input.value='spa';input.dispatchEvent(new Event('input',{bubbles:true}))");
    await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),"return [...this.getRootNode().querySelectorAll('.review-suggestions button')].some(b=>b.textContent==='space')"),'Site variable suggestions');
    await control(a=>a.class?.split(' ').includes('review-editor'),"[...this.getRootNode().querySelectorAll('.review-suggestions button')].find(b=>b.textContent==='space').click()");
    await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),"return this.querySelector('input').value==='var(--space)'"),'Suggestion fills input');
    assert.equal((await review()).document,null,'Suggestion selection does not save');
    assert.equal(await control(a=>a.class?.split(' ').includes('review-editor'),"return this.querySelector('[role=alert]').textContent"),'','Choosing a variable clears stale validation errors');
    await control(a=>a.class?.split(' ').includes('review-editor'),"const input=this.querySelector('input');input.value='bra';input.dispatchEvent(new Event('input',{bubbles:true}))");
    await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),"return !!this.getRootNode().querySelector('.review-suggestions .color-preview')"),'Color variable preview');
    assert(await control(a=>a.class?.split(' ').includes('review-editor'),"const s=this.getRootNode().querySelector('.review-suggestions'),r=this.querySelector('input').getBoundingClientRect(),d=s.getBoundingClientRect();return !this.contains(s)&&Math.abs(r.left-d.left)<1&&Math.abs(r.width-d.width)<1"),'Suggestions are an independent input-aligned dropdown');
    await control(a=>a.class?.split(' ').includes('review-editor'),"const input=this.querySelector('input');input.value='--';input.dispatchEvent(new Event('input',{bubbles:true}))");
    assert(await control(a=>a.class?.split(' ').includes('review-editor'),"const opts=[...this.getRootNode().querySelectorAll('.review-suggestions .review-option')],xs=opts.map(n=>n.querySelector('.review-option-text').getBoundingClientRect().left);return opts.some(n=>n.querySelector('.color-preview'))&&opts.some(n=>!n.querySelector('.color-preview'))&&xs.every(x=>Math.abs(x-xs[0])<1)"),'Color and non-color suggestion text aligns');
    if(process.env.EDITOR_SCREENSHOT_PATH){
      await control(a=>a.class?.split(' ').includes('review-editor'),"this.getRootNode().host.dataset.theme='light'");
      const clip=await control(a=>a.class?.split(' ').includes('review-editor'),"const a=this.getBoundingClientRect(),b=this.getRootNode().querySelector('.review-suggestions').getBoundingClientRect();return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.max(a.right,b.right)-Math.min(a.x,b.x),height:Math.max(a.bottom,b.bottom)-Math.min(a.y,b.y),scale:2}");
      const shot=await page.call('Page.captureScreenshot',{format:'png',clip});writeFileSync(process.env.EDITOR_SCREENSHOT_PATH,Buffer.from(shot.data,'base64'));
    }
    await control(a=>a.class?.split(' ').includes('review-editor'),"this.querySelector('input').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,composed:true}))");
    await editValue('font-size','18px');
    assert.equal(await page.eval("getComputedStyle(document.querySelector('#review-target')).fontSize"),'18px','Grouped font exposes longhand editing');
    await resetValue('font-size');
    await until(()=>page.eval("getComputedStyle(document.querySelector('#review-target')).fontSize==='14px'"),'Font reset');
    await editValue('box-sizing','border-box');
    assert.equal(await page.eval("getComputedStyle(document.querySelector('#review-target')).boxSizing"),'border-box','Keyword select saves valid choice');
    await resetValue('box-sizing');
    await editValue('font-weight','700');
    await control(a=>a['data-edit-property']==='font','this.click()');
    await control(a=>a.class?.split(' ').includes('review-editor'),"[...this.querySelectorAll('button')].find(b=>b.textContent==='Variable').click()");
    await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),"return !!this.querySelector('input')"),'Variable editor opens');
    await control(a=>a.class?.split(' ').includes('review-editor'),"this.querySelector('input').value='16px Arial';this.requestSubmit()");
    await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),"return this.querySelector('[role=alert]').textContent.includes('Choose an available font variable')"),'Variable option rejects literal font CSS');
    await control(a=>a.class?.split(' ').includes('review-editor'),"this.querySelector('input').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,composed:true}))");
    await editValue('font','var(--alternate-font)');
    assert.equal(await page.eval("getComputedStyle(document.querySelector('#review-target')).fontWeight"),'700','Changing font variable preserves individual weight override');
    assert.equal(await page.eval("getComputedStyle(document.querySelector('#review-target')).fontSize"),'18px','Whole-font variable saves without Unsupported property');
    await resetValue('font');
    await resetValue('font-weight');
    await editValue('border-color','red');
    await resetValue('border-color');
    await editValue('@id','renamed-target');
    assert.equal(await control(a=>a.class==='panel',"return this.querySelectorAll('[data-edit-property=\"@id\"]').length"),1,'Attribute override appears only in its own section');
    assert.equal(await control(a=>a.class==='panel',"return this.querySelectorAll('.review-override-properties [data-edit-property^=\"@\"]').length"),0,'Attributes never enter CSS fallback rows');
    assert.equal(await page.eval("!!document.querySelector('#renamed-target')"),true,'Attribute editing applies on the site');
    assert.equal(await control(a=>a.class==='panel',"return this.querySelectorAll('.review-pencil [data-asset=edit]').length>0 && !this.querySelector('.review-edited,.review-reset')"),true,'Edits use a pencil without a quick delete button');
    assert.equal(await control(a=>a.class==='panel',"const r=this.querySelector('.review-pencil').getBoundingClientRect();return r.width===16&&r.height===16"),true,'Pencil is 16px');
    await resetValue('@id');
    assert.equal(await page.eval("!!document.querySelector('#review-target')"),true,'Attribute reset restores original value');
    for(const [name,value]of [['class','changed'],['aria-label','Changed label'],['data-testid','changed-test'],['style','width:101px;color:green']]){
      await editValue('@'+name,value);
      assert.equal(await page.eval(`document.querySelector('#review-target').getAttribute(${JSON.stringify(name)})`),value,'Attribute saves without Unsupported property: '+name);
      await resetValue('@'+name);
    }


    await page.eval("const borderTarget=document.createElement('div');borderTarget.id='border-target';borderTarget.style.border='none';document.body.append(borderTarget);borderTarget.click()");
    await until(()=>control(a=>a.class==='name',"return this.textContent.includes('border-target')"),'Border target selected');
    await editValue('border-left-width','1px');
    assert.equal(await page.eval("getComputedStyle(document.querySelector('#border-target')).borderLeftStyle"),'solid','Width auto-assigns solid');
    assert(await control(a=>a.class==='panel',"return !!this.querySelector('.border-component[data-edit-property=\"border-left-width\"]')"),'Edited left border appears in table');
    let autoRecord=(await review()).document.records.find(r=>r.identity.selector==='#border-target');
    assert.equal(autoRecord.parameters['border-left-style'].target.expression,'solid','Automatic style is recorded');
    await resetValue('border-left-width');
    assert.equal(await page.eval("getComputedStyle(document.querySelector('#border-target')).borderLeftStyle"),'none','Reset width also removes automatic solid');
    await editValue('border-left-width','1px');
    await editValue('border-left-style','dashed');
    await resetValue('border-left-width');
    assert.equal(await page.eval("getComputedStyle(document.querySelector('#border-target')).borderLeftStyle"),'dashed','Explicit dashed survives width reset');
    await resetValue('border-left-style');
    await page.eval("document.querySelector('#review-target').click()");
    await until(()=>control(a=>a.class==='name',"return this.textContent.includes('review-target')"),'Return to review target');
    for(const value of ['20px','32px','24px'])await editValue('padding-top',value);
    assert(await control(a=>a.class==='panel',"const table=this.querySelector('.review-override-properties');return table?.previousElementSibling.classList.contains('box-model') && !!table.querySelector('.table-row .table-parameter') && !!table.querySelector('[data-edit-property=\"padding-top\"] .review-pencil')"),'Box-only edits use regular parameter rows directly below the box model');
    let saved=await review();const documentId=saved.document.id;
    assert.equal(saved.document.records[0].parameters['padding-top'].original.computed,'16px');
    assert.equal(saved.document.records[0].parameters['padding-top'].target.expression,'24px');
    assert.equal(Object.keys(saved.document.records[0].parameters).length,1);
    await control(a=>a['data-unit']==='rem','this.click()');assert.equal((await review()).document.records[0].parameters['padding-top'].target.expression,'24px','Display units do not alter targets');
    assert.equal(await page.eval("getComputedStyle(document.querySelector('#review-target')).paddingTop"),'24px');
    await control(a=>a.class?.includes('review-compare'),'this.click()');
    await until(()=>page.eval("getComputedStyle(document.querySelector('#review-target')).paddingTop==='16px'"),'Before restores underlying styles');
    await page.eval("window.dispatchEvent(new Event('scroll'))");
    assert.equal(await control(a=>a.class?.includes('review-compare'),"return this.getAttribute('aria-checked')"),'false');
    await page.eval("document.querySelector('#review-target').click()");
    await until(()=>page.eval("getComputedStyle(document.querySelector('#review-target')).paddingTop==='24px'"),'Selection returns to After');
    assert(await control(a=>a.class==='panel',"const s=this.querySelector('.review-comment');return s.querySelector('.review-comment-delete').hidden&&s.querySelector('.review-comment-save').textContent==='Add'"),'Unsaved comment offers Add without Delete');
    await control(a=>a.class==='panel',"this.querySelector('.review-comment textarea').value='Use standard spacing | size.\\nKeep responsive.';this.querySelector('.review-comment textarea').dispatchEvent(new Event('input'));[...this.querySelectorAll('.review-comment button')].find(b=>b.textContent==='Add'||b.textContent==='Update').click()");
    await until(async()=>(await review()).document.records[0].comment.includes('responsive'),'Comment saved');
    assert(await control(a=>a.class==='panel',"const s=this.querySelector('.review-comment');return !s.querySelector('.review-comment-delete').hidden&&s.querySelector('.review-comment-save').textContent==='Update'"),'Saved active-note comment offers Update and Delete');
    await control(a=>a.class==='panel',"const t=this.querySelector('.review-comment textarea');t.value='';t.dispatchEvent(new Event('input'))");
    assert(await control(a=>a.class==='panel',"const s=this.querySelector('.review-comment');return !s.querySelector('.review-comment-delete').hidden&&s.querySelector('.review-comment-save').hidden"),'Empty saved-comment input retains Delete and hides Update');
    await control(a=>a.class==='panel',"this.querySelector('.review-comment-delete').click()");
    await until(async()=>!(await review()).document.records[0].comment,'Delete comment from active note');
    assert(await control(a=>a.class==='panel',"const s=this.querySelector('.review-comment');return s.querySelector('.review-comment-delete').hidden&&s.querySelector('.review-comment-save').textContent==='Add'"),'Deleting restores Add');
    await control(a=>a.class==='panel',"const s=this.querySelector('.review-comment'),t=s.querySelector('textarea');t.value='Use standard spacing | size.\\nKeep responsive.';t.dispatchEvent(new Event('input'));s.querySelector('.review-comment-save').click()");
    await until(async()=>(await review()).document.records[0].comment.includes('responsive'),'Re-add comment');
    await control(a=>a.class==='panel',"const s=this.querySelector('.review-comment'),t=s.querySelector('textarea');t.value='Use standard spacing | size.\\nKeep responsive. Updated.';t.dispatchEvent(new Event('input'));s.querySelector('.review-comment-save').click()");
    await until(async()=>(await review()).document.records[0].comment.endsWith('Updated.'),'Update replaces existing comment');
    if(process.env.COMMENT_SCREENSHOT_PATH){
      await control(a=>a.class==='panel',"this.querySelector('[data-theme-choice=light]').click();this.querySelector('.review-comment').scrollIntoView({block:'center'})");
      await until(()=>control(a=>a.class==='panel',"const i=this.querySelector('.review-comment-delete img');return i.complete&&i.naturalWidth===16"),'Exact comment Delete icon loaded');
      const clip=await control(a=>a.class==='panel',"const r=this.querySelector('.review-comment').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:2}");
      const shot=await page.call('Page.captureScreenshot',{format:'png',clip});writeFileSync(process.env.COMMENT_SCREENSHOT_PATH,Buffer.from(shot.data,'base64'));
    }
    assert.equal(await control(a=>a.class==='panel',"return this.querySelector('.reviews .review-status').textContent.includes('Comment saved')"),false,'Saving a comment shows no success text');
    await control(a=>a.class==='panel',"this.querySelector('.review-comment textarea').focus()");
    await page.eval("document.querySelector('#main').click()");
    await until(()=>control(a=>a.class==='name',"return this.textContent.includes('main')"),'Selection changes after comment focus');
    await page.eval("document.querySelector('#review-target').click()");
    await until(()=>control(a=>a.class==='name',"return this.textContent.includes('review-target')"),'Return to edited element');
    await editValue('width','120px');
    assert.equal(await page.eval("document.querySelector('#review-target').getBoundingClientRect().width"),240,'CSS width and screen geometry remain distinct');
    await resetValue('width');
    await until(()=>page.eval("getComputedStyle(document.querySelector('#review-target')).width==='100px'"),'Width reset');
    saved=await review();assert(!saved.document.records[0].parameters.width);assert(saved.document.records[0].comment);
    await editValue('display','none');
    await resetValue('display');
    await until(()=>page.eval("getComputedStyle(document.querySelector('#review-target')).display!=='none'"),'Reset remains reachable after display none');
    if(process.env.REVIEW_SCREENSHOT_PATH){
      const clip=await control(a=>a.class==='panel',"const r=this.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};");
      const shot=await page.call('Page.captureScreenshot',{format:'png',clip});writeFileSync(process.env.REVIEW_SCREENSHOT_PATH,Buffer.from(shot.data,'base64'));
    }
    await page.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
    await until(()=>page.eval("getComputedStyle(document.querySelector('#review-target')).paddingTop==='16px'"),'Resize excludes desktop override');
    await editValue('padding-top','12px');
    saved=await review();assert.equal(saved.document.records.length,2);assert(saved.document.records.every(r=>r.parameters['padding-top'].original.computed==='16px'));
    await page.eval("history.pushState({},'', '/settings')");
    await until(()=>page.eval("getComputedStyle(document.querySelector('#review-target')).paddingTop==='16px'"),'SPA URL clears prior overrides');
    await editValue('padding-top','8px');saved=await review();assert.equal(saved.document.id,documentId);assert(saved.document.records.some(r=>r.context.url.endsWith('/settings')));
    const same=await frameContext('same');await clickInside(same);
    await until(()=>control(a=>a.class==='panel',"return this.querySelector('.name')?.textContent.includes('inside')"),'Frame selected');
    await editValue('padding-top','35px');assert.equal(await page.eval("getComputedStyle(document.querySelector('#inside')).paddingTop",same),'35px');
    let cross=await frameContext('cross');await clickInside(cross);
    await until(()=>control(a=>a.class==='panel',"return this.querySelector('.name')?.textContent.includes('inside')"),'Cross-origin selection');
    await editValue('padding-top','37px');assert.equal(await page.eval("getComputedStyle(document.querySelector('#inside')).paddingTop",cross),'37px');
    const exported=await worker.eval(`reviewStore.run(${tabId},'export',{id:${JSON.stringify(documentId)}})`);
    assert(exported.markdown.includes('var(--space)'));assert(exported.markdown.includes('24px'));assert(exported.markdown.includes('12px'));assert(exported.markdown.includes('Use standard spacing \\| size.'));assert(exported.markdown.includes('Frame:'));
    const downloads=join(sandbox,'downloads');require('node:fs').mkdirSync(downloads);
    await page.call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
    await control(a=>a.class?.includes('review-more'),'this.click()');
    await clickNoteMenu('Download');
    await until(()=>existsSync(join(downloads,`design-review-${documentId}.md`)),'Markdown downloaded').catch(async error=>{console.error('Download files:',require('node:fs').readdirSync(downloads));console.error('Review UI:',await control(a=>a.class==='panel',"return this.querySelector('.review-status[role=status]').textContent"));throw error;});
    assert.equal(readFileSync(join(downloads,`design-review-${documentId}.md`),'utf8'),exported.markdown);
    assert.equal((await review()).document.status,'recording');
    await control(a=>a['data-edit-property']==='padding-top','this.click()');
    await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),'return !this.hidden'),'Frame edit draft opens');
    const prior=JSON.stringify((await review()).document.records);
    await page.eval("document.querySelector('#cross').src += '?changed'");
    await until(()=>control(a=>a.class==='panel',"return !this.querySelector('.name')"),'Frame navigation invalidates selection');
    await control(a=>a.class?.split(' ').includes('review-editor'),"this.querySelector('input').value='99px';this.requestSubmit()");
    await until(()=>control(a=>a.class?.split(' ').includes('review-editor'),"return !!this.querySelector('[role=alert]').textContent"),'Stale frame edit is rejected');
    assert.equal(JSON.stringify((await review()).document.records),prior,'Stale edit does not alter saved records');
    cross=await frameContext('cross');
    await worker.eval(`toggle({id:${tabId}})`);
    assert.equal(await page.eval("getComputedStyle(document.querySelector('#review-target')).paddingTop"),'16px');
    await worker.eval(`toggle({id:${tabId}})`);
    assert.equal((await review()).document.id,documentId);assert.equal(await page.eval("getComputedStyle(document.querySelector('#inside')).paddingTop",cross),'30px');
    await page.call('Page.reload');
    await until(()=>page.eval("!!document.querySelector('#main') && !document.querySelector('design-inspect-overlay')"),'Reload clears preview');
    await worker.eval(`toggle({id:${tabId}})`);assert.equal((await review()).document.id,documentId);
    await until(()=>control(a=>a.class==='review-card',"return this.dataset.status==='recording'"),'Saved document card');
    await control(a=>a.class?.includes('review-complete'),'this.click()');
    await until(async()=>(await review()).completed.some(d=>d.id===documentId),'Stop completes document');
    assert.equal(await control(a=>a.class==='panel',"return !!this.querySelector('.review-new')"),false,'Start new is hidden without an active note');
    await page.eval("document.querySelector('#main').click()");await editValue('color','red');
    const newId=(await review()).document.id;assert.notEqual(newId,documentId);
    await worker.eval(`chrome.tabs.remove(${tabId})`);
    await until(async()=>(await worker.eval(`reviewStore.run(999,'get')`)).completed.some(d=>d.id===newId),'Tab close completes document');
    console.log('PASS: review UI, final differences, comments, reset, Before/After, viewports, SPA, frames, Markdown download, reload, Stop/New, tab closure');return;
  }
  if(process.env.APPLICABILITY_TEST) {
    await page.eval(`{
      const target=document.createElement('div');target.id='applicability';target.innerHTML='<span>Child text</span>';document.body.append(target);
    }`);
    await page.eval("document.querySelector('#applicability').click()");
    for(const [display,box,properties] of [
      ['block',true,['display','position','box-sizing']],
      ['flex',true,['gap','display','position','box-sizing','flex-direction','justify-content','align-items']],
      ['grid',true,['gap','display','position','box-sizing','justify-content','align-items']],
      ['inline-flex',true,['gap','display','position','box-sizing','flex-direction','justify-content','align-items']],
      ['inline-grid',true,['gap','display','position','box-sizing','justify-content','align-items']],
      ['contents',false,['display','position']],['none',false,['display','position']]
    ]) {
      await page.eval(`document.querySelector('#applicability').style.cssText='display:${display};gap:0;background:transparent;border-radius:0'`);
      await until(async()=>JSON.stringify(await control(a=>a.class==='panel',`return [...this.querySelectorAll('[data-group="Layout"] dt')].map(n=>n.textContent)`))===JSON.stringify(properties),'Layout applicability '+display);
      const state=await control(a=>a.class==='panel',`return {box:!!this.querySelector('.box-model'),size:!!this.querySelector('.size-table'),appearance:!!this.querySelector('[data-group="Appearance"]'),typography:!!this.querySelector('[data-group="Typography"]')}`);
      assert.deepEqual(state,{box,size:box,appearance:box,typography:false},'Section applicability '+display);
    }
    await page.eval("document.querySelector('#applicability').style.cssText='display:block;width:0;height:0'");
    await until(async()=>await control(a=>a.class==='panel',`return !!this.querySelector('.size-table') && !!this.querySelector('.box-model')`),'Zero-size box remains eligible');
    console.log('PASS: section applicability, flex/grid fields, zero gap, contents/none, zero-size box and live updates');return;
  }
  if(process.env.TYPOGRAPHY_TEST) {
    await page.eval(`{
      const scene=document.createElement('div');scene.innerHTML='<div id="card-text"><span id="own-text">Heading</span></div><div id="empty-avatar"></div><div id="initials">NK</div><div id="whitespace">  </div><div id="hidden-text" style="visibility:hidden">Hidden</div><div style="opacity:0"><div id="transparent-text">Hidden</div></div><div id="zero-text" style="font-size:0">Zero</div><div id="mixed-text">Own <span>child</span></div><div id="explicit-font" style="font:14px serif"><span>Child</span></div><div id="explicit-color" style="color:red"></div><div id="inherited-font" style="font:14px serif"><div id="inherited-only"><span>Child</span></div></div>';document.body.append(scene);
    }`);
    for(const [id,expected] of [['card-text',false],['own-text',true],['empty-avatar',false],['initials',true],['whitespace',false],['hidden-text',false],['transparent-text',false],['zero-text',true],['mixed-text',true],['explicit-font',true],['explicit-color',true],['inherited-only',false]]) {
      await page.eval(`document.getElementById('${id}').click()`);
      await until(async()=>(await control(a=>a.class==='name','return this.textContent')).includes('#'+id),'Selection '+id);
      assert.equal(await control(a=>a.class==='panel',`return !!this.querySelector('[data-group="Typography"]')`),expected,'Typography applicability: '+id);
    }
    await page.eval("document.querySelector('#mixed-text').firstChild.remove()");
    await until(async()=>!(await control(a=>a.class==='panel',`return !!this.querySelector('[data-group="Typography"]')`)),'Typography updates after direct text removal');
    await control(a=>a.class==='all-properties','this.click()');
    assert.equal(await control(a=>a.class==='all-properties',"return this.getAttribute('aria-pressed')"),'true');
    assert.equal(await control(a=>a.class==='panel',`return !!this.querySelector('[data-group="Typography"]')`),true,'All properties reveals hidden Typography');
    await control(a=>a.class==='all-properties','this.click()');
    assert.equal(await control(a=>a.class==='panel',`return !!this.querySelector('[data-group="Typography"]')`),false,'Applicable properties hides it again');
    const crossContext=await frameContext('cross');
    await clickInside(crossContext);
    await until(async()=>(await control(a=>a.class==='name','return this.textContent')).includes('#inside'),'Frame selection');
    assert.equal(await control(a=>a.class==='panel',`return [...this.querySelectorAll('[data-group="Layout"] dt')].some(n=>n.textContent==='flex-direction')`),false);
    await control(a=>a.class==='all-properties','this.click()');
    assert.equal(await control(a=>a.class==='panel',`return [...this.querySelectorAll('[data-group="Layout"] dt')].some(n=>n.textContent==='flex-direction')`),true,'All properties reveals frame properties');
    console.log('PASS: own text, explicit typography, inheritance exclusions, live updates, all-properties toggle and frame snapshots');return;
  }
  if(process.env.TOKEN_TEST) {
    await page.eval(`{
      const style=document.createElement('style');style.textContent=':root {--base:8px;--scale:2;--alias:var(--base);--control:calc(var(--alias) * var(--scale));--cycle-a:var(--cycle-b);--cycle-b:var(--cycle-a)}';document.head.append(style);
      const parent=document.createElement('div');parent.style.cssText='--local:var(--base)';
      const target=document.createElement('div');target.id='token-target';target.style.cssText='--base:32px;padding:var(--control);margin-left:var(--local);width:var(--alias);font-size:var(--control)';target.textContent='Token sample';parent.append(target);document.body.append(parent);
    }`);
    await page.eval(readFileSync(join(repo,'css-values.js'),'utf8'));
    const resolved=await page.eval(`{
      const css=designInspectCSS,reader=css.sourceReader(document),el=document.querySelector('#token-target');
      const resolve=property=>{const source=reader.read(el,property);return reader.resolve(source.element,source.value)};
      ({padding:resolve('padding-left'),margin:resolve('margin-left'),width:resolve('width'),cycle:reader.resolve(el,'var(--cycle-a)'),unknown:reader.resolve(el,'var(--missing, 4px)'),quoted:reader.resolve(el,'"var(--alias)"')});
    }`);
    assert.equal(resolved.padding,'calc(var(--base) * var(--scale))');
    assert.equal(resolved.margin,'var(--base)');assert.equal(resolved.width,'var(--base)');
    assert.equal(resolved.cycle,'var(--cycle-a)');assert.equal(resolved.unknown,'var(--missing, 4px)');assert.equal(resolved.quoted,'"var(--alias)"');
    await page.eval("document.querySelector('#token-target').click()");
    await until(async()=>(await panelText()).includes('control'),'Original variable in panel');
    await until(async()=>await control(a=>a.class==='panel',"return !!this.querySelector('[data-chain-token=\"var(--control)\"]')"),'Typography chain control');
    const paddingTooltip=await control(a=>a.class==='box-model',`const badge=this.querySelector('.box-padding .box-var'),tooltip=this.getRootNode().querySelector('#box-variable-tooltip');badge.dispatchEvent(new Event('pointerenter'));const opened=!tooltip.hidden,chain=[...tooltip.children].map(n=>n.textContent);badge.dispatchEvent(new Event('pointerleave'));return {opened,chain,closed:tooltip.hidden};`);
    assert.equal(paddingTooltip.opened,true,'Padding variable tooltip opens');
    assert.deepEqual(paddingTooltip.chain,['var(--control)','→ calc(var(--alias) * var(--scale))','→ calc(var(--base) * var(--scale))'],'Padding tooltip retains the full variable chain');
    assert.equal(paddingTooltip.closed,true,'Padding tooltip closes');
    const chainButton=a=>a['data-chain-token']==='var(--control)';
    assert.equal(await control(chainButton,`return this.closest('.value-stack').querySelector('.token').textContent`),'control','Original variable stays in header');
    assert.equal(await control(chainButton,`return this.closest('.value-stack').querySelector('.token').getAttribute('aria-label')`),'Edit font-size','Variable name edits its typography property');
    assert.equal(await control(chainButton,`return this.getAttribute('aria-expanded')`),'false');
    assert.equal(await control(chainButton,`return this.getRootNode().getElementById(this.getAttribute('aria-controls')).hidden`),true,'Chain starts collapsed');
    await control(chainButton,'this.click()');
    assert.equal(await control(chainButton,`return this.getRootNode().getElementById(this.getAttribute('aria-controls')).textContent`),'control →\u00a0calc(alias * scale) →\u00a0calc(base * scale)');
    assert.equal(await control(chainButton,`return this.getRootNode().getElementById(this.getAttribute('aria-controls')).hidden`),false);
    assert.equal(await control(chainButton,`return this.closest('.value-stack').querySelector('.value-descriptions').hidden`),true,'Chain disclosure does not open computed value');
    await control(chainButton,`this.closest('.value-stack').querySelector('.value-toggle:not(.chain-toggle)').click()`);
    assert.equal(await control(chainButton,`const d=this.closest('.value-stack').querySelector('.value-descriptions');return !d.hidden && d.textContent.includes('16px')`),true,'Eye independently reveals final value');
    await delay(600);
    assert.equal(await control(chainButton,`return this.getAttribute('aria-expanded')`),'true','Chain stays open during live refresh');
    await control(chainButton,'this.click()');
    assert.equal(await control(chainButton,`return this.closest('.value-stack').querySelector('.value-descriptions').hidden`),false,'Closing chain keeps computed value visible');
    await page.eval("document.querySelector('#token-target').style.fontSize='var(--base)'");
    await until(async()=>!(await control(a=>a.class==='panel',`return [...this.querySelectorAll('.chain-toggle')].some(b=>b.dataset.chainToken==='var(--control)')`)),'Removed alias removes chain button');
    assert.equal(await control(a=>a.class==='panel',`return [...this.querySelectorAll('.chain-toggle')].some(b=>b.dataset.chainToken==='var(--base)')`),false,'Terminal variable has no chain button');
    await page.eval("document.querySelector('#token-target').style.fontSize='var(--control)';document.querySelector('#token-target').click()");
    await until(async()=>await control(a=>a.class==='panel',`return [...this.querySelectorAll('.chain-toggle')].some(b=>b.dataset.chainToken==='var(--control)' && b.getAttribute('aria-expanded')==='false')`),'New selection resets chain');
    const crossContext=await frameContext('cross');
    await page.eval("document.querySelector('#inside').style.cssText='--alias:var(--base);--base:12px;padding:var(--alias);font-size:var(--alias)'",crossContext);
    await clickInside(crossContext);
    await until(async()=>await control(a=>a.class==='panel',`return this.querySelector('.name')?.textContent.includes('#inside') && [...this.querySelectorAll('.chain-toggle')].some(b=>b.dataset.chainToken==='var(--alias)')`),'Frame variable selection');
    const frameChain=a=>a['data-chain-token']==='var(--alias)';
    await control(frameChain,'this.click()');
    assert.equal(await control(frameChain,`return this.getRootNode().getElementById(this.getAttribute('aria-controls')).textContent`),'alias →\u00a0base','Chain survives frame snapshot');
    await page.eval("{const t=document.querySelector('#token-target');t.style.setProperty('--font-root','14px/20px serif');t.style.setProperty('--font-ui','var(--font-root)');t.style.font='var(--font-ui)';t.click()}");
    await until(async()=>await control(a=>a.class==='panel',`return this.querySelectorAll('[data-chain-token="var(--font-ui)"]').length===1`),'Grouped typography has one chain control');
    const fontChain=a=>a['data-chain-token']==='var(--font-ui)';
    await control(fontChain,'this.click()');
    assert.equal(await control(fontChain,`return this.getRootNode().getElementById(this.getAttribute('aria-controls')).textContent`),'font-ui →\u00a0font-root');
    await control(a=>a['data-unit']==='rem',"this.click()");
    assert.equal(await control(fontChain,`return this.getAttribute('aria-expanded')`),'true','Unit update keeps chain open');
    console.log('PASS: padding tooltip, original typography token, independent chain/eye, NBSP arrows, live/unit updates, cycles, frames and grouped typography');return;
  }
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
  // Native approval was verified manually; mock denial to keep headless runs deterministic.
  await worker.eval('globalThis.accessRequests=[];chrome.permissions.request=async options=>{accessRequests.push(options);return false;}');
  const accessRect=await control(a=>a.class==='frame-access','const r=this.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};');
  await page.call('Input.dispatchMouseEvent',{type:'mousePressed',...accessRect,button:'left',clickCount:1});
  await page.call('Input.dispatchMouseEvent',{type:'mouseReleased',...accessRect,button:'left',clickCount:1});
  await until(async()=>await control(a=>a.class==='frame-access',"return this.textContent.includes('Access denied') && !this.disabled;"),'Permission denial allows retry');
  assert.deepEqual(await worker.eval('accessRequests'),[{origins:['http://127.0.0.1/*']}],'Only blocked frame domain requested');
  assert(!(await targets()).some(t=>t.url.includes('/frame-access.html')),'No intermediate extension window');
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
  assert.deepEqual(await control(a=>a.class==='panel',"return [...this.querySelectorAll('[data-group=Layout] .table-row')].map(row=>row.querySelector('.parameter-text')?.textContent || row.querySelector('dt').textContent)"),['position','box-sizing','display','gap','flex-direction','justify-content','align-items'],'Layout dependencies follow display');
  assert.equal(await overlay("return svg.querySelector('.spacing-gap').getBBox().width"),24,'Only declared flex gap is painted');
  for(const [kind,expected] of [['margin','rgb(237, 189, 128)'],['padding','rgb(162, 213, 180)'],['gap','rgb(165, 140, 255)']]) {
    assert.equal(await overlay(`return getComputedStyle(svg.querySelector('.spacing-${kind}')).fill`),expected,`${kind} overlay palette`);
    const panelColor=kind==='gap' ? "return getComputedStyle(this.querySelector('dt[data-spacing=gap]')).color" : `return getComputedStyle(this.querySelector('.box-${kind}')).color`;
    const panelToken=kind==='gap'?'color-accent-gap':`color-box-${kind}`;
    const expectedPanelColor=await control(a=>a.class==='panel',`const probe=document.createElement('span');probe.style.color=getComputedStyle(this.getRootNode().host).getPropertyValue('--di-${panelToken}');this.append(probe);const color=getComputedStyle(probe).color;probe.remove();return color;`);
    assert.equal(await control(a=>a.class==='panel',panelColor),expectedPanelColor,`${kind} panel color`);
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
  assert.equal(await overlay("return getComputedStyle(svg.querySelector('.measure-label')).fill"),'rgb(32, 32, 32)','Dark text on label backing');
  assert.equal(await overlay("return getComputedStyle(svg.querySelector('.measure-label-bg')).fill"),'rgb(255, 106, 0)','Orange label backing');
  assert.equal(await overlay("return getComputedStyle(svg.querySelector('.measure-label')).stroke"),'none','No text outline');
  assert.equal(await overlay("return getComputedStyle(svg.querySelector('.measure-label')).fontWeight"),'400','Regular-weight label text');
  assert.equal(await overlay("return getComputedStyle(svg.querySelector('.measure-axis')).strokeWidth"),'1px','Thin measurement lines');
  assert.equal(await overlay("return svg.querySelectorAll('.measure-label-bg').length"),2,'Label backings on low-contrast light background');
  assert.equal(await overlay("return svg.querySelectorAll('.measure-halo').length"),0,'No line casings');
  await page.eval("document.querySelector('#measure-scene').style.background='#101010'");
  await until(async()=>(await overlay("return svg.querySelectorAll('.measure-label-bg').length"))===2,'Label backings remain on dark background');
  assert.equal(await overlay("return getComputedStyle(svg.querySelector('.measure-label')).fill"),'rgb(32, 32, 32)','Label text keeps the dark ink token');
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
  assert(await control(a=>a.class==='content',"return this.lastElementChild.classList.contains('review-comment')&&this.lastElementChild.previousElementSibling.classList.contains('element-attributes')"),'Comment follows the attributes as the last content section');
  await control(a=>a.class==='element-tree-toggle icon-button','this.click()');
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
  assert.equal(await control(a=>a.class==='panel','return Math.round(this.getBoundingClientRect().width)'),await control(a=>a.class==='panel',"return parseFloat(getComputedStyle(this).getPropertyValue('--di-size-panel-min-width'))+40"),'Horizontal resize handle expands panel');
  const heightBefore=await control(a=>a.class==='panel','return this.getBoundingClientRect().height');
  await control(a=>a['data-edge']==='bottom',"this.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}))");
  assert.equal(await control(a=>a.class==='panel','return this.getBoundingClientRect().height'),heightBefore-16,'Bottom handle reduces height with keyboard');
  await control(a=>a['data-edge']==='top',"this.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))");
  assert.equal(await control(a=>a.class==='panel','return this.getBoundingClientRect().height'),heightBefore-32,'Top handle reduces height with keyboard');
  await control(a=>a.class==='panel',"this.style.height='auto'");
  await control(a=>a.class==='panel',"this.style.width='420px';this.style.left='auto';this.style.right='16px'");
  assert.equal(await control(a=>a.class==='size-table',"return this.querySelectorAll('.table-row').length"),1,'Frame dimensions in a single size row');
  assert.equal(await control(a=>a.class==='box-model',"return this.querySelectorAll('.box-value').length"),12,'All box model sides in shared panel');
  assert.equal(await control(a=>a.class==='box-model',"return this.querySelectorAll('.radius-marker').length"),3,'Frame corner radii in shared panel');
  assert.equal(await control(a=>a.class==='box-model',"return this.querySelectorAll('.box-padding .box-var').length"),4,'Variable badges on all padding sides');
  await control(a=>a.class==='box-model',"this.querySelector('.box-padding .box-var').dispatchEvent(new Event('pointerenter'))");
  assert((await panelText()).includes('--frame-space'),'Hover shows remote variable details');
  if(process.env.SCREENSHOT_PATH) {
    const clip=await control(a=>a.class==='panel',"const r=this.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};");
    const shot=await page.call('Page.captureScreenshot',{format:'png',clip});
    writeFileSync(process.env.SCREENSHOT_PATH,Buffer.from(shot.data,'base64'));
  }
  await control(a=>a['data-unit']==='rem',"this.click();");
  await until(async()=>(await panelText()).includes('1.5rem'),'Frame-local rem base');

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
  await page.eval("document.querySelector('span').style.marginLeft='20px'",cross);
  const targetPoint=await page.eval("(()=>{const r=document.querySelector('span').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()",cross);
  await page.eval(`document.querySelector('span').dispatchEvent(new MouseEvent('pointermove',{bubbles:true,clientX:${targetPoint.x},clientY:${targetPoint.y}}))`,cross);
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

importScripts('design-tokens.js');
importScripts('review.js');
const reviewStore=designInspectReview.createStore(chrome);
const channel = "design-inspect";
const files = ["design-tokens.js", "figma-icons.js", "geometry.js", "css-values.js", "layout-icons.js", "spacing.js", "box-model.js", "review.js", "review-overrides.js", "review-panel.js", "inspect.js"];
const send = (tabId, frameId, message) => chrome.tabs.sendMessage(tabId, {channel, ...message}, {frameId}).catch(() => null);
const state = tabId => send(tabId, 0, {type:"get-state"});
const frames = async tabId => (await chrome.webNavigation.getAllFrames({tabId})) || [];
const fontCache=new Map();
let captureBusy=false, lastCapture=0;
const pixelCache=new Map();
const hoverPins=new Map();

async function pinHover(tabId) {
  const target={tabId};
  try {
    if(hoverPins.has(tabId))await releaseHover(tabId);
    await chrome.debugger.attach(target,'1.3');
    await chrome.debugger.sendCommand(target,'DOM.enable');
    await chrome.debugger.sendCommand(target,'CSS.enable');
    const evaluated=await chrome.debugger.sendCommand(target,'Runtime.evaluate',{expression:"Array.from(document.querySelectorAll(':hover'))",objectGroup:'design-inspect-hover',returnByValue:false});
    const objectId=evaluated.result?.objectId;
    if(!objectId)throw Error('No hovered elements to pin');
    const {result:properties=[]}=await chrome.debugger.sendCommand(target,'Runtime.getProperties',{objectId,ownProperties:true});
    const nodes=[];
    for(const property of properties)if(/^\d+$/.test(property.name)&&property.value?.objectId) {
      const requested=await chrome.debugger.sendCommand(target,'DOM.requestNode',{objectId:property.value.objectId});
      if(requested.nodeId)nodes.push(requested.nodeId);
    }
    await chrome.debugger.sendCommand(target,'Runtime.releaseObjectGroup',{objectGroup:'design-inspect-hover'});
    if(!nodes.length)throw Error('No hovered elements to pin');
    for(const nodeId of nodes)await chrome.debugger.sendCommand(target,'CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['hover']});
    hoverPins.set(tabId,nodes);
    return true;
  } catch(error) {
    console.debug('Design Inspect hover pin:',error.message);
    if(!hoverPins.has(tabId))try{await chrome.debugger.detach(target);}catch{}
    return false;
  }
}
async function releaseHover(tabId) {
  const nodes=hoverPins.get(tabId);
  if(!nodes)return;
  hoverPins.delete(tabId);
  for(const nodeId of nodes)try{await chrome.debugger.sendCommand({tabId},'CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[]});}catch{}
  try{await chrome.debugger.detach({tabId});}catch{}
}

async function broadcast(tabId, message, except = -1) {
  await Promise.allSettled((await frames(tabId)).filter(f => f.frameId !== except).map(f => send(tabId, f.frameId, message)));
}
async function inject(tabId, frameId) {
  await chrome.scripting.executeScript({target:{tabId, frameIds:[frameId]}, files});
}
async function attachFrames(tabId) {
  const current = await state(tabId);
  if (!current) return;
  const all = await frames(tabId);
  if (!all.some(f => f.frameId === current.activeFrameId)) {
    await send(tabId, 0, {type:"frame-gone", frameId:current.activeFrameId});
    await broadcast(tabId, {type:"active", activeFrameId:0});
  }
  const blocked = [];
  await Promise.allSettled(all.filter(f => f.frameId !== 0).map(async f => {
    try { await inject(tabId, f.frameId); }
    catch { blocked.push({frameId:f.frameId, url:f.url}); }
  }));
  await send(tabId, 0, {type:"frame-status", blocked});
  return blocked;
}
async function toggle(tab) {
  try {
    if (await state(tab.id)) {pixelCache.delete(tab.id);await releaseHover(tab.id);await broadcast(tab.id, {type:"destroy"});}
    else {await inject(tab.id, 0); await attachFrames(tab.id);}
    await chrome.action.setBadgeText({tabId:tab.id, text:""});
    await chrome.action.setTitle({tabId:tab.id, title:"Toggle Design Inspect"});
  } catch (error) {
    console.warn("Design Inspect cannot open on this page", error);
    await chrome.action.setBadgeText({tabId:tab.id, text:"!"});
    await chrome.action.setTitle({tabId:tab.id, title:"Cannot inspect this page. Open a regular website and try again."});
  }
}
chrome.action.onClicked.addListener(toggle);

function originPattern(url) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? `${parsed.protocol}//${parsed.hostname}/*` : null;
  } catch { return null; }
}
async function handle(message, sender) {
  const accessPage = sender.url?.startsWith(chrome.runtime.getURL("frame-access.html"));
  if (accessPage && ["access-info", "refresh-frames"].includes(message.type)) {
    const tabId = message.tabId;
    if (!Number.isInteger(tabId) || !(await state(tabId))) return {error:"Inspector is closed. Reopen it on the original page."};
    if (message.type === "refresh-frames") {const blocked = await attachFrames(tabId); return {ok:true, blockedCount:blocked?.length || 0};}
    const origins = [...new Set((await frames(tabId)).filter(f => f.frameId !== 0).map(f => originPattern(f.url)).filter(Boolean))];
    const missing = [];
    for (const origin of origins) if (!(await chrome.permissions.contains({origins:[origin]}))) missing.push(origin);
    return {origins:missing};
  }
  const tabId = sender.tab?.id;
  if (tabId === undefined || !Number.isInteger(sender.frameId)) return;
  const frameId = sender.frameId;
  if(message.type==='review-open-spacing'){
    const current=await state(tabId);
    if(current?.activeFrameId!==frameId||typeof message.anchorId!=='string'||message.anchorId.length>100||!(/^(?:margin|padding)-(?:top|right|bottom|left)$|^(?:row|column)-gap$/).test(message.property))return;
    return send(tabId,0,{type:'review-open-spacing',frameId,property:message.property,anchorId:message.anchorId});
  }
  if(message.type==='review-assets'&&frameId===0){return {icons:Object.fromEntries(await Promise.all(['copyAll','record','pencil','complete','copy','more','folder','delete','edit'].map(async name=>[name,await (await fetch(chrome.runtime.getURL('assets/fix-notes/'+name+'.svg'))).text()])))};}
  if(message.type==='review-operation'&&frameId===0){
    if(!(await state(tabId)))throw Error('Inspector is closed.');
    if(!['get','stop','new','delete','export','export-all'].includes(message.operation))throw Error('Unsupported review operation.');
    const result=await reviewStore.run(tabId,message.operation,message.payload);
    if(message.operation==='new'||result.deletedActive)await broadcast(tabId,{type:'review-clear'});
    return result;
  }
  if(message.type==='review-target'&&frameId===0){
    const current=await state(tabId);
    if(!current||current.activeFrameId!==message.targetFrameId)throw Error('Select the element again.');
    return await send(tabId,message.targetFrameId,{type:'review-edit',command:message.command});
  }
  if(message.type==='review-change'){
    const current=await state(tabId);
    if(!current||current.activeFrameId!==frameId)throw Error('Selection is no longer active.');
    const event=message.event;
    if(!event||!['parameter','comment'].includes(event.kind)||!event.context||!event.identity)throw Error('Invalid review change.');
    if(event.kind==='parameter'&&!/^@[^\s<>/=]+$/.test(event.property)&&!/^(font|border|width|height|display|position|box-sizing|flex-direction|justify-content|align-items|gap|row-gap|column-gap|background-color|border-[a-z-]+|font-[a-z-]+|line-height|letter-spacing|color|margin-(top|right|bottom|left)|padding-(top|right|bottom|left))$/.test(event.property))throw Error('Unsupported property: '+event.property);
    if(event.kind==='comment'&&(typeof event.comment!=='string'||event.comment.length>20000))throw Error('Comment is too long.');
    if(event.context.url!==current.reviewContext.url||event.context.width!==current.reviewContext.width||event.context.height!==current.reviewContext.height)throw Error('Page or viewport changed. Select the element again.');
    if(frameId!==0)event.context.frameUrl=sender.url;else delete event.context.frameUrl;
    const result=await reviewStore.run(tabId,'change',event);
    if(result.started)await broadcast(tabId,{type:'review-reset-preview'});
    await send(tabId,0,{type:'review-updated',result});return result;
  }
  if(message.type==='review-compare'){
    await broadcast(tabId,{type:'review-view',after:message.after!==false});return {ok:true};
  }
  if(message.type==='toggle-pinned-inspect'&&frameId===0) {
    const current=await state(tabId);
    if(!current)return {ok:false};
    if(current.mode==='inspect'){await releaseHover(tabId);return {ok:true,mode:'use',pinned:false};}
    return {ok:true,mode:'inspect',pinned:await pinHover(tabId)};
  } else if(message.type==='release-hover'&&frameId===0) {
    await releaseHover(tabId);return {ok:true};
  } else if(message.type==='pixel-invalidate') {
    pixelCache.delete(tabId);await send(tabId,0,{type:'probe-clear'});
  } else if(message.type==='eyedropper-toggle') {
    const current=await state(tabId);
    if(current?.mode==='inspect')await send(tabId,0,{type:'eyedropper-toggle'});
  } else if(message.type==='pixel' && frameId===0) {
    const current=await state(tabId);
    if(current?.mode!=='inspect' || !current.eyedropper)return {error:'Eyedropper is inactive'};
    const {x,y,width,height}=message;
    if(![x,y,width,height].every(Number.isFinite) || width<=0 || height<=0 || x<0 || y<0 || x>=width || y>=height)return {error:'Invalid sample position'};
    const tab=await chrome.tabs.get(tabId);
    if(!tab.active || !(await chrome.windows.get(tab.windowId)).focused)return {error:'Return to this tab to sample colors'};
    let cached=pixelCache.get(tabId);
    if(!cached || Date.now()-cached.time>700 || cached.width!==width || cached.height!==height) {
      if(captureBusy || Date.now()-lastCapture<700)return {retry:true};
      captureBusy=true;
      try {
        await send(tabId,0,{type:'capture-mask',hidden:true});
        lastCapture=Date.now();
        const data=await chrome.tabs.captureVisibleTab(tab.windowId,{format:'png'});
        const active=(await chrome.tabs.query({active:true,windowId:tab.windowId}))[0];
        if(active?.id!==tabId)return {error:'Active tab changed'};
        const bitmap=await createImageBitmap(await (await fetch(data)).blob());
        const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),context=canvas.getContext('2d',{willReadFrequently:true});
        context.drawImage(bitmap,0,0);bitmap.close();
        if(!(await state(tabId))?.eyedropper)return {error:'Eyedropper is inactive'};
        cached={context,width,height,time:Date.now()};pixelCache.set(tabId,cached);
      } finally {captureBusy=false;await send(tabId,0,{type:'capture-mask',hidden:false});}
    }
    const canvas=cached.context.canvas;
    const rgba=[...cached.context.getImageData(Math.min(canvas.width-1,Math.floor(x*canvas.width/width)),Math.min(canvas.height-1,Math.floor(y*canvas.height/height)),1,1).data];
    return {rgba};
  } else if(message.type==='font' && frameId===0) {
    const file=(globalThis.designInspectTokens.fontAssets.find(font=>font.key===message.font) || globalThis.designInspectTokens.fontAssets[0]).file;
    if(!fontCache.has(file))fontCache.set(file,fetch(chrome.runtime.getURL('fonts/'+file)).then(response=>{if(!response.ok)throw Error('Inspector font unavailable');return response.arrayBuffer();}).then(buffer=>Array.from(new Uint8Array(buffer))).catch(error=>{fontCache.delete(file);throw error;}));
    return {bytes:await fontCache.get(file)};
  } else if(message.type==='pick' && frameId===0) {
    const current=await state(tabId);
    if(current?.mode==='inspect' && current.activeFrameId===message.frameId && Number.isInteger(message.nodeId))await send(tabId,current.activeFrameId,{type:'pick',nodeId:message.nodeId});
  } else if (message.type === "ready") {
    const current = await state(tabId);
    if (current) await send(tabId, frameId, {type:"configure", frameId, ...current});
    else if (frameId !== 0) await send(tabId, frameId, {type:"destroy"});
  } else if (message.type === "close" && frameId === 0) {
    pixelCache.delete(tabId);await releaseHover(tabId);await broadcast(tabId, {type:"destroy"}, 0);
  } else if (message.type === "settings" && frameId === 0) {
    const current = await state(tabId);
    if (current) {if(!current.eyedropper)pixelCache.delete(tabId);await broadcast(tabId, {type:"configure", ...current}, 0);}
  } else if (message.type === "select") {
    if (!(await state(tabId))) return;
    await send(tabId, 0, {type:"selection", frameId, url:sender.url, snapshot:message.snapshot});
    await broadcast(tabId, {type:"active", activeFrameId:frameId});
  } else if (message.type === "snapshot") {
    const current = await state(tabId);
    if (current?.activeFrameId === frameId && frameId !== 0) await send(tabId, 0, {type:"snapshot", frameId, url:sender.url, snapshot:message.snapshot});
  } else if (message.type === "shortcut") {
    const current = await state(tabId);
    if (current?.mode === "inspect") await send(tabId, current.activeFrameId, {type:"shortcut", key:message.key, shift:!!message.shift});
  } else if (message.type === "modifiers") {
    if (await state(tabId)) await broadcast(tabId, {type:"modifiers", alt:!!message.alt}, frameId);
  } else if (message.type === "open-access" && frameId === 0) {
    await chrome.windows.create({url:chrome.runtime.getURL(`frame-access.html?tab=${tabId}`), type:"popup", width:480, height:440});
  } else if (message.type === "frames-changed") {
    await attachFrames(tabId);
  }
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.channel !== channel) return;
  handle(message, sender).then(respond, error => {console.warn("Design Inspect", error); respond({error:error.message});});
  return true;
});
chrome.webNavigation.onCommitted.addListener(async ({tabId, frameId}) => {
  if(frameId===0){pixelCache.delete(tabId);await releaseHover(tabId);}
  if (frameId !== 0) {
    const current = await state(tabId);
    if (current?.activeFrameId === frameId) {
      await send(tabId, 0, {type:"frame-gone", frameId});
      await broadcast(tabId, {type:"active", activeFrameId:0});
    }
  }
});
chrome.webNavigation.onDOMContentLoaded.addListener(async ({tabId, frameId}) => {
  if (frameId !== 0 && await state(tabId)) await attachFrames(tabId);
});

chrome.debugger.onDetach.addListener(source=>{if(source.tabId!==undefined&&hoverPins.has(source.tabId)){hoverPins.delete(source.tabId);send(source.tabId,0,{type:'hover-pin-lost'});}});
chrome.tabs.onRemoved.addListener(tabId=>{pixelCache.delete(tabId);releaseHover(tabId);reviewStore.run(tabId,'close').catch(error=>console.warn('Review close:',error));});

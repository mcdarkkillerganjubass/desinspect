const assert = require('node:assert/strict');
const vm = require('node:vm');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const code=readFileSync(join(__dirname,'../background.js'),'utf8');
async function check(granted) {
  const requests=[];
  const event={addListener(){}};
  const context=vm.createContext({importScripts(){},designInspectReview:{createStore:()=>({})},console,URL,
    chrome:{runtime:{onMessage:event},action:{onClicked:event},webNavigation:{onCommitted:event,onDOMContentLoaded:event},
      debugger:{onDetach:event},tabs:{onRemoved:event},permissions:{request:options=>{requests.push(options);return Promise.resolve(granted);}}}});
  vm.runInContext(code,context);
  vm.runInContext("frameAccessOrigins.set(12,['https://frame.example/*']);globalThis.attached=0;attachFrames=async()=>{attached++;return []}",context);
  const result=vm.runInContext("handle({type:'open-access'},{tab:{id:12},frameId:0})",context);
  assert.equal(requests.length,1,'Permission requested synchronously before any await');
  assert.deepEqual(Array.from(requests[0].origins),['https://frame.example/*']);
  assert.equal((await result).granted,granted);
  assert.equal(context.attached,granted?1:0,'Attach only after approval');
  await vm.runInContext("handle({type:'open-access'},{tab:{id:12},frameId:1})",context);
  assert.equal(requests.length,1,'Subframes cannot initiate permission requests');
  vm.runInContext('frameAccessOrigins.delete(12)',context);
  const retry=await vm.runInContext("handle({type:'open-access',origins:['https://frame.example/*']},{tab:{id:12},frameId:0})",context);
  assert.equal(retry.granted,granted,'Panel retains discovered hosts across a worker restart');
  assert.equal(requests.length,2,'First click after restart still requests permission');
  await vm.runInContext("handle({type:'open-access',origins:['https://*/*','<all_urls>','garbage']},{tab:{id:12},frameId:0})",context);
  assert.equal(requests.length,2,'Reject broad or invalid fallback origins');
}
(async()=>{await check(false);await check(true);console.log('PASS: direct iframe access approval, denial, sender validation, and rediscovery');})().catch(error=>{console.error(error);process.exitCode=1;});

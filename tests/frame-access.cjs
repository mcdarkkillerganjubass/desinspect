const assert = require('node:assert/strict');
const vm = require('node:vm');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const code=readFileSync(join(__dirname,'../frame-access.js'),'utf8');
async function check(granted) {
  const messages=[], requests=[], handlers={};
  const button={disabled:true,addEventListener:(type,fn)=>handlers[type]=fn};
  const status={}, list={children:[],append(node){this.children.push(node);}};
  const document={querySelector:selector=>({'#grant':button,'#status':status,'#origins':list})[selector],createElement:()=>({})};
  const chrome={runtime:{sendMessage:async message=>{messages.push(message);return message.type==='access-info'?{origins:['https://frame.example/*']}:{ok:true};}},permissions:{request:args=>{requests.push(args);return Promise.resolve(granted);}}};
  vm.runInNewContext(code,{chrome,document,location:{search:'?tab=12'},URLSearchParams,Promise,Error});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(button.disabled,false);
  handlers.click();
  assert.equal(requests.length,1,'Permission requested synchronously in click handler');
  assert.equal(requests[0].origins[0],'https://frame.example/*');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(messages.some(m=>m.type==='refresh-frames'),granted);
  if(granted) assert.equal(button.hidden,true);
  else {assert.equal(button.disabled,false);assert.match(status.textContent,/не выдан/);}
}
(async()=>{await check(false);await check(true);console.log('PASS: frame permission approval and denial');})().catch(error=>{console.error(error);process.exitCode=1;});

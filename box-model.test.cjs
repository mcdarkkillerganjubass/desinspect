const assert=require('node:assert/strict');
require('./design-tokens.js');
require('./box-model.js');
const {splitValue,resolveRadii,insetRadii,radiusCSS}=globalThis.designInspectBox;
assert.deepEqual(splitValue('24px'),{number:'24',unit:'px'});
assert.deepEqual(splitValue('-1.5rem'),{number:'-1.5',unit:'rem'});
assert.deepEqual(splitValue('auto'),{number:'auto',unit:''});
const all=value=>({topLeft:value,topRight:value,bottomRight:value,bottomLeft:value});
const circles=resolveRadii(all('50%'),200,100);
assert.deepEqual(circles.topLeft,{x:100,y:50});
assert.deepEqual(resolveRadii(all('100px'),100,100).topLeft,{x:50,y:50},'Normalize overlapping CSS radii');
const radii=resolveRadii({topLeft:'64px',topRight:'24px',bottomRight:'0px',bottomLeft:'12px 8px'},180,100);
const inside=insetRadii(radii,{left:0,top:0,right:292,bottom:206},{left:35,top:29,right:257,bottom:177});
assert.deepEqual(inside.topLeft,{x:29,y:35});
assert.deepEqual(inside.topRight,{x:2,y:2});
assert.deepEqual(inside.bottomRight,{x:2,y:2});
assert.equal(radiusCSS(inside),'29px 2px 2px 2px / 35px 2px 2px 2px');
console.log('Box-model radius checks passed');

const capped=globalThis.designInspectBox.capRadii({...circles,topLeft:{...circles.topLeft,label:'50%'}});
assert.deepEqual(capped.topLeft,{x:24,y:24,label:'50%'});
assert.deepEqual(circles.topLeft,{x:100,y:50},'Visual cap does not mutate the actual radius');
assert.deepEqual(globalThis.designInspectBox.capRadii(radii).bottomLeft,{x:12,y:8},'Preserve smaller elliptical radii');

const {sideExpression}=globalThis.designInspectBox;
assert.equal(sideExpression('0 var(--space)','top'),'0');
assert.equal(sideExpression('0 var(--space)','left'),'var(--space)');
assert.equal(sideExpression('var(--zero)','top'),'var(--zero)');
assert.equal(sideExpression('calc(var(--space) * 2) 0','bottom'),'calc(var(--space) * 2)');

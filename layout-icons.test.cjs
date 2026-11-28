const assert=require('node:assert/strict');
require('./layout-icons.js');
const {hints,override}=globalThis.designInspectIcons;
assert.equal(Object.keys(hints).length,7);
for(const property of Object.keys(hints)) {
  assert(hints[property].length>10);
}
assert.match(override(),/<path/);
console.log('Layout icon checks passed');

const {arrangeLayout}=globalThis.designInspectIcons;
const rows=display=>[['gap',{actual:'0px'}],['display',{actual:display}],['position',{actual:'static'}],['box-sizing',{actual:'border-box'}],['flex-direction',{actual:'row'}],['justify-content',{actual:'normal'}],['align-items',{actual:'normal'}]];
const flexRows=arrangeLayout(rows('flex'));
assert.deepEqual(flexRows.map(([p])=>p),['position','box-sizing','display','gap','flex-direction','justify-content','align-items']);
assert.equal(flexRows.filter(([,v])=>v.dependsOn==='display').length,4);
assert.equal(arrangeLayout(rows('grid')).find(([p])=>p==='flex-direction')[1].dependsOn,undefined);
assert.equal(arrangeLayout(rows('grid')).filter(([,v])=>v.dependsOn).length,3);
for(const display of ['block','none','contents'])assert(arrangeLayout(rows(display)).every(([,v])=>!v.dependsOn));
assert(arrangeLayout(rows('flex'),{hasBox:false}).every(([,v])=>!v.dependsOn));
assert(arrangeLayout(rows('flex').filter(([p])=>p!=='display')).every(([,v])=>!v.dependsOn));
assert(rows('flex').every(([,v])=>!v.dependsOn),'Source values are not mutated');

const assert=require('node:assert/strict');
require('./layout-icons.js');
const {hints,eye,override}=globalThis.designInspectIcons;
assert.equal(Object.keys(hints).length,7);
for(const property of Object.keys(hints)) {
  assert(hints[property].length>10);
}
assert.notEqual(eye(true),eye(false));
assert.match(override(),/<path/);
console.log('Layout icon checks passed');

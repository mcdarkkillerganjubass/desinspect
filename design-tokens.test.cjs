const assert=require('node:assert/strict');
const fs=require('node:fs');
require('./design-tokens.js');
const tokens=globalThis.designInspectTokens;
assert.deepEqual(Object.keys(tokens.themes.light).sort(),Object.keys(tokens.themes.dark).sort());
assert(Object.isFrozen(tokens.values));
assert(Object.isFrozen(tokens.themes.dark));
assert.equal(tokens.get('color-surface-panel'),'#ffffff');
assert.notEqual(tokens.get('color-surface-panel','dark'),tokens.get('color-surface-panel'));
assert.throws(()=>tokens.get('missing'));
for(const asset of tokens.fontAssets)assert(fs.existsSync(`fonts/${asset.file}`));
for(const file of ['inspect.js','review-panel.js','figma-icons.js','design-tokens.js']){
  const source=fs.readFileSync(file,'utf8');
  for(const match of source.matchAll(/var\(--di-([\w-]+)/g))assert.doesNotThrow(()=>tokens.get(match[1]),`${file}: ${match[1]}`);
}
const properties=new Map();
tokens.applyTo({style:{setProperty:(key,value)=>properties.set(key,value)}},'dark');
assert.equal(properties.get('--di-color-surface-panel'),tokens.get('color-surface-panel','dark'));
console.log('Semantic tokens and theme references passed');

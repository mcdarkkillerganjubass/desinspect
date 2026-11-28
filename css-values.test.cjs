const assert = require('node:assert/strict');
require('./css-values.js');
const {format, specificity, sourceReader, tokenLabel, displayValue, groupTypography} = globalThis.designInspectCSS;
assert.equal(tokenLabel('var(--tui-font-text-m)'), 'tui-font-text-m');
assert.equal(tokenLabel('calc(var(--space) * 2)'), 'calc(space * 2)');
assert.equal(tokenLabel('var(--space, var(--fallback, 16px))'), 'space (fallback: fallback (fallback: 16px))');
assert.equal(displayValue(''), '—');
assert.equal(displayValue('rgba(0, 0, 0, 0)',true), '—');
assert.equal(displayValue('rgb(0 0 0 / 0%)',true), '—');
assert.equal(displayValue('rgba(0, 0, 0, 0.5)',true), 'rgba(0, 0, 0, 0.5)');
assert.equal(displayValue('0px'), '0px');
assert.equal(displayValue('none'), 'none');
const typography=groupTypography([
  ['font-family',{token:'var(--font)',actual:'sans-serif',fontSource:'font-1'}],
  ['font-size',{token:'var(--font)',actual:'13px',fontSource:'font-1'}],
  ['font-weight',{token:'var(--weight)',actual:'700',longhandSource:true}],
]);
assert.equal(typography.length,2);
assert.equal(typography[0][0],'font');
assert.equal(typography[0][1].descriptions.length,2);
assert.equal(typography[1][0],'font-weight');
assert.equal(typography[1][1].overrideOf,'var(--font)');
assert.equal(groupTypography([
  ['font-family',{token:'var(--font)',actual:'serif',fontSource:'font-1'}],
  ['font-size',{token:'var(--font)',actual:'13px',fontSource:'font-2'}],
]).length,2);
assert.equal(format('16px 32px', 'rem', {root:16}), '1rem 2rem');
assert.equal(format('16px', 'em', {element:8,parent:32}, 'font-size'), '0.5em');
assert.equal(format('16px', 'em', {element:8,parent:32}, 'padding-top'), '2em');
assert.equal(format('"16px font" 16px', 'rem', {root:16}), '"16px font" 1rem');
assert.equal(format('rgb(16, 32, 48)', 'rem'), 'rgb(16, 32, 48)');
assert.equal(format('16px', 'auto'), '16px');
assert.deepEqual(specificity(':where(#app, [data-x]) .card'), [0,1,0]);
assert.deepEqual(specificity(':is(.card, #app) button:hover'), [1,1,1]);
assert.deepEqual(specificity('div[data-x="a,b"] > .card::before'), [0,2,2]);
const style = (values, important = []) => ({getPropertyValue:p => values[p] || '', getPropertyPriority:p => important.includes(p) ? 'important' : ''});
const rule = (selectorText, values, important) => ({constructor:{name:'CSSStyleRule'}, selectorText, style:style(values,important)});
const sheet = cssRules => ({cssRules});
const el = {style:style({}), matches:s => ['.card','#card','button'].includes(s.trim())};
let reader = sourceReader({styleSheets:[sheet([
  rule('#card', {'padding':'var(--space)'}),
  rule('button', {'padding-top':'2px'}),
  rule('.card', {'color':'var(--color)'}, ['color']),
]) ]});
assert.equal(reader.read(el,'padding-top').value, 'var(--space)');
el.style = style({'color':'red'});
assert.equal(reader.read(el,'color').value, 'var(--color)');
const layer = (name, cssRules) => ({constructor:{name:'CSSLayerBlockRule'}, name, cssRules});
reader = sourceReader({styleSheets:[sheet([
  layer('base', [rule('.card', {'gap':'var(--base)'})]),
  layer('theme', [rule('.card', {'gap':'var(--theme)'})]),
])]});
assert.equal(reader.read(el,'gap').value,'var(--theme)');
reader = sourceReader({styleSheets:[sheet([
  layer('base', [rule('.card', {'gap':'var(--base)'},['gap'])]),
  layer('theme', [rule('.card', {'gap':'var(--theme)'},['gap'])]),
  rule('#card', {'gap':'100px'},['gap']),
])]});
assert.equal(reader.read(el,'gap').value,'var(--base)');
const blocked = {get cssRules(){throw new Error('SecurityError');}};
assert.equal(sourceReader({styleSheets:[blocked]}).incomplete,true);
const partial=style({'font-weight':'var(--weight)'});
partial.cssText='font: var(--font-ui); font-weight: var(--weight);';
reader=sourceReader({styleSheets:[sheet([{constructor:{name:'CSSStyleRule'},selectorText:'.card',style:partial}])]});
assert.equal(reader.read(el,'font-family').value,'var(--font-ui)');
assert.equal(reader.read(el,'font-size').declaration,'font');
assert.equal(reader.read(el,'font-weight').value,'var(--weight)');
console.log('CSS value checks passed');

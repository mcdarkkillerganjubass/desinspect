const assert = require('node:assert/strict');
require('./geometry.js');
const rect = (left, top, right, bottom) => ({left, top, right, bottom});
const measure = globalThis.designInspectGeometry;
assert.deepEqual(measure(rect(0,0,100,50), rect(124,70,200,120)), {x:[100,124],y:[50,70]});
assert.deepEqual(measure(rect(124,70,200,120), rect(0,0,100,50)), {x:[100,124],y:[50,70]});
assert.deepEqual(measure(rect(0,0,100,100), rect(16,24,84,76)), {x:[0,16],y:[0,24]});
assert.deepEqual(measure(rect(0,0,100,100), rect(0,0,100,100)), {x:[0,0],y:[0,0]});
assert.deepEqual(measure(rect(0,0,10.5,10), rect(12,0,20,10)), {x:[10.5,12],y:[0,0]});
const routes = measure.routes;
assert.deepEqual(routes(rect(0,0,100,50),rect(124,70,200,120)),[
  {axis:'x',distance:24,start:[100,25],corner:[124,25],end:[124,95]},
  {axis:'y',distance:20,start:[50,50],corner:[50,70],end:[162,70]},
]);
assert.deepEqual(routes(rect(124,70,200,120),rect(0,0,100,50)),[
  {axis:'x',distance:24,start:[124,95],corner:[100,95],end:[100,25]},
  {axis:'y',distance:20,start:[162,70],corner:[162,50],end:[50,50]},
]);
assert.equal(routes(rect(0,0,100,50),rect(124,0,200,50)).length,1);
assert.equal(routes(rect(0,0,100,50),rect(0,0,100,50)).length,0);
assert.deepEqual(routes(rect(0,0,100,100),rect(16,24,84,76))[0],{axis:'x',distance:16,start:[0,50],corner:[16,50],end:[16,50]});
const positions=measure.labelPositions;
const bounds={width:400,height:300};
const labels=positions([{x:100,y:100,width:40,height:18},{x:100,y:100,width:40,height:18}],bounds);
assert(labels[0].y+labels[0].height+6<=labels[1].y || labels[1].y+labels[1].height+6<=labels[0].y || labels[0].x+labels[0].width+6<=labels[1].x || labels[1].x+labels[1].width+6<=labels[0].x);
assert.deepEqual(positions([{x:-20,y:-10,width:40,height:18}],bounds)[0],{x:4,y:4,width:40,height:18});
assert.equal(positions([{x:270,y:100,width:40,height:18}],bounds,[{x:250,y:0,width:150,height:300}])[0].x,204);
const tight=positions([{x:10,y:15,width:70,height:16},{x:10,y:15,width:70,height:16}],{width:100,height:48});
assert(tight[0].y+tight[0].height+6<=tight[1].y);
console.log('Geometry and label-placement checks passed');

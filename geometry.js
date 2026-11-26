(() => {
  // Overlapping axes measure the nearest pair of corresponding edges.
  const axis = (a0, a1, b0, b1) => {
    if (a1 <= b0) return [a1, b0];
    if (b1 <= a0) return [a0, b1];
    return Math.abs(a0 - b0) <= Math.abs(a1 - b1) ? [a0, b0] : [a1, b1];
  };
  globalThis.designInspectGeometry = (a, b) => ({
    x: axis(a.left, a.right, b.left, b.right).sort((x,y) => x-y),
    y: axis(a.top, a.bottom, b.top, b.bottom).sort((x,y) => x-y),
  });
  globalThis.designInspectGeometry.routes = (a, b) => {
    const [ax,bx] = axis(a.left,a.right,b.left,b.right);
    const [ay,by] = axis(a.top,a.bottom,b.top,b.bottom);
    const acx = (a.left+a.right)/2, acy = (a.top+a.bottom)/2;
    const bcx = (b.left+b.right)/2, bcy = (b.top+b.bottom)/2;
    return [
      {axis:"x",distance:Math.abs(bx-ax),start:[ax,acy],corner:[bx,acy],end:[bx,bcy]},
      {axis:"y",distance:Math.abs(by-ay),start:[acx,ay],corner:[acx,by],end:[bcx,by]},
    ].filter(route => route.distance > 0);
  };
  globalThis.designInspectGeometry.labelPositions=(labels,viewport,obstacles=[])=> {
    const gap=6,margin=4;
    const clamp=r=>({...r,x:Math.max(margin,Math.min(r.x,viewport.width-r.width-margin)),y:Math.max(margin,Math.min(r.y,viewport.height-r.height-margin))});
    const intersects=(a,b)=>a.x<b.x+b.width+gap && a.x+a.width+gap>b.x && a.y<b.y+b.height+gap && a.y+a.height+gap>b.y;
    const placed=[];
    for(const label of labels) {
      const avoid=[...obstacles,...placed],origin=clamp(label),candidates=[origin];
      for(const other of avoid)candidates.push(...[
        {x:origin.x,y:other.y+other.height+gap},{x:origin.x,y:other.y-origin.height-gap},
        {x:other.x+other.width+gap,y:origin.y},{x:other.x-origin.width-gap,y:origin.y},
      ].map(position=>clamp({...label,...position})));
      candidates.sort((a,b)=>(a.x-label.x)**2+(a.y-label.y)**2-((b.x-label.x)**2+(b.y-label.y)**2));
      placed.push(candidates.find(candidate=>avoid.every(other=>!intersects(candidate,other))) || origin);
    }
    if(placed.length===2 && intersects(placed[0],placed[1])) {
      const [a,b]=placed;
      const pairs=[];
      if(a.height+b.height+gap<=viewport.height-2*margin)pairs.push([{...a,y:margin},{...b,y:margin+a.height+gap}]);
      if(a.width+b.width+gap<=viewport.width-2*margin)pairs.push([{...a,x:margin},{...b,x:margin+a.width+gap}]);
      const free=pairs.find(pair=>pair.every(r=>obstacles.every(other=>!intersects(r,other))));
      if(free)return free;
    }
    return placed;
  };
})();

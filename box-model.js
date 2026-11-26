(() => {
  const corners=['topLeft','topRight','bottomRight','bottomLeft'];
  function splitValue(value) {
    const match=String(value).trim().match(/^(-?(?:\d*\.)?\d+)([a-z%]+)$/i);
    return match ? {number:match[1],unit:match[2]} : {number:value,unit:''};
  }
  function resolveRadii(values,width,height) {
    const length=(text,basis)=> {
      const match=String(text).match(/^(\d*\.?\d+)(px|%)?$/);
      return match ? Number(match[1])*(match[2]==='%'?basis/100:1) : 0;
    };
    const result={};
    for(const corner of corners) {
      const [x,y]=String(values[corner] || '0').trim().split(/\s+/);
      result[corner]={x:length(x,width),y:length(y || x,height)};
    }
    const {topLeft:a,topRight:b,bottomRight:c,bottomLeft:d}=result;
    const fit=(size,sum)=>sum>0?size/sum:1;
    const scale=Math.min(1,fit(width,a.x+b.x),fit(width,d.x+c.x),fit(height,a.y+d.y),fit(height,b.y+c.y));
    for(const radius of Object.values(result)){radius.x*=scale;radius.y*=scale;}
    return result;
  }
  function insetRadii(radii,outer,inner) {
    const offsets={
      topLeft:[inner.left-outer.left,inner.top-outer.top],
      topRight:[outer.right-inner.right,inner.top-outer.top],
      bottomRight:[outer.right-inner.right,outer.bottom-inner.bottom],
      bottomLeft:[inner.left-outer.left,outer.bottom-inner.bottom],
    };
    return Object.fromEntries(corners.map(corner=>[corner,{x:Math.max(2,radii[corner].x-offsets[corner][0]),y:Math.max(2,radii[corner].y-offsets[corner][1])}]));
  }
  const radiusCSS=radii=>corners.map(c=>`${radii[c].x}px`).join(' ')+' / '+corners.map(c=>`${radii[c].y}px`).join(' ');
  globalThis.designInspectBox={splitValue,resolveRadii,insetRadii,radiusCSS};
})();

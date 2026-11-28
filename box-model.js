(() => {
  const tokens=globalThis.designInspectTokens;
  const corners=['topLeft','topRight','bottomRight','bottomLeft'];
  function splitValue(value) {
    const match=String(value).trim().match(/^(-?(?:\d*\.)?\d+)([a-z%]+)$/i);
    return match ? {number:match[1],unit:match[2]} : {number:value,unit:''};
  }
  function sideExpression(expression,side) {
    const tokens=[];let depth=0,start=0;
    for(let i=0;i<=expression.length;i++){
      const c=expression[i];if(c==='(')depth++;else if(c===')')depth--;
      if(i===expression.length || (!depth && /\s/.test(c))){const token=expression.slice(start,i).trim();if(token)tokens.push(token);start=i+1;}
    }
    if(tokens.length<1 || tokens.length>4)return expression;
    const [a,b=a,c=a,d=b]=tokens;return {top:a,right:b,bottom:c,left:d}[side] || expression;
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
    return Object.fromEntries(corners.map(corner=>[corner,{x:Math.max(tokens.number('radius-box-inner-min'),radii[corner].x-offsets[corner][0]),y:Math.max(tokens.number('radius-box-inner-min'),radii[corner].y-offsets[corner][1])}]));
  }
  const capRadii=(radii,max=tokens.number('radius-box-max'))=>Object.fromEntries(corners.map(c=>[c,{...radii[c],x:Math.min(max,Math.max(0,radii[c].x)),y:Math.min(max,Math.max(0,radii[c].y))}]));
  const radiusCSS=radii=>corners.map(c=>`${radii[c].x}px`).join(' ')+' / '+corners.map(c=>`${radii[c].y}px`).join(' ');
  globalThis.designInspectBox={splitValue,resolveRadii,insetRadii,radiusCSS,capRadii,sideExpression};
})();

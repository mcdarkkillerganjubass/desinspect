(() => {
  const rect=(left,top,right,bottom)=>({left,top,right,bottom,width:Math.max(0,right-left),height:Math.max(0,bottom-top)});
  const tag=(r,key,value)=>Object.defineProperty(r,key,{value});
  const directional=(r,axis)=>r.axis===axis?r:tag(r,'axis',axis);
  const inset=(r,s)=>rect(r.left+s.left,r.top+s.top,Math.max(r.left+s.left,r.right-s.right),Math.max(r.top+s.top,r.bottom-s.bottom));
  const bands=(outer,inner)=>[
    tag(rect(outer.left,outer.top,outer.right,inner.top),'side','top'),tag(rect(outer.left,inner.bottom,outer.right,outer.bottom),'side','bottom'),
    tag(rect(outer.left,inner.top,inner.left,inner.bottom),'side','left'),tag(rect(inner.right,inner.top,outer.right,inner.bottom),'side','right'),
  ].filter(r=>r.width>0 && r.height>0);
  function regions(bounds,margin,border,padding) {
    const outside=rect(bounds.left-Math.max(0,margin.left),bounds.top-Math.max(0,margin.top),bounds.right+Math.max(0,margin.right),bounds.bottom+Math.max(0,margin.bottom));
    const inside=inset(bounds,border),content=inset(inside,padding);
    return {margin:bands(outside,bounds),padding:bands(inside,content),content};
  }
  const union=items=>rect(Math.min(...items.map(r=>r.left)),Math.min(...items.map(r=>r.top)),Math.max(...items.map(r=>r.right)),Math.max(...items.map(r=>r.bottom)));
  function intersection(a,b) {
    const r=rect(Math.max(a.left,b.left),Math.max(a.top,b.top),Math.min(a.right,b.right),Math.min(a.bottom,b.bottom));
    return r.width>0 && r.height>0 ? r : null;
  }
  function subtract(a,b) {
    const overlap=intersection(a,b);
    return (overlap ? bands(a,overlap) : [a]).map(r=>directional(r,a.axis));
  }
  function gutter(a,b,gap,axis,cross) {
    if(!(gap>0))return null;
    const start=axis==='x' ? a.right : a.bottom, end=axis==='x' ? b.left : b.top;
    const width=Math.min(gap,end-start);
    if(width<=.01)return null;
    const middle=(start+end)/2;
    return directional(axis==='x' ? rect(middle-width/2,cross.top,middle+width/2,cross.bottom) : rect(cross.left,middle-width/2,cross.right,middle-width/2+width),axis);
  }
  function trackBands(content,sizes,gap,axis,alignment,rtl=false) {
    if(!sizes || sizes.length<2 || sizes.some(size=>!(size>0)) || !(gap>0))return [];
    const available=axis==='x' ? content.width : content.height;
    const free=Math.max(0,available-sizes.reduce((sum,n)=>sum+n,0)-gap*(sizes.length-1));
    let offset=0,extra=0;
    if(alignment.includes('center'))offset=free/2;
    else if(alignment.includes('space-between'))extra=free/(sizes.length-1);
    else if(alignment.includes('space-around')) {extra=free/sizes.length;offset=extra/2;}
    else if(alignment.includes('space-evenly')) {extra=free/(sizes.length+1);offset=extra;}
    else if(/end|right/.test(alignment))offset=free;
    if(rtl && !alignment.includes('space-') && !alignment.includes('center'))offset=free-offset;
    const tracks=rtl ? [...sizes].reverse() : sizes;
    let cursor=(axis==='x' ? content.left : content.top)+offset;
    const result=[];
    for(let i=0;i<tracks.length-1;i++) {
      cursor+=tracks[i];
      const start=cursor+extra/2;
      result.push(directional(axis==='x' ? rect(start,content.top,start+gap,content.bottom) : rect(content.left,start,content.right,start+gap),axis));
      cursor+=gap+extra;
    }
    return result;
  }
  function gaps(content,items,config) {
    let result=[];
    if(config.display.includes('grid')) {
      result=[...trackBands(content,config.columns,config.columnGap,'x',config.justify,config.rtl),...trackBands(content,config.rows,config.rowGap,'y',config.align)];
    } else if(config.display.includes('flex') && items.length>1) {
      const column=config.direction.startsWith('column'),axis=column?'y':'x';
      const reverse=config.direction.includes('reverse') !== (!column && config.rtl);
      const mainStart=r=>column ? r.top : r.left;
      const lines=[[]];
      for(const item of items) {
        const line=lines.at(-1),previous=line.at(-1);
        if(config.wrap!=='nowrap' && previous && (mainStart(item.outer)-mainStart(previous.outer))*(reverse?-1:1)<-.5)lines.push([]);
        lines.at(-1).push(item);
      }
      for(const line of lines) {
        const sorted=line.map(item=>item.outer).sort((a,b)=>mainStart(a)-mainStart(b));
        const cross=union(sorted);
        for(let i=0;i<sorted.length-1;i++)result.push(gutter(sorted[i],sorted[i+1],column?config.rowGap:config.columnGap,axis,cross));
      }
      const lineBounds=lines.map(line=>union(line.map(item=>item.outer))).sort((a,b)=>column?a.left-b.left:a.top-b.top);
      for(let i=0;i<lineBounds.length-1;i++)result.push(gutter(lineBounds[i],lineBounds[i+1],column?config.columnGap:config.rowGap,column?'x':'y',content));
    }
    result=result.filter(Boolean).map(r=>{const clipped=intersection(r,content);return clipped?directional(clipped,r.axis):null;}).filter(Boolean);
    // Spanning grid items and overflowing children can cover a declared gutter.
    for(const item of items)result=result.flatMap(r=>subtract(r,item.bounds));
    return result;
  }
  const number=value=>Number.isFinite(parseFloat(value)) ? parseFloat(value) : 0;
  function measure(el,host) {
    const view=el.ownerDocument.defaultView,css=view.getComputedStyle(el),bounds=el.getBoundingClientRect();
    if(el.getClientRects().length>1)return null;
    for(let parent=el;parent;parent=parent.parentElement) {
      const style=view.getComputedStyle(parent),transform=style.transform;
      if(style.rotate!=='none' || style.perspective!=='none' || (style.scale!=='none' && style.scale.split(/\s+/).some(value=>number(value)<=0)))return null;
      if(transform!=='none') {
        const m=new view.DOMMatrixReadOnly(transform);
        if(!m.is2D || m.a<=0 || m.d<=0 || Math.abs(m.b)>.0001 || Math.abs(m.c)>.0001)return null;
      }
    }
    const sides=['top','right','bottom','left'];
    const values=prefix=>Object.fromEntries(sides.map(side=>[side,number(css.getPropertyValue(prefix==='border'?`border-${side}-width`:`${prefix}-${side}`))]));
    const margin=values('margin'),border=values('border'),padding=values('padding');
    const width=el.offsetWidth || (Number.isFinite(parseFloat(css.width)) ? number(css.width)+(css.boxSizing==='border-box'?0:padding.left+padding.right+border.left+border.right) : bounds.width);
    const height=el.offsetHeight || (Number.isFinite(parseFloat(css.height)) ? number(css.height)+(css.boxSizing==='border-box'?0:padding.top+padding.bottom+border.top+border.bottom) : bounds.height);
    const sx=width>0?bounds.width/width:1,sy=height>0?bounds.height/height:1;
    const scale=values=>Object.fromEntries(sides.map(side=>[side,values[side]*(['left','right'].includes(side)?sx:sy)]));
    const result=regions(bounds,scale(margin),scale(border),scale(padding));
    result.values={margin:Object.fromEntries(sides.map(side=>[side,css.getPropertyValue(`margin-${side}`)])),padding:Object.fromEntries(sides.map(side=>[side,css.getPropertyValue(`padding-${side}`)])),gap:{column:css.columnGap,row:css.rowGap}};
    result.gap=[];
    if(!/flex|grid/.test(css.display) || css.writingMode!=='horizontal-tb')return result;
    if([...el.childNodes].some(node=>node.nodeType===3 && node.textContent.trim()))return result;
    const children=[...el.children].filter(child=>child!==host);
    // shortcut: cap child scanning; large containers need cached layout snapshots.
    if(children.length>200)return result;
    const items=[];
    for(const child of children) {
      const style=view.getComputedStyle(child),r=child.getBoundingClientRect();
      if(style.display==='contents')return result;
      if(['absolute','fixed'].includes(style.position) || !r.width || !r.height)continue;
      if(style.transform!=='none' || style.rotate!=='none' || style.scale!=='none' || style.translate!=='none')return result;
      items.push({bounds:r,order:number(style.order),outer:rect(r.left-number(style.marginLeft)*sx,r.top-number(style.marginTop)*sy,r.right+number(style.marginRight)*sx,r.bottom+number(style.marginBottom)*sy)});
    }
    items.sort((a,b)=>a.order-b.order);
    const gap=(value,base,scale)=>/^[\d.]+%$/.test(value) ? number(value)*base/100 : /^[\d.]+px$/.test(value)?number(value)*scale:0;
    const tracks=(value,scale)=> {
      const tokens=value.replace(/\[[^\]]*\]/g,'').trim().split(/\s+/);
      return tokens.length<=100 && tokens.every(token=>/^[\d.]+px$/.test(token)) ? tokens.map(token=>number(token)*scale) : null;
    };
    result.gap=gaps(result.content,items,{display:css.display,direction:css.flexDirection,wrap:css.flexWrap,rtl:css.direction==='rtl',columnGap:gap(css.columnGap,result.content.width,sx),rowGap:gap(css.rowGap,result.content.height,sy),columns:tracks(css.gridTemplateColumns,sx),rows:tracks(css.gridTemplateRows,sy),justify:css.justifyContent,align:css.alignContent});
    return result;
  }
  globalThis.designInspectSpacing={regions,gaps,measure};
})();

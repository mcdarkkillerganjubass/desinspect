(function(root) {
  const sides=['top','right','bottom','left'];
  const properties=['font','border','border-width','border-style','border-color',...sides.map(side=>'border-'+side),'width','height','display','position','box-sizing','flex-direction','justify-content','align-items','gap','row-gap','column-gap','background-color','border-radius','font-family','font-size','font-weight','line-height','letter-spacing','color',
    ...sides.flatMap(side=>['margin-'+side,'padding-'+side,...['width','style','color'].map(part=>`border-${side}-${part}`)]),
    ...['top-left','top-right','bottom-left','bottom-right'].map(c=>`border-${c}-radius`)];
  const family=p=>p.startsWith('border-')?'border':p.startsWith('font-')||p==='line-height'?'font':p.endsWith('gap')?'gap':p.split('-')[0]==='margin'?'margin':p.split('-')[0]==='padding'?'padding':p;
  function entries(style,key){
    // Pending variable-backed shorthands have empty CSSOM longhands; keep authored declarations.
    const declarations=[];let start=0,quote='',depth=0,escaped=false;
    const text=style.cssText+';';
    for(let i=0;i<text.length;i++){
      const c=text[i];if(escaped){escaped=false;continue;}if(c==='\\'){escaped=true;continue;}
      if(quote){if(c===quote)quote='';continue;}if(c==='"'||c==="'"){quote=c;continue;}
      if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth--;
      if(c===';'&&!depth){const declaration=text.slice(start,i),colon=declaration.indexOf(':');start=i+1;if(colon<0)continue;
        const p=declaration.slice(0,colon).trim(),raw=declaration.slice(colon+1).trim(),important=/\s*!important\s*$/i.test(raw);
        if(family(p)===key)declarations.push([p,raw.replace(/\s*!important\s*$/i,''),important?'important':'']);
      }
    }
    return declarations;
  }
  function create(document) {
    const elements=new Map(),attributes=new Map();let active='',after=true,lost=false;
    function state(el,p){
      if(!elements.has(el))elements.set(el,new Map());
      const groups=elements.get(el),key=family(p);
      if(!groups.has(key)){const base=entries(el.style,key);groups.set(key,{base,expected:JSON.stringify(base),targets:new Map(),lost:false});}
      return groups.get(key);
    }
    function render(){
      for(const [el,values]of attributes){
        if(!el.isConnected){attributes.delete(el);lost=true;continue;}
        for(const [name,s]of values){
          if(el.getAttribute(name)!==s.expected){s.contexts.clear();s.original=el.getAttribute(name);lost=true;}
          const value=after?s.contexts.get(active)?.expression??s.original:s.original;
          if(value===null)el.removeAttribute(name);else el.setAttribute(name,value);s.expected=value;
        }
      }
      for(const [el,groups]of elements){
        if(!el.isConnected){elements.delete(el);lost=true;continue;}
        for(const [key,s]of groups){
          const styleAttribute=attributes.get(el)?.get('style');
          if(styleAttribute){const baseline=document.createElement('span').style;baseline.cssText=styleAttribute.original||'';s.base=entries(baseline,key);s.expected=JSON.stringify(entries(el.style,key));if(after&&styleAttribute.contexts.has(active))continue;}
          if(s.lost)continue;
          const current=entries(el.style,key);
          if(JSON.stringify(current)!==s.expected){
            const expected=JSON.parse(s.expected),expectedByName=new Map(expected.map(entry=>[entry[0],JSON.stringify(entry)]));
            const external=current.filter(entry=>expectedByName.get(entry[0])!==JSON.stringify(entry));
            const removed=expected.filter(([p])=>!current.some(([name])=>name===p));
            for(const [p]of current)el.style.removeProperty(p);
            for(const [p,v,priority]of s.base)el.style.setProperty(p,v,priority);
            for(const [p]of removed)el.style.removeProperty(p);
            for(const [p,v,priority]of external)el.style.setProperty(p,v,priority);
            s.targets.clear();s.lost=true;lost=true;continue;
          }
          for(const [p]of entries(el.style,key))el.style.removeProperty(p);
          for(const [p,v,priority]of s.base)el.style.setProperty(p,v,priority);
          if(after)for(const [p,contexts]of [...s.targets].sort((a,b)=>a[0].split('-').length-b[0].split('-').length)){const target=contexts.get(active);if(target)el.style.setProperty(p,target.expression,'important');}
          s.expected=JSON.stringify(entries(el.style,key));
        }
      }
      for(const [el,values]of attributes)if(values.has('style'))values.get('style').expected=el.getAttribute('style');
    }
    function setContext(key){if(active!==key){active=key;render();}}
    function compare(value){after=value;render();}
    function target(el,p){if(p.startsWith('@'))return attributes.get(el)?.get(p.slice(1))?.contexts.get(active);return elements.get(el)?.get(family(p))?.targets.get(p)?.get(active);}
    function prepare(el,p,expression,readSource){
      if(p.startsWith('@')){
        const name=p.slice(1);if(!el.isConnected||!el.hasAttribute(name)&&!attributes.get(el)?.has(name))throw Error('Attribute is no longer available.');
        if(!attributes.has(el))attributes.set(el,new Map());const values=attributes.get(el);
        if(!values.has(name)){const wasAfter=after;after=false;render();const original=el.getAttribute(name);after=wasAfter;render();values.set(name,{original,expected:el.getAttribute(name),contexts:new Map()});}
        const original=values.get(name).original;return {original:{computed:original,type:'attribute'},expression,remove:expression===original};
      }
      if(!properties.includes(p)||!el.isConnected)throw Error('Select a connected element and supported property.');
      if(typeof expression!=='string'||!expression.trim()||!document.defaultView.CSS.supports(p,expression))throw Error(`Invalid value for ${p}.`);
      const s=state(el,p);if(s.lost)throw Error('The website replaced this preview. Select the element again after reopening the inspector.');
      const previous=target(el,p);const currentStyles=new Map((p==='border-width'?sides.map(side=>`border-${side}-style`):[p.replace(/width$/,'style')]).map(property=>[property,document.defaultView.getComputedStyle(el).getPropertyValue(property)]));const wasAfter=after;
      after=false;render();
      let original;
      try{const source=readSource?.(el,p);original=previous?.original||{computed:document.defaultView.getComputedStyle(el).getPropertyValue(p),sourceExpression:source?.value,sourceProperty:source?.declaration};}
      finally{after=wasAfter;render();}
      const parser=document.createElement('span').style;parser.setProperty(p,expression);const normalized=parser.getPropertyValue(p);
      parser.setProperty(p,original.computed);const baseline=parser.getPropertyValue(p);
      const prepared={original,expression:expression.trim(),remove:normalized===baseline||expression.trim()===original.sourceExpression};
      if(/^border-(?:(?:top|right|bottom|left)-)?width$/.test(p)&&!prepared.remove){
        prepared.autoStyles=(previous?.autoStyles||[]).filter(item=>target(el,item.property)?.automaticFor===p);
        if(!/^0(?:[a-z%]+)?$/i.test(normalized))for(const [property,style]of currentStyles)if(['none','hidden'].includes(style)){const stylePrepared=prepare(el,property,'solid',readSource);stylePrepared.automaticFor=p;prepared.autoStyles.push({property,prepared:stylePrepared});}
      }
      return prepared;
    }
    function commit(el,p,prepared){
      if(p.startsWith('@')){const s=attributes.get(el).get(p.slice(1));if(prepared.remove)s.contexts.delete(active);else s.contexts.set(active,prepared);render();return el.getAttribute(p.slice(1));}
      if(prepared.remove){reset(el,p);return document.defaultView.getComputedStyle(el).getPropertyValue(p);}
      if(!prepared.automaticFor&&['border','border-style','border-top','border-right','border-bottom','border-left'].includes(p))for(const s of elements.get(el)?.values()||[])for(const [property,contexts]of s.targets)if(contexts.get(active)?.automaticFor&&(p==='border'||p==='border-style'||property===p+'-style'))contexts.delete(active);
      for(const item of prepared.autoStyles||[])commit(el,item.property,item.prepared);
      const s=state(el,p);if(!s.targets.has(p))s.targets.set(p,new Map());
      s.targets.get(p).set(active,prepared);
      render();
      return document.defaultView.getComputedStyle(el).getPropertyValue(p);
    }
    function preview(el,p,prepared){
      const styles=[...elements.values()].flatMap(groups=>[...groups.values()].map(s=>[s,new Map([...s.targets].map(([property,contexts])=>[property,new Map(contexts)]))]));
      const attrs=[...attributes.values()].flatMap(values=>[...values.values()].map(s=>[s,new Map(s.contexts)]));
      try{return commit(el,p,prepared);}finally{for(const [s,targets]of styles)s.targets=targets;for(const [s,contexts]of attrs)s.contexts=contexts;render();}
    }
    function fontSource(el,p){
      const group=elements.get(el)?.get('font');if(!group||group.lost||(p&&target(el,p))||group.base.some(([name])=>name===p))return;
      const value=target(el,'font')?.expression||group.base.find(([name])=>name==='font')?.[1];
      if(value&&/var\(/.test(value))return {value,declaration:'font',element:el,style:group.base};
    }
    function reset(el,p){const previous=target(el,p);for(const item of previous?.autoStyles||[])if(target(el,item.property)?.automaticFor===p)reset(el,item.property);if(p.startsWith('@')){attributes.get(el)?.get(p.slice(1))?.contexts.delete(active);render();return;}state(el,p).targets.get(p)?.delete(active);render();}
    function clear(){after=false;render();elements.clear();attributes.clear();after=true;lost=false;}
    function count(){
      if([...attributes].some(([el,values])=>!el.isConnected||[...values].some(([name,s])=>el.getAttribute(name)!==s.expected))||[...elements].some(([el,groups])=>!el.isConnected||[...groups].some(([key,s])=>!s.lost&&JSON.stringify(entries(el.style,key))!==s.expected)))render();
      let n=0;for(const values of attributes.values())for(const s of values.values())if(s.contexts.has(active))n++;for(const groups of elements.values())for(const s of groups.values())if(!s.lost)for(const contexts of s.targets.values())if(contexts.has(active))n++;return n;
    }
    return {setContext,compare,target,prepare,commit,reset,clear,count,fontSource,preview,get lost(){return lost;}};
  }
  const api={create,properties};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.designInspectOverrides=api;
})(globalThis);

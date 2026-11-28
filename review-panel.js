(function(root) {
  function install(shadow,panel,{request,edit,compare,refresh,assets,colorPreview,icon}) {
    const model=root.designInspectReview;
    const style=document.createElement('style');style.textContent=`
      .panel>.reviews { display:flex; flex-direction:column; flex:none; min-height:0; overflow:hidden; padding:var(--di-space-group); gap:var(--di-space-inline-tight); border-radius:var(--di-radius-section-outer) var(--di-radius-section-outer) 0 0; background:var(--di-color-surface-panel); }
      .review-notes-header { display:flex; align-items:center; justify-content:space-between; flex:none; min-height:28px; padding:var(--di-space-related) 0; gap:var(--di-space-related); }
      .reviews.is-empty .review-notes-header { min-height:32px; }
      .reviews.is-empty.is-compact .review-notes-header { min-height:20px; padding:0; }
      .review-notes-title { margin:0; padding:0; font:var(--di-font-weight-medium) var(--di-font-size-heading)/var(--di-font-line-height-heading) var(--di-font-family-notes-heading); color:var(--di-color-text-primary); }
      .review-notes-header-actions,.review-note-actions { display:flex; align-items:center; flex:none; gap:var(--di-space-related); }
      .review-notes-list { display:flex; flex-direction:column; gap:var(--di-space-inline-tight); min-height:0; overflow-y:auto; overscroll-behavior:contain; }
      .reviews .review-card { display:flex; align-items:flex-start; justify-content:space-between; flex:none; gap:var(--di-space-related); padding:var(--di-space-related) var(--di-space-related) var(--di-space-related) var(--di-space-group); margin:0; border-radius:var(--di-radius-popover); background:var(--di-color-surface-section); }
      .review-note-info { min-width:0; padding-top:var(--di-space-label-offset); }
      .review-note-time { display:flex; align-items:center; gap:var(--di-space-related); font:var(--di-font-weight-medium) var(--di-font-size-body)/var(--di-font-line-height-body) var(--di-font-family-code); white-space:nowrap; }
      .review-note-meta { display:flex; gap:var(--di-space-group); padding-left:20px; color:var(--di-color-text-secondary); font:var(--di-font-caption); }
      .review-note-count { display:flex; align-items:center; gap:var(--di-space-related); }
      .review-note-asset { display:inline-flex; align-items:center; justify-content:center; flex:none; width:var(--di-size-icon); height:var(--di-size-icon); }
      .review-note-asset[data-asset=copyAll],.review-note-asset[data-asset=complete],.review-note-asset[data-asset=delete],.review-note-asset[data-asset=edit] { background:currentColor; mask:var(--review-icon) center / contain no-repeat; }
      .review-note-asset:not([style]) { background:transparent; }
      .review-note-asset[data-asset=complete] { color:var(--di-color-action); }
      .review-note-asset[data-asset=copyAll] img,.review-note-asset[data-asset=complete] img,.review-note-asset[data-asset=delete] img,.review-note-asset[data-asset=edit] img { visibility:hidden; }
      .review-note-asset img { display:block; max-width:none; }
      .review-note-asset[data-asset=pencil] { position:relative; width:var(--di-size-icon-small); height:var(--di-size-icon-small); }
      .review-note-asset[data-asset=pencil] img { position:absolute; left:-.9px; top:-.9px; }
      .review-note-button { display:inline-flex; align-items:center; justify-content:center; gap:var(--di-space-related); flex:none; margin:0; padding:var(--di-space-related); border-radius:var(--di-radius-control-round); background:transparent; color:var(--di-color-text-primary); font:var(--di-font-weight-medium) var(--di-font-size-heading)/var(--di-font-line-height-heading) var(--di-font-family-notes-heading); line-height:20px; white-space:nowrap; }
      .review-note-button.has-label { padding:var(--di-space-inline-tight) var(--di-space-group); }
      .review-note-button.review-compare,.review-note-button.review-complete { background:var(--di-color-surface-panel); }
      .review-note-button:hover { background:var(--di-color-surface-control-hover); }
      .review-notes-empty { flex:none; margin:0; font:var(--di-font-weight-medium) var(--di-font-size-caption)/var(--di-font-line-height-caption) var(--di-font-family-notes-heading); color:var(--di-color-text-secondary); }
      .review-note-menu { pointer-events:auto; position:fixed; z-index:11; min-width:140px; padding:var(--di-space-related); }
      .review-note-menu button { display:block; width:100%; padding:var(--di-space-related) var(--di-space-group); text-align:left; background:transparent; font:var(--di-font-body); }
      .review-note-menu button:hover { background:var(--di-color-surface-control-hover); }
      .review-status:empty { display:none; }

      .review-card,.review-comment { background:var(--di-color-surface-section); border-radius:var(--di-radius-section); padding:var(--di-space-section); margin-bottom:var(--di-space-related); }
      .review-card p { margin:0 0 var(--di-space-related); font:var(--di-font-caption); }
      .review-editor { flex:none; padding:var(--di-space-related) 0 var(--di-space-section); margin:0; }
      .review-editor input,.review-editor select,.review-comment textarea { width:100%; min-width:0; color:var(--di-color-text-primary); background:var(--di-color-surface-panel); border:1px solid var(--di-color-border-default); border-radius:var(--di-radius-button-default); padding:var(--di-space-related); font:var(--di-font-body); }
      .content>.review-comment { flex:1 0 auto; padding:var(--di-space-related) 0 var(--di-space-section); margin:0; }
      .review-comment-header { display:flex; align-items:center; gap:var(--di-space-group); padding:var(--di-space-inline-tight) var(--di-space-section) var(--di-space-related); }
      .review-comment-title { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .review-comment-actions { display:flex; gap:var(--di-space-related); }
      .review-comment .review-note-button:not(.header-button) { background:var(--di-color-surface-panel); }
      .review-comment .review-note-button:has(.review-note-asset) { padding-left:var(--di-space-related); }
      .review-comment .review-note-button:not(.header-button):hover { background:var(--di-color-surface-control-hover); }
      .review-comment .review-note-button:not(.header-button):active { background:var(--di-color-surface-control-pressed); }
      .review-comment .review-note-button:disabled { opacity:var(--di-opacity-disabled); cursor:default; }
      .review-comment-field { padding:0 var(--di-space-section); }
      .review-comment textarea { border-color:var(--di-color-border-input); display:block; height:44px; min-height:44px; border-radius:var(--di-radius-popover); resize:vertical; }
      .review-status { color:var(--di-color-text-secondary); font:var(--di-font-caption); overflow-wrap:anywhere; }
      .review-editor label { display:block; margin-bottom:var(--di-space-related); }
      .review-editor [role=alert] { color:var(--di-color-text-primary); }
      .review-box-trigger { display:inline-flex; align-items:center; gap:0; margin:0; padding:0; background:transparent; color:inherit; font:inherit; border-radius:0; cursor:text; }
      .box-left .review-box-trigger,.box-right .review-box-trigger { flex-direction:column; }
      .review-box-trigger:hover { color:var(--di-color-action); }
      .review-editor { position:fixed; z-index:10; width:min(calc(var(--di-size-panel-width) - 2 * var(--di-border-panel-width)),calc(100vw - var(--di-space-viewport))); max-height:calc(100vh - 16px); overflow:auto; }
      .box-value:has(>.review-edited) { flex-direction:column; }
      .box-layer:has(>.box-value>.review-edited) { grid-template-rows:minmax(var(--di-size-box-end-track),max-content) minmax(var(--di-size-box-content-min-height),auto) minmax(var(--di-size-box-end-track),max-content); grid-template-columns:minmax(var(--di-size-box-side-track),max-content) minmax(0,1fr) minmax(var(--di-size-box-side-track),max-content); }
      .corner-row:has(.review-edited) { height:auto; }
      .radius-marker:has(.review-edited) { flex-wrap:wrap; }
      .review-pencil { display:inline-flex; vertical-align:middle; width:16px; height:16px; flex:none; color:var(--di-color-action); margin-right:var(--di-space-related); }
      .box-left .box-measurement:has(>.review-pencil),.box-right .box-measurement:has(>.review-pencil) { display:grid; grid-template-columns:16px minmax(0,1fr); column-gap:var(--di-space-related); }
      .box-left .review-pencil,.box-right .review-pencil { grid-column:1; grid-row:1 / span 2; align-self:center; margin:0; }
      .box-left .box-measurement:has(>.review-pencil)>:not(.review-pencil),.box-right .box-measurement:has(>.review-pencil)>:not(.review-pencil) { grid-column:2; }
      .box-layer:has(>.box-left .review-pencil),.box-layer:has(>.box-right .review-pencil) { grid-template-columns:minmax(var(--di-size-box-side-track),max-content) minmax(0,1fr) minmax(var(--di-size-box-side-track),max-content); }
      .review-value { cursor:pointer; }
      .review-value:hover { color:var(--di-color-action); }
      .review-edited { display:flex; align-items:center; gap:var(--di-space-related); color:var(--di-color-action); font:var(--di-font-caption); }
      .review-edited-label { color:inherit; padding:0; background:none; font:inherit; }
      .review-editor-header { display:flex; align-items:center; gap:var(--di-space-related); padding:var(--di-space-inline-tight) var(--di-space-section) var(--di-space-related); }
      .review-editor-header label { flex:1; min-width:0; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font:var(--di-font-body); }
      .review-editor-header>.review-note-asset { color:var(--di-color-text-secondary); }
      .review-editor-actions { display:flex; gap:var(--di-space-related); }
      .review-editor-actions .review-note-button:has(.review-note-asset) { padding-left:var(--di-space-related); }
      .review-editor-actions button[type=submit] { background:var(--di-color-action); color:var(--di-color-text-on-accent); }
      .review-editor-actions button[type=submit]:hover { background:var(--di-color-action-hover); }
      .review-editor-actions button[type=submit]:active { background:var(--di-color-action-pressed); }
      .review-input-wrap { position:relative; padding:0 var(--di-space-section); }
      .review-input-wrap input,.review-input-wrap select { display:block; height:var(--di-size-control); padding:var(--di-space-inline-tight) var(--di-space-group); line-height:var(--di-font-line-height-body); border-color:var(--di-color-border-input); border-radius:var(--di-radius-popover); }
      .review-input-wrap select { appearance:none; padding-right:calc(var(--di-size-icon) + 2 * var(--di-space-group)); cursor:pointer; }
      .review-select-chevron { position:absolute; right:calc(var(--di-space-section) + var(--di-space-group)); top:50%; transform:translateY(-50%); display:flex; width:var(--di-size-icon); height:var(--di-size-icon); color:var(--di-color-text-secondary); pointer-events:none; }
      .review-input-wrap input:focus-visible,.review-input-wrap select:focus-visible { outline:var(--di-border-focus-width) solid var(--di-color-action); outline-offset:0; }
      .review-editor [role=alert] { margin:var(--di-space-related) var(--di-space-section) 0; font:var(--di-font-caption); }
      .review-editor [role=alert]:empty { display:none; }
      .review-suggestions { position:fixed; z-index:11; max-height:var(--di-size-selection-max-height); overflow-y:auto; padding:var(--di-space-related); }
      .review-suggestions .review-option { display:grid; grid-template-columns:var(--di-size-icon) minmax(0,1fr); gap:var(--di-space-group); font:var(--di-font-body); color:var(--di-color-text-primary); }
      .review-suggestion-marker { display:flex; width:var(--di-size-icon); height:var(--di-size-icon); align-items:center; justify-content:center; }
      .review-suggestion-marker .color-preview { margin:0; }
      .review-option-text { overflow-wrap:anywhere; }
      .review-editor.is-property-menu { padding:var(--di-space-related); }
      .review-menu-title { margin:0; padding:var(--di-space-related); font:var(--di-font-body); font-weight:var(--di-font-weight-strong); }
      .review-editor.is-property-menu .review-option { font:var(--di-font-body); color:var(--di-color-text-primary); }
      .review-editor.is-property-menu .review-option:active { background:var(--di-color-surface-control-pressed); }
      .review-option { display:flex; align-items:center; gap:var(--di-space-related); width:100%; background:transparent; text-align:left; padding:var(--di-space-related); }
      .review-option:hover { background:var(--di-color-surface-control-hover); }
    `;shadow.append(style);
    const cards=document.createElement('section');cards.className='reviews';cards.setAttribute('aria-label','Fix notes');panel.append(cards);
    const notesHeader=document.createElement('div');notesHeader.className='review-notes-header';
    const list=document.createElement('div');list.className='review-notes-list';list.setAttribute('aria-label','Fix notes list');
    const editor=document.createElement('form');editor.className='review-editor dropdown-surface';editor.hidden=true;panel.insertBefore(editor,panel.querySelector('.content'));
    const suggestions=document.createElement('div');suggestions.className='review-suggestions dropdown-surface';suggestions.hidden=true;suggestions.setAttribute('role','listbox');suggestions.id='review-variable-suggestions';shadow.append(suggestions);
    const status=document.createElement('div');status.className='review-status';status.setAttribute('role','status');cards.append(notesHeader,status,list);
    const menu=document.createElement('div');menu.className='review-note-menu dropdown-surface';menu.hidden=true;menu.setAttribute('role','menu');menu.setAttribute('aria-label','Note actions');shadow.append(menu);
    let data={binding:{state:'armed'},document:null,completed:[]},snapshot=null,after=true,recoverable=null,busy=false,disposed=false,copyTimer,openMenuButton;
    const iconUrls={};
    const limitHeight=()=>{const height=Math.floor(panel.getBoundingClientRect().height*.3);cards.classList.toggle('is-compact',height<72);if(cards.style.maxHeight!==height+'px')cards.style.maxHeight=height+'px';};
    const notesObserver=new ResizeObserver(limitHeight);notesObserver.observe(panel);
    const button=(label,action,container)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>Promise.resolve().then(action).catch(error=>{status.textContent=error.message;}));container.append(b);return b;};
    function closeEditor(){editor.hidden=true;suggestions.hidden=true;suggestions.replaceChildren();}
    function positionSuggestions(){
      if(editor.hidden||!suggestions.children.length){suggestions.hidden=true;return;}
      const input=editor.querySelector('input');if(!input)return;
      const r=input.getBoundingClientRect();suggestions.style.width=r.width+'px';suggestions.style.left=r.left+'px';suggestions.hidden=false;
      const below=innerHeight-r.bottom-8,above=r.top-8;const up=below<Math.min(suggestions.scrollHeight,root.designInspectTokens.number('size-selection-max-height'))&&above>below;
      suggestions.style.maxHeight=Math.max(0,Math.min(root.designInspectTokens.number('size-selection-max-height'),up?above:below))+'px';suggestions.style.top=(up?r.top-suggestions.offsetHeight-4:r.bottom+4)+'px';
    }
    function download(reviewDocument,text){
      const url=URL.createObjectURL(new Blob([text||model.markdown(reviewDocument)],{type:'text/markdown;charset=utf-8'}));
      try{const a=document.createElement('a');a.href=url;a.download=`design-review-${reviewDocument.id}.md`;shadow.append(a);a.click();a.remove();}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
    }
    async function operation(action,payload){
      if(busy)return;busy=true;
      try{const result=await request(action,payload);if(!result)throw Error('Review storage is unavailable.');if(result.error)throw Error(result.error);update(result);return result;}
      finally{busy=false;}
    }
    function loadAsset(slot){
      const name=slot.dataset.asset,url=iconUrls[name];if(!url)return;
      slot.querySelector('img').src=url;
      if(name==='copyAll'||name==='complete'||name==='delete'||name==='edit')slot.style.setProperty('--review-icon',`url("${url}")`);
    }
    function asset(name){
      const slot=document.createElement('span');slot.className='review-note-asset';slot.dataset.asset=name;
      const img=document.createElement('img');img.alt='';slot.append(img);loadAsset(slot);return slot;
    }
    function noteButton(label,name,action,parent,text=false){
      const b=button('',action,parent);b.className='review-note-button'+(text?' has-label':' icon-button')+(['Delete','Copy all','Start new'].includes(label)?' header-button':'');b.setAttribute('aria-label',label);b.title=label;
      if(name)b.append(asset(name));if(text)b.append(document.createTextNode(label));return b;
    }
    function closeMenu(){menu.hidden=true;openMenuButton?.setAttribute('aria-expanded','false');openMenuButton=null;}
    async function copyFixes(text,anchor){
      try{await navigator.clipboard.writeText(text);}catch{
        const previous=shadow.activeElement,input=document.createElement('textarea');input.value=text;input.style.cssText='position:fixed;left:-9999px;top:0';shadow.append(input);
        try{input.select();if(!document.execCommand('copy'))throw Error('Could not copy fixes.');}finally{input.remove();previous?.focus();}
      }
      const hint=shadow.querySelector('.copy-feedback');hint.textContent='Fixes copied';hint.hidden=false;
      const r=anchor.getBoundingClientRect();hint.style.left=Math.max(8,Math.min(r.left+r.width/2-hint.offsetWidth/2,innerWidth-hint.offsetWidth-8))+'px';hint.style.top=Math.max(8,r.top-hint.offsetHeight-6)+'px';
      clearTimeout(copyTimer);copyTimer=setTimeout(()=>hint.hidden=true,root.designInspectTokens.number('duration-copy-feedback'));
    }
    async function exported(id){const result=await request(id?'export':'export-all',id?{id}:{});if(!result||result.error)throw Error(result?.error||'Export failed.');return result.markdown;}
    function more(doc,anchor){
      if(openMenuButton===anchor&&!menu.hidden){closeMenu();return;}closeMenu();menu.replaceChildren();openMenuButton=anchor;anchor.setAttribute('aria-expanded','true');
      button('Download',async()=>{closeMenu();download(doc,await exported(doc.id));},menu).setAttribute('role','menuitem');
      button('Delete',async()=>{closeMenu();await operation('delete',{id:doc.id});closeEditor();refresh();},menu).setAttribute('role','menuitem');
      menu.hidden=false;const r=anchor.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(r.right-menu.offsetWidth,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(r.bottom+4+menu.offsetHeight>innerHeight-8?r.top-menu.offsetHeight-4:r.bottom+4,innerHeight-menu.offsetHeight-8))+'px';
    }
    function renderCards(){
      closeMenu();const scrollTop=list.scrollTop;list.replaceChildren();notesHeader.replaceChildren();
      const active=data.document?.status==='recording'?data.document:null;
      const completed=[...(data.completed||[])];if(data.document?.status==='completed'&&!completed.some(d=>d.id===data.document.id))completed.push(data.document);
      completed.sort((a,b)=>b.updatedAt-a.updatedAt||b.createdAt-a.createdAt);
      const docs=[...(active?[active]:[]),...completed];cards.classList.toggle('has-active',!!active);cards.classList.toggle('is-empty',!docs.length);
      const title=document.createElement('h3');title.className='review-notes-title';title.textContent='Fix notes';notesHeader.append(title);
      const actions=document.createElement('div');actions.className='review-notes-header-actions';notesHeader.append(actions);
      if(docs.length){const copyAll=noteButton('Copy all','copyAll',async()=>copyFixes(await exported(),copyAll),actions,true);copyAll.classList.add('review-copy-all');}
      if(active){const start=noteButton('Start new',null,async()=>{await operation('new');closeEditor();refresh();},actions,true);start.classList.add('review-new');}
      if(!docs.length){const empty=document.createElement('p');empty.className='review-notes-empty';empty.textContent='Change any object via plugin to start fix note. It collects all the fixes across the browser tab to send them to ur dev or AI in structured md. file';list.append(empty);}
      for(const doc of docs){
        const recording=doc===active,card=document.createElement('section');card.className='review-card';card.dataset.reviewId=doc.id;card.dataset.status=doc.status;card.setAttribute('aria-label',recording?'Active fix note':'Completed fix note');
        const info=document.createElement('div');info.className='review-note-info';const time=document.createElement('div');time.className='review-note-time';time.append(asset(recording?'record':'folder'));
        const clock=document.createElement('time');clock.dateTime=new Date(doc.updatedAt).toISOString();clock.textContent=new Date(doc.updatedAt).toLocaleTimeString('en-GB',{hour12:false});time.append(clock);
        const meta=document.createElement('div');meta.className='review-note-meta';const date=document.createElement('span'),value=new Date(doc.updatedAt);date.textContent=String(value.getDate()).padStart(2,'0')+'/'+String(value.getMonth()+1).padStart(2,'0');
        const count=document.createElement('span');count.className='review-note-count';const n=model.counts(doc);count.setAttribute('aria-label',`${n.parameters+n.comments} edits`);count.append(asset('pencil'),document.createTextNode(String(n.parameters+n.comments)));meta.append(date,count);info.append(time,meta);card.append(info);
        const controls=document.createElement('div');controls.className='review-note-actions';card.append(controls);
        if(recording){
          const toggle=noteButton(after?'Show before':'Show after',null,()=>compare(!after),controls,true);toggle.classList.add('review-compare');toggle.setAttribute('role','switch');toggle.setAttribute('aria-checked',String(after));
          const complete=noteButton('Complete recording','complete',()=>operation('stop'),controls);complete.classList.add('review-complete');
        }
        const copy=noteButton('Copy','copy',async()=>copyFixes(await exported(doc.id),copy),controls);copy.classList.add('review-copy');
        const moreButton=noteButton('More','more',()=>more(doc,moreButton),controls);moreButton.classList.add('review-more');moreButton.setAttribute('aria-haspopup','menu');moreButton.setAttribute('aria-expanded','false');
        list.append(card);
      }
      if(recoverable)button('Export unsaved changes',()=>download(recoverable),list);
      list.scrollTop=scrollTop;limitHeight();
    }
    function update(result){
      if(result?.error){recoverable=result.recoverable||recoverable;status.textContent=result.error;renderCards();return;}
      if(!result)return;
      data=result;recoverable=null;status.textContent='';renderCards();
    }
    function view(value){after=value;renderCards();}
    function position(anchor){
      const r=anchor.getBoundingClientRect();editor.style.left=Math.max(8,Math.min(r.left,innerWidth-editor.offsetWidth-8))+'px';const top=r.bottom+4+editor.offsetHeight<=innerHeight-8?r.bottom+4:r.top-editor.offsetHeight-4;editor.style.top=Math.max(8,Math.min(top,innerHeight-editor.offsetHeight-8))+'px';
    }
    function controls(container,property,meta){
      if(!meta||!container)return;
      const children=property==='font'?['font-family','font-size','font-weight','line-height']:property==='border'?['top','right','bottom','left'].flatMap(side=>['color','width','style'].map(part=>`border-${side}-${part}`)):property.startsWith('border-')&&!property.endsWith('radius')?['color','width','style'].map(part=>property+'-'+part):[];
      const props=[property,...children].filter((p,i,list)=>meta.properties[p]&&list.indexOf(p)===i);
      if(!props.length)return;
      const trigger=container.querySelector('.token')||container.querySelector('.box-measurement')||container;
      trigger.dataset.editProperty=property;trigger.tabIndex=0;trigger.setAttribute('aria-label',`Edit ${property}`);trigger.classList.add('review-value');
      const activate=event=>{
        if(event.target.closest('.value-toggle,.box-var,.review-edited'))return;
        event.stopPropagation();
        if(props.length===1)open(meta,props[0],trigger).catch(e=>status.textContent=e.message);
        else{
          suggestions.hidden=true;suggestions.replaceChildren();editor.replaceChildren();editor.classList.add('is-property-menu');editor.hidden=false;editor.onsubmit=e=>e.preventDefault();
          const heading=document.createElement('div');heading.className='review-menu-title';heading.textContent='Edit';editor.append(heading);
          for(const p of props)button(p===property?(p==='font'?'Variable':'All — '+p):p,()=>open(meta,p,trigger),editor).className='review-option';position(trigger);
        }
      };
      trigger.addEventListener('click',activate);trigger.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate(event);}});
      const changed=props.filter(p=>meta.properties[p].override!==undefined);
      if(changed.length){
        const pencil=document.createElement('span');pencil.className='review-pencil';pencil.setAttribute('role','img');pencil.setAttribute('aria-label','Edited');pencil.append(asset('edit'));trigger.prepend(pencil);
      }
    }
    async function submit(meta,command){
      const result=await edit({...command,instance:meta.instance,elementId:meta.elementId,contextKey:meta.contextKey});
      if(!result)throw Error('Element is unavailable. Select it again.');
      if(result.error){if(result.recoverable)update(result);throw Error(result.error);}
      if(result.review)update(result.review);
      return result;
    }
    const keywordValues={
      'box-sizing':['content-box','border-box'],
      'flex-direction':['row','row-reverse','column','column-reverse'],
      'position':['static','relative','absolute','fixed','sticky'],
      'justify-content':['normal','stretch','center','start','end','flex-start','flex-end','left','right','space-between','space-around','space-evenly','safe center','unsafe center','safe start','unsafe start','safe end','unsafe end','safe flex-start','unsafe flex-start','safe flex-end','unsafe flex-end','safe left','unsafe left','safe right','unsafe right'],
      'align-items':['normal','stretch','center','start','end','self-start','self-end','flex-start','flex-end','baseline','first baseline','last baseline','anchor-center',...['safe','unsafe'].flatMap(prefix=>['center','start','end','self-start','self-end','flex-start','flex-end'].map(value=>prefix+' '+value))]
    };
    const borderStyles=['none','hidden','dotted','dashed','solid','double','groove','ridge','inset','outset'];
    async function open(meta,p,anchor){
      editor.classList.remove('is-property-menu');
      if(!after)await compare(true);
      if(!anchor.isConnected)anchor=panel.querySelector(`[data-edit-property="${anchor.dataset.editProperty}"]`)||panel;
      suggestions.hidden=true;suggestions.replaceChildren();editor.replaceChildren();editor.hidden=false;
      const header=document.createElement('div');header.className='review-editor-header';header.append(asset('edit'));
      const label=document.createElement('label');label.textContent=p==='font'?'Variable':p.startsWith('@')?p.slice(1):p;header.append(label);
      const actions=document.createElement('div');actions.className='review-editor-actions';header.append(actions);
      const remove=noteButton('Delete','delete',async()=>{await submit(meta,{kind:'reset',property:p});closeEditor();refresh();},actions,true);remove.setAttribute('aria-label','Delete edit');
      const save=noteButton('Save',null,()=>{},actions,true);save.type='submit';save.setAttribute('aria-label','Save edit');
      const field=document.createElement('div');field.className='review-input-wrap';
      const initial=meta.properties[p].override??meta.properties[p].expression??meta.properties[p].computed;
      const keywords=keywordValues[p]||(/^border-(?:top-|right-|bottom-|left-)?style$/.test(p)?borderStyles:null);
      const input=document.createElement(keywords?'select':'input');input.id='review-value-input';
      if(keywords){
        const choices=[...keywords,'inherit','initial','unset','revert','revert-layer',...(meta.variables||[]).filter(v=>CSS.supports(p,v.value)).map(v=>`var(${v.name})`)];
        if(initial&&!choices.includes(initial))choices.unshift(initial);
        for(const value of [...new Set(choices)].filter(value=>value===initial||CSS.supports(p,value))){const option=document.createElement('option');option.value=value;option.textContent=value;input.append(option);}
      }
      label.htmlFor=input.id;input.setAttribute('aria-label',p.startsWith('@')?`Attribute value for ${p.slice(1)}`:`CSS value for ${p}`);input.setAttribute('aria-controls',suggestions.id);input.setAttribute('aria-autocomplete','list');input.value=initial;input.autocomplete='off';field.append(input);
      if(keywords){const chevron=document.createElement('span');chevron.className='review-select-chevron';chevron.setAttribute('aria-hidden','true');chevron.append(icon('chevron'));field.append(chevron);}
      const error=document.createElement('p');error.setAttribute('role','alert');editor.append(header,field,error);
      input.oninput=()=>{
        error.textContent='';suggestions.hidden=true;suggestions.replaceChildren();if(keywords||p.startsWith('@'))return;const query=input.value.replace(/var\(|[()]/g,'').trim().toLowerCase();if(!query&&p!=='font')return;
        for(const variable of (meta.variables||[]).filter(v=>v.name.toLowerCase().includes(query)&&(p!=='font'||CSS.supports('font',v.value))).slice(0,30)){
          const option=button(variable.name,()=>{input.value=`var(${variable.name})`;error.textContent='';suggestions.replaceChildren();suggestions.hidden=true;input.focus();},suggestions);option.className='review-option';option.setAttribute('role','option');
          const marker=document.createElement('span');marker.className='review-suggestion-marker';if(CSS.supports('color',variable.value))marker.append(colorPreview(variable.value));
          const text=document.createElement('span');text.className='review-option-text';text.textContent=root.designInspectCSS.tokenLabel(`var(${variable.name})`);option.title=`var(${variable.name})`;option.replaceChildren(marker,text);
        }positionSuggestions();
      };
      editor.onsubmit=async event=>{event.preventDefault();save.disabled=true;try{if(p==='font'){const match=input.value.trim().match(/^var\(\s*(--[\w-]+)\s*\)$/);if(!match||!meta.variables?.some(v=>v.name===match[1]&&CSS.supports('font',v.value)))throw Error('Choose an available font variable.');}await submit(meta,{kind:'parameter',property:p,value:input.value});closeEditor();refresh();}catch(e){error.textContent=e.message;}finally{save.disabled=false;}};
      input.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();closeEditor();refresh();}};position(anchor);input.focus();if(!keywords)input.select();if(p==='font')input.oninput();
    }
    function comment(container,meta){
      if(!meta)return;
      const section=document.createElement('section');section.className='review-comment';
      const header=document.createElement('div');header.className='review-comment-header';
      const title=document.createElement('h3');title.className='review-notes-title review-comment-title';title.textContent='Comment for fix note';
      const actions=document.createElement('div');actions.className='review-comment-actions';header.append(title,actions);
      const field=document.createElement('div');field.className='review-comment-field';
      const input=document.createElement('textarea');input.setAttribute('aria-label','Comment for fix note');field.append(input);section.append(header,field);
      const key=model.recordKey({context:meta.context,elementId:meta.elementId});
      const saved=()=>data.document?.status==='recording'?data.document.records.find(r=>r.key===key)?.comment||'':'';
      input.value=saved();
      const remove=noteButton('Delete','delete',async()=>{await submit(meta,{kind:'comment',comment:''});input.value='';sync();},actions,true);remove.classList.add('review-comment-delete');
      const save=noteButton('Add',null,async()=>{await submit(meta,{kind:'comment',comment:input.value});sync();},actions,true);save.classList.add('review-comment-save');
      function sync(){const exists=!!saved(),filled=!!input.value.trim();remove.hidden=!exists;save.hidden=exists&&!filled;save.disabled=!filled;save.textContent=exists?'Update':'Add';save.setAttribute('aria-label',save.textContent);save.title=save.textContent;}
      input.addEventListener('input',sync);sync();container.append(section);
    }
    function focused(){return !editor.hidden||!!shadow.activeElement?.closest('.review-comment');}
    function selected(next){
      if(snapshot?.instance!==next?.instance||snapshot?.elementId!==next?.elementId||snapshot?.contextKey!==next?.contextKey){
        closeEditor();
        if(shadow.activeElement?.closest('.review-editor,.review-comment'))shadow.activeElement.blur();
      }
      snapshot=next;
    }
    shadow.addEventListener('click',event=>{if(!event.composedPath().includes(menu)&&!event.target.closest('.review-more'))closeMenu();if(!editor.hidden&&!event.composedPath().includes(editor)&&!event.composedPath().includes(suggestions)&&!event.target.closest('.review-value,.review-edited,.spacing-edit,svg.measurements')){closeEditor();refresh();}});
    shadow.addEventListener('scroll',positionSuggestions,true);
    window.addEventListener('resize',positionSuggestions);
    shadow.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
    assets().then(result=>{if(disposed)return;if(!result?.icons)throw Error('Note icons are unavailable.');for(const [name,svg]of Object.entries(result.icons))iconUrls[name]=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));shadow.querySelectorAll('.review-note-asset').forEach(loadAsset);renderCards();}).catch(error=>{if(!disposed)status.textContent=error.message;});
    request('get').then(update).catch(error=>{status.textContent=error.message;});
    return {destroy(){disposed=true;shadow.removeEventListener('scroll',positionSuggestions,true);window.removeEventListener('resize',positionSuggestions);notesObserver.disconnect();clearTimeout(copyTimer);for(const url of Object.values(iconUrls))URL.revokeObjectURL(url);},open,controls,comment,update,view,focused,selected,get after(){return after;}};
  }
  root.designInspectReviewPanel={install};
})(globalThis);

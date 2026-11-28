(() => {
  const hints={
    display:"How the element participates in layout and arranges its children.",
    position:"How the element is positioned: normal flow, offsets, or a viewport/container anchor.",
    "box-sizing":"Whether CSS width and height include padding and borders.",
    "flex-direction":"The main axis and order of children in a flex container.",
    "justify-content":"How free space is distributed along the main axis (or grid inline axis).",
    "align-items":"How children align along the cross axis (or grid block axis).",
    gap:"Space between rows and columns of flex, grid, or multi-column content.",
  };
  function arrangeLayout(entries,{hasBox=true}={}){
    const display=entries.find(([property])=>property==='display')?.[1].actual;
    const flex=['flex','inline-flex','flex flow','inline flex'].includes(display);
    const grid=['grid','inline-grid','inline grid'].includes(display);
    const dependent=new Set(hasBox && (flex || grid)?['gap','justify-content','align-items',...(flex?['flex-direction']:[])]:[]);
    const parentPresent=entries.some(([property])=>property==='display');
    const children=[],roots=[];
    for(const [property,value]of entries){
      const {dependsOn:ignored,...clean}=value;
      if(parentPresent && dependent.has(property))children.push([property,{...clean,dependsOn:'display'}]);
      else roots.push([property,clean]);
    }
    const rank={position:0,'box-sizing':1,display:2};
    roots.sort((a,b)=>(rank[a[0]]??3)-(rank[b[0]]??3));
    const childRank={gap:0,'flex-direction':1,'justify-content':2,'align-items':3};children.sort((a,b)=>childRank[a[0]]-childRank[b[0]]);
    return roots.flatMap(entry=>entry[0]==='display'?[entry,...children]:[entry]);
  }
  const path=d=>`<path d="${d}"/>`;
  const eye=visible=>path("M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z")+`<circle cx="12" cy="12" r="3"/>`+(visible ? "" : path("M3 3l18 18"));
  const override=()=>path("M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4");
  const controls={
    eyedropper:path('M14 3l7 7M16 5l3-3 3 3-3 3M16 7 5 18l-2 3 3-1L17 9M11 8l5 5'),
    use:path('M5 3v17l4-5 4 7 3-2-4-6 7-1Z'),
    inspect:path('M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6M12 7v10M7 12h10'),
    info:`<circle cx="12" cy="12" r="9"/>`+path('M12 11v6M12 7h.01'),
    tree:path('M5 3v14h5M5 8h5M14 6h7v4h-7ZM14 15h7v4h-7Z'),
    close:path('M6 6l12 12M18 6 6 18'),
  };
  globalThis.designInspectIcons={hints,eye,override,controls,arrangeLayout};
})();

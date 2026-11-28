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
  const override=()=>path("M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4");
  globalThis.designInspectIcons={hints,override,arrangeLayout};
})();

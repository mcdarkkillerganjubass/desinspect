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
  globalThis.designInspectIcons={hints,eye,override,controls};
})();

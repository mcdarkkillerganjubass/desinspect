(() => {
  const scriptSource=document.currentScript?.src;
  const key = "__designInspectController";
  const runtime = globalThis.chrome?.runtime;
  const connected = Boolean(runtime?.id);
  const isTop = window === window.top;
  const bridge = (type, data = {}) => connected ? runtime.sendMessage({channel:"design-inspect", type, ...data}).catch(error => {console.debug("Design Inspect:", error.message);return null;}) : Promise.resolve(null);
  if (globalThis[key]) {
    return;
  }

  const host = document.createElement("design-inspect-overlay");
  host.style.cssText = "all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;";
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `
    <style>
      :host { color-scheme:light; --di-bg:#f5f5f4; --di-panel:var(--di-bg); --di-fg:#202020; --di-muted:#686868; --di-line:#d4d4d2; --di-field:var(--di-line); --di-active-bg:var(--di-muted); --di-active-fg:var(--di-bg); --di-margin:#a9825b; --di-margin-bg:#f5ebe0; --di-margin-border:#dcc3a7; --di-padding:#71957a; --di-padding-bg:#e7f1e9; --di-padding-border:#bbd3c0; --di-gap:#9181bd; --di-stroke:#a19866; --di-stroke-bg:#f0eee5; --di-stroke-border:#d7d0ae; --di-content:#778ba0; --di-content-bg:#e9eef4; --di-content-border:#c8d3df; --di-overlay-margin:#edbd80; --di-overlay-padding:#a2d5b4; --di-overlay-gap:#a58cff; --di-ui:"Design Inspect Inter",Inter,system-ui,sans-serif; --di-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace; --di-label:112px; --di-preview:16px; }
      @media(prefers-color-scheme:dark) { :host { color-scheme:dark; --di-bg:#242424; --di-fg:#ededeb; --di-muted:#a2a2a0; --di-line:#4a4a48; --di-margin:#edbd80; --di-margin-bg:#372d24; --di-margin-border:#795c39; --di-padding:#a2d5b4; --di-padding-bg:#243831; --di-padding-border:#47765d; --di-gap:#b9aaff; --di-stroke:#e8d79a; --di-stroke-bg:#34312a; --di-stroke-border:#82754e; --di-content:#afcafa; --di-content-bg:#253348; --di-content-border:#48658c; } }
      :host([data-theme=light]) { color-scheme:light; --di-bg:#f5f5f4; --di-panel:var(--di-bg); --di-fg:#202020; --di-muted:#686868; --di-line:#d4d4d2; --di-field:var(--di-line); --di-margin:#a9825b; --di-margin-bg:#f5ebe0; --di-margin-border:#dcc3a7; --di-padding:#71957a; --di-padding-bg:#e7f1e9; --di-padding-border:#bbd3c0; --di-gap:#9181bd; --di-stroke:#a19866; --di-stroke-bg:#f0eee5; --di-stroke-border:#d7d0ae; --di-content:#778ba0; --di-content-bg:#e9eef4; --di-content-border:#c8d3df; }
      :host([data-theme=dark]) { color-scheme:dark; --di-bg:#242424; --di-panel:var(--di-bg); --di-fg:#ededeb; --di-muted:#a2a2a0; --di-line:#4a4a48; --di-field:var(--di-line); --di-margin:#edbd80; --di-margin-bg:#372d24; --di-margin-border:#795c39; --di-padding:#a2d5b4; --di-padding-bg:#243831; --di-padding-border:#47765d; --di-gap:#b9aaff; --di-stroke:#e8d79a; --di-stroke-bg:#34312a; --di-stroke-border:#82754e; --di-content:#afcafa; --di-content-bg:#253348; --di-content-border:#48658c; }
      * { box-sizing:border-box; }
      [hidden] { display:none!important; }
      .panel { position:fixed; top:16px; right:16px; width:340px; min-width:min(340px,calc(100vw - 32px)); max-width:calc(100vw - 32px); min-height:min(180px,calc(100vh - 32px)); max-height:calc(100vh - 32px); display:flex; flex-direction:column; overflow:hidden; pointer-events:auto; background:var(--di-bg); color:var(--di-fg); border:1px solid var(--di-line); border-radius:12px; box-shadow:0 12px 40px #0005; font:13px/1.2 var(--di-ui); }
      header { position:relative; flex:none; display:flex; align-items:center; gap:6px; padding:12px 14px 8px; cursor:grab; touch-action:none; }
      header strong { flex:1; font-size:13px; font-weight:600; }
      button { color:inherit; background:var(--di-field); border:0; border-radius:5px; padding:6px 8px; font:inherit; line-height:1.2; cursor:pointer; }
      button:focus-visible, select:focus-visible, [tabindex]:focus-visible { outline:2px solid var(--di-muted); outline-offset:2px; }
      .icon-button { display:inline-flex; align-items:center; justify-content:center; flex:none; width:24px; height:24px; padding:4px; background:transparent; color:var(--di-muted); }
      .element-info.icon-button, .element-tree-toggle.icon-button { width:24px; height:24px; padding:4px; }
      .icon-button:hover { color:var(--di-fg); background:var(--di-field); }
      .eyedropper-button, .theme-button, .close { border:1px solid var(--di-line); border-radius:7px; }
      .theme-select { position:absolute; top:50%; right:46px; transform:translateY(-50%); width:24px; height:24px; opacity:0; cursor:pointer; }
      .tool-modes { display:flex; align-items:center; gap:6px; }
      .eyedropper-button[aria-pressed=true] { color:var(--di-active-fg); background:var(--di-active-bg); }
      .eyedropper-button:disabled { opacity:.35; cursor:default; }
      .eyedropper-popover { position:fixed; z-index:2; max-width:min(320px,calc(100vw - 16px)); display:grid; grid-template-columns:16px minmax(0,1fr); gap:4px 8px; padding:10px; border:1px solid var(--di-line); border-radius:8px; background:var(--di-bg); color:var(--di-fg); box-shadow:0 4px 16px #0005; font:13px/1.2 var(--di-mono); pointer-events:none; overflow-wrap:anywhere; }
      .eyedropper-swatch { width:16px; height:16px; border-radius:4px; box-shadow:inset 0 0 0 1px var(--di-line); }
      .eyedropper-value { grid-column:2; color:var(--di-muted); font-size:11px; }
      .segmented { display:inline-flex; align-items:center; gap:2px; height:24px; padding:0; border-radius:7px; box-shadow:inset 0 0 0 1px var(--di-line); background:var(--di-panel); }
      .segmented button { flex:none; height:24px; min-height:24px; padding:0 5px; border-radius:5px; color:var(--di-muted); background:transparent; font-size:13px; line-height:16px; }
      .segmented button[aria-pressed=true] { color:var(--di-active-fg); background:var(--di-active-bg); }
      .segmented button:hover { color:var(--di-fg); }
      .modes button { display:flex; align-items:center; justify-content:center; width:24px; padding:4px; }
      .unit-select-wrap { position:relative; display:inline-flex; flex:none; height:24px; }
      .unit-select-wrap::after { content:""; position:absolute; top:8px; right:8px; width:6px; height:6px; border-right:1.5px solid currentColor; border-bottom:1.5px solid currentColor; transform:rotate(45deg); pointer-events:none; }
      .unit-select { appearance:none; width:68px; height:24px; padding:0 20px 0 7px; border:1px solid var(--di-line); border-radius:7px; background:transparent; color:var(--di-fg); font:13px/16px var(--di-mono); cursor:pointer; }
      .content { flex:1; min-height:0; overflow:auto; padding:0 14px 14px; }
      .selection-header { flex:none; padding:0 14px; max-height:40vh; overflow:auto; border-bottom:1px solid var(--di-line); }
      .identity-row { display:flex; align-items:flex-start; gap:4px; min-width:0; margin-bottom:8px; }
      .name { flex:1; min-width:0; margin:0; padding:4px 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--di-fg); font:13px/1.2 var(--di-mono); }
      .empty { margin:0 0 12px; color:var(--di-muted); }
      .element-details, .element-tree { margin:0 0 12px; max-height:min(220px,calc(40vh - 48px)); overflow:auto; padding:10px; border:1px solid var(--di-line); border-radius:7px; background:var(--di-panel); }
      .dom-markup { display:flex; flex-direction:column; gap:8px; color:var(--di-fg); font:11px/13px var(--di-mono); }
      .dom-tag { overflow-wrap:anywhere; }
      .attribute-list { margin:0; }
      .attribute-row { display:grid; grid-template-columns:minmax(72px,112px) minmax(0,1fr); gap:12px; padding:4px 0; border-bottom:1px solid var(--di-line); }
      .attribute-row:last-child { border-bottom:0; }
      .attribute-row > .attr-name { grid-column:1; grid-row:1; min-width:0; overflow-wrap:anywhere; color:var(--di-muted); }
      .attribute-row > .attr-value { grid-column:2; grid-row:1; min-width:0; margin:0; overflow-wrap:anywhere; color:var(--di-fg); text-align:left; font:11px/13px var(--di-mono); }
      .tree-item { display:flex; align-items:center; gap:8px; width:100%; padding:6px; text-align:start; background:transparent; }
      .tree-item[aria-current=true] { background:var(--di-field); }
      .tree-relation { flex:none; width:52px; font:11px/1.2 var(--di-ui); color:var(--di-muted); }
      .tree-name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font:13px/1.2 var(--di-mono); }
      .value-stack { display:grid; grid-template-columns:minmax(0,1fr); row-gap:3px; }
      .color-preview { width:16px; height:16px; border-radius:4px; grid-column:2; grid-row:1; align-self:start; box-shadow:0 0 0 1px var(--di-line); background-image:conic-gradient(var(--di-muted) 25%,var(--di-line) 0 50%,var(--di-muted) 0 75%,var(--di-line) 0); background-size:8px 8px; }
      .color-preview::after { content:""; display:block; width:100%; height:100%; border-radius:inherit; background:var(--preview-color); }
      .value-header { display:flex; align-items:flex-start; gap:4px; min-width:0; }
      .token-control { display:inline-flex; align-items:center; min-width:0; }
      .token { color:var(--di-fg); background:none; padding:0; text-align:start; min-width:0; overflow-wrap:anywhere; font:13px/1.2 var(--di-mono); }
      .token:hover { color:var(--di-fg); text-decoration:underline; text-underline-offset:3px; }
      .value-toggle { flex:none; display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; padding:0; background:transparent; color:var(--di-muted); }
      .value-toggle .ui-icon { width:16px; height:16px; }
      .value-toggle:hover { background:var(--di-field); color:var(--di-fg); }
      .actual, .source-note { display:block; color:var(--di-muted); font:11px/1.2 var(--di-mono); }
      .layout-name { cursor:help; text-decoration:underline dotted var(--di-muted); text-underline-offset:3px; }
      .copy-feedback, .size-tooltip { position:fixed; max-width:calc(100vw - 16px); padding:6px 10px; border:1px solid var(--di-line); border-radius:6px; background:var(--di-panel); color:var(--di-fg); box-shadow:0 4px 16px #0004; font:11px/1.2 var(--di-ui); }
      .size-table { width:100%; border-collapse:collapse; table-layout:fixed; font:inherit; }
      .size-table th { width:calc(var(--di-label) + 20px + var(--di-preview)); padding:7px 0; text-align:start; vertical-align:top; font-weight:400; color:var(--di-muted); border-bottom:1px solid var(--di-line); font-size:13px; line-height:16px; }
      .size-table td { padding:7px 0 7px 8px; border-bottom:1px solid var(--di-line); font-size:13px; line-height:16px; }
      .dimension-values { display:grid; gap:3px; }
      .screen-size { font:13px/16px var(--di-mono); }
      .css-size { display:flex; align-items:flex-start; gap:5px; min-width:0; max-width:100%; color:var(--di-muted); }
      .css-size-value { min-width:0; overflow-wrap:anywhere; font:11px/1.2 var(--di-mono); }
      .css-size .token { font-size:11px; }
      .css-size-badge { flex:none; padding:0 4px; border:1px solid var(--di-line); border-radius:4px; background:var(--di-panel); color:var(--di-muted); font:11px/1.2 var(--di-ui); cursor:help; }
      .frame-access { flex:none; align-self:flex-start; margin:0 14px 12px; font-size:11px; }
      .box-model { margin:8px 0 12px; }
      .corner-row { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:8px; margin:4px 0; }
      .radius-marker { display:inline-flex; align-items:center; gap:4px; min-width:0; color:var(--di-fg); font:11px/1.2 var(--di-mono); }
      .radius-marker[data-side=right] { grid-column:2; justify-self:end; flex-direction:row-reverse; text-align:right; }
      .radius-marker .ui-icon { flex:none; width:14px; height:14px; }
      .radius-marker span { overflow-wrap:anywhere; }
      .box-layer { position:relative; display:grid; grid-template-columns:minmax(24px,32px) minmax(0,1fr) minmax(24px,32px); grid-template-rows:22px minmax(34px,auto) 22px; border:1px solid; border-radius:2px; min-width:0; }
      .box-margin { background:var(--di-margin-bg); border-color:var(--di-margin-border); color:var(--di-margin); }
      .box-stroke { background:var(--di-stroke-bg); border-color:var(--di-stroke-border); color:var(--di-stroke); }
      .box-padding { background:var(--di-padding-bg); border-color:var(--di-padding-border); color:var(--di-padding); }
      .box-source[data-spacing=margin] .box-source-label { color:var(--di-margin); }
      .box-source[data-spacing=padding] .box-source-label { color:var(--di-padding); }
      dt[data-spacing=gap] { color:var(--di-gap); }
      .spacing-margin { fill:var(--di-overlay-margin); fill-opacity:.2; stroke:none; }
      .spacing-padding { fill:var(--di-overlay-padding); fill-opacity:.2; stroke:none; }
      .spacing-gap { fill:var(--di-overlay-gap); fill-opacity:.28; stroke:none; }
      .spacing-value-bg { stroke:none; pointer-events:none; }
      .spacing-value { font:400 11px/1.2 var(--di-mono); text-anchor:middle; dominant-baseline:middle; stroke:none; pointer-events:none; }
      .box-title { position:absolute; top:4px; left:7px; font:11px/1.2 var(--di-ui); }
      .box-value { display:flex; align-items:center; justify-content:center; min-width:0; padding:1px; font:11px/1.2 var(--di-mono); }
      .box-value span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .box-left, .box-right { flex-direction:column; gap:0; text-align:center; }
      .box-left span, .box-right span { max-width:100%; white-space:normal; overflow:visible; text-overflow:clip; overflow-wrap:anywhere; text-align:center; }
      .box-value .box-unit { font-size:11px; opacity:.7; }
      .box-value.has-token span { text-decoration:underline dotted; text-underline-offset:3px; }
      .box-top { grid-area:1 / 2; } .box-right { grid-area:2 / 3; } .box-bottom { grid-area:3 / 2; } .box-left { grid-area:2 / 1; }
      .box-inner { grid-area:2 / 2; min-width:0; }
      .box-center { display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:34px; padding:4px 2px; background:var(--di-content-bg); color:var(--di-content); border:1px solid var(--di-content-border); border-radius:2px; font:11px/1.2 var(--di-mono); text-align:center; overflow-wrap:anywhere; }
      .box-center small { font:11px/1.2 var(--di-ui); opacity:.7; margin-bottom:2px; }
      .box-sources { margin-top:6px; }
      .box-source { display:grid; grid-template-columns:var(--di-label) 20px var(--di-preview) 8px minmax(0,1fr); align-items:start; padding:7px 0; border-bottom:1px solid var(--di-line); font:13px/16px var(--di-mono); overflow-wrap:anywhere; }
      .box-source:last-child { border-bottom:0; }
      .box-source-label { color:var(--di-muted); grid-column:1; grid-row:1; font-family:var(--di-ui); }
      .box-source > .box-source-value { grid-column:5; grid-row:1; min-width:0; }
      .box-source > .color-preview { grid-column:3; } .row > .color-preview { grid-column:3; grid-row:1; }
      .box-source .token { font-size:13px; line-height:16px; }
      h3 { font-size:13px; line-height:16px; color:var(--di-fg); text-transform:none; letter-spacing:0; margin:14px 0 6px; font-weight:700; }
      dl { margin:0; }
      .property-group { margin-top:0; }
      .row { display:grid; grid-template-columns:var(--di-label) 20px var(--di-preview) 8px minmax(0,1fr); align-items:start; padding:7px 0; border-bottom:1px solid var(--di-line); }
      .property-group > .row:last-child { border-bottom:0; }
      .row dt, .row dd, .row .token { font-size:13px; line-height:16px; }
      dt { grid-column:1; grid-row:1; min-width:0; overflow-wrap:anywhere; color:var(--di-muted); text-align:start; }
      dd { grid-column:5; grid-row:1; min-width:0; margin:0; overflow-wrap:anywhere; user-select:text; text-align:start; font:13px/1.2 var(--di-mono); }
      .override-marker { display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; margin-left:4px; border-radius:4px; background:var(--di-field); color:var(--di-fg); vertical-align:middle; }
      .hint { color:var(--di-muted); font-size:11px; }
      footer { flex:none; border-top:1px solid var(--di-line); padding:10px 14px; color:var(--di-muted); font-size:11px; }
      kbd { color:var(--di-fg); font:11px/1.2 var(--di-mono); }
      .resize-handle { position:fixed; width:8px; pointer-events:auto; cursor:ew-resize; touch-action:none; }
      .resize-handle[data-edge=top], .resize-handle[data-edge=bottom] { height:8px; cursor:ns-resize; }
      .resize-handle:focus-visible { outline:1px solid var(--di-muted); background:var(--di-field); }
      svg.measurements { position:fixed; inset:0; width:100%; height:100%; overflow:visible; pointer-events:none; }
      svg.ui-icon { display:block; width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round; pointer-events:none; }
      rect { vector-effect:non-scaling-stroke; }
      .measure-line { stroke:#ff6a00; stroke-width:1px; fill:none; }
      .measure-guide { stroke-dasharray:4 4; }
      .measure-label { fill:#000; font:400 11px/1.2 var(--di-mono); text-anchor:middle; stroke:none; }
      .measure-label-bg { fill:#ff6a00; stroke:none; }
    </style>
    <div class="eyedropper-popover" role="tooltip" hidden><span class="eyedropper-swatch"></span><span class="eyedropper-name"></span><span class="eyedropper-value"></span></div>
    <svg class="measurements" aria-hidden="true"></svg>
    <section class="panel" aria-label="Design Inspect">
      <header><strong>desinspect</strong><div class="tool-modes"><div class="modes segmented" role="group" aria-label="Interaction mode"><button data-mode="use" aria-label="Use" title="Use — interact with page" aria-pressed="false"></button><button data-mode="inspect" aria-label="Inspect" title="Inspect — select elements" aria-pressed="true"></button></div><label class="unit-select-wrap"><select class="unit-select" aria-label="Measurement units"><option value="auto">Auto</option><option value="px">px</option><option value="rem">rem</option><option value="em">em</option></select></label><button class="eyedropper-button icon-button" data-eyedropper aria-label="Eyedropper" title="Eyedropper — I" aria-pressed="false"></button></div><button class="theme-button icon-button" aria-label="Theme: System" title="Theme: System"></button><select class="theme-select" aria-label="Theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select><button class="close icon-button" aria-label="Close inspector"></button></header>
      <button class="frame-access" hidden>Enable iframe access…</button>
      <div class="selection-header"></div>
      <div class="content" aria-live="polite"></div>
      <footer><kbd>Alt+Shift+P</kbd> — pin hover · <kbd>Enter</kbd> — children · <kbd>Shift Enter</kbd> — parent<br><kbd>Alt + hover</kbd> — measure · <kbd>I</kbd> — color · <kbd>Esc</kbd> — clear</footer>
    </section><div class="resize-handle" data-edge="top" role="separator" aria-orientation="horizontal" aria-label="Resize inspector from top" tabindex="0"></div><div class="resize-handle" data-edge="bottom" role="separator" aria-orientation="horizontal" aria-label="Resize inspector from bottom" tabindex="0"></div><div class="resize-handle" data-edge="left" role="separator" aria-orientation="vertical" aria-label="Resize inspector from left" tabindex="0"></div><div class="resize-handle" data-edge="right" role="separator" aria-orientation="vertical" aria-label="Resize inspector from right" tabindex="0"></div><div class="copy-feedback" role="status" aria-live="polite" hidden></div><div class="size-tooltip" id="css-size-help" role="tooltip" hidden>CSS size</div>`;
  document.documentElement.append(host);
  const panel = root.querySelector(".panel");
  if (!isTop) {panel.remove();for(const handle of root.querySelectorAll('.resize-handle'))handle.remove();}
  const content = root.querySelector(".content");
  const selectionHeader=root.querySelector('.selection-header');
  const svg = root.querySelector("svg");
  const abort = new AbortController();
  const listen = (target, type, handler, options = {}) => target.addEventListener(type, handler, { ...options, signal: abort.signal });
  const frameObserver = new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element && (node.matches("iframe, frame") || node.querySelector("iframe, frame"))))) bridge("frames-changed");
  });
  if (connected) frameObserver.observe(document.documentElement, {childList:true, subtree:true});
  let eyedropper=false, probe=null, pixelPending=false, pixelTime=0, probeSerial=0, captureMasked=false;
  const colorCanvas=document.createElement("canvas"), colorContext=colorCanvas.getContext("2d",{willReadFrequently:true});colorCanvas.width=colorCanvas.height=1;
  const pipette=root.querySelector(".eyedropper-popover");if(!isTop)pipette.remove();
  let mode = "inspect", selected = [], hovered = null, spacingHover=null, spacingAnchor=null, pointerPosition=null, spacingTargets=[], pinnedHover=false, alt = false, frame, lastDetails = "";
  let unit = "auto", sources, sourceTime = 0, updateDiagramRadii=()=>{};
  let localFrameId = isTop ? 0 : null, activeFrameId = 0, remote = null, localSnapshot = null, sentSnapshot = "";
  const revealed=new Set(); let descriptionId=0, feedbackTimer;
  let infoOpen=false,treeOpen=false,interFace;
  const nodeIds=new WeakMap();let nextNodeId=0,treeTargets=new Map();
  const {format, sourceReader, tokenLabel, displayValue, groupTypography, variableCopyText} = globalThis.designInspectCSS;
  const {hints:layoutHints,eye,override:overrideIcon,controls} = globalThis.designInspectIcons;
  const {splitValue,resolveRadii,insetRadii,radiusCSS}=globalThis.designInspectBox;
  const themeSelect=root.querySelector('.theme-select'),themeButton=root.querySelector('.theme-button'),unitSelect=root.querySelector('.unit-select');
  const themes={system:['System','M3 4h18v13H3z M8 21h8 M12 17v4'],light:['Light','M12 3v2m0 14v2M3 12h2m14 0h2M5.64 5.64l1.42 1.42m9.88 9.88 1.42 1.42m0-11.32-1.42 1.42m-9.88 9.88-1.42 1.42M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8'],dark:['Dark','M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z']};
  function setTheme(value,save=false){if(!themeSelect||!themeButton)return;if(!themes[value])value='system';themeSelect.value=value;if(value==='system')host.removeAttribute('data-theme');else host.dataset.theme=value;themeButton.replaceChildren(uiIcon(`<path d="${themes[value][1]}"/>`));themeButton.title=`Theme: ${themes[value][0]}`;themeButton.setAttribute('aria-hidden','true');themeButton.tabIndex=-1;themeSelect.setAttribute('aria-label',`Theme: ${themes[value][0]}`);if(save)globalThis.chrome?.storage?.local?.set({designInspectTheme:value});}
  if(themeSelect&&themeButton){setTheme('system');globalThis.chrome?.storage?.local?.get('designInspectTheme',result=>setTheme(result?.designInspectTheme||'system'));}
  function context(el) {
    return {root:parseFloat(getComputedStyle(document.documentElement).fontSize), element:parseFloat(getComputedStyle(el).fontSize), parent:parseFloat(getComputedStyle(el.parentElement || el).fontSize)};
  }
  function length(px, el) { return format(`${round(px)}px`, unit, context(el)); }
  const groups = [
    ["Appearance", ["background-color", "border-radius"]],
    ["Layout", ["display", "position", "box-sizing", "flex-direction", "justify-content", "align-items"]],
    ["Typography", ["font-family", "font-size", "font-weight", "line-height", "letter-spacing", "color"]],
  ];
  const name = (el) => el.localName + (el.id ? `#${el.id}` : "") + [...el.classList].slice(0, 3).map(c => `.${c}`).join("");
  const round = n => Math.round(n * 100) / 100;
  function identity(el) {
    treeTargets=new Map();
    const entry=(node,relation)=> {
      if(!nodeIds.has(node))nodeIds.set(node,++nextNodeId);
      const id=nodeIds.get(node);treeTargets.set(id,node);
      return {id,label:name(node),relation};
    };
    return {tag:el.localName,attributes:[...el.attributes].map(({name,value})=>({name,value})),tree:[...(el.parentElement?[entry(el.parentElement,'parent')]:[]),entry(el,'current'),...[...el.children].filter(child=>child!==host).map(child=>entry(child,'child'))]};
  }
  function pick(nodeId) {
    if(activeFrameId!==localFrameId){bridge('pick',{nodeId,frameId:activeFrameId});return;}
    const node=treeTargets.get(nodeId);
    if(node?.isConnected){selected=[node];claim();}
  }
  function details() {
    if (isTop && activeFrameId !== 0 && remote) {
      render(mode === "use" ? {title:"Use mode — interact with the website, then return to Inspect.", rows:[]} : remote.snapshot, remote.url);
      return;
    }
    let title, rows = [], sizes = [], incomplete = false, boxModel = null,element=null;
    if (mode === "use") title = "Use mode — interact with the website, then return to Inspect.";
    else if (!selected.length) title = "Click an element to inspect its properties.";
    else if (selected.length > 1) title = `${selected.length} elements selected. Click one to see its properties.`;
    else {
      const el = selected[0], rect = el.getBoundingClientRect(), css = getComputedStyle(el);
      if (!sources || performance.now() - sourceTime > 500) { sources = sourceReader(document); sourceTime = performance.now(); }
      const units = context(el);
      const fontSources=new Map();
      function value(property) {
        const computed=css.getPropertyValue(property);
        const color=property==="color" || property.endsWith("-color") ? computed : undefined;
        const actual = displayValue(format(computed, unit, units, property),color!==undefined);
        const source = sources.read(el, property);
        if (source && /var\(/.test(source.value)) {
          let fontSource;
          if(source.declaration==="font") {
            if(!fontSources.has(source.style))fontSources.set(source.style,`font-${fontSources.size+1}`);
            fontSource=fontSources.get(source.style);
          }
          return {token:source.value, actual, color, fontSource, longhandSource:source.declaration===property, note:source.declaration !== property ? `from ${source.declaration}` : ""};
        }
        return {actual:displayValue(actual!=="—" && unit === "auto" && source?.declaration === property ? source.value : actual,color!==undefined),color,longhandSource:source?.declaration===property};
      }
      title = name(el);
      element=identity(el);
      const sides = ["top", "right", "bottom", "left"];
      const horizontal = ["left", "right"], vertical = ["top", "bottom"];
      const thickness = side => parseFloat(css.getPropertyValue(`padding-${side}`)) + parseFloat(css.getPropertyValue(`border-${side}-width`));
      const contentSize = (dimension, axis) => {
        const used = parseFloat(css.getPropertyValue(dimension));
        const size = css.boxSizing === "border-box" ? used - axis.reduce((total, side) => total + thickness(side), 0) : used;
        return Number.isFinite(size) ? length(Math.max(0,size), el) : "auto";
      };
      const borderSize=(dimension,axis)=> {
        const used=parseFloat(css.getPropertyValue(dimension));
        return Number.isFinite(used) ? used+(css.boxSizing==='border-box'?0:axis.reduce((sum,side)=>sum+thickness(side),0)) : (dimension==='width'?el.offsetWidth:el.offsetHeight) || 0;
      };
      const cornerProperties={topLeft:'border-top-left-radius',topRight:'border-top-right-radius',bottomRight:'border-bottom-right-radius',bottomLeft:'border-bottom-left-radius'};
      const radii=resolveRadii(Object.fromEntries(Object.entries(cornerProperties).map(([corner,property])=>[corner,css.getPropertyValue(property)])),borderSize('width',horizontal),borderSize('height',vertical));
      for(const [corner,radius] of Object.entries(radii)) {
        const source=sources.read(el,cornerProperties[corner]);
        radius.label=source && !/var\(/.test(source.value) ? source.value : css.getPropertyValue(cornerProperties[corner]);
      }
      boxModel = {
        width:contentSize("width", horizontal), height:contentSize("height", vertical),
        radii,
        layers:[
          {label:"Margin", kind:"margin", sides:sides.map(side => [side,value(`margin-${side}`)])},
          {label:"Stroke", kind:"stroke", sides:sides.map(side => [side,value(`border-${side}-width`)]),
            colors:sides.filter(side => parseFloat(css.getPropertyValue(`border-${side}-width`)) > 0).map(side => [side,{...value(`border-${side}-color`), style:css.getPropertyValue(`border-${side}-style`)}])},
          {label:"Padding", kind:"padding", sides:sides.map(side => [side,value(`padding-${side}`)])},
        ],
      };
      sizes=["width","height"].map(property=>({property,screen:length(rect[property],el),css:value(property)}));
      const hasGap=[css.rowGap,css.columnGap].some(value=>value!=='normal' && (parseFloat(value)>0 || value.includes('calc(')));
      rows = groups.map(([label, props]) => {const fields=label==='Layout' && hasGap?['gap',...props]:props;const entries=fields.map(p => [p,value(p)]);return [label,label==="Typography" ? groupTypography(entries) : entries];});
      incomplete = sources.incomplete;
    }
    localSnapshot = {title, rows, sizes, incomplete, boxModel,element};
    if (isTop) render(localSnapshot);
    else if (activeFrameId === localFrameId) {
      const signature = JSON.stringify(localSnapshot);
      if (sentSnapshot !== signature) {sentSnapshot = signature; bridge("snapshot", {snapshot:localSnapshot});}
    }
  }
  function uiIcon(markup) {
    const icon=document.createElementNS("http://www.w3.org/2000/svg","svg");
    icon.setAttribute("viewBox","0 0 24 24");icon.setAttribute("class","ui-icon");icon.setAttribute("aria-hidden","true");
    icon.innerHTML=markup;return icon;
  }
  function positionHint(hint,anchor) {
    const target=anchor.getBoundingClientRect(), width=hint.offsetWidth, height=hint.offsetHeight;
    hint.style.left=`${Math.max(8,Math.min(target.left+target.width/2-width/2,innerWidth-width-8))}px`;
    hint.style.top=`${Math.max(8,Math.min(target.top-height-6>=8 ? target.top-height-6 : target.bottom+6,innerHeight-height-8))}px`;
  }
  function feedback(message, anchor) {
    if(abort.signal.aborted || !anchor.isConnected)return;
    const hint=root.querySelector(".copy-feedback");hint.textContent=message;hint.hidden=false;
    positionHint(hint,anchor);
    clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>{hint.hidden=true;},1500);
  }
  function legacyCopy(text) {
    const active=document.activeElement, input=document.createElement("textarea");
    input.value=text;input.readOnly=true;input.style.cssText="position:fixed;left:-9999px;top:0;";root.append(input);
    try {input.select();return document.execCommand("copy");}
    finally {input.remove();if(active instanceof HTMLElement)active.focus({preventScroll:true});}
  }
  async function copyVariable(text, button) {
    try {
      try {
        if(!navigator.clipboard?.writeText)throw new Error("Clipboard API unavailable");
        await navigator.clipboard.writeText(text);
      } catch {if(!legacyCopy(text))throw new Error("Copy failed");}
      feedback("Copied",button);
    } catch {feedback("Could not copy",button);}
  }
  function appendValue(container, value, scope, previewContainer) {
    if(value.color!==undefined && previewContainer) {
      const preview=document.createElement('span');preview.className='color-preview';preview.setAttribute('aria-hidden','true');preview.style.setProperty('--preview-color',value.color);previewContainer.append(preview);
    }
    if (value.token) {
      const stack=document.createElement("span"), token = document.createElement("button"), header=document.createElement("span"), toggle=document.createElement("button"), descriptions=document.createElement("span");
      const key=`${scope}:${value.token}`;
      header.className="value-header";descriptions.className="value-descriptions";descriptions.id=`value-${++descriptionId}`;
      stack.className="value-stack";
      const copyText=variableCopyText(value.token);
      token.type="button";token.className = "token"; token.textContent = tokenLabel(value.token); token.dataset.copyHint=`Copy ${copyText}\nCSS: ${value.token}`;token.title=token.dataset.copyHint;
      token.setAttribute("aria-label",`Copy ${copyText}`);token.addEventListener("click",()=>copyVariable(copyText,token));
      toggle.type="button";toggle.className="value-toggle";toggle.setAttribute("aria-controls",descriptions.id);
      function updateVisibility() {
        const visible=revealed.has(key);descriptions.hidden=!visible;
        toggle.setAttribute("aria-expanded",String(visible));toggle.title=visible ? "Hide computed value" : "Show computed value";
        toggle.setAttribute("aria-label",toggle.title);toggle.replaceChildren(uiIcon(eye(!visible)));
      }
      toggle.addEventListener("click",()=>{if(revealed.has(key))revealed.delete(key);else revealed.add(key);updateVisibility();});
      const tokenControl=document.createElement('span');tokenControl.className='token-control';
      updateVisibility();tokenControl.append(token,document.createTextNode('\u00a0'),toggle);header.append(tokenControl);stack.append(header);
      for(const description of value.descriptions || [{actual:value.actual}]) {
        const actual=document.createElement("span"); actual.className="actual";
        actual.textContent=(description.property ? `${description.property.replace(/^font-/,"")}: ` : "")+displayValue(description.actual,value.color!==undefined);
        descriptions.append(actual);
      }
      if(value.note) {const note=document.createElement("span");note.className="source-note";note.textContent=value.note;descriptions.append(note);}
      stack.append(descriptions);
      container.append(stack);
    } else container.textContent = displayValue(value.actual,value.color!==undefined);
  }
  function renderBox(model) {
    const figure = document.createElement("div"); figure.className = "box-model"; figure.setAttribute("aria-label", "Box model: margin, stroke, padding and content");
    let inner = document.createElement("div"); inner.className = "box-center";
    const caption = document.createElement("small"), size = document.createElement("span");
    caption.textContent = "Content";caption.tabIndex=0;
    caption.title="Content area width × height, excluding padding, borders and margins. This is the area for text and children, not the visible text bounds.";
    size.textContent = `${model.width} × ${model.height}`; inner.append(caption,size);
    const nested=[inner];
    const summaries = document.createElement("div"); summaries.className = "box-sources";
    function summarize(label, entries) {
      const grouped = new Map();
      for (const [side, value] of entries) {
        const key = JSON.stringify(value);
        if (!grouped.has(key)) grouped.set(key,{value,sides:[]});
        grouped.get(key).sides.push(side);
      }
      for (const {value,sides} of grouped.values()) {
        const row = document.createElement("div"), name = document.createElement("span"), detail = document.createElement("span");
        row.className = "box-source"; name.className = "box-source-label";detail.className="box-source-value";
        if(label==='Margin' || label==='Padding')row.dataset.spacing=label.toLowerCase();
        name.textContent = label + (sides.length === 4 ? "" : ` ${sides.map(s => s[0].toUpperCase()).join("/")}`);
        appendValue(detail,value,`box/${label}/${sides.join("-")}`,row); row.append(name,detail); summaries.append(row);
      }
    }
    for (const layer of model.layers) {
      summarize(layer.label,layer.sides.filter(([,value]) => value.token));
      if (layer.colors) summarize("Stroke color",layer.colors.map(([side,value]) => [side,{...value,actual:`${value.style} · ${value.actual}`} ]));
    }
    for (const layer of [...model.layers].reverse()) {
      const ring = document.createElement("div"); ring.className = `box-layer box-${layer.kind}`;
      const label = document.createElement("span"); label.className = "box-title"; label.textContent = layer.label.toLowerCase(); ring.append(label);
      for (const [side,value] of layer.sides) {
        const slot = document.createElement("span"), number = document.createElement("span");
        slot.className = `box-value box-${side}${value.token ? " has-token" : ""}`;
        slot.tabIndex = 0;
        slot.title = `${layer.label} ${side}: ${value.token ? `${value.token} · ` : ""}${value.actual}${value.note ? ` (${value.note})` : ""}`;
        slot.setAttribute("aria-label",slot.title);
        const parts=splitValue(value.actual);number.className='box-number';
        number.textContent=['left','right'].includes(side) ? parts.number : value.actual;slot.append(number);
        if(['left','right'].includes(side) && parts.unit) {const units=document.createElement('span');units.className='box-unit';units.textContent=parts.unit;slot.append(units);}
        ring.append(slot);
      }
      inner.classList.add("box-inner"); ring.append(inner); inner = ring;nested.push(ring);
    }
    const outer=inner;
    function annotations(corners) {
      const row=document.createElement('div');row.className='corner-row';
      const paths={topLeft:'M3 21V13A10 10 0 0 1 13 3H21',topRight:'M3 3H11A10 10 0 0 1 21 13V21',bottomRight:'M21 3V11A10 10 0 0 1 11 21H3',bottomLeft:'M21 21H13A10 10 0 0 1 3 11V3'};
      for(const corner of corners) {
        const radius=model.radii[corner];if(!radius.x || !radius.y)continue;
        const marker=document.createElement('span'),text=document.createElement('span');marker.className='radius-marker';marker.dataset.corner=corner;marker.dataset.side=corner.endsWith('Right')?'right':'left';marker.tabIndex=0;
        marker.title=`${corner.replace(/([A-Z])/g,' $1').toLowerCase()} radius: ${radius.label}`;marker.setAttribute('aria-label',marker.title);
        text.textContent=radius.label;marker.append(uiIcon(`<path d="${paths[corner]}"/>`),text);row.append(marker);
      }
      if(row.children.length)figure.append(row);
    }
    annotations(['topLeft','topRight']);figure.append(outer);annotations(['bottomLeft','bottomRight']);figure.append(summaries);content.append(figure);
    updateDiagramRadii=()=> {
      function apply(node,radii) {
        node.style.borderRadius=radiusCSS(radii);
        if(node.classList.contains('box-layer'))node.querySelector('.box-title').style.left=`${Math.max(7,Math.min(radii.topLeft.x+7,node.getBoundingClientRect().width/2-45))}px`;
      }
      apply(outer,model.radii);
      const bounds=outer.getBoundingClientRect();
      for(const node of nested)if(node!==outer)apply(node,insetRadii(model.radii,bounds,node.getBoundingClientRect()));
    };
    updateDiagramRadii();
  }
  function renderSizes(sizes) {
    const table=document.createElement("table"), body=document.createElement("tbody");table.className="size-table";table.setAttribute("aria-label","Element dimensions");
    for(const {property,screen,css} of sizes) {
      const row=document.createElement("tr"), label=document.createElement("th"), cell=document.createElement("td"), values=document.createElement("span"), actual=document.createElement("span"), cssGroup=document.createElement("span"), cssValue=document.createElement("span"), badge=document.createElement("span");
      label.scope="row";label.textContent=property;values.className="dimension-values";actual.className="screen-size";actual.textContent=screen;
      cssGroup.className="css-size";cssValue.className="css-size-value";appendValue(cssValue,css,`dimensions/${property}`);
      badge.className="css-size-badge";badge.textContent="css";badge.tabIndex=0;badge.setAttribute("aria-label","CSS size");badge.setAttribute("aria-describedby","css-size-help");
      const hint=root.querySelector(".size-tooltip");
      const show=()=>{hint.hidden=false;positionHint(hint,badge);};
      for(const event of ["pointerenter","focus"])badge.addEventListener(event,show);
      for(const event of ["pointerleave","blur"])badge.addEventListener(event,()=>{hint.hidden=true;});
      cssGroup.append(cssValue,badge);values.append(actual,cssGroup);cell.append(values);row.append(label,cell);body.append(row);
    }
    table.append(body);content.append(table);
  }
  function renderIdentity(title,element) {
    if(!element){const empty=document.createElement('p');empty.className='empty';empty.textContent=title;selectionHeader.append(empty);return;}
    const row=document.createElement('div'),label=document.createElement('p'),info=document.createElement('button'),tree=document.createElement('button'),description=document.createElement('div'),list=document.createElement('div');
    row.className='identity-row';label.className='name';label.textContent=title;label.title=title;
    info.className='element-info icon-button';info.title='Element attributes';info.setAttribute('aria-label','Element attributes');info.append(uiIcon(controls.info));
    tree.className='element-tree-toggle icon-button';tree.title='Element hierarchy';tree.setAttribute('aria-label','Element hierarchy');tree.append(uiIcon(controls.tree));
    description.className='element-details';description.id='element-attributes';list.className='element-tree';list.id='element-hierarchy';list.setAttribute('role','group');list.setAttribute('aria-label','Element hierarchy');
    info.setAttribute('aria-controls',description.id);tree.setAttribute('aria-controls',list.id);
    const markup=document.createElement('div'),tag=document.createElement('code'),attributes=document.createElement('dl');markup.className='dom-markup';tag.className='dom-tag';tag.textContent=`<${element.tag}>`;attributes.className='attribute-list';attributes.setAttribute('role','table');attributes.setAttribute('aria-label','Element attributes');
    for(const attribute of element.attributes) {
      const entry=document.createElement('div'),name=document.createElement('dt'),value=document.createElement('dd');entry.className='attribute-row';entry.setAttribute('role','row');name.className='attr-name';value.className='attr-value';name.setAttribute('role','rowheader');value.setAttribute('role','cell');name.textContent=attribute.name;value.textContent=attribute.value;entry.append(name,value);attributes.append(entry);
    }
    markup.append(tag);if(element.attributes.length)markup.append(attributes);description.append(markup);
    const owner=activeFrameId;
    function fillTree() {
      for(const entry of element.tree) {
        const button=document.createElement('button'),relation=document.createElement('span'),name=document.createElement('span');button.className='tree-item';button.dataset.relation=entry.relation;button.setAttribute('aria-current',String(entry.relation==='current'));button.title=entry.label;relation.className='tree-relation';relation.textContent={parent:'Parent',current:'Current',child:'Child'}[entry.relation];name.className='tree-name';name.textContent=entry.label;button.append(relation,name);
        button.addEventListener('click',()=>{if(owner===activeFrameId)pick(entry.id);});list.append(button);
      }
    }
    function update() {
      description.hidden=!infoOpen;list.hidden=!treeOpen;info.setAttribute('aria-expanded',String(infoOpen));tree.setAttribute('aria-expanded',String(treeOpen));
      if(treeOpen && !list.children.length)fillTree();
    }
    info.addEventListener('click',()=>{infoOpen=!infoOpen;treeOpen=false;update();});tree.addEventListener('click',()=>{treeOpen=!treeOpen;infoOpen=false;update();});update();
    row.append(label,info,tree);selectionHeader.append(row,description,list);
  }
  function render({title, rows = [], sizes = [], incomplete = false, boxModel = null,element=null}) {
    const signature = JSON.stringify([title, rows, sizes, incomplete, boxModel,element]);
    if (signature === lastDetails) return;
    lastDetails = signature;
    updateDiagramRadii=()=>{};
    root.querySelector(".size-tooltip").hidden=true;
    selectionHeader.replaceChildren();
    content.replaceChildren();
    renderIdentity(title,element);
    if (boxModel) renderBox(boxModel);
    if(sizes.length)renderSizes(sizes);
    for (const [group, entries] of rows) {
      if(group!=='Appearance'){const heading = document.createElement("h3"); heading.textContent = group; content.append(heading);}
      const dl = document.createElement("dl");dl.className='property-group';dl.dataset.group=group;
      for (const [property, value] of entries) {
        const row = document.createElement("div"); row.className = "row";
        const dt = document.createElement("dt"), dd = document.createElement("dd");
        dt.textContent = property;
        if(group==="Layout") {
          dt.title=layoutHints[property];dt.className="layout-name";dt.tabIndex=0;
          if(property==='gap')dt.dataset.spacing='gap';
        }
        if(value.overrideOf) {
          const marker=document.createElement("span");marker.className="override-marker";marker.setAttribute("role","img");
          marker.setAttribute("aria-label",`Overridden ${property}`);marker.append(uiIcon(overrideIcon()));dt.append(marker);
        }
        appendValue(dd,value,`${group}/${property}`,row);
        row.append(dt, dd); dl.append(row);
      }
      content.append(dl);
    }
    if (incomplete) {
      const note = document.createElement("p"); note.className = "hint";
      note.textContent = "Some CSS sources are inaccessible or unsupported. Variable names and Auto units may be incomplete; computed values remain available.";
      content.append(note);
    }
    updateDiagramRadii();
  }
  function node(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.append(el); return el;
  }
  function box(el, color, fill) {
    const r = el.getBoundingClientRect();
    node("rect", { x:r.left, y:r.top, width:r.width, height:r.height, stroke:color, fill });
    return r;
  }
  function spacing(el) {
    const areas=globalThis.designInspectSpacing.measure(el,host);
    if(!areas)return;
    const colors={margin:'#f0a13a',padding:'#38b86f',gap:'#8c69ed'};
    for(const kind of ['margin','padding','gap'])if(areas[kind].length) {
      // One path composites intersections once, keeping grid gutter crossings pale.
      const d=areas[kind].map(r=>`M ${r.left} ${r.top} H ${r.right} V ${r.bottom} H ${r.left} Z`).join(' ');
      node('path',{class:`spacing-${kind}`,d});
      areas[kind].forEach(area=>{
        const raw=kind==='gap'?areas.values.gap[area.axis==='x'?'column':'row']:areas.values[kind][area.side];
        const value=displayValue(format(raw,unit,context(el)));
        spacingTargets.push({area,kind,value});
      });
      if(spacingHover?.kind===kind) {
        for(const area of areas[kind]) {
          const raw=kind==='gap'?areas.values.gap[area.axis==='x'?'column':'row']:areas.values[kind][area.side];
          const value=displayValue(format(raw,unit,context(el)));
          spacingBadge(value,(area.left+area.right)/2,(area.top+area.bottom)/2,colors[kind],kind==='padding'||kind==='gap');
        }
      }
    }
  }
  function spacingBadge(value,x,y,color,whiteText=false) {
    const text=node('text',{class:'spacing-value',x,y});text.textContent=value;
    const bounds=text.getBBox(),box={x:bounds.x-3,y:bounds.y-2,width:bounds.width+6,height:bounds.height+4};
    const luminance=color.slice(1).match(/../g).map(channel=>parseInt(channel,16)/255).map(channel=>channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4);
    const ink=whiteText?'#f5f5f4':luminance[0]*.2126+luminance[1]*.7152+luminance[2]*.0722>.179?'#202020':'#f5f5f4';
    const plate=node('rect',{class:'spacing-value-bg',...box,rx:3,fill:color});text.setAttribute('fill',ink);svg.insertBefore(plate,text);
  }
  function measurement(route) {
    const value = length(route.distance, selected[0]);
    if (parseFloat(value) === 0) return;
    const [x1,y1] = route.start, [x2,y2] = route.corner;
    const horizontal = route.axis === "x";
    let path = `M ${x1} ${y1} L ${x2} ${y2}`;
    for (const [x,y] of [route.start,route.corner]) path += horizontal ? ` M ${x} ${y-4} L ${x} ${y+4}` : ` M ${x-4} ${y} L ${x+4} ${y}`;
    const guide = `M ${x2} ${y2} L ${route.end[0]} ${route.end[1]}`;
    const hasGuide = x2 !== route.end[0] || y2 !== route.end[1];
    if (hasGuide) node("path", {d:guide,class:"measure-line measure-guide"});
    node("path", {d:path,class:"measure-line measure-axis", "data-axis":route.axis});
    const label = node("text", {class:"measure-label",x:(x1+x2)/2 + (horizontal ? 0 : 8),y:(y1+y2)/2 - (horizontal ? 8 : 0),"text-anchor":horizontal ? "middle" : "start","dominant-baseline":horizontal ? "auto" : "middle"});
    label.style.textAnchor = horizontal ? "middle" : "start";
    label.textContent = value;
    const bounds=label.getBBox(),box={x:bounds.x-3,y:bounds.y-2,width:bounds.width+6,height:bounds.height+4};
    const plate=node("rect",{class:"measure-label-bg",...box,rx:3});svg.insertBefore(plate,label);
    return {label,plate,box};
  }
  function draw() {
    const remaining = selected.filter(el => el.isConnected);
    if (remaining.length !== selected.length) selected = remaining;
    svg.replaceChildren();spacingTargets=[];
    if (mode === "inspect" && !eyedropper) {
      if(selected.length===1)spacing(selected[0]);
      for (const el of selected) box(el, "#9c83ff", "none");
      if (hovered?.isConnected && !selected.includes(hovered)) box(hovered, alt ? "#ff6a00" : "#a995ff", "#9270ff08");
      if (alt && selected.length === 1 && hovered?.isConnected && hovered !== selected[0]) {
        const a = selected[0].getBoundingClientRect(), b = hovered.getBoundingClientRect();
        const badges=globalThis.designInspectGeometry.routes(a,b).map(measurement).filter(Boolean);
        const obstacles=isTop?[panel.getBoundingClientRect()]:[];
        const positions=globalThis.designInspectGeometry.labelPositions(badges.map(b=>b.box),{width:innerWidth,height:innerHeight},obstacles);
        for(let i=0;i<badges.length;i++) {
          const {label,plate,box}=badges[i],position=positions[i];
          label.setAttribute('transform',`translate(${position.x-box.x} ${position.y-box.y})`);plate.setAttribute('x',position.x);plate.setAttribute('y',position.y);
        }
      }
    }
    if(isTop && eyedropper && probe && !pixelPending && performance.now()-pixelTime>80)samplePixel();
    details(); frame = requestAnimationFrame(draw);
  }
  function setEyedropper(value,notify=true) {
    eyedropper=mode==='inspect' && !!value;probe=null;probeSerial++;pipette.hidden=true;alt=false;hovered=null;spacingHover=null;
    const button=root.querySelector('[data-eyedropper]');
    if(button){button.disabled=mode!=='inspect';button.setAttribute('aria-pressed',String(eyedropper));}
    if(notify && isTop)bridge('settings');
  }
  function colorBytes(value) {
    if(!CSS.supports('color',value))return null;
    colorContext.clearRect(0,0,1,1);colorContext.fillStyle=value;colorContext.fillRect(0,0,1,1);
    return [...colorContext.getImageData(0,0,1,1).data];
  }
  function colorCandidates(el) {
    if(el===document.documentElement && document.body){const css=getComputedStyle(el);if(css.backgroundImage==='none' && colorBytes(css.backgroundColor)?.[3]===0)el=document.body;}
    if(!sources || performance.now()-sourceTime>500){sources=sourceReader(document);sourceTime=performance.now();}
    const candidates=[];
    for(let node=el;node;node=node.parentElement){const css=getComputedStyle(node);if(parseFloat(css.opacity)<1 || css.filter!=='none' || css.backdropFilter!=='none' || css.mixBlendMode!=='normal')return [];}
    for(let node=el;node && node!==host;node=node.parentElement) {
      const css=getComputedStyle(node);
      for(const property of node===el?['color','border-top-color','border-right-color','border-bottom-color','border-left-color','background-color']:['background-color']) {
        if(property==='background-color' && css.backgroundImage!=='none')continue;
        const actual=css.getPropertyValue(property),rgba=colorBytes(actual);
        if(!rgba || rgba[3]!==255)continue;
        const source=sources.read(node,property);
        if(source && /var\(/.test(source.value))candidates.push({rgba,token:tokenLabel(source.value),actual});
      }
      if(css.backgroundImage!=='none' || colorBytes(css.backgroundColor)?.[3]===255)break;
    }
    return candidates;
  }
  function showProbe(next) {
    if(!eyedropper || mode!=='inspect')return;
    probe=next;probeSerial++;pipette.hidden=true;
  }
  async function samplePixel() {
    const current=probe,serial=probeSerial;pixelPending=true;pixelTime=performance.now();
    try {
      const result=connected?await runtime.sendMessage({channel:'design-inspect',type:'pixel',x:current.x,y:current.y,width:innerWidth,height:innerHeight}):{error:'Pixel sampling requires the Chrome extension'};
      if(serial!==probeSerial || !eyedropper || !host.isConnected || result?.retry)return;
      const rgba=result?.rgba;
      const hex=rgba?'#'+rgba.slice(0,3).map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase():null;
      const matches=rgba?(current.candidates || []).map(item=>({...item,error:Math.max(...item.rgba.map((v,i)=>Math.abs(v-rgba[i])))})).filter(item=>item.error<=3).sort((a,b)=>a.error-b.error):[];
      const candidate=matches[0] && !matches.some(item=>item.error===matches[0].error && item.token!==matches[0].token)?matches[0]:null;
      root.querySelector('.eyedropper-name').textContent=candidate?.token || hex || 'Color unavailable';
      const description=root.querySelector('.eyedropper-value');description.textContent=candidate?.actual || (rgba?'':result?.error || 'Could not sample this page');description.hidden=!description.textContent;
      const swatch=root.querySelector('.eyedropper-swatch');swatch.style.backgroundColor=hex || 'transparent';
      pipette.hidden=captureMasked;
      const r=pipette.getBoundingClientRect();
      pipette.style.left=Math.max(8,Math.min(current.x+18,innerWidth-r.width-8))+'px';
      pipette.style.top=Math.max(8,current.y+22+r.height>innerHeight?current.y-r.height-12:current.y+22)+'px';
    } catch(error) {
      if(serial===probeSerial){root.querySelector('.eyedropper-name').textContent='Color unavailable';root.querySelector('.eyedropper-value').textContent=error.message;root.querySelector('.eyedropper-value').hidden=false;root.querySelector('.eyedropper-swatch').style.backgroundColor='transparent';pipette.hidden=captureMasked;pipette.style.left=Math.min(current.x+18,innerWidth-280)+'px';pipette.style.top=Math.min(current.y+22,innerHeight-80)+'px';}
    } finally {pixelPending=false;}
  }
  // Only coordinates and CSS metadata cross window boundaries; screenshot pixels stay in the extension.
  function forwardProbe(data) {
    if(isTop)showProbe(data);else parent.postMessage({designInspectProbe:true,...data},'*');
  }
  listen(window,'message',event=>{
    if(!eyedropper || !event.data?.designInspectProbe)return;
    const child=[...document.querySelectorAll('iframe,frame')].find(frame=>frame.contentWindow===event.source);
    const data=event.data;
    if(!child || ![data.x,data.y,data.width,data.height].every(Number.isFinite) || data.width<=0 || data.height<=0)return;
    const r=child.getBoundingClientRect(),sx=r.width/child.offsetWidth,sy=r.height/child.offsetHeight;
    const x=r.left+(child.clientLeft+data.x*child.clientWidth/data.width)*sx,y=r.top+(child.clientTop+data.y*child.clientHeight/data.height)*sy;
    if(x<r.left || y<r.top || x>r.right || y>r.bottom)return;
    const candidates=Array.isArray(data.candidates)?data.candidates.slice(0,30).filter(c=>Array.isArray(c.rgba)&&c.rgba.length===4&&c.rgba.every(Number.isFinite)&&typeof c.token==='string'&&typeof c.actual==='string').map(c=>({...c,token:c.token.slice(0,300),actual:c.actual.slice(0,300)})):[];
    forwardProbe({x,y,width:innerWidth,height:innerHeight,candidates});
  });
  const ownEvent = event => event.composedPath().includes(host);
  function target(event) {
    // shortcut: inspect the outer element of Shadow DOM; add internal traversal when needed.
    return event.target instanceof Element && event.target !== host ? event.target : null;
  }
  function block(event) { event.preventDefault(); event.stopImmediatePropagation(); }
  function setMode(nextMode, notify = true) {
    if(nextMode==='use' && pinnedHover){pinnedHover=false;bridge('release-hover');}
    mode = nextMode; alt = false; hovered = null;spacingHover=null;
    setEyedropper(eyedropper,false);
    for (const item of root.querySelectorAll("[data-mode]")) item.setAttribute("aria-pressed", String(item.dataset.mode === mode));
    if(unitSelect)unitSelect.value=unit;
    details();
    if (notify && isTop) bridge("settings");
  }
  function setUnit(nextUnit,notify=true) {
    unit=nextUnit;
    if(unitSelect)unitSelect.value=unit;
    details();if(notify && isTop)bridge('settings');
  }
  function claim() {
    alt=false;spacingHover=null;spacingAnchor=pointerPosition;
    revealed.clear();lastDetails="";
    activeFrameId = localFrameId; remote = null;
    details();
    bridge("select", {snapshot:localSnapshot});
  }
  function shortcut(key, shift) {
    if (activeFrameId !== localFrameId) {bridge("shortcut", {key, shift}); return;}
    if (key === "Enter") {
      if (shift) selected = [...new Set(selected.map(el => el.parentElement).filter(el => el && el !== host))];
      else {
        const children = selected.flatMap(el => [...el.children]).filter(el => el !== host && el.getClientRects().length);
        if (children.length) selected = [...new Set(children)];
      }
    } else if (key === "Escape") selected = [];
    details();
  }
  listen(window, "pointermove", event => {
    pointerPosition={x:event.clientX,y:event.clientY};
    if (ownEvent(event)) {
      const moved=!spacingAnchor || Math.hypot(event.clientX-spacingAnchor.x,event.clientY-spacingAnchor.y)>=2;
      if(moved)spacingAnchor=null;
      spacingHover=null;hovered = null;probe=null;probeSerial++;pipette.hidden=true; return;
    }
    spacingAnchor=null;
    if(eyedropper){const el=target(event);if(el)forwardProbe({x:event.clientX,y:event.clientY,width:innerWidth,height:innerHeight,candidates:colorCandidates(el)});return;}
    const hit=mode==='inspect' && selected.length===1?spacingTargets.find(({area})=>event.clientX>=area.left&&event.clientX<=area.right&&event.clientY>=area.top&&event.clientY<=area.bottom):null;
    spacingHover=hit?{kind:hit.kind,value:hit.value}:null;hovered = target(event); alt = event.altKey;
    if(mode==='inspect')block(event);
  }, {capture:true});
  for (const type of ["pointerdown", "pointerup", "pointerout", "pointerleave", "mousedown", "mouseup", "mouseout", "mouseleave", "click", "dblclick", "contextmenu", "auxclick", "touchstart", "touchend", "dragstart"]) {
    listen(window, type, event => {
      if (ownEvent(event)) {
        // Handle the switch before site capture listeners see an outside click.
        // Preventing pointer/mouse defaults also keeps focus on the page's trigger.
        const control = root.elementFromPoint(event.clientX, event.clientY)?.closest("[data-mode], [data-eyedropper], .theme-select, .unit-select");
        if(root.elementFromPoint(event.clientX,event.clientY)?.closest('[data-spacing-kind]')){block(event);return;}
        if (control) {
          if(control.matches('.theme-select,.unit-select')){if(type==='pointerdown')try{control.showPicker();}catch{}block(event);return;}
          if (type === "click") {if(control.dataset.mode)setMode(control.dataset.mode);else setEyedropper(!eyedropper);}
          block(event);
        } else if(mode==='inspect'&&type==='pointerdown'&&root.elementFromPoint(event.clientX,event.clientY)?.closest('button')) {
          block(event);
        }
        return;
      }
      if (mode !== "inspect") return;
      if(['pointerout','pointerleave','mouseout','mouseleave'].includes(type)){if(pinnedHover)block(event);return;}
      if (!eyedropper && type === "click" && !event.altKey) { const el = target(event); if (el) {selected = [el]; claim();} }
      block(event);
    }, {capture:true, passive:false});
  }
  listen(window, "keydown", event => {
    if(event.altKey&&event.shiftKey&&event.code==='KeyP'&&!event.ctrlKey&&!event.metaKey){block(event);if(!event.repeat)bridge('toggle-pinned-inspect').then(result=>{if(!abort.signal.aborted&&result?.ok!==false){pinnedHover=!!result?.pinned;setMode(result?.mode||'inspect');}});return;}
    if (mode !== "inspect") return;
    if((event.code==='KeyI' || event.key.toLowerCase()==='i') && !event.ctrlKey && !event.metaKey && !event.altKey){block(event);if(!event.repeat){if(isTop)setEyedropper(!eyedropper);else bridge('eyedropper-toggle');}return;}
    if(event.key==='Escape' && eyedropper){block(event);if(isTop)setEyedropper(false);else bridge('eyedropper-toggle');return;}
    if(eyedropper){if(!ownEvent(event))block(event);return;}
    if(ownEvent(event)){if(event.key==='Alt'){alt=event.altKey;bridge('modifiers',{alt});}return;}
    if (event.key==='Alt' || alt !== event.altKey) bridge("modifiers", {alt:event.altKey});
    alt = event.altKey;
    if (event.key === "Enter") {
      block(event);
      shortcut(event.key, event.shiftKey);
    } else if (event.key === "Escape") { shortcut(event.key, false); block(event); }
    else if ([" ", "Tab", "Alt"].includes(event.key)) block(event);
    else event.stopImmediatePropagation();
  }, {capture:true});
  listen(window, "keyup", event => {
    if (mode === "inspect" && (event.key==='Alt' || alt !== event.altKey)) bridge("modifiers", {alt:event.altKey});
    alt = event.altKey;
    if (mode === "inspect" && !ownEvent(event)) event.stopImmediatePropagation();
  }, {capture:true});
  listen(window, "blur", () => {if(isTop && alt && !document.hasFocus())bridge('modifiers',{alt:false});alt = false; hovered = null;probe=null;probeSerial++;pipette.hidden=true;});
  listen(document, "pointerleave", () => {hovered = null;probe=null;probeSerial++;pipette.hidden=true;});
  for(const type of ["scroll","resize"])listen(window,type,()=>{probe=null;probeSerial++;pipette.hidden=true;if(eyedropper)bridge("pixel-invalidate");},{capture:true});
  const pipetteButton=panel.querySelector("[data-eyedropper]");pipetteButton.append(uiIcon(controls.eyedropper));listen(pipetteButton,"click",()=>setEyedropper(!eyedropper));
  for (const button of panel.querySelectorAll("[data-mode]")) {button.append(uiIcon(controls[button.dataset.mode]));listen(button,"click",()=>setMode(button.dataset.mode));}
  if(unitSelect)listen(unitSelect,'change',event=>setUnit(event.currentTarget.value));
  panel.querySelector('.close').append(uiIcon(controls.close));
  if(themeSelect)listen(themeSelect,'change',()=>setTheme(themeSelect.value,true));
  listen(panel.querySelector(".frame-access"), "click", () => bridge("open-access"));
  let drag,resize;
  const resizeHandles=[...root.querySelectorAll('.resize-handle')];
  function syncHandles() {
    if(!isTop)return;
    const bounds=panel.getBoundingClientRect();
    for(const handle of resizeHandles) {
      const vertical=['top','bottom'].includes(handle.dataset.edge);
      handle.style.left=`${vertical?bounds.left:(handle.dataset.edge==='left'?bounds.left:bounds.right)-4}px`;
      handle.style.top=`${vertical?(handle.dataset.edge==='top'?bounds.top:bounds.bottom)-4:bounds.top}px`;
      handle.style.width=`${vertical?bounds.width:8}px`;handle.style.height=`${vertical?8:bounds.height}px`;
      handle.setAttribute('aria-valuenow',String(Math.round(vertical?bounds.height:bounds.width)));handle.setAttribute('aria-valuemin',String(Math.min(vertical?180:340,(vertical?innerHeight:innerWidth)-32)));handle.setAttribute('aria-valuemax',String((vertical?innerHeight:innerWidth)-32));
    }
  }
  function resizePanel(edge,size,bounds) {
    const vertical=['top','bottom'].includes(edge),start=edge==='left'||edge==='top';
    const viewport=vertical?innerHeight:innerWidth,near=vertical?bounds.top:bounds.left,far=vertical?bounds.bottom:bounds.right;
    const maximum=Math.min(viewport-32,start?far-8:viewport-near-8),minimum=Math.min(vertical?180:340,maximum);
    size=Math.max(minimum,Math.min(maximum,size));panel.style[vertical?'height':'width']=`${size}px`;
    place(vertical?bounds.left:(start?far-size:near),vertical?(start?far-size:near):bounds.top);updateDiagramRadii();syncHandles();
  }
  for(const handle of resizeHandles) {
    const vertical=['top','bottom'].includes(handle.dataset.edge),direction=handle.dataset.edge==='left'||handle.dataset.edge==='top'?-1:1;
    listen(handle,'pointerdown',event=>{resize={edge:handle.dataset.edge,position:vertical?event.clientY:event.clientX,bounds:panel.getBoundingClientRect()};handle.setPointerCapture(event.pointerId);event.preventDefault();});
    listen(handle,'pointermove',event=>{if(resize)resizePanel(resize.edge,(vertical?resize.bounds.height:resize.bounds.width)+((vertical?event.clientY:event.clientX)-resize.position)*direction,resize.bounds);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(handle,type,()=>{resize=null;});
    listen(handle,'keydown',event=>{const keys=vertical?['ArrowUp','ArrowDown']:['ArrowLeft','ArrowRight'];if(!keys.includes(event.key))return;event.preventDefault();const r=panel.getBoundingClientRect();resizePanel(handle.dataset.edge,(vertical?r.height:r.width)+(event.key===keys[1]?16:-16)*direction,r);});
  }
  const panelObserver=isTop?new ResizeObserver(()=>{syncHandles();updateDiagramRadii();}):null;
  panelObserver?.observe(panel);
  async function loadInter() {
    try {
      const source=connected ? new Uint8Array((await runtime.sendMessage({channel:'design-inspect',type:'font'})).bytes) : `url("${new URL('fonts/InterVariable.woff2',scriptSource || location.href).href}")`;
      const face=await new FontFace('Design Inspect Inter',source,{weight:'100 900'}).load();
      if(abort.signal.aborted)return;interFace=face;document.fonts.add(face);syncHandles();updateDiagramRadii();
    } catch(error){console.debug('Design Inspect font:',error.message);}
  }
  const header = panel.querySelector("header");
  listen(header, "pointerdown", event => {
    if (event.target.closest("button, select")) return;
    const r = panel.getBoundingClientRect(); drag = {x:event.clientX-r.left,y:event.clientY-r.top};
    header.setPointerCapture(event.pointerId); event.preventDefault();
  });
  function place(left, top) {
    panel.style.left = `${Math.max(8, Math.min(left, innerWidth-panel.offsetWidth-8))}px`;
    panel.style.top = `${Math.max(8, Math.min(top, innerHeight-panel.offsetHeight-8))}px`;
    panel.style.right = "auto";
    syncHandles();
  }
  listen(header, "pointermove", event => { if (drag) place(event.clientX-drag.x, event.clientY-drag.y); });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) listen(header, type, () => {drag = null;});
  listen(window, "resize", () => { const r = panel.getBoundingClientRect(); place(r.left, r.top);updateDiagramRadii(); });
  function receive(message, sender, respond) {
    if (message?.channel !== "design-inspect" || sender.id !== runtime.id) return;
    if (message.type === "get-state" && isTop) {respond({mode, unit, activeFrameId,eyedropper}); return;}
    if(message.type==='probe-clear' && isTop){probe=null;probeSerial++;pipette.hidden=true;return;}
    if(message.type==='eyedropper-toggle' && isTop){setEyedropper(!eyedropper);return;}
    if(message.type==='toggle-pinned-inspect' && isTop){pinnedHover=!!message.pinned;setMode(message.mode||'inspect');return;}
    if(message.type==='hover-pin-lost' && isTop){pinnedHover=false;return;}
    if(message.type==='capture-mask' && isTop){captureMasked=!!message.hidden;pipette.hidden=true;if(captureMasked){requestAnimationFrame(()=>requestAnimationFrame(()=>respond({ok:true})));return true;}respond({ok:true});return;}
    if (message.type === "destroy") {destroy(false); return;}
    if (message.type === "configure") {
      if (Number.isInteger(message.frameId)) localFrameId = message.frameId;
      unit = message.unit; if(unitSelect)unitSelect.value=unit; activeFrameId = message.activeFrameId;
      setMode(message.mode, false);setEyedropper(message.eyedropper,false);
    } else if (message.type === "active") {
      activeFrameId = message.activeFrameId;
      if (activeFrameId !== localFrameId) {selected = []; hovered = null;}
      else remote = null;
      details();
    } else if (["selection", "snapshot"].includes(message.type) && isTop) {
      if (message.type === "selection") {revealed.clear();lastDetails="";activeFrameId = message.frameId; if (activeFrameId !== 0) selected = [];}
      if (activeFrameId === message.frameId && activeFrameId !== 0) remote = {snapshot:message.snapshot, url:message.url};
      details();
    } else if (message.type === "shortcut" && mode === "inspect") shortcut(message.key, message.shift);
    else if(message.type==='pick' && mode==='inspect' && activeFrameId===localFrameId)pick(message.nodeId);
    else if (message.type === "modifiers") alt = message.alt;
    else if (message.type === "frame-gone" && isTop && activeFrameId === message.frameId) {
      activeFrameId = 0; remote = null; details();
    } else if (message.type === "frame-status" && isTop) {
      const button = panel.querySelector(".frame-access");
      button.hidden = message.blocked.length === 0;
      button.textContent = `Enable iframe access (${message.blocked.length})…`;
    }
  }
  function destroy(notify = true) {
    if (notify && isTop) bridge("close");
    cancelAnimationFrame(frame);clearTimeout(feedbackTimer); abort.abort(); frameObserver.disconnect();panelObserver?.disconnect();if(interFace)document.fonts.delete(interFace); host.remove();
    if (connected) runtime.onMessage.removeListener(receive);
    delete globalThis[key];
  }
  listen(panel.querySelector(".close"), "click", () => destroy());
  globalThis[key] = { destroy };
  if(isTop){syncHandles();loadInter();}
  if (connected) {runtime.onMessage.addListener(receive); bridge("ready");}
  draw();
})();

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

  const tokens=globalThis.designInspectTokens;
  const tokenNumber=name=>tokens.number(name);
  const tokenColor=name=>getComputedStyle(host).getPropertyValue(`--di-${name}`).trim();
  const host = document.createElement("design-inspect-overlay");
  host.dataset.theme = "light";
  host.style.cssText = `all:initial!important;position:fixed!important;inset:0!important;z-index:${tokenNumber('layer-overlay')}!important;pointer-events:none!important;`;
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `
    <style>
      ${tokens.styleSheet}





      * { box-sizing:border-box; }
      [hidden] { display:none!important; }
      .panel { position:fixed; top:var(--di-space-viewport); right:var(--di-space-viewport); width:var(--di-size-panel-width); min-width:min(var(--di-size-panel-min-width),calc(100vw - var(--di-size-panel-viewport-clearance))); max-width:calc(100vw - var(--di-size-panel-viewport-clearance)); min-height:min(var(--di-size-panel-min-height),calc(100vh - var(--di-size-panel-viewport-clearance))); max-height:calc(100vh - var(--di-size-panel-viewport-clearance)); display:flex; flex-direction:column; overflow:hidden; pointer-events:auto; background:var(--di-color-surface-panel); color:var(--di-color-text-primary); border:var(--di-border-hairline-width) solid var(--di-color-border-default); border-radius:var(--di-radius-panel); box-shadow:var(--di-shadow-floating); font:var(--di-font-ui); }
      button { color:inherit; background:var(--di-color-surface-control-hover); border:0; border-radius:var(--di-radius-button-default); padding:var(--di-space-control-horizontal) var(--di-space-group); font:inherit; line-height:var(--di-font-line-height-compact); cursor:pointer; }
      button:focus-visible, select:focus-visible, [tabindex]:focus-visible { outline:var(--di-border-focus-strong-width) solid var(--di-color-text-secondary); outline-offset:var(--di-space-inline-tight); }
      .icon-button { display:inline-flex; align-items:center; justify-content:center; flex:none; width:var(--di-size-control); height:var(--di-size-control); padding:var(--di-space-related); background:transparent; color:var(--di-color-text-secondary); }
      .element-info.icon-button, .element-tree-toggle.icon-button { width:var(--di-size-control); height:var(--di-size-control); padding:var(--di-space-related); }
      .icon-button:hover { color:var(--di-color-text-primary); background:var(--di-color-surface-control-hover); }
      .theme-select { position:absolute; top:50%; right:var(--di-size-theme-select-offset); transform:translateY(-50%); width:var(--di-size-control); height:var(--di-size-control); opacity:0; cursor:pointer; }
      .eyedropper-popover { position:fixed; z-index:var(--di-layer-probe); max-width:min(var(--di-size-tooltip-max-width),calc(100vw - var(--di-size-icon))); display:grid; grid-template-columns:var(--di-size-icon) minmax(0,1fr); gap:var(--di-space-related) var(--di-space-group); padding:var(--di-space-tooltip-inset); border:var(--di-border-hairline-width) solid var(--di-color-border-default); border-radius:var(--di-radius-popover); background:var(--di-color-surface-panel); color:var(--di-color-text-primary); box-shadow:var(--di-shadow-probe); font:var(--di-font-code-compact); pointer-events:none; overflow-wrap:anywhere; }
      .eyedropper-swatch { width:var(--di-size-icon); height:var(--di-size-icon); border-radius:var(--di-radius-section); box-shadow:inset 0 0 0 var(--di-space-pixel-alignment) var(--di-color-border-default); }
      .eyedropper-value { grid-column:2; color:var(--di-color-text-secondary); font-size:var(--di-font-size-caption); }
      .segmented { display:inline-flex; align-items:center; gap:var(--di-space-inline-tight); height:var(--di-size-control); padding:0; border-radius:var(--di-radius-field); box-shadow:inset 0 0 0 var(--di-space-pixel-alignment) var(--di-color-border-default); background:var(--di-color-surface-section); }
      .segmented button { flex:none; height:var(--di-size-control); min-height:var(--di-size-control); padding:0 var(--di-space-header-divider); border-radius:var(--di-radius-button-default); color:var(--di-color-text-secondary); background:transparent; font-size:var(--di-font-size-body); line-height:var(--di-size-icon); }
      .segmented button[aria-pressed=true] { color:var(--di-color-text-on-accent); background:var(--di-color-action); }
      .segmented button:hover { color:var(--di-color-text-primary); }
      .modes button { display:flex; align-items:center; justify-content:center; width:var(--di-size-control); padding:var(--di-space-related); }
      .unit-select-wrap { position:relative; display:inline-flex; flex:none; height:var(--di-size-control); }
      .unit-select-wrap::after { content:""; position:absolute; top:var(--di-space-group); right:var(--di-space-group); width:var(--di-space-control-horizontal); height:var(--di-space-control-horizontal); border-right:var(--di-border-icon-width) solid currentColor; border-bottom:var(--di-border-icon-width) solid currentColor; transform:rotate(45deg); pointer-events:none; }
      .unit-select { appearance:none; width:var(--di-size-value-min-width); height:var(--di-size-control); padding:0 var(--di-size-line-heading) 0 var(--di-space-field-inset); border:var(--di-border-hairline-width) solid var(--di-color-border-default); border-radius:var(--di-radius-field); background:transparent; color:var(--di-color-text-primary); font:var(--di-font-code-label); cursor:pointer; }
      .content { flex:1; min-height:0; overflow:auto; padding:0; }
      .selection-header { flex:none; padding:0 var(--di-space-selection-inset); max-height:40vh; overflow:auto; border-bottom:var(--di-border-hairline-width) solid var(--di-color-border-default); }
      .identity-row { display:flex; align-items:flex-start; gap:var(--di-space-related); min-width:0; margin-bottom:var(--di-space-group); }
      .name { flex:1; min-width:0; margin:0; padding:var(--di-space-related) 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--di-color-text-primary); font:var(--di-font-code-compact); }
      .empty { margin:0 0 var(--di-space-section); color:var(--di-color-text-secondary); }
      .element-details, .element-tree { margin:0 0 var(--di-space-section); max-height:min(var(--di-size-selection-max-height),calc(40vh - var(--di-size-settings-section-height))); overflow:auto; padding:var(--di-space-tooltip-inset); border:var(--di-border-hairline-width) solid var(--di-color-border-default); border-radius:var(--di-radius-field); background:var(--di-color-surface-section); }
      .dom-markup { display:flex; flex-direction:column; gap:var(--di-space-group); color:var(--di-color-text-primary); font:var(--di-font-code-markup); }
      .dom-tag { overflow-wrap:anywhere; }
      .attribute-list { margin:0; }
      .tree-item { display:flex; align-items:center; gap:var(--di-space-group); width:100%; padding:var(--di-space-control-horizontal); text-align:start; background:transparent; }
      .tree-item[aria-current=true] { background:var(--di-color-surface-control-hover); }
      .tree-relation { flex:none; width:var(--di-size-tree-relation-width); font:var(--di-font-ui-caption); color:var(--di-color-text-secondary); }
      .tree-name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font:var(--di-font-code-compact); }
      .value-stack { display:grid; grid-template-columns:minmax(0,1fr); row-gap:var(--di-space-label-offset); }
      .color-preview { width:var(--di-size-icon); height:var(--di-size-icon); border-radius:var(--di-radius-section); grid-column:2; grid-row:1; align-self:start; box-shadow:0 0 0 var(--di-space-pixel-alignment) var(--di-color-border-default); background-image:conic-gradient(var(--di-color-text-secondary) 25%,var(--di-color-border-default) 0 50%,var(--di-color-text-secondary) 0 75%,var(--di-color-border-default) 0); background-size:var(--di-space-group) var(--di-space-group); }
      .color-preview::after { content:""; display:block; width:100%; height:100%; border-radius:inherit; background:var(--preview-color); }
      .value-header { display:flex; align-items:flex-start; gap:var(--di-space-related); min-width:0; }
      .token-control { display:inline-flex; align-items:center; min-width:0; }
      .token { color:var(--di-color-text-primary); background:none; padding:0; text-align:start; min-width:0; overflow-wrap:anywhere; font:var(--di-font-code-compact); }
      .token:hover { color:var(--di-color-text-primary); text-decoration:none; }
      .value-toggle { flex:none; display:inline-flex; align-items:center; justify-content:center; width:var(--di-size-icon); height:var(--di-size-icon); padding:0; background:transparent; color:var(--di-color-text-secondary); }
      .value-toggle .ui-icon { width:var(--di-size-icon); height:var(--di-size-icon); }
      .value-toggle:hover { background:var(--di-color-surface-control-hover); color:var(--di-color-text-primary); }
      .actual, .source-note, .value-chain { display:block; color:var(--di-color-text-secondary); font:var(--di-font-code-caption-compact); }
      .value-chain { overflow-wrap:anywhere; }
      .layout-name { cursor:help; text-decoration:underline dotted var(--di-color-text-secondary); text-underline-offset:var(--di-space-label-offset); }
      .copy-feedback, .size-tooltip { position:fixed; max-width:calc(100vw - var(--di-size-icon)); padding:var(--di-space-control-horizontal) var(--di-space-tooltip-inset); border:var(--di-border-hairline-width) solid var(--di-color-border-default); border-radius:var(--di-radius-feedback); background:var(--di-color-surface-section); color:var(--di-color-text-primary); box-shadow:var(--di-shadow-feedback); font:var(--di-font-ui-caption); }
      .dimension-values { display:grid; gap:var(--di-space-label-offset); }
      .screen-size { font:var(--di-font-code-label); }
      .css-size { display:flex; align-items:flex-start; gap:var(--di-space-header-divider); min-width:0; max-width:100%; color:var(--di-color-text-secondary); }
      .css-size-value { min-width:0; overflow-wrap:anywhere; font:var(--di-font-code-caption-compact); }
      .css-size .token { font-size:var(--di-font-size-caption); }
      .css-size-badge { flex:none; padding:0 var(--di-space-related); border:var(--di-border-hairline-width) solid var(--di-color-border-default); border-radius:var(--di-radius-section); background:var(--di-color-surface-section); color:var(--di-color-text-secondary); font:var(--di-font-ui-caption); cursor:help; }
      .frame-access { display:flex; flex:none; align-self:stretch; align-items:center; justify-content:center; width:100%; margin:0 0 var(--di-space-related); padding:var(--di-space-section); border:0; border-radius:var(--di-radius-section-outer) var(--di-radius-section-outer) var(--di-radius-section) var(--di-radius-section); background:var(--di-color-action); color:var(--di-color-text-on-accent); font:var(--di-font-body); text-align:center; }
      .frame-access:hover { background:var(--di-color-action-hover); }
      .frame-access:active { background:var(--di-color-action-pressed); }
      .box-model { margin:var(--di-space-group) 0 var(--di-space-section); }
      .corner-row { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:var(--di-space-group); margin:var(--di-space-related) 0; }
      .radius-marker { display:inline-flex; align-items:center; gap:var(--di-space-related); min-width:0; color:var(--di-color-text-primary); font:var(--di-font-code-caption-compact); }
      .radius-marker[data-side=right] { grid-column:2; justify-self:end; flex-direction:row-reverse; text-align:right; }
      .radius-marker .ui-icon { flex:none; width:var(--di-space-selection-inset); height:var(--di-space-selection-inset); }
      .radius-marker span { overflow-wrap:anywhere; }
      .box-layer { position:relative; display:grid; grid-template-columns:minmax(var(--di-size-control),var(--di-size-panel-viewport-clearance)) minmax(0,1fr) minmax(var(--di-size-control),var(--di-size-panel-viewport-clearance)); grid-template-rows:var(--di-size-box-label-height) minmax(var(--di-size-box-content-compact-height),auto) var(--di-size-box-label-height); border:var(--di-border-hairline-width) solid; border-radius:var(--di-radius-box-layer); min-width:0; }
      .box-margin { background:var(--di-color-box-margin-tint); border-color:var(--di-color-box-margin); color:var(--di-color-box-margin); }
      .box-stroke { background:var(--di-color-box-border-tint); border-color:var(--di-color-box-border); color:var(--di-color-box-border); }
      .box-padding { background:var(--di-color-box-padding-tint); border-color:var(--di-color-box-padding); color:var(--di-color-box-padding); }
      dt[data-spacing=gap] { color:var(--di-color-accent-gap); }
      .spacing-margin { fill:var(--di-color-overlay-margin); fill-opacity:var(--di-opacity-overlay); stroke:none; }
      .spacing-padding { fill:var(--di-color-overlay-padding); fill-opacity:var(--di-opacity-overlay); stroke:none; }
      .spacing-gap { fill:var(--di-color-overlay-gap); fill-opacity:var(--di-opacity-overlay-gap); stroke:none; }
      .spacing-value-bg { stroke:none; pointer-events:none; }
      .spacing-value { font:var(--di-font-code-caption-compact); text-anchor:middle; dominant-baseline:middle; stroke:none; pointer-events:none; }
      .box-title { position:absolute; top:var(--di-space-related); left:var(--di-space-field-inset); font:var(--di-font-ui-caption); }
      .box-value { display:flex; align-items:center; justify-content:center; min-width:0; padding:var(--di-space-pixel-alignment); font:var(--di-font-code-caption-compact); }
      .box-value span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .box-left, .box-right { flex-direction:column; gap:0; text-align:center; }
      .box-left span, .box-right span { max-width:100%; white-space:normal; overflow:visible; text-overflow:clip; overflow-wrap:anywhere; text-align:center; }
      .box-value .box-unit { font-size:var(--di-font-size-caption); opacity:var(--di-opacity-tertiary); }
      .box-value.has-token span { text-decoration:underline dotted; text-underline-offset:var(--di-space-label-offset); }
      .box-top { grid-area:1 / 2; } .box-right { grid-area:2 / 3; } .box-bottom { grid-area:3 / 2; } .box-left { grid-area:2 / 1; }
      .box-inner { grid-area:2 / 2; min-width:0; }
      .box-center { display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:var(--di-size-box-content-compact-height); padding:var(--di-space-related) var(--di-space-inline-tight); background:var(--di-color-box-content-tint); color:var(--di-color-box-content); border:var(--di-border-hairline-width) solid var(--di-color-box-content-border); border-radius:var(--di-radius-box-layer); font:var(--di-font-code-caption-compact); text-align:center; overflow-wrap:anywhere; }
      .box-center small { font:var(--di-font-ui-caption); opacity:var(--di-opacity-tertiary); margin-bottom:var(--di-space-inline-tight); }
      h3 { font-size:var(--di-font-size-body); line-height:var(--di-size-icon); color:var(--di-color-text-primary); text-transform:none; letter-spacing:0; margin:var(--di-space-selection-inset) 0 var(--di-space-control-horizontal); font-weight:var(--di-font-weight-strong); }
      dl { margin:0; }
      .override-marker { display:inline-flex; align-items:center; justify-content:center; width:var(--di-size-icon); height:var(--di-size-icon); margin-left:var(--di-space-related); border-radius:var(--di-radius-section); background:var(--di-color-surface-control-hover); color:var(--di-color-text-primary); vertical-align:middle; }
      .resize-handle { position:fixed; width:var(--di-size-resize-hit-area); pointer-events:auto; cursor:ew-resize; touch-action:none; }
      .resize-handle[data-edge=top], .resize-handle[data-edge=bottom] { height:var(--di-size-resize-hit-area); cursor:ns-resize; }
      .resize-handle:focus-visible { outline:var(--di-border-hairline-width) solid var(--di-color-text-secondary); background:var(--di-color-surface-control-hover); }
      .spacing-edit { pointer-events:auto; cursor:pointer; }
      .spacing-edit:focus-visible { outline:var(--di-border-focus-width) solid var(--di-color-action); }
      svg.measurements { position:fixed; inset:0; width:100%; height:100%; overflow:visible; pointer-events:none; }
      svg.ui-icon { display:block; width:var(--di-size-icon); height:var(--di-size-icon); fill:none; stroke:currentColor; stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round; pointer-events:none; }
      rect { vector-effect:non-scaling-stroke; }
      .measure-line { stroke:var(--di-color-overlay-measure); stroke-width:var(--di-space-pixel-alignment); fill:none; }
      .measure-guide { stroke-dasharray:4 4; }
      .measure-label { fill:var(--di-color-overlay-label-dark); font:var(--di-font-code-caption-compact); text-anchor:middle; stroke:none; }
      .measure-label-bg { fill:var(--di-color-overlay-measure); stroke:none; }
      .content { padding:0; }
      .box-model { padding:var(--di-space-group) var(--di-space-section); }
      h3 { margin:var(--di-space-related) 0; padding:var(--di-space-related) var(--di-space-section) 0; font:var(--di-font-heading); }
      .selection-header { padding:0 var(--di-space-section); border-bottom:0; }
      .identity-row { margin-bottom:var(--di-space-related); }
      .element-details,.element-tree { background:var(--di-color-surface-section); border:0; margin:0 calc(-1 * var(--di-space-section)) var(--di-space-related); padding:var(--di-space-related) var(--di-space-section); border-radius:var(--di-radius-popover) var(--di-radius-popover) var(--di-radius-box-layer) var(--di-radius-box-layer); }

      /* Exact geometry from Figma 2:952; SVGs retain their original viewBoxes. */
      .panel { border-color:var(--di-color-surface-panel); }
      .figma-icon { display:block; flex:none; pointer-events:none; }
      .selection-header { padding:var(--di-space-related) var(--di-space-section) var(--di-space-related); }
      .identity-row { align-items:center; gap:var(--di-space-inline-tight); margin:0; }
      .identity-label { display:flex; align-items:baseline; gap:var(--di-space-inline-tight); flex:1; min-width:0; margin-right:var(--di-space-inline-tight); overflow:hidden; }
      .identity-label .name { flex:0 1 auto; min-width:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
      .name { padding:0; font:var(--di-font-selection-name); }
      .identity-label .dom-tag { display:block; flex:0 2 auto; min-width:0; max-width:var(--di-size-dom-tag-limit); color:var(--di-color-text-secondary); font:var(--di-font-dom-tag); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .element-info,.element-tree-toggle { background:transparent; color:var(--di-color-text-secondary); border-radius:var(--di-radius-control-round); }
      .element-info:hover,.element-tree-toggle:hover { background:transparent; color:var(--di-color-text-hover); }
      .element-info[aria-expanded=true],.element-tree-toggle[aria-expanded=true] { color:var(--di-color-action); }
      .element-info[aria-expanded=true]:hover,.element-tree-toggle[aria-expanded=true]:hover { color:var(--di-color-action-hover); }
      .element-details,.element-tree { margin-top:var(--di-space-related); }

      /* Header states and segmented settings from Figma section 7:986. */


      /* Header components: a single set of dimensions and states from 7:986. */
      header { position:relative; flex:none; display:flex; align-items:center; justify-content:space-between; gap:var(--di-space-group); height:var(--di-size-header-height); padding:var(--di-space-section) var(--di-space-section) var(--di-space-header-divider); border-bottom:var(--di-border-hairline-width) solid var(--di-color-surface-panel); cursor:grab; touch-action:none; }
      .brand { display:flex; align-items:center; gap:var(--di-space-inline-tight); width:var(--di-size-brand-width); height:var(--di-size-control); flex:none; }
      .brand-label { display:block; width:var(--di-size-brand-prefix-width); height:var(--di-size-line-heading); flex:none; }
      .tool-modes { display:flex; align-items:center; gap:var(--di-space-related); width:auto; height:var(--di-size-control); flex:none; }
      header button { appearance:none; -webkit-appearance:none; box-sizing:border-box; margin:0; box-shadow:none; text-decoration:none; cursor:pointer; flex:none; }
      .inspect-toggle { display:flex; align-items:center; gap:var(--di-space-related); width:var(--di-size-inspect-width); height:var(--di-size-control); padding:var(--di-space-inline-tight) var(--di-space-related) var(--di-space-inline-tight) var(--di-space-control-horizontal); border:0; border-radius:var(--di-radius-control); background:var(--di-color-surface-control); color:var(--di-color-action); }
      .inspect-toggle[aria-pressed=true] { background:var(--di-color-action); color:var(--di-color-text-on-accent); }
      .inspect-label { display:block; width:var(--di-size-brand-label-width); height:var(--di-size-line-heading); flex:none; }
      .inspect-state { display:flex; align-items:center; width:var(--di-size-icon); height:var(--di-size-icon); flex:none; }
      .eyedropper-button,.close { display:flex; align-items:center; justify-content:center; width:var(--di-size-control); height:var(--di-size-control); padding:var(--di-space-related); border:0; border-radius:var(--di-radius-control-round); background:var(--di-color-surface-control); color:var(--di-color-text-primary); }
      .close { padding:var(--di-space-label-offset); border:var(--di-border-hairline-width) solid var(--di-color-border-default); background:transparent; color:var(--di-color-text-secondary); }
      .eyedropper-button[aria-pressed=true] { background:var(--di-color-action); color:var(--di-color-text-on-accent); }
      .eyedropper-button:disabled { opacity:var(--di-opacity-disabled); cursor:default; }
      .settings-button { display:flex; align-items:center; gap:var(--di-space-related); width:auto; height:var(--di-size-control); padding:var(--di-space-inline-tight) var(--di-space-related); border:0; border-radius:var(--di-radius-control-round); background:var(--di-color-surface-control); color:var(--di-color-text-primary); }
      .settings-button>span { display:flex; align-items:center; flex:none; }
      .units-icon,.theme-icon,.settings-chevron { width:var(--di-size-icon); height:var(--di-size-icon); }
      .unit-label { width:auto; height:var(--di-size-line-heading); }
      .settings-divider { width:var(--di-space-control-horizontal); height:var(--di-size-line-heading); color:var(--di-color-text-secondary); }
      .settings-chevron { color:var(--di-color-text-secondary); }
      .settings-button[aria-expanded=true] .settings-chevron { transform:rotate(180deg); }
      .header-button.header-button { background:var(--di-color-surface-control); color:var(--di-color-text-primary); }
      header button:hover,.header-button.header-button:hover { background:var(--di-color-surface-control-hover); }
      .inspect-toggle[aria-pressed=true]:hover,.eyedropper-button[aria-pressed=true]:hover { background:var(--di-color-action-hover); color:var(--di-color-text-on-accent); }
      header button:active,header button[data-pointer-pressed],.header-button.header-button:active,.header-button.header-button[data-pointer-pressed],.settings-button[aria-expanded=true] { background:var(--di-color-surface-control-pressed); }
      .inspect-toggle[aria-pressed=true]:active,.inspect-toggle[aria-pressed=true][data-pointer-pressed],.eyedropper-button[aria-pressed=true]:active,.eyedropper-button[aria-pressed=true][data-pointer-pressed] { background:var(--di-color-action-pressed); color:var(--di-color-text-on-accent); }
      header button:focus,.header-button.header-button:focus { outline:none; }
      header button:focus-visible,.header-button.header-button:focus-visible,.settings-options button:focus-visible { outline:var(--di-border-hairline-width) solid var(--di-color-action); outline-offset:var(--di-space-inline-tight); }
      .dropdown-surface { pointer-events:auto; border:var(--di-border-hairline-width) solid var(--di-color-border-subtle); border-radius:var(--di-radius-popover); background:var(--di-color-surface-popover); color:var(--di-color-text-primary); box-shadow:var(--di-shadow-floating); }
      .settings-menu { position:absolute; z-index:var(--di-layer-popover); top:var(--di-size-settings-offset-top); right:var(--di-size-settings-offset-right); display:flex; flex-direction:column; gap:var(--di-space-section); width:var(--di-size-settings-width); height:var(--di-size-settings-height); padding:var(--di-space-control-horizontal) var(--di-space-group) var(--di-space-group); }
      .settings-section { display:grid; grid-template-rows:var(--di-size-line-heading) var(--di-size-control); gap:var(--di-space-related); width:var(--di-size-settings-content-width); height:var(--di-size-settings-section-height); flex:none; margin:0; padding:0; }
      .settings-label { display:block; width:var(--di-size-settings-content-width); height:var(--di-size-line-heading); margin:0; padding:0; }
      .settings-options { display:flex; gap:var(--di-space-pixel-alignment); width:var(--di-size-settings-content-width); height:var(--di-size-control); }
      .settings-options button { appearance:none; display:flex; align-items:flex-start; justify-content:center; flex:1 1 0; min-width:0; height:var(--di-size-control); margin:0; padding:0 var(--di-space-control-horizontal) var(--di-space-related); border:0; border-radius:0; background:transparent; color:var(--di-color-text-primary); box-shadow:inset 0 0 0 var(--di-space-pixel-alignment) var(--di-color-border-default); cursor:pointer; }
      .settings-options button:first-child { border-radius:var(--di-radius-control) 0 0 var(--di-radius-control); }
      .settings-options button:last-child { border-radius:0 var(--di-radius-control) var(--di-radius-control) 0; }
      .settings-options button[aria-pressed=true] { flex-grow:0; flex-basis:var(--di-size-settings-option-selected-width); background:var(--di-color-action); color:var(--di-color-text-on-accent); box-shadow:none; }
      .settings-section:last-child .settings-options button[aria-pressed=true] { flex-basis:var(--di-size-theme-option-selected-width); }
      .settings-options button:hover { background:var(--di-color-surface-control-hover); }
      .settings-options button:active { background:var(--di-color-surface-control-pressed); }
      .settings-options button[aria-pressed=true]:hover { background:var(--di-color-action-hover); }
      .settings-options button[aria-pressed=true]:active { background:var(--di-color-action-pressed); }
      .settings-options button:focus { outline:none; }
      .settings-options button:focus-visible { outline:var(--di-border-hairline-width) solid var(--di-color-action); outline-offset:var(--di-space-inline-tight); }
      header .figma-icon,.settings-menu .figma-icon { max-width:none; max-height:none; margin:0; padding:0; border:0; }
      .inspect-state .figma-icon,.units-icon .figma-icon,.theme-icon .figma-icon,.settings-chevron .figma-icon,.eyedropper-button .figma-icon,.close .figma-icon { width:var(--di-size-icon); height:var(--di-size-icon); }

      .box-model { display:flex; flex-direction:column; gap:var(--di-space-related); margin:var(--di-space-related) 0; padding:var(--di-space-section); background:var(--di-color-surface-popover); border-radius:var(--di-radius-box-layer); }
      .corner-row { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:var(--di-space-group); height:var(--di-font-size-caption); margin:0; }
      .radius-marker { gap:var(--di-space-related); color:var(--di-color-text-primary); font:var(--di-font-caption); }
      .radius-marker .figma-icon { width:var(--di-size-icon-corner); height:var(--di-size-icon-corner); color:var(--di-color-text-primary); }
      .box-layer { display:grid; grid-template-columns:var(--di-size-box-side-track) minmax(0,1fr) var(--di-size-box-side-track); grid-template-rows:var(--di-size-box-end-track) minmax(var(--di-size-box-content-min-height),auto) var(--di-size-box-end-track); border:var(--di-border-hairline-width) solid; min-width:0; border-radius:var(--di-radius-box-layer); }
      .box-margin { color:var(--di-color-box-margin); border-color:var(--di-color-box-margin); background:linear-gradient(var(--di-color-box-margin-tint),var(--di-color-box-margin-tint)),var(--di-color-box-canvas); }
      .box-stroke { color:var(--di-color-box-border); border-color:var(--di-color-box-border); background:linear-gradient(var(--di-color-box-border-tint),var(--di-color-box-border-tint)),var(--di-color-box-canvas); }
      .box-padding { color:var(--di-color-box-padding); border-color:var(--di-color-box-padding); background:linear-gradient(var(--di-color-box-padding-tint),var(--di-color-box-padding-tint)),var(--di-color-box-canvas); }
      .box-center { min-height:var(--di-size-box-content-min-height); padding:var(--di-space-related); color:var(--di-color-box-content); border:var(--di-border-hairline-width) solid var(--di-color-box-content-border); background:linear-gradient(var(--di-color-box-content-tint),var(--di-color-box-content-tint)),var(--di-color-box-canvas); font:var(--di-font-caption); }
      .box-title { top:var(--di-space-label-offset); left:var(--di-space-tooltip-inset); font:var(--di-font-caption); }
      .box-value { padding:0; font:var(--di-font-caption); }
      .box-measurement { display:inline-flex; align-items:center; justify-content:center; gap:var(--di-space-inline-tight); min-width:0; font:var(--di-font-caption); }
      .box-value .box-unit { font-size:var(--di-font-size-caption); opacity:var(--di-opacity-secondary); }
      .box-left .box-measurement,.box-right .box-measurement { flex-direction:column; gap:0; }
      .box-var { appearance:none; display:inline-block; margin:0; padding:0; border:0; border-radius:0; background:none; color:inherit; opacity:var(--di-opacity-secondary); font:var(--di-font-caption); text-decoration:none; border-bottom:var(--di-border-hairline-width) dashed currentColor; padding-bottom:var(--di-space-pixel-alignment); cursor:help; }
      .box-var:hover,.box-var:focus-visible { opacity:1; }
      .box-tooltip { position:fixed; z-index:var(--di-layer-tooltip); max-width:min(var(--di-size-tooltip-max-width),calc(100vw - var(--di-size-icon))); padding:var(--di-space-group) var(--di-space-section); border:var(--di-border-hairline-width) solid var(--di-color-border-default); border-radius:var(--di-radius-popover); background:var(--di-color-surface-popover); color:var(--di-color-text-primary); box-shadow:var(--di-shadow-floating); pointer-events:none; overflow-wrap:anywhere; }
      .box-tooltip-title { font:var(--di-font-body); }
      .box-tooltip-description { margin-top:var(--di-space-related); color:var(--di-color-text-secondary); font:var(--di-font-tooltip-description); }
      .dimension-values { display:flex; align-items:center; flex-wrap:wrap; gap:var(--di-space-group); }
      .dimension-value { display:inline-flex; align-items:center; gap:var(--di-space-related); }
      .dimension-icon { width:var(--di-size-icon); height:var(--di-size-icon); color:var(--di-color-icon-muted); }
      .screen-size { font:var(--di-font-body); }
      .border-meta { display:block; font:var(--di-font-body); }

      /* Shared table row. The parameter column is 35% of the complete row. */
      .content { display:flex; flex-direction:column; gap:var(--di-space-related); padding:0; }
      .content>* { flex:none; }
      .content>:last-child { flex:1 0 auto; }
      .property-section { width:100%; min-width:0; padding:var(--di-space-related) 0; border-radius:var(--di-radius-section-outer); background:var(--di-color-surface-panel); overflow:hidden; }
      .property-section h3 { height:var(--di-size-line-section-heading); margin:0; padding:var(--di-space-related) var(--di-space-section); color:var(--di-color-text-primary); font:var(--di-font-heading); }
      .property-section h3 .figma-icon { width:var(--di-size-heading-vector-width); height:var(--di-size-line-heading); max-width:none; }
      .property-group,.size-table,.attribute-list { display:block; width:100%; min-width:0; margin:0; padding:0; border:0; border-radius:0; background:transparent; }
      .border-values { display:flex; flex-direction:column; gap:0; }
      .border-component { position:relative; margin:0; padding:0; font:var(--di-font-body); }
      .border-component .token { font:inherit; }
      .border-component>.color-preview { position:absolute; left:calc(0px - var(--di-space-group) - var(--di-size-table-marker) / 2 - var(--di-space-selection-inset) / 2); top:var(--di-space-inline-tight); width:var(--di-space-selection-inset); height:var(--di-space-selection-inset); margin:0; border-radius:var(--di-radius-round); box-shadow:inset 0 0 0 var(--di-space-pixel-alignment) var(--di-color-border-swatch); }

      .table-row { display:grid; grid-template-columns:minmax(0,var(--di-size-table-parameter-limit)) var(--di-size-table-marker) minmax(0,1fr); align-items:start; width:100%; min-width:0; margin:0; padding:0; gap:0; border:0; border-bottom:var(--di-border-hairline-width) solid var(--di-color-border-default); font:var(--di-font-body); }
      .table-row:last-child { border-bottom:0; }
      .basic-properties:has([data-group=Appearance]) .size-table .table-row { border-bottom:var(--di-border-hairline-width) solid var(--di-color-border-default); }
      .table-row>.table-parameter { grid-column:1; grid-row:1; min-width:0; width:100%; max-width:100%; margin:0; padding:var(--di-space-related) var(--di-space-section); color:var(--di-color-text-secondary); font:var(--di-font-body); text-align:start; overflow-wrap:anywhere; white-space:normal; }
      .table-row>.table-marker { grid-column:2; grid-row:1; display:flex; justify-content:center; align-items:flex-start; min-width:0; padding:var(--di-space-related); }
      .table-row>.table-value { grid-column:3; grid-row:1; min-width:0; margin:0; padding:var(--di-space-related) var(--di-space-section) var(--di-space-related) var(--di-space-group); color:var(--di-color-text-primary); font:var(--di-font-body); text-align:start; overflow-wrap:anywhere; white-space:normal; user-select:text; }
      .table-marker .color-preview,.review-suggestion-marker .color-preview { display:block; flex:none; width:var(--di-space-selection-inset); height:var(--di-space-selection-inset); margin:var(--di-space-inline-tight) 0 0; border-radius:var(--di-radius-round); box-shadow:inset 0 0 0 var(--di-space-pixel-alignment) var(--di-color-border-swatch); }
      .table-marker .color-preview:after { border-radius:inherit; }
      .table-row .token { font:var(--di-font-body); text-decoration:none; }
      .table-row .value-stack { width:100%; min-width:0; row-gap:var(--di-space-related); }
      .table-row .value-header { min-width:0; gap:var(--di-space-related); }
      .table-row .token-control { display:flex; flex-wrap:nowrap; align-items:flex-start; min-width:0; max-width:100%; gap:var(--di-space-related); }
      .table-row .token-control>.token { flex:0 1 auto; min-width:0; max-width:100%; }
      .table-row .value-toggle { flex:none; width:var(--di-size-icon); height:var(--di-size-icon); margin-top:var(--di-space-pixel-alignment); }
      .table-row .actual,.table-row .source-note,.table-row .value-chain { margin-top:var(--di-space-related); font:var(--di-font-caption); color:var(--di-color-text-secondary); overflow-wrap:anywhere; }
      .table-parameter.layout-name { text-decoration:none; }
      .table-parameter:has(.layout-property-icon) { display:flex; align-items:flex-start; gap:var(--di-space-group); }
      .layout-property-icon { width:var(--di-size-icon); height:var(--di-size-icon); margin-top:var(--di-space-pixel-alignment); color:var(--di-color-icon-muted); }
      .parameter-text { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; line-clamp:2; min-width:0; overflow:hidden; overflow-wrap:anywhere; }
      .table-parameter:has(.override-marker) { display:flex; align-items:flex-start; gap:var(--di-space-related); }
      .table-parameter>.parameter-text { flex:1; }
      .table-parameter>.layout-property-icon,.table-parameter>.override-marker { flex:none; }
      .table-row .table-parameter[data-spacing=gap] { color:var(--di-color-accent-gap); }
      .element-details { padding:var(--di-space-related) 0; border-radius:var(--di-radius-section-outer); }
      .element-details .dom-markup { gap:0; }
      .box-model { margin:0; }


      .panel { background:var(--di-color-surface-panel); border:var(--di-border-panel-width) solid var(--di-color-border-panel); }
      .property-section,.box-model,.element-details,.element-tree { background:var(--di-color-surface-section); border-radius:var(--di-radius-section); }
      .property-section { overflow:hidden; }
      .content>.property-section:last-of-type { border-bottom-left-radius:var(--di-radius-section-outer); border-bottom-right-radius:var(--di-radius-section-outer); }
      .content>:first-child:is(.property-section,.box-model) { border-top-left-radius:var(--di-radius-section-outer); border-top-right-radius:var(--di-radius-section-outer); }
      .panel:has(.element-details:not([hidden]),.element-tree:not([hidden])) .content>:first-child { border-top-left-radius:var(--di-radius-section); border-top-right-radius:var(--di-radius-section); }
      .element-details:not([hidden]),.element-tree:not([hidden]) { border-top-left-radius:var(--di-radius-section-outer); border-top-right-radius:var(--di-radius-section-outer); }
      .table-row { grid-template-columns:minmax(0,var(--table-parameter-width,var(--di-size-table-parameter-limit))) var(--di-size-table-marker) minmax(0,1fr); }
      .table-row .value-stack { display:flex; flex-direction:column; gap:var(--di-space-related); }
      .table-row .value-header { display:flex; width:100%; align-items:flex-start; justify-content:space-between; gap:var(--di-space-related); }
      .table-row .value-header>.token { flex:1 1 auto; min-width:0; }
      .value-actions { display:flex; align-items:flex-start; justify-content:flex-end; gap:var(--di-space-related); flex:none; margin-left:auto; }
      .table-row .value-actions .value-toggle { display:flex; align-items:center; justify-content:center; width:var(--di-size-icon); height:var(--di-size-icon); margin:0; padding:0; border:0; background:transparent; color:var(--di-color-text-secondary); }
      .table-row .value-actions .value-toggle .figma-icon { width:var(--di-size-icon); height:var(--di-size-icon); }
      .table-row .value-actions .value-toggle[aria-expanded=true] { color:var(--di-color-action); }
      .table-row .value-actions .value-toggle:hover { background:transparent; color:var(--di-color-text-hover); }
      .table-row .value-actions .value-toggle[aria-expanded=true]:hover { color:var(--di-color-action-hover); }
      .table-row .value-chain,.table-row .value-descriptions,.table-row .actual,.table-row .source-note { margin:0; color:var(--di-color-text-secondary); font:var(--di-font-caption); overflow-wrap:anywhere; }
      .table-row .value-descriptions { display:flex; flex-direction:column; gap:var(--di-space-related); }
      .table-row .value-chain:not([hidden])+.value-descriptions:not([hidden]) { border-top:var(--di-border-hairline-width) solid var(--di-color-border-description); padding-top:var(--di-space-related); }

      .all-properties { display:block; flex:none; width:100%; margin:0 0 var(--di-space-related); padding:var(--di-space-section); border:0; border-radius:var(--di-radius-section); background:var(--di-color-surface-section); color:var(--di-color-text-primary); font:var(--di-font-body); text-align:start; }
      .all-properties:hover { background:var(--di-color-surface-control-hover); }
      .all-properties[aria-pressed=true] { color:var(--di-color-action); }
      .panel:not(:has(.element-details:not([hidden]),.element-tree:not([hidden]))) .all-properties:not([hidden]) { border-top-left-radius:var(--di-radius-section-outer); border-top-right-radius:var(--di-radius-section-outer); }
      .panel:has(.all-properties:not([hidden])) .content>:first-child { border-top-left-radius:var(--di-radius-section); border-top-right-radius:var(--di-radius-section); }
      .panel:has(.frame-access:not([hidden])) .element-details,.panel:has(.frame-access:not([hidden])) .element-tree,.panel:has(.frame-access:not([hidden])) .all-properties:not([hidden]),.panel:has(.frame-access:not([hidden])) .content>:first-child { border-top-left-radius:var(--di-radius-section); border-top-right-radius:var(--di-radius-section); }
      .selection-header:empty { display:none; }
      .content>.content-message { display:flex; align-items:center; justify-content:center; margin:0; padding:var(--di-space-section); background:var(--di-color-surface-section); color:var(--di-color-text-secondary); border-radius:var(--di-radius-section-outer); font:var(--di-font-body); text-align:center; }
      .settings-section:last-child .settings-options button[data-theme-choice] { align-items:center; gap:var(--di-space-related); padding:0 var(--di-space-related); flex:1 1 0; }
      .settings-options button[data-theme-choice]>.figma-icon { flex:none; }
    </style>
    <div class="eyedropper-popover" role="tooltip" hidden><span class="eyedropper-swatch"></span><span class="eyedropper-name"></span><span class="eyedropper-value"></span></div>
    <div class="box-tooltip" id="box-variable-tooltip" role="tooltip" hidden></div><div class="box-tooltip" id="parameter-name-tooltip" role="tooltip" hidden></div>
    <svg class="measurements" aria-hidden="true"></svg>
    <section class="panel" aria-label="Design Inspect">
      <header><div class="brand"><span class="brand-label" aria-label="/des"></span><button class="inspect-toggle" data-mode="use" aria-label="Stop inspecting" aria-pressed="true"><span class="inspect-label" aria-hidden="true"></span><span class="inspect-state"></span></button></div><div class="tool-modes"><button class="eyedropper-button icon-button" data-eyedropper aria-label="Eyedropper" title="Eyedropper — I" aria-pressed="false"></button><button class="settings-button" aria-label="Units and theme" aria-expanded="false" aria-controls="inspector-settings"><span class="units-icon"></span><span class="unit-label">Auto</span><span class="settings-divider" aria-hidden="true"></span><span class="theme-icon"></span><span class="settings-chevron" aria-hidden="true"></span></button><button class="close icon-button" aria-label="Close inspector"></button></div></header>
      <div class="settings-menu dropdown-surface" id="inspector-settings" role="dialog" aria-label="Units and theme" hidden><div class="settings-section" role="group" aria-label="Units"><div class="settings-label">Units</div><div class="settings-options"><button data-unit="auto" aria-pressed="true">Auto</button><button data-unit="px" aria-pressed="false">px</button><button data-unit="rem" aria-pressed="false">rem</button><button data-unit="em" aria-pressed="false">em</button></div></div><div class="settings-section" role="group" aria-label="Theme"><div class="settings-label">Theme</div><div class="settings-options"><button data-theme-choice="system" aria-pressed="true">System</button><button data-theme-choice="light" aria-pressed="false">Light</button><button data-theme-choice="dark" aria-pressed="false">Dark</button></div></div></div>
      <select class="unit-select" hidden aria-label="Measurement units"><option value="auto">Auto</option><option value="px">px</option><option value="rem">rem</option><option value="em">em</option></select><select class="theme-select" hidden aria-label="Theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select>
      <button class="frame-access" hidden>Iframe appeared. Allow inspect</button>
      <div class="selection-header"></div>
      <button class="all-properties" aria-pressed="false" hidden>Show all properties</button>
      <div class="content" aria-live="polite"></div>
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
  let mode = "inspect", selected = [], hovered = null, spacingHover=null, spacingAnchor=null, pointerPosition=null, spacingTargets=[], holdSpacingBadges=false, pinnedHover=false, alt = false, frame, lastDetails = "";
  let showAllProperties=false;
  let unit = "auto", sources, sourceTime = 0, updateDiagramRadii=()=>{};
  let localFrameId = isTop ? 0 : null, activeFrameId = 0, remote = null, localSnapshot = null, sentSnapshot = "";
  const revealed=new Set(),chainsRevealed=new Set(); let descriptionId=0;
  let treeOpen=false;const panelFonts=[];
  const nodeIds=new WeakMap();let nextNodeId=0,treeTargets=new Map();
  const newReviewInstance=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
  let reviewInstance=newReviewInstance(),reviewUrl=location.href,topReviewContext={url:location.href,width:innerWidth,height:innerHeight};
  const overrides=globalThis.designInspectOverrides?.create(document);
  let reviewUI=null,reviewAfter=true,lastReviewContext='';
  function reviewContext(){return {instance:reviewInstance,url:topReviewContext.url,width:topReviewContext.width,height:topReviewContext.height,...(!isTop?{frameUrl:location.href,frameWidth:innerWidth,frameHeight:innerHeight}:{})};}
  function ensureReviewContext(){
    if(!overrides)return;
    if(reviewUrl!==location.href){overrides.clear();reviewUrl=location.href;reviewInstance=newReviewInstance();}
    if(isTop)topReviewContext={url:location.href,width:innerWidth,height:innerHeight};
    const next=globalThis.designInspectReview.contextKey(reviewContext());
    if(next!==lastReviewContext){lastReviewContext=next;overrides.setContext(next);if(isTop&&connected)bridge('settings');}
  }
  async function compareReview(after){
    reviewAfter=after;overrides?.compare(after);reviewUI?.view(after);lastDetails='';
    if(connected)await bridge('review-compare',{after});details();
  }
  async function applyReview(command){
    ensureReviewContext();
    if(command.instance!==reviewInstance||command.contextKey!==lastReviewContext||selected.length!==1||nodeIds.get(selected[0])!==command.elementId||!selected[0].isConnected)throw Error('Element or page changed. Select it again.');
    const el=selected[0],event={context:reviewContext(),elementId:command.elementId,identity:reviewIdentity(el)};
    let prepared;
    if(command.kind==='comment'){event.kind='comment';event.comment=command.comment;}
    else {
      if(!command.property.startsWith('@')&&!globalThis.designInspectOverrides.properties.includes(command.property))throw Error('Unsupported property: '+command.property);
      event.kind='parameter';event.property=command.property;
      if(command.kind==='reset')event.remove=true;
      else {
        prepared=overrides.prepare(el,command.property,command.value,(node,p)=>sourceReader(document).read(node,p));
        event.autoStyles=prepared.autoStyles;event.original=prepared.original;event.target={expression:prepared.expression,computed:null};event.remove=prepared.remove;
      }
    }
    // Persist before treating a preview as committed; failed writes keep the editor recoverable.
    if(prepared)event.target.computed=overrides.preview(el,command.property,prepared);
    const result=await bridge('review-change',{event});
    if(!result||result.error)return result||{error:'Review storage is unavailable.'};
    if(!el.isConnected||command.instance!==reviewInstance||command.contextKey!==lastReviewContext)return {error:'Saved, but the page changed before preview could apply.'};
    if(prepared){if(result.started)prepared=overrides.prepare(el,command.property,command.value,(node,p)=>sourceReader(document).read(node,p));overrides.commit(el,command.property,prepared);}
    else if(command.kind==='reset')overrides.reset(el,command.property);
    holdSpacingBadges=false;sources=null;lastDetails='';details();return {ok:true,review:result};
  }
  let reviewVariableNames=[],reviewVariableOwner=null,reviewVariableTime=0;
  function reviewVariables(el){
    const css=getComputedStyle(el);
    if(reviewVariableOwner===el&&performance.now()-reviewVariableTime<500)return reviewVariableNames.map(name=>({name,value:css.getPropertyValue(name).trim()}));
    const names=new Set(Array.from(css).filter(p=>p.startsWith('--')));
    const collect=style=>{for(const p of Array.from(style||[]))if(p.startsWith('--'))names.add(p);};
    for(let node=el;node;node=node.parentElement)collect(node.style);
    const visit=rules=>{for(const rule of rules){collect(rule.style);try{if(rule.cssRules)visit(rule.cssRules);if(rule.styleSheet)visit(rule.styleSheet.cssRules);}catch{}}};
    for(const sheet of document.styleSheets)try{visit(sheet.cssRules);}catch{}
    reviewVariableNames=[...names].sort();reviewVariableOwner=el;reviewVariableTime=performance.now();
    return reviewVariableNames.map(name=>({name,value:css.getPropertyValue(name).trim()}));
  }
  function reviewIdentity(el){
    const path=[];for(let node=el;node&&path.length<6;node=node.parentElement){let part=node.localName;if(node.id){part+='#'+CSS.escape(node.id);path.unshift(part);break;}if(node.parentElement)part+=`:nth-child(${[...node.parentElement.children].indexOf(node)+1})`;path.unshift(part);}
    return {tag:el.localName,selector:el.id?'#'+CSS.escape(el.id):undefined,domPath:path.join(' > '),text:(el.textContent||'').trim().slice(0,200),parent:el.parentElement?name(el.parentElement):undefined,attributes:[...el.attributes].filter(a=>['id','class','role','aria-label','name','data-testid','data-test'].includes(a.name)).map(a=>({name:a.name,value:a.value.slice(0,300)}))};
  }
  if(isTop&&connected&&globalThis.designInspectReviewPanel)reviewUI=globalThis.designInspectReviewPanel.install(root,panel,{
    colorPreview,icon:figmaIcon,assets:()=>bridge('review-assets'),request:(operation,payload)=>bridge('review-operation',{operation,payload}),compare:compareReview,refresh:()=>{lastDetails='';details();},
    edit:command=>bridge('review-target',{targetFrameId:activeFrameId,command})
  });
  const {format, sourceReader, tokenLabel, displayValue, groupTypography, variableCopyText} = globalThis.designInspectCSS;
  const {hints:layoutHints,eye,override:overrideIcon,controls,arrangeLayout} = globalThis.designInspectIcons;
  const {splitValue,resolveRadii,insetRadii,radiusCSS,capRadii,sideExpression}=globalThis.designInspectBox;
  const themeSelect=root.querySelector('.theme-select'),themeButton=root.querySelector('.theme-icon'),unitSelect=root.querySelector('.unit-select');
  const themes={system:['System','M3 4h18v13H3z M8 21h8 M12 17v4'],light:['Light','M12 3v2m0 14v2M3 12h2m14 0h2M5.64 5.64l1.42 1.42m9.88 9.88 1.42 1.42m0-11.32-1.42 1.42m-9.88 9.88-1.42 1.42M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8'],dark:['Dark','M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z']};
  function setTheme(value,save=false){if(!themeSelect||!themeButton)return;if(!themes[value])value='system';themeSelect.value=value;host.dataset.theme=value;themeButton.replaceChildren(figmaIcon(value));themeButton.title=`Theme: ${themes[value][0]}`;themeButton.setAttribute('aria-hidden','true');themeButton.tabIndex=-1;syncSettings();themeSelect.setAttribute('aria-label',`Theme: ${themes[value][0]}`);if(save)globalThis.chrome?.storage?.local?.set({designInspectTheme:value});}
  if(themeSelect&&themeButton){setTheme('system');globalThis.chrome?.storage?.local?.get('designInspectTheme',result=>setTheme(result?.designInspectTheme||'system'));}
  function figmaIcon(name){
    const template=document.createElement('template');template.innerHTML=globalThis.designInspectFigmaIcons[name];
    const icon=template.content.firstElementChild;icon.classList.add('figma-icon');icon.setAttribute('aria-hidden','true');
    for(const node of [icon,...icon.querySelectorAll('[stroke],[fill]')])for(const prop of ['stroke','fill']){const value=node.getAttribute(prop);if(value && value!=='none' && node.localName!=='rect')node.setAttribute(prop,'currentColor');}
    return icon;
  }
  function syncSettings(){
    const label=root.querySelector('.unit-label');if(label){label.replaceChildren(figmaIcon(unit));label.setAttribute('aria-label',unit==='auto'?'Auto':unit);}
    for(const b of root.querySelectorAll('[data-unit]'))b.setAttribute('aria-pressed',String(b.dataset.unit===unit));
    for(const b of root.querySelectorAll('[data-theme-choice]'))b.setAttribute('aria-pressed',String(b.dataset.themeChoice===themeSelect.value));
  }
  function toggleSettings(open,focus=false){const menu=panel.querySelector('.settings-menu'),button=panel.querySelector('.settings-button');if(!menu||!button)return;menu.hidden=!open;button.setAttribute('aria-expanded',String(open));if(focus)(open?menu.querySelector('button'):button).focus();}
  function syncInspectButton(){const b=root.querySelector('.inspect-toggle');if(!b)return;b.dataset.mode=mode==='inspect'?'use':'inspect';b.setAttribute('aria-pressed',String(mode==='inspect'));b.setAttribute('aria-label',mode==='inspect'?'Stop inspecting':'Start inspecting');b.title=b.getAttribute('aria-label');b.querySelector('.inspect-state').replaceChildren(figmaIcon(mode==='inspect'?'stop':'play'));}
  function context(el) {
    return {root:parseFloat(getComputedStyle(document.documentElement).fontSize), element:parseFloat(getComputedStyle(el).fontSize), parent:parseFloat(getComputedStyle(el.parentElement || el).fontSize)};
  }
  function length(px, el) { return format(`${round(px)}px`, unit, context(el)); }
  const groups = [
    ["Appearance", ["background-color"]],
    ["Layout", ["display", "position", "box-sizing", "flex-direction", "justify-content", "align-items"]],
    ["Typography", ["font-family", "font-size", "font-weight", "line-height", "letter-spacing", "color"]],
  ];
  function hasOwnText(el) {
    if(getComputedStyle(el).visibility!=='visible')return false;
    for(let ancestor=el;ancestor;ancestor=ancestor.parentElement)if(Number(getComputedStyle(ancestor).opacity)===0)return false;
    return [...el.childNodes].some(node=>{
      if(node.nodeType!==Node.TEXT_NODE || !node.textContent.trim())return false;
      const range=document.createRange();range.selectNodeContents(node);
      return [...range.getClientRects()].some(rect=>rect.width>0 && rect.height>0);
    });
  }
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
      render(mode === "use" ? {title:"Use mode — interact with the website, then return to Inspect", rows:[]} : remote.snapshot, remote.url);
      return;
    }
    ensureReviewContext();
    let title, rows = [], allRows=[], sizes = [], incomplete = false, boxModel = null,element=null,edit=null;
    if (mode === "use") title = "Use mode — interact with the website, then return to Inspect";
    else if (!selected.length) title = "Click an element to inspect its properties";
    else if (selected.length > 1) title = `${selected.length} elements selected. Click one to see its properties.`;
    else {
      const el = selected[0], rect = el.getBoundingClientRect(), css = getComputedStyle(el);
      if (!sources || performance.now() - sourceTime > 500) { sources = sourceReader(document); sourceTime = performance.now(); }
      const units = context(el);
      const fontSources=new Map();
      function propertySource(property){
        let source = sources.read(el, property);
        const borderPart=property.match(/^border-(?:(?:top|right|bottom|left)-)?(width|style|color)$/)?.[1];
        if(source&&borderPart){
          const component=globalThis.designInspectCSS.borderComponent(source.value,borderPart,(p,v)=>CSS.supports(p,v),expression=>{const match=expression.match(/^var\(\s*(--[\w-]+)/);return match?getComputedStyle(source.element).getPropertyValue(match[1]).trim():null;});
          source=component?{...source,value:component,declaration:property}:null;
        }

        if(['font-family','font-size','font-weight','line-height'].includes(property))source=overrides?.fontSource(el,property)||source;
        if(source && ['margin','padding'].includes(source.declaration) && property.startsWith(source.declaration+'-'))source={...source,value:sideExpression(source.value,property.split('-').at(-1))};
        return source;
      }
      function value(property) {
        const computed=css.getPropertyValue(property);
        const color=property==="color" || property.endsWith("-color") ? computed : undefined;
        const actual = displayValue(format(computed, unit, units, property),color!==undefined);
        let source = propertySource(property);
        if (source && /var\(/.test(source.value)) {
          let fontSource;
          if(source.declaration==="font") {
            if(!fontSources.has(source.style))fontSources.set(source.style,`font-${fontSources.size+1}`);
            fontSource=fontSources.get(source.style);
          }
          return {token:source.value, tokenChain:sources.resolve(source.element,source.value,true), actual, color, fontSource, longhandSource:source.declaration===property, note:source.declaration !== property ? `from ${source.declaration}` : ""};
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
        radius.value=value(cornerProperties[corner]);
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
      const hasBox=css.display!=="contents" && el.getClientRects().length>0;
      const isFlex=["flex","inline-flex"].includes(css.display),isGrid=["grid","inline-grid"].includes(css.display);
      if(!hasBox)boxModel=null;
      sizes=hasBox?["width","height"].map(property=>({property,screen:length(rect[property],el)})):[];
      const appearance=[];
      const background=css.getPropertyValue('background-color');
      const transparent=color=>color==='transparent' || /rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(color) || /\/\s*0(?:%|\.0+)?\s*\)$/.test(color);
      if(background && !transparent(background))appearance.push(['background-color',value('background-color')]);
      const borders=[];
      for(const side of sides){
        const width=css.getPropertyValue(`border-${side}-width`),style=css.getPropertyValue(`border-${side}-style`);
        const edited=['border',`border-${side}`,...['width','style','color'].flatMap(part=>['border-'+part,`border-${side}-${part}`])].some(p=>overrides?.target(el,p));
        if(!edited&&(!(parseFloat(width)>0)||['none','hidden'].includes(style)))continue;
        const widthValue=value(`border-${side}-width`),styleValue=value(`border-${side}-style`),target=overrides?.target(el,`border-${side}-width`);
        if(target&&!/var\(/.test(target.expression))widthValue.actual=format(target.expression,unit,units,`border-${side}-width`);
        borders.push([side,{...value(`border-${side}-color`),borderParts:{width:widthValue,style:styleValue}}]);
      }
      if(borders.length===4&&borders.every(([,v])=>JSON.stringify(v)===JSON.stringify(borders[0][1])))appearance.push(['border',borders[0][1]]);
      else for(const [side,v]of borders)appearance.push([`border-${side}`,v]);
      allRows=groups.map(([label,props])=>{
        if(label==='Appearance')return [label,hasBox?appearance:[]];
        const entries=(label==='Layout'?['gap',...props]:props).map(property=>[property,value(property)]);
        return [label,label==='Typography'?groupTypography(entries):entries];
      });
      const hasTypography=hasOwnText(el) || sources.hasOwn(el,["font",...groups.find(([label])=>label==="Typography")[1]]);
      rows=allRows.filter(([label])=>label==="Typography"?hasTypography:label!=="Appearance" || hasBox).map(([label,entries])=>[
        label,label!=='Layout'?entries:entries.filter(([property])=>{
          if(property==='box-sizing')return hasBox;
          if(property==='flex-direction')return hasBox && isFlex;
          if(['gap','justify-content','align-items'].includes(property))return hasBox && (isFlex || isGrid);
          return true;
        })
      ]);
      incomplete = sources.incomplete;
      if(overrides){
        const properties={};
        const fontToken=allRows.find(([label])=>label==='Typography')?.[1].find(([property])=>property==='font')?.[1].token;
        for(const property of globalThis.designInspectOverrides.properties){
          if(!hasBox&&!['display','position'].includes(property)&&!overrides.target(el,property))continue;
          const source=(property==='font'?overrides.fontSource(el,null):null)||propertySource(property),target=overrides.target(el,property);
          properties[property]={computed:css.getPropertyValue(property),expression:target?.expression||(property==='font'?fontToken:undefined)||(source&&(source.declaration===property||(/var\(/.test(source.value)&&source.declaration!=='font'))?source.value:undefined),override:target?.expression,display:value(property)};
        }
        for(const attribute of element.attributes){const property='@'+attribute.name;properties[property]={computed:attribute.value,expression:attribute.value,override:overrides.target(el,property)?.expression};}
        edit={instance:reviewInstance,elementId:nodeIds.get(el),contextKey:lastReviewContext,context:reviewContext(),properties,variables:reviewVariables(el),liveCount:overrides.count(),lost:overrides.lost};
      }
    }
    localSnapshot = {title, rows, allRows, sizes, incomplete, boxModel,element,edit};
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
  function colorPreview(color){const preview=document.createElement('span');preview.className='color-preview';preview.setAttribute('aria-hidden','true');preview.style.setProperty('--preview-color',color);return preview;}
  function appendValue(container,value,scope,previewContainer){
    if(value.color!==undefined && previewContainer){
      previewContainer.append(colorPreview(value.color));
    }
    if(!value.token){container.textContent=displayValue(value.actual,value.color!==undefined);return;}
    const key=`${scope}:${value.token}`,stack=document.createElement('span'),header=document.createElement('span'),token=document.createElement('button'),actions=document.createElement('span'),descriptions=document.createElement('span');
    stack.className='value-stack';header.className='value-header';actions.className='value-actions';descriptions.className='value-descriptions';descriptions.id=`value-${++descriptionId}`;
    token.type='button';token.className='token';token.textContent=tokenLabel(value.token);token.title=value.token;token.setAttribute('aria-label',`Edit ${tokenLabel(value.token)}`);
    let chain;
    function action(icon,description,visible,target){
      const button=document.createElement('button');button.type='button';button.className='value-toggle'+(icon==='valueChain'?' chain-toggle':'');button.append(figmaIcon(icon));button.setAttribute('aria-controls',target.id);
      const update=()=>{const open=visible.has(key);target.hidden=!open;button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-pressed',String(open));button.title=`${open?'Hide':'Show'} ${description}`;button.setAttribute('aria-label',button.title);};
      button.addEventListener('click',()=>{if(visible.has(key))visible.delete(key);else visible.add(key);update();});update();return button;
    }
    if(value.tokenChain?.length>1){
      chain=document.createElement('span');chain.className='value-chain';chain.id=`chain-${++descriptionId}`;chain.textContent=value.tokenChain.map(tokenLabel).join(' →\u00a0');
      const chainButton=action('valueChain','variable chain',chainsRevealed,chain);chainButton.dataset.chainToken=value.token;actions.append(chainButton);
    }
    actions.append(action('valueEye','computed value',revealed,descriptions));header.append(token,actions);stack.append(header);
    if(chain)stack.append(chain);
    for(const description of value.descriptions || [{actual:value.actual}]){
      const actual=document.createElement('span');actual.className='actual';actual.textContent=(description.property?`${description.property.replace(/^font-/,'')}: `:'')+displayValue(description.actual,value.color!==undefined);descriptions.append(actual);
    }
    if(value.note){const note=document.createElement('span');note.className='source-note';note.textContent=value.note;descriptions.append(note);}
    stack.append(descriptions);container.append(stack);
  }
  function boxMeasurement(value){
    const group=document.createElement('span');group.className='box-measurement';
    const parts=splitValue(value.actual),number=document.createElement('span');number.className='box-number';number.textContent=parts.number;group.append(number);
    if(parts.unit){const unit=document.createElement('span');unit.className='box-unit';unit.textContent=parts.unit;group.append(unit);}
    if(value.token){
      const badge=document.createElement('button');badge.type='button';badge.className='box-var';badge.textContent='var';badge.setAttribute('aria-label',`Variable: ${value.token}`);
      const hint=root.querySelector('.box-tooltip');
      const show=()=>{
        hint.replaceChildren();const title=document.createElement('div');title.className='box-tooltip-title';title.textContent=value.token;hint.append(title);
        const steps=value.tokenChain || [];
        const transformations=steps.slice(1);
        for(const step of transformations){const description=document.createElement('div');description.className='box-tooltip-description';description.textContent='→ '+step;hint.append(description);}
        hint.hidden=false;badge.setAttribute('aria-describedby',hint.id);positionHint(hint,badge);
      };
      const hide=()=>{hint.hidden=true;badge.removeAttribute('aria-describedby');};
      badge.addEventListener('pointerenter',show);badge.addEventListener('pointerleave',hide);badge.addEventListener('focus',show);badge.addEventListener('blur',hide);
      group.append(badge);
    }
    return group;
  }
  function renderBox(model) {
    const figure=document.createElement('div');figure.className='box-model';figure.setAttribute('aria-label','Box model: margin, border, padding and content');
    let inner=document.createElement('div');inner.className='box-center';inner.textContent='content';inner.title=`Content: ${model.width} × ${model.height}`;
    const nested=[inner];
    for(const layer of [...model.layers].reverse()){
      const ring=document.createElement('div');ring.className=`box-layer box-${layer.kind}`;
      const label=document.createElement('span');label.className='box-title';label.textContent=layer.kind==='stroke'?'border':layer.label.toLowerCase();ring.append(label);
      for(const [side,value]of layer.sides){
        const slot=document.createElement('span');slot.className=`box-value box-${side}`;slot.setAttribute('aria-label',`${label.textContent} ${side}: ${value.actual}`);slot.append(boxMeasurement(value));ring.append(slot);
      }
      inner.classList.add('box-inner');ring.append(inner);inner=ring;nested.push(ring);
    }
    const outer=inner;

    function annotations(corners){
      const row=document.createElement('div');row.className='corner-row';
      for(const corner of corners){
        const radius=model.radii[corner];if(!radius.x&&!radius.y)continue;
        const marker=document.createElement('span');marker.className='radius-marker';marker.dataset.corner=corner;marker.dataset.side=corner.endsWith('Right')?'right':'left';
        marker.setAttribute('aria-label',`${corner} radius: ${radius.label}`);
        marker.append(figmaIcon('corner'+corner[0].toUpperCase()+corner.slice(1)),boxMeasurement({...radius.value,actual:radius.label}));row.append(marker);
      }
      if(row.children.length)figure.append(row);
    }
    annotations(['topLeft','topRight']);figure.append(outer);annotations(['bottomLeft','bottomRight']);content.append(figure);
    updateDiagramRadii=()=>{
      const visual=capRadii(model.radii);
      outer.style.borderRadius=radiusCSS(visual);
      const bounds=outer.getBoundingClientRect();
      for(const node of nested)if(node!==outer)node.style.borderRadius=radiusCSS(capRadii(insetRadii(visual,bounds,node.getBoundingClientRect())));
      outer.querySelector('.box-title').style.left=`${Math.max(10,visual.topLeft.x/2)}px`;
    };
    updateDiagramRadii();
  }
  let tableLayoutFrame;
  function scheduleTableLayout(){
    cancelAnimationFrame(tableLayoutFrame);tableLayoutFrame=requestAnimationFrame(layoutTableColumns);
  }
  function layoutTableColumns(){
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d');if(!context)return;
    for(const section of panel.querySelectorAll('.property-section,.attribute-list'))section.style.removeProperty('--table-parameter-width');
    const rows=[...panel.querySelectorAll('.table-row')].filter(row=>row.getBoundingClientRect().width>0);if(!rows.length)return;
    const width=Math.min(...rows.map(row=>row.getBoundingClientRect().width));
    let preferred=0,needed=0;
    for(const row of rows){
      const label=row.querySelector('.table-parameter'),value=row.querySelector('.table-value');
      context.font=getComputedStyle(label).font;preferred=Math.max(preferred,context.measureText(label.textContent).width+2*tokenNumber('space-section')+(label.querySelector('.layout-property-icon')?tokenNumber('size-icon')+tokenNumber('space-group'):0));
      const primary=value.querySelector('.value-header>.token,.dimension-values') || value;
      context.font=getComputedStyle(value).font;needed=Math.max(needed,context.measureText(primary.textContent).width+tokenNumber('space-section')+tokenNumber('space-group')+(value.querySelector('.value-actions')?.getBoundingClientRect().width || 0)+tokenNumber('space-related'));
    }
    const size=preferred+tokenNumber('size-table-marker')+needed>width?Math.min(preferred,width*tokenNumber('size-table-parameter-limit')/100):preferred;
    panel.style.setProperty('--table-parameter-width',`${Math.min(size,Math.max(0,width-tokenNumber('size-value-min-width')))}px`);
  }
  let parameterHintTimer;
  let parameterHintAnchor;
  function hideParameterHint(){
    clearTimeout(parameterHintTimer);
    parameterHintAnchor?.removeAttribute('aria-describedby');parameterHintAnchor=null;
    root.querySelector('#parameter-name-tooltip').hidden=true;
  }
  function bindParameterHint(label,parameter){
    const show=()=>{
      hideParameterHint();parameterHintAnchor=label;
      parameterHintTimer=setTimeout(()=>{
        if(abort.signal.aborted || !label.isConnected || parameterHintAnchor!==label)return;
        const hint=root.querySelector('#parameter-name-tooltip');
        const title=document.createElement('div');title.className='box-tooltip-title';title.textContent=parameter;
        hint.replaceChildren(title);hint.hidden=false;label.setAttribute('aria-describedby',hint.id);positionHint(hint,label);
      },tokenNumber('duration-parameter-hint-delay'));
    };
    label.addEventListener('pointerenter',show);label.addEventListener('pointerleave',hideParameterHint);
    label.addEventListener('focus',show);label.addEventListener('blur',hideParameterHint);
    label.addEventListener('keydown',event=>{if(event.key==='Escape')hideParameterHint();});
  }
  function createPropertyRow(parameter,{attribute=false}={}){
    const row=document.createElement('div'),label=document.createElement('dt'),marker=document.createElement('span'),value=document.createElement('dd');
    row.className=attribute?'attribute-row table-row':'row table-row';row.dataset.parameter=parameter;
    label.className='table-parameter'+(attribute?' attr-name':'');bindParameterHint(label,parameter);
    const text=document.createElement('span');text.className='parameter-text';text.textContent=parameter;label.append(text);
    marker.className='table-marker';value.className='table-value'+(attribute?' attr-value':'');
    if(attribute){row.setAttribute('role','row');label.setAttribute('role','rowheader');value.setAttribute('role','cell');}
    row.append(label,marker,value);return {row,label,marker,value};
  }
  function renderSizes(sizes,container) {
    const table=document.createElement('dl');table.className='size-table';table.setAttribute('aria-label','Element size');
    const {row,value}=createPropertyRow('size'),values=document.createElement('span');values.className='dimension-values';
    for(const {property,screen}of sizes){
      const dimension=document.createElement('span');dimension.className='dimension-value';dimension.setAttribute('aria-label',`${property}: ${screen}`);
      const icon=figmaIcon(property==='width'?'sizeWidth':'sizeHeight');icon.classList.add('dimension-icon');
      const text=document.createElement('span');text.className='screen-size';text.textContent=screen;dimension.append(icon,text);values.append(dimension);
    }
    value.append(values);table.append(row);container.append(table);
  }
  function renderIdentity(title,element) {
    if(!element){const empty=document.createElement('p');empty.className='content-message';empty.textContent=title;content.append(empty);return;}
    const row=document.createElement('div'),label=document.createElement('p'),tree=document.createElement('button'),list=document.createElement('div');
    row.className='identity-row';label.className='name';label.textContent=title;label.title=title;
    tree.className='element-tree-toggle icon-button';tree.title='Element hierarchy';tree.setAttribute('aria-label','Element hierarchy');tree.append(figmaIcon('tree'));
    list.className='element-tree';list.id='element-hierarchy';list.setAttribute('role','group');list.setAttribute('aria-label','Element hierarchy');tree.setAttribute('aria-controls',list.id);
    const tag=document.createElement('code');tag.className='dom-tag';tag.textContent=`<${element.tag}>`;
    const identity=document.createElement('div');identity.className='identity-label';identity.append(label,tag);
    const owner=activeFrameId;
    function fillTree() {
      for(const entry of element.tree) {
        const button=document.createElement('button'),relation=document.createElement('span'),name=document.createElement('span');button.className='tree-item';button.dataset.relation=entry.relation;button.setAttribute('aria-current',String(entry.relation==='current'));button.title=entry.label;relation.className='tree-relation';relation.textContent={parent:'Parent',current:'Current',child:'Child'}[entry.relation];name.className='tree-name';name.textContent=entry.label;button.append(relation,name);
        button.addEventListener('click',()=>{if(owner===activeFrameId)pick(entry.id);});list.append(button);
      }
    }
    function update() {
      list.hidden=!treeOpen;tree.setAttribute('aria-expanded',String(treeOpen));
      if(treeOpen && !list.children.length)fillTree();scheduleTableLayout();
    }
tree.addEventListener('click',()=>{treeOpen=!treeOpen;update();});update();
    row.append(identity,tree);selectionHeader.append(row,list);
  }
  function render({title, rows = [], allRows = rows, sizes = [], incomplete = false, boxModel = null,element=null,edit=null}) {
    reviewUI?.selected(edit);
    if(reviewUI?.focused())return;
    const signature = JSON.stringify([title, rows, allRows, showAllProperties, sizes, incomplete, boxModel,element,edit]);
    if (signature === lastDetails) return;
    lastDetails = signature;
    hideParameterHint();
    updateDiagramRadii=()=>{};
    root.querySelector(".size-tooltip").hidden=true;root.querySelector(".box-tooltip").hidden=true;
    selectionHeader.replaceChildren();
    content.replaceChildren();
    renderIdentity(title,element);
    const allPropertiesButton=panel.querySelector('.all-properties');
    allPropertiesButton.hidden=!element;
    allPropertiesButton.textContent=showAllProperties?'Show applicable properties':'Show all properties';
    allPropertiesButton.setAttribute('aria-pressed',String(showAllProperties));
    if (boxModel) renderBox(boxModel);
    if(edit&&reviewUI){
      for(const layer of boxModel?.layers||[])for(const [side]of layer.sides){const slot=content.querySelector(`.box-${layer.kind} > .box-${side}`);if(slot)reviewUI.controls(slot,`${layer.kind==='stroke'?'border':layer.kind}-${side}${layer.kind==='stroke'?'-width':''}`,edit);}
      for(const marker of content.querySelectorAll('.radius-marker')){
        const corner=marker.dataset.corner.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase());reviewUI.controls(marker,`border-${corner}-radius`,edit);
      }
    }
    const groupsToRender=(showAllProperties?allRows:rows);
    const basic=document.createElement('section');basic.className='property-section basic-properties';basic.setAttribute('aria-label','Basic properties');
    if(sizes.length){renderSizes(sizes,basic);if(edit&&reviewUI)for(const p of ['width','height'])reviewUI.controls(basic.querySelector(`[aria-label^="${p}:"]`),p,edit);}
    if(sizes.length || groupsToRender.some(([group,entries])=>group==='Appearance' && entries.length))content.append(basic);
    for (const [group, entries] of groupsToRender) {
      if(!entries.length)continue;
      const section=group==='Appearance'?basic:document.createElement('section');
      if(group!=='Appearance'){
        section.className='property-section';section.setAttribute('aria-label',group);
        const heading=document.createElement('h3');heading.textContent=group;
        if(group==='Layout' || group==='Typography'){
          heading.setAttribute('aria-label',group);heading.replaceChildren(figmaIcon(group==='Layout'?'layoutHeading':'typographyHeading'));
        }
        section.append(heading);content.append(section);
      }
      const dl = document.createElement("dl");dl.className='property-group';dl.dataset.group=group;
      const orderedEntries=group==='Layout'?arrangeLayout(entries,{hasBox:!!boxModel || sizes.length>0}):entries;
      for (const [property, value] of orderedEntries) {
        const {row,label:dt,value:dd,marker:preview}=createPropertyRow(property);
        if(group==="Layout") {
          if(layoutHints[property])dt.setAttribute('aria-description',layoutHints[property]);dt.classList.add("layout-name");dt.tabIndex=0;
          if(property==='gap')dt.dataset.spacing='gap';
          if(value.dependsOn){
            row.dataset.dependsOn=value.dependsOn;dt.setAttribute('aria-description',`Depends on ${value.dependsOn}`);
            const text=document.createElement('span');text.className='parameter-text';text.textContent=property;
            const icon=figmaIcon('layoutProperty');icon.classList.add('layout-property-icon');dt.replaceChildren(icon,text);
          }
        }
        if(value.overrideOf) {
          const marker=document.createElement("span");marker.className="override-marker";marker.setAttribute("role","img");
          marker.setAttribute("aria-label",`Overridden ${property}`);marker.append(uiIcon(overrideIcon()));dt.append(marker);
        }
        if(value.borderParts){
          dd.classList.add('border-values');
          for(const [part,partValue]of [['width',value.borderParts.width],['style',value.borderParts.style],['color',value]]){
            const line=document.createElement('div');line.className='border-component';line.dataset.borderPart=part;
            const text=document.createElement('span');appendValue(text,partValue,`${group}/${property}/${part}`,part==='color'?line:null);line.append(text);dd.append(line);
            if(edit)reviewUI?.controls(line,`${property}-${part}`,edit);
          }
        }else{appendValue(dd,value,`${group}/${property}`,preview);if(edit)reviewUI?.controls(dd,property,edit);}
        dl.append(row);
      }
      section.append(dl);
    }
    if(edit&&reviewUI){
      const active=document.createElement('section');active.className='property-section review-override-properties';active.setAttribute('aria-label','Edited properties');
      const table=document.createElement('dl');table.className='property-group';
      for(const [property,parameter]of Object.entries(edit.properties)){
        if(property.startsWith('@')||parameter.override===undefined||content.querySelector(`.property-section [data-edit-property="${property}"]`))continue;
        const {row,value,marker}=createPropertyRow(property);appendValue(value,parameter.display||{actual:parameter.override},`Edited/${property}`,marker);reviewUI.controls(value,property,edit);table.append(row);
      }
      if(table.children.length){active.append(table);const box=content.querySelector('.box-model');if(box)box.after(active);else content.prepend(active);}
      if(edit.lost){const notice=document.createElement('p');notice.className='review-status';notice.textContent='A live preview was lost after the page changed. Saved corrections remain in the document.';content.append(notice);}
    }
    if(element){
      const section=document.createElement('section');section.className='property-section element-attributes';section.setAttribute('aria-label','Element attributes');
      const heading=document.createElement('h3');heading.textContent='Element attributes';section.append(heading);
      const list=document.createElement('dl');list.className='attribute-list';list.setAttribute('role','table');
      for(const attribute of element.attributes){const {row,value}=createPropertyRow(attribute.name,{attribute:true});value.textContent=attribute.value;list.append(row);if(edit)reviewUI?.controls(value,'@'+attribute.name,edit);}
      section.append(list);content.append(section);
    }

    if(edit&&reviewUI)reviewUI.comment(content,edit);

    updateDiagramRadii();scheduleTableLayout();
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
    const colors={margin:tokenColor('color-overlay-margin-label'),padding:tokenColor('color-overlay-padding-label'),gap:tokenColor('color-overlay-gap-label')};
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
          spacingBadge(value,(area.left+area.right)/2,(area.top+area.bottom)/2,colors[kind],kind==='padding'||kind==='gap',kind==='gap'?(area.axis==='x'?'column-gap':'row-gap'):`${kind}-${area.side}`);
        }
      }
    }
  }
  function spacingBadge(value,x,y,color,whiteText=false,property) {
    const text=node('text',{class:'spacing-value',x,y});text.textContent=value;
    const bounds=text.getBBox(),box={x:bounds.x-3,y:bounds.y-2,width:bounds.width+6,height:bounds.height+4};
    const luminance=color.slice(1).match(/../g).map(channel=>parseInt(channel,16)/255).map(channel=>channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4);
    const ink=whiteText?tokenColor('color-overlay-label-light'):luminance[0]*.2126+luminance[1]*.7152+luminance[2]*.0722>.179?tokenColor('color-overlay-label-dark'):tokenColor('color-overlay-label-light');
    const plate=node('rect',{class:'spacing-value-bg',...box,rx:tokenNumber('radius-overlay-label'),fill:color});text.setAttribute('fill',ink);svg.insertBefore(plate,text);
    if(connected&&property){for(const item of [text,plate]){item.classList.add('spacing-edit');item.dataset.spacingEdit=property;}text.setAttribute('role','button');text.setAttribute('tabindex','0');text.setAttribute('aria-label',`Edit ${property}: ${value}`);plate.setAttribute('aria-hidden','true');}
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
  function draw(schedule=true) {
    if(holdSpacingBadges&&mode==="inspect"&&!eyedropper&&selected.length===1&&selected[0].isConnected){details();if(schedule)frame=requestAnimationFrame(()=>draw());return;}
    const remaining = selected.filter(el => el.isConnected);
    if (remaining.length !== selected.length) selected = remaining;
    svg.replaceChildren();spacingTargets=[];
    if (mode === "inspect" && !eyedropper) {
      if(selected.length===1)spacing(selected[0]);
      for (const el of selected) box(el,tokenColor('color-overlay-selected'),"none");
      if (hovered?.isConnected && !selected.includes(hovered)) box(hovered, alt?tokenColor('color-overlay-measure'):tokenColor('color-overlay-hover'),tokenColor('color-overlay-hover-fill'));
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
    details(); if(schedule)frame = requestAnimationFrame(()=>draw());
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
  let spacingEditPoint=null,spacingEditRequest=null;
  function openSpacingAt(meta,property,point){
    const bounds={left:point.x,right:point.x,top:point.y,bottom:point.y,width:0,height:0};
    reviewUI?.open(meta,property,{isConnected:true,getBoundingClientRect:()=>bounds}).catch(error=>console.debug('Design Inspect:',error.message));
  }
  function openRemoteSpacing(){
    if(!spacingEditPoint||spacingEditPoint.id!==spacingEditRequest?.anchorId)return;
    const request=spacingEditRequest,point=spacingEditPoint;spacingEditPoint=null;spacingEditRequest=null;
    const meta=remote?.snapshot?.edit;if(request.frameId===activeFrameId&&meta?.properties[request.property])openSpacingAt(meta,request.property,point);
  }
  function forwardSpacingPoint(data){
    if(isTop){spacingEditPoint=data;openRemoteSpacing();}
    else parent.postMessage({designInspectSpacingPoint:true,...data},'*');
  }
  listen(window,'message',event=>{
    const data=event.data;if(!data?.designInspectSpacingPoint||typeof data.id!=='string'||data.id.length>100)return;
    const child=[...document.querySelectorAll('iframe,frame')].find(frame=>frame.contentWindow===event.source);
    if(!child||![data.x,data.y,data.width,data.height].every(Number.isFinite)||data.width<=0||data.height<=0)return;
    const r=child.getBoundingClientRect(),sx=r.width/child.offsetWidth,sy=r.height/child.offsetHeight;
    const x=r.left+(child.clientLeft+data.x*child.clientWidth/data.width)*sx,y=r.top+(child.clientTop+data.y*child.clientHeight/data.height)*sy;
    if(x<r.left||x>r.right||y<r.top||y>r.bottom)return;
    forwardSpacingPoint({id:data.id,x,y,width:innerWidth,height:innerHeight});
  });
  function editSpacingBadge(badge,point){
    const property=badge.dataset.spacingEdit;if(!property)return;
    if(!point){const r=badge.getBoundingClientRect();point={x:r.left+r.width/2,y:r.top+r.height/2};}
    if(!isTop){const anchorId=newReviewInstance();forwardSpacingPoint({...point,id:anchorId,width:innerWidth,height:innerHeight});bridge('review-open-spacing',{property,anchorId});return;}
    const meta=localSnapshot?.edit;if(meta?.properties[property])openSpacingAt(meta,property,point);
  }

  function setMode(nextMode, notify = true) {
    if(nextMode==='use' && pinnedHover){pinnedHover=false;bridge('release-hover');}
    holdSpacingBadges=false;mode = nextMode; alt = false; hovered = null;spacingHover=null;
    setEyedropper(eyedropper,false);
    const eyedropperButton=root.querySelector('.eyedropper-button');if(eyedropperButton)eyedropperButton.hidden=mode==='use';
    syncInspectButton();syncSettings();
    if(unitSelect)unitSelect.value=unit;
    details();
    if (notify && isTop) bridge("settings");
  }
  function setUnit(nextUnit,notify=true) {
    unit=nextUnit;syncSettings();
    if(unitSelect)unitSelect.value=unit;
    details();if(notify && isTop)bridge('settings');
  }
  async function claim() {
    if(!reviewAfter)await compareReview(true);
    alt=false;spacingHover=null;spacingAnchor=pointerPosition;
    revealed.clear();chainsRevealed.clear();lastDetails="";
    activeFrameId = localFrameId; remote = null;
    details();
    bridge("select", {snapshot:localSnapshot});
  }
  async function shortcut(key, shift) {
    if(!reviewAfter&&key==='Enter')await compareReview(true);
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
    pointerPosition={x:event.clientX,y:event.clientY};holdSpacingBadges=false;
    if (ownEvent(event)) {
      if(root.elementFromPoint(event.clientX,event.clientY)?.closest('[data-spacing-edit]')){holdSpacingBadges=true;return;}
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
      // Window listeners cannot see inner nodes in a closed Shadow DOM.
      if((type==='pointerdown' || type==='click') && !ownEvent(event))toggleSettings(false);
      if(type==='pointerdown' && ownEvent(event)){
        const button=root.elementFromPoint(event.clientX,event.clientY)?.closest('header button,.header-button');
        if(button)button.dataset.pointerPressed='true';
      }
      if(type==='pointerup' || type==='pointerleave')for(const b of root.querySelectorAll('[data-pointer-pressed]'))delete b.dataset.pointerPressed;
      if (ownEvent(event)) {
        const badge=root.elementFromPoint(event.clientX,event.clientY)?.closest('[data-spacing-edit]');
        if(badge){if(type==='pointerdown')editSpacingBadge(badge,{x:event.clientX,y:event.clientY});block(event);return;}
        // Handle the switch before site capture listeners see an outside click.
        // Preventing pointer/mouse defaults also keeps focus on the page's trigger.
        const control = root.elementFromPoint(event.clientX, event.clientY)?.closest("[data-mode], [data-eyedropper], .theme-select, .unit-select");
        if(root.elementFromPoint(event.clientX,event.clientY)?.closest('[data-spacing-kind]')){block(event);return;}
        if (control) {
          if(control.matches('.theme-select,.unit-select')){if(type==='pointerdown')try{control.showPicker();}catch{}block(event);return;}
          if (type === "click") {toggleSettings(false);if(control.dataset.mode)setMode(control.dataset.mode);else setEyedropper(!eyedropper);}
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
    const badge=ownEvent(event)&&root.activeElement?.closest('[data-spacing-edit]');if(badge&&(event.key==='Enter'||event.key===' ')){block(event);editSpacingBadge(badge);return;}
    if(ownEvent(event)&&root.activeElement?.matches('input,textarea'))return;
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
  listen(window,"pointercancel",()=>{for(const b of root.querySelectorAll('[data-pointer-pressed]'))delete b.dataset.pointerPressed;},{capture:true});
  listen(window, "blur", () => {for(const b of root.querySelectorAll('[data-pointer-pressed]'))delete b.dataset.pointerPressed;if(isTop && alt && !document.hasFocus())bridge('modifiers',{alt:false});alt = false; hovered = null;probe=null;probeSerial++;pipette.hidden=true;});
  listen(document, "pointerleave", () => {hovered = null;probe=null;probeSerial++;pipette.hidden=true;});
  for(const type of ["scroll","resize"])listen(window,type,()=>{holdSpacingBadges=false;hideParameterHint();root.querySelector('.box-tooltip').hidden=true;probe=null;probeSerial++;pipette.hidden=true;if(eyedropper)bridge("pixel-invalidate");},{capture:true});
  const pipetteButton=panel.querySelector("[data-eyedropper]");pipetteButton.append(figmaIcon('eyedropper'));listen(pipetteButton,"click",()=>setEyedropper(!eyedropper));
  syncInspectButton();
  listen(panel.querySelector('.inspect-toggle'),'click',()=>setMode(mode==='inspect'?'use':'inspect'));
  panel.querySelector('.units-icon').append(figmaIcon('ruler'));
  panel.querySelector('.settings-chevron').append(figmaIcon('chevron'));
  panel.querySelector('.settings-divider').append(figmaIcon('divider'));
  panel.querySelector('.brand-label').append(figmaIcon('brand'));
  panel.querySelector('.inspect-label').append(figmaIcon('inspectLabel'));
  // Panel listeners see the full composed path, including dropdown controls.
  for(const type of ['pointerdown','click'])listen(panel,type,event=>{
    const path=event.composedPath();
    if(!path.includes(panel.querySelector('.settings-menu')) && !path.includes(panel.querySelector('.settings-button')))toggleSettings(false);
  },{capture:true});
  const menuSections=panel.querySelectorAll('.settings-section');
  for(const [index,key]of ['unitsLabel','themeLabel'].entries()){
    const legend=menuSections[index].querySelector('.settings-label');legend.setAttribute('aria-label',legend.textContent);legend.replaceChildren(figmaIcon(key));
  }
  for(const b of panel.querySelectorAll('[data-unit],[data-theme-choice]')){
    const label=b.textContent;b.setAttribute('aria-label',label);
    b.replaceChildren(...(b.dataset.themeChoice?[figmaIcon(b.dataset.themeChoice),figmaIcon(b.dataset.themeChoice+'Label')]:[figmaIcon(b.dataset.unit)]));
  }
  listen(panel.querySelector('.settings-button'),'click',event=>toggleSettings(panel.querySelector('.settings-menu').hidden,event.detail===0));
  for(const b of root.querySelectorAll('[data-unit]'))listen(b,'click',()=>{setUnit(b.dataset.unit);});
  for(const b of root.querySelectorAll('[data-theme-choice]'))listen(b,'click',()=>{setTheme(b.dataset.themeChoice,true);});

  if(unitSelect)listen(unitSelect,'change',event=>setUnit(event.currentTarget.value));
  panel.querySelector('.close').append(figmaIcon('close'));
  if(themeSelect)listen(themeSelect,'change',()=>setTheme(themeSelect.value,true));
  listen(panel.querySelector(".frame-access"), "click", async () => {
    const button = panel.querySelector(".frame-access");
    button.disabled = true;
    const result = await bridge("open-access");
    button.disabled = false;
    if (!result || result.error) button.textContent = "Could not request access. Click to retry";
    else if (!result.granted) button.textContent = "Access denied. Click to retry";
    else if (result.blockedCount) button.textContent = "Iframe unavailable. Retry inspect";
  });
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
      handle.setAttribute('aria-valuenow',String(Math.round(vertical?bounds.height:bounds.width)));handle.setAttribute('aria-valuemin',String(Math.min(vertical?tokenNumber('size-panel-min-height'):tokenNumber('size-panel-min-width'),(vertical?innerHeight:innerWidth)-tokenNumber('size-panel-viewport-clearance'))));handle.setAttribute('aria-valuemax',String((vertical?innerHeight:innerWidth)-tokenNumber('size-panel-viewport-clearance')));
    }
  }
  function resizePanel(edge,size,bounds) {
    const vertical=['top','bottom'].includes(edge),start=edge==='left'||edge==='top';
    const viewport=vertical?innerHeight:innerWidth,near=vertical?bounds.top:bounds.left,far=vertical?bounds.bottom:bounds.right;
    const maximum=Math.min(viewport-tokenNumber('size-panel-viewport-clearance'),start?far-tokenNumber('space-viewport-min'):viewport-near-tokenNumber('space-viewport-min')),minimum=Math.min(vertical?tokenNumber('size-panel-min-height'):tokenNumber('size-panel-min-width'),maximum);
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
  const panelObserver=isTop?new ResizeObserver(()=>{syncHandles();updateDiagramRadii();scheduleTableLayout();}):null;
  panelObserver?.observe(panel);
  async function loadPanelFonts() {
    await Promise.all(tokens.fontAssets.map(async font=>{
      try {
        const source=connected?new Uint8Array((await runtime.sendMessage({channel:'design-inspect',type:'font',font:font.key})).bytes):`url("${new URL('fonts/'+font.file,scriptSource || location.href).href}")`;
        const face=await new FontFace(font.family,source,{weight:font.weight}).load();
        if(abort.signal.aborted)return;panelFonts.push(face);document.fonts.add(face);syncHandles();updateDiagramRadii();scheduleTableLayout();
      }catch(error){console.debug('Design Inspect font:',error.message);}
    }));
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
    if (message.type === "get-state" && isTop) {respond({mode, unit, activeFrameId,eyedropper,reviewContext:{url:location.href,width:innerWidth,height:innerHeight}}); return;}
    if(message.type==='review-open-spacing'&&isTop&&message.frameId===activeFrameId){spacingEditRequest=message;openRemoteSpacing();return;}
    if(message.type==='review-edit'){applyReview(message.command).then(respond,error=>respond({error:error.message}));return true;}
    if(message.type==='review-updated'&&isTop){reviewUI?.update(message.result);return;}
    if(message.type==='review-view'){reviewAfter=message.after;overrides?.compare(reviewAfter);reviewUI?.view(reviewAfter);lastDetails='';details();return;}
    if(message.type==='review-reset-preview'){overrides?.clear();reviewAfter=true;reviewUI?.view(true);lastDetails='';details();return;}
    if(message.type==='review-clear'){overrides?.clear();reviewAfter=true;reviewUI?.view(true);reviewInstance=newReviewInstance();lastDetails='';details();return;}
    if(message.type==='probe-clear' && isTop){probe=null;probeSerial++;pipette.hidden=true;return;}
    if(message.type==='eyedropper-toggle' && isTop){setEyedropper(!eyedropper);return;}
    if(message.type==='toggle-pinned-inspect' && isTop){pinnedHover=!!message.pinned;setMode(message.mode||'inspect');return;}
    if(message.type==='hover-pin-lost' && isTop){pinnedHover=false;return;}
    if(message.type==='capture-mask' && isTop){captureMasked=!!message.hidden;pipette.hidden=true;if(captureMasked){requestAnimationFrame(()=>requestAnimationFrame(()=>respond({ok:true})));return true;}respond({ok:true});return;}
    if (message.type === "destroy") {destroy(false); return;}
    if (message.type === "configure") {
      if(message.reviewContext)topReviewContext=message.reviewContext;
      if (Number.isInteger(message.frameId)) localFrameId = message.frameId;
      unit = message.unit; if(unitSelect)unitSelect.value=unit; activeFrameId = message.activeFrameId;
      setMode(message.mode, false);setEyedropper(message.eyedropper,false);
    } else if (message.type === "active") {
      activeFrameId = message.activeFrameId;
      if (activeFrameId !== localFrameId) {selected = []; hovered = null;}
      else remote = null;
      details();
    } else if (["selection", "snapshot"].includes(message.type) && isTop) {
      if (message.type === "selection") {revealed.clear();chainsRevealed.clear();lastDetails="";activeFrameId = message.frameId; if (activeFrameId !== 0) selected = [];}
      if (activeFrameId === message.frameId && activeFrameId !== 0) remote = {snapshot:message.snapshot, url:message.url};
      details();
    } else if (message.type === "shortcut" && mode === "inspect") shortcut(message.key, message.shift);
    else if(message.type==='pick' && mode==='inspect' && activeFrameId===localFrameId)pick(message.nodeId);
    else if (message.type === "modifiers") {
      alt = message.alt;
      // Chrome can throttle iframe animation frames while keyboard state still changes.
      draw(false);
    }
    else if (message.type === "frame-gone" && isTop && activeFrameId === message.frameId) {
      activeFrameId = 0; remote = null; details();
    } else if (message.type === "frame-status" && isTop) {
      const button = panel.querySelector(".frame-access");
      button.hidden = message.blocked.length === 0;
      button.textContent = "Iframe appeared. Allow inspect";
    }
  }
  function destroy(notify = true) {
    reviewUI?.destroy();
    overrides?.clear();
    if (notify && isTop) bridge("close");
    cancelAnimationFrame(frame);cancelAnimationFrame(tableLayoutFrame);hideParameterHint(); abort.abort(); frameObserver.disconnect();panelObserver?.disconnect();for(const face of panelFonts)document.fonts.delete(face); host.remove();
    if (connected) runtime.onMessage.removeListener(receive);
    delete globalThis[key];
  }
  listen(panel.querySelector('.all-properties'),'click',()=>{showAllProperties=!showAllProperties;details();});
  listen(panel.querySelector(".close"), "click", () => destroy());
  globalThis[key] = { destroy };
  if(isTop){syncHandles();loadPanelFonts();}
  if (connected) {runtime.onMessage.addListener(receive); bridge("ready");}
  draw();
})();

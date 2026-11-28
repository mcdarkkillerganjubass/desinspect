# Semantic design tokens

`design-tokens.js` is the shared source for panel styles, overlays, fonts and the permission page. Names describe roles, not literal colors or pixel values.

Use `var(--di-color-surface-section)` in CSS and `designInspectTokens.get(name, theme)` in JavaScript. Theme-independent values cover typography, spacing, sizes, radii and motion. SVG path coordinates and dimensions measured from inspected elements remain data.

Light and Dark use the same semantic keys. System follows the operating-system preference. Header controls use the control surface; content sections and the properties toggle use the section surface.

| Token | Light | Dark |
| --- | --- | --- |
| `color-surface-panel` | `#ffffff` | `#202020` |
| `color-surface-section` | `#f8f8f8` | `#282828` |
| `color-surface-popover` | `#ffffff` | `#303030` |
| `color-surface-control` | `#f0f0f0` | `#343434` |
| `color-surface-control-hover` | `#e5e5e5` | `#404040` |
| `color-surface-control-pressed` | `#d2d2d2` | `#4a4a4a` |
| `color-text-primary` | `#202020` | `#ededed` |
| `color-text-secondary` | `#7b7b7b` | `#aaaaaa` |
| `color-text-hover` | `#000000` | `#ffffff` |
| `color-text-on-accent` | `#ffffff` | `#10213d` |
| `color-icon-muted` | `#c8c8c8` | `#727272` |
| `color-border-default` | `#e5e5e5` | `#444444` |
| `color-border-subtle` | `#f6f6f6` | `#383838` |
| `color-border-description` | `#d2d2d2` | `#505050` |
| `color-border-panel` | `#ffffff` | `#202020` |
| `color-border-swatch` | `rgb(0 0 0 / 8%)` | `rgb(255 255 255 / 16%)` |
| `color-action` | `#0247de` | `#8ab4ff` |
| `color-action-hover` | `#0238ad` | `#aac9ff` |
| `color-action-pressed` | `#002b88` | `#c2d8ff` |
| `color-accent-gap` | `#6b00e6` | `#bf9aff` |
| `color-box-margin` | `#ff6f00` | `#ffab70` |
| `color-box-border` | `#7f7f7f` | `#aaaaaa` |
| `color-box-padding` | `#00a933` | `#64d48a` |
| `color-box-content` | `#1cbbff` | `#75d6ff` |
| `color-box-canvas` | `#ffffff` | `#282828` |
| `color-box-margin-tint` | `rgb(255 111 0 / 10%)` | `rgb(255 171 112 / 12%)` |
| `color-box-border-tint` | `rgb(183 183 182 / 10%)` | `rgb(170 170 170 / 10%)` |
| `color-box-padding-tint` | `rgb(0 169 51 / 10%)` | `rgb(100 212 138 / 12%)` |
| `color-box-content-tint` | `rgb(28 187 255 / 10%)` | `rgb(117 214 255 / 12%)` |
| `color-box-content-border` | `rgb(28 187 255 / 90%)` | `rgb(117 214 255 / 90%)` |
| `color-overlay-margin` | `#edbd80` | `#edbd80` |
| `color-overlay-padding` | `#a2d5b4` | `#a2d5b4` |
| `color-overlay-gap` | `#a58cff` | `#a58cff` |
| `color-overlay-margin-label` | `#f0a13a` | `#f0a13a` |
| `color-overlay-padding-label` | `#38b86f` | `#38b86f` |
| `color-overlay-gap-label` | `#8c69ed` | `#8c69ed` |
| `color-overlay-selected` | `#9c83ff` | `#9c83ff` |
| `color-overlay-hover` | `#a995ff` | `#a995ff` |
| `color-overlay-hover-fill` | `#9270ff08` | `#9270ff08` |
| `color-overlay-measure` | `#ff6a00` | `#ff6a00` |
| `color-overlay-label-light` | `#f5f5f4` | `#f5f5f4` |
| `color-overlay-label-dark` | `#202020` | `#202020` |
| `shadow-floating` | `0 5px 20px rgb(0 0 0 / 10%)` | `0 5px 20px rgb(0 0 0 / 40%)` |
| `shadow-probe` | `0 4px 16px #0005` | `0 4px 16px rgb(0 0 0 / 55%)` |
| `shadow-feedback` | `0 4px 16px #0004` | `0 4px 16px rgb(0 0 0 / 45%)` |

Run `node design-tokens.test.cjs` to check theme key parity, font assets and CSS token references.

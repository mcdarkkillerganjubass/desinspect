# Design Inspect specification baseline

This directory describes the implemented behavior of Design Inspect 0.3.0. It is a baseline of the current extension, updated alongside implementation changes, not a proposal to build it again.

## Product

Design Inspect helps designers manually check a live website's geometry and styling using Figma-like selection and measurement controls. The primary workflow is: open the inspector, select one element, inspect its box model and CSS, then hold Alt and hover another element to measure distances. Use mode lets the designer prepare an interactive state before returning to Inspect.

## Capabilities

| Specification | Scope | Implementation |
| --- | --- | --- |
| [Inspector session](specs/inspector-session/spec.md) | Local installation, bundled Inter, fixed header, horizontal resize, segmented controls, cleanup and privacy. | `manifest.json`, `background.js`, `inspect.js`, `fonts/` |
| [Element selection](specs/element-selection/spec.md) | Hover, single/multiple selection, DOM attributes, hierarchy list/shortcuts and disconnected elements. | `inspect.js` |
| [CSS inspection](specs/css-inspection/spec.md) | Read-only properties, authored variables, computed values and source limitations. | `inspect.js`, `css-values.js` |
| [Box model](specs/box-model/spec.md) | Margin/stroke/padding diagram, stacked side units, nested corner radii, content dimensions and live spacing fills. | `inspect.js`, `spacing.js`, `box-model.js` |
| [Measurements and units](specs/measurements-and-units/spec.md) | Thin orange lines, persistent non-overlapping badges, unit segments and formatting. | `geometry.js`, `css-values.js`, `inspect.js` |
| [Eyedropper](specs/eyedropper/spec.md) | Inspect-only I shortcut, rendered pixels, variable attribution, shared popover and temporary local capture. | `background.js`, `inspect.js` |
| [Iframe inspection](specs/iframe-inspection/spec.md) | Shared panel, per-document inspection, host access, synchronization and frame lifecycle. | `background.js`, `inspect.js`, `frame-access.html`, `frame-access.js` |

## Architecture

The Manifest V3 service worker activates the inspector and routes extension messages between documents. The main-page inspector owns the shared panel and current mode/unit/active-frame settings. Each injected document owns its selected DOM references, source reader, local SVG overlay and measurements. Child frames send serializable property snapshots to the main-page panel through the service worker; DOM references do not cross document boundaries. The worker queries the main-page inspector for current settings rather than relying on a persistent in-memory session registry.

CSS source lookup is best-effort. Computed styles and rectangular bounds provide the observable values; source declarations add variable names and authored units when accessible. The current source resolver is not equivalent to Chrome DevTools' full cascade engine.

## Verification and evidence

| Check | Current automated coverage |
| --- | --- |
| `node geometry.test.cjs` | Separated, nested, coincident, reversed-order and fractional-coordinate rectangles; directed midpoint anchors and zero-axis omission. |
| `node spacing.test.cjs` | Margin/padding bands, negative/zero spacing, wrapped flex gaps, distributed free space, child margins and spanning grid items. |
| `node box-model.test.cjs` | Side-unit splitting, percentage/elliptical radii, CSS overlap normalization and the 2px inner minimum. |
| `node css-values.test.cjs` | Unit bases, quoted values, selector specificity, shorthand variables, importance/layers and inaccessible stylesheets. |
| `node tests/frame-access.cjs` | Permission UI approval/denial with mocked Chrome APIs. |
| `tests/browser.html` | Standalone browser checks for variable display, units, box-model sides/content size, focus/dropdown preservation and cleanup. |
| `CHROME_BIN=/path/to/chrome node tests/extension.cjs` | Real extension checks for midpoint anchors, dashed guides, orange/white styling, zero suppression, same/cross-origin frames, shared panel, missing-host list, units, box model, shortcuts, Alt state, modes, dynamic attachment/removal and cleanup. |

Not every scenario has a dedicated automated assertion. Nested-frame enumeration, frame navigation and advanced cascade behavior should not be described as comprehensively tested. The extension integration test pre-grants localhost in a temporary test-only manifest; it does not automate Chrome's native host-permission approval dialog. It does verify binary Inter loading under font-src 'none', pinned-header scrolling, native horizontal resizing and hierarchy navigation within an iframe.

Validate the specifications with:

```sh
openspec validate --specs --strict --no-interactive
```

## Boundaries

Current limitations are recorded in the relevant specs and in the [English project README](../README.md). Cross-frame measurements, Shadow DOM traversal, canvas-object inspection, CSS editing, Figma export and automatic design comparisons are outside the current baseline. The main panel is English; the frame-access window currently uses Russian labels.

Main specs live under `specs/`. Future feature changes can use the configured `spec-driven` workflow in `changes/`; this baseline does not leave an artificial pending implementation change.

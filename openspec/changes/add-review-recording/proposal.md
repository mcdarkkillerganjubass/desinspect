# Proposal

## Why

Designers can inspect an implemented interface, but still manually describe each correction for developers. Recording local visual edits and element comments as a structured document should reduce preparation and clarification time while keeping the handoff understandable to developers and coding LLMs.

## What Changes

- Make the inspector's supported CSS parameters editable for one selected element, with immediate local preview and per-parameter reset; keep geometry measurements read-only.
- Capture optional element comments, including comments without CSS edits.
- Start recording on the first committed edit or nonempty comment. Bind the document to its browser tab and continue across URLs and reloads without automatically restoring old previews.
- Persist the original-to-final difference per parameter and context, not an interaction log. Keep different pages and viewport sizes distinct.
- Show compact document cards with last-modified time and combined edit count; do not build a detailed change list.
- Add a Before/After switch for currently applied overrides. Selecting an element or starting an edit returns to After; hovering and scrolling do not.
- Support non-ending Markdown export, explicit stop, new document, and locally retained completed documents. Tab closure completes its document.
- Export page/element context, original values and source tokens, final preview values, comments, and implementation guidance. The recipient chooses how to implement the demonstrated result in source code.

Out of scope: screenshots, arbitrary new CSS properties, DOM restructuring, component-wide edits, automatic preview restoration or element rematching after navigation, full Undo/Redo, source-code analysis, built-in LLMs, and applying changes to a repository.

## Capabilities

### New Capabilities
- `review-recording`: Tab-bound review document lifecycle, local persistence, context-aware final differences, comments, compact cards, comparison, Markdown handoff, and product validation.

### Modified Capabilities
- `css-inspection`: Allow explicit local edits and resets while preserving passive inspection, authored/computed distinctions, variable copying, and read-only measurements.
- `inspector-session`: Separate temporary inspector cleanup from durable review documents and tab-bound recording lifetime; preserve local-only processing and explicit site access.

## Impact

- `inspect.js`: Editable property controls, comments, override ownership, comparison, reset, and document cards integrated with the existing selection panel.
- `background.js`: Serialized document operations, per-tab bindings, navigation/lifecycle routing, and storage-backed worker recovery.
- New small dependency-free modules for the review data model, Markdown serialization, and document-local override handling, following existing plain-JavaScript helper conventions.
- `css-values.js`, `box-model.js`, and existing frame snapshots: Preserve raw property identity and provenance instead of treating formatted measurements or grouped labels as editable declarations.
- `chrome.storage.local` stores documents; `chrome.storage.session` holds browser-session tab bindings. Existing `storage` permission is sufficient. Navigation must not silently broaden host access.
- Node and extension/browser fixtures cover persistence, navigation, frames, resets, comparison, and export; README updates accompany implementation. Main baseline specs remain unchanged until implementation and synchronization.

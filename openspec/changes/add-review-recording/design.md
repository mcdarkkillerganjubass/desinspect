# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. The repository is an unpacked Manifest V3 extension with plain JavaScript globals and Node `.test.cjs` helpers, not a bundled application.

- `background.js` injects a helper list, routes frame messages using sender tab/frame metadata, and queries the top-page controller for temporary settings. Its navigation listeners currently handle child-frame attachment; tab removal only clears temporary capture/hover resources.
- `inspect.js` owns the panel and local selections. Child documents send serializable snapshots to the shared panel. Element IDs currently come from a per-controller WeakMap; they are not durable selectors.
- `css-values.js` resolves authored expressions and variables on a best-effort basis. Snapshot formatting can convert units, round lengths, group font sources, and summarize box sides. Those display strings are not a write API.
- Persistent storage currently retains the theme. Existing specs call website properties read-only and require temporary inspector cleanup. The two modified-capability deltas intentionally change those boundaries without turning inspection preferences into persistent review data.
- The working tree already contains independent visual/token/property changes. Implementation must integrate with the current helpers and tokens rather than replace those changes with the earlier baseline.

## Goals / Non-Goals

**Goals:** Give durable review content one owner, keep DOM mutations in their owning document, and distinguish recording lifetime from controller lifetime. Make export deterministic and independent of page availability.

**Non-Goals:** No backend, dependency framework, event-sourced history, source-code mapping, or selector-based replay engine. Do not add new install-time host permissions. Existing connected-frame inspection remains supported through the same shared panel.

## Decisions

### 1. Separate the document model from DOM preview state

Use a small dependency-free review helper for document transitions, record updates, counts, and Markdown serialization, following existing helper export/test conventions. Keep element references and style restoration in a document-local override helper. The worker owns persistence and tab bindings; the panel sends explicit operations and renders acknowledged state.

An interaction log would require compaction to recover the agreed final differences. Instead, update one entry per `(document instance, URL, viewport context, element ID, property)`. Keep `createdAt` and `updatedAt`; comparison, export, and selection do not update content time.

Proposed persisted shape:

```text
ReviewDocument
  schemaVersion, id, status: recording | completed
  createdAt, updatedAt, completedAt?
  contexts[]
    id, topUrl, frameUrl?, topViewport: {width, height}
    frameViewport?: {width, height}, documentInstanceId
    elements[]
      id, identity: {tag, selector?, domPath?, text?, attributes, parent?}
      comment?
      parameters[property]
        original: {computed, sourceExpression?, sourceProperty?}
        target: {expression, computed}
```

The stable document ID is independent of Chrome tab IDs. Store only bounded identity excerpts and relevant identifying attributes; do not serialize the entire page, form state, or arbitrary DOM nodes. Stored identity is evidence for the recipient, not a promise of repository mapping.

### 2. Persist content locally and tab bindings for the browser session

Store documents under a versioned `chrome.storage.local` namespace, separate from theme settings. Use per-document keys rather than repeatedly rewriting every saved review. Keep `{tabId -> documentId, state}` bindings in `chrome.storage.session`, with `armed` and `recording` states. Serialize mutations in the worker so simultaneous frame edits cannot overwrite each other's latest data. Rehydrate on worker startup rather than depending on an in-memory Map.

On startup/reconciliation, complete recording documents that have no valid session binding or no longer have an open owning tab. This covers browser restart, missed tab-close cleanup, and reused tab IDs. Do not infer ownership from matching URLs. The first meaningful mutation creates the local document before the session binding is acknowledged; an interrupted creation can be reconciled as a retained completed document rather than lost work.

Memory-only state would fail on navigation and worker suspension. Local-only tab bindings could incorrectly resume a previous browser session. The split addresses both without a database or extra permission.

No automatic eviction: report storage errors, keep the editor/pending operation available, and offer export of recoverable content. A save-success indicator appears only after the durable write. Persist each committed change; uncommitted keystrokes are not recorded.

### 3. Define lifecycle transitions explicitly

| Current state | Action | Result |
| --- | --- | --- |
| No document / armed | Inspect, hover, open editor | No document created |
| No document / armed | First valid difference or nonempty comment | Create and persist recording document |
| Recording | Export | Download snapshot; remain recording |
| Recording | Stop | Complete document; enter armed state |
| Recording | New document | Complete old document; remove its live overrides; immediately create an empty recording document |
| No active note | First meaningful edit | Start a new recording document |
| Recording | Inspector close or page reload | Retain document/binding; discard temporary preview/controller |
| Recording | URL change | Retain document/binding; establish a new preview context |
| Recording | Tab closes | Complete and retain document |

Implementation defaults made explicit: Stop leaves the current preview available for comparison until cleanup or New document; completed content is read-only. After completion, the next meaningful edit or comment automatically starts another document. Starting a new document removes previous live overrides so the new recording starts from the website's underlying styles. These choices prevent unrecorded experimentation from contaminating another document's baseline.

The compact document area provides current and completed cards, status, `updatedAt`, a combined edit count, export, applicable Stop/New actions, and deletion for completed documents. A generated timestamp label is sufficient; custom naming, folders, and a detailed change list are not required. Clearing the last correction leaves the current document active with zero counts.

### 4. Recording survives navigation without automatic preview replay

Use tab-level navigation events to preserve the binding and invalidate document-local identities. Reopening on a newly loaded page fetches document metadata rather than attempting to restore saved overrides. Continue to require normal toolbar activation when page access or controller injection is unavailable; continuity of the document does not imply automatic panel injection.

Handle same-document history and fragment navigation as URL-context changes too. Capture the URL when committing rather than caching the session's first URL. Remove old-route live overrides before starting the new route context, even when the SPA reuses DOM nodes. Child-frame navigation invalidates only that frame's live identities; its records remain saved.

Record viewport width and height as CSS pixels independently of the display unit selector. Before a resize changes context, disable previous-context overrides. Read the website's unmodified values for a newly edited viewport context. Retain known element references within a live document to select the matching current-viewport preview; do not transfer a desktop override into a mobile baseline. A new document/controller instance creates new record identities, even when its URL matches an earlier visit. This is intentional: safe merging across reloads would require the excluded rematching engine.

### 5. Edit canonical properties in their owning frame

Extend snapshots with raw edit metadata: CSS property identity, pre-override computed value, available source expression/provenance, and active override expression. Reuse the existing inventory instead of introducing a second property registry. Expand grouped UI representations to their real properties: a grouped font exposes individual supported longhands; a side editor targets its side; compound border/gap values retain explicit declaration identity. Screen bounds, calculated content sizes, and measurement labels never become targets.

Use an explicit edit affordance so existing variable-name copying and disclosure controls keep their behavior. Prefill from an authored value where safely available, otherwise an unrounded computed CSS value. Never interpret the panel's dash for transparency as CSS input. Validate with the owning document's CSS parser and property allowlist; a valid unresolved variable is recorded as an expression without claiming a known computed result.

Edit commands contain document instance, element ID, and property. Resolve only against current frame-local references. Derive tab/frame identity from the extension sender, verify document generation and active selection, and reject stale commands. No DOM reference crosses frame boundaries.

Apply temporary property overrides locally, using inline priority where necessary to demonstrate the target. Keep restoration data for touched inline declarations, including absence, priorities, and overlapping shorthand/longhand families. Reset and comparison remove only extension-owned effects; do not assign an old complete `cssText` over newer application styles. If the application has replaced an owned declaration, report that the preview was lost instead of continually overwriting its render loop. Disconnected elements retain saved records but lose live preview status.

Capture original values with extension effects excluded. Repeated commits retain the original baseline and replace only the target. Detect unchanged targets with browser-normalized declarations/computed values; a different token or authored expression is still meaningful even if it currently computes to the same pixels. Reset is the unambiguous way to remove that intent. This avoids turning a unit-display conversion or computed side effect into another correction.

### 6. Comparison is a temporary view of live overrides

One switch state on the active card is broadcast to the tab's connected documents. Before suspends their owned overrides; After reapplies latest live-context targets. Completed historical cards without a current preview do not pretend to reconstruct their pages.

Selection and edit entry first switch to After across connected documents, then refresh the selected element or capture its edit baseline. Hover, scroll, periodic snapshots, and measurement rendering do not switch modes. Comparison must not write to review storage or counts. Keep modified-value indicators and reset controls reachable when applicability changes, especially after `display:none`.

### 7. Markdown is a deterministic handoff snapshot

Generate UTF-8 Markdown from the model with a fixed template and first-seen page/context ordering. The default action downloads a `.md` file through a Blob in the panel, reusing normal browser download behavior without a downloads permission. Do not rewrite a downloaded file as recording continues.

Include document metadata, pages, viewport/frame context, element lookup evidence, original source/computed values, entered targets and available observed values, and optional comments. Empty source fields are marked unavailable, not synthesized. Escape table content and preserve multiline comments as prose so punctuation cannot break structure. Source/page text is evidence, not trusted implementation instructions.

Example:

```md
# Interface Review

These changes demonstrate the desired visual result at the recorded viewports.
Locate the relevant source components. Reuse existing tokens and variants where
appropriate, preserve responsive behavior, and verify the result.
The default scope is the selected element; broader intent requires a comment.

## Page: https://example.com/settings

### Viewport: 1440 × 900

#### Button: Save

- Element: button[data-testid="save"]
- Parent: main > form
- Scope: selected element

| Parameter | Original source | Original computed | Preview target | Observed result |
| --- | --- | --- | --- | --- |
| height | var(--control-small) | 32px | 40px | 40px |

Comment: Use the standard button size.
```

### 8. Verify product value separately from technical correctness

Use comparable real review tasks with the existing manual workflow and the feature. Record preparation/export time plus subsequent clarification time; track misunderstood corrections. Success means lower combined time without worse comprehension. Do not invent a numeric target before observing the baseline. This is a validation activity, not extension analytics or a shipping telemetry feature.

## Risks / Trade-offs

- [A precise CSS edit can be a poor source-code solution] → Export observed facts and comments, state local scope, and leave implementation to the recipient; validate comprehension in real handoff.
- [Persistent content does not restore the page preview] → Explain saved versus currently applied changes on the card; no selector-based replay after reload or DOM replacement.
- [Navigation can remove activeTab access] → Keep recording metadata without silently requesting broader permissions; require normal activation at the destination.
- [Dynamic application styles and shorthand overlap complicate cleanup] → Track only owned declarations, test overlap and external mutations, and report lost previews rather than corrupting unrelated styles.
- [Several viewport contexts can be expensive] → Store only explicitly edited parameters and bounded identity context, not complete computed-style snapshots; expose local deletion and storage errors.
- [No detailed change list limits correction management across old pages] → Reset is available for live overrides; the Markdown file is the full review surface. Historical rematching and per-record management are intentionally deferred.

## Migration Plan

Add namespaced, versioned review data without altering existing theme storage. Introduce model/export checks first, then persistence, frame-local edit routing, compact UI, and navigation/comparison integration. Update README and synchronize the modified baseline requirements only after implementation verification; do not label planning artifacts as shipped behavior. At synchronization, update the CSS-inspection purpose's obsolete read-only wording as well.

Rollback removes recording/edit entry points and restores all reachable live overrides before controller cleanup. Retain stored review documents instead of deleting user content automatically. Ordinary inspection remains independently usable when recording is unavailable.

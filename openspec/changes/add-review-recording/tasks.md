# Tasks

## 1. Review model and deterministic export

- [x] 1.1 Add a small plain-JavaScript review model with versioned documents, context/element identity, original-to-final parameter updates, comment replacement, empty-record pruning, counts, and timestamps. Verify with Node assertions for repeated edits, reset-to-original, comment-only records, same-value/different-token targets, and distinct URLs/viewports/documents.
- [x] 1.2 Implement the Markdown snapshot serializer and template from design.md. Verify representative output preserves original token/computed values, final targets, selected-element scope, lookup evidence, comment-only entries, and escaped pipes/backticks/multiline content; document its Node test command beside existing checks in README.md.

## 2. Durable tab-bound document lifecycle

- [x] 2.1 Add worker-owned local document storage, session-only tab bindings, serialized mutations, and startup reconciliation without changing existing theme keys. Verify worker restart retains bindings, browser-session loss completes orphaned documents, separate tabs remain isolated, and concurrent frame updates do not lose data using mocked storage/lifecycle checks.
- [x] 2.2 Implement first-meaningful-change creation, explicit Stop/New transitions, tab-close completion, retained completed-document listing, export retrieval, and completed-document deletion. Verify no-op/cancelled edits create nothing, export leaves recording active, the next edit after completion automatically starts a new note, and a closed/restored tab cannot append to its old document.
- [x] 2.3 Surface failed writes and keep recoverable pending content available for retry/export without automatic eviction or false saved feedback. Verify injected storage failures preserve prior documents and do not acknowledge success; document local retention, deletion, save errors, and browser-restart behavior in README.md.

## 3. Document-local editing and safe restoration

- [x] 3.1 Add canonical edit metadata to current property snapshots, mapping displayed CSS-backed rows and box sides to actual properties while excluding screen/content measurements. Verify a scaled element edits CSS width, grouped typography edits individual longhands, and display-unit changes do not generate corrections in browser fixtures.
- [x] 3.2 Add a frame-local override helper with original computed/source capture, CSS validation, explicit targets, per-property ownership, and shorthand-aware restoration. Verify invalid input, original inline priorities, absent declarations, overlapping shorthand/longhands, token targets, unrelated application style mutations, and reset without destroying other overrides.
- [x] 3.3 Route commit/reset commands through the existing shared-panel bridge using sender tab/frame identity and document-instance/element checks. Verify edits in permitted same/cross-origin frames, stale commands after frame navigation, disconnected selections, and refused targets without additional host permissions in tests/extension.cjs.
- [x] 3.4 Implement explicit commit/cancel controls, override indicators, and per-parameter reset while preserving variable copy/disclosures and editing focus across refreshes. Verify keyboard interaction, invalid-value errors, retained reset access after display:none, and unchanged passive inspection; update README.md's read-only claims and editing instructions.

## 4. Compact document UI and comments

- [x] 4.1 Add current/completed document cards using the project's existing tokens and controls, showing status, last content-modification time, combined edit count, lifecycle actions, and completed-document deletion. Verify repeated edits count once, passive actions do not change time, and no detailed element-change list is introduced.
- [x] 4.2 Add an editable selected-element comment with clear/replace behavior independent of CSS edits. Verify a comment can start recording, clearing it preserves parameter edits, and clearing the last content leaves an active zero-count document; document this workflow in README.md.
- [x] 4.3 Connect active/completed card export to a UTF-8 .md download from a consistent model snapshot. Verify successful download content, export failure feedback, continued recording after export, and unchanged earlier downloaded files in the extension fixture; document export and recipient implementation guidance.

## 5. Preview comparison and navigation continuity

- [x] 5.1 Add the accessible Before/After switch and synchronized suspension/reapplication of current overrides across connected frames. Verify comparison changes neither document nor counts, hover/scroll leave Before active, and element selection or editor entry restores After before details/baseline capture.
- [x] 5.2 Handle main/child document navigation, same-document history/fragment changes, and viewport contexts while retaining the tab recording binding. Verify /profile to /settings appends to one document, reload retains records without replay, SPA routes remove previous-route overrides, and mobile baselines exclude desktop overrides.
- [x] 5.3 Integrate inspector close, Stop, New, and disconnection cleanup with override ownership and saved/live-preview status. Verify inspector reopening retains the document without replay, New starts from underlying website styles, completion preserves the last preview until the next note starts, and cleanup leaves unrelated styles intact.
- [x] 5.4 Document the saved-versus-live distinction, single-tab/multi-page scope, navigation activation limits, reset location, and exact Before/After behavior. Verify README.md examples match the lifecycle table and that cards clearly explain when saved corrections have no available preview.

## 6. Integrated acceptance and product validation

- [x] 6.1 Run the relevant existing Node helpers, new review/override checks, standalone browser checks, and the real-extension suite with CHROME_BIN. Verify selection, measurements, source variables, unit display, frame permission behavior, and ordinary inspection remain functional alongside the new workflow; record executed checks and any untested limits.
- [x] 6.2 Validate a complete multi-page, multi-viewport review through edits, comments, repeated adjustments, reset, comparison, export, Stop/New, worker restart, and tab close. Verify the final Markdown contains only remaining original-to-final differences and comments, with no cross-tab contamination or automatically restored historical previews.
- [x] 6.3 Prepare a real-task comparison protocol and results worksheet in project documentation: manual versus recorded preparation/export time, subsequent clarification time, and misunderstood corrections. Verify the worksheet supports evaluating lower combined time without worse comprehension; leave actual user research as the follow-up below.
- [x] 6.4 Validate this change with `openspec validate add-review-recording --strict --no-interactive` and reconcile implemented behavior with its scenarios. Verify implementation documentation describes observed coverage rather than claiming comprehensive cascade, navigation, or frame guarantees.

## Workflow follow-up

- Run the documented real-task comparison with a designer and recipient when participants are available; use its findings to decide whether text-only handoff is sufficient.
- After implementation review, synchronize the capability deltas and update obsolete baseline purpose/README wording, then archive the completed change using the OpenSpec workflow.

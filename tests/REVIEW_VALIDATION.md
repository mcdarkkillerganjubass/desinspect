# Review recording validation

## Automated checks

Run `node review.test.cjs` for the document model, Markdown formatting, original-to-final updates, comments, context isolation, serialized writes, independent tabs, worker rehydration, session loss, Stop/New, tab closure, and storage failures. Storage/lifecycle checks use a mocked Chrome API; they do not replace a real browser-restart test.

Run `REVIEW_TEST=1 node tests/extension.cjs` for actual extension interaction in an isolated Chromium profile. It exercises grouped typography and CSS dimensions, variable-backed shorthand restoration, inline importance, unrelated application style changes, explicit edit/reset, invalid CSS, comments, display-unit invariance, Before/After, viewport contexts, SPA URLs, permitted same/cross-origin frames, stale commands after iframe navigation, a downloaded Markdown file, inspector cleanup/reopening, page reload, Stop/New, and tab-close completion.

Run `BROWSER_TEST=1 node tests/extension.cjs` for the existing standalone HTML fixture through the test server, and `node tests/extension.cjs` for the general inspector integration suite. `CHROME_BIN` can select a local Chrome/Chromium executable. Temporary profiles and local test servers are removed by the runner.

The tests do not claim universal cascade precedence, automatic element rematching, arbitrary application rerender recovery, native Chrome permission-dialog automation, or cross-page preview restoration. Actual browser restart and host-permission revocation should also be checked manually before release.

### Implementation verification

The implementation passed all repository root `.test.cjs` files, `node tests/frame-access.cjs`, the general `node tests/extension.cjs` suite, `BROWSER_TEST=1 node tests/extension.cjs`, `REVIEW_TEST=1 node tests/extension.cjs`, and strict validation of `add-review-recording`. Browser checks used a temporary Chromium profile. The recording test also verifies invalid input does not create a document and reset remains available after `display:none`.

Existing fixtures were reconciled with the checkout's current token palette, initial panel width, layout grouping, source badges, and attribute table. Frame-measurement assertions now select measurement labels rather than spacing labels and use a nonzero test gap. A reproduced pre-existing iframe throttling issue was fixed by repainting overlays immediately on modifier updates, independently of animation-frame scheduling.

## Manual acceptance

Load the checkout as an unpacked Chrome extension. After code changes, reload the extension, refresh the website, and activate the inspector again. Test recording on a disposable review document, since reloading the extension resets its browser-session tab binding.

1. Make several padding changes, add a comment, and verify one final parameter difference and one comment.
2. Compare Before/After; scroll in Before, then select another element and verify automatic After.
3. Reset a parameter in the property panel. Export and verify that the parameter is absent but the comment remains.
4. Record desktop and narrow-window corrections; verify separate viewport contexts with underlying website baselines.
5. Navigate within one tab and record another page. Reload and reopen the inspector: the document survives, without replaying historical overrides.
6. Stop, start a new document, close its tab, and verify both completed documents remain exportable. Restore the closed tab and verify it does not resume recording into the old document.
7. Restart Chrome and inspect completed-document retention. Delete only the disposable review document afterward.

## Product experiment

Use comparable tasks checking an existing implementation against an agreed design. Alternate the manual workflow and recorded workflow across tasks to reduce learning/order effects. Use the same recipient type for a pair: developer or coding LLM. Include time spent inspecting/editing, writing comments, preparing/exporting the handoff, and answering subsequent clarification requests.

Do not add product analytics for this experiment. Record observations manually:

| Task / workflow | Recipient | Preparation + handoff minutes | Clarification minutes | Total minutes | Misunderstood corrections | Extra screenshots requested | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Comparable task A / manual | | | | | | | |
| Comparable task B / recording | | | | | | | |

Success is lower combined preparation/handoff and clarification time without worse comprehension. Establish a baseline before choosing a numeric improvement target. Frequent requests for screenshots are evidence to reconsider text-only export, rather than evidence that faster export alone solved the handoff problem. This worksheet is a protocol; no participant study has been performed by the automated tests.

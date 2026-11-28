# Design Inspect

A local Chrome extension for designers checking a live website. Select DOM elements, inspect CSS and spacing, and hold Alt to measure distances with Figma-like controls.

The extension runs directly from this folder. No build step, dependencies, server, or Chrome Web Store publication is required.

[Design tokens and theme palette](DESIGN_TOKENS.md) document the shared semantic styles for Light, Dark and System.

The [OpenSpec baseline](openspec/README.md) documents the app's current capabilities as requirements and scenarios. Validate it with `openspec validate --specs --strict --no-interactive`.

## Install locally

### Download from GitHub

1. Open the [desinspect GitHub repository](https://github.com/mcdarkkillerganjubass/desinspect) and choose **Code → Download ZIP**.
2. Extract the ZIP archive. Keep the extracted folder somewhere convenient; Chrome loads the extension from that folder.
3. In Chrome, open `chrome://extensions` and enable **Developer mode**.
4. Click **Load unpacked** and select the extracted `desinspect` folder containing `manifest.json`.
5. Pin **Design Inspect** from Chrome's extensions menu, then click its icon on a regular website.

Chrome runs the extension directly from the selected folder. It is not installed through the Chrome Web Store, so after downloading updated code, extract it and select the new folder in **Load unpacked** (or point the existing extension to the updated folder).

### Load from a local checkout

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder, containing `manifest.json`.
4. Pin **Design Inspect** from Chrome's extensions menu.
5. Open a regular website and click the extension icon.

Click the icon again, or the panel's close button, to remove the inspector from the page and its connected frames.

After changing the extension files, reload the extension at `chrome://extensions`, refresh the website, and click the icon again. See Chrome's [unpacked extension instructions](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

### Test a local feature branch

Chrome loads files from the selected folder, not from a Git branch name. With this checkout on `fix-spec-tool`, load this repository folder once, then use **Reload** on the extension card after code changes. Refresh the website and reopen the inspector. No build or server is needed for ordinary website testing. Reloading the extension clears the browser-session recording binding; export an in-progress review before updating the extension.

## Record interface corrections

Click a CSS value or variable name to edit it; clicking does not copy variables. Compound values open an Edit menu. Font offers Variable (an available font custom property) and individual typography properties; Border offers the whole property and its subproperties. Choosing a font variable preserves separate typography overrides. The editor opens as a floating overlay. Properties with a finite keyword grammar (box sizing, position, flex direction, alignment, and border style) use a select with browser-supported options and compatible site variables. Variable-backed values open with their source expression, including inherited grouped font variables. Save explicitly with **Save** or Enter, delete with **Delete**, or dismiss with Escape. A blue 16px pencil to the left of the value marks an override. Click the value to edit again; delete the override inside the editor. Element attributes are always shown before the final comment block, and their values are editable too. Matching site custom properties appear in a separate dropdown anchored to the input, using the table’s color-preview component and aligned text for suggestions with or without previews. Choosing a suggestion fills var(--name) without saving.

Repeated adjustments keep only the original and latest target: `16px → 20px → 32px → 24px` exports as `16px → 24px`. Returning to the captured original value removes the difference. Comments are independent; use **Add** for a new element comment, **Update** to replace an existing comment in the active note, or **Delete** to remove it without resetting CSS.

The **Fix notes** section stays at the bottom of the panel, capped at 30% of its height; only its list scrolls. Cards show a recording dot or completed folder, last edit time, date without year, and one combined edit count. **Copy** copies Markdown with a “Fixes copied” tooltip; **… → Download** downloads a snapshot without stopping recording. **Copy all** copies notes from latest to earliest. The Markdown starts with “Fix Notes”, groups corrections by page/context without printing window or frame dimensions, and includes element lookup evidence, original token/computed values, final targets under “Must be” as entered (preserving `var(...)`, fallbacks, and expressions), and comments. Computed target values, creation timestamps, and recording status are omitted from the report. Recipient implementation guidance appears at the end. A developer or coding LLM chooses how to implement the demonstrated result using the source project's components, tokens, and responsive rules.

**Before / After** compares currently live overrides in the tab's connected documents. Before leaves the report intact; scrolling and hovering preserve Before. Selecting an element or opening a CSS editor returns to After automatically. Saved changes from previous page loads are not reconstructed by comparison.

One tab owns one recording; URL changes and reloads keep the same document. Different pages and viewport sizes remain separate contexts. Navigation may require clicking the extension icon again under Chrome's existing site-access rules. Closing the inspector removes live overrides but retains the recording. Reloading a page or replacing an element retains saved corrections without automatically reapplying them. When a website replaces an override itself, the panel reports the lost live preview.

**Complete recording** completes the note. The next edit automatically starts another note. **Start new**, available while recording, completes the current note, clears its previews, and immediately creates an empty active note. The active card offers **Show before / Show after**. All cards offer **… → Download / Delete**. Closing the tab completes its note; restoring a closed tab or restarting Chrome does not resume an old note. The empty state explains that editing an object starts recording.

Review documents are stored locally using extension storage; they are not uploaded. Worker suspension does not lose committed records. There is no automatic eviction: storage failures show **Not saved**, keep the draft available for retry, and offer **Export unsaved changes** when content is recoverable. Uninstalling the extension removes its local data. The report is a standalone Markdown download, not a file continuously rewritten on disk.

Quick manual check:

1. Edit a selected element's padding several times and verify the card still counts one changed parameter.
2. Add a comment, switch Before/After, then select another element to verify automatic return to After.
3. Reset one parameter and export; verify the reset parameter is absent while the comment remains.
4. Navigate in the same tab, reopen the inspector as needed, and add another correction. Export should contain both pages.
5. Reload the page: the card retains saved counts, while the website has no restored historical overrides.
6. Stop, start a new document, and verify that the old document remains available for export.

## Use and Inspect

**Inspect** intercepts page pointer and keyboard actions while leaving scrolling available. Clicking selects an element. The floating panel shows properties for a single selection. Drag its header to move it without resizing the website. Use **Alt+Shift+P** while hovering a page element to pin its CSS `:hover` state and enter Inspect without moving the pointer; this Chrome-only feature uses the debugger permission and applies to the main frame.

**Use** hides highlights and allows normal website interaction. Open a dropdown or modal, then return to Inspect. Switching modes preserves the selection while its elements remain in the document. The mode controls preserve page focus and intercept their own pointer events before document-level outside-click handlers, so typical click-opened dropdowns stay open.

| Control | Behavior |
| --- | --- |
| Click | Select one element, including one child from a multiple selection. |
| Enter | Select all immediate children with layout boxes. If there are none, keep the selection. With multiple parents selected, collect and deduplicate their children. |
| Shift+Enter | Select the parents of the current elements, removing duplicates. |
| Alt + hover | Measure from the single selected element to a different element in the same document. Hovering does not change the selection. |
| Escape | Clear the active selection. |
| Use / Inspect | Switch interaction modes across the main page and connected frames. |
| Alt+Shift+P | Pin the current CSS `:hover` state and switch from Use to Inspect; press again to return to Use. |
| Units | Choose Auto, px, rem, or em for the panel and measurement labels. |
| I / eyedropper button | Toggle color sampling in Inspect. Escape exits the tool and keeps the selection. |

When several elements are selected, the panel shows their count and asks you to select one. Properties and measurements are available for a single element only. Disconnected selected elements are removed from the selection.

## Properties and box model

The panel opens at its minimum width of 340px and 30% of the viewport height (with a 180px minimum, constrained to fit the viewport), and can be dragged and resized from all four edges. Its header stays fixed while properties scroll. The interface uses bundled Inter at 13px/120% line height, with an 11px minimum and native monospace for numbers and code. The font is packaged locally under the SIL Open Font License; see `fonts/README.md`.

The selected element name occupies one ellipsized line. Its info button reveals DOM attributes; the hierarchy button lists its parent, current element and all immediate children, which can be selected directly, including inside connected frames. Geometry and displayed values update while the inspector is active. Mode and unit selectors are adjacent segmented controls; modes use icons.

**Margin → Stroke → Padding → Content** is one nested box-model diagram. Each layer shows top, right, bottom, and left values in their corresponding positions. Stroke represents the element's CSS border. Content dimensions exclude padding and border; for `border-box`, these are subtracted from the computed dimensions.

Left/right cells place units below their numbers and center both lines. Nonzero corner radii have quarter-arc indicators and value labels around the diagram. The outer Margin box uses resolved per-corner radii; inner boxes subtract their actual diagram insets separately on each axis, with a 2px minimum. Zero outer corners stay square. Percentage/elliptical radii are supported, including CSS overlap normalization. Radius annotations preserve their source units independently of the unit selector. These corners belong to a schematic diagram, so the browser can further fit very large radii to the available diagram size.

Selecting one element in Inspect also paints pale spacing regions directly on the page: **sand for margin**, **green for padding**, and **lavender for gap**. The same hues identify those parameters in the panel. Positive margins surround the element, padding stays inside its borders, and gap bands appear between supported flex/grid items or tracks. Child margins and extra distributed free space are not entirely treated as gap. Fills disappear in Use and multi-selection, follow scrolling and axis-aligned scaling, and work inside connected iframes.

Spacing overlays are estimates from CSS geometry: collapsed/auto margins, advanced wrapping, unresolved calc/subgrid tracks and transformed layouts are not fully reconstructed. Rotated/perspective or fragmented selections omit fills; gap scanning skips transformed children, anonymous text/display-contents items, vertical writing modes and containers over 200 children. The selected content area stays unfilled.

Variable-backed side values have dotted underlines and full-value tooltips. Below the diagram, matching variable/value pairs are grouped into a single source row, with side initials when needed. Border color and style are also summarized there. The diagram shows values, not a drawing to scale.

| Section | Displayed properties |
| --- | --- |
| Dimensions (no heading) | Two-column width/height table: property name on the left; screen dimension with the CSS value and rounded css badge as a muted description below. |
| Layout | `display`, `position`, `box-sizing`, `flex-direction`, `justify-content`, `align-items`, `gap`. |
| Typography | `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `color`; components sharing a variable-backed `font` shorthand are grouped. |
| Appearance | `background-color`, `border-radius`. |

Content follows this order: compact spacing diagram, dimensions, appearance without a heading, Layout, then Typography. A nonzero gap appears first in Layout.

CSS-backed parameters support explicit local editing and reset through review recording. Passive inspection does not edit the website; screen geometry and derived measurements remain read-only.

The main width/height values are the bounding rectangle including transforms. The descriptions below with a **css** badge retain their CSS/source meaning. Hover or focus the badge for a **CSS size** hint above it. For example, an element with CSS width 100px and scale(2) shows **200px** with **100px [css]** underneath. The Content label in the box model has a help hint explaining the content area without padding, border or margin; it does not measure visible text ink.

## Eyedropper

In Inspect, press **I** or click the eyedropper icon immediately to the right of the mode selector. Hover the page to see a color popover beside the cursor. It shows a 16px square preview and the sampled HEX color. When an accessible CSS declaration can be matched to that pixel, it shows the variable name instead, with its full computed color underneath. Names omit `var(--…)`, matching the property panel.

Sampling uses the rendered screenshot, so images, gradients and canvas pixels are supported. Variable attribution is best-effort: it checks opaque text, borders and backgrounds against the sampled color with a small tolerance for browser color-profile rounding. Ambiguous matches, alpha compositing, filters and inaccessible sources fall back to the actual pixel color. A pixel inside an image has no CSS variable identity. Connected frames forward pointer coordinates to the shared main-page popover; axis-aligned scaled/nested frames are supported, while rotated or perspective frames are not mapped precisely.

Element selection and measurements pause while the tool is active. **I**, **Escape**, or switching to Use turns it off without clearing the selected element. The button is disabled in Use. Pixel sampling requires the installed extension; the standalone HTML fixture cannot capture the browser viewport.

Chrome limits screenshot captures to two per second. The extension refreshes its in-memory image no more often than every 700ms and samples cursor movement from that image, so animation changes can appear with a short delay. Scroll/resize invalidates it. The popover is briefly hidden during capture to avoid sampling itself. Screenshots are never saved or transmitted; the worker returns only the requested pixel. Capture failures display an unavailable message instead of a guessed color.

## CSS variables and units

When an accessible source declaration uses a CSS variable, the panel shows a compact name and an eye button. Computed values are hidden initially; clicking the eye reveals a smaller description below the name:

```text
space-4
24px
```

CSS wrappers (`var(...)` and the leading `--`) are hidden; meaningful prefixes such as `tui-` remain. Original expressions are available in tooltips. Calculations and fallbacks keep their meaning in compact labels. If a variable comes from a shorthand such as `padding` or `border`, a source note identifies it; the expression can describe the whole shorthand rather than just that side.

Colors, including literal values, have a 16×16px square preview with 4px corner radii in a separate reserved column. All value text starts on the same vertical line, whether or not the row has a preview; labels, previews and wrapped names align with the first line. Revealed descriptions align with the name. Empty values and fully transparent colors display **—**, while zero dimensions and partially transparent colors remain explicit. A transparent color is still a CSS value; the dash means no visible color contribution, not that the declaration or a possible background image is missing.

Clicking a variable name starts editing, without writing to the clipboard. The eye and chain controls independently reveal computed values and variable aliases.

Layout values are text-only. Hover a property name for a short native explanation. Variable values are editable; disclosure controls remain available.

Typography components from one shared `font` variable appear in one row with individual computed descriptions. Separate longhand overrides remain separate and have a two-arrow replacement marker beside the property, without an override-source tooltip. For example, `font: var(--font-ui)` and `font-weight: var(--weight-strong)` show a grouped font-ui row plus a marked font-weight row. Original inline shorthand text is read when CSSOM loses shorthand serialization after a partial override; stylesheet source recovery remains best-effort.

| Unit | Behavior |
| --- | --- |
| Auto | Preserve available authored CSS values and units. Use computed values when the source is unavailable. Bounding sizes and distances remain in px. |
| px | Show computed CSS values in their browser-provided units, normally px for resolved lengths; bounding sizes and distances use px. |
| rem | Convert px lengths using the selected document's root font size. |
| em | Convert px lengths using the selected element's font size; use its parent's font size when converting `font-size` itself. |

Colors, font names, keywords, and other values without px lengths are not converted. Compact variable names stay unchanged above converted descriptions, with full source expressions retained in tooltips. Unit preferences apply to all connected frames for the current inspector session.

The source reader handles accessible stylesheets, inline declarations, common selector specificity, inherited typography properties, `!important`, imports, `@media`, `@supports`, and cascade layers. Source information is best-effort, not a full replacement for the browser's cascade inspector. When inaccessible stylesheets or unsupported rule groups are detected, the panel warns that source expressions may be incomplete; computed values remain available.

## Measurements

Select an element, hold **Alt**, and hover another element in the same document. The inspector draws nonzero horizontal and vertical measurement lines with end ticks and distance labels. Lines are bright orange, 1px wide and always unoutlined. Labels always use regular-weight 11px black monospace text inside a small rounded orange box. Solid lines start at the midpoint of the selected edge; dashed perpendicular connectors reach the compared edge's midpoint. Zero distances, including values rounded to zero, are hidden.

Distance boxes move to nearby free positions when they would overlap, keeping both readable with separation wherever viewport space permits. Placement also avoids the shared panel and keeps boxes within the viewport; moving a label does not change its measured distance.

For each axis:

- If the elements are separate, measure the gap between their facing edges.
- If their projections overlap, measure the closer pair of corresponding edges: left-to-left or right-to-right, and top-to-top or bottom-to-bottom.
- For nested elements, this yields the nearest corresponding edge offset; aligned edges can produce zero.

Distances use rectangular element bounds, not visible glyph outlines, rounded contours, or individual painted pixels. A measured gap does not imply that CSS `margin`, `padding`, or `gap` caused it. Measurements across different documents or frames are not supported.

## Iframes and access

The inspector attaches to accessible iframes, including nested frames. Each frame draws its own highlights and measurements; **one shared panel stays on the main page**. Selecting an element inside a frame shows its properties in the shared panel and clears selections in other documents. There is no separate frame-name or URL row.

Mode, units, shortcuts, and Alt modifier state are coordinated across frames. Measurements remain local to one document. Font-relative conversions use the inspected frame's fonts, not the main page's fonts.

If a frame cannot be inspected, the panel shows **Iframe appeared. Allow inspect**:

1. Click the button to open Chrome's permission prompt directly.
2. Accept access to the requested iframe domains.
3. Select an element inside the iframe; accessible frames attach without reloading the page.

There is no intermediate extension window. Denying permission leaves the main-page inspector working and offers a retry. Browser-restricted frames can remain unavailable after access is granted.

New and reloaded frames attach automatically while the inspector is open. Navigating or removing the selected frame clears its selection. Closing the inspector removes its overlays and event handlers from connected frames.

## Permissions and privacy

| Permission | Purpose |
| --- | --- |
| `activeTab` | Temporary main-page access and visible-tab color sampling after clicking the extension icon. |
| `scripting` | Inject the inspector into permitted documents. |
| `webNavigation` | Discover frames and follow frame navigation while an inspector is open. |
| Optional HTTP/HTTPS host permissions | Inspect frames on additional hosts after explicit approval. |

Optional permissions are declared broadly so access can be requested for the hosts used by the current page. Declaring them does not grant access to every website. Host grants persist in Chrome and can be revoked in the extension's site-access settings.

The extension does not send page content to a server or include analytics. Inspection state is kept in the active page; the eyedropper keeps one temporary screenshot canvas per sampling tab in service-worker memory, cleared when disabled, closed, or navigated. The session resets when the inspector is closed or the main page reloads. It does not automatically inspect other tabs just because a host permission has been granted.

## Current limitations

- Chrome internal pages, restricted browser pages, and PDF viewers are not supported.
- Browser or sandbox restrictions can prevent frame injection even after host access is granted. Inspect cannot intercept interactions inside an inaccessible frame.
- Shadow DOM internals and canvas-rendered objects are not inspected individually; their outer DOM elements can be selected.
- Text measurements use the element's rectangle, not the outline of its characters.
- Menus that close when the pointer leaves can close before you reach the mode switch. Site handlers registered earlier on `window`, or browser-native behavior, may also affect page state.
- Source resolution is incomplete for CSS nesting, `@scope`, container queries, `nth-child(of …)`, logical-property mappings, and some advanced cascade cases. Cross-origin stylesheet CSSOM access can be blocked independently of frame access.
- Animations and transitions can make authored declarations differ from the current computed value.
- Percentages, viewport units, cross-frame measurements, CSS editing, Figma export, and automatic design comparisons are not implemented.

## Development and checks

The extension uses plain JavaScript and Manifest V3. No package installation is required.

| File | Responsibility |
| --- | --- |
| `manifest.json` | Extension metadata, permissions, action, and service worker. |
| `background.js` | Activation, frame discovery, message routing, and access coordination. |
| `inspect.js` | Floating panel, box model, selection, input interception, overlays, and local frame state. |
| `css-values.js` | CSS source lookup and px/rem/em formatting. |
| `geometry.js` | Rectangle edge-distance calculations and collision-aware distance-label placement. |
| `layout-icons.js` | Layout property explanations, eye icons and the replacement marker. |
| `spacing.js` | Margin/padding bands and conservative flex/grid gap geometry. |
| `box-model.js` | Side-unit splitting, corner-radius resolution and nested diagram radius calculations. |

Run the lightweight checks:

```sh
node geometry.test.cjs
node layout-icons.test.cjs
node spacing.test.cjs
node box-model.test.cjs
node css-values.test.cjs
node review.test.cjs
node tests/frame-access.cjs
```

These cover rectangle geometry, unit conversion, selector specificity, declaration/layer precedence, inaccessible stylesheets, and the permission UI's approval/denial paths using mocked APIs. The direct native iframe prompt and selection after approval were also checked manually in Chrome.

Open `tests/browser.html` in a browser for the standalone inspector checks. It should display **PASS** after checking variables, Auto/rem units, box-model sides and content dimensions, dropdown/focus preservation, and cleanup.

For the unpacked-extension integration checks, use Node.js 22+ and a Chrome/Chromium executable:

```sh
CHROME_BIN="/absolute/path/to/chrome" node tests/extension.cjs
```

Run `REVIEW_TEST=1 node tests/extension.cjs` for the recording UI, original-to-final differences, comments, reset, comparison, viewport separation, SPA URLs, permitted frames, Markdown download, reload, Stop/New, and tab closure. `node review.test.cjs` covers the model/export and mocked storage, worker restart, independent tabs, browser-session loss, concurrency, and write failures. These checks do not claim full browser-cascade or arbitrary application rerender support.

The runner creates two local HTTP servers, a temporary extension copy, and a temporary browser profile. Only the test manifest pre-grants localhost access; the production manifest is unchanged. Checks cover bundled Inter under restrictive page font policies, fixed headers, horizontal resizing, DOM attributes and hierarchy selection, persistent nonoverlapping measurement badges, same-origin and cross-origin frames, one shared panel, direct iframe permission requests and denial retry, CSS variables, frame-relative rem conversion, the box model, routed shortcuts and Alt measurements, mode synchronization, dropdown/focus preservation, dynamic frame attachment/removal, and cleanup. Existing browser profiles are not used.

Run `EYEDROPPER_TEST=1 node tests/extension.cjs` for real screenshot sampling, variable/gradient colors, cross-origin iframe pointer mapping, I/Escape, capture-error handling, mode restrictions and cleanup. That isolated test copy grants `<all_urls>` so automated activation can capture without a real toolbar gesture; production permissions are unchanged.

Set `SCREENSHOT_PATH=/absolute/path/panel.png` when running the integration checks to capture the panel. The default executable path in the runner targets a local macOS Playwright Chromium cache; set `CHROME_BIN` explicitly on other machines.

## Manual check on a live site

1. Select a button in a card and check its dimensions and box model.
2. Select the card, press Enter, then click one child to see its properties.
3. Try Shift+Enter and Alt measurements against a sibling and parent.
4. Scroll and verify that highlights follow the elements.
5. In Use, open a dropdown; switch to Inspect and inspect an item.
6. Select an element in an iframe and verify the shared panel, units, and shortcuts.
7. Move the panel and confirm that the website's viewport width does not change.
8. Close the inspector and confirm that normal clicks and keyboard interactions resume.

Run `TOKEN_TEST=1 node tests/extension.cjs` for terminal variable chains, calculations, inherited definition context, cycles and computed panel values.

Typography appears for the selected element’s own rendered, non-whitespace DOM text or an explicit supported typography declaration on that element. Descendant text does not enable Typography on a card or wrapper. Empty/image avatars omit it; direct text initials enable it. Hidden or zero-opacity text is excluded. Run `TYPOGRAPHY_TEST=1 node tests/extension.cjs` for these rules and live content updates.

Sections follow applicability: dimensions, box model and Appearance require the selected element’s own rendered CSS box; display and position remain available without one. Flex direction is shown for flex containers; alignment and gap for flex/grid containers, including zero gap. Transparent backgrounds and zero box-model values remain inspectable. Run `APPLICABILITY_TEST=1 node tests/extension.cjs` for these rules and live display changes.

Use **Show all properties** to reveal filtered Appearance, Layout and Typography rows for the current selection, including connected frames. **Show applicable properties** restores filtering. This preference lasts for the inspector session. Values may not affect the selected element; missing element geometry is never fabricated.

Border rows show width, style, and color on separate lines with the same typography and no gap; each value is directly editable. Explicit border overrides remain inspectable even when not painted. Setting a nonzero border width supplies solid only for sides currently using none/hidden; visible dashed/dotted/etc. styles are preserved. Automatic style changes are recorded and removed with their owning width reset, unless the style is subsequently edited explicitly.

Element attribute edits appear only in the final Element attributes section. CSS edits made in the box model that lack a normal table row appear directly below the diagram as standard parameter/value rows, using the shared columns, value editor, and pencil indicator.

Run `NOTES_TEST=1 node tests/extension.cjs` for the Figma notes states, clipboard feedback, lifecycle actions, fixed header, and responsive 30% height cap.

Click the numeric margin, padding, or gap badge on the selected element’s page overlay to edit that side or gap axis using the same value editor. These edits are previewed and recorded in Fix notes. `SPACING_EDIT_TEST=1 node tests/extension.cjs` verifies actual mouse clicks and recorded targets.

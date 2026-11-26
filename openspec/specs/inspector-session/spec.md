# Inspector Session Specification

## Purpose

Provide a locally installable, temporary inspection workspace on live web pages without changing their viewport layout or requiring publication to the Chrome Web Store.

## Requirements

### Requirement: Local extension activation
The extension SHALL use Manifest V3 and run unpacked from the repository without a build step or installed runtime dependencies. Clicking its toolbar action on a permitted page SHALL create one main-page inspector, initially in Inspect mode with Auto units and no selection.

#### Scenario: Start a session
- **WHEN** the user loads the unpacked extension and clicks its action on a permitted website
- **THEN** the floating panel and hover inspection are available without starting a server
- **AND** the initial mode is Inspect and the initial unit setting is Auto

#### Scenario: Unsupported page
- **WHEN** initial script injection fails on a restricted page
- **THEN** the action displays a `!` badge and a title explaining that a regular website is required

### Requirement: Floating inspection panel
The inspector SHALL display a dark floating panel over the main page without reducing the website's viewport width. It SHALL start at its minimum width of 340px and support header dragging. Property content SHALL scroll independently while the header, controls, selected-element row and shortcut footer remain visible. Position and dimensions SHALL fit the viewport where possible.

#### Scenario: Move the panel
- **WHEN** the user drags the panel header
- **THEN** the panel moves and the website retains its viewport width
- **AND** movement is constrained to the viewport with an edge inset

### Requirement: Horizontal resizing
Both panel edges SHALL provide pointer and keyboard-accessible horizontal resize handles. The normal minimum width SHALL be 340px, reduced when the viewport is narrower. Resize SHALL preserve the opposite edge where possible, respect viewport bounds and update nested diagram radii. Handle arrow keys SHALL adjust width in 16px steps.

#### Scenario: Resize from the left
- **WHEN** the user drags the left edge 40px left from the initial width
- **THEN** the panel becomes 380px wide without resizing the website

### Requirement: Vertical resizing
The top and bottom panel edges SHALL provide pointer and keyboard-accessible vertical resize handles. The minimum height SHALL be 180px, reduced for shorter viewports. Resize SHALL preserve the opposite edge where possible and respect viewport bounds. Arrow Up and Arrow Down SHALL adjust height in 16px steps while property content scrolls independently.

### Requirement: Bundled typography
The panel SHALL use bundled Inter at 13px with 120 percent line height by default. Numeric values, CSS/code text and measurement labels SHALL use native monospace fonts. No inspector content SHALL use a font smaller than 11px. The font SHALL load locally without a runtime CDN request, including on host pages that block remote fonts; the packaged SIL OFL license SHALL be retained.

#### Scenario: Strict host font policy
- **WHEN** a page declares font-src 'none'
- **THEN** the inspector can load its bundled Inter from binary data supplied by the extension worker without granting the website font-resource access

### Requirement: Segmented controls
Use and Inspect SHALL appear as an icon-only segmented control with accessible names and tooltips. A neighboring segmented unit control SHALL offer Auto, px, rem and em to its right. Selected segments SHALL expose aria-pressed state. Mode/unit activation SHALL remain usable while scrolling properties and preserve page focus through pointer-event interception.

#### Scenario: Controls remain pinned
- **WHEN** the properties area is scrolled to the bottom
- **THEN** both segmented controls and the selected-element row remain at their original positions

### Requirement: Inspect mode interception
In Inspect mode, the inspector SHALL highlight hovered elements and intercept pointer activation, context-menu, touch and drag-start events in injected documents. Its own panel controls SHALL remain usable. Event interception SHALL be documented as best-effort rather than a guarantee against earlier window handlers or browser-native behavior.

#### Scenario: Inspect a link
- **WHEN** the user clicks a link in an injected document in Inspect mode
- **THEN** the inspector selects the link and prevents its normal activation when the event reaches the inspector's capture handler

### Requirement: Use mode and state preservation
Use mode SHALL hide inspection overlays and allow normal page interaction. Switching between Use and Inspect SHALL retain connected selections and avoid deliberately transferring focus away from the page. Pointer activation of mode controls SHALL be intercepted before document-level outside-click handlers.

#### Scenario: Preserve a click-opened dropdown
- **WHEN** a focused page button has opened a dropdown that closes on blur or a document-level outside pointer click
- **AND** the user clicks the Inspect mode control
- **THEN** the trigger retains focus and that mode-control click does not close the dropdown
- **AND** inspection resumes without reloading the page

#### Scenario: Hover-dependent UI
- **WHEN** a menu closes because the pointer leaves its activation region on the way to the panel
- **THEN** the extension does not promise to keep that menu open or freeze the site's state

### Requirement: Session cleanup
Clicking the toolbar action again or the panel close control SHALL end the session across connected documents. Cleanup SHALL cancel rendering, disconnect observers, remove event/message listeners and overlays, and remove the local controller. Inspection preferences and selections SHALL NOT persist across a closed session or main-page reload.

#### Scenario: Close inspection
- **WHEN** the user closes the inspector
- **THEN** connected documents no longer contain its overlays or input interception handlers
- **AND** the next activation starts with the initial session settings

### Requirement: Local processing and explicit access
The extension SHALL inspect page data locally without sending page content to a server or recording analytics. Main-page access SHALL be initiated by the toolbar action through `activeTab`; additional host access SHALL use optional permissions as specified by iframe inspection.

#### Scenario: Inspect without external data processing
- **WHEN** an element's properties are displayed
- **THEN** DOM geometry, computed styles and available CSS sources are read in the browser and displayed without a network upload

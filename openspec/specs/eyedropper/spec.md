# Eyedropper Specification

## Purpose

Inspect the rendered color under the cursor, with CSS variable attribution when it can be established.

## Requirements

### Requirement: Inspect-only activation
The tool SHALL toggle through the I key (including the physical KeyI position across keyboard layouts) or an accessible icon button immediately right of the mode selector. It SHALL be available only in Inspect, with a pressed state while active and a disabled button in Use. Escape SHALL exit the tool before clearing any selection. Repeated keydown and modifier shortcuts SHALL NOT toggle it.

#### Scenario: Toggle without changing selection
- **WHEN** the user activates the tool, moves the cursor and clicks the page
- **THEN** the current selection is retained, selection overlays and measurements are paused, and page activation is prevented
- **WHEN** the user presses Escape or I, or switches to Use
- **THEN** sampling stops and the selected element remains available

### Requirement: Rendered pixel sampling
The extension SHALL sample visible-tab PNG pixels using existing activeTab access, only for the requesting active tab in the focused window. CSS viewport coordinates SHALL map to bitmap coordinates. The worker SHALL return only the requested pixel. Captures SHALL be serialized globally with at least 700ms between starts. Scroll and resize SHALL invalidate the cached image. Failures SHALL show an unavailable message rather than infer a pixel from CSS.

#### Scenario: Gradient overrides a variable background
- **WHEN** a gradient covers a variable-backed background color
- **THEN** the popover displays the rendered gradient pixel, rather than the covered variable color

#### Scenario: Capture unavailable
- **WHEN** Chrome rejects screenshot capture
- **THEN** the popover displays Color unavailable with a description of the failure, and restores its capture mask

### Requirement: Color popover and source attribution
One noninteractive popover SHALL appear beside the cursor within the main viewport, showing a 16px square preview with 4px corner radii and the sampled HEX value. It SHALL be excluded from captures, hidden over inspector controls and cleared on leaving the document or losing window focus.

#### Scenario: Cursor preview
- **WHEN** the user hovers a rendered pixel
- **THEN** its color preview appears beside the cursor within the viewport

### Requirement: Variable attribution
Accessible opaque CSS text, border and background candidates SHALL match within three channel levels. A uniquely closest token SHALL replace the HEX label, with the full computed color below and existing clean token formatting. Ambiguity, alpha compositing and filters SHALL fall back to pixel values. Attribution SHALL remain best-effort.

#### Scenario: Variable color
- **WHEN** an accessible var(--brand) declaration supplies the sampled opaque background
- **THEN** the popover shows brand, a square color preview and its full computed color underneath

### Requirement: Frame coordination
Tool state and keyboard toggles SHALL be coordinated across connected frames. Child frames SHALL forward coordinates and CSS candidates through parent frame viewports to the single main-page popover. Axis-aligned scaling and frame borders SHALL be accounted for; rotated or perspective frame mapping remains unsupported. No screenshot pixels SHALL be exposed through window messages.

#### Scenario: Cross-origin frame color
- **WHEN** the cursor hovers an accessible cross-origin frame background using a variable
- **THEN** the shared popover samples the corresponding main-viewport pixel and shows the frame variable when matched

### Requirement: Local screenshot lifecycle
Screenshot canvases SHALL stay in extension service-worker memory, SHALL NOT be saved or transmitted to external services, and SHALL be cleared on tool disable, inspector close, tab close or main-frame navigation. Late captures SHALL NOT repopulate the cache after sampling stops. Sampling SHALL NOT add production permissions or dependencies.

#### Scenario: Session cleanup
- **WHEN** the user closes the inspector during sampling
- **THEN** listeners and overlays are removed and the tab screenshot cache is discarded

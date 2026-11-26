# Iframe Inspection Specification

## Purpose

Allow inspection inside permitted embedded documents while retaining one shared control panel and explicit access to additional hosts.

## Requirements

### Requirement: Per-frame inspector and shared panel
On activation, the extension SHALL enumerate the tab's frames and attempt injection into accessible child documents, including nested frames. Each injected frame SHALL maintain its own DOM references, source reader, overlays and local geometry. Only the main-page inspector SHALL display a panel. Child property snapshots SHALL reach it through extension message routing.

#### Scenario: Select in an accessible frame
- **WHEN** the user selects an element inside an injected iframe
- **THEN** the frame draws its own selected-element highlight
- **AND** the one main-page panel shows the element's properties without a separate iframe name or URL row

#### Scenario: Cross-origin frame with host access
- **WHEN** Chrome grants the extension injection access to a frame on another origin
- **THEN** that document is inspectable even though the main page cannot directly read its DOM

### Requirement: One active selection owner
Selecting an element in any injected document SHALL make that frame the active selection owner and clear selections in other connected documents. Frame identity used for routing SHALL come from Chrome's message sender metadata. Measurements SHALL remain within the selection owner's document.

#### Scenario: Move selection into an iframe
- **WHEN** a main-page element is selected and the user selects an iframe element
- **THEN** the main-page selection clears and the shared panel displays the iframe element
- **AND** no distance is measured between those two documents

### Requirement: Shared settings and routed shortcuts
Use/Inspect and unit choices SHALL be shared across injected frames. Enter, Shift+Enter and Escape SHALL be routed to the active selection owner when keyboard events originate in another injected document. Alt state changes SHALL be synchronized so remote measurements can start and end without requiring keyboard focus inside the selected frame.

#### Scenario: Navigate hierarchy from another document
- **WHEN** an iframe element is selected but the keyboard event originates in the main document
- **AND** the user presses Shift+Enter
- **THEN** the selected iframe element's parent is selected in its own document

#### Scenario: Release Alt outside the selected frame
- **WHEN** an iframe measurement is active and Alt is released in another injected document
- **THEN** that frame's measurement lines are removed

### Requirement: Optional host-access interface
If frame injection fails, the shared panel SHALL expose an iframe-access control with the blocked-frame count. The control SHALL open an extension-owned window listing missing host permissions for current HTTP/HTTPS frame URLs, deduplicated as scheme/hostname match patterns. It SHALL request optional permissions only after a direct user click and SHALL NOT require blanket access at installation.

#### Scenario: Frame host lacks permission
- **WHEN** an embedded HTTP frame uses a host not covered by existing access
- **AND** the user opens the access window
- **THEN** that missing host pattern is listed and an explicit permission-request action is available

### Requirement: Permission outcomes and retries
Granting access SHALL trigger a new attachment attempt without reloading the website. Denial SHALL leave the inspector working on already accessible documents and allow retry. If permissions already exist, the window SHALL offer reconnection. Remaining blocked frames or a closed inspector SHALL produce an explanatory status instead of a false success claim.

#### Scenario: Host access approved
- **WHEN** Chrome grants the requested optional host permissions
- **THEN** the extension retries frame attachment and reports whether frames remain blocked

#### Scenario: Host access denied
- **WHEN** the permission request is denied
- **THEN** no new attachment is requested by that approval flow
- **AND** the access window allows retry while the existing inspector remains active

### Requirement: Explicit permission lifetime and localization
Additional host permissions SHALL be governed by Chrome's persistent site-access controls and remain independently revocable. The current access window SHALL retain its Russian labels, while the main inspection panel uses English labels; documentation SHALL explain those existing labels rather than claim the entire interface is English.

#### Scenario: Reopen an already permitted host
- **WHEN** a later session encounters a frame covered by a retained host grant
- **THEN** the extension can attempt injection without requesting that host again
- **AND** it does not automatically inspect other tabs merely because the grant exists

### Requirement: Dynamic frame lifecycle
While the inspector is open, iframe additions/removals and frame document loading SHALL trigger attachment updates. Navigating or removing the active frame SHALL clear its stale remote selection. Newly attached documents SHALL obtain the current mode, unit and active-frame settings. Repeated injection attempts SHALL reuse an existing controller rather than create duplicate panels or listeners.

#### Scenario: Dynamically inserted iframe
- **WHEN** the website inserts an accessible iframe during an inspection session
- **THEN** the frame receives an inspector after loading without requiring the user to toggle the extension

#### Scenario: Selected frame is removed
- **WHEN** the selected iframe is removed
- **THEN** the shared panel clears that frame's stale properties and returns to a selection prompt

### Requirement: Restricted-frame behavior
The extension SHALL treat browser-denied frames as unavailable rather than promise universal injection. It SHALL document that host grants do not guarantee access to browser-restricted or sandboxed documents and that Inspect cannot intercept events inside uninjected frames. Closing a session SHALL remove inspectors from all connected frames.

#### Scenario: Frame remains blocked after permission
- **WHEN** Chrome still rejects injection after host access is granted
- **THEN** the frame remains counted as blocked and the extension reports the incomplete attachment

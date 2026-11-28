# Inspector Session Spec Delta

## MODIFIED Requirements

### Requirement: Session cleanup
Clicking the toolbar action again or the panel close control SHALL close inspectors across connected documents. Cleanup SHALL cancel rendering, disconnect observers, remove listeners, overlays, local controllers, and extension-owned style overrides. Temporary inspection preferences and selections SHALL NOT persist after closure or reload; separately persisted theme settings and review documents SHALL be retained. Inspector closure SHALL NOT complete tab-bound review recording.

#### Scenario: Close inspection
- **WHEN** the user closes the inspector
- **THEN** connected documents no longer contain its overlays or input interception handlers
- **AND** the next activation starts with the initial session settings apart from separately persisted theme and review data

#### Scenario: Reopen while recording
- **WHEN** the designer closes and reopens the inspector in a tab with a recording document
- **THEN** that document remains active with its saved content
- **AND** old preview overrides are not restored automatically

#### Scenario: Restore the website on cleanup
- **WHEN** the inspector closes while parameter overrides are applied
- **THEN** extension-owned overrides are removed without erasing unrelated website styles
- **AND** the corresponding saved corrections remain in the document

## ADDED Requirements

### Requirement: Durable recording respects explicit site access
Keeping a review document active across navigation SHALL NOT grant new site permissions or automatically inspect unrelated tabs. If navigation leaves the extension without injection access, the document SHALL remain active and saved until the designer explicitly activates inspection on a permitted page. Restricted-page failures SHALL NOT complete or delete the document.

#### Scenario: Navigate to another origin
- **WHEN** a recording tab navigates to an origin without available injection access
- **THEN** saved review content and the recording binding are retained
- **AND** inspecting or editing the destination requires the normal explicit activation and permission flow

#### Scenario: Restricted destination
- **WHEN** the tab navigates to a browser-restricted document
- **THEN** the extension does not attempt to bypass the restriction
- **AND** the saved review remains available when its document interface can next be opened

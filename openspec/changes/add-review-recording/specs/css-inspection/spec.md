# CSS Inspection Spec Delta

## MODIFIED Requirements

### Requirement: Property sections
For one connected selected element in Inspect mode, the panel SHALL display applicable property sections from the inventory above, following the section applicability rules. CSS-backed parameters SHALL support explicit local editing under the review-recording requirements; screen geometry SHALL remain read-only. Passive inspection SHALL NOT modify styles. Source lookup SHALL refresh periodically rather than synchronously tracking every stylesheet mutation.

#### Scenario: Read a button's properties
- **WHEN** a single button is selected
- **THEN** its screen bounds, CSS dimensions, layout, typography and appearance are shown
- **AND** inspecting these values does not modify its styles

#### Scenario: Explicitly edit a parameter
- **WHEN** the designer commits a supported CSS parameter on the selected button
- **THEN** its local preview updates and the current review document records the difference
- **AND** merely selecting or revealing the parameter does not create a correction

## ADDED Requirements

### Requirement: CSS parameter editing boundary
Editing SHALL cover CSS-backed parameters exposed by the current panel, including box-model sides and CSS dimensions. Screen bounds, derived content dimensions, and measured distances SHALL remain read-only. Grouped summaries SHALL expose their underlying parameter identities rather than writing display labels as CSS. Arbitrary new properties and DOM restructuring SHALL NOT be offered.

#### Scenario: Scaled width editing
- **WHEN** a scaled element shows 200px screen width and 100px CSS width
- **THEN** only the CSS width is editable
- **AND** committing 120px updates the CSS width while screen width is recomputed

#### Scenario: Grouped font source
- **WHEN** a font token groups family, size, weight, and line-height
- **THEN** editing font-size targets that longhand and does not replace the entire font token

### Requirement: Committed values and validation
Parameter editing SHALL support explicit commit and cancellation using keyboard-accessible controls. Invalid property values SHALL show an error without changing the page or document. Inputs SHALL use real CSS values rather than rounded measurements or display-only token labels. Refreshes SHALL NOT discard an in-progress edit. Successful commits SHALL record the entered target and observed result.

#### Scenario: Invalid padding
- **WHEN** a designer submits a value invalid for padding-top
- **THEN** the editor reports the error and preserves the existing preview and recorded difference

#### Scenario: Cancel an edit
- **WHEN** the designer cancels an edited value before committing
- **THEN** the previous target remains and no document update is recorded

### Requirement: Local override scope
Committed values SHALL override only the selected element's supported declarations in the preview. Editing a variable-backed property SHALL preserve its original source evidence without changing the custom property's definition or other matching elements. Valid variable references SHALL be accepted as targets, and the panel SHALL distinguish the override from the original source.

#### Scenario: Change a token-backed spacing value
- **WHEN** padding-top uses var(--space-4), computes to 16px, and is changed to 24px
- **THEN** only that element receives the override
- **AND** the original token and computed value remain in the review record

#### Scenario: Choose another token
- **WHEN** a valid target is var(--space-6)
- **THEN** that expression and its resulting computed value are retained
- **AND** the definitions of space-4 and space-6 are unchanged

### Requirement: Per-parameter override reset
Each active override SHALL have a visible indicator and keyboard-accessible reset control in the parameter panel. Reset SHALL remove that parameter's current-context difference and restore the underlying website declaration without deleting other overrides or comments. An overridden parameter SHALL remain accessible for reset even when its edited value changes normal section applicability.

#### Scenario: Reset one parameter
- **WHEN** width and color are overridden and the designer resets width
- **THEN** the website's width declaration is restored and the width difference is removed
- **AND** color and the element comment remain unchanged

#### Scenario: Reset display none
- **WHEN** changing display to none removes the element's rendered box
- **THEN** the selected element's display override remains available for reset
- **AND** no fabricated geometry is displayed

### Requirement: Frame-owned editing
Editing and reset SHALL work for a single selected element in an already connected frame through the shared panel. Commands SHALL target the active frame and current document's element identity. If that target has disconnected or navigated, the command SHALL fail visibly without editing another element or deleting its saved record. Existing host-access restrictions SHALL remain in force.

#### Scenario: Frame changes before commit
- **WHEN** an iframe navigates after its parameter editor opens but before commit
- **THEN** the stale edit is rejected and the panel requests a current selection
- **AND** the same numeric node identity in another document is not edited

## MODIFIED Requirements

### Requirement: Variable copying and feedback
Clicking a variable name SHALL start the same editing workflow as clicking a literal CSS value. It SHALL NOT copy the variable or write to the clipboard. Independent computed-value and chain disclosures SHALL remain usable without starting an edit.

#### Scenario: Copy a prefixed variable
- **WHEN** the designer clicks a variable-backed value
- **THEN** the editor or compound-property menu opens without a clipboard write

## ADDED Requirements

### Requirement: Value editing overlay
Value clicks SHALL open a floating editor. Compound properties SHALL first offer an Edit menu containing the whole property and its supported subproperties. Overrides SHALL display a 16px accent-colored pencil to the left of the value, without an Edited description or quick-delete button. The input SHALL have explicit save and delete icon actions.

#### Scenario: Edit a compound font
- **WHEN** the designer clicks a grouped font value
- **THEN** an Edit menu offers Variable and individual typography properties
- **AND** Variable accepts an available font custom property, preserving existing individual overrides

### Requirement: Custom property suggestions
Partial input matching available custom property names in the selected document SHALL display matching suggestions below the input. Color-valued suggestions SHALL include swatches. Choosing a suggestion SHALL fill a var() reference without committing it.

#### Scenario: Choose a variable suggestion
- **WHEN** the designer chooses --space from suggestions
- **THEN** the input contains var(--space) and the document remains unchanged until explicit save

### Requirement: Persistent editable element attributes
For one selected element, the panel SHALL show Element attributes as its last content section, without a disclosure button. Existing attribute values SHALL be editable through the value editor, recorded as attribute corrections, included in comparison, and restored on reset or cleanup. Attribute edits SHALL NOT be duplicated in CSS override rows.

#### Scenario: Edit an element id
- **WHEN** the designer edits the selected element's id
- **THEN** the live attribute changes and the review records an attribute correction
- **AND** resetting from the editor restores the original id

### Requirement: Independently editable border components
Border rows SHALL show width, style, and color vertically with identical primary typography and no gap. Each component SHALL open its own editor. Explicit border edits SHALL remain available in the table even when a side is not painted.

#### Scenario: Edit a border color
- **WHEN** the designer clicks the color line of a border row
- **THEN** only that color parameter is edited

### Requirement: Automatic visible style for new border widths
A nonzero border-width edit SHALL supply solid for affected sides whose style is none or hidden, preserving existing visible styles. Automatic styles SHALL be recorded with their owning width change and removed when that width is reset, unless explicitly replaced by the designer.

#### Scenario: Create and reset a left border
- **WHEN** a side with no visible border receives a width of 1px
- **THEN** its style becomes solid and the width and automatic style are recorded
- **AND** resetting the width removes its unchanged automatic style

### Requirement: Standard rows for otherwise unlisted box edits
Explicit CSS edits that have no regular table representation SHALL appear in standard parameter/value rows directly below the box model. These rows SHALL share the inspector column layout, formatted values, edit interaction, and pencil indicator. Attribute corrections SHALL be excluded.

#### Scenario: Edit padding in the diagram
- **WHEN** padding-top is changed in the box model and has no ordinary table row
- **THEN** a padding-top parameter/value row appears below the diagram without duplicating attribute edits

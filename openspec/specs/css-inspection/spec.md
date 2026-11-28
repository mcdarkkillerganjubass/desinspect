# CSS Inspection Specification

## Purpose

Expose the selected element's read-only geometry and useful CSS properties while preserving authored variable expressions when their source is accessible.

The current property inventory is:

| Section | Properties |
| --- | --- |
| Dimensions (no heading) | Two-column width/height table: property name, then screen bounds with CSS size as a secondary description underneath. |
| Layout | Nonzero gap first when present, then display, position, box-sizing, flex-direction, justify-content and align-items. |
| Typography | font-family, font-size, font-weight, line-height, letter-spacing, color. |
| Appearance | background-color, border-radius. |

## Requirements

### Requirement: Property sections
For one connected selected element in Inspect mode, the panel SHALL display applicable property sections from the inventory above, following the section applicability rules. Values SHALL be read-only and update while inspection is active. Source lookup SHALL be refreshed periodically rather than promising synchronous tracking of every stylesheet mutation.

#### Scenario: Read a button's properties
- **WHEN** a single button is selected
- **THEN** its screen bounds, CSS dimensions, layout, typography and appearance are shown
- **AND** inspecting these values does not modify its styles

### Requirement: Combined dimensions table
The panel SHALL show width and height in one two-column table without a visible section heading. Column one SHALL contain the property name. Column two SHALL show the screen dimension, with its CSS value and css badge below as a smaller muted description. Badge hover/focus SHALL show CSS size above when space permits. CSS variables SHALL retain copy/disclosure controls in these cells.

#### Scenario: Scaled dimensions remain distinguishable
- **WHEN** a 180px by 100px border-box element has transform: scale(2)
- **THEN** width shows 360px above a secondary 180px CSS description
- **AND** height shows 200px above a secondary 100px CSS description
- **AND** no separate Size on screen or CSS size heading is displayed

### Requirement: Variable expression and computed value
For available var-based declarations, the panel SHALL show compact names, hiding `var(...)` and `--` while preserving prefixes such as `tui-`. The main label SHALL retain the original authored variable or expression. Resolvable aliases SHALL expose their expansion chain through a separate disclosure control, preserving calculations and the context where each custom property was defined. Cyclic or unavailable definitions SHALL retain their original reference. Computed-value descriptions SHALL be collapsed by default and revealed with an eye button. Full original expressions SHALL remain available in tooltips; compact labels SHALL preserve the meaning of fallbacks and calculations.

#### Scenario: Spacing variable
- **WHEN** a selected property's available source is `var(--space-4)` and its computed value is `24px`
- **THEN** the panel displays `space-4` with a collapsed computed description
- **AND** revealing it shows `24px` in px mode or `1.5rem` in rem mode with a 16px root

#### Scenario: Variable in an expression
- **WHEN** an available declaration contains `calc(var(--space) * 2)`
- **THEN** the compact label preserves `calc(space * 2)` and the original expression is available in its tooltip

### Requirement: Variable color previews
Every color property, including literals and variables, SHALL have a 16 by 16 CSS-pixel square preview with 4px rounded corners in a reserved column. All value text SHALL share the same horizontal start. Previews and parameter/value text SHALL align to the first line, including wrapped names. Revealed descriptions SHALL align with the name. Colors SHALL use computed values with a transparency checkerboard beneath them.

#### Scenario: Color variable description alignment
- **WHEN** a text or background color is supplied by a variable
- **THEN** a 16px rounded square occupies the preview column, while the name and revealed description align with other value text

#### Scenario: Literal color
- **WHEN** a color property is a literal rgb value rather than a variable
- **THEN** its preview appears in the same reserved column

### Requirement: Content section order
The scrollable property body SHALL show the compact spacing diagram, dimensions, untitled Appearance rows, Layout and Typography in that order. Layout SHALL show gap first only when row-gap or column-gap is nonzero or a relevant unresolved calculation; zero/normal gap SHALL be omitted. Identity and its attribute/hierarchy disclosures SHALL remain in the fixed selection header.

#### Scenario: Flex container with spacing
- **WHEN** a flex container has a 24px gap
- **THEN** gap is the first Layout row after the untitled Appearance rows

#### Scenario: Wrapped variable name
- **WHEN** a variable name wraps to several lines while another row contains a short plain value
- **THEN** both texts start in the shared value column
- **AND** the preview and parameter label stay aligned with the first line instead of vertically centering over the wrapped block

### Requirement: Variable copying and feedback
Clicking a compact variable-name button SHALL copy its full CSS name including `--`. A primary var with fallbacks SHALL copy the primary name; calculations SHALL copy the original authored CSS expression, including var() syntax. Success SHALL show Copied above the clicked name, clamped within the viewport and placed below when there is no space above. Failure SHALL show an error, not success.

#### Scenario: Copy a prefixed variable
- **WHEN** the user clicks the displayed tui-font-text-m name
- **THEN** --tui-font-text-m is written to the clipboard and Copied feedback appears

### Requirement: Per-variable disclosure
Each variable SHALL have an eye-icon button with accessible expanded state and controls association. An open eye SHALL offer to show collapsed descriptions; a crossed eye SHALL offer to hide expanded descriptions. Disclosure SHALL persist across live value/unit updates and reset for a new selection. Clipboard API failure SHALL attempt a legacy copy fallback without requiring clipboard-read permission.

#### Scenario: Keep a description open while changing units
- **WHEN** a user reveals a variable's description and changes units or its frame sends an updated snapshot
- **THEN** the description remains open with updated computed values

### Requirement: Text-only Layout values and property help
Layout values SHALL be displayed without decorative value icons. Layout property names SHALL remain keyboard-focusable and have short native help tooltips covering display, position, box-sizing, flex-direction, justify-content, align-items and gap. Functional buttons such as variable-disclosure eyes SHALL remain available.

#### Scenario: Flex direction and help
- **WHEN** flex-direction changes from row to column-reverse
- **THEN** its textual value changes without adding a decorative icon
- **AND** hovering flex-direction explains the main axis and child order

### Requirement: Missing and fully transparent values
Empty display values and fully transparent color values SHALL be displayed as an em dash. This SHALL NOT imply that the CSS declaration does not exist or that a background image is absent. Variable names SHALL remain visible even when their color description is an em dash. Numeric zero, partially transparent colors and meaningful non-color keywords SHALL remain visible.

#### Scenario: Fully transparent background variable
- **WHEN** a background-color variable computes to rgba(0, 0, 0, 0)
- **THEN** the variable name remains visible with a transparency preview and an em dash description

### Requirement: Shared font shorthand grouping
Typography components resolved from the same variable-backed font shorthand source SHALL be grouped into one font row when at least two components share that source. Its token name SHALL appear once, with separate computed family, size, weight and line-height descriptions for the grouped components. Independent winning longhand declarations SHALL remain separate.

#### Scenario: Shared typography token
- **WHEN** family, size, weight and line-height originate from font: var(--font-ui)
- **THEN** one font-ui label appears above four computed component descriptions

### Requirement: Font override marker
An independently resolved family, size, weight or line-height longhand that overrides a displayed shared font source SHALL have a two-arrow replacement icon beside its label. Its accessible label SHALL identify the overridden property. The marker SHALL NOT show an override-source tooltip. Unresolved/default properties SHALL NOT be marked merely because they are ungrouped.

#### Scenario: Weight overrides the shared font
- **WHEN** a shared font-ui shorthand supplies typography and a separate font-weight declaration supplies weight-strong
- **THEN** font-weight remains a separate row with weight-strong and its computed weight
- **AND** a replacement icon marks the override without a source tooltip

### Requirement: Shorthand provenance
For supported var-based shorthands whose requested longhand is unavailable in CSSOM, the reader SHALL attempt the relevant padding, margin, directional/general border, background or font shorthand. The display SHALL identify the shorthand source rather than imply that its expression belongs exclusively to the requested side.

#### Scenario: Padding defined once
- **WHEN** `padding: var(--space)` provides a displayed padding side
- **THEN** the expression and that side's computed value appear with a `from padding` source note

### Requirement: Best-effort source precedence
For supported declarations, source selection SHALL consider matching selectors, inline styles, importance, cascade-layer ordering, specificity and source order. Available media/supports conditions SHALL be evaluated, disabled stylesheets SHALL be skipped, and supported inherited typography values SHALL be traced to parents when appropriate.

#### Scenario: Important stylesheet overrides normal inline style
- **WHEN** a matching important color declaration competes with a normal inline color
- **THEN** source lookup selects the important declaration

#### Scenario: Ordered layers
- **WHEN** matching normal declarations occur in two declared cascade layers with no higher-precedence override
- **THEN** the later layer's declaration is selected
- **AND** important declarations reverse that layer preference

### Requirement: Incomplete-source fallback
If stylesheets are inaccessible or unsupported rule groups are detected, the reader SHALL retain available computed values and the panel SHALL warn that source information may be incomplete. It SHALL NOT claim full browser-cascade equivalence for nesting, scoped/container rules, logical mappings or other unsupported advanced cases.

#### Scenario: Cross-origin stylesheet is unreadable
- **WHEN** reading a stylesheet's rules throws a security error
- **THEN** inspection continues with available sources and computed values
- **AND** the panel displays its incomplete-source warning

### Requirement: Authored and current values remain distinct
The extension SHALL distinguish screen bounds, CSS dimensions and source expressions rather than treating them as interchangeable. Authored expressions MAY differ from current computed values during animations and transitions; source expressions SHALL NOT be described as a complete animation trace.

#### Scenario: Transformed element
- **WHEN** a CSS transform changes the selected element's bounding rectangle
- **THEN** the primary dimension reflects that rectangle while the CSS value is shown below it as a secondary description with a css badge

### Requirement: Typography section applicability
In the default applicable-properties view, the Typography section SHALL appear when the selected element has at least one direct, non-whitespace DOM text node with a nonzero rendered text rectangle OR an accessible declaration on the element itself explicitly sets font, font-family, font-size, font-weight, line-height, letter-spacing or color. Explicit declarations SHALL include matching stylesheet rules and inline styles; inherited declarations alone SHALL NOT qualify. Text belonging to descendant elements SHALL NOT make a container eligible. Hidden visibility or zero opacity on the element or an ancestor SHALL disqualify its text from the visible-text criterion; an explicit typography declaration SHALL still qualify. Text outside the viewport SHALL remain eligible; viewport intersection and occlusion SHALL NOT determine applicability. Image alt attributes, placeholders and pseudo-element content SHALL NOT count as direct DOM text. The same rule SHALL apply in connected frames and SHALL update when the selected element's content changes.

#### Scenario: Card containing a text child
- **WHEN** a selected card contains a child heading but has no own text or explicit supported typography declaration
- **THEN** its Typography section is omitted
- **AND** selecting the heading shows its Typography section

#### Scenario: Empty avatar
- **WHEN** an avatar contains only an image or no content and has no explicit supported typography declaration
- **THEN** its Typography section is omitted
- **AND** an avatar with directly rendered text initials shows Typography

#### Scenario: Hidden or whitespace-only text
- **WHEN** the selected element has no explicit supported typography declaration and its direct text is only whitespace, has no rendered area, or is hidden by visibility or zero opacity
- **THEN** its Typography section is omitted

### Requirement: Section and layout property applicability
Section visibility SHALL depend on whether the section describes the selected element, not on whether its computed values are nonzero or differ from defaults. Applicability SHALL be recalculated during live inspection and SHALL apply identically in connected frames.

- Dimensions, the box-model diagram, Appearance and box-sizing SHALL be shown only when the selected element generates its own rendered CSS box, determined by at least one client rectangle and display other than contents. A zero-width or zero-height box SHALL remain eligible. display:none elements SHALL NOT be eligible.
- Applicable Appearance properties SHALL remain visible for transparent backgrounds and zero border radii. Applicable box-model properties SHALL retain zero margin, padding and border values.
- Layout SHALL always expose display and position, including for display:contents and display:none elements.
- flex-direction SHALL appear only for flex and inline-flex containers that generate a box.
- justify-content and align-items SHALL appear for flex, inline-flex, grid and inline-grid containers that generate a box. They SHALL be omitted for other layout types in the currently supported property inventory.
- gap SHALL appear for flex, inline-flex, grid and inline-grid containers that generate a box, including values of 0 and normal. A computed gap on another layout type SHALL NOT enable this row. Multi-column gap inspection is outside the current inventory.
- Typography SHALL follow the own-rendered-text requirement above. Descendant content SHALL NOT make an otherwise inapplicable section eligible.

#### Scenario: Ordinary card
- **WHEN** an ordinary block card containing child text elements is selected
- **THEN** dimensions, box model, Appearance and basic Layout properties appear
- **AND** Typography, gap, flex-direction, justify-content and align-items are omitted

#### Scenario: Flex and grid containers
- **WHEN** a flex container with zero gap is selected
- **THEN** gap, flex-direction, justify-content and align-items appear
- **WHEN** its display changes to grid
- **THEN** gap, justify-content and align-items remain and flex-direction disappears

#### Scenario: Wrapper without a box
- **WHEN** a display:contents wrapper is selected
- **THEN** dimensions, box model, Appearance and box-sizing are omitted
- **AND** Layout still shows display and position
- **AND** descendant boxes do not enable the wrapper's box-specific sections

### Requirement: Optional all-properties view
The inspector SHALL default to the applicable-properties view. For a selected element, a keyboard-accessible Show all properties toggle SHALL reveal the complete supported Appearance, Layout and Typography property inventory, including normally filtered rows. Its pressed state SHALL be exposed accessibly and its active label SHALL offer Show applicable properties. The all-properties view SHALL explain that some computed properties may not affect the selected element. Dimensions and the box-model diagram SHALL still require actual element geometry; the toggle SHALL NOT fabricate a box for display:none or display:contents.

The view preference SHALL persist across selections within the current inspector session, SHALL apply to selections in connected frames, and SHALL reset when the inspector is reopened. Switching the view SHALL NOT modify website styles or selection. Returning to applicable properties SHALL restore current applicability rules.

#### Scenario: Explicit typography on a card
- **WHEN** a card has no own text but an accessible matching declaration sets its font or color
- **THEN** Typography appears in the applicable-properties view
- **AND** an otherwise equivalent wrapper with only inherited typography remains without this section

#### Scenario: Inspect normally hidden properties
- **WHEN** Show all properties is enabled for an ordinary block element
- **THEN** Typography and flex/grid rows are available with computed values
- **AND** the panel explains that some values may not affect the element
- **WHEN** Show applicable properties is selected
- **THEN** the normal applicability rules are restored

### Requirement: Optional variable-chain disclosure
A value with resolvable alias steps SHALL have a separate chain-icon button next to the computed-value eye, using the same size and visual style. The chain SHALL be collapsed by default. Activating this button SHALL reveal the original reference followed by intermediate expressions through terminal variable references, joined by right arrows with a nonbreaking space (U+00A0) after each arrow. The chain SHALL NOT replace the main label or its original-variable copy behavior. Literal computed values SHALL remain under the eye rather than being appended to the chain.

Chain and computed-value disclosures SHALL be independent. Each control SHALL expose its own accessible name, expanded state and associated content. Chain disclosure SHALL persist across live refreshes and unit updates, reset on a new selection, and work for connected-frame snapshots and grouped typography. Values with no resolvable alias steps, including unavailable or cyclic chains, SHALL NOT show a chain button.

#### Scenario: Inspect an alias calculation
- **WHEN** padding uses var(--control), control uses calc(var(--alias) * var(--scale)), and alias uses var(--base)
- **THEN** the main label remains control and copies --control
- **AND** the chain control reveals control → calc(alias * scale) → calc(base * scale)
- **AND** the independent eye reveals the browser-computed padding value

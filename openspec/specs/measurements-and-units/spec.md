# Measurements and Units Specification

## Purpose

Measure geometric edge distances with a single modifier and provide consistent unit formatting for the panel, box model and measurement labels.

## Requirements

### Requirement: Alt-hover measurement
In Inspect mode, holding Alt while hovering a different connected element SHALL draw nonzero horizontal and vertical measurement lines from one selected element. Lines SHALL have end ticks and numeric distance labels. Measurements SHALL require exactly one selected element and both elements SHALL belong to the same injected document.

#### Scenario: Measure a sibling gap
- **WHEN** one button is selected and the user holds Alt over a sibling in the same document
- **THEN** the inspector shows nonzero axis distances without changing the selection

#### Scenario: Several elements selected
- **WHEN** several children are selected and the user holds Alt over another element
- **THEN** measurement lines are not shown until one element is selected

### Requirement: Deterministic edge geometry
For each axis, separate rectangles SHALL be measured between facing edges. For overlapping projections, the closer corresponding starting or ending edges SHALL be measured; a tie SHALL choose the starting edges. Results SHALL be nonnegative, preserve fractional coordinates before formatting, and allow zero distances.

#### Scenario: Horizontal separation
- **WHEN** one rectangle ends at x=100 and another starts at x=124
- **THEN** the horizontal distance is 24px in px mode regardless of selection order

#### Scenario: Nested rectangles
- **WHEN** a 100px-wide rectangle starting at x=0 contains another extending from x=16 to x=84
- **THEN** the horizontal offset is 16px

#### Scenario: Coincident rectangles
- **WHEN** two elements have identical rectangles
- **THEN** each axis computes zero and neither axis is drawn or labeled

### Requirement: Midpoint anchors and dashed connectors
Each axis SHALL start at the midpoint of the selected rectangle's measured edge. A solid segment SHALL follow that axis to the other rectangle's measured edge coordinate. When the target edge midpoint is offset in the perpendicular direction, a dashed connector SHALL join the solid endpoint to that midpoint. Reversing selection SHALL reverse anchor ownership without changing the measured distance.

#### Scenario: Horizontally and vertically offset objects
- **WHEN** the selected right edge is at x=180 with midpoint y=190 and the target left edge is at x=300 with midpoint y=350
- **THEN** the horizontal solid segment runs from (180,190) to (300,190)
- **AND** a dashed connector runs from (300,190) to (300,350), with a distance label of 120px in px mode

### Requirement: Persistent measurement badges
Measurement segments, ticks and dashed connectors SHALL use bright orange (#ff6a00), a 1px stroke and no casings. Each nonzero label SHALL always use regular 11px native-monospace black text on an orange backing, irrespective of the page background. Badges SHALL have 3px horizontal padding, 2px vertical padding and 3px corner radii. Contrast sampling SHALL NOT condition badge visibility.

#### Scenario: Dark or light background
- **WHEN** the page background changes between dark, light, gradient or the same orange hue
- **THEN** distance labels keep their orange badges and black text

### Requirement: Non-overlapping label placement
Measurement badges SHALL be clamped inside their document viewport and repositioned to avoid one another with a 6px gap where available space permits. Main-page badges SHALL also avoid the floating inspector panel. Placement SHALL prefer the nearest valid position to each label's original measurement anchor; compact viewports MAY require shifting both labels. Placement SHALL NOT change numeric distances or measurement-line geometry.

#### Scenario: Nearby horizontal and vertical labels
- **WHEN** the default padded label rectangles overlap
- **THEN** their positions change so both remain separately readable with a gap

#### Scenario: Label reaches the viewport edge
- **WHEN** an original label position extends outside the viewport
- **THEN** the badge is clamped inward instead of being left clipped where it can fit

### Requirement: Suppress zero distances
An axis with zero distance SHALL have no solid segment, connector, ticks or label. Values that round to zero at the current display precision SHALL also be hidden. The other nonzero axis SHALL remain visible.

#### Scenario: Objects aligned at the top
- **WHEN** two objects share their top coordinate and have a nonzero horizontal gap
- **THEN** only the horizontal measurement is shown, without a vertical zero label

### Requirement: Rectangular measurement semantics
Distances SHALL use `getBoundingClientRect()` coordinates in the selected document. They SHALL NOT represent glyph outlines, rounded painted contours or a guarantee about the CSS property causing a gap. Cross-document measurements SHALL NOT be attempted.

#### Scenario: Text within a container
- **WHEN** a text-bearing element is measured
- **THEN** its element rectangle is used rather than the visible edges of individual letters

### Requirement: Unit selector
The shared panel SHALL offer Auto, px, rem and em as segments. Changes SHALL apply to screen dimensions, displayed property lengths, box-model spacing values and measurement labels, while corner-radius annotations retain their CSS units. Unit settings SHALL be session-local and coordinated across connected frames.

#### Scenario: Change units during inspection
- **WHEN** the user changes the panel from px to rem
- **THEN** available px lengths in the current panel and subsequent measurement labels use the rem conversion
- **AND** compact variable names stay unchanged, with full source expressions retained in tooltips

### Requirement: Auto and px modes
Auto SHALL display available authored non-variable property values and units, using computed values when a source is unavailable. Auto bounding sizes and measurement distances SHALL use px. px mode SHALL display browser-computed property values without forcing unresolved non-px units or keywords into px; geometric dimensions/distances SHALL be formatted in px.

#### Scenario: Authored rem margin
- **WHEN** an accessible declaration gives a margin side as 2rem
- **THEN** Auto preserves 2rem for that property
- **AND** a geometric distance remains expressed in px

### Requirement: Font-relative conversion
rem SHALL divide px values by the selected document's root font size. em SHALL divide px values by the selected element's font size, except `font-size` itself SHALL use its parent's font size. Invalid or nonpositive bases SHALL leave values unchanged. Conversion output SHALL be rounded to at most three decimal places; geometric inputs SHALL be rounded to at most two decimal places before display conversion.

#### Scenario: rem conversion
- **WHEN** a length is 24px and the inspected document root font size is 16px
- **THEN** rem mode displays 1.5rem

#### Scenario: em font-size conversion
- **WHEN** an element font size is 16px and its parent's font size is 32px
- **THEN** em mode displays its font-size property as 0.5em

### Requirement: Preserve non-length content
Unit formatting SHALL convert px-length tokens without rewriting quoted strings, URLs, colors without px tokens or non-length keywords. Original source expressions SHALL remain unchanged in provenance/tooltips while their displayed variable names omit CSS wrappers. Percent and viewport unit conversion SHALL NOT be offered in the current selector.

#### Scenario: Quoted font name contains px
- **WHEN** a formatted value includes a quoted font name containing `16px`
- **THEN** that quoted text is preserved while any separate eligible px length can be converted

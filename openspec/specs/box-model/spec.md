# Box Model Specification

## Purpose

Present margins, border strokes, padding and content dimensions as one readable spatial block rather than long separate property lists.

## Requirements

### Requirement: Nested spatial diagram
The single-element panel SHALL display nested Margin, Stroke and Padding regions around a Content center. Stroke SHALL refer to CSS border widths, not CSS outline. Each region SHALL show top, right, bottom and left values at the corresponding positions, for twelve side values in total. Distinct region colors and labels SHALL distinguish the layers. Region sizes SHALL be schematic rather than proportional to actual spacing.

#### Scenario: Inspect all spacing sides
- **WHEN** one element with asymmetric margin, border and padding is selected
- **THEN** all twelve side values appear in one diagram at their respective sides
- **AND** the panel does not duplicate them as the previous separate spacing and border property tables

### Requirement: Stacked side units
Numeric values on the left and right sides of each diagram layer SHALL display their unit below the number. Both lines SHALL be centered horizontally and vertically within the side cell. Top and bottom values SHALL remain inline. Non-numeric keywords SHALL remain intact without a fabricated unit.

#### Scenario: Font-relative padding on a side
- **WHEN** left padding is displayed as 1.5rem
- **THEN** the side cell shows 1.5 above rem, with both centered

### Requirement: Corner radius annotations
Each nonzero corner SHALL have a quarter-arc symbol and label. Labels SHALL preserve available authored corner values/units, or use computed CSS values when the source is unavailable/variable-backed. Changing unit mode SHALL NOT convert radius labels. Geometry SHALL still resolve percentages and normalize overlaps against the untransformed border box. Zero corners SHALL have no annotation.

#### Scenario: Three rounded corners
- **WHEN** resolved radii are 64px top-left, 24px top-right, zero bottom-right and 12px bottom-left
- **THEN** three quarter-arc annotations display those nonzero values at their respective corners

#### Scenario: Radius units stay unchanged
- **WHEN** a corner is authored as 8px and the panel unit is rem
- **THEN** its label stays 8px rather than becoming 0.5rem

### Requirement: Compact readable diagram
The diagram SHALL use compact layer spacing without reducing any text below 11px. Side units SHALL stay below numbers, while labels, annotations and source summaries remain readable. Horizontal panel resizing SHALL recalculate nested radii using the new diagram insets.

#### Scenario: Compact default geometry
- **WHEN** the diagram has ordinary values in a 420px panel
- **THEN** its nested boxes fit in a compact region with 22px top/bottom layer bands and at least 34px content height

### Requirement: Nested diagram radii
The outer Margin diagram SHALL use the selected element's resolved per-corner radii. For each inner layer and the Content box, horizontal/vertical radii SHALL be the outer radius minus that corner's actual horizontal/vertical inset within the rendered diagram, each clamped to at least 2px. Outer zero corners SHALL remain zero. Radii SHALL be recalculated after rendering and viewport resize; browser radius fitting still applies when the schematic box is too small.

#### Scenario: Derive an inner corner
- **WHEN** an outer circular corner is 64px and an inner corner is inset 35px horizontally and 29px vertically
- **THEN** its calculated radius is 29px horizontally and 35px vertically
- **AND** any component that would fall below 2px is clamped to 2px

### Requirement: Content dimensions
The Content center SHALL show computed content width and height in the selected units. Border-box calculations SHALL subtract padding and borders, clamp finite results to zero or greater, and show auto if unavailable. Content-box dimensions SHALL use computed width and height directly. The Content label SHALL explain in a focusable hover hint that these dimensions exclude padding, borders and margins and describe the available content area, not visible text bounds.

#### Scenario: Border-box element
- **WHEN** an element has width 180px, height 100px, border-box sizing, 24px padding on every side and 2px borders on every side
- **THEN** the center displays content dimensions of 128px by 48px in px mode

### Requirement: Side tooltips and variable indicators
Every side value SHALL be keyboard-focusable and have an accessible label and tooltip identifying its region, side, displayed value and available variable/shorthand source. Variable-backed side values SHALL have a dotted underline; compact variable names with computed descriptions SHALL appear below the diagram, with full original expressions retained in tooltips.

#### Scenario: Variable-backed left padding
- **WHEN** left padding comes from an available variable declaration
- **THEN** its diagram value has a dotted underline and its accessible description includes the variable and computed value

### Requirement: Compact source summaries
The diagram SHALL summarize variable-backed side values below the nested regions. Identical source/value/note combinations within a layer SHALL share one summary row. Rows affecting fewer than all four sides SHALL identify the applicable side initials. Visible borders SHALL also have color/style summaries grouped by matching appearance.

#### Scenario: Uniform variable padding
- **WHEN** all four padding sides use the same variable, computed value and shorthand provenance
- **THEN** one Padding source row contains the expression and computed value rather than four repeated rows

#### Scenario: Asymmetric stroke appearance
- **WHEN** visible borders have different colors or styles on different sides
- **THEN** the source summaries distinguish their applicable sides and appearance values

### Requirement: Shared formatting and document context
The box model SHALL follow the panel's current unit setting and source-expression rules. When the selected element belongs to an iframe, all values and content dimensions SHALL be calculated in that element's document and displayed in the main-page panel.

#### Scenario: Frame-local rem sizing
- **WHEN** a selected iframe element has 30px padding and its document root uses 20px font size
- **AND** the panel unit is rem
- **THEN** the padding value is displayed as 1.5rem, independent of the main page's root font size

### Requirement: Selected-element spacing fills
In Inspect mode, a single selected element SHALL show pale spacing regions on the live page: positive margins outside its border rectangle and padding inside the border but outside content. Zero-width regions and negative margins SHALL NOT create fill regions. The selected content area SHALL NOT receive the previous uniform selection tint. Use mode and multi-selection SHALL hide spacing fills while retaining normal selection behavior.

#### Scenario: Select a padded element with margins
- **WHEN** one element has positive margins and padding
- **THEN** the outer margin bands and inner padding bands are shaded separately, without painting the content area or border as padding

### Requirement: Shared spacing palette
Page overlays SHALL use 20 percent-opacity margin sand (#edbd80), padding green (#a2d5b4) and gap lavender (#b9aaff). Margin and padding diagram labels/source labels SHALL use the corresponding opaque color, and the Layout gap label SHALL use the gap color. Overlapping gap strips SHALL be composited once to avoid a darker intersection.

#### Scenario: Relate page spacing to panel values
- **WHEN** margin, padding and gap regions are visible
- **THEN** each region's hue matches its corresponding panel parameter

### Requirement: Flex and grid gap visualization
Declared row/column gaps in supported flex/grid containers SHALL be shaded within the content area, excluding child border rectangles. Child margins and distributed free space SHALL NOT be wholly labeled as gap. Gap-sized bands SHALL be centered in larger distributed intervals. Flex order, direction, wrapping and resolved grid tracks SHALL be considered where supported; spanning grid items SHALL mask covered gutter regions.

#### Scenario: Free space exceeds the declared gap
- **WHEN** neighboring item outer bounds are 60px apart but their declared column gap is 20px
- **THEN** a centered 20px band is shaded rather than the entire 60px interval

### Requirement: Conservative spacing geometry
Spacing visualization SHALL support axis-aligned positive scales and document-local viewport coordinates, including iframe documents. It SHALL skip rotated/perspective or multi-fragment selected elements. Gap visualization SHALL skip vertical writing modes, transformed children, anonymous text items, display-contents children and containers exceeding 200 children. Unresolved track/gap expressions SHALL be omitted rather than guessed.

#### Scenario: Unsupported rotation
- **WHEN** a selected element or ancestor is rotated
- **THEN** its normal rectangular selection remains available but approximate spacing fills are not drawn

## Known approximations

Margin bands use computed CSS margins; they do not reconstruct margin collapse or resolve every auto-margin case. Gap geometry is best-effort for ordinary flex wrapping and resolved grid tracks, with at most 100 tracks per axis. Subgrids, collapsed zero-width auto-fit tracks, unresolved calc gaps and advanced layout combinations are not fully modeled. Inline sizes that require offsetWidth/offsetHeight can have browser rounding differences.

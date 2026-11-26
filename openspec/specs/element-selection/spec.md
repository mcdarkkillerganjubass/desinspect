# Element Selection Specification

## Purpose

Let designers select live DOM elements and navigate their hierarchy with predictable single- and multiple-selection behavior.

## Requirements

### Requirement: Hover and single selection
In Inspect mode, pointer movement SHALL highlight the element targeted by the event. A non-Alt click SHALL replace the active selection with that element. Its panel identity SHALL include the tag, optional ID and at most three classes. Holding Alt and hovering SHALL NOT change the selection.

#### Scenario: Select a nested button
- **WHEN** the user clicks a button inside a card in Inspect mode
- **THEN** the button is the only selected element and its properties appear

### Requirement: Compact selected identity
The selected element's tag/ID/class label SHALL occupy one line and truncate with an ellipsis. Its full label SHALL remain available in a tooltip. Two adjacent icon buttons SHALL independently disclose DOM attributes or element hierarchy, with accessible expanded states. Opening one SHALL close the other.

#### Scenario: Long class name
- **WHEN** a selected element has a class name longer than the available row
- **THEN** the identity stays on one line with an ellipsis and both action buttons remain visible

### Requirement: DOM attribute description
The info action SHALL display the selected tag and all current DOM attributes, including empty boolean attributes and data attributes, in a scrollable code description. Attribute values SHALL be rendered as text rather than parsed HTML. This description SHALL represent DOM attributes, not an invented list of CSS declarations or live JavaScript properties.

#### Scenario: Inspect an input-like attribute
- **WHEN** the selected node has data-size="s" and an empty custom attribute
- **THEN** both attributes appear in its info description without executing their content

### Requirement: Hierarchy list navigation
The hierarchy action SHALL list the available parent, current element and all immediate child elements with their relationship labels. The current item SHALL be identified accessibly. Clicking a connected entry SHALL select that single element and close the list. Navigation SHALL remain document-local and work for a remote iframe selection through extension message routing.

#### Scenario: Choose a frame element's parent
- **WHEN** the selected element belongs to an iframe and the user clicks Parent in the shared hierarchy list
- **THEN** its parent in that frame becomes selected and its properties replace the previous snapshot

### Requirement: Immediate-child selection
Enter SHALL replace selected parents with the deduplicated union of their immediate element children that have layout rectangles, excluding the inspector overlay. If that union is empty, the selection SHALL remain unchanged. It SHALL NOT select all descendants recursively.

#### Scenario: Reveal a card's children
- **WHEN** a card with two immediate children is selected and the user presses Enter
- **THEN** both children become selected

#### Scenario: Selected leaf has no children
- **WHEN** the selected element has no eligible immediate children and the user presses Enter
- **THEN** that element remains selected

### Requirement: Parent selection
Shift+Enter SHALL replace selected elements with their available parent elements and remove duplicate parents. It SHALL NOT traverse from an iframe document to its embedding element in another document.

#### Scenario: Children share a parent
- **WHEN** two selected siblings share the same parent and the user presses Shift+Enter
- **THEN** their parent becomes the single selection

### Requirement: Multiple-selection presentation
The panel SHALL show the number of selected elements and a prompt to select one whenever the selection contains multiple elements. It SHALL NOT show individual CSS properties, a box model or measurement lines for a multiple selection. Clicking one child SHALL restore single-element inspection.

#### Scenario: Inspect one of several children
- **WHEN** multiple children are selected and the user clicks one of them
- **THEN** only that child remains selected and its properties and box model are displayed

### Requirement: Clear and prune selections
Escape SHALL clear the active selection. Disconnected elements SHALL be pruned from the selection during rendering. An empty selection SHALL show a selection prompt instead of property values.

#### Scenario: Selected element is removed
- **WHEN** the website removes the selected element from the document
- **THEN** that element is removed from the inspector's selection
- **AND** if no selected elements remain, the panel prompts the user to select an element

### Requirement: DOM-level selection scope
Selection SHALL operate on DOM event targets and rectangular element bounds. Shadow DOM internals, glyph outlines and objects painted inside canvas SHALL NOT be individually traversed by the current implementation.

#### Scenario: Canvas is targeted
- **WHEN** the event target is a canvas element
- **THEN** the inspector can select the canvas's DOM rectangle but not an individual painted object inside it

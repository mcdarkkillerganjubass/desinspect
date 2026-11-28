# Review Recording Spec Delta

## Purpose

Turn a designer's local visual corrections and element comments into a durable, tab-bound review document that can be handed to a developer or coding LLM without manually transcribing each change.

## ADDED Requirements

### Requirement: Recording starts with a meaningful change
The extension SHALL start a review document on the first successfully committed parameter change or nonempty element comment in an eligible tab. Passive inspection, opening an editor, cancelled input, and no-op commits SHALL NOT create documents. Starting a new document SHALL prepare an empty recording without creating a retained empty file.

#### Scenario: First correction
- **WHEN** the designer commits padding from 16px to 24px without an active document
- **THEN** one document is created and the correction is saved
- **AND** opening the panel and selecting the element beforehand did not create a document

#### Scenario: Comment-only review
- **WHEN** the first committed content is a nonempty comment on an element
- **THEN** recording starts without requiring a CSS change

### Requirement: One recording belongs to one tab
A tab SHALL have at most one active review document. Its recording SHALL continue across URL changes, reloads, and inspector closure/reopening until explicitly stopped, replaced, or the tab closes. Different tabs SHALL NOT append to each other's documents. Continuing on a page SHALL require explicit inspector activation wherever existing site access is insufficient.

#### Scenario: Multi-page review
- **WHEN** the designer records a change on /profile, navigates the same tab to /settings, activates the inspector if needed, and records another
- **THEN** both pages appear in the same document

#### Scenario: Independent tabs
- **WHEN** another tab starts recording
- **THEN** it receives its own document and leaves the first tab's document unchanged

### Requirement: Explicit completion and replacement
Stop recording SHALL complete the current document. New document SHALL complete the current document and prepare an empty recording. Completed documents SHALL remain available for local export and explicit deletion and SHALL NOT accept new edits. After completion or deletion of an active note, the next meaningful edit SHALL automatically create a new note. Start new SHALL immediately create an empty active note and complete the previous note.

#### Scenario: Stop without losing work
- **WHEN** the designer stops recording
- **THEN** the document becomes completed and remains exportable
- **AND** the next meaningful edit automatically starts another document

#### Scenario: Replace the current document
- **WHEN** the designer chooses New document while recording
- **THEN** the old document is retained as completed
- **AND** the next meaningful change belongs to a new document

### Requirement: Tab closure completes recording
Closing a tab SHALL complete its active document without deleting saved content. Restoring a closed tab or restarting the browser SHALL NOT automatically resume recording into a previous document. Review documents SHALL survive extension worker suspension and browser restart in local storage.

#### Scenario: Restore a closed tab
- **WHEN** a recording tab closes and is later restored
- **THEN** its saved document remains completed and exportable
- **AND** new edits do not append to it

### Requirement: Original-to-final parameter differences
Within one element and context, each changed parameter SHALL retain its first pre-override value and latest committed target. Repeated edits SHALL replace the target without adding history entries. Returning to the captured original value SHALL remove that parameter difference without removing the element's comment. Unedited computed changes caused by other edits SHALL NOT become separate corrections.

#### Scenario: Repeated adjustment
- **WHEN** padding starts at 16px and is changed to 20px, 32px, and 24px
- **THEN** the document contains one padding difference from 16px to 24px

#### Scenario: Revert to the baseline
- **WHEN** padding is returned to its captured original value
- **THEN** its difference and parameter count disappear
- **AND** any comment remains

#### Scenario: Layout side effect
- **WHEN** changing a parent gap moves a child without editing that child
- **THEN** the document records the gap change without inventing a child-position correction

### Requirement: Context separates independent corrections
Each element record SHALL capture top-level URL, frame URL when applicable, viewport width and height, and element identification context. Different URLs, frame documents, or viewport sizes SHALL NOT overwrite each other's corrections. Record identity SHALL NOT imply a stable source-code component or automatic identity matching after document replacement.

#### Scenario: Desktop and mobile spacing
- **WHEN** the same element has padding changed from 16px to 24px at 1440 by 900 and from 16px to 12px at 390 by 844
- **THEN** both corrections are retained with their viewport contexts
- **AND** the second correction does not use the desktop override as its original value

#### Scenario: Replaced DOM document
- **WHEN** navigation or a reload replaces a previously edited element's document
- **THEN** its recorded correction is retained as a snapshot
- **AND** a later correction is not silently merged by guessing that a selector identifies the same element

### Requirement: Element identification evidence
The document SHALL include available selector or DOM-path evidence, tag, identifying attributes, a text excerpt, and parent context for each recorded element. Unavailable evidence SHALL be omitted or marked unavailable. Identifiers SHALL be presented as lookup hints rather than guaranteed source-code locations. Frame-local identity SHALL remain distinguishable from top-level identity.

#### Scenario: Generated CSS classes
- **WHEN** a button has generated classes and visible text Save
- **THEN** its record contains available structural and text hints as well as classes
- **AND** the report does not claim to know the corresponding repository component

### Requirement: Optional editable element comment
The selected element SHALL support one freeform comment per context, independent of parameter changes. Updating a comment SHALL replace its previous text. Clearing it SHALL remove the comment without resetting parameter differences. If neither differences nor a comment remain, the empty element record SHALL be omitted from export.

#### Scenario: Describe behavior without a preview
- **WHEN** the designer comments that a tooltip is clipped without changing CSS
- **THEN** the element is exported with that comment and no fabricated parameter changes

#### Scenario: Clear the last content
- **WHEN** a comment-only element's comment is cleared
- **THEN** its element record is omitted and the comment count decreases
- **AND** the active document remains open for further recording

### Requirement: Compact document cards
Document cards SHALL display recording/completed status, last content-modification time, and one combined count of changed parameters and nonempty element comments. Repeated edits to one parameter SHALL count once per context. Cards SHALL expose export and applicable lifecycle actions without a detailed per-element change list or navigation from that list.

#### Scenario: Counts reflect the final document
- **WHEN** two parameters and one comment remain after several adjustment attempts
- **THEN** the card displays 3 edits
- **AND** selection, export, and comparison do not change the last content-modification time

### Requirement: Before and After compare current previews
The active document card SHALL provide an accessible Before/After switch. Before SHALL temporarily remove all extension-owned overrides currently applied in connected documents of that tab; After SHALL restore their latest targets. Neither action SHALL alter recorded changes, counts, or comments. Saved corrections without a live preview SHALL NOT be reconstructed by this switch.

#### Scenario: Compare several selected elements
- **WHEN** three connected elements have overrides and the designer switches to Before
- **THEN** all three show their underlying website styles
- **AND** switching to After reapplies their current targets without adding records

### Requirement: Inspection resumes After automatically
While Before is selected, selecting an element or starting a parameter edit SHALL switch to After and restore current overrides before selection details or edit baselines are evaluated. Hovering, scrolling, and passive inspection refreshes SHALL leave Before active.

#### Scenario: Continue inspecting
- **WHEN** the designer selects another element while viewing Before
- **THEN** the switch returns to After and all live overrides reappear

#### Scenario: Examine the original page
- **WHEN** the designer scrolls or hovers elements while viewing Before
- **THEN** the original page remains visible and the document is unchanged

### Requirement: Saved records and live previews remain distinct
Navigation, reload, element disconnection, and inspector cleanup SHALL NOT delete saved corrections. Old overrides SHALL NOT automatically reattach to new DOM elements. The UI SHALL distinguish retained records from currently applied previews and explain when comparison cannot display saved corrections. Changing URL SHALL establish a new preview context without ending recording.

#### Scenario: Reload during recording
- **WHEN** the page reloads after a saved correction
- **THEN** its document and counts remain available
- **AND** the old correction is not reapplied or advertised as currently previewed

#### Scenario: SPA route change
- **WHEN** the URL changes without a document reload
- **THEN** recording continues, previous-route overrides are removed, and new edits capture the new URL

### Requirement: Local persistence reports failures
Committed document content SHALL be persisted locally independently of the page and worker lifetime. Save failures SHALL be visible and SHALL NOT be reported as successful recording. The extension SHALL NOT silently discard older documents to make room. Export of recoverable content SHALL remain available when possible.

#### Scenario: Storage cannot accept a write
- **WHEN** a document write fails
- **THEN** the panel reports the unsaved state and retains recoverable content for retry or export
- **AND** no saved-success indication is shown

### Requirement: Markdown export does not end recording
The extension SHALL export an active or completed document as a standalone UTF-8 Markdown file without an LLM or server. Export SHALL take a consistent snapshot of current document content and SHALL NOT complete recording. Later edits SHALL update the document, not a previously exported file. Failed export SHALL report failure without modifying the document.

#### Scenario: Export halfway through review
- **WHEN** the designer exports and then changes another parameter
- **THEN** recording continues and a subsequent export includes the new difference
- **AND** the earlier downloaded file remains unchanged

### Requirement: Handoff preserves facts and implementation intent
Markdown SHALL group records by page and viewport context and include element evidence, captured original computed values, available original source expressions, committed targets, and comments. It SHALL default scope to the selected element and explain that targets demonstrate a visual result while the recipient selects an implementation using existing components, tokens, and responsive rules. Missing source data SHALL NOT be invented.

#### Scenario: Token-backed button height
- **WHEN** height was var(--control-small), computed to 32px, and is edited to 40px
- **THEN** export preserves the original token, original computed value, and 40px target
- **AND** it does not prescribe replacing all small controls or hardcoding the value in source

#### Scenario: Markdown-sensitive content
- **WHEN** text or comments contain table delimiters, backticks, or line breaks
- **THEN** the exported content remains readable without corrupting the document structure

### Requirement: Fixed notes section
The Fix notes section SHALL stay at the panel bottom and occupy at most 30% of its height. Only the list SHALL scroll; its header SHALL remain fixed. It SHALL show the Figma empty state when no notes exist.

#### Scenario: Long list
- **WHEN** notes exceed the section height cap
- **THEN** the list scrolls independently while the header stays visible

### Requirement: Note card actions
Cards SHALL show last edit time and date without year, a recording dot for active notes, and a folder icon for completed notes. All cards SHALL offer Copy with the existing tooltip reading Fixes copied and a More menu with Download and Delete. The active card SHALL additionally offer Show before/Show after and Complete recording.

#### Scenario: Copy an active note
- **WHEN** the designer copies the active note
- **THEN** its Markdown is copied and Fixes copied appears above the button without completing recording

### Requirement: Notes header actions
The header SHALL offer Copy all in latest-first order and Start new only when a note is active.

#### Scenario: Copy every note
- **WHEN** the designer chooses Copy all
- **THEN** all notes are copied as Markdown from latest to earliest

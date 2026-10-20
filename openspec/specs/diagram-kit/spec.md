# diagram-kit Specification

## Purpose

Reusable drawing pieces and animations for explaining systems: parties as boxes, connections as wires, messages as tokens that travel between them, and code panels whose lines change.

## Requirements

### Requirement: Box
A box SHALL draw a rounded, outlined panel with an optional icon and title at its top edge and an optional note at its bottom edge, leaving its middle clear. Its outline colour SHALL be settable by theme role.

#### Scenario: Party box
- **WHEN** a box is given an icon, title `Platform`, and colour `accent`
- **THEN** it draws with the icon and title at the top and an accent outline

### Requirement: Wire attaches to boxes
A wire SHALL connect two boxes edge to edge, routing from the facing edges, and SHALL follow the boxes if they move. It SHALL support an arrowhead and start undrawn so it can be drawn in.

#### Scenario: Boxes side by side
- **WHEN** a wire runs from a box at x=680 to a box at x=0
- **THEN** it starts at the first box's left edge and ends at the second box's right edge

#### Scenario: Pinned to a level
- **WHEN** a wire with `level` -200 runs between side-by-side boxes centred at y=-200 and y=-50
- **THEN** both ends sit at y=-200 on the facing edges, and the wire runs straight across

#### Scenario: Behind the drawing
- **WHEN** a scene adds two boxes and then a wire between them
- **THEN** the wire draws behind both boxes

### Requirement: Token
A token SHALL draw a pill of short text, such as a message or a role, in a theme colour with readable text colour.

#### Scenario: Message token
- **WHEN** a token is created with text `{ … }` and colour `creator`
- **THEN** it draws as a creator-coloured pill with contrasting text

### Requirement: Code panel
A code panel SHALL show a title and monospaced lines, preserve leading indentation, and animate inserting, removing and replacing a line, marking a line allowed or refused, and dimming all lines except a chosen set. A panel pinned at its top SHALL grow downwards.

#### Scenario: Insert grows downwards
- **WHEN** a line is inserted into a top-pinned panel
- **THEN** the panel's top edge stays put and the new line fades in

#### Scenario: Focus
- **WHEN** lines 4 and 5 are focused
- **THEN** every other line dims and lines 4 and 5 stay at full opacity

### Requirement: Icons
An icon component SHALL draw any Font Awesome icon definition at a given height in a given colour, taking up its own width so it can sit in a layout.

#### Scenario: Icon in a row
- **WHEN** an icon of size 44 sits next to text in a row layout
- **THEN** the text starts after the icon's proportional width

### Requirement: Legend
A legend SHALL show a label and one coloured key per configured entry, in config order.

#### Scenario: Two entries
- **WHEN** the config legend lists `accent: Platform` and `creator: Live editor creator`
- **THEN** the legend shows two keys in that order with those colours

### Requirement: Motion primitives
The kit SHALL provide these animations:
- `rise`: fade a node in while lifting it into place
- `pulse`: briefly thicken an outline
- `draw` and `cut`: draw a wire in or retract it
- `travel`: move a token along a wire or between two points, fading it in and out
- `refuse`: move a token toward a target, stop it short with a refusal mark, and remove it

#### Scenario: Travel cleans up
- **WHEN** a token travels from one box to another
- **THEN** it is removed from the scene when it arrives

#### Scenario: Refuse with a label
- **WHEN** a token is refused at a box with label `403`
- **THEN** a refusal mark and a `403` tag appear where the token stopped, and the token is removed when the animation finishes

#### Scenario: Keeping the result
- **WHEN** a token travels with `keep`, or is refused with `keep`
- **THEN** the travelled token stays where it landed, or the refusal mark and tag stay up while the refused token is removed, so the beat ends on the result

# Spec Delta

## Purpose

The viewer-facing site: a timeline of sections across the top and, below it, the current section's animation, which advances one beat at a time.

## ADDED Requirements

### Requirement: Sections crossfade
Changing section SHALL keep the current section on screen while the next one loads, then fade the next one in over it once it has drawn its first frame. The viewer SHALL never see a blank or half-loaded section. With reduced motion requested, the switch SHALL be instant.

#### Scenario: Next section
- **WHEN** the viewer moves to the next section
- **THEN** the old section stays visible until the new one is ready, the new one fades in over it, and afterwards only the new one remains

### Requirement: Controls stay put
Back and Next SHALL keep the same position in every section and on every beat, whatever the number of beats and whatever their labels say.

#### Scenario: Different beat counts
- **WHEN** the viewer moves from a section with 6 beats to one with 10
- **THEN** Back and Next don't move

### Requirement: Section timeline
The shell SHALL show every section as a step on a horizontal timeline, mark sections before the current one as past, and keep the current one scrolled to the centre.

#### Scenario: Choosing a section
- **WHEN** the viewer clicks `Events` in the timeline
- **THEN** the `events` section loads at its first beat and `Events` is marked current

### Requirement: Beat stepping
A section SHALL pause at the end of each beat. Next, a click on the canvas, or the right arrow key SHALL play the next beat; Back or the left arrow key SHALL return to the previous beat. Pressing next while a beat is playing SHALL finish that beat.

#### Scenario: Next mid-beat
- **WHEN** a beat is still animating and the viewer presses the right arrow
- **THEN** the beat jumps to its end and pauses

#### Scenario: Progress dots
- **WHEN** a section has 8 beats and the viewer is paused at the third
- **THEN** 8 dots show, the first three filled and the third marked current

### Requirement: Crossing section boundaries
Stepping forward past a section's last beat SHALL load the next section; stepping back before its first beat SHALL load the previous one. Buttons SHALL read `Next section →` and `← Previous section` at those edges.

#### Scenario: Past the last beat
- **WHEN** the viewer is paused at the last beat of `events` and presses Next
- **THEN** the next section in config order loads at its first beat

#### Scenario: End of the explainer
- **WHEN** the viewer is paused at the last beat of the last section
- **THEN** `Next section →` is disabled, and Next, a click on the canvas and the right arrow key do nothing

#### Scenario: Keys work from the shell
- **WHEN** focus is on the timeline and the viewer presses the right arrow
- **THEN** the current section advances one beat

### Requirement: Playing a beat from its dot
Each progress dot SHALL be a button that plays its beat from the beat's start and pauses at its end. The dot for the current beat SHALL be marked as the current step for assistive technology.

#### Scenario: Back to an earlier beat
- **WHEN** the viewer is paused at the third beat and clicks the second dot
- **THEN** the second beat's animation plays from its start, and the section pauses at its end

#### Scenario: The first beat
- **WHEN** the viewer clicks the first dot
- **THEN** the section plays from its very start

#### Scenario: Ahead to a later beat
- **WHEN** the viewer is paused at the first beat and clicks the third dot
- **THEN** the third beat's animation plays from its start, and the section pauses at its end

### Requirement: Sharp on high-DPI screens
A section SHALL render its canvas at the stage's width in device pixels, rounded up to a half step, at least 1× and at most 3× the 1920×1080 frame, chosen when the section loads. Snap mode SHALL always render at 1×.

#### Scenario: A 2× screen
- **WHEN** a section loads in a 1280px-wide stage on a screen with a device pixel ratio of 2
- **THEN** the canvas renders at 1.5×, 2880×1620

#### Scenario: Snapping
- **WHEN** a section loads with `?snap` on the same screen
- **THEN** the canvas renders at 1920×1080

### Requirement: Deep links
The URL hash SHALL identify the section and, optionally, the beat as `#<section>` or `#<section>/<beat-id>`. Loading such a URL SHALL show that section paused at the end of that beat. Navigation SHALL update the hash without adding a history entry per beat.

#### Scenario: Link to a beat
- **WHEN** the viewer opens `#events/dropped`
- **THEN** the `events` section shows paused at the end of beat `dropped`

#### Scenario: Unknown beat
- **WHEN** the viewer opens `#events/nope`
- **THEN** the `events` section loads at its first beat

#### Scenario: Unknown section
- **WHEN** the viewer opens `#nope`
- **THEN** the first section loads

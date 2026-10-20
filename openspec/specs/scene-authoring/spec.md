# scene-authoring Specification

## Purpose

How a section's animation is written: a scene made of named beats, each pairing one caption with the animation that illustrates it, so narration and motion stay together in one file.

## Requirements

### Requirement: Scene setup
A scene SHALL start with the theme background filled, a hidden caption in place below the drawing, the legend from config shown when one is configured, and a layer for transient nodes that draws above the scene's own nodes and below the caption.

#### Scenario: Empty scene
- **WHEN** a scene adds no nodes and has one beat with an empty body
- **THEN** the frame shows the theme background, the legend, and that beat's caption

### Requirement: Beats pair a caption with an animation
A beat SHALL take an id, a caption, and an animation body. It SHALL show the caption, run the body, and then pause as one step of the section. Beat ids SHALL be unique within a section.

#### Scenario: Caption changes between beats
- **WHEN** a beat runs while a previous caption is visible
- **THEN** the old caption fades out and the new one fades in while the body plays

#### Scenario: Duplicate beat id
- **WHEN** two beats in one section share an id
- **THEN** the section fails to load with an error naming the id

### Requirement: One caption per beat
A beat SHALL show exactly one caption, set when the beat starts, so the viewer has one thing to read while the drawing shows one thing. The authoring API SHALL offer no way to change the caption partway through a beat; a second point is a second beat.

#### Scenario: A second point
- **WHEN** an author wants new text to appear after the beat's animation has landed
- **THEN** they write a second beat, and both captions appear in `explainer outline`

### Requirement: Narration is statically readable
Beat ids and captions SHALL be string literals in the `beat()` call, so tools can read every caption without running the scene.

#### Scenario: Computed caption
- **WHEN** a beat's caption is a variable or template expression
- **THEN** `explainer check` reports it as an error naming the file and line

### Requirement: Inline code in captions
Text inside backticks in a caption SHALL render as code on a chip, and a code span SHALL never break across lines. Punctuation attached to a code span SHALL stay on its line.

#### Scenario: Code with trailing comma
- **WHEN** a caption contains "`site`, then"
- **THEN** `site` renders as a code chip followed by the comma on the same line

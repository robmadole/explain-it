# Spec Delta

## Purpose

One set of colour and font tokens shared by the canvases and the HTML shell, with base roles every explainer gets and room for an explainer's own roles.

## ADDED Requirements

### Requirement: Base tokens
The theme SHALL provide the roles `bg`, `surface`, `rule`, `text`, `muted`, `accent`, `ok`, `danger`, `font` and `mono` with defaults, dark by default.

#### Scenario: No overrides
- **WHEN** the config gives no theme
- **THEN** canvases and shell both use the default dark tokens

### Requirement: Extending the theme
The config SHALL be able to override base roles and add named roles. Added roles SHALL be typed and usable in scenes and in legend entries by name.

#### Scenario: A project role
- **WHEN** the config adds `creator: '#f2b84b'`
- **THEN** scenes can use `theme.creator`, a legend entry can reference `creator`, and the shell has the CSS variable `--creator`

### Requirement: Single source for canvas and CSS
Every token SHALL be exposed to the shell as a CSS custom property with the same value the canvases use. The consumer SHALL NOT maintain a separate CSS copy.

#### Scenario: Changing a colour
- **WHEN** `accent` is changed in the config
- **THEN** both the canvas wires and the shell's timeline dots use the new colour after a rebuild

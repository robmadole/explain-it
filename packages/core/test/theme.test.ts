import {describe, expect, expectTypeOf, it} from 'vitest';

import {baseTheme, defineTheme, resolveColor, themeCss} from '../src/theme/index.js';

describe('defineTheme', () => {
  it('extends and overrides the base tokens', () => {
    const theme = defineTheme({creator: '#f2b84b', accent: '#000000'});
    expect(theme.creator).toBe('#f2b84b');
    expect(theme.accent).toBe('#000000');
    expect(theme.bg).toBe(baseTheme.bg);
  });

  it('types added roles', () => {
    expectTypeOf(defineTheme({creator: '#f2b84b'})).toHaveProperty('creator');
    // @ts-expect-error: no such role without adding it.
    defineTheme().creator;
  });
});

describe('themeCss', () => {
  it('writes every token as a custom property, kebab-cased', () => {
    expect(themeCss({bg: '#000', surfaceRaised: '#111'})).toBe(':root {\n  --bg: #000;\n  --surface-raised: #111;\n}\n');
  });
});

describe('resolveColor', () => {
  it('looks up roles and passes raw colours through', () => {
    expect(resolveColor(baseTheme, 'accent')).toBe(baseTheme.accent);
    expect(resolveColor(baseTheme, '#abcdef')).toBe('#abcdef');
  });
});

// The tokens every explainer gets. Canvases read them from the theme object;
// the shell reads the same values as CSS custom properties.
export const baseTheme = {
  bg: '#0f1115',
  surface: '#161a21',
  rule: '#2a303b',
  text: '#eef1f5',
  muted: '#7d8696',
  accent: '#5b9cff',
  // Allowed, or works.
  ok: '#5fd38d',
  // Refused or blocked.
  danger: '#ff6b6b',
  font: 'Inter, Helvetica Neue, Arial, sans-serif',
  mono: 'JetBrains Mono, Menlo, monospace',
};

export type BaseTheme = typeof baseTheme;
export type Theme = BaseTheme & Record<string, string>;

// Overrides base roles and adds new ones: defineTheme({creator: '#f2b84b'})
// gives a theme where `theme.creator` is typed.
export function defineTheme<T extends Record<string, string> = {}>(roles: T = {} as T): BaseTheme & T {
  return {...baseTheme, ...roles};
}

// `--name: value` for every token, with camelCase names in kebab-case.
export function themeCss(theme: Record<string, string>) {
  const lines = Object.entries(theme).map(
    ([name, value]) => `  --${name.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}: ${value};`,
  );
  return `:root {\n${lines.join('\n')}\n}\n`;
}

// A colour given either as a theme role or as a raw colour.
export function resolveColor(theme: Record<string, string>, color: string) {
  return theme[color] ?? color;
}

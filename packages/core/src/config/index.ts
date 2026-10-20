import {baseTheme, defineTheme, type Theme} from '../theme/index.js';

export {baseTheme, defineTheme, themeCss, type BaseTheme, type Theme} from '../theme/index.js';

export interface SectionConfig {
  // Names sections/<id>.tsx and the #<id> link.
  id: string;
  // The section's name in the timeline.
  label: string;
  // Where in the source document this section's material is, e.g. '#events'.
  source?: string;
}

export interface LegendEntry {
  // A theme role, like 'accent', or a raw colour.
  color: string;
  label: string;
}

export interface ExplainerConfig {
  title: string;
  sections: SectionConfig[];
  // The document this explainer explains, relative to the config.
  source?: string;
  theme?: Theme;
  legend?: LegendEntry[];
  // The word before the legend's keys, e.g. 'BUILT BY'. Defaults to 'KEY'.
  legendTitle?: string;
  // Seeds every scene's random generator, so renders repeat.
  seed?: number;
}

// What the browser gets: the config with defaults filled in.
export interface ResolvedConfig extends Required<Omit<ExplainerConfig, 'source'>> {
  source: string | null;
}

export function defineExplainer(config: ExplainerConfig): ExplainerConfig {
  return config;
}

export function resolveConfig(config: ExplainerConfig): ResolvedConfig {
  return {
    title: config.title,
    sections: config.sections,
    source: config.source ?? null,
    theme: config.theme ?? defineTheme(),
    legend: config.legend ?? [],
    legendTitle: config.legendTitle ?? 'KEY',
    seed: config.seed ?? 1,
  };
}

const ID = /^[a-z0-9][a-z0-9-]*$/;

// Problems with the config itself, one message each. Missing scene files are
// checked by the loader, which knows where the explainer lives.
export function validateConfig(config: unknown): string[] {
  const problems: string[] = [];
  const c = config as Partial<ExplainerConfig> | undefined;
  if (!c || typeof c !== 'object') return ['The config must export an object with defineExplainer().'];
  if (typeof c.title !== 'string' || !c.title) problems.push('`title` must be a non-empty string.');
  if (!Array.isArray(c.sections) || c.sections.length === 0) {
    problems.push('`sections` must list at least one section.');
    return problems;
  }
  const seen = new Set<string>();
  c.sections.forEach((section, i) => {
    if (!section || typeof section.id !== 'string' || !ID.test(section.id)) {
      problems.push(`Section ${i + 1} needs an \`id\` of lowercase letters, digits and dashes.`);
      return;
    }
    if (seen.has(section.id)) problems.push(`Section id "${section.id}" is used more than once.`);
    seen.add(section.id);
    if (typeof section.label !== 'string' || !section.label) {
      problems.push(`Section "${section.id}" needs a \`label\`.`);
    }
  });
  const theme = {...baseTheme, ...(c.theme ?? {})} as Record<string, string>;
  for (const entry of c.legend ?? []) {
    if (!entry?.label) problems.push('Every legend entry needs a `label`.');
    if (!entry?.color) problems.push(`Legend entry "${entry?.label}" needs a \`color\`.`);
    else if (!theme[entry.color] && !/^(#|rgb|hsl)/.test(entry.color)) {
      problems.push(`Legend entry "${entry.label}" uses "${entry.color}", which is not a theme role or a colour.`);
    }
  }
  return problems;
}

import {readFileSync} from 'node:fs';
import {relative} from 'node:path';

import type {Explainer} from '../vite/load.js';
import {readBeats, type Beat} from './beats.js';

export interface SectionOutline {
  id: string;
  label: string;
  // Relative to the explainer's root.
  file: string;
  beats: Beat[];
}

export interface Outline {
  title: string;
  sections: SectionOutline[];
}

export function outline({root, config, sceneFile}: Explainer, only?: string): Outline {
  const sections = config.sections
    .filter(({id}) => !only || id === only)
    .map(({id, label}) => {
      const file = sceneFile(id);
      return {id, label, file: relative(root, file), beats: readBeats(file, readFileSync(file, 'utf8'))};
    });
  return {title: config.title, sections};
}

// The narration as markdown: a heading per section, a numbered beat per line.
export function outlineMarkdown({title, sections}: Outline) {
  const lines = [`# ${title}`, ''];
  for (const section of sections) {
    lines.push(`## ${section.label} (\`${section.id}\`)`, '');
    if (section.beats.length === 0) lines.push('No beats.');
    section.beats.forEach((beat, i) => {
      lines.push(`${i + 1}. \`${beat.id ?? '?'}\`: ${beat.caption ?? '(not a string literal)'}`);
    });
    lines.push('');
  }
  return lines.join('\n');
}

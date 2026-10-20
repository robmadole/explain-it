import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

import {readBeats} from '../src/review/beats.js';
import {outline, outlineMarkdown} from '../src/review/outline.js';
import {loadExplainer} from '../src/vite/load.js';

const scenes = join(import.meta.dirname, 'fixtures/scenes');
const read = (name: string) => readBeats(name, readFileSync(join(scenes, name), 'utf8'));

describe('readBeats', () => {
  it('reads ids and captions in source order, under an alias', () => {
    expect(read('full.tsx')).toEqual([
      {id: 'first', caption: 'The `first` beat.', line: 6},
      {id: 'nested', caption: 'Not really, but still read.', line: 7},
      {id: 'second', caption: 'A template literal works.', line: 9},
      {id: 'third', caption: null, line: 10},
    ]);
  });

  it('reads the same with empty bodies', () => {
    expect(read('empty-bodies.tsx').map(({id, caption}) => ({id, caption}))).toEqual([
      {id: 'first', caption: 'The `first` beat.'},
      {id: 'second', caption: 'A template literal works.'},
    ]);
  });

  it('ignores a beat() that is not from @explain-it/core', () => {
    expect(read('other-beat.tsx')).toEqual([]);
  });
});

describe('outline', () => {
  it('prints sections and beats as markdown', async () => {
    const explainer = await loadExplainer(join(import.meta.dirname, '../../../examples/basic'));
    const markdown = outlineMarkdown(outline(explainer));
    expect(markdown).toContain('# A request\n\n## Request (`request`)\n\n1. `parties`: A browser and a server, with a `fetch` between them.');
    expect(markdown).toContain('## Response (`response`)');
    expect(outline(explainer, 'response').sections.map(({id}) => id)).toEqual(['response']);
  });
});

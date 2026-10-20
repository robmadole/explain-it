import {mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {beforeEach, describe, expect, it} from 'vitest';

import {GUIDE, linkGuide, newExplainer, newSection} from '../src/cli/new.js';
import {ExplainerError, loadExplainer} from '../src/vite/load.js';

// Inside the repo, so the generated config resolves @explain-it/core.
const root = join(import.meta.dirname, '.tmp/new');
const read = (file: string) => readFileSync(join(root, file), 'utf8');

beforeEach(() => {
  rmSync(root, {recursive: true, force: true});
  mkdirSync(root, {recursive: true});
});

describe('newExplainer', () => {
  it('starts an explainer that loads', async () => {
    expect(newExplainer(root)).toEqual([
      'explainer.config.ts',
      'theme.ts',
      'tsconfig.json',
      'sections/intro.tsx',
      'package.json',
      '.gitignore',
      'CLAUDE.md',
    ]);
    const {config} = await loadExplainer(root);
    expect(config.sections).toEqual([{id: 'intro', label: 'Intro'}]);
    expect(JSON.parse(read('package.json')).scripts).toEqual({
      dev: 'explainer dev',
      build: 'explainer build',
      snap: 'explainer snap',
      check: 'explainer check',
    });
    expect(read('.gitignore')).toBe('node_modules\ndist\n.explainer\n');
  });

  it('keeps what is there and links the guide once', () => {
    writeFileSync(join(root, 'package.json'), JSON.stringify({name: 'mine', scripts: {dev: 'custom'}}));
    writeFileSync(join(root, 'CLAUDE.md'), '# Notes\n\nSome rules.');
    newExplainer(root);
    newExplainer(root);
    expect(JSON.parse(read('package.json'))).toMatchObject({name: 'mine', scripts: {dev: 'custom', check: 'explainer check'}});
    expect(read('CLAUDE.md').startsWith('# Notes\n\nSome rules.\n\n- Explainer authoring guide')).toBe(true);
    expect(read('CLAUDE.md').split(GUIDE)).toHaveLength(2);
    expect(linkGuide(root)).toBe(false);
  });
});

describe('newSection', () => {
  beforeEach(() => {
    newExplainer(root);
  });

  it('adds a scene file and a config entry', async () => {
    expect(await newSection(root, {id: 'events', label: 'Events', source: '#events'})).toEqual([
      'explainer.config.ts',
      'sections/events.tsx',
    ]);
    expect(read('explainer.config.ts')).toContain(
      "    {id: 'intro', label: 'Intro'},\n    {id: 'events', label: 'Events', source: '#events'},\n  ],",
    );
    const {config} = await loadExplainer(root);
    expect(config.sections.at(-1)).toEqual({id: 'events', label: 'Events', source: '#events'});
  });

  it('defaults the label from the id', async () => {
    await newSection(root, {id: 'web-socket'});
    expect((await loadExplainer(root)).config.sections.at(-1)).toEqual({id: 'web-socket', label: 'Web socket'});
  });

  it('refuses an existing id and writes nothing', async () => {
    const before = read('explainer.config.ts');
    await expect(newSection(root, {id: 'intro'})).rejects.toEqual(new ExplainerError(['Section "intro" already exists.']));
    expect(read('explainer.config.ts')).toBe(before);
  });
});

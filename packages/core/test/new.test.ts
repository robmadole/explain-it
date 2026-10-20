import {existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {beforeEach, describe, expect, it} from 'vitest';

import {GUIDE_COMMAND, linkGuide, newExplainer, newSection, setup} from '../src/cli/new.js';
import {ExplainerError, findRepo, loadExplainer} from '../src/vite/load.js';

// A scratch repo inside packages/core/test/.tmp. A .git folder marks its root,
// so findRepo stops there and never sees this repo's own files.
const repo = join(import.meta.dirname, '.tmp/new');
const read = (file: string) => readFileSync(join(repo, file), 'utf8');

beforeEach(() => {
  rmSync(repo, {recursive: true, force: true});
  mkdirSync(join(repo, '.git'), {recursive: true});
});

describe('setup', () => {
  it('writes the repo config, ignores and guide pointer', async () => {
    expect(setup(repo)).toEqual(['explain-it.config.ts', '.gitignore', 'CLAUDE.md']);
    expect(read('.gitignore')).toBe('docs/explainers/*/.explainer/\ndocs/explainers/*/dist/\n');
    expect(read('CLAUDE.md')).toContain(GUIDE_COMMAND);
    await expect(findRepo(repo)).resolves.toEqual({root: repo, explainers: join(repo, 'docs/explainers')});
  });

  it('takes another explainers folder', async () => {
    setup(repo, {explainers: 'explainers/'});
    await expect(findRepo(repo)).resolves.toMatchObject({explainers: join(repo, 'explainers')});
    expect(read('.gitignore')).toContain('explainers/*/dist/');
  });

  it('keeps what is there and is safe to run again', () => {
    writeFileSync(join(repo, '.gitignore'), 'node_modules');
    writeFileSync(join(repo, 'CLAUDE.md'), '# Notes\n\nSome rules.');
    setup(repo);
    expect(setup(repo)).toEqual([]);
    expect(read('.gitignore')).toBe('node_modules\ndocs/explainers/*/.explainer/\ndocs/explainers/*/dist/\n');
    expect(read('CLAUDE.md').startsWith('# Notes\n\nSome rules.\n\n- Explainers: run')).toBe(true);
    expect(read('CLAUDE.md').split(GUIDE_COMMAND)).toHaveLength(2);
    expect(linkGuide(repo)).toBe(false);
  });
});

describe('findRepo', () => {
  it('finds the config from a folder below it', async () => {
    setup(repo);
    mkdirSync(join(repo, 'docs/deep/er'), {recursive: true});
    await expect(findRepo(join(repo, 'docs/deep/er'))).resolves.toMatchObject({root: repo});
  });

  it('stops at the repo root', async () => {
    await expect(findRepo(repo)).resolves.toBeNull();
  });
});

describe('newExplainer', () => {
  it('creates only a config and a starter section, which load', async () => {
    setup(repo);
    const dir = await newExplainer(join(repo, 'docs'), 'live-contract');
    expect(dir).toBe(join(repo, 'docs/explainers/live-contract'));
    expect(readdirSync(dir).sort()).toEqual(['explainer.config.ts', 'sections']);
    expect(readdirSync(join(dir, 'sections'))).toEqual(['intro.tsx']);
    const {config} = await loadExplainer(dir);
    expect(config).toMatchObject({title: 'Live contract', sections: [{id: 'intro', label: 'Intro'}]});
  });

  it('needs setup first', async () => {
    await expect(newExplainer(repo, 'one')).rejects.toEqual(
      new ExplainerError(['No explain-it.config.ts here or above. Run `npx @explain-it/core setup` first.']),
    );
  });

  it('refuses a bad name and an existing explainer', async () => {
    setup(repo);
    await expect(newExplainer(repo, 'Bad Name')).rejects.toBeInstanceOf(ExplainerError);
    await newExplainer(repo, 'one');
    await expect(newExplainer(repo, 'one')).rejects.toEqual(new ExplainerError(['docs/explainers/one already exists.']));
  });
});

describe('newSection', () => {
  let dir: string;
  const config = () => readFileSync(join(dir, 'explainer.config.ts'), 'utf8');

  beforeEach(async () => {
    setup(repo);
    dir = await newExplainer(repo, 'one');
  });

  it('adds a scene file and a config entry', async () => {
    expect(await newSection(dir, {id: 'events', label: 'Events', source: '#events'})).toEqual([
      'explainer.config.ts',
      'sections/events.tsx',
    ]);
    expect(config()).toContain("    {id: 'intro', label: 'Intro'},\n    {id: 'events', label: 'Events', source: '#events'},\n  ],");
    const {config: loaded} = await loadExplainer(dir);
    expect(loaded.sections.at(-1)).toEqual({id: 'events', label: 'Events', source: '#events'});
  });

  it('defaults the label from the id', async () => {
    await newSection(dir, {id: 'web-socket'});
    expect((await loadExplainer(dir)).config.sections.at(-1)).toEqual({id: 'web-socket', label: 'Web socket'});
  });

  it('refuses an existing id and writes nothing', async () => {
    const before = config();
    await expect(newSection(dir, {id: 'intro'})).rejects.toEqual(new ExplainerError(['Section "intro" already exists.']));
    expect(config()).toBe(before);
    expect(existsSync(join(dir, 'sections/intro.tsx'))).toBe(true);
  });
});

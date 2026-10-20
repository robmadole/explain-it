import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

import {resolveConfig, validateConfig} from '../src/config/index.js';
import {ExplainerError, loadExplainer} from '../src/vite/load.js';

const fixtures = join(import.meta.dirname, 'fixtures');

describe('validateConfig', () => {
  const ok = {title: 'T', sections: [{id: 'a', label: 'A'}]};

  it('accepts a minimal config', () => {
    expect(validateConfig(ok)).toEqual([]);
  });

  it('needs an object', () => {
    expect(validateConfig(undefined)).toEqual(['The config must export an object with defineExplainer().']);
  });

  it('needs a title and sections', () => {
    expect(validateConfig({sections: []})).toEqual([
      '`title` must be a non-empty string.',
      '`sections` must list at least one section.',
    ]);
  });

  it('rejects bad and duplicate ids and missing labels', () => {
    const problems = validateConfig({
      title: 'T',
      sections: [{id: 'Bad Id', label: 'X'}, {id: 'a', label: 'A'}, {id: 'a', label: ''}],
    });
    expect(problems).toEqual([
      'Section 1 needs an `id` of lowercase letters, digits and dashes.',
      'Section id "a" is used more than once.',
      'Section "a" needs a `label`.',
    ]);
  });

  it('checks legend colours against the theme', () => {
    expect(validateConfig({...ok, legend: [{color: 'creator', label: 'C'}]})).toEqual([
      'Legend entry "C" uses "creator", which is not a theme role or a colour.',
    ]);
    expect(validateConfig({...ok, theme: {creator: '#fff'}, legend: [{color: 'creator', label: 'C'}]})).toEqual([]);
    expect(validateConfig({...ok, legend: [{color: '#123456', label: 'Raw'}]})).toEqual([]);
  });
});

describe('resolveConfig', () => {
  it('fills in defaults', () => {
    const config = resolveConfig({title: 'T', sections: [{id: 'a', label: 'A'}]});
    expect(config).toMatchObject({source: null, legend: [], legendTitle: 'KEY', seed: 1});
    expect(config.theme.bg).toBe('#0f1115');
  });
});

describe('loadExplainer', () => {
  it('loads a config and its theme', async () => {
    const {config, sceneFile} = await loadExplainer(join(fixtures, 'good'));
    expect(config.title).toBe('Good');
    expect(config.theme.creator).toBe('#f2b84b');
    expect(sceneFile('one')).toBe(join(fixtures, 'good', 'sections', 'one.tsx'));
  });

  it('names a section without a scene file', async () => {
    await expect(loadExplainer(join(fixtures, 'missing-scene'))).rejects.toEqual(
      new ExplainerError(['Section "gone" has no scene file: sections/gone.tsx']),
    );
  });

  it('says when there is no config', async () => {
    await expect(loadExplainer(join(fixtures, 'nowhere'))).rejects.toBeInstanceOf(ExplainerError);
  });
});

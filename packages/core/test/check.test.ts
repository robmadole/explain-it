import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

import {staticChecks} from '../src/review/check.js';
import {formatFailure} from '../src/review/failures.js';
import {loadExplainer} from '../src/vite/load.js';

const fixtures = join(import.meta.dirname, 'fixtures');

describe('staticChecks', () => {
  it('passes the basic example', async () => {
    const result = staticChecks(await loadExplainer(join(import.meta.dirname, '../../../examples/basic')));
    expect(result.failures).toEqual([]);
    expect(result).toMatchObject({sections: 2, beats: 6});
  }, 30000);

  it('finds every kind of static problem', async () => {
    const {failures} = staticChecks(await loadExplainer(join(fixtures, 'bad-static')));
    const at = (rule: string) => failures.filter(f => f.rule === rule).map(({section, beat, line}) => ({section, beat, line}));

    expect(at('literal')).toEqual([{section: 'captions', beat: 'a', line: 6}]);
    expect(at('duplicate-beat')).toEqual([{section: 'captions', beat: 'a', line: 7}]);
    expect(at('backticks')).toEqual([{section: 'captions', beat: 'b', line: 8}]);
    expect(at('caption-length')).toEqual([{section: 'captions', beat: 'c', line: 9}]);
    expect(at('beat-count')).toEqual([{section: 'long', beat: null, line: null}]);
    expect(at('types')).toEqual([{section: 'captions', beat: null, line: 10}]);
    expect(failures).toHaveLength(6);
  }, 30000);
});

describe('formatFailure', () => {
  it('puts the place first and the rule last', () => {
    expect(
      formatFailure({rule: 'backticks', section: 'events', beat: 'stream', file: 'sections/events.tsx', line: 42, message: 'Unclosed.'}),
    ).toBe('✗ events/stream  sections/events.tsx:42  Unclosed. [backticks]');
  });
});

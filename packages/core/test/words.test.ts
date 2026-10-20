import {describe, expect, it} from 'vitest';

import {parts, words} from '../src/scene/words.js';

describe('words', () => {
  it('keeps a code span with spaces as one word', () => {
    expect(words('Run `git push` now')).toEqual(['Run', '`git push`', 'now']);
  });

  it('keeps punctuation with its code span', () => {
    expect(words('`site`, then')).toEqual(['`site`,', 'then']);
  });

  it('handles several spans', () => {
    expect(words('`id:`, `retry:` and comments')).toEqual(['`id:`,', '`retry:`', 'and', 'comments']);
  });
});

describe('parts', () => {
  it('splits a word into code and prose', () => {
    expect(parts('`site`,')).toEqual([
      {code: true, text: 'site'},
      {code: false, text: ','},
    ]);
    expect(parts('plain')).toEqual([{code: false, text: 'plain'}]);
  });
});

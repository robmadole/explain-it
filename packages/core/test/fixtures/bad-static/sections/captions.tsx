import {beat, scene} from '@explain-it/core';

const words = 'computed';

export default scene(function* () {
  yield* beat('a', words);
  yield* beat('a', 'Twice.');
  yield* beat('b', 'An `unclosed backtick.');
  yield* beat('c', 'This caption goes on and on, far past what a viewer can read in the moment the beat takes, and that is the whole problem with it, really, because nobody reads a paragraph under an animation.');
  const wrong: number = 'not a number';
});

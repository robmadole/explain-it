import {beat, scene} from '@explain-it/core';

export default scene(function* () {
  yield* beat('first', 'The `first` beat.');
  yield* beat('second', 'A template literal works.');
});

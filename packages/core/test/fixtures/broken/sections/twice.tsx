import {beat, scene} from '@explain-it/core';

export default scene(function* () {
  yield* beat('same', 'First.');
  yield* beat('same', 'Second.');
});

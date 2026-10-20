import {beat as step, scene} from '@explain-it/core';

const later = 'computed';

export default scene(function* () {
  yield* step('first', 'The `first` beat.', function* () {
    yield* step('nested', 'Not really, but still read.');
  });
  yield* step(`second`, `A template literal works.`);
  yield* step('third', later);
});

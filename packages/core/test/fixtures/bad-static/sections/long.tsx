import {beat, scene} from '@explain-it/core';

export default scene(function* () {
  yield* beat('b1', 'Beat 1.');
  yield* beat('b2', 'Beat 2.');
  yield* beat('b3', 'Beat 3.');
  yield* beat('b4', 'Beat 4.');
  yield* beat('b5', 'Beat 5.');
  yield* beat('b6', 'Beat 6.');
  yield* beat('b7', 'Beat 7.');
  yield* beat('b8', 'Beat 8.');
  yield* beat('b9', 'Beat 9.');
  yield* beat('b10', 'Beat 10.');
  yield* beat('b11', 'Beat 11.');
  yield* beat('b12', 'Beat 12.');
  yield* beat('b13', 'Beat 13.');
});

import {scene} from '@explain-it/core';

function beat(id: string) {
  return id;
}

export default scene(function* () {
  beat('not-ours');
});

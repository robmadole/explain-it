import {allowOverlap, beat, Box, scene, Token} from '@explain-it/core';

export default scene(function* ({add}) {
  add(<Box title="Wide" x={800} y={-200} />);
  add(<Token text="first" color="accent" x={-400} y={-200} />);
  add(<Token text="second" color="accent" x={-380} y={-195} />);
  add(<Box title="Low" y={330} />);
  add(allowOverlap(<Token text="pinned" color="accent" x={-390} y={-190} />));

  yield* beat('crowded', 'Too much in one place.');
});

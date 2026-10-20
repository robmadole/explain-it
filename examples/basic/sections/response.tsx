import {beat, CodePanel, rise, scene} from '@explain-it/core';

export default scene(function* ({add}) {
  const body = add<CodePanel>(
    <CodePanel title="Response body" y={-340} offset={[0, -1]} width={1100} opacity={0} lines={['{', '  "items": [', '  ]', '}']} />,
  );

  yield* beat('body', 'The server answers with a JSON body.', function* () {
    yield* rise(body);
  });

  yield* beat('items', 'Each item is one line in the `items` array.', function* () {
    yield* body.insertLine(2, {text: '    {"id": 1},', color: 'accent'});
    yield* body.insertLine(3, {text: '    {"id": 2}', color: 'accent'});
    yield* body.focusLines([2, 3]);
  });

  yield* beat('trimmed', 'A deleted item drops out; the rest are marked as sent.', function* () {
    yield* body.focusLines(null);
    yield* body.removeLine(3);
    yield* body.replaceLine(2, {text: '    {"id": 1}', color: 'accent'});
    yield* body.markLine(2, true);
    yield* body.markLine(0, false);
  });
});

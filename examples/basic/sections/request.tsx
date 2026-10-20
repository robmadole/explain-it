import {Box, beat, draw, refuse, rise, scene, Token, travel, Wire} from '@explain-it/core';

export default scene(function* ({add}) {
  const browser = add(<Box title="Browser" note="the page" color="client" x={-560} y={-120} opacity={0} />);
  const server = add(<Box title="Server" note="the app" x={760} y={-120} opacity={0} />);
  const wire = add(<Wire from={browser} to={server} />);

  yield* beat('parties', 'A browser and a server, with a `fetch` between them.', function* () {
    yield* rise(browser);
    yield* rise(server);
    yield* draw(wire);
    // The wire follows the box.
    yield* server.x(560, 0.6);
  });

  yield* beat('get', 'The browser sends `GET /items`, and the server takes it.', function* () {
    yield* travel(<Token text="GET /items" color="client" />, {along: wire});
  });

  yield* beat('refused', 'A request without a session is turned away with a `401`.', function* () {
    yield* refuse(<Token text="GET /admin" color="client" />, {along: wire}, {label: '401', keep: true});
  });
});

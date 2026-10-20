# explain-it

Agent-driven animated explainers, built on [Motion Canvas](https://motioncanvas.io).

| Package | |
|---|---|
| [`@explain-it/core`](packages/core) | The library, the Vite plugin, the player and the `explainer` CLI. |

## Layout

This is an npm-workspaces monorepo.

```
packages/<name>    published packages, as @explain-it/<name>
examples/<name>    example explainers; private, used as test fixtures
openspec/          specs and changes (OpenSpec)
tsconfig.base.json shared TypeScript settings
```

## Working on it

```sh
npm install
npx playwright install chromium
npm run build        # every workspace, core first
npm test             # unit tests
npm run test:e2e -w packages/core   # browser tests against built examples
npm run dev -w examples/basic       # the basic example, live
```

## Releasing

See [RELEASING.md](RELEASING.md): releases publish to npm from a workflow that waits for a maintainer's approval.

## License

MIT. See [LICENSE](LICENSE), which also credits the Font Awesome icons the kit embeds.

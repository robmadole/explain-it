import {cpSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {Browser} from 'playwright';
import {createServer, type ViteDevServer} from 'vite';
import {afterAll, beforeAll, expect, it} from 'vitest';

import {viteConfig} from '../../src/cli/index.js';
import {BASIC, launch, open, pausedAt} from './site.js';

// A copy of the basic example to edit. Inside the repo, so it resolves the
// workspace's packages.
const root = join(import.meta.dirname, '../.tmp/dev');
let server: ViteDevServer;
let browser: Browser;

beforeAll(async () => {
  rmSync(root, {recursive: true, force: true});
  cpSync(BASIC, root, {recursive: true, filter: path => !/node_modules|dist|\.explainer|tsconfig\.json/.test(path)});
  server = await createServer(viteConfig(root, {logLevel: 'silent', server: {port: 0}}));
  await server.listen();
  browser = await launch();
}, 60000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it('reloads an edited section at the beat that was showing', async () => {
  const {page, errors} = await open(browser, `${server.resolvedUrls!.local[0]}#request/get`);
  await pausedAt(page, '#request/get', 20000);

  // Tag the section's window; a reload gives it a fresh one.
  const frame = () => document.querySelector<HTMLIFrameElement>('iframe.section')!.contentWindow as Window & {tagged?: boolean};
  await page.evaluate(`(${frame})().tagged = true`);

  const file = join(root, 'sections/request.tsx');
  writeFileSync(file, readFileSync(file, 'utf8').replace('takes it.', 'takes it, then answers.'));

  await page.waitForFunction(`!(${frame})().tagged`, undefined, {timeout: 10000});
  await pausedAt(page, '#request/get', 20000);
  expect(page.frames()[1].url()).toMatch(/sections\/request\.html#get$/);

  // And it shows the new caption.
  const snap = await browser.newPage();
  await snap.goto(`${server.resolvedUrls!.local[0]}sections/request.html?snap`);
  await snap.waitForFunction(() => window.__explainer);
  await snap.evaluate(() => window.__explainer!.seek('get'));
  const caption = await snap.evaluate(() => window.__explainer!.nodes().find(node => node.name === 'caption')?.text);
  expect(caption).toBe('The browser sends `GET /items`, and the server takes it, then answers.');
  expect(errors).toEqual([]);
}, 60000);

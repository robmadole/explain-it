import {join} from 'node:path';
import type {Browser} from 'playwright';
import {afterAll, beforeAll, expect, it} from 'vitest';

import {launch, open, serveBuilt} from './site.js';

let site: Awaited<ReturnType<typeof serveBuilt>>;
let browser: Browser;

beforeAll(async () => {
  site = await serveBuilt(join(import.meta.dirname, '../fixtures/broken'));
  browser = await launch();
}, 60000);

afterAll(async () => {
  await browser?.close();
  await site?.close();
});

it('shows a duplicate beat id instead of playing', async () => {
  const {page} = await open(browser, site.url);
  const error = page.frameLocator('iframe.section').locator('.error');
  await expect(error.textContent({timeout: 10000})).resolves.toBe('Beat id "same" is used more than once in this section.');
}, 30000);

import {join} from 'node:path';
import {chromium, type Browser, type Page} from 'playwright';
import {build, preview, type PreviewServer} from 'vite';

import {viteConfig} from '../../src/cli/index.js';

export const BASIC = join(import.meta.dirname, '../../../../examples/basic');

// Builds an explainer and serves dist/ for the browser.
export async function serveBuilt(root: string) {
  await build(viteConfig(root, {logLevel: 'silent'}));
  const server: PreviewServer = await preview(viteConfig(root, {logLevel: 'silent', preview: {port: 0}}));
  const url = server.resolvedUrls!.local[0];
  return {url, close: () => new Promise<void>(resolve => server.httpServer.close(() => resolve()))};
}

export async function launch(): Promise<Browser> {
  return chromium.launch();
}

export async function open(browser: Browser, url: string) {
  const page = await browser.newPage({viewport: {width: 1280, height: 860}});
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  return {page, errors};
}

// Waits until the section is paused at the beat `hash` names, and the shell's
// hash says so.
export async function pausedAt(page: Page, hash: string, timeout = 10000) {
  const beat = hash.split('/')[1];
  await page.waitForFunction(
    ([h, b]) => {
      const frame = document.querySelector<HTMLIFrameElement>('iframe.section');
      return decodeURIComponent(location.hash) === h && frame?.contentDocument?.body?.dataset.beat === b;
    },
    [hash, beat],
    {timeout},
  );
}

export function section(page: Page) {
  return page.frameLocator('iframe.section');
}

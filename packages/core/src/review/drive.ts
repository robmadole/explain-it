import type {Browser} from 'playwright';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {build, preview} from 'vite';

import {viteConfig} from '../cli/vite-config.js';
import type {SnapNode} from '../runtime/snap.js';
import {WORK_DIR, type Explainer} from '../vite/load.js';

export interface BeatSnap {
  section: string;
  beat: string;
  // The section failed to play, as the page reported it.
  error: string | null;
  nodes: SnapNode[];
  png: Buffer;
}

export class MissingBrowser extends Error {}

const require = createRequire(import.meta.url);

// Downloads Playwright's Chromium into its shared cache, with its progress on
// stderr so it doesn't mix with --json output.
function installChromium() {
  const cli = join(dirname(require.resolve('playwright')), 'cli.js');
  return spawnSync(process.execPath, [cli, 'install', 'chromium'], {stdio: ['ignore', 2, 2]}).status === 0;
}

const missing = (error: unknown) => /Executable doesn't exist|playwright install/i.test(String(error));

// A headless Chromium. Installed the first time a command needs one, so
// people who only view explainers never download it.
async function launch(): Promise<Browser> {
  const {chromium} = await import('playwright');
  try {
    return await chromium.launch();
  } catch (error) {
    if (!missing(error)) throw error;
  }
  process.stderr.write('Installing Chromium, which snap and check render in. This happens once.\n');
  if (!installChromium()) {
    throw new MissingBrowser(`Couldn't install Chromium. Retry with:\n  npx playwright install chromium`);
  }
  return chromium.launch();
}

// Builds and serves the explainer, opens each chosen section headless, and hands back
// every chosen beat paused at its end. With no `section`, every beat of every
// section; with no `beat`, every beat of that section.
export async function* drive({root, config}: Explainer, section?: string, beat?: string): AsyncGenerator<BeatSnap> {
  const browser = await launch();
  // A build, not the dev server: the dev server reloads pages when it finds a
  // dependency to optimize, mid-snap.
  const options = viteConfig(root, {logLevel: 'silent', build: {outDir: join(WORK_DIR, 'build')}, preview: {port: 0}});
  await build(options);
  const server = await preview(options);
  try {
    const url = server.resolvedUrls!.local[0];
    const page = await browser.newPage({viewport: {width: 1280, height: 860}});

    for (const {id} of config.sections) {
      if (section && id !== section) continue;
      await page.goto(`${url}sections/${id}.html?snap`);
      await page.waitForFunction(() => window.__explainer || document.body.dataset.error, undefined, {timeout: 30000});
      const error = await page.evaluate(() => document.body.dataset.error ?? null);
      if (error) {
        yield {section: id, beat: beat ?? '', error, nodes: [], png: Buffer.alloc(0)};
        continue;
      }
      const beats = await page.evaluate(async () => {
        await window.__explainer!.seek(window.__explainer!.beats()[0] ?? '');
        return window.__explainer!.beats();
      });
      for (const name of beats) {
        if (beat && name !== beat) continue;
        await page.evaluate(b => window.__explainer!.seek(b), name);
        const [nodes, png, failed] = await page.evaluate(() => [
          window.__explainer!.nodes(),
          window.__explainer!.png(),
          window.__explainer!.error(),
        ] as const);
        yield {section: id, beat: name, error: failed, nodes, png: Buffer.from(png.split(',')[1], 'base64')};
      }
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.httpServer.close(resolve));
  }
}

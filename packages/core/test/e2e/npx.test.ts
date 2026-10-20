import {execFile, spawn, type ChildProcess} from 'node:child_process';
import {cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import type {Browser} from 'playwright';
import {afterAll, beforeAll, expect, it} from 'vitest';

import {BASIC, launch} from './site.js';

const exec = promisify(execFile);

// Like `npx @explain-it/core`: core installed in one place, and a repo
// elsewhere whose explainer is only content and config. Both in the system's
// temp folder, so no node_modules sits above the explainer.
const scratch = mkdtempSync(join(tmpdir(), 'explain-it-npx-'));
const install = join(scratch, 'npx');
const repo = join(scratch, 'repo');
const bin = join(install, 'node_modules/@explain-it/core/bin/explainer.js');
const run = (args: string[], cwd: string) => exec('node', [bin, ...args], {cwd});

let browser: Browser;
let server: ChildProcess | null = null;

beforeAll(async () => {
  const core = join(import.meta.dirname, '../..');
  const {stdout} = await exec('npm', ['pack', '--silent', '--pack-destination', scratch], {cwd: core});
  mkdirSync(install);
  await exec('npm', ['init', '-y'], {cwd: install});
  await exec('npm', ['install', '--silent', join(scratch, stdout.trim())], {cwd: install});
  mkdirSync(join(repo, '.git'), {recursive: true});
  browser = await launch();
}, 300000);

afterAll(async () => {
  server?.kill();
  await browser?.close();
  rmSync(scratch, {recursive: true, force: true});
});

it('sets a repo up and creates an explainer that is only content and config', async () => {
  await run(['setup'], repo);
  await run(['new', 'starter'], repo);
  expect(readdirSync(join(repo, 'docs/explainers/starter')).sort()).toEqual(['explainer.config.ts', 'sections']);
  const {stdout} = await run(['check', '--static'], join(repo, 'docs/explainers/starter'));
  expect(stdout.trim()).toBe('✓ 1 section, 1 beat checked (static only).');
}, 120000);

it('checks and snaps an explainer with no node_modules, types and icons included', async () => {
  const dir = join(repo, 'docs/explainers/basic');
  mkdirSync(dir, {recursive: true});
  for (const entry of ['explainer.config.ts', 'theme.ts', 'sections']) cpSync(join(BASIC, entry), join(dir, entry), {recursive: true});
  expect(existsSync(join(dir, 'node_modules'))).toBe(false);

  const {stdout} = await run(['check'], dir);
  expect(stdout.trim()).toBe('✓ 2 sections, 6 beats checked.');
  await run(['snap', 'request', 'get'], dir);
  expect(existsSync(join(dir, '.explainer/snap/request/get.png'))).toBe(true);
}, 300000);

it('views an explainer by name from anywhere in the repo', async () => {
  server = spawn('node', [bin, 'view', 'basic', '--port', '5279', '--no-open'], {cwd: join(repo, 'docs')});
  const url = await new Promise<string>((resolve, reject) => {
    server!.stdout!.on('data', (data: Buffer) => {
      // Vite colours its output on CI, bolding the port: drop the escape codes.
      const match = /http:\/\/localhost:\d+\//.exec(String(data).replace(/\x1b\[[0-9;]*m/g, ''));
      if (match) resolve(match[0]);
    });
    server!.on('exit', code => reject(new Error(`view exited with ${code}`)));
  });
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${url}sections/request.html`);
  await page.waitForFunction(() => document.body.dataset.beat === 'parties', undefined, {timeout: 60000});
  expect(errors).toEqual([]);
}, 120000);

it('prints the authoring guide', async () => {
  const {stdout} = await run(['guide'], repo);
  expect(stdout).toMatch(/^# Writing explainers with @explain-it\/core/);
}, 30000);

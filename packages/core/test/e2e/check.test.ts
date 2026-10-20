import {execFile} from 'node:child_process';
import {join} from 'node:path';
import {promisify} from 'node:util';
import {expect, it} from 'vitest';

import {BASIC} from './site.js';

const bin = join(import.meta.dirname, '../../bin/explainer.js');
const run = (args: string[]) =>
  promisify(execFile)('node', [bin, ...args]).then(
    ({stdout}) => ({code: 0, stdout}),
    (error: {code: number; stdout: string}) => ({code: error.code, stdout: error.stdout}),
  );

it('passes the basic example', async () => {
  const {code, stdout} = await run(['check', '--root', BASIC]);
  expect(stdout.trim()).toBe('✓ 2 sections, 6 beats checked.');
  expect(code).toBe(0);
}, 120000);

it('reports layout problems by section and beat, as JSON', async () => {
  const {code, stdout} = await run(['check', '--json', '--root', join(import.meta.dirname, '../fixtures/bad-layout')]);
  const result = JSON.parse(stdout);
  expect(code).toBe(1);
  expect(result.ok).toBe(false);
  const messages = result.failures.map((f: {rule: string; message: string}) => `${f.rule}: ${f.message}`);
  expect(messages).toEqual([
    'off-frame: "box:Wide" is 40px past the right edge.',
    'text-overlap: Text "first" overlaps text "second".',
    'caption-overlap: "box:Low" overlaps the caption.',
  ]);
  expect(result.failures[0]).toMatchObject({section: 'crowded', beat: 'crowded', file: 'sections/crowded.tsx', line: null});
}, 120000);

it('runs only the source checks with --static', async () => {
  const {code, stdout} = await run(['check', '--static', '--root', join(import.meta.dirname, '../fixtures/bad-layout')]);
  expect(stdout.trim()).toBe('✓ 1 section, 1 beat checked (static only).');
  expect(code).toBe(0);
}, 120000);

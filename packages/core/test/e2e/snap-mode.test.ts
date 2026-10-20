import type {Browser} from 'playwright';
import {afterAll, beforeAll, expect, it} from 'vitest';

import {BASIC, launch, serveBuilt} from './site.js';

let site: Awaited<ReturnType<typeof serveBuilt>>;
let browser: Browser;

beforeAll(async () => {
  site = await serveBuilt(BASIC);
  browser = await launch();
}, 60000);

afterAll(async () => {
  await browser?.close();
  await site?.close();
});

it('exposes beats, seeking, nodes and the frame', async () => {
  const page = await browser.newPage();
  await page.goto(`${site.url}sections/request.html?snap`);
  await page.waitForFunction(() => window.__explainer);

  await expect(page.evaluate(() => window.__explainer!.seek('refused'))).resolves.toBe(true);
  await expect(page.evaluate(() => window.__explainer!.beats())).resolves.toEqual(['parties', 'get', 'refused']);
  await expect(page.evaluate(() => window.__explainer!.seek('nope'))).resolves.toBe(false);

  const nodes = await page.evaluate(() => window.__explainer!.nodes());
  const box = nodes.find(node => node.name === 'box:Server')!;
  // Centred at x=560 (+960), y=-120 (+540), 400 by 240, plus the outline.
  expect(box).toMatchObject({kind: 'named', inside: null});
  expect(Math.abs(box.x + box.width / 2 - 1520)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.y + box.height / 2 - 420)).toBeLessThanOrEqual(1);
  expect(nodes.find(node => node.name === 'caption')?.text).toContain('turned away');
  expect(nodes.find(node => node.name === 'caption')?.text).toBe('A request without a session is turned away with a `401`.');

  // Wires sit behind the boxes, though the scene adds the wire last.
  const order = nodes.map(node => node.name);
  expect(order.indexOf('wire')).toBeLessThan(order.indexOf('box:Browser'));

  // Tokens in flight are gone once each beat ends; a kept refusal stays.
  for (const [beat, left] of [['parties', []], ['get', []], ['refused', ['token:401']]] as const) {
    await page.evaluate(b => window.__explainer!.seek(b), beat);
    const tokens = await page.evaluate(() => window.__explainer!.nodes().filter(node => /^token:/.test(node.name)).map(node => node.name));
    expect(tokens, beat).toEqual(left);
  }

  const png = await page.evaluate(() => window.__explainer!.png());
  const size = await page.evaluate(src => new Promise<number[]>(resolve => {
    const image = new Image();
    image.onload = () => resolve([image.width, image.height]);
    image.src = src;
  }), png);
  expect(size).toEqual([1920, 1080]);
}, 30000);

it('measures a top-pinned panel from its top edge', async () => {
  const page = await browser.newPage();
  await page.goto(`${site.url}sections/response.html?snap`);
  await page.waitForFunction(() => window.__explainer);
  await page.evaluate(() => window.__explainer!.seek('body'));
  const panel = (await page.evaluate(() => window.__explainer!.nodes())).find(node => node.name === 'code:Response body')!;
  // Pinned at y=-340 with offset [0, -1]: its top edge is at 540 - 340.
  expect(panel.y).toBe(200);
  expect(panel.x).toBe(960 - 550);
}, 30000);

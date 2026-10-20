import type {Browser} from 'playwright';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {BASIC, launch, open, pausedAt, section, serveBuilt} from './site.js';

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

describe('player', () => {
  it('steps through beats and across sections', async () => {
    const {page, errors} = await open(browser, site.url);
    const frame = section(page);

    await pausedAt(page, '#request/parties');
    await expect(frame.locator('.beats li').count()).resolves.toBe(3);
    await expect(page.locator('.nav a[aria-current]').textContent()).resolves.toBe('Request');
    await expect(frame.locator('.back').textContent()).resolves.toBe('← Previous section');

    // Arrow key pressed with focus in the shell.
    await page.locator('.nav').click({position: {x: 5, y: 5}});
    await page.keyboard.press('ArrowRight');
    await pausedAt(page, '#request/get');
    await expect(frame.locator('.beats li.is-done').count()).resolves.toBe(2);
    await expect(frame.locator('.back').textContent()).resolves.toBe('← Back');

    // Click on the canvas.
    await frame.locator('.stage').click();
    await pausedAt(page, '#request/refused');
    await expect(frame.locator('.next').textContent()).resolves.toBe('Next section →');

    // Past the last beat.
    await frame.locator('.next').click();
    await pausedAt(page, '#response/body');
    await expect(page.locator('.nav a[aria-current]').textContent()).resolves.toBe('Response');
    await expect(page.locator('.nav a.is-past').textContent()).resolves.toBe('Request');

    // Before the first beat.
    await frame.locator('.back').click();
    await pausedAt(page, '#request/parties');

    expect(errors).toEqual([]);
  }, 60000);

  it('finishes a playing beat on next', async () => {
    const {page} = await open(browser, site.url);
    await pausedAt(page, '#request/parties');
    await section(page).locator('.next').click();
    // The beat now plays for over a second; a second press ends it at once.
    await page.waitForTimeout(100);
    await section(page).locator('.next').click();
    await pausedAt(page, '#request/get', 600);
  }, 30000);

  it('opens a deep link at its beat', async () => {
    const {page} = await open(browser, `${site.url}#response/items`);
    await pausedAt(page, '#response/items');
    await expect(section(page).locator('.beats li.is-done').count()).resolves.toBe(2);
  }, 30000);

  it('falls back to the first beat for an unknown beat', async () => {
    const {page} = await open(browser, `${site.url}#response/nope`);
    await pausedAt(page, '#response/body');
  }, 30000);

  it('falls back to the first section for an unknown section', async () => {
    const {page} = await open(browser, `${site.url}#nope`);
    await pausedAt(page, '#request/parties');
  }, 30000);

  it('jumps to a beat from its dot', async () => {
    const {page} = await open(browser, `${site.url}#request/refused`);
    await pausedAt(page, '#request/refused');
    const dots = section(page).locator('.beats button');
    await expect(dots.nth(0).getAttribute('aria-label')).resolves.toBe('Step 1 of 3');

    await dots.nth(0).click();
    await pausedAt(page, '#request/parties');
    await expect(dots.nth(0).getAttribute('aria-current')).resolves.toBe('step');

    await dots.nth(1).click();
    await pausedAt(page, '#request/get');
    await expect(section(page).locator('.beats li.is-done').count()).resolves.toBe(2);
  }, 30000);

  it('stops at the end of the last section', async () => {
    const {page} = await open(browser, `${site.url}#response/trimmed`);
    await pausedAt(page, '#response/trimmed');
    const next = section(page).locator('.next');
    await expect(next.textContent()).resolves.toBe('Next section →');
    await expect(next.isDisabled()).resolves.toBe(true);

    // Neither the canvas nor the arrow key leaves it.
    await section(page).locator('.stage').click();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    await pausedAt(page, '#response/trimmed', 1000);

    // Earlier beats of the last section still go on.
    await section(page).locator('.beats button').nth(1).click();
    await pausedAt(page, '#response/items');
    await expect(next.isDisabled()).resolves.toBe(false);
  }, 30000);

  it('steps beats with Back without adding history entries', async () => {
    const {page} = await open(browser, `${site.url}#request/refused`);
    await pausedAt(page, '#request/refused');
    const length = await page.evaluate(() => history.length);
    await section(page).locator('.back').click();
    await pausedAt(page, '#request/get');
    await expect(page.evaluate(() => history.length)).resolves.toBe(length);
  }, 30000);
});

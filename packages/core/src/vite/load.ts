import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

import {resolveConfig, validateConfig, type ResolvedConfig} from '../config/index.js';

export const CONFIG_FILE = 'explainer.config.ts';
// Generated files. Consumers gitignore it.
export const WORK_DIR = '.explainer';

// A config that can't be used. Each problem is one line for the user.
export class ExplainerError extends Error {
  public constructor(public readonly problems: string[]) {
    super(problems.join('\n'));
    this.name = 'ExplainerError';
  }
}

export interface Explainer {
  root: string;
  config: ResolvedConfig;
  sceneFile(id: string): string;
}

export function sceneFile(root: string, id: string) {
  return join(root, 'sections', `${id}.tsx`);
}

// Each load imports the compiled config under a new URL, so Node's module
// cache never hands back an old one.
let loads = 0;

// Compiles explainer.config.ts (and whatever it imports from the explainer, like
// theme.ts) to plain JS, imports it, and checks it.
export async function loadExplainer(root: string): Promise<Explainer> {
  root = resolve(root);
  const entry = join(root, CONFIG_FILE);
  if (!existsSync(entry)) throw new ExplainerError([`No ${CONFIG_FILE} in ${root}.`]);

  const outfile = join(root, WORK_DIR, 'config.mjs');
  await mkdir(join(root, WORK_DIR), {recursive: true});
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    logLevel: 'silent',
  });
  const module = await import(`${pathToFileURL(outfile).href}?load=${++loads}`);
  const raw = module.default;

  const problems = validateConfig(raw);
  if (problems.length === 0) {
    for (const {id} of raw.sections) {
      if (!existsSync(sceneFile(root, id))) {
        problems.push(`Section "${id}" has no scene file: sections/${id}.tsx`);
      }
    }
  }
  if (problems.length > 0) throw new ExplainerError(problems);

  return {root, config: resolveConfig(raw), sceneFile: id => sceneFile(root, id)};
}

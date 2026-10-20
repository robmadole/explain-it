import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import {basename, dirname, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

import {REPO_CONFIG_FILE, resolveConfig, validateConfig, type ExplainerConfig, type RepoConfig, type ResolvedConfig} from '../config/index.js';
import {CORE_DIR} from './own.js';

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

// Each load imports the compiled file under a new URL, so Node's module cache
// never hands back an old one.
let loads = 0;

// Compiles a config file (and whatever it imports from beside it, like
// theme.ts) to plain JS in `workDir` and imports its default export. The
// config helpers come from core's install, so no node_modules is needed.
export async function importConfig(entry: string, workDir: string): Promise<unknown> {
  const outfile = join(workDir, `${basename(entry, '.ts')}.mjs`);
  await mkdir(workDir, {recursive: true});
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    alias: {'@explain-it/core/config': join(CORE_DIR, 'dist/config/index.js')},
    logLevel: 'silent',
  });
  const module = await import(`${pathToFileURL(outfile).href}?load=${++loads}`);
  return module.default;
}

// Compiles explainer.config.ts, imports it, and checks it.
export async function loadExplainer(root: string): Promise<Explainer> {
  root = resolve(root);
  const entry = join(root, CONFIG_FILE);
  if (!existsSync(entry)) throw new ExplainerError([`No ${CONFIG_FILE} in ${root}.`]);

  const raw = (await importConfig(entry, join(root, WORK_DIR))) as ExplainerConfig;

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

export interface Repo {
  // The folder holding explain-it.config.ts.
  root: string;
  // The explainers folder, absolute.
  explainers: string;
}

// Finds explain-it.config.ts in `from` or a folder above it, stopping at the
// repo's root (the folder with .git). Null when there isn't one.
export async function findRepo(from: string): Promise<Repo | null> {
  let dir = resolve(from);
  for (;;) {
    const entry = join(dir, REPO_CONFIG_FILE);
    if (existsSync(entry)) {
      const config = (await importConfig(entry, join(dir, WORK_DIR))) as Partial<RepoConfig> | undefined;
      if (!config || typeof config.explainers !== 'string' || !config.explainers) {
        throw new ExplainerError([`${REPO_CONFIG_FILE} needs an \`explainers\` folder, like defineRepo({explainers: 'docs/explainers'}).`]);
      }
      return {root: dir, explainers: resolve(dir, config.explainers)};
    }
    const up = dirname(dir);
    if (existsSync(join(dir, '.git')) || up === dir) return null;
    dir = up;
  }
}

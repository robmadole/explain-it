import {appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import ts from 'typescript';

import {REPO_CONFIG_FILE} from '../config/index.js';
import {CONFIG_FILE, ExplainerError, findRepo, loadExplainer} from '../vite/load.js';

// How agents in a repo find the authoring guide: the CLI prints the one for
// the version it runs, so nothing points into node_modules.
export const GUIDE_COMMAND = 'npx @explain-it/core guide';
const GUIDE_LINE = `- Explainers: run \`${GUIDE_COMMAND}\` for the authoring guide before creating or changing one.\n`;

const ID = /^[a-z0-9][a-z0-9-]*$/;

function title(id: string) {
  return id.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

function sceneSource(heading: string) {
  return `import {beat, Box, rise, scene} from '@explain-it/core';

export default scene(function* ({add}) {
  const box = add(<Box title=${JSON.stringify(heading)} opacity={0} />);

  yield* beat('start', 'Replace this with the first idea of the section.', function* () {
    yield* rise(box);
  });
});
`;
}

function configSource(heading: string) {
  return `import {defineExplainer, defineTheme} from '@explain-it/core/config';

export default defineExplainer({
  title: ${quote(heading)},
  // Add a role for each kind of party: defineTheme({client: '#f2b84b'}).
  theme: defineTheme({}),
  sections: [
    {id: 'intro', label: 'Intro'},
  ],
});
`;
}

function repoSource(explainers: string) {
  return `import {defineRepo} from '@explain-it/core/config';

export default defineRepo({
  // Where \`npx @explain-it/core new\` puts explainers, and where \`view\` finds them.
  explainers: ${quote(explainers)},
});
`;
}

// Adds the pointer to the authoring guide to CLAUDE.md, once.
export function linkGuide(root: string) {
  const file = join(root, 'CLAUDE.md');
  if (!existsSync(file)) {
    writeFileSync(file, `# CLAUDE.md\n\n${GUIDE_LINE}`);
    return true;
  }
  const text = readFileSync(file, 'utf8');
  if (text.includes(GUIDE_COMMAND)) return false;
  appendFileSync(file, `${text.endsWith('\n') ? '' : '\n'}${text.trim() ? '\n' : ''}${GUIDE_LINE}`);
  return true;
}

// Adds lines to .gitignore that aren't there yet. Returns whether it wrote.
function ignore(root: string, lines: string[]) {
  const file = join(root, '.gitignore');
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const have = text.split('\n');
  const missing = lines.filter(line => !have.includes(line));
  if (missing.length === 0) return false;
  writeFileSync(file, `${text}${text && !text.endsWith('\n') ? '\n' : ''}${missing.join('\n')}\n`);
  return true;
}

export interface SetupOptions {
  // The explainers folder, relative to `root`.
  explainers?: string;
}

// Sets a repo (or any folder) up for explainers. Leaves what's already there;
// safe to run again. Returns the files it wrote.
export function setup(root: string, {explainers = 'docs/explainers'}: SetupOptions = {}): string[] {
  const written: string[] = [];
  const configFile = join(root, REPO_CONFIG_FILE);
  if (!existsSync(configFile)) {
    writeFileSync(configFile, repoSource(explainers));
    written.push(REPO_CONFIG_FILE);
  }
  // Generated per explainer: the snap/build work folder and the built site.
  const folder = explainers.replace(/\/+$/, '');
  if (ignore(root, [`${folder}/*/.explainer/`, `${folder}/*/dist/`])) written.push('.gitignore');
  if (linkGuide(root)) written.push('CLAUDE.md');
  return written;
}

// Creates explainer `name` in the repo's explainers folder: a config and one
// starter section, nothing else. Returns its folder.
export async function newExplainer(from: string, name: string): Promise<string> {
  if (!ID.test(name)) throw new ExplainerError([`"${name}" isn't an explainer name: use lowercase letters, digits and dashes.`]);
  const repo = await findRepo(from);
  if (!repo) {
    throw new ExplainerError([`No ${REPO_CONFIG_FILE} here or above. Run \`npx @explain-it/core setup\` first.`]);
  }
  const dir = join(repo.explainers, name);
  if (existsSync(dir)) throw new ExplainerError([`${relative(from, dir) || dir} already exists.`]);
  mkdirSync(join(dir, 'sections'), {recursive: true});
  writeFileSync(join(dir, CONFIG_FILE), configSource(title(name)));
  writeFileSync(join(dir, 'sections/intro.tsx'), sceneSource('Intro'));
  return dir;
}

export interface NewSection {
  id: string;
  label?: string;
  source?: string;
}

// The `sections: [...]` array in the config's defineExplainer({...}) call.
function sectionsArray(source: ts.SourceFile): ts.ArrayLiteralExpression | null {
  let found: ts.ArrayLiteralExpression | null = null;
  const visit = (node: ts.Node) => {
    if (
      !found &&
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'sections' &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      found = node.initializer;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

// Adds section `id` to an existing explainer: a scene file and a config entry.
export async function newSection(root: string, {id, label = title(id), source}: NewSection): Promise<string[]> {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new ExplainerError([`"${id}" isn't a section id: use lowercase letters, digits and dashes.`]);
  const {config} = await loadExplainer(root);
  if (config.sections.some(section => section.id === id)) throw new ExplainerError([`Section "${id}" already exists.`]);
  const scene = join(root, 'sections', `${id}.tsx`);
  if (existsSync(scene)) throw new ExplainerError([`sections/${id}.tsx already exists.`]);

  const configFile = join(root, CONFIG_FILE);
  const text = readFileSync(configFile, 'utf8');
  const array = sectionsArray(ts.createSourceFile(configFile, text, ts.ScriptTarget.Latest, true));
  if (!array) throw new ExplainerError([`Couldn't find the \`sections\` array in ${CONFIG_FILE}; add the section by hand.`]);

  const entry = `{id: ${quote(id)}, label: ${quote(label)}${source ? `, source: ${quote(source)}` : ''}}`;
  const last = array.elements.at(-1);
  let updated: string;
  if (!last) {
    updated = `${text.slice(0, array.getStart() + 1)}${entry}${text.slice(array.getEnd() - 1)}`;
  } else {
    // Match the indent of the last entry, and keep a trailing comma if there was one.
    const lineStart = text.lastIndexOf('\n', last.getStart()) + 1;
    const indent = text.slice(lineStart, last.getStart());
    const insert = /^\s*$/.test(indent) && indent.length > 0 ? `,\n${indent}${entry}` : `, ${entry}`;
    const at = last.getEnd();
    // A trailing comma after the old last entry now follows the new one.
    updated = `${text.slice(0, at)}${insert}${text.slice(at)}`;
  }
  writeFileSync(configFile, updated);
  mkdirSync(join(root, 'sections'), {recursive: true});
  writeFileSync(scene, sceneSource(label));
  return [CONFIG_FILE, `sections/${id}.tsx`];
}

function quote(text: string) {
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

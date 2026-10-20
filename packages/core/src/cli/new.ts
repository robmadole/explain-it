import {appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import ts from 'typescript';

import {CONFIG_FILE, ExplainerError, loadExplainer} from '../vite/load.js';

const require = createRequire(import.meta.url);
const VERSION: string = require('../../package.json').version;

export const GUIDE = 'node_modules/@explain-it/core/AGENTS.md';
const GUIDE_LINE = `- Explainer authoring guide: \`${GUIDE}\`. Read it before changing \`explainer.config.ts\` or \`sections/\`.\n`;

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

const CONFIG = `import {defineExplainer} from '@explain-it/core/config';

import {theme} from './theme';

export default defineExplainer({
  title: 'Explainer',
  theme,
  sections: [
    {id: 'intro', label: 'Intro'},
  ],
});
`;

const THEME = `import {defineTheme} from '@explain-it/core/config';

// Add roles for the parties in your explainer: defineTheme({client: '#f2b84b'}).
export const theme = defineTheme({});
`;

const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "@motion-canvas/2d/lib",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "experimentalDecorators": true
  },
  "include": ["explainer.config.ts", "theme.ts", "sections"]
}
`;

const SCRIPTS = {dev: 'explainer dev', build: 'explainer build', snap: 'explainer snap', check: 'explainer check'};
const DEPENDENCIES = {
  '@explain-it/core': `^${VERSION}`,
  '@motion-canvas/2d': '~3.17.2',
  '@motion-canvas/core': '~3.17.2',
  vite: '^5.4.11',
};
const DEV_DEPENDENCIES = {playwright: '^1.64.1'};

// Writes `file` unless it exists. Returns whether it wrote.
function create(file: string, content: string) {
  if (existsSync(file)) return false;
  writeFileSync(file, content);
  return true;
}

// Adds the pointer to the authoring guide, once.
export function linkGuide(root: string) {
  const file = join(root, 'CLAUDE.md');
  if (!existsSync(file)) {
    writeFileSync(file, `# CLAUDE.md\n\n${GUIDE_LINE}`);
    return true;
  }
  const text = readFileSync(file, 'utf8');
  if (text.includes(GUIDE)) return false;
  appendFileSync(file, `${text.endsWith('\n') ? '' : '\n'}${text.trim() ? '\n' : ''}${GUIDE_LINE}`);
  return true;
}

// Starts an explainer in `root`. Leaves files that already exist alone, except
// for adding missing scripts and dependencies to package.json and lines to
// .gitignore.
export function newExplainer(root: string): string[] {
  const written: string[] = [];
  mkdirSync(join(root, 'sections'), {recursive: true});
  if (create(join(root, CONFIG_FILE), CONFIG)) written.push(CONFIG_FILE);
  if (create(join(root, 'theme.ts'), THEME)) written.push('theme.ts');
  if (create(join(root, 'tsconfig.json'), TSCONFIG)) written.push('tsconfig.json');
  if (create(join(root, 'sections/intro.tsx'), sceneSource('Intro'))) written.push('sections/intro.tsx');

  const pkgFile = join(root, 'package.json');
  const pkg = existsSync(pkgFile) ? JSON.parse(readFileSync(pkgFile, 'utf8')) : {name: 'explainer', private: true, type: 'module'};
  pkg.scripts = {...SCRIPTS, ...pkg.scripts};
  pkg.dependencies = {...DEPENDENCIES, ...pkg.dependencies};
  pkg.devDependencies = {...DEV_DEPENDENCIES, ...pkg.devDependencies};
  writeFileSync(pkgFile, `${JSON.stringify(pkg, null, 2)}\n`);
  written.push('package.json');

  const ignoreFile = join(root, '.gitignore');
  const ignored = existsSync(ignoreFile) ? readFileSync(ignoreFile, 'utf8').split('\n') : [];
  const missing = ['node_modules', 'dist', '.explainer'].filter(line => !ignored.includes(line) && !ignored.includes(`${line}/`));
  if (missing.length > 0) {
    const text = existsSync(ignoreFile) ? readFileSync(ignoreFile, 'utf8') : '';
    writeFileSync(ignoreFile, `${text}${text && !text.endsWith('\n') ? '\n' : ''}${missing.join('\n')}\n`);
    written.push('.gitignore');
  }

  if (linkGuide(root)) written.push('CLAUDE.md');
  return written;
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

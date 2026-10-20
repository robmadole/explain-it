import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';

// Packages an explainer may import without installing anything: they resolve
// from core's own install, wherever that is (npx's cache, a node_modules).
// An explainer is only content and config.
export const OWN_PACKAGES = [
  '@motion-canvas/core',
  '@motion-canvas/2d',
  '@fortawesome/free-solid-svg-icons',
  '@fortawesome/free-regular-svg-icons',
  '@fortawesome/free-brands-svg-icons',
  '@fortawesome/fontawesome-common-types',
];

const require = createRequire(import.meta.url);

export function packageDir(name: string) {
  return dirname(require.resolve(`${name}/package.json`));
}

// Core's own folder: dist/ and package.json sit under it.
export const CORE_DIR = packageDir('@explain-it/core');

// Where each importable name points: core's entry points by its exports, and
// the other packages by folder, so their subpaths (`@motion-canvas/2d/lib/…`)
// resolve inside them.
export function ownAliases() {
  return [
    {find: /^@explain-it\/core$/, replacement: join(CORE_DIR, 'dist/index.js')},
    {find: /^@explain-it\/core\/config$/, replacement: join(CORE_DIR, 'dist/config/index.js')},
    {find: /^@explain-it\/core\/runtime\/(.*)$/, replacement: join(CORE_DIR, 'dist/runtime/$1')},
    ...OWN_PACKAGES.map(name => ({find: name, replacement: packageDir(name)})),
  ];
}

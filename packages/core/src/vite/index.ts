import {mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {searchForWorkspaceRoot, type Plugin} from 'vite';

import {themeCss} from '../theme/index.js';
import {CONFIG_FILE, loadExplainer, WORK_DIR, type Explainer} from './load.js';

export {ExplainerError, loadExplainer, type Explainer} from './load.js';

export interface ExplainerPluginOptions {
  // The directory holding explainer.config.ts. Defaults to the working directory.
  root?: string;
}

// The site Vite serves and builds: generated HTML pages only. Scenes stay
// where the consumer wrote them.
export const SITE_DIR = join(WORK_DIR, 'site');

const CONFIG_ID = 'virtual:explain-it/config';
const SECTIONS_ID = 'virtual:explain-it/sections';
const PROJECT_ID = 'virtual:explain-it/project/';

// 1920x1080 at 60 fps. The section canvas scales to fit its frame.
const PROJECT_META = {
  version: 0,
  shared: {background: null, range: [0, null], size: {x: 1920, y: 1080}, audioOffset: 0},
  preview: {fps: 60, resolutionScale: 1},
  rendering: {
    fps: 60,
    resolutionScale: 1,
    colorSpace: 'srgb',
    exporter: {name: '@motion-canvas/core/image-sequence', options: {fileType: 'image/png', quality: 100, groupByScene: false}},
  },
};

export function explainer({root = process.cwd()}: ExplainerPluginOptions = {}): Plugin {
  root = resolve(root);
  let explainer: Explainer;

  return {
    name: 'explain-it',

    async config(user, {command}) {
      explainer = await loadExplainer(root);
      writePages(explainer);
      const site = join(root, SITE_DIR);
      const sections = explainer.config.sections;

      return {
        root: site,
        base: './',
        // Hashes in the section pages are beats, not routes.
        appType: 'mpa',
        server: {
          fs: {allow: [searchForWorkspaceRoot(root), dirname(require.resolve('@explain-it/core/package.json'))]},
          // The pages are generated; the scenes and config are what change.
          watch: {ignored: ['**/.explainer/**', '**/dist/**']},
        },
        build: {
          outDir: user.build?.outDir ? resolve(root, user.build.outDir) : join(root, 'dist'),
          emptyOutDir: true,
          rollupOptions: {
            input: {
              shell: join(site, 'index.html'),
              ...Object.fromEntries(sections.map(({id}) => [id, join(site, 'sections', `${id}.html`)])),
            },
          },
        },
        esbuild: {jsx: 'automatic', jsxImportSource: '@motion-canvas/2d/lib'},
        resolve: {dedupe: ['@motion-canvas/core', '@motion-canvas/2d']},
        optimizeDeps: {
          // The runtime imports this plugin's virtual modules, which a
          // pre-bundle couldn't resolve.
          exclude: ['@explain-it/core'],
          // The JSX runtimes are imported by compiled JSX, which the scanner
          // can't see; finding them late reloads the page.
          include: [
            '@motion-canvas/core',
            '@motion-canvas/2d',
            '@motion-canvas/2d/lib/jsx-runtime',
            '@motion-canvas/2d/lib/jsx-dev-runtime',
          ],
          entries: sections.map(({id}) => explainer.sceneFile(id)),
        },
        define: {__EXPLAINER_DEV__: JSON.stringify(command === 'serve')},
      };
    },

    resolveId(id) {
      if (id === CONFIG_ID || id === SECTIONS_ID || id.startsWith(PROJECT_ID)) return `\0${id}`;
    },

    load(id) {
      if (!id.startsWith('\0')) return;
      id = id.slice(1);
      const {config} = explainer;
      if (id === CONFIG_ID) return `export default ${JSON.stringify(config)};`;
      if (id === SECTIONS_ID) {
        const entries = config.sections.map(({id}) => `  ${JSON.stringify(id)}: () => import('${PROJECT_ID}${id}'),`);
        return `export default {\n${entries.join('\n')}\n};`;
      }
      if (id.startsWith(PROJECT_ID)) return projectModule(explainer, id.slice(PROJECT_ID.length), root);
    },

    configureServer(server) {
      // Vite watches its root, which is the generated site. Watch the
      // explainer itself; a config change rewrites the pages and reloads
      // everything.
      server.watcher.add(root);
      server.watcher.on('change', async file => {
        if (file !== join(root, CONFIG_FILE) && !file.startsWith(join(root, 'theme'))) return;
        try {
          explainer = await loadExplainer(root);
          writePages(explainer);
          for (const id of [CONFIG_ID, SECTIONS_ID]) {
            const module = server.moduleGraph.getModuleById(`\0${id}`);
            if (module) server.moduleGraph.invalidateModule(module);
          }
          server.ws.send({type: 'full-reload'});
        } catch (error) {
          server.config.logger.error(String(error));
        }
      });
    },
  };
}

const require = createRequire(import.meta.url);

function version(name: string, root: string) {
  try {
    const path = createRequire(join(root, 'package.json')).resolve(`${name}/package.json`);
    return JSON.parse(readFileSync(path, 'utf8')).version as string;
  } catch {
    return null;
  }
}

// A Motion Canvas project holding one section's scene. The meta files are in
// memory only (source `false`), so nothing is ever written next to the scene.
function projectModule({config, sceneFile}: Explainer, id: string, root: string) {
  const versions = {core: version('@motion-canvas/core', root), two: version('@motion-canvas/2d', root), ui: null, vitePlugin: null};
  const sceneMeta = {version: 0, timeEvents: [], seed: config.seed};
  return `\
import {bootstrap, MetaFile, ValueDispatcher} from '@motion-canvas/core';
import description from ${JSON.stringify(sceneFile(id))};

const sceneMeta = new MetaFile(${JSON.stringify(id)}, false);
sceneMeta.loadData(${JSON.stringify(sceneMeta)});
description.name = ${JSON.stringify(id)};
sceneMeta.attach(description.meta);
description.onReplaced ??= new ValueDispatcher(description.config);

const projectMeta = new MetaFile('project', false);
projectMeta.loadData(${JSON.stringify(PROJECT_META)});
const settings = new MetaFile('settings', false);
settings.loadData({});

export default bootstrap(${JSON.stringify(id)}, ${JSON.stringify(versions)}, [], {scenes: [description]}, projectMeta, settings);
`;
}

function escape(text: string) {
  return text.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]!);
}

function page(title: string, theme: Record<string, string>, body: string, script: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escape(title)}</title>
    <style>
${themeCss(theme)}    </style>
  </head>
${body}
    <script type="module">import '@explain-it/core/runtime/${script}';</script>
  </body>
</html>
`;
}

// The shell and one page per section, from the config.
function writePages({root, config}: Explainer) {
  const site = join(root, SITE_DIR);
  rmSync(site, {recursive: true, force: true});
  mkdirSync(join(site, 'sections'), {recursive: true});

  const links = config.sections.map(({id, label}) => `        <li><a href="#${id}">${escape(label)}</a></li>`);
  writeFileSync(
    join(site, 'index.html'),
    page(
      config.title,
      config.theme,
      `  <body>
    <nav class="nav" aria-label="Sections">
      <ol>
${links.join('\n')}
      </ol>
    </nav>
    <iframe class="section" title="Section"></iframe>`,
      'shell.js',
    ),
  );

  for (const {id, label} of config.sections) {
    writeFileSync(
      join(site, 'sections', `${id}.html`),
      page(
        `${label} · ${config.title}`,
        config.theme,
        `  <body data-section="${id}">
    <main class="stage"></main>
    <footer class="controls">
      <button class="back" type="button">← Back</button>
      <ol class="beats" aria-label="Steps"></ol>
      <button class="next" type="button">Next →</button>
    </footer>`,
        'section.js',
      ),
    );
  }
}

import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {build, createServer} from 'vite';

import {staticChecks} from '../review/check.js';
import {drive, MissingBrowser} from '../review/drive.js';
import {failure, formatFailure, type Failure} from '../review/failures.js';
import {layoutChecks} from '../review/layout.js';
import {outline, outlineMarkdown} from '../review/outline.js';
import {CONFIG_FILE, ExplainerError, loadExplainer, WORK_DIR} from '../vite/load.js';
import {newExplainer, newSection} from './new.js';
import {viteConfig} from './vite-config.js';

export {viteConfig} from './vite-config.js';

const USAGE = `Usage: explainer <command> [options]

Commands:
  new [id]                 Start an explainer here, or add section <id> to it
  dev                      Serve the explainer, reloading on change
  build                    Build the static site into dist/
  outline                  Print every section's beats and captions
  snap [section] [beat]    Render beats to .explainer/snap/ as PNG and JSON
  check                    Check structure, captions and layout

Run a command with --help for its options.
`;

async function dev(args: string[]) {
  const {values} = parseArgs({args, options: {port: {type: 'string'}, root: {type: 'string', default: '.'}}});
  const server = await createServer(viteConfig(resolve(values.root!), {server: {port: values.port ? Number(values.port) : 5173}}));
  await server.listen();
  server.printUrls();
  // Runs until interrupted.
  await new Promise(() => {});
  return 0;
}

async function buildSite(args: string[]) {
  const {values} = parseArgs({args, options: {root: {type: 'string', default: '.'}}});
  await build(viteConfig(resolve(values.root!)));
  return 0;
}

function print(json: boolean, data: unknown, text: string) {
  process.stdout.write(json ? `${JSON.stringify(data, null, 2)}\n` : text.endsWith('\n') ? text : `${text}\n`);
}

async function outlineCommand(args: string[]) {
  const {values} = parseArgs({args, options: {section: {type: 'string'}, json: {type: 'boolean'}, root: {type: 'string', default: '.'}}});
  const explainer = await loadExplainer(resolve(values.root!));
  const result = outline(explainer, values.section);
  if (values.section && result.sections.length === 0) {
    process.stderr.write(`✗ No section "${values.section}".\n`);
    return 1;
  }
  print(!!values.json, result, outlineMarkdown(result));
  return 0;
}

async function snap(args: string[]) {
  const {values, positionals} = parseArgs({
    args,
    allowPositionals: true,
    options: {json: {type: 'boolean'}, root: {type: 'string', default: '.'}},
  });
  const [section, beat] = positionals;
  const explainer = await loadExplainer(resolve(values.root!));
  if (section && !explainer.config.sections.some(({id}) => id === section)) {
    process.stderr.write(`✗ No section "${section}".\n`);
    return 1;
  }

  const snaps = [];
  let failed = false;
  for await (const shot of drive(explainer, section, beat)) {
    if (shot.error) {
      process.stderr.write(`✗ ${shot.section}: ${shot.error}\n`);
      failed = true;
      continue;
    }
    const dir = join(explainer.root, WORK_DIR, 'snap', shot.section);
    mkdirSync(dir, {recursive: true});
    const png = join(dir, `${shot.beat}.png`);
    const json = join(dir, `${shot.beat}.json`);
    writeFileSync(png, shot.png);
    const caption = shot.nodes.find(node => node.name === 'caption')?.text ?? null;
    writeFileSync(json, `${JSON.stringify({section: shot.section, beat: shot.beat, caption, nodes: shot.nodes}, null, 2)}\n`);
    snaps.push({section: shot.section, beat: shot.beat, png: relative(process.cwd(), png), json: relative(process.cwd(), json)});
  }
  if (beat && snaps.length === 0 && !failed) {
    process.stderr.write(`✗ No beat "${beat}" in section "${section}".\n`);
    return 1;
  }
  print(!!values.json, {snaps}, snaps.map(s => `${s.png}\n${s.json}`).join('\n'));
  return failed ? 1 : 0;
}

async function check(args: string[]) {
  const {values} = parseArgs({args, options: {static: {type: 'boolean'}, json: {type: 'boolean'}, root: {type: 'string', default: '.'}}});
  const root = resolve(values.root!);
  const failures: Failure[] = [];
  let sections = 0;
  let beats = 0;

  let explainer;
  try {
    explainer = await loadExplainer(root);
  } catch (error) {
    if (!(error instanceof ExplainerError)) throw error;
    failures.push(...error.problems.map(problem => failure('config', problem, {file: 'explainer.config.ts'})));
  }

  if (explainer) {
    const result = staticChecks(explainer);
    failures.push(...result.failures);
    sections = result.sections;
    beats = result.beats;

    if (!values.static) {
      const files = Object.fromEntries(explainer.config.sections.map(({id}) => [id, `sections/${id}.tsx`]));
      for await (const shot of drive(explainer)) {
        const at = {section: shot.section, file: files[shot.section]};
        if (shot.error) failures.push(failure('error', shot.error, at));
        else failures.push(...layoutChecks(shot.nodes, {...at, beat: shot.beat}));
      }
    }
  }

  const summary = `${sections} section${sections === 1 ? '' : 's'}, ${beats} beat${beats === 1 ? '' : 's'}`;
  const text =
    failures.length === 0
      ? `✓ ${summary} checked${values.static ? ' (static only)' : ''}.`
      : `${failures.map(formatFailure).join('\n')}\n\n✗ ${failures.length} problem${failures.length === 1 ? '' : 's'}. Checked ${summary}.`;
  print(!!values.json, {ok: failures.length === 0, sections, beats, failures}, text);
  return failures.length === 0 ? 0 : 1;
}

async function create(args: string[]) {
  const {values, positionals} = parseArgs({
    args,
    allowPositionals: true,
    options: {label: {type: 'string'}, source: {type: 'string'}, root: {type: 'string', default: '.'}},
  });
  const root = resolve(values.root!);
  const [id] = positionals;
  const written: string[] = [];
  if (!id || !existsSync(join(root, CONFIG_FILE))) written.push(...newExplainer(root));
  if (id) written.push(...(await newSection(root, {id, label: values.label, source: values.source})));
  process.stdout.write(`${[...new Set(written)].map(file => `✓ ${file}`).join('\n')}\n`);
  return 0;
}

const commands: Record<string, (args: string[]) => Promise<number>> = {
  new: create,
  dev,
  build: buildSite,
  outline: outlineCommand,
  snap,
  check,
};

const HELP: Record<string, string> = {
  new: `Usage: explainer new [id] [--label <label>] [--source <anchor>] [--root <dir>]

Without an id, starts an explainer in the directory. With one, adds section
<id>: a scene file and a config entry. Remove a section by deleting both.
`,
  dev: 'Usage: explainer dev [--port <port>] [--root <dir>]\n',
  build: 'Usage: explainer build [--root <dir>]\n\nBuilds the static site into dist/.\n',
  outline: 'Usage: explainer outline [--section <id>] [--json] [--root <dir>]\n',
  snap: `Usage: explainer snap [section] [beat] [--json] [--root <dir>]

Writes .explainer/snap/<section>/<beat>.png and .json for each beat, at the
moment the beat ends.
`,
  check: `Usage: explainer check [--static] [--json] [--root <dir>]

--static runs only the checks that read source; no browser needed.
`,
};

export async function main(argv: string[]): Promise<number> {
  const [name, ...args] = argv;
  const command = name ? commands[name] : undefined;
  if (command && (args.includes('--help') || args.includes('-h'))) {
    process.stdout.write(HELP[name!]);
    return 0;
  }
  if (!command) {
    process.stdout.write(USAGE);
    return name && name !== '--help' && name !== 'help' ? 1 : 0;
  }
  try {
    return await command(args);
  } catch (error) {
    if (error instanceof ExplainerError) {
      process.stderr.write(`${error.problems.map(problem => `✗ ${problem}`).join('\n')}\n`);
      return 1;
    }
    if (error instanceof MissingBrowser) {
      process.stderr.write(`✗ ${error.message}\n`);
      return 1;
    }
    throw error;
  }
}

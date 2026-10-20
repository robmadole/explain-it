import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {createInterface} from 'node:readline/promises';
import {parseArgs} from 'node:util';
import {build, createServer} from 'vite';

import {staticChecks} from '../review/check.js';
import {drive, MissingBrowser} from '../review/drive.js';
import {failure, formatFailure, type Failure} from '../review/failures.js';
import {layoutChecks} from '../review/layout.js';
import {outline, outlineMarkdown} from '../review/outline.js';
import {REPO_CONFIG_FILE} from '../config/index.js';
import {CONFIG_FILE, ExplainerError, findRepo, loadExplainer, WORK_DIR} from '../vite/load.js';
import {CORE_DIR} from '../vite/own.js';
import {newExplainer, newSection, setup} from './new.js';
import {viteConfig} from './vite-config.js';

export {viteConfig} from './vite-config.js';

const USAGE = `Usage: npx @explain-it/core <command> [options]

For people:
  setup [dir]              Set a repo up for explainers
  new <name>               Create an explainer in the repo's explainers folder
  view [name|dir]          Open an explainer in the browser, reloading on change

For agents writing explainers:
  guide                    Print the authoring guide
  section <id>             Add a section to the explainer here
  outline                  Print every section's beats and captions
  snap [section] [beat]    Render beats to .explainer/snap/ as PNG and JSON
  check                    Check structure, captions and layout
  build                    Build the static site into dist/

Run a command with --help for its options.
`;

async function setupCommand(args: string[]) {
  const {values, positionals} = parseArgs({
    args,
    allowPositionals: true,
    options: {explainers: {type: 'string'}},
  });
  const root = resolve(positionals[0] ?? '.');
  mkdirSync(root, {recursive: true});
  const written = setup(root, {explainers: values.explainers});
  process.stdout.write(written.length ? `${written.map(file => `✓ ${file}`).join('\n')}\n` : '✓ Already set up.\n');
  process.stdout.write('\nNext: npx @explain-it/core new <name>\n');
  return 0;
}

async function create(args: string[]) {
  const {positionals} = parseArgs({args, allowPositionals: true, options: {}});
  const [name] = positionals;
  if (!name) {
    process.stderr.write('✗ Name the explainer: npx @explain-it/core new <name>\n');
    return 1;
  }
  const dir = await newExplainer(process.cwd(), name);
  const shown = relative(process.cwd(), dir) || dir;
  process.stdout.write(`✓ ${join(shown, CONFIG_FILE)}\n✓ ${join(shown, 'sections/intro.tsx')}\n\nNext: npx @explain-it/core view ${name}\n`);
  return 0;
}

async function section(args: string[]) {
  const {values, positionals} = parseArgs({
    args,
    allowPositionals: true,
    options: {label: {type: 'string'}, source: {type: 'string'}, root: {type: 'string', default: '.'}},
  });
  const [id] = positionals;
  if (!id) {
    process.stderr.write('✗ Name the section: npx @explain-it/core section <id>\n');
    return 1;
  }
  const written = await newSection(resolve(values.root!), {id, label: values.label, source: values.source});
  process.stdout.write(`${written.map(file => `✓ ${file}`).join('\n')}\n`);
  return 0;
}

// The explainers in a repo's explainers folder: subfolders with a config.
function explainersIn(folder: string) {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, {withFileTypes: true})
    .filter(entry => entry.isDirectory() && existsSync(join(folder, entry.name, CONFIG_FILE)))
    .map(entry => entry.name)
    .sort();
}

// Which explainer `view` means: a folder, a name in the repo's explainers
// folder, the explainer here, or the only one, or one the person picks.
async function locate(arg: string | undefined): Promise<string> {
  const cwd = process.cwd();
  if (arg) {
    const path = resolve(arg);
    if (existsSync(join(path, CONFIG_FILE))) return path;
    const repo = await findRepo(cwd);
    if (repo && existsSync(join(repo.explainers, arg, CONFIG_FILE))) return join(repo.explainers, arg);
    throw new ExplainerError([
      `No explainer "${arg}": it isn't a folder with ${CONFIG_FILE}${repo ? `, or a name in ${relative(cwd, repo.explainers) || '.'}` : ''}.`,
    ]);
  }
  if (existsSync(join(cwd, CONFIG_FILE))) return cwd;
  const repo = await findRepo(cwd);
  if (!repo) {
    throw new ExplainerError([`No explainer here, and no ${REPO_CONFIG_FILE} here or above. Run \`npx @explain-it/core setup\`, or pass a folder.`]);
  }
  const names = explainersIn(repo.explainers);
  if (names.length === 0) {
    throw new ExplainerError([`No explainers in ${relative(cwd, repo.explainers) || '.'} yet. Create one with \`npx @explain-it/core new <name>\`.`]);
  }
  if (names.length === 1) return join(repo.explainers, names[0]);
  if (!process.stdin.isTTY) throw new ExplainerError([`Name the explainer to view: ${names.join(', ')}.`]);

  names.forEach((name, i) => process.stdout.write(`  ${i + 1}. ${name}\n`));
  const prompt = createInterface({input: process.stdin, output: process.stdout});
  const answer = (await prompt.question('Which one? ')).trim();
  prompt.close();
  const picked = names[Number(answer) - 1] ?? names.find(name => name === answer);
  if (!picked) throw new ExplainerError([`No explainer "${answer}".`]);
  return join(repo.explainers, picked);
}

async function view(args: string[]) {
  const {values, positionals} = parseArgs({
    args,
    allowPositionals: true,
    allowNegative: true,
    options: {port: {type: 'string'}, open: {type: 'boolean', default: true}, root: {type: 'string'}},
  });
  const root = values.root ? resolve(values.root) : await locate(positionals[0]);
  const server = await createServer(
    viteConfig(root, {server: {port: values.port ? Number(values.port) : 5173, open: values.open}}),
  );
  await server.listen();
  server.printUrls();
  // Runs until interrupted.
  await new Promise(() => {});
  return 0;
}

async function guide() {
  process.stdout.write(readFileSync(join(CORE_DIR, 'AGENTS.md'), 'utf8'));
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

const commands: Record<string, (args: string[]) => Promise<number>> = {
  setup: setupCommand,
  new: create,
  view,
  // The old name for view.
  dev: view,
  guide,
  section,
  build: buildSite,
  outline: outlineCommand,
  snap,
  check,
};

const HELP: Record<string, string> = {
  setup: `Usage: npx @explain-it/core setup [dir] [--explainers <folder>]

Writes explain-it.config.ts (explainers in docs/explainers unless --explainers
says otherwise), adds the generated folders to .gitignore, and points
CLAUDE.md at the guide. Safe to run again.
`,
  new: `Usage: npx @explain-it/core new <name>

Creates <explainers folder>/<name>/ with explainer.config.ts and one starter
section. Run it anywhere under a folder that has explain-it.config.ts.
`,
  view: `Usage: npx @explain-it/core view [name|dir] [--port <port>] [--no-open]

Serves an explainer and opens it in the browser. With no name: the explainer
in this folder, or the only one in the repo, or pick from the list.
`,
  dev: 'Usage: npx @explain-it/core dev [name|dir]\n\nThe old name for view.\n',
  guide: 'Usage: npx @explain-it/core guide\n\nPrints the authoring guide for this version.\n',
  section: `Usage: npx @explain-it/core section <id> [--label <label>] [--source <anchor>] [--root <dir>]

Adds section <id> to the explainer: a scene file and a config entry. Remove a
section by deleting both.
`,
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

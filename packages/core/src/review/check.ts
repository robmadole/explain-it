import {dirname, relative} from 'node:path';
import ts from 'typescript';

import type {Explainer} from '../vite/load.js';
import {failure, type Failure} from './failures.js';
import {outline} from './outline.js';

export const MAX_CAPTION = 140;
export const MAX_BEATS = 12;

// Checks that read the source only: no browser, no rendering.
export function staticChecks(explainer: Explainer): {failures: Failure[]; sections: number; beats: number} {
  const failures: Failure[] = [];
  const {sections} = outline(explainer);
  let beats = 0;

  for (const section of sections) {
    const at = {section: section.id, file: section.file};
    beats += section.beats.length;
    if (section.beats.length > MAX_BEATS) {
      failures.push(failure('beat-count', `${section.beats.length} beats; keep a section to ${MAX_BEATS} or fewer. Split it.`, at));
    }
    const seen = new Set<string>();
    for (const {id, caption, line} of section.beats) {
      const here = {...at, beat: id, line};
      if (id === null) failures.push(failure('literal', 'The beat id must be a string literal.', here));
      else if (seen.has(id)) failures.push(failure('duplicate-beat', `Beat id "${id}" is used more than once.`, here));
      if (id !== null) seen.add(id);

      if (caption === null) {
        failures.push(failure('literal', 'The caption must be a string literal, so tools can read it.', here));
        continue;
      }
      if ((caption.match(/`/g) ?? []).length % 2 !== 0) {
        failures.push(failure('backticks', 'The caption has an unclosed backtick.', here));
      }
      if (caption.length > MAX_CAPTION) {
        failures.push(failure('caption-length', `The caption is ${caption.length} characters; keep it to ${MAX_CAPTION}.`, here));
      }
    }
  }

  failures.push(...typeCheck(explainer));
  return {failures, sections: sections.length, beats};
}

const DEFAULT_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  jsxImportSource: '@motion-canvas/2d/lib',
  strict: true,
  skipLibCheck: true,
  noEmit: true,
  experimentalDecorators: true,
};

// Type errors in the explainer's own files, using its tsconfig.json when it
// has one.
function typeCheck({root, config, sceneFile}: Explainer): Failure[] {
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
  let options = DEFAULT_OPTIONS;
  let files = [`${root}/explainer.config.ts`, ...config.sections.map(({id}) => sceneFile(id))];
  if (configPath && dirname(configPath) === root) {
    const parsed = ts.parseJsonConfigFileContent(ts.readConfigFile(configPath, ts.sys.readFile).config, ts.sys, root);
    options = {...parsed.options, noEmit: true};
    files = [...new Set([...parsed.fileNames, ...files])];
  }

  const program = ts.createProgram(files, options);
  const sections = new Map(config.sections.map(({id}) => [sceneFile(id), id]));
  return ts
    .getPreEmitDiagnostics(program)
    .filter(d => !d.file || !d.file.fileName.includes('/node_modules/'))
    .map(d => {
      const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
      if (!d.file) return failure('types', message);
      const {line} = d.file.getLineAndCharacterOfPosition(d.start ?? 0);
      return failure('types', message, {
        section: sections.get(d.file.fileName) ?? null,
        file: relative(root, d.file.fileName),
        line: line + 1,
      });
    });
}

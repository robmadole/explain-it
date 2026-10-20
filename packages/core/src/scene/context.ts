import type {Node} from '@motion-canvas/2d';
import served from 'virtual:explain-it/config';

import type {ResolvedConfig} from '../config/index.js';
import type {Theme} from '../theme/index.js';
import type {Caption} from './caption.js';

// The explainer's resolved config, served by the Vite plugin.
export const config: ResolvedConfig = served;
export const theme: Theme = config.theme;

// The scene that is running. scene() sets it each time the scene starts over,
// which Motion Canvas does on every seek.
export interface Running {
  caption: Caption;
  layer: Node;
  beats: Set<string>;
}

let running: Running | null = null;

export function setRunning(scene: Running) {
  running = scene;
}

export function useRunning(what: string): Running {
  if (!running) throw new Error(`${what} can only be used inside a scene().`);
  return running;
}

import type {InlineConfig} from 'vite';

import {explainer} from '../vite/index.js';

// Vite settings for an explainer at `root`: no vite.config file, just the plugin.
export function viteConfig(root: string, extra: InlineConfig = {}): InlineConfig {
  return {configFile: false, plugins: [explainer({root})], ...extra};
}

// Modules the Vite plugin serves. See src/vite/index.ts.
declare module 'virtual:explain-it/config' {
  import type {ResolvedConfig} from '../config';
  const config: ResolvedConfig;
  export default config;
}

declare module 'virtual:explain-it/sections' {
  import type {Project} from '@motion-canvas/core';
  const sections: Record<string, () => Promise<{default: Project}>>;
  export default sections;
}

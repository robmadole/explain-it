// A repo's explain-it.config.ts: settings shared by every explainer in it.
export interface RepoConfig {
  // The folder explainers live in, one per subfolder, relative to the config
  // file. `new` creates them there and `view` finds them there.
  explainers: string;
}

export const REPO_CONFIG_FILE = 'explain-it.config.ts';

export function defineRepo(config: RepoConfig): RepoConfig {
  return config;
}

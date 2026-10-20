export interface ActiveAppInfo {
  app: string;
  slug: string;
  title: string;
  process: string;
  pid: number;
  os: string;
}

export interface AppAliasEntry {
  slug: string;
  label: string;
  match: string[];
}

export interface AppsJson {
  version: number;
  apps: AppAliasEntry[];
}

export interface DeckAction {
  id: string;
  label: string;
  icon?: string;
  key: string;
  modifiers?: string[];
  pressDurationMs?: number;
  pressCount?: number;
  code?: string;
}

export type DeckOs = 'windows' | 'macos' | 'linux';

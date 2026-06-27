import { AppPreferences, RecentWorkspace } from "../domain/models/types";

const STORAGE_KEY = "squirrel.appPreferences.v1";

const defaultPreferences: AppPreferences = {
  recentWorkspaces: [],
  theme: "light",
};

export function loadAppPreferences(): AppPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultPreferences;
    }
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    return {
      theme: parseTheme(parsed.theme),
      recentWorkspaces: Array.isArray(parsed.recentWorkspaces)
        ? parsed.recentWorkspaces.slice(0, 10)
        : [],
    };
  } catch {
    return defaultPreferences;
  }
}

export function saveAppPreferences(preferences: AppPreferences): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export function rememberWorkspace(workspace: RecentWorkspace): AppPreferences {
  const current = loadAppPreferences();
  const next: AppPreferences = {
    ...current,
    recentWorkspaces: [
      workspace,
      ...current.recentWorkspaces.filter((item) => item.id !== workspace.id),
    ].slice(0, 10),
  };
  saveAppPreferences(next);
  return next;
}

function parseTheme(value: unknown): AppPreferences["theme"] {
  return ["light", "dark", "auto"].includes(String(value))
    ? (value as AppPreferences["theme"])
    : defaultPreferences.theme;
}

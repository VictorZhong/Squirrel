import { WorkspaceThemePreferences } from "../domain/models/types";

export type EffectiveTheme = "light" | "dark";

export function resolveWorkspaceTheme(
  preferences: WorkspaceThemePreferences,
  now = new Date(),
): EffectiveTheme {
  if (preferences.mode === "light" || preferences.mode === "dark") {
    return preferences.mode;
  }

  return isInsideDarkWindow(preferences.darkStart, preferences.darkEnd, now)
    ? "dark"
    : "light";
}

export function isInsideDarkWindow(
  darkStart: string,
  darkEnd: string,
  now = new Date(),
): boolean {
  const start = parseClockMinutes(darkStart);
  const end = parseClockMinutes(darkEnd);
  const current = now.getHours() * 60 + now.getMinutes();

  if (start === end) {
    return true;
  }

  if (start < end) {
    return current >= start && current < end;
  }

  return current >= start || current < end;
}

function parseClockMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  if (
    Number.isInteger(hours) &&
    Number.isInteger(minutes) &&
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  ) {
    return hours * 60 + minutes;
  }
  return 0;
}

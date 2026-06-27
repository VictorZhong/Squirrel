import { Project } from "./types";

export const PROJECT_COLOR_OPTIONS = [
  { label: "Ice", value: "#bae6fd" },
  { label: "Azure", value: "#bfdbfe" },
  { label: "Cyan", value: "#a5f3fc" },
  { label: "Teal", value: "#99f6e4" },
  { label: "Jade", value: "#a7f3d0" },
  { label: "Lime", value: "#d9f99d" },
  { label: "Ruby", value: "#fda4af" },
  { label: "Pink", value: "#f9a8d4" },
  { label: "Fuchsia", value: "#f0abfc" },
  { label: "Violet", value: "#c4b5fd" },
  { label: "Stone", value: "#d6d3d1" },
  { label: "Slate", value: "#cbd5e1" },
] as const;

export const PROJECT_COLOR_VALUES: readonly string[] = PROJECT_COLOR_OPTIONS.map(
  (color) => color.value,
);
export const DEFAULT_PROJECT_COLOR = PROJECT_COLOR_OPTIONS[0].value;

export function randomProjectColor(): string {
  return PROJECT_COLOR_OPTIONS[Math.floor(Math.random() * PROJECT_COLOR_OPTIONS.length)]?.value
    ?? DEFAULT_PROJECT_COLOR;
}

export function resolveProjectColor(project?: Pick<Project, "id" | "name" | "color">): string {
  if (project?.color && PROJECT_COLOR_VALUES.includes(project.color)) {
    return project.color;
  }

  return colorFromSeed(project?.id ?? project?.name ?? "");
}

function colorFromSeed(seed: string): string {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return PROJECT_COLOR_OPTIONS[hash % PROJECT_COLOR_OPTIONS.length]?.value
    ?? DEFAULT_PROJECT_COLOR;
}

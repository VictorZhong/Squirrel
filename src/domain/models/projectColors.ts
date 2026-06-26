import { Project } from "./types";

export const PROJECT_COLOR_OPTIONS = [
  { label: "Sky", value: "#bfdbfe" },
  { label: "Mint", value: "#bbf7d0" },
  { label: "Amber", value: "#fde68a" },
  { label: "Coral", value: "#fecaca" },
  { label: "Lavender", value: "#ddd6fe" },
  { label: "Peach", value: "#fed7aa" },
  { label: "Teal", value: "#99f6e4" },
  { label: "Rose", value: "#fbcfe8" },
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

export function normalizeAssigneeName(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function normalizeAssigneeList(assignees: string[]): string[] {
  const byLower = new Map<string, string>();

  for (const assignee of assignees) {
    const normalized = normalizeAssigneeName(assignee);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLocaleLowerCase();
    if (!byLower.has(key)) {
      byLower.set(key, normalized);
    }
  }

  return Array.from(byLower.values()).sort((a, b) => a.localeCompare(b));
}

export function mergeAssignees(existing: string[], incoming: string[]): string[] {
  return normalizeAssigneeList([...existing, ...incoming]);
}

export function isSameAssignee(a: string | undefined, b: string | undefined): boolean {
  const normalizedA = normalizeAssigneeName(a);
  const normalizedB = normalizeAssigneeName(b);

  return Boolean(
    normalizedA &&
      normalizedB &&
      normalizedA.toLocaleLowerCase() === normalizedB.toLocaleLowerCase(),
  );
}

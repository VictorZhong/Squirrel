import { TASK_TAG_LIMIT, Task } from "../domain/models/types";

export function normalizeTaskTags(tags: string[], limit = TASK_TAG_LIMIT): string[] {
  const byLower = new Map<string, string>();
  for (const tag of tags) {
    const normalized = tag.trim();
    if (!normalized) {
      continue;
    }
    const key = normalized.toLocaleLowerCase();
    if (!byLower.has(key)) {
      byLower.set(key, normalized);
    }
    if (byLower.size >= limit) {
      break;
    }
  }
  return Array.from(byLower.values());
}

export function filterTasksByTags(tasks: Task[], selectedTags: string[]): Task[] {
  const filters = normalizeTaskTags(selectedTags, selectedTags.length).map((tag) =>
    tag.toLocaleLowerCase(),
  );
  if (filters.length === 0) {
    return tasks;
  }

  return tasks.filter((task) => {
    const taskTags = new Set(task.tags.map((tag) => tag.toLocaleLowerCase()));
    return filters.every((tag) => taskTags.has(tag));
  });
}

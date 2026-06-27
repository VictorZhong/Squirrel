import { Project, Task } from "../domain/models/types";

export function filterTasksBySearch(
  tasks: Task[],
  query: string,
  projects: Project[],
): Task[] {
  const terms = query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) {
    return tasks;
  }

  const projectNames = new Map(projects.map((project) => [project.id, project.name]));

  return tasks.filter((task) => {
    const haystack = [
      task.title,
      task.description,
      task.assignee,
      task.dueDate,
      task.status,
      task.priority,
      task.importance,
      task.projectId ? projectNames.get(task.projectId) : "Unassigned",
      ...task.tags,
    ]
      .filter(Boolean)
      .join("\n")
      .toLocaleLowerCase();

    return terms.every((term) => haystack.includes(term));
  });
}

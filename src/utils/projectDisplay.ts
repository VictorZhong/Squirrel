import { DEFAULT_PROJECT_COLOR, resolveProjectColor } from "../domain/models/projectColors";
import { Project, Task } from "../domain/models/types";

export function getTaskProjectName(
  task: Pick<Task, "projectId">,
  projectNames: ReadonlyMap<string, string>,
): string {
  return projectNames.get(task.projectId ?? "") ?? "Unknown project";
}

export function getTaskProjectColor(
  task: Pick<Task, "projectId">,
  projects: ReadonlyMap<string, Project>,
): string {
  if (!task.projectId) {
    return DEFAULT_PROJECT_COLOR;
  }

  return resolveProjectColor(projects.get(task.projectId) ?? { id: task.projectId, name: "" });
}

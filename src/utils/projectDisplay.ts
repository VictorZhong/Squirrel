import { Task } from "../domain/models/types";

export function getTaskProjectName(
  task: Pick<Task, "projectId">,
  projectNames: ReadonlyMap<string, string>,
): string {
  return projectNames.get(task.projectId ?? "") ?? "Unknown project";
}

import {
  BoardTaskStatus,
  BOARD_STATUSES,
  SCHEMA_VERSION,
  Task,
  WorkspaceState,
} from "../domain/models/types";
import { createProject } from "../domain/rules/taskRules";
import { randomProjectColor, resolveProjectColor } from "../domain/models/projectColors";

export interface WorkspaceMigrationResult {
  state: WorkspaceState;
  previousTasks: Map<string, Task>;
  changed: boolean;
}

export function migrateWorkspaceState(
  state: WorkspaceState,
  now = new Date(),
): WorkspaceMigrationResult {
  const previousTasks = new Map(state.tasks.map((task) => [task.id, task]));
  const timestamp = now.toISOString();
  let changed = state.workspace.schemaVersion < SCHEMA_VERSION;
  let projects = state.projects.map((project) => {
    const normalizedColor = resolveProjectColor(project);
    if (project.color === normalizedColor) {
      return project;
    }
    changed = true;
    return {
      ...project,
      color: normalizedColor,
      updatedAt: timestamp,
    };
  });
  let defaultProjectId = findActiveProjectId(
    projects,
    state.preferences.defaultProjectId,
  );

  if (!defaultProjectId) {
    const firstActiveProject = projects
      .filter((project) => project.status !== "archived")
      .sort((a, b) => a.sortOrder - b.sortOrder)[0];
    defaultProjectId = firstActiveProject?.id;
  }

  if (!defaultProjectId) {
    const defaultProject = createProject(
      {
        name: "Default",
        color: randomProjectColor(),
        sortOrder: projects.length,
      },
      now,
    );
    projects = [...projects, defaultProject];
    defaultProjectId = defaultProject.id;
    changed = true;
  }

  const boardColumns = normalizeBoardColumns(state.preferences.boardColumns);
  if (boardColumns.join("\n") !== state.preferences.boardColumns.join("\n")) {
    changed = true;
  }

  if (defaultProjectId !== state.preferences.defaultProjectId) {
    changed = true;
  }

  const tasks = state.tasks.map((task) => {
    const nextStatus = task.status;
    const nextProjectId = task.projectId ?? defaultProjectId;
    if (nextStatus === task.status && nextProjectId === task.projectId) {
      return task;
    }
    changed = true;
    return {
      ...task,
      projectId: nextProjectId,
    };
  });

  return {
    state: {
      workspace: {
        ...state.workspace,
        schemaVersion: SCHEMA_VERSION,
        updatedAt: changed ? timestamp : state.workspace.updatedAt,
      },
      preferences: {
        ...state.preferences,
        defaultProjectId,
        boardColumns,
      },
      projects: projects.sort((a, b) => a.sortOrder - b.sortOrder),
      tasks: tasks.sort((a, b) => a.sortOrder - b.sortOrder),
    },
    previousTasks,
    changed,
  };
}

function findActiveProjectId(
  projects: WorkspaceState["projects"],
  projectId?: string,
): string | undefined {
  return projects.some(
    (project) => project.id === projectId && project.status !== "archived",
  )
    ? projectId
    : undefined;
}

function normalizeBoardColumns(columns: BoardTaskStatus[]): BoardTaskStatus[] {
  const allowed = new Set<BoardTaskStatus>(BOARD_STATUSES);
  const normalized = Array.from(
    new Set(columns.filter((status) => allowed.has(status))),
  );
  return normalized.length > 0 ? normalized : BOARD_STATUSES;
}

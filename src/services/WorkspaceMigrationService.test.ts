import { describe, expect, it } from "vitest";
import { createTask } from "../domain/rules/taskRules";
import { createInitialWorkspaceState } from "./WorkspaceService";
import { migrateWorkspaceState } from "./WorkspaceMigrationService";

describe("migrateWorkspaceState", () => {
  it("moves legacy unassigned tasks into the default project and bumps schema", () => {
    const state = createInitialWorkspaceState("Legacy", new Date(2026, 5, 25, 12));
    const legacyTask = createTask({ title: "Captured item", projectId: undefined });
    const legacyState = {
      ...state,
      workspace: {
        ...state.workspace,
        schemaVersion: 1,
      },
      tasks: [
        {
          ...legacyTask,
          projectId: undefined,
        },
      ],
    };

    const migration = migrateWorkspaceState(
      legacyState,
      new Date(2026, 5, 27, 12),
    );

    expect(migration.changed).toBe(true);
    expect(migration.state.workspace.schemaVersion).toBe(2);
    expect(migration.state.tasks[0]).toMatchObject({
      title: "Captured item",
      status: "todo",
      projectId: state.preferences.defaultProjectId,
    });
    expect(migration.previousTasks.get(legacyTask.id)?.projectId).toBeUndefined();
  });

  it("normalizes legacy project colors into the current project palette", () => {
    const state = createInitialWorkspaceState("Legacy", new Date(2026, 5, 25, 12));
    const legacyState = {
      ...state,
      projects: [
        {
          ...state.projects[0],
          color: "#fde68a",
        },
      ],
    };

    const migration = migrateWorkspaceState(
      legacyState,
      new Date(2026, 5, 27, 12),
    );

    expect(migration.changed).toBe(true);
    expect(migration.state.projects[0].color).not.toBe("#fde68a");
  });
});

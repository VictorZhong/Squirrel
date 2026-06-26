import { describe, expect, it } from "vitest";
import {
  WORKSPACE_STRUCTURE_PATHS,
  createDefaultPreferences,
  createInitialWorkspaceState,
} from "./WorkspaceService";

describe("WorkspaceService", () => {
  it("creates the v0.1 workspace defaults", () => {
    const state = createInitialWorkspaceState("Work", new Date(2026, 5, 25, 12));

    expect(state.workspace.name).toBe("Work");
    expect(state.workspace.schemaVersion).toBe(1);
    expect(state.preferences.defaultView).toBe("dashboard");
    expect(state.projects).toHaveLength(1);
    expect(state.projects[0].name).toBe("Default");
    expect(state.preferences.defaultProjectId).toBe(state.projects[0].id);
    expect(state.tasks).toEqual([]);
  });

  it("declares required workspace directories", () => {
    expect(WORKSPACE_STRUCTURE_PATHS).toContain("projects");
    expect(WORKSPACE_STRUCTURE_PATHS).toContain("inbox/attachments");
    expect(WORKSPACE_STRUCTURE_PATHS).toContain("exports/markdown");
    expect(WORKSPACE_STRUCTURE_PATHS).toContain(".gtd-lite");
  });

  it("enables markdown export by default", () => {
    expect(createDefaultPreferences().markdownExportEnabled).toBe(true);
  });

  it("shows project names on board cards by default", () => {
    expect(createDefaultPreferences().showProjectNameOnBoard).toBe(true);
  });

  it("creates profile and tag defaults", () => {
    const preferences = createDefaultPreferences();

    expect(preferences.userProfile.nickname).toBe("Local user");
    expect(preferences.userProfile.avatarPresetId).toBeUndefined();
    expect(preferences.tags).toEqual([]);
  });
});

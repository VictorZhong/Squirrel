import { describe, expect, it } from "vitest";
import {
  WORKSPACE_STRUCTURE_PATHS,
  createDefaultPreferences,
  createInitialWorkspaceState,
} from "./WorkspaceService";
import { PROJECT_COLOR_VALUES } from "../domain/models/projectColors";

describe("WorkspaceService", () => {
  it("creates the v0.1 workspace defaults", () => {
    const state = createInitialWorkspaceState("Work", new Date(2026, 5, 25, 12));

    expect(state.workspace.name).toBe("Work");
    expect(state.workspace.schemaVersion).toBe(2);
    expect(state.preferences.defaultView).toBe("dashboard");
    expect(state.projects).toHaveLength(1);
    expect(state.projects[0].name).toBe("Default");
    expect(PROJECT_COLOR_VALUES).toContain(state.projects[0].color);
    expect(state.preferences.defaultProjectId).toBe(state.projects[0].id);
    expect(state.tasks).toEqual([]);
  });

  it("declares required workspace directories", () => {
    expect(WORKSPACE_STRUCTURE_PATHS).toContain("projects");
    expect(WORKSPACE_STRUCTURE_PATHS).not.toContain("inbox");
    expect(WORKSPACE_STRUCTURE_PATHS).toContain("exports/markdown");
    expect(WORKSPACE_STRUCTURE_PATHS).toContain(".gtd-lite");
  });

  it("enables markdown export by default", () => {
    expect(createDefaultPreferences().markdownExportEnabled).toBe(true);
  });

  it("shows project names on board cards by default", () => {
    expect(createDefaultPreferences().showProjectNameOnBoard).toBe(true);
  });

  it("enables global paste capture by default", () => {
    expect(createDefaultPreferences().globalPasteCaptureEnabled).toBe(true);
  });

  it("defaults to light theme with an overnight auto window", () => {
    expect(createDefaultPreferences().theme).toEqual({
      mode: "light",
      darkStart: "20:00",
      darkEnd: "07:00",
    });
  });

  it("creates profile and tag defaults", () => {
    const preferences = createDefaultPreferences();

    expect(preferences.userProfile.nickname).toBe("Local user");
    expect(preferences.userProfile.avatarPresetId).toBeUndefined();
    expect(preferences.tags).toEqual([]);
  });
});

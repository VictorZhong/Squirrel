import {
  BOARD_STATUSES,
  SCHEMA_VERSION,
  Workspace,
  WorkspacePreferences,
  WorkspaceState,
} from "../domain/models/types";
import { createId } from "../utils/id";

export const WORKSPACE_STRUCTURE_PATHS = [
  "projects",
  "inbox",
  "inbox/attachments",
  "archive",
  "exports",
  "exports/markdown",
  ".gtd-lite",
] as const;

export function createDefaultWorkspace(
  name = "Squirrel Workspace",
  now = new Date(),
): Workspace {
  const timestamp = now.toISOString();

  return {
    id: createId("workspace"),
    name,
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createDefaultPreferences(): WorkspacePreferences {
  return {
    defaultView: "dashboard",
    boardColumns: BOARD_STATUSES,
    dueSoonDays: 7,
    autoArchiveDoneAfterDays: 30,
    markdownExportEnabled: true,
    taskSortMode: "manual",
    userProfile: {
      nickname: "Local user",
    },
    tags: [],
  };
}

export function createInitialWorkspaceState(
  name?: string,
  now = new Date(),
): WorkspaceState {
  return {
    workspace: createDefaultWorkspace(name, now),
    preferences: createDefaultPreferences(),
    projects: [],
    tasks: [],
  };
}

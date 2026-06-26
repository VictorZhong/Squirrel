import {
  Attachment,
  Project,
  SCHEMA_VERSION,
  Task,
  TASK_IMPORTANCES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  Workspace,
  WorkspacePreferences,
} from "../domain/models/types";
import { createDefaultPreferences } from "./WorkspaceService";

export function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function parseWorkspace(value: unknown): Workspace {
  const record = expectRecord(value, "workspace");
  return {
    id: expectString(record.id, "workspace.id"),
    name: expectString(record.name, "workspace.name"),
    schemaVersion:
      typeof record.schemaVersion === "number" ? record.schemaVersion : SCHEMA_VERSION,
    createdAt: expectString(record.createdAt, "workspace.createdAt"),
    updatedAt: expectString(record.updatedAt, "workspace.updatedAt"),
  };
}

export function parsePreferences(value: unknown): WorkspacePreferences {
  const defaults = createDefaultPreferences();
  if (!isRecord(value)) {
    return defaults;
  }

  return {
    ...defaults,
    defaultView:
      ["dashboard", "kanban", "list"].includes(String(value.defaultView))
        ? (value.defaultView as WorkspacePreferences["defaultView"])
        : defaults.defaultView,
    defaultProjectId: optionalString(value.defaultProjectId),
    userProfile:
      isRecord(value.userProfile) && typeof value.userProfile.nickname === "string"
        ? {
            nickname: value.userProfile.nickname,
            avatarPresetId: optionalString(value.userProfile.avatarPresetId),
          }
        : defaults.userProfile,
    tags: Array.isArray(value.tags)
      ? normalizeTags(value.tags.map(String))
      : defaults.tags,
    boardColumns: Array.isArray(value.boardColumns)
      ? value.boardColumns.filter((status) =>
          ["inbox", "todo", "in_progress", "waiting", "blocked", "done"].includes(
            String(status),
          ),
        )
      : defaults.boardColumns,
    dueSoonDays: optionalNumber(value.dueSoonDays) ?? defaults.dueSoonDays,
    autoArchiveDoneAfterDays:
      optionalNumber(value.autoArchiveDoneAfterDays) ?? defaults.autoArchiveDoneAfterDays,
    markdownExportEnabled:
      typeof value.markdownExportEnabled === "boolean"
        ? value.markdownExportEnabled
        : defaults.markdownExportEnabled,
    showProjectNameOnBoard:
      typeof value.showProjectNameOnBoard === "boolean"
        ? value.showProjectNameOnBoard
        : defaults.showProjectNameOnBoard,
    screenshotTaskDefaultProjectId: optionalString(value.screenshotTaskDefaultProjectId),
    taskSortMode:
      ["manual", "dueDate", "priority"].includes(String(value.taskSortMode))
        ? (value.taskSortMode as WorkspacePreferences["taskSortMode"])
        : defaults.taskSortMode,
  };
}

export function parseProject(value: unknown): Project {
  const record = expectRecord(value, "project");
  return {
    id: expectString(record.id, "project.id"),
    name: expectString(record.name, "project.name"),
    description: optionalString(record.description),
    status: ["active", "paused", "completed", "archived"].includes(String(record.status))
      ? (record.status as Project["status"])
      : "active",
    color: optionalString(record.color),
    sortOrder: optionalNumber(record.sortOrder) ?? 0,
    createdAt: expectString(record.createdAt, "project.createdAt"),
    updatedAt: expectString(record.updatedAt, "project.updatedAt"),
    archivedAt: optionalString(record.archivedAt),
  };
}

export function parseTask(value: unknown): Task {
  const record = expectRecord(value, "task");

  return {
    id: expectString(record.id, "task.id"),
    projectId: optionalString(record.projectId),
    parentTaskId: optionalString(record.parentTaskId),
    title: expectString(record.title, "task.title"),
    description: optionalString(record.description),
    assignee: optionalString(record.assignee),
    status: TASK_STATUSES.includes(record.status as Task["status"])
      ? (record.status as Task["status"])
      : "inbox",
    priority: TASK_PRIORITIES.includes(record.priority as Task["priority"])
      ? (record.priority as Task["priority"])
      : "none",
    importance: TASK_IMPORTANCES.includes(record.importance as Task["importance"])
      ? (record.importance as Task["importance"])
      : "none",
    dueDate: optionalString(record.dueDate),
    startDate: optionalString(record.startDate),
    completedAt: optionalString(record.completedAt),
    tags: Array.isArray(record.tags) ? normalizeTags(record.tags.map(String)) : [],
    attachments: Array.isArray(record.attachments)
      ? record.attachments.map(parseAttachment)
      : [],
    sortOrder: optionalNumber(record.sortOrder) ?? 0,
    createdAt: expectString(record.createdAt, "task.createdAt"),
    updatedAt: expectString(record.updatedAt, "task.updatedAt"),
  };
}

function parseAttachment(value: unknown): Attachment {
  const record = expectRecord(value, "attachment");
  return {
    id: expectString(record.id, "attachment.id"),
    type: ["image", "file", "link"].includes(String(record.type))
      ? (record.type as Attachment["type"])
      : "file",
    fileName: expectString(record.fileName, "attachment.fileName"),
    relativePath: expectString(record.relativePath, "attachment.relativePath"),
    mimeType: optionalString(record.mimeType),
    sizeBytes: optionalNumber(record.sizeBytes),
    createdAt: expectString(record.createdAt, "attachment.createdAt"),
  };
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Invalid ${label}: expected object`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid ${label}: expected non-empty string`);
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)),
  ).sort((a, b) => a.localeCompare(b));
}

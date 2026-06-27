import {
  Attachment,
  Project,
  Task,
  TASK_IMPORTANCES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  Workspace,
  WorkspacePreferences,
  WorkspaceThemePreferences,
} from "../domain/models/types";
import {
  DEFAULT_AVATAR_CONFIG,
  type UserAvatarConfig,
} from "../domain/models/avatar";
import { normalizeAssigneeList } from "../utils/assignees";
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
      typeof record.schemaVersion === "number" ? record.schemaVersion : 1,
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
    userProfile: parseUserProfile(value.userProfile, defaults.userProfile),
    tags: Array.isArray(value.tags)
      ? normalizeTags(value.tags.map(String))
      : defaults.tags,
    assignees: Array.isArray(value.assignees)
      ? normalizeAssigneeList(value.assignees.map(String))
      : defaults.assignees,
    boardColumns: parseBoardColumns(value.boardColumns, defaults.boardColumns),
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
    globalPasteCaptureEnabled:
      typeof value.globalPasteCaptureEnabled === "boolean"
        ? value.globalPasteCaptureEnabled
        : defaults.globalPasteCaptureEnabled,
    screenshotTaskDefaultProjectId: optionalString(value.screenshotTaskDefaultProjectId),
    taskSortMode:
      ["manual", "dueDate", "priority"].includes(String(value.taskSortMode))
        ? (value.taskSortMode as WorkspacePreferences["taskSortMode"])
        : defaults.taskSortMode,
    theme: parseWorkspaceTheme(value.theme, defaults.theme),
  };
}

function parseUserProfile(
  value: unknown,
  defaults: WorkspacePreferences["userProfile"],
): WorkspacePreferences["userProfile"] {
  if (!isRecord(value) || typeof value.nickname !== "string") {
    return defaults;
  }

  const avatarPresetId = optionalString(value.avatarPresetId);
  const avatarConfig = parseAvatarConfig(value.avatarConfig);

  return {
    nickname: value.nickname,
    avatarPresetId,
    avatarConfig:
      avatarConfig ?? (avatarPresetId ? undefined : defaults.avatarConfig),
  };
}

function parseAvatarConfig(value: unknown): UserAvatarConfig | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const avatarConfig: UserAvatarConfig = {
    ...DEFAULT_AVATAR_CONFIG,
    sex: parseEnum(value.sex, ["man", "woman"], DEFAULT_AVATAR_CONFIG.sex),
    faceColor: parseColor(value.faceColor, DEFAULT_AVATAR_CONFIG.faceColor),
    earSize: parseEnum(value.earSize, ["small", "big"], DEFAULT_AVATAR_CONFIG.earSize),
    hairColor: parseColor(value.hairColor, DEFAULT_AVATAR_CONFIG.hairColor),
    hairStyle: parseEnum(
      value.hairStyle,
      ["normal", "thick", "mohawk", "womanLong", "womanShort"],
      DEFAULT_AVATAR_CONFIG.hairStyle,
    ),
    hairColorRandom:
      typeof value.hairColorRandom === "boolean" ? value.hairColorRandom : undefined,
    hatColor: parseColor(value.hatColor, DEFAULT_AVATAR_CONFIG.hatColor),
    hatStyle: parseEnum(
      value.hatStyle,
      ["beanie", "turban", "none"],
      DEFAULT_AVATAR_CONFIG.hatStyle,
    ),
    eyeStyle: parseEnum(
      value.eyeStyle,
      ["circle", "oval", "smile"],
      DEFAULT_AVATAR_CONFIG.eyeStyle,
    ),
    eyeBrowStyle: parseEnum(
      value.eyeBrowStyle,
      ["up", "upWoman"],
      DEFAULT_AVATAR_CONFIG.eyeBrowStyle,
    ),
    glassesStyle: parseEnum(
      value.glassesStyle,
      ["round", "square", "none"],
      DEFAULT_AVATAR_CONFIG.glassesStyle,
    ),
    noseStyle: parseEnum(
      value.noseStyle,
      ["short", "long", "round"],
      DEFAULT_AVATAR_CONFIG.noseStyle,
    ),
    mouthStyle: parseEnum(
      value.mouthStyle,
      ["laugh", "smile", "peace"],
      DEFAULT_AVATAR_CONFIG.mouthStyle,
    ),
    shirtStyle: parseEnum(
      value.shirtStyle,
      ["hoody", "short", "polo"],
      DEFAULT_AVATAR_CONFIG.shirtStyle,
    ),
    shirtColor: parseColor(value.shirtColor, DEFAULT_AVATAR_CONFIG.shirtColor),
    bgColor: parseColor(value.bgColor, DEFAULT_AVATAR_CONFIG.bgColor),
  };

  if (typeof value.hairColorRandom === "boolean") {
    avatarConfig.hairColorRandom = value.hairColorRandom;
  }

  if (typeof value.isGradient === "boolean") {
    avatarConfig.isGradient = value.isGradient;
  }

  return avatarConfig;
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
    status: parseTaskStatus(record.status),
    priority: parseTaskPriority(record.priority),
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

function parseTaskPriority(value: unknown): Task["priority"] {
  if (value === "urgent") {
    return "high";
  }
  return TASK_PRIORITIES.includes(value as Task["priority"])
    ? (value as Task["priority"])
    : "none";
}

function parseTaskStatus(value: unknown): Task["status"] {
  if (value === "inbox") {
    return "todo";
  }
  return TASK_STATUSES.includes(value as Task["status"])
    ? (value as Task["status"])
    : "todo";
}

function parseBoardColumns(
  value: unknown,
  defaults: WorkspacePreferences["boardColumns"],
): WorkspacePreferences["boardColumns"] {
  if (!Array.isArray(value)) {
    return defaults;
  }

  const allowed = new Set(["todo", "in_progress", "waiting", "blocked", "done"]);
  const columns = Array.from(
    new Set(
      value
        .map((status) => (status === "inbox" ? "todo" : String(status)))
        .filter((status) => allowed.has(status)),
    ),
  ) as WorkspacePreferences["boardColumns"];

  return columns.length > 0 ? columns : defaults;
}

function parseWorkspaceTheme(
  value: unknown,
  defaults: WorkspaceThemePreferences,
): WorkspaceThemePreferences {
  if (!isRecord(value)) {
    return defaults;
  }

  const mode = ["light", "dark", "auto"].includes(String(value.mode))
    ? (value.mode as WorkspaceThemePreferences["mode"])
    : defaults.mode;

  return {
    mode,
    darkStart: parseClockTime(value.darkStart, defaults.darkStart),
    darkEnd: parseClockTime(value.darkEnd, defaults.darkEnd),
  };
}

function parseClockTime(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;
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

function parseEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T | undefined,
): T | undefined {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function parseColor(value: unknown, fallback: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return fallback;
  }

  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value) ? value : fallback;
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)),
  ).sort((a, b) => a.localeCompare(b));
}

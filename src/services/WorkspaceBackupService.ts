import {
  Attachment,
  Project,
  Task,
  WorkspaceState,
} from "../domain/models/types";
import {
  parsePreferences,
  parseProject,
  parseTask,
  parseWorkspace,
  serializeJson,
} from "./SerializationService";
import {
  WorkspaceAttachmentFile,
  WorkspaceRepository,
} from "../repositories/WorkspaceRepository";

export const WORKSPACE_BACKUP_VERSION = 1;

export interface WorkspaceBackupAttachment {
  relativePath: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  contentBase64: string;
}

export interface WorkspaceBackup {
  version: typeof WORKSPACE_BACKUP_VERSION;
  exportedAt: string;
  state: WorkspaceState;
  attachments: WorkspaceBackupAttachment[];
}

export interface ParsedWorkspaceBackup {
  state: WorkspaceState;
  attachmentFiles: WorkspaceAttachmentFile[];
}

export async function createWorkspaceBackup(
  repository: WorkspaceRepository,
  state: WorkspaceState,
  now = new Date(),
): Promise<WorkspaceBackup> {
  const attachments = await Promise.all(
    uniqueAttachments(state.tasks).map(async (attachment) => {
      const file = await repository.readAttachmentFile(attachment);
      return {
        relativePath: attachment.relativePath,
        fileName: attachment.fileName,
        mimeType: file.type || attachment.mimeType,
        sizeBytes: file.size,
        contentBase64: await blobToBase64(file),
      };
    }),
  );

  return {
    version: WORKSPACE_BACKUP_VERSION,
    exportedAt: now.toISOString(),
    state,
    attachments,
  };
}

export function serializeWorkspaceBackup(backup: WorkspaceBackup): string {
  return serializeJson(backup);
}

export function parseWorkspaceBackup(value: unknown): ParsedWorkspaceBackup {
  const record = expectRecord(value, "backup");
  const version = record.version;
  if (version !== WORKSPACE_BACKUP_VERSION) {
    throw new Error(`Unsupported workspace backup version: ${String(version)}`);
  }

  const stateRecord = expectRecord(record.state, "backup.state");
  const projects = expectArray(stateRecord.projects, "backup.state.projects").map(
    (project) => parseProject(project),
  );
  const tasks = expectArray(stateRecord.tasks, "backup.state.tasks").map((task) =>
    parseTask(task),
  );
  const state: WorkspaceState = {
    workspace: parseWorkspace(stateRecord.workspace),
    preferences: parsePreferences(stateRecord.preferences),
    projects: projects.sort((a, b) => a.sortOrder - b.sortOrder),
    tasks: tasks.sort((a, b) => a.sortOrder - b.sortOrder),
  };

  const attachmentFiles = expectArray(record.attachments, "backup.attachments").map(
    parseBackupAttachment,
  );

  return { state, attachmentFiles };
}

export async function parseWorkspaceBackupFile(file: File): Promise<ParsedWorkspaceBackup> {
  return parseWorkspaceBackup(JSON.parse(await file.text()));
}

function uniqueAttachments(tasks: Task[]): Attachment[] {
  const seen = new Set<string>();
  const attachments: Attachment[] = [];
  for (const task of tasks) {
    for (const attachment of task.attachments) {
      if (seen.has(attachment.relativePath)) {
        continue;
      }
      seen.add(attachment.relativePath);
      attachments.push(attachment);
    }
  }
  return attachments;
}

function parseBackupAttachment(value: unknown): WorkspaceAttachmentFile {
  const record = expectRecord(value, "backup.attachments[]");
  const relativePath = expectString(record.relativePath, "backup.attachments[].relativePath");
  const fileName = expectString(record.fileName, "backup.attachments[].fileName");
  const contentBase64 = expectString(
    record.contentBase64,
    "backup.attachments[].contentBase64",
  );
  const mimeType =
    typeof record.mimeType === "string" && record.mimeType.trim()
      ? record.mimeType
      : undefined;

  return {
    relativePath,
    file: base64ToFile(contentBase64, fileName, mimeType),
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function base64ToFile(contentBase64: string, fileName: string, mimeType?: string): File {
  const binary = atob(contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], fileName, { type: mimeType });
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value as Record<string, unknown>;
}

function expectArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

function expectString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

import {
  Attachment,
  Project,
  Task,
  WorkspaceState,
  WorkspaceStorageMode,
} from "../domain/models/types";

export type { WorkspaceStorageMode };

export interface WorkspaceAttachmentFile {
  relativePath: string;
  file: File;
}

export interface WorkspaceRepository {
  readonly name: string;
  readonly storageMode: WorkspaceStorageMode;

  loadOrInitialize(): Promise<WorkspaceState>;
  saveProject(
    project: Project,
    state: WorkspaceState,
    previous?: Project,
  ): Promise<void>;
  deleteProject(project: Project, state: WorkspaceState): Promise<void>;
  saveProjects(
    projects: Project[],
    state: WorkspaceState,
    previousProjects: Map<string, Project>,
  ): Promise<void>;
  savePreferences(state: WorkspaceState): Promise<void>;
  saveTask(task: Task, state: WorkspaceState, previous?: Task): Promise<void>;
  saveTasks(
    tasks: Task[],
    state: WorkspaceState,
    previousTasks: Map<string, Task>,
  ): Promise<void>;
  deleteTasks(tasks: Task[], state: WorkspaceState): Promise<void>;
  createAttachment(task: Task, file: File): Promise<Attachment>;
  deleteAttachment(
    task: Task,
    previous: Task,
    attachment: Attachment,
    state: WorkspaceState,
  ): Promise<void>;
  getAttachmentUrl(attachment: Attachment): Promise<string>;
  readAttachmentFile(attachment: Attachment): Promise<File>;
  replaceWorkspace(
    state: WorkspaceState,
    attachmentFiles: WorkspaceAttachmentFile[],
  ): Promise<void>;
  disposeObjectUrls(): void;
}

export interface FolderWorkspaceRepository extends WorkspaceRepository {
  readonly storageMode: "folder";
  readonly directoryHandle: FileSystemDirectoryHandle;
}

export interface WorkspaceRepositorySupport {
  folder: boolean;
  browser: boolean;
}

export function isWorkspaceSupported(support: WorkspaceRepositorySupport): boolean {
  return support.folder || support.browser;
}

export function workspaceStorageModeLabel(mode: WorkspaceStorageMode): string {
  return mode === "folder" ? "Folder" : "Browser private storage";
}

import {
  ActivityAction,
  ActivityLogEntry,
  Attachment,
  Project,
  SCHEMA_VERSION,
  Task,
  WorkspaceIndex,
  WorkspaceState,
} from "../domain/models/types";
import { createTimestampSlug } from "../utils/id";
import { createId } from "../utils/id";
import {
  parsePreferences,
  parseProject,
  parseTask,
  parseWorkspace,
  serializeJson,
} from "../services/SerializationService";
import {
  WORKSPACE_STRUCTURE_PATHS,
  createInitialWorkspaceState,
} from "../services/WorkspaceService";
import { migrateWorkspaceState } from "../services/WorkspaceMigrationService";
import {
  MarkdownExportFile,
  generateMarkdownExports,
} from "../services/MarkdownExportService";
import {
  FolderWorkspaceRepository,
  WorkspaceAttachmentFile,
  WorkspaceRepository,
  WorkspaceRepositorySupport,
  WorkspaceStorageMode,
} from "./WorkspaceRepository";

type Path = string[];
const BROWSER_WORKSPACE_PATH = ["squirrel-workspace", "default"] as const;

export class LocalWorkspaceRepository implements WorkspaceRepository {
  private objectUrls = new Map<string, string>();

  private constructor(
    private readonly root: FileSystemDirectoryHandle,
    readonly storageMode: WorkspaceStorageMode,
  ) {}

  static getSupport(): WorkspaceRepositorySupport {
    return {
      folder: this.isFolderSupported(),
      browser: this.isBrowserStorageSupported(),
    };
  }

  static isFolderSupported(): boolean {
    return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
  }

  static isBrowserStorageSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.storage?.getDirectory === "function"
    );
  }

  static isSupported(): boolean {
    const support = this.getSupport();
    return support.folder || support.browser;
  }

  static async pickDirectory(): Promise<FolderWorkspaceRepository> {
    if (!window.showDirectoryPicker) {
      throw new Error("File System Access API is not available in this browser.");
    }

    const handle = await window.showDirectoryPicker({
      id: "squirrel-workspace",
      mode: "readwrite",
      startIn: "documents",
    });

    return new LocalWorkspaceRepository(handle, "folder") as FolderWorkspaceRepository;
  }

  static async openBrowserWorkspace(): Promise<LocalWorkspaceRepository> {
    if (!LocalWorkspaceRepository.isBrowserStorageSupported()) {
      throw new Error("Browser private workspace storage is not available.");
    }

    const root = await navigator.storage.getDirectory();
    const workspaceRoot = await getDirectoryHandleFromDirectory(
      root,
      [...BROWSER_WORKSPACE_PATH],
      true,
    );
    await assertWritableFileHandles(workspaceRoot);
    return new LocalWorkspaceRepository(workspaceRoot, "browser");
  }

  static fromDirectoryHandle(handle: FileSystemDirectoryHandle): FolderWorkspaceRepository {
    return new LocalWorkspaceRepository(handle, "folder") as FolderWorkspaceRepository;
  }

  get name(): string {
    return this.root.name;
  }

  get directoryHandle(): FileSystemDirectoryHandle {
    return this.root;
  }

  async loadOrInitialize(): Promise<WorkspaceState> {
    const hasWorkspace = await this.fileExists(["workspace.json"]);

    if (!hasWorkspace) {
      return this.initialize();
    }

    const state = await this.load();
    await this.appendActivity("workspace.loaded", "workspace", state.workspace.id);
    return state;
  }

  async initialize(): Promise<WorkspaceState> {
    const state = createInitialWorkspaceState(this.root.name);

    for (const path of WORKSPACE_STRUCTURE_PATHS) {
      await this.ensureDirectoryPath(path.split("/"));
    }

    await this.writeJson(["workspace.json"], state.workspace);
    await this.writeJson(["preferences.json"], state.preferences);
    for (const project of state.projects) {
      await this.ensureDirectoryPath(["projects", project.id, "tasks"]);
      await this.ensureDirectoryPath(["projects", project.id, "attachments"]);
      await this.writeJson(["projects", project.id, "project.json"], project);
    }
    await this.writeJson([".gtd-lite", "schema-version.json"], {
      schemaVersion: SCHEMA_VERSION,
    });
    await this.writeIndexFile(state);
    await this.writeMarkdownExportFiles(state);
    await this.appendActivity("workspace.initialized", "workspace", state.workspace.id);

    return state;
  }

  async load(): Promise<WorkspaceState> {
    const workspace = parseWorkspace(await this.readJson(["workspace.json"]));
    const preferences = parsePreferences(await this.readOptionalJson(["preferences.json"]));
    const projects = await this.readProjects();
    const tasks = await this.readTasks(projects);

    const state = {
      workspace,
      preferences,
      projects: projects.sort((a, b) => a.sortOrder - b.sortOrder),
      tasks: tasks.sort((a, b) => a.sortOrder - b.sortOrder),
    };
    const migration = migrateWorkspaceState(state);

    if (!migration.changed) {
      return migration.state;
    }

    await this.writeMigratedState(migration.state, migration.previousTasks);
    await this.appendActivity(
      "workspace.migrated",
      "workspace",
      migration.state.workspace.id,
      {
        fromSchemaVersion: workspace.schemaVersion,
        toSchemaVersion: SCHEMA_VERSION,
      },
    );
    return migration.state;
  }

  async saveProject(
    project: Project,
    state: WorkspaceState,
    previous?: Project,
  ): Promise<void> {
    await this.ensureDirectoryPath(["projects", project.id, "tasks"]);
    await this.ensureDirectoryPath(["projects", project.id, "attachments"]);
    await this.writeJson(["projects", project.id, "project.json"], project);
    await this.appendActivity(
      previous ? "project.updated" : "project.created",
      "project",
      project.id,
      { name: project.name },
    );
    await this.writeDerivedFiles(state);
  }

  async deleteProject(project: Project, state: WorkspaceState): Promise<void> {
    await this.removeDirectory(["projects", project.id]);
    await this.appendActivity("project.deleted", "project", project.id, {
      name: project.name,
    });
    await this.writeDerivedFiles(state);
  }

  async saveProjects(
    projects: Project[],
    state: WorkspaceState,
    previousProjects: Map<string, Project>,
  ): Promise<void> {
    for (const project of projects) {
      await this.ensureDirectoryPath(["projects", project.id, "tasks"]);
      await this.ensureDirectoryPath(["projects", project.id, "attachments"]);
      await this.writeJson(["projects", project.id, "project.json"], project);
      await this.appendActivity("project.updated", "project", project.id, {
        name: project.name,
        fromSortOrder: previousProjects.get(project.id)?.sortOrder,
        toSortOrder: project.sortOrder,
      });
    }
    await this.writeDerivedFiles(state);
  }

  async savePreferences(state: WorkspaceState): Promise<void> {
    await this.writeJson(["preferences.json"], state.preferences);
    await this.appendActivity(
      "workspace.preferencesUpdated",
      "workspace",
      state.workspace.id,
    );
  }

  async saveTask(task: Task, state: WorkspaceState, previous?: Task): Promise<void> {
    await this.writeTask(task, previous);
    await this.appendTaskActivity(task, previous);
    await this.writeDerivedFiles(state);
  }

  async saveTasks(
    tasks: Task[],
    state: WorkspaceState,
    previousTasks: Map<string, Task>,
  ): Promise<void> {
    await Promise.all(
      tasks.map((task) => this.writeTask(task, previousTasks.get(task.id))),
    );
    for (const task of tasks) {
      await this.appendTaskActivity(task, previousTasks.get(task.id));
    }
    await this.writeDerivedFiles(state);
  }

  async deleteTasks(tasks: Task[], state: WorkspaceState): Promise<void> {
    for (const task of tasks) {
      await this.removeFile(this.taskPath(task));
      await Promise.all(
        task.attachments.map((attachment) =>
          this.removeFile(attachment.relativePath.split("/")),
        ),
      );
      await this.appendActivity("task.deleted", "task", task.id, {
        title: task.title,
      });
    }
    await this.writeDerivedFiles(state);
  }

  async createAttachment(task: Task, file: File): Promise<Attachment> {
    const timestamp = new Date().toISOString();
    const fileName = createAttachmentFileName(file.name);
    const relativePath = task.projectId
      ? ["projects", task.projectId, "attachments", task.id, fileName]
      : ["inbox", "attachments", task.id, fileName];
    await this.ensureDirectoryPath(relativePath.slice(0, -1));
    await this.writeFile(relativePath, file);

    const attachment: Attachment = {
      id: createId("att"),
      type: file.type.startsWith("image/") ? "image" : "file",
      fileName,
      relativePath: relativePath.join("/"),
      mimeType: file.type || undefined,
      sizeBytes: file.size,
      createdAt: timestamp,
    };
    this.cacheObjectUrl(attachment.relativePath, file);

    await this.appendActivity("attachment.created", "attachment", attachment.id, {
      taskId: task.id,
      fileName,
    });

    return attachment;
  }

  async deleteAttachment(
    task: Task,
    previous: Task,
    attachment: Attachment,
    state: WorkspaceState,
  ): Promise<void> {
    await this.writeTask(task, previous);
    await this.removeFile(attachment.relativePath.split("/"));
    const cached = this.objectUrls.get(attachment.relativePath);
    if (cached) {
      URL.revokeObjectURL(cached);
      this.objectUrls.delete(attachment.relativePath);
    }
    await this.appendTaskActivity(task, previous);
    await this.appendActivity("attachment.deleted", "attachment", attachment.id, {
      taskId: task.id,
      fileName: attachment.fileName,
    });
    await this.writeDerivedFiles(state);
  }

  async getAttachmentUrl(attachment: Attachment): Promise<string> {
    const cached = this.objectUrls.get(attachment.relativePath);
    if (cached) {
      return cached;
    }
    const file = await this.readFile(attachment.relativePath.split("/"));
    return this.cacheObjectUrl(attachment.relativePath, file);
  }

  async readAttachmentFile(attachment: Attachment): Promise<File> {
    return this.readFile(attachment.relativePath.split("/"));
  }

  async replaceWorkspace(
    state: WorkspaceState,
    attachmentFiles: WorkspaceAttachmentFile[],
  ): Promise<void> {
    await this.clearWorkspace();
    for (const path of WORKSPACE_STRUCTURE_PATHS) {
      await this.ensureDirectoryPath(path.split("/"));
    }
    await this.writeJson(["workspace.json"], state.workspace);
    await this.writeJson(["preferences.json"], state.preferences);
    await this.writeJson([".gtd-lite", "schema-version.json"], {
      schemaVersion: SCHEMA_VERSION,
    });
    for (const project of state.projects) {
      await this.ensureDirectoryPath(["projects", project.id, "tasks"]);
      await this.ensureDirectoryPath(["projects", project.id, "attachments"]);
      await this.writeJson(["projects", project.id, "project.json"], project);
    }
    await Promise.all(state.tasks.map((task) => this.writeTask(task)));
    for (const attachment of attachmentFiles) {
      await this.ensureDirectoryPath(attachment.relativePath.split("/").slice(0, -1));
      await this.writeFile(attachment.relativePath.split("/"), attachment.file);
    }
    await this.writeDerivedFiles(state);
    await this.appendActivity("workspace.loaded", "workspace", state.workspace.id, {
      source: "backup.imported",
    });
  }

  disposeObjectUrls(): void {
    for (const url of this.objectUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls.clear();
  }

  private async readProjects(): Promise<Project[]> {
    const projectsDir = await this.getDirectoryPath(["projects"], true);
    if (!projectsDir) {
      return [];
    }

    const projects: Project[] = [];
    for await (const [, handle] of projectsDir.entries()) {
      if (!isDirectoryHandle(handle)) {
        continue;
      }
      try {
        const project = parseProject(
          await this.readJsonFromDirectory(handle, ["project.json"]),
        );
        projects.push(project);
      } catch (error) {
        console.warn("Skipping invalid project directory", handle.name, error);
      }
    }

    return projects;
  }

  private cacheObjectUrl(relativePath: string, file: Blob): string {
    const cached = this.objectUrls.get(relativePath);
    if (cached) {
      URL.revokeObjectURL(cached);
    }
    const url = URL.createObjectURL(file);
    this.objectUrls.set(relativePath, url);
    return url;
  }

  private async readTasks(projects: Project[]): Promise<Task[]> {
    const tasks: Task[] = [];
    const inbox = await this.getDirectoryPath(["inbox"], true);

    if (inbox) {
      for await (const [name, handle] of inbox.entries()) {
        if (isFileHandle(handle) && name.endsWith(".json")) {
          tasks.push(parseTask(await this.readJsonFromFileHandle(handle)));
        }
      }
    }

    for (const project of projects) {
      const tasksDir = await this.getDirectoryPath(
        ["projects", project.id, "tasks"],
        true,
      );
      if (!tasksDir) {
        continue;
      }

      for await (const [name, handle] of tasksDir.entries()) {
        if (isFileHandle(handle) && name.endsWith(".json")) {
          tasks.push(parseTask(await this.readJsonFromFileHandle(handle)));
        }
      }
    }

    return tasks;
  }

  private async writeTask(task: Task, previous?: Task): Promise<void> {
    const previousPath = previous ? this.taskPath(previous) : undefined;
    const nextPath = this.taskPath(task);

    await this.ensureDirectoryPath(nextPath.slice(0, -1));
    await this.writeJson(nextPath, task);

    if (previousPath && previousPath.join("/") !== nextPath.join("/")) {
      await this.removeFile(previousPath);
    }
  }

  private async writeMigratedState(
    state: WorkspaceState,
    previousTasks: Map<string, Task>,
  ): Promise<void> {
    for (const path of WORKSPACE_STRUCTURE_PATHS) {
      await this.ensureDirectoryPath(path.split("/"));
    }

    await this.writeJson(["workspace.json"], state.workspace);
    await this.writeJson(["preferences.json"], state.preferences);
    await this.writeJson([".gtd-lite", "schema-version.json"], {
      schemaVersion: SCHEMA_VERSION,
    });

    for (const project of state.projects) {
      await this.ensureDirectoryPath(["projects", project.id, "tasks"]);
      await this.ensureDirectoryPath(["projects", project.id, "attachments"]);
      await this.writeJson(["projects", project.id, "project.json"], project);
    }

    await Promise.all(
      state.tasks.map((task) => this.writeTask(task, previousTasks.get(task.id))),
    );
    await this.writeDerivedFiles(state);
  }

  private async appendTaskActivity(task: Task, previous?: Task): Promise<void> {
    let action: ActivityAction = previous ? "task.updated" : "task.created";
    const payload: Record<string, unknown> = { title: task.title };

    if (previous && previous.status !== task.status) {
      action = "task.statusChanged";
      payload.from = previous.status;
      payload.to = task.status;
    }

    await this.appendActivity(action, "task", task.id, payload);
  }

  private taskPath(task: Task): Path {
    return task.projectId
      ? ["projects", task.projectId, "tasks", `${task.id}.json`]
      : ["inbox", `${task.id}.json`];
  }

  private async writeDerivedFiles(state: WorkspaceState): Promise<void> {
    const writes = [this.writeIndexFile(state)];
    if (state.preferences.markdownExportEnabled) {
      writes.push(this.writeMarkdownExportFiles(state));
    }
    await Promise.all(writes);
    await this.appendActivity("index.rebuilt", "index", state.workspace.id);
    if (state.preferences.markdownExportEnabled) {
      await this.appendActivity("markdown.exported", "workspace", state.workspace.id);
    }
  }

  private async writeIndexFile(state: WorkspaceState): Promise<void> {
    const index: WorkspaceIndex = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      projects: state.projects.map((project) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        taskCount: state.tasks.filter((task) => task.projectId === project.id).length,
        updatedAt: project.updatedAt,
      })),
      tasks: state.tasks.map((task) => ({
        id: task.id,
        projectId: task.projectId,
        parentTaskId: task.parentTaskId,
        title: task.title,
        assignee: task.assignee,
        status: task.status,
        priority: task.priority,
        importance: task.importance,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      })),
    };

    await this.writeJson([".gtd-lite", "index.json"], index);
  }

  private async writeMarkdownExportFiles(state: WorkspaceState): Promise<void> {
    const exports = generateMarkdownExports(state.tasks, state.projects);
    await Promise.all(exports.map((file) => this.writeMarkdownExport(file)));
  }

  private async writeMarkdownExport(file: MarkdownExportFile): Promise<void> {
    await this.ensureDirectoryPath(file.path.slice(0, -1));
    await this.writeFile(file.path, file.content);
  }

  private async clearWorkspace(): Promise<void> {
    this.disposeObjectUrls();
    for await (const [name] of this.root.entries()) {
      try {
        await this.root.removeEntry(name, { recursive: true });
      } catch {
        // Best-effort cleanup lets import retry writes into a partly empty workspace.
      }
    }
  }

  private async appendActivity(
    action: ActivityAction,
    entityType: ActivityLogEntry["entityType"],
    entityId: string,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    const entry: ActivityLogEntry = {
      id: createId("log"),
      action,
      entityType,
      entityId,
      createdAt: new Date().toISOString(),
      payload,
    };
    const path = [".gtd-lite", "activity-log.jsonl"];
    const file = await this.getFileHandle(path, true);
    const size = (await file.getFile()).size;
    const writable = await file.createWritable({ keepExistingData: true });
    await writable.seek(size);
    await writable.write(`${JSON.stringify(entry)}\n`);
    await writable.close();
  }

  private async fileExists(path: Path): Promise<boolean> {
    try {
      await this.getFileHandle(path, false);
      return true;
    } catch {
      return false;
    }
  }

  private async readJson(path: Path): Promise<unknown> {
    const text = await this.readText(path);
    return JSON.parse(text);
  }

  private async readOptionalJson(path: Path): Promise<unknown | undefined> {
    const text = await this.readOptionalText(path);
    return text ? JSON.parse(text) : undefined;
  }

  private async readJsonFromDirectory(
    directory: FileSystemDirectoryHandle,
    path: Path,
  ): Promise<unknown> {
    const file = await this.getFileHandleFromDirectory(directory, path, false);
    return this.readJsonFromFileHandle(file);
  }

  private async readJsonFromFileHandle(fileHandle: FileSystemFileHandle): Promise<unknown> {
    return JSON.parse(await (await fileHandle.getFile()).text());
  }

  private async readText(path: Path): Promise<string> {
    return (await this.readFile(path)).text();
  }

  private async readOptionalText(path: Path): Promise<string | undefined> {
    try {
      return await this.readText(path);
    } catch {
      return undefined;
    }
  }

  private async readFile(path: Path): Promise<File> {
    return (await this.getFileHandle(path, false)).getFile();
  }

  private async writeJson(path: Path, value: unknown): Promise<void> {
    await this.writeFile(path, serializeJson(value));
  }

  private async writeFile(path: Path, value: Blob | string): Promise<void> {
    const file = await this.getFileHandle(path, true);
    const writable = await file.createWritable();
    await writable.write(value);
    await writable.close();
  }

  private async removeFile(path: Path): Promise<void> {
    const directory = await this.getDirectoryPath(path.slice(0, -1), false);
    if (!directory) {
      return;
    }
    try {
      await directory.removeEntry(path[path.length - 1]);
    } catch {
      // A stale previous path is harmless; the current task file is already written.
    }
  }

  private async removeDirectory(path: Path): Promise<void> {
    const directory = await this.getDirectoryPath(path.slice(0, -1), true);
    if (!directory) {
      return;
    }
    try {
      await directory.removeEntry(path[path.length - 1], { recursive: true });
    } catch {
      // Missing generated directories should not block deleting the owning entity.
    }
  }

  private async getFileHandle(
    path: Path,
    create: boolean,
  ): Promise<FileSystemFileHandle> {
    return this.getFileHandleFromDirectory(this.root, path, create);
  }

  private async getFileHandleFromDirectory(
    directory: FileSystemDirectoryHandle,
    path: Path,
    create: boolean,
  ): Promise<FileSystemFileHandle> {
    const parent = await this.getDirectoryHandleFromDirectory(
      directory,
      path.slice(0, -1),
      create,
    );
    return parent.getFileHandle(path[path.length - 1], { create });
  }

  private async ensureDirectoryPath(path: Path): Promise<FileSystemDirectoryHandle> {
    return this.getDirectoryHandleFromDirectory(this.root, path, true);
  }

  private async getDirectoryPath(
    path: Path,
    optional: boolean,
  ): Promise<FileSystemDirectoryHandle | undefined> {
    try {
      return await this.getDirectoryHandleFromDirectory(this.root, path, false);
    } catch (error) {
      if (optional) {
        return undefined;
      }
      throw error;
    }
  }

  private async getDirectoryHandleFromDirectory(
    directory: FileSystemDirectoryHandle,
    path: Path,
    create: boolean,
  ): Promise<FileSystemDirectoryHandle> {
    return getDirectoryHandleFromDirectory(directory, path, create);
  }
}

async function getDirectoryHandleFromDirectory(
  directory: FileSystemDirectoryHandle,
  path: Path,
  create: boolean,
): Promise<FileSystemDirectoryHandle> {
  let current = directory;
  for (const part of path) {
    current = await current.getDirectoryHandle(part, { create });
  }
  return current;
}

async function assertWritableFileHandles(root: FileSystemDirectoryHandle): Promise<void> {
  const probeName = `.squirrel-opfs-write-test-${Date.now()}.tmp`;
  const probe = await root.getFileHandle(probeName, { create: true });
  const writable = await probe.createWritable();
  await writable.write("ok");
  await writable.close();
  await root.removeEntry(probeName);
}

function createAttachmentFileName(originalName: string): string {
  const safeOriginal = originalName
    .trim()
    .replaceAll("\\", "_")
    .replaceAll("/", "_")
    .replace(/[^\w.\-]+/g, "_");

  return `${createTimestampSlug()}_${safeOriginal || "attachment"}`;
}

function isDirectoryHandle(handle: FileSystemHandle): handle is FileSystemDirectoryHandle {
  return handle.kind === "directory";
}

function isFileHandle(handle: FileSystemHandle): handle is FileSystemFileHandle {
  return handle.kind === "file";
}

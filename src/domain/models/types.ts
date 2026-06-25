export const SCHEMA_VERSION = 1;

export type ProjectStatus = "active" | "paused" | "completed" | "archived";

export type TaskStatus =
  | "inbox"
  | "todo"
  | "in_progress"
  | "waiting"
  | "blocked"
  | "done"
  | "cancelled"
  | "archived";

export type BoardTaskStatus =
  | "inbox"
  | "todo"
  | "in_progress"
  | "waiting"
  | "blocked"
  | "done";

export type TaskPriority = "none" | "low" | "medium" | "high" | "urgent";

export type TaskImportance = "none" | "low" | "medium" | "high";

export type AttachmentType = "image" | "file" | "link";

export type WorkspaceView = "dashboard" | "kanban" | "list";

export type TaskSortMode = "manual" | "dueDate" | "priority";

export type AppTheme = "system" | "light" | "dark";

export interface Workspace {
  id: string;
  name: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  color?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface Attachment {
  id: string;
  type: AttachmentType;
  fileName: string;
  relativePath: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId?: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  assignee?: string;
  status: TaskStatus;
  priority: TaskPriority;
  importance: TaskImportance;
  dueDate?: string;
  startDate?: string;
  completedAt?: string;
  tags: string[];
  attachments: Attachment[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  nickname: string;
  avatarPresetId?: string;
}

export interface WorkspacePreferences {
  defaultView: WorkspaceView;
  defaultProjectId?: string;
  boardColumns: BoardTaskStatus[];
  dueSoonDays: number;
  autoArchiveDoneAfterDays: number;
  markdownExportEnabled: boolean;
  screenshotTaskDefaultProjectId?: string;
  taskSortMode: TaskSortMode;
  userProfile: UserProfile;
  tags: string[];
}

export interface RecentWorkspace {
  id: string;
  name: string;
  lastOpenedAt: string;
}

export interface AppPreferences {
  recentWorkspaces: RecentWorkspace[];
  theme: AppTheme;
}

export interface WorkspaceState {
  workspace: Workspace;
  preferences: WorkspacePreferences;
  projects: Project[];
  tasks: Task[];
}

export type ActivityAction =
  | "workspace.initialized"
  | "workspace.loaded"
  | "workspace.preferencesUpdated"
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "task.created"
  | "task.updated"
  | "task.statusChanged"
  | "task.deleted"
  | "attachment.created"
  | "index.rebuilt"
  | "markdown.exported";

export interface ActivityLogEntry {
  id: string;
  action: ActivityAction;
  entityType: "workspace" | "project" | "task" | "attachment" | "index";
  entityId: string;
  createdAt: string;
  payload?: Record<string, unknown>;
}

export interface ProjectIndexItem {
  id: string;
  name: string;
  status: ProjectStatus;
  taskCount: number;
  updatedAt: string;
}

export interface TaskIndexItem {
  id: string;
  projectId?: string;
  parentTaskId?: string;
  title: string;
  assignee?: string;
  status: TaskStatus;
  priority: TaskPriority;
  importance: TaskImportance;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceIndex {
  schemaVersion: number;
  generatedAt: string;
  projects: ProjectIndexItem[];
  tasks: TaskIndexItem[];
}

export interface DashboardBucket {
  count: number;
  tasks: Task[];
}

export interface ProjectDashboardItem {
  project: Project;
  total: number;
  active: number;
  done: number;
  blocked: number;
  waiting: number;
  progress: number;
  nextDueDate?: string;
}

export interface DashboardSummary {
  overdue: DashboardBucket;
  dueToday: DashboardBucket;
  dueSoon: DashboardBucket;
  blocked: DashboardBucket;
  waiting: DashboardBucket;
  inbox: DashboardBucket;
  projects: ProjectDashboardItem[];
}

export const BOARD_STATUSES: BoardTaskStatus[] = [
  "inbox",
  "todo",
  "in_progress",
  "waiting",
  "blocked",
  "done",
];

export const TASK_STATUSES: TaskStatus[] = [
  "inbox",
  "todo",
  "in_progress",
  "waiting",
  "blocked",
  "done",
  "cancelled",
  "archived",
];

export const TASK_PRIORITIES: TaskPriority[] = [
  "none",
  "low",
  "medium",
  "high",
  "urgent",
];

export const TASK_IMPORTANCES: TaskImportance[] = [
  "none",
  "low",
  "medium",
  "high",
];

export const statusLabel: Record<TaskStatus, string> = {
  inbox: "Inbox",
  todo: "Todo",
  in_progress: "In Progress",
  waiting: "Waiting",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
  archived: "Archived",
};

export const priorityLabel: Record<TaskPriority, string> = {
  none: "None",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const importanceLabel: Record<TaskImportance, string> = {
  none: "None",
  low: "Low",
  medium: "Medium",
  high: "High",
};

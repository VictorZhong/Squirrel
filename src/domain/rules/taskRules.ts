import {
  Attachment,
  Project,
  ProjectStatus,
  Task,
  TaskImportance,
  TaskPriority,
  TaskStatus,
} from "../models/types";
import { formatDateTimeForTitle } from "./dateRules";
import { createId } from "../../utils/id";

export interface CreateTaskInput {
  title: string;
  projectId?: string;
  parentTaskId?: string;
  assignee?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  importance?: TaskImportance;
  dueDate?: string;
  description?: string;
  sortOrder?: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
  sortOrder?: number;
  status?: ProjectStatus;
}

export function createTask(input: CreateTaskInput, now = new Date()): Task {
  const timestamp = now.toISOString();
  const status = input.status ?? (input.projectId ? "todo" : "inbox");

  return {
    id: createId("task"),
    projectId: input.projectId,
    parentTaskId: input.parentTaskId,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    assignee: input.assignee?.trim() || undefined,
    status,
    priority: input.priority ?? "none",
    importance: input.importance ?? "none",
    dueDate: input.dueDate,
    tags: [],
    attachments: [],
    sortOrder: input.sortOrder ?? Date.now(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createScreenshotTaskTitle(now = new Date()): string {
  return `Screenshot task - ${formatDateTimeForTitle(now)}`;
}

export function createProject(input: CreateProjectInput, now = new Date()): Project {
  const timestamp = now.toISOString();

  return {
    id: createId("prj"),
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    status: input.status ?? "active",
    color: input.color,
    sortOrder: input.sortOrder ?? Date.now(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function applyTaskStatus(
  task: Task,
  status: TaskStatus,
  now = new Date(),
): Task {
  const timestamp = now.toISOString();
  const completedAt = status === "done" ? task.completedAt ?? timestamp : undefined;

  return {
    ...task,
    status,
    completedAt,
    updatedAt: timestamp,
  };
}

export function touchTask(task: Task, now = new Date()): Task {
  return {
    ...task,
    updatedAt: now.toISOString(),
  };
}

export function isArchivedStatus(status: TaskStatus): boolean {
  return status === "archived" || status === "cancelled";
}

export function isActiveTask(task: Task): boolean {
  return !isArchivedStatus(task.status) && task.status !== "done";
}

export function isParentTask(task: Task): boolean {
  return !task.parentTaskId;
}

export function promoteSubtask(task: Task, now = new Date()): Task {
  return {
    ...task,
    parentTaskId: undefined,
    updatedAt: now.toISOString(),
  };
}

export function normalizeSortOrders(tasks: Task[]): Task[] {
  return tasks.map((task, index) => ({
    ...task,
    sortOrder: index,
  }));
}

export function appendAttachment(task: Task, attachment: Attachment, now = new Date()): Task {
  return {
    ...task,
    attachments: [...task.attachments, attachment],
    updatedAt: now.toISOString(),
  };
}

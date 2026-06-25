import {
  Task,
  TaskImportance,
  TaskPriority,
  TaskStatus,
  importanceLabel,
  priorityLabel,
  statusLabel,
} from "../domain/models/types";
import { compareDateOnly } from "../domain/rules/dateRules";

const priorityRank: Record<TaskPriority, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

const importanceRank: Record<TaskImportance, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

export function sortTasksForDisplay(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status.localeCompare(b.status);
    }
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
      return compareDateOnly(a.dueDate, b.dueDate);
    }
    if (a.dueDate && !b.dueDate) {
      return -1;
    }
    if (!a.dueDate && b.dueDate) {
      return 1;
    }
    if (priorityRank[a.priority] !== priorityRank[b.priority]) {
      return priorityRank[b.priority] - priorityRank[a.priority];
    }
    return a.sortOrder - b.sortOrder;
  });
}

export function parentTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => !task.parentTaskId);
}

export function taskMetaText(task: Task): string {
  return [
    task.dueDate ? `Due ${task.dueDate}` : undefined,
    task.priority !== "none" ? priorityLabel[task.priority] : undefined,
    task.importance !== "none" ? `${importanceLabel[task.importance]} importance` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function statusClassName(status: TaskStatus): string {
  return `status-${status.replaceAll("_", "-")}`;
}

export function statusText(status: TaskStatus): string {
  return statusLabel[status];
}

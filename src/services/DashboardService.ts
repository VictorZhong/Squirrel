import {
  DashboardBucket,
  DashboardSummary,
  Project,
  ProjectDashboardItem,
  Task,
} from "../domain/models/types";
import { addDays, compareDateOnly, isDateInRange, toDateOnly } from "../domain/rules/dateRules";
import { isActiveTask, isParentTask } from "../domain/rules/taskRules";

export function calculateDashboard(
  tasks: Task[],
  projects: Project[],
  todayDate = new Date(),
  dueSoonDays = 7,
): DashboardSummary {
  const today = toDateOnly(todayDate);
  const soon = addDays(today, dueSoonDays);
  const parentTasks = tasks.filter(isParentTask);
  const activeParentTasks = parentTasks.filter(isActiveTask);

  const overdueTasks = activeParentTasks.filter(
    (task) => task.dueDate && compareDateOnly(task.dueDate, today) < 0,
  );
  const dueTodayTasks = activeParentTasks.filter((task) => task.dueDate === today);
  const dueSoonTasks = activeParentTasks.filter(
    (task) =>
      task.dueDate &&
      task.dueDate !== today &&
      isDateInRange(task.dueDate, today, soon),
  );
  const blockedTasks = activeParentTasks.filter((task) => task.status === "blocked");
  const waitingTasks = activeParentTasks.filter((task) => task.status === "waiting");
  const inboxTasks = activeParentTasks.filter((task) => task.status === "inbox");

  return {
    overdue: bucket(overdueTasks),
    dueToday: bucket(dueTodayTasks),
    dueSoon: bucket(dueSoonTasks),
    blocked: bucket(blockedTasks),
    waiting: bucket(waitingTasks),
    inbox: bucket(inboxTasks),
    projects: projects
      .filter((project) => project.status !== "archived")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((project) => projectDashboardItem(project, parentTasks)),
  };
}

function bucket(tasks: Task[]): DashboardBucket {
  return {
    count: tasks.length,
    tasks: sortTasks(tasks),
  };
}

function projectDashboardItem(project: Project, tasks: Task[]): ProjectDashboardItem {
  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  const total = projectTasks.filter((task) => task.status !== "cancelled").length;
  const done = projectTasks.filter((task) => task.status === "done").length;
  const active = projectTasks.filter(isActiveTask).length;
  const blocked = projectTasks.filter((task) => task.status === "blocked").length;
  const waiting = projectTasks.filter((task) => task.status === "waiting").length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
  const nextDueDate = projectTasks
    .filter((task) => isActiveTask(task) && task.dueDate)
    .map((task) => task.dueDate as string)
    .sort(compareDateOnly)[0];

  return {
    project,
    total,
    active,
    done,
    blocked,
    waiting,
    progress,
    nextDueDate,
  };
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
      return compareDateOnly(a.dueDate, b.dueDate);
    }
    if (a.dueDate && !b.dueDate) {
      return -1;
    }
    if (!a.dueDate && b.dueDate) {
      return 1;
    }
    return a.sortOrder - b.sortOrder;
  });
}

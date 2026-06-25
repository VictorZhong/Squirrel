import { describe, expect, it } from "vitest";
import { Project, Task } from "../domain/models/types";
import { createProject, createTask } from "../domain/rules/taskRules";
import { calculateDashboard } from "./DashboardService";

describe("calculateDashboard", () => {
  it("groups due, blocked, waiting, and inbox tasks", () => {
    const today = new Date(2026, 5, 25, 12);
    const project = createProject({ name: "Core" }, today);
    const tasks: Task[] = [
      createTask({
        title: "Late",
        projectId: project.id,
        status: "todo",
        dueDate: "2026-06-24",
      }),
      createTask({
        title: "Today",
        projectId: project.id,
        status: "todo",
        dueDate: "2026-06-25",
      }),
      createTask({
        title: "Soon",
        projectId: project.id,
        status: "todo",
        dueDate: "2026-06-30",
      }),
      createTask({ title: "Blocked", projectId: project.id, status: "blocked" }),
      createTask({ title: "Waiting", projectId: project.id, status: "waiting" }),
      createTask({ title: "Inbox", status: "inbox" }),
      createTask({
        title: "Subtask ignored",
        parentTaskId: "task_parent",
        status: "todo",
        dueDate: "2026-06-24",
      }),
    ];

    const dashboard = calculateDashboard(tasks, [project], today, 7);

    expect(dashboard.overdue.count).toBe(1);
    expect(dashboard.dueToday.count).toBe(1);
    expect(dashboard.dueSoon.count).toBe(1);
    expect(dashboard.blocked.count).toBe(1);
    expect(dashboard.waiting.count).toBe(1);
    expect(dashboard.inbox.count).toBe(1);
    expect(dashboard.projects[0].active).toBe(5);
  });

  it("calculates project progress from done tasks", () => {
    const today = new Date(2026, 5, 25, 12);
    const project: Project = createProject({ name: "Migration" }, today);
    const tasks = [
      createTask({ title: "Done", projectId: project.id, status: "done" }),
      createTask({ title: "Todo", projectId: project.id, status: "todo" }),
    ];

    const dashboard = calculateDashboard(tasks, [project], today);

    expect(dashboard.projects[0].progress).toBe(50);
  });
});

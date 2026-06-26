import { describe, expect, it } from "vitest";
import { PROJECT_COLOR_VALUES } from "../models/projectColors";
import { applyTaskStatus, createProject, createTask, promoteSubtask } from "./taskRules";

describe("taskRules", () => {
  it("sets completedAt when a task moves to done", () => {
    const now = new Date(2026, 5, 25, 10, 30);
    const task = createTask({ title: "Ship v0.1", status: "todo" }, now);
    const done = applyTaskStatus(task, "done", now);

    expect(done.status).toBe("done");
    expect(done.completedAt).toBe(now.toISOString());
  });

  it("clears completedAt when a done task moves back to active work", () => {
    const now = new Date(2026, 5, 25, 10, 30);
    const task = applyTaskStatus(createTask({ title: "Review" }, now), "done", now);
    const reopened = applyTaskStatus(task, "in_progress", new Date(2026, 5, 26, 9));

    expect(reopened.status).toBe("in_progress");
    expect(reopened.completedAt).toBeUndefined();
  });

  it("promotes a subtask by removing parentTaskId", () => {
    const subtask = createTask({
      title: "Small step",
      parentTaskId: "task_parent",
      projectId: "prj_one",
    });

    expect(promoteSubtask(subtask).parentTaskId).toBeUndefined();
  });

  it("assigns a preset color to new projects", () => {
    const project = createProject({ name: "New project" });

    expect(PROJECT_COLOR_VALUES).toContain(project.color);
  });
});

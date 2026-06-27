import { describe, expect, it } from "vitest";
import { Project } from "../domain/models/types";
import { createTask } from "../domain/rules/taskRules";
import { filterTasksBySearch } from "./taskSearch";

const projects: Project[] = [
  {
    id: "project-design",
    name: "Design System",
    status: "active",
    sortOrder: 0,
    createdAt: "2026-06-27T00:00:00.000Z",
    updatedAt: "2026-06-27T00:00:00.000Z",
  },
];

describe("taskSearch", () => {
  it("matches task text, tags, assignee, and project name", () => {
    const designTask = {
      ...createTask({
        title: "Review empty state",
        projectId: "project-design",
        assignee: "Victor",
      }),
      description: "Check mobile spacing",
      tags: ["copy"],
    };
    const otherTask = createTask({ title: "Pay bills" });

    expect(filterTasksBySearch([designTask, otherTask], "victor copy design", projects)).toEqual([
      designTask,
    ]);
  });

  it("returns all tasks for blank queries", () => {
    const task = createTask({ title: "Keep me" });

    expect(filterTasksBySearch([task], "   ", projects)).toEqual([task]);
  });
});

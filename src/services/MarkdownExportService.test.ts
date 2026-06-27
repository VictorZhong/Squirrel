import { describe, expect, it } from "vitest";
import { createProject, createTask } from "../domain/rules/taskRules";
import { generateMarkdownExports } from "./MarkdownExportService";

describe("generateMarkdownExports", () => {
  it("creates readable mirror files for todo tasks and projects", () => {
    const project = createProject({ name: "Payment Agent UI" });
    const todoTask = createTask({ title: "Triage screenshot", status: "todo" });
    const projectTask = createTask({
      title: "Build task card",
      projectId: project.id,
      status: "todo",
      dueDate: "2026-06-28",
      priority: "high",
    });

    const files = generateMarkdownExports(
      [todoTask, projectTask],
      [project],
      new Date(2026, 5, 25, 12),
    );

    expect(files.map((file) => file.path.join("/"))).toContain(
      "exports/markdown/todo.md",
    );
    expect(files.find((file) => file.path.at(-1) === "todo.md")?.content).toContain(
      "Triage screenshot",
    );
    expect(files.find((file) => file.path.at(-1) === "projects.md")?.content).toContain(
      "Payment Agent UI",
    );
    expect(files.find((file) => file.path.at(-1) === "projects.md")?.content).toContain(
      "Due: 2026-06-28",
    );
  });
});

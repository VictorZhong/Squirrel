import { describe, expect, it } from "vitest";
import { createProject, createTask } from "../domain/rules/taskRules";
import { generateMarkdownExports } from "./MarkdownExportService";

describe("generateMarkdownExports", () => {
  it("creates readable mirror files for inbox and projects", () => {
    const project = createProject({ name: "Payment Agent UI" });
    const inboxTask = createTask({ title: "Triage screenshot", status: "inbox" });
    const projectTask = createTask({
      title: "Build task card",
      projectId: project.id,
      status: "todo",
      dueDate: "2026-06-28",
      priority: "high",
    });

    const files = generateMarkdownExports(
      [inboxTask, projectTask],
      [project],
      new Date(2026, 5, 25, 12),
    );

    expect(files.map((file) => file.path.join("/"))).toContain(
      "exports/markdown/inbox.md",
    );
    expect(files.find((file) => file.path.at(-1) === "inbox.md")?.content).toContain(
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

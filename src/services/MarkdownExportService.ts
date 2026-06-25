import { Project, Task, statusLabel } from "../domain/models/types";
import { calculateDashboard } from "./DashboardService";

export interface MarkdownExportFile {
  path: string[];
  content: string;
}

export function generateMarkdownExports(
  tasks: Task[],
  projects: Project[],
  now = new Date(),
): MarkdownExportFile[] {
  const dashboard = calculateDashboard(tasks, projects, now);

  return [
    {
      path: ["exports", "markdown", "inbox.md"],
      content: renderTaskList("Inbox", dashboard.inbox.tasks),
    },
    {
      path: ["exports", "markdown", "waiting.md"],
      content: renderTaskList("Waiting", dashboard.waiting.tasks),
    },
    {
      path: ["exports", "markdown", "overdue.md"],
      content: renderTaskList("Overdue", dashboard.overdue.tasks),
    },
    {
      path: ["exports", "markdown", "next-actions.md"],
      content: renderTaskList(
        "Next Actions",
        tasks.filter((task) => !task.parentTaskId && task.status === "todo"),
      ),
    },
    {
      path: ["exports", "markdown", "projects.md"],
      content: renderProjects(projects, tasks),
    },
  ];
}

function renderProjects(projects: Project[], tasks: Task[]): string {
  const sections = projects
    .filter((project) => project.status !== "archived")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((project) => {
      const projectTasks = tasks.filter(
        (task) => task.projectId === project.id && !task.parentTaskId,
      );
      return [
        `## ${project.name}`,
        project.description ? `\n${project.description}\n` : "",
        ...["todo", "in_progress", "waiting", "blocked", "done"].map((status) =>
          renderStatusSection(
            statusLabel[status as keyof typeof statusLabel],
            projectTasks.filter((task) => task.status === status),
          ),
        ),
      ].join("\n");
    });

  return [`# Projects`, "", ...sections].join("\n").trimEnd() + "\n";
}

function renderTaskList(title: string, tasks: Task[]): string {
  return [`# ${title}`, "", ...tasks.map(renderTaskLine)].join("\n").trimEnd() + "\n";
}

function renderStatusSection(title: string, tasks: Task[]): string {
  if (tasks.length === 0) {
    return `### ${title}\n\n_No tasks._\n`;
  }
  return [`### ${title}`, "", ...tasks.map(renderTaskLine), ""].join("\n");
}

function renderTaskLine(task: Task): string {
  const done = task.status === "done" ? "x" : " ";
  const meta = [
    task.dueDate ? `Due: ${task.dueDate}` : undefined,
    task.priority !== "none" ? `Priority: ${task.priority}` : undefined,
    task.importance !== "none" ? `Importance: ${task.importance}` : undefined,
    task.tags.length > 0 ? `Tags: ${task.tags.join(", ")}` : undefined,
  ].filter(Boolean);

  if (meta.length === 0) {
    return `- [${done}] ${task.title}`;
  }

  return `- [${done}] ${task.title}\n  ${meta.join(" | ")}`;
}

import { Button, Empty, Tag } from "antd";
import dayjs from "dayjs";
import { Project, Task, priorityLabel } from "../../domain/models/types";

interface TimelineViewProps {
  tasks: Task[];
  projects: Project[];
  onOpenTask: (task: Task) => void;
}

export function TimelineView({ tasks, projects, onOpenTask }: TimelineViewProps) {
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const groups = groupCompletedTasks(tasks);
  const totalDone = groups.reduce((sum, group) => sum + group.tasks.length, 0);

  if (groups.length === 0) {
    return (
      <section className="timeline-view">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No completed tasks yet" />
      </section>
    );
  }

  return (
    <section className="timeline-view">
      <section className="timeline-summary">
        <span>Completed main tasks</span>
        <strong>{totalDone}</strong>
      </section>
      <div className="completion-timeline">
        {groups.map((group) => (
          <section className="timeline-day" key={group.date}>
            <div className="timeline-date">
              <strong>{formatDate(group.date)}</strong>
              <span>{group.tasks.length}</span>
            </div>
            <div className="timeline-task-list">
              {group.tasks.map((task) => (
                <Button
                  key={task.id}
                  className="timeline-task-button"
                  onClick={() => onOpenTask(task)}
                >
                  <span>{task.title}</span>
                  <small>
                    {task.projectId ? projectNames.get(task.projectId) ?? "Project" : "Inbox"}
                    {task.completedAt ? ` · ${formatTime(task.completedAt)}` : ""}
                  </small>
                  {task.priority !== "none" ? <Tag>{priorityLabel[task.priority]}</Tag> : null}
                </Button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function groupCompletedTasks(tasks: Task[]) {
  const doneTasks = tasks
    .filter((task) => !task.parentTaskId && task.status === "done" && task.completedAt)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  const groups = new Map<string, Task[]>();

  for (const task of doneTasks) {
    const date = dayjs(task.completedAt).format("YYYY-MM-DD");
    groups.set(date, [...(groups.get(date) ?? []), task]);
  }

  return Array.from(groups.entries()).map(([date, groupTasks]) => ({
    date,
    tasks: groupTasks,
  }));
}

function formatDate(date: string): string {
  return dayjs(date).format("MMM D, YYYY");
}

function formatTime(date: string): string {
  return dayjs(date).format("HH:mm");
}

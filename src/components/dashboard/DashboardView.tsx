import { Button, Progress, Tag } from "antd";
import { AlertCircle, CalendarClock, CirclePause, Inbox, TimerReset } from "lucide-react";
import dayjs from "dayjs";
import { DashboardSummary, Project, Task } from "../../domain/models/types";
import { getTaskProjectColor, getTaskProjectName } from "../../utils/projectDisplay";
import { TaskCard } from "../task/TaskCard";

interface DashboardViewProps {
  dashboard: DashboardSummary;
  tasks: Task[];
  projects: Project[];
  onOpenTask: (task: Task) => void;
  onOpenProject: (projectId: string) => void;
  onToggleSubtask: (task: Task, done: boolean) => Promise<void>;
  onOpenRoute: (
    route:
      | "overdue"
      | "today"
      | "upcoming"
      | "blocked"
      | "waiting"
      | "inbox"
      | "timeline",
  ) => void;
}

export function DashboardView({
  dashboard,
  tasks,
  projects,
  onOpenTask,
  onOpenProject,
  onToggleSubtask,
  onOpenRoute,
}: DashboardViewProps) {
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const metrics = [
    { label: "Overdue", value: dashboard.overdue.count, icon: AlertCircle, route: "overdue" },
    { label: "Due Today", value: dashboard.dueToday.count, icon: TimerReset, route: "today" },
    {
      label: "Due in 7 Days",
      value: dashboard.dueSoon.count,
      icon: CalendarClock,
      route: "upcoming",
    },
    { label: "Blocked", value: dashboard.blocked.count, icon: CirclePause, route: "blocked" },
    { label: "Waiting", value: dashboard.waiting.count, icon: CirclePause, route: "waiting" },
    { label: "Inbox", value: dashboard.inbox.count, icon: Inbox, route: "inbox" },
  ];

  return (
    <div className="dashboard-view">
      <section className="metric-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <button
              type="button"
              key={metric.label}
              className="metric-panel"
              onClick={() => onOpenRoute(metric.route as Parameters<typeof onOpenRoute>[0])}
            >
              <div className="metric-icon">
                <Icon size={18} />
              </div>
              <span className="metric-value">{metric.value}</span>
              <span className="metric-label">{metric.label}</span>
            </button>
          );
        })}
      </section>

      <CompletionHeatmap
        tasks={tasks}
        onOpenTask={onOpenTask}
        onOpenTimeline={() => onOpenRoute("timeline")}
      />

      <section className="dashboard-lanes">
        <TaskLane
          title="Overdue Tasks"
          tasks={dashboard.overdue.tasks}
          allTasks={tasks}
          projectNames={projectNames}
          projectsById={projectsById}
          onOpenTask={onOpenTask}
          onToggleSubtask={onToggleSubtask}
        />
        <TaskLane
          title="Due This Week"
          tasks={[...dashboard.dueToday.tasks, ...dashboard.dueSoon.tasks]}
          allTasks={tasks}
          projectNames={projectNames}
          projectsById={projectsById}
          onOpenTask={onOpenTask}
          onToggleSubtask={onToggleSubtask}
        />
        <TaskLane
          title="Blocked / Waiting"
          tasks={[...dashboard.blocked.tasks, ...dashboard.waiting.tasks]}
          allTasks={tasks}
          projectNames={projectNames}
          projectsById={projectsById}
          onOpenTask={onOpenTask}
          onToggleSubtask={onToggleSubtask}
        />
      </section>

      <section className="project-overview">
        <div className="section-heading">
          <h2>Projects</h2>
          <span>{projects.length}</span>
        </div>
        <div className="project-grid">
          {dashboard.projects.map((item) => (
            <button
              type="button"
              key={item.project.id}
              className="project-tile"
              onClick={() => onOpenProject(item.project.id)}
            >
              <span className="project-tile-name">{item.project.name}</span>
              <span className="project-tile-meta">
                Todo {item.active} · Done {item.done}
              </span>
              <Progress percent={item.progress} size="small" showInfo={false} />
              <span className="project-tile-footer">
                {item.nextDueDate ? <Tag variant="filled">{item.nextDueDate}</Tag> : <Tag variant="filled">No due date</Tag>}
                {item.blocked > 0 ? <Tag color="red">{item.blocked} blocked</Tag> : null}
                {item.waiting > 0 ? <Tag color="gold">{item.waiting} waiting</Tag> : null}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function CompletionHeatmap({
  tasks,
  onOpenTask,
  onOpenTimeline,
}: {
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onOpenTimeline: () => void;
}) {
  const doneTasks = tasks.filter(
    (task) => !task.parentTaskId && task.status === "done" && task.completedAt,
  );
  const weeks = buildCompletionWeeks(doneTasks);
  const totalDone = doneTasks.length;
  const recentDoneTasks = [...doneTasks]
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .slice(0, 5);
  const lastSevenDays = doneTasks.filter((task) =>
    task.completedAt
      ? dayjs(task.completedAt).isAfter(dayjs().subtract(7, "day").startOf("day"))
      : false,
  ).length;
  const bestDay = getBestCompletionDay(doneTasks);

  return (
    <section className="completion-panel">
      <div className="section-heading">
        <div>
          <h2>Completion Heatmap</h2>
          <span>
            {totalDone} completed main tasks · {weeks.length >= 53 ? "1 year" : "6 months"}
          </span>
        </div>
        <Button size="small" onClick={onOpenTimeline}>
          Timeline
        </Button>
      </div>
      <div className="completion-panel-body">
        <div className="heatmap-shell" aria-label="Completed task heatmap">
          <div className="heatmap-grid">
            {weeks.map((week, weekIndex) => (
              <div className="heatmap-week" key={`week-${weekIndex}`}>
                {week.map((day) => (
                  <span
                    key={day.date}
                    className={`heatmap-cell heatmap-level-${day.level} ${
                      day.isFuture ? "heatmap-cell-future" : ""
                    }`}
                    title={`${day.date}: ${day.count} completed`}
                    aria-label={`${day.date}: ${day.count} completed`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="heatmap-legend" aria-hidden="true">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <i key={level} className={`heatmap-cell heatmap-level-${level}`} />
            ))}
            <span>More</span>
          </div>
        </div>
        <aside className="completion-insight">
          <div className="completion-stats">
            <span>
              <strong>{lastSevenDays}</strong>
              Last 7 days
            </span>
            <span>
              <strong>{bestDay?.count ?? 0}</strong>
              Best day
            </span>
          </div>
          <div className="recent-completions">
            <span>Recent completions</span>
            {recentDoneTasks.map((task) => (
              <button
                type="button"
                key={task.id}
                className="recent-completion-item"
                onClick={() => onOpenTask(task)}
              >
                <strong>{task.title}</strong>
                <small>{task.completedAt ? dayjs(task.completedAt).format("MMM D") : ""}</small>
              </button>
            ))}
            {recentDoneTasks.length === 0 ? <span className="empty-line">No completions</span> : null}
          </div>
        </aside>
      </div>
    </section>
  );
}

function buildCompletionWeeks(tasks: Task[]) {
  const today = dayjs().startOf("day");
  const firstCompletion = tasks.reduce<dayjs.Dayjs | undefined>((oldest, task) => {
    if (!task.completedAt) {
      return oldest;
    }
    const completedAt = dayjs(task.completedAt).startOf("day");
    return !oldest || completedAt.isBefore(oldest) ? completedAt : oldest;
  }, undefined);
  const weeksToShow =
    firstCompletion && today.diff(firstCompletion, "week") >= 26 ? 53 : 26;
  const start = today.subtract(weeksToShow - 1, "week").startOf("week");
  const counts = new Map<string, number>();

  for (const task of tasks) {
    if (!task.completedAt) {
      continue;
    }
    const date = dayjs(task.completedAt).format("YYYY-MM-DD");
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  return Array.from({ length: weeksToShow }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const day = start.add(weekIndex * 7 + dayIndex, "day");
      const date = day.format("YYYY-MM-DD");
      const count = counts.get(date) ?? 0;
      return {
        date,
        count,
        isFuture: day.isAfter(today),
        level: completionLevel(count),
      };
    }),
  );
}

function getBestCompletionDay(tasks: Task[]): { date: string; count: number } | undefined {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    if (!task.completedAt) {
      continue;
    }
    const date = dayjs(task.completedAt).format("YYYY-MM-DD");
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.count - a.count || b.date.localeCompare(a.date))[0];
}

function completionLevel(count: number): number {
  if (count === 0) {
    return 0;
  }
  if (count >= 7) {
    return 4;
  }
  if (count >= 4) {
    return 3;
  }
  if (count >= 2) {
    return 2;
  }
  return 1;
}

function TaskLane({
  title,
  tasks,
  allTasks,
  projectNames,
  projectsById,
  onOpenTask,
  onToggleSubtask,
}: {
  title: string;
  tasks: Task[];
  allTasks: Task[];
  projectNames: ReadonlyMap<string, string>;
  projectsById: ReadonlyMap<string, Project>;
  onOpenTask: (task: Task) => void;
  onToggleSubtask: (task: Task, done: boolean) => Promise<void>;
}) {
  return (
    <section className="task-lane">
      <div className="section-heading">
        <h2>{title}</h2>
        <span>{tasks.length}</span>
      </div>
      <div className="task-lane-list">
        {tasks.slice(0, 6).map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            projectName={getTaskProjectName(task, projectNames)}
            projectColor={getTaskProjectColor(task, projectsById)}
            subtasks={allTasks.filter((item) => item.parentTaskId === task.id)}
            onOpen={onOpenTask}
            onToggleSubtask={onToggleSubtask}
          />
        ))}
        {tasks.length === 0 ? <span className="empty-line">No tasks</span> : null}
      </div>
    </section>
  );
}

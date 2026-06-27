import { Button, Empty, Input, Segmented, Select, Tag } from "antd";
import dayjs from "dayjs";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Project, Task, priorityLabel } from "../../domain/models/types";
import { filterTasksBySearch } from "../../utils/taskSearch";
import { filterTasksByTags } from "../../utils/taskTags";

type TimelineMode = "done" | "created";

const TIMELINE_BATCH_SIZE = 40;

interface TimelineViewProps {
  tasks: Task[];
  projects: Project[];
  availableTags: string[];
  onOpenTask: (task: Task) => void;
}

export function TimelineView({
  tasks,
  projects,
  availableTags,
  onOpenTask,
}: TimelineViewProps) {
  const [mode, setMode] = useState<TimelineMode>("done");
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(TIMELINE_BATCH_SIZE);
  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );
  const timelineTags = useMemo(() => resolveTimelineTags(availableTags, tasks), [
    availableTags,
    tasks,
  ]);
  const baseTasks = useMemo(() => getTimelineTasks(tasks, mode), [mode, tasks]);
  const filteredTasks = useMemo(
    () => filterTasksByTags(filterTasksBySearch(baseTasks, query, projects), selectedTags),
    [baseTasks, projects, query, selectedTags],
  );
  const visibleTasks = filteredTasks.slice(0, visibleCount);
  const groups = groupTimelineTasks(visibleTasks, mode);
  const hasFilters = query.trim().length > 0 || selectedTags.length > 0;
  const summaryLabel = mode === "done" ? "Completed main tasks" : "Created main tasks";

  useEffect(() => {
    setVisibleCount(TIMELINE_BATCH_SIZE);
  }, [mode, query, selectedTags]);

  if (groups.length === 0) {
    return (
      <section className="timeline-view">
        <TimelineToolbar
          mode={mode}
          query={query}
          selectedTags={selectedTags}
          availableTags={timelineTags}
          onModeChange={setMode}
          onQueryChange={setQuery}
          onTagsChange={setSelectedTags}
        />
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={hasFilters ? "No matching tasks" : "No timeline tasks yet"}
        />
      </section>
    );
  }

  return (
    <section className="timeline-view">
      <TimelineToolbar
        mode={mode}
        query={query}
        selectedTags={selectedTags}
        availableTags={timelineTags}
        onModeChange={setMode}
        onQueryChange={setQuery}
        onTagsChange={setSelectedTags}
      />
      <section className="timeline-summary">
        <span>{summaryLabel}</span>
        <strong>{filteredTasks.length}</strong>
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
                  <span className="timeline-task-main">
                    <span>{task.title}</span>
                    <small>
                      {task.projectId ? projectNames.get(task.projectId) ?? "Project" : "Unassigned"}
                      {` · ${formatTime(getTimelineDate(task, mode))}`}
                    </small>
                    {task.tags.length > 0 ? (
                      <span className="timeline-task-tags">
                        {task.tags.map((tag) => (
                          <Tag key={tag}>#{tag}</Tag>
                        ))}
                      </span>
                    ) : null}
                  </span>
                  {task.priority !== "none" ? <Tag>{priorityLabel[task.priority]}</Tag> : null}
                </Button>
              ))}
            </div>
          </section>
        ))}
      </div>
      {filteredTasks.length > visibleTasks.length ? (
        <Button
          className="timeline-show-more"
          onClick={() => setVisibleCount((count) => count + TIMELINE_BATCH_SIZE)}
        >
          Show more
        </Button>
      ) : null}
    </section>
  );
}

function TimelineToolbar({
  mode,
  query,
  selectedTags,
  availableTags,
  onModeChange,
  onQueryChange,
  onTagsChange,
}: {
  mode: TimelineMode;
  query: string;
  selectedTags: string[];
  availableTags: string[];
  onModeChange: (mode: TimelineMode) => void;
  onQueryChange: (query: string) => void;
  onTagsChange: (tags: string[]) => void;
}) {
  return (
    <div className="timeline-toolbar">
      <Segmented
        value={mode}
        onChange={(value) => onModeChange(value as TimelineMode)}
        options={[
          { label: "Done", value: "done" },
          { label: "Created", value: "created" },
        ]}
      />
      <div className="timeline-toolbar-filters">
        <Input
          className="task-search-input"
          allowClear
          prefix={<Search size={14} />}
          value={query}
          placeholder="Search timeline"
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {availableTags.length > 0 ? (
          <Select
            className="board-tag-filter"
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            value={selectedTags}
            placeholder="Tags"
            onChange={onTagsChange}
            options={availableTags.map((tag) => ({ value: tag, label: tag }))}
          />
        ) : null}
      </div>
    </div>
  );
}

function getTimelineTasks(tasks: Task[], mode: TimelineMode): Task[] {
  const mainTasks = tasks.filter(
    (task) => !task.parentTaskId && task.status !== "archived" && task.status !== "cancelled",
  );

  if (mode === "done") {
    return mainTasks
      .filter((task) => task.status === "done" && task.completedAt)
      .sort((a, b) => getTimelineDate(b, mode).localeCompare(getTimelineDate(a, mode)));
  }

  return mainTasks.sort((a, b) => getTimelineDate(b, mode).localeCompare(getTimelineDate(a, mode)));
}

function groupTimelineTasks(tasks: Task[], mode: TimelineMode) {
  const groups = new Map<string, Task[]>();

  for (const task of tasks) {
    const date = dayjs(getTimelineDate(task, mode)).format("YYYY-MM-DD");
    groups.set(date, [...(groups.get(date) ?? []), task]);
  }

  return Array.from(groups.entries()).map(([date, groupTasks]) => ({
    date,
    tasks: groupTasks,
  }));
}

function getTimelineDate(task: Task, mode: TimelineMode): string {
  return mode === "done" ? task.completedAt ?? task.updatedAt : task.createdAt;
}

function resolveTimelineTags(availableTags: string[], tasks: Task[]): string[] {
  return Array.from(new Set([...availableTags, ...tasks.flatMap((task) => task.tags)])).sort((a, b) =>
    a.localeCompare(b),
  );
}

function formatDate(date: string): string {
  return dayjs(date).format("MMM D, YYYY");
}

function formatTime(date: string): string {
  return dayjs(date).format("HH:mm");
}

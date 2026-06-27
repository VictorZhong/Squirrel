import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { Button, Empty } from "antd";
import { useMemo, useState } from "react";
import {
  BOARD_STATUSES,
  BoardTaskStatus,
  Project,
  Task,
  statusLabel,
} from "../../domain/models/types";
import { applyTaskStatus } from "../../domain/rules/taskRules";
import { getTaskProjectColor, getTaskProjectName } from "../../utils/projectDisplay";
import { TaskCard } from "../task/TaskCard";

interface KanbanBoardProps {
  tasks: Task[];
  orderingTasks?: Task[];
  allTasks: Task[];
  projects: Project[];
  showProjectName: boolean;
  onOpenTask: (task: Task) => void;
  onToggleSubtask: (task: Task, done: boolean) => Promise<void>;
  onTasksChange: (tasks: Task[], previousTasks: Map<string, Task>) => Promise<void>;
  onOpenDoneRoute: () => void;
}

export function KanbanBoard({
  tasks,
  orderingTasks = tasks,
  allTasks,
  projects,
  showProjectName,
  onOpenTask,
  onToggleSubtask,
  onTasksChange,
  onOpenDoneRoute,
}: KanbanBoardProps) {
  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );
  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );
  const [activeTask, setActiveTask] = useState<Task>();

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(tasks.find((task) => task.id === String(event.active.id)));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : undefined;
    if (!overId || activeId === overId) {
      setActiveTask(undefined);
      return;
    }

    const changed = reorderTasks(orderingTasks, activeId, overId);
    if (changed.length === 0) {
      setActiveTask(undefined);
      return;
    }

    const previousTasks = new Map(
      changed.map((task) => [task.id, allTasks.find((item) => item.id === task.id)!]),
    );
    try {
      await onTasksChange(changed, previousTasks);
    } finally {
      setActiveTask(undefined);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(undefined)}
    >
      <div className="kanban-board">
        {BOARD_STATUSES.map((status) => {
          const allColumnTasks = tasks
            .filter((task) => task.status === status)
            .sort((a, b) => a.sortOrder - b.sortOrder);
          const columnTasks =
            status === "done" ? sortDoneTasks(allColumnTasks).slice(0, 20) : allColumnTasks;
          return (
            <KanbanColumn
              key={status}
              status={status}
              tasks={columnTasks}
              totalTasks={allColumnTasks.length}
              allTasks={allTasks}
              projectNames={projectNames}
              projectsById={projectsById}
              showProjectName={showProjectName}
              onOpenTask={onOpenTask}
              onToggleSubtask={onToggleSubtask}
              onOpenDoneRoute={onOpenDoneRoute}
            />
          );
        })}
      </div>
      <DragOverlay>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            projectName={getTaskProjectName(activeTask, projectNames)}
            projectColor={getTaskProjectColor(activeTask, projectsById)}
            showProjectName={showProjectName}
            subtasks={allTasks.filter((item) => item.parentTaskId === activeTask.id)}
            onOpen={() => undefined}
            onToggleSubtask={() => undefined}
            style={{ cursor: "grabbing" }}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  tasks,
  totalTasks,
  allTasks,
  projectNames,
  projectsById,
  showProjectName,
  onOpenTask,
  onToggleSubtask,
  onOpenDoneRoute,
}: {
  status: BoardTaskStatus;
  tasks: Task[];
  totalTasks: number;
  allTasks: Task[];
  projectNames: ReadonlyMap<string, string>;
  projectsById: ReadonlyMap<string, Project>;
  showProjectName: boolean;
  onOpenTask: (task: Task) => void;
  onToggleSubtask: (task: Task, done: boolean) => Promise<void>;
  onOpenDoneRoute: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const hiddenDoneCount = status === "done" ? Math.max(0, totalTasks - tasks.length) : 0;

  return (
    <section ref={setNodeRef} className={`kanban-column ${isOver ? "kanban-column-over" : ""}`}>
      <header className="kanban-column-header">
        <span>{statusLabel[status]}</span>
        <span>{totalTasks}</span>
      </header>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="kanban-column-body">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              projectName={getTaskProjectName(task, projectNames)}
              projectColor={getTaskProjectColor(task, projectsById)}
              showProjectName={showProjectName}
              subtasks={allTasks.filter((item) => item.parentTaskId === task.id)}
              onOpen={onOpenTask}
              onToggleSubtask={onToggleSubtask}
            />
          ))}
          {hiddenDoneCount > 0 ? (
            <Button className="kanban-view-more" onClick={onOpenDoneRoute}>
              View more
            </Button>
          ) : null}
          {tasks.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> : null}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableTaskCard({
  task,
  projectName,
  projectColor,
  showProjectName,
  subtasks,
  onOpen,
  onToggleSubtask,
}: {
  task: Task;
  projectName: string;
  projectColor: string;
  showProjectName: boolean;
  subtasks: Task[];
  onOpen: (task: Task) => void;
  onToggleSubtask: (task: Task, done: boolean) => Promise<void>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  return (
    <div ref={setNodeRef}>
      <TaskCard
        task={task}
        projectName={projectName}
        projectColor={projectColor}
        showProjectName={showProjectName}
        subtasks={subtasks}
        onOpen={onOpen}
        onToggleSubtask={(subtask, done) => void onToggleSubtask(subtask, done)}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
        }}
      />
    </div>
  );
}

function reorderTasks(tasks: Task[], activeId: string, overId: string): Task[] {
  const activeTask = tasks.find((task) => task.id === activeId);
  if (!activeTask) {
    return [];
  }

  const targetStatus = getTargetStatus(tasks, overId);
  if (!targetStatus) {
    return [];
  }

  const now = new Date();
  const previousStatus = activeTask.status;
  const withoutActive = tasks.filter((task) => task.id !== activeId);
  const targetColumn = withoutActive
    .filter((task) => task.status === targetStatus)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const targetIndex = BOARD_STATUSES.includes(overId as BoardTaskStatus)
    ? targetColumn.length
    : Math.max(
        0,
        targetColumn.findIndex((task) => task.id === overId),
      );

  const movedTask =
    activeTask.status === targetStatus
      ? { ...activeTask, updatedAt: now.toISOString() }
      : applyTaskStatus(activeTask, targetStatus, now);
  const nextTargetColumn = [
    ...targetColumn.slice(0, targetIndex),
    movedTask,
    ...targetColumn.slice(targetIndex),
  ];
  const changed = new Map<string, Task>();

  nextTargetColumn.forEach((task, index) => {
    if (task.sortOrder !== index || task.id === activeId) {
      changed.set(task.id, { ...task, sortOrder: index, updatedAt: now.toISOString() });
    }
  });

  if (previousStatus !== targetStatus) {
    withoutActive
      .filter((task) => task.status === previousStatus)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((task, index) => {
        if (task.sortOrder !== index) {
          changed.set(task.id, { ...task, sortOrder: index, updatedAt: now.toISOString() });
        }
      });
  }

  return Array.from(changed.values());
}

function getTargetStatus(tasks: Task[], overId: string): BoardTaskStatus | undefined {
  if (BOARD_STATUSES.includes(overId as BoardTaskStatus)) {
    return overId as BoardTaskStatus;
  }

  const overTask = tasks.find((task) => task.id === overId);
  return BOARD_STATUSES.includes(overTask?.status as BoardTaskStatus)
    ? (overTask?.status as BoardTaskStatus)
    : undefined;
}

function sortDoneTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const dateCompare = (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt);
    return dateCompare || a.sortOrder - b.sortOrder;
  });
}

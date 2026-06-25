import { Checkbox, Tag } from "antd";
import { CalendarDays, Paperclip } from "lucide-react";
import { Task, priorityLabel } from "../../domain/models/types";
import { statusClassName } from "../../utils/taskDisplay";

interface TaskCardProps {
  task: Task;
  subtasks?: Task[];
  onOpen: (task: Task) => void;
  onToggleSubtask?: (task: Task, done: boolean) => void;
  dragHandleProps?: Record<string, unknown>;
  style?: React.CSSProperties;
  isDragging?: boolean;
}

export function TaskCard({
  task,
  subtasks = [],
  onOpen,
  onToggleSubtask,
  dragHandleProps,
  style,
  isDragging,
}: TaskCardProps) {
  const completedSubtasks = subtasks.filter((subtask) => subtask.status === "done").length;
  const importanceMarks = "!".repeat(importanceWeight(task.importance));

  return (
    <article
      className={`task-card ${statusClassName(task.status)} ${
        subtasks.length > 0 ? "task-card-with-subtasks" : ""
      } ${
        isDragging ? "task-card-dragging" : ""
      }`}
      style={style}
      onClick={() => onOpen(task)}
      {...dragHandleProps}
    >
      <span className="task-card-title">{task.title}</span>
      {task.priority !== "none" ? (
        <Tag className={`priority-badge priority-${task.priority}`}>
          {priorityLabel[task.priority]}
        </Tag>
      ) : null}
      {subtasks.length > 0 ? (
        <div className="task-card-subtasks">
          {subtasks.slice(0, 5).map((subtask) => (
            <div
              key={subtask.id}
              className="task-card-subtask"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <Checkbox
                checked={subtask.status === "done"}
                onChange={(event) => onToggleSubtask?.(subtask, event.target.checked)}
              />
              <span>{subtask.title}</span>
            </div>
          ))}
        </div>
      ) : null}
      <span className="task-card-footer">
        <span className="task-card-badges">
          {task.dueDate ? (
            <Tag variant="filled" icon={<CalendarDays size={12} />}>
              {task.dueDate}
            </Tag>
          ) : null}
          {task.attachments.length > 0 ? (
            <Tag variant="filled" icon={<Paperclip size={12} />}>
              {task.attachments.length}
            </Tag>
          ) : null}
          {subtasks.length > 0 ? (
            <Tag variant="filled">
              {completedSubtasks}/{subtasks.length}
            </Tag>
          ) : null}
        </span>
        {importanceMarks ? (
          <span className="importance-marks" aria-label={`${task.importance} importance`}>
            {importanceMarks}
          </span>
        ) : null}
      </span>
    </article>
  );
}

function importanceWeight(importance: Task["importance"]): number {
  if (importance === "high") {
    return 3;
  }
  if (importance === "medium") {
    return 2;
  }
  if (importance === "low") {
    return 1;
  }
  return 0;
}

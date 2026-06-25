import { Checkbox, Tag } from "antd";
import { CalendarDays, Paperclip, UserRound } from "lucide-react";
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
  const showAssignee =
    Boolean(task.assignee) && (task.status === "waiting" || task.status === "blocked");
  const hasFooterBadges = showAssignee || task.attachments.length > 0 || subtasks.length > 0;

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
      <span className="task-card-meta-row">
        {task.dueDate ? (
          <Tag variant="filled" icon={<CalendarDays size={12} />}>
            {formatCardDate(task.dueDate)}
          </Tag>
        ) : null}
        {task.priority !== "none" ? (
          <Tag className={`priority-badge priority-${task.priority}`}>
            {priorityLabel[task.priority]}
          </Tag>
        ) : null}
        {importanceMarks ? (
          <span className="importance-marks" aria-label={`${task.importance} importance`}>
            {importanceMarks}
          </span>
        ) : null}
      </span>
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
      {hasFooterBadges ? (
        <span className="task-card-footer">
          <span className="task-card-badges">
            {showAssignee ? (
              <Tag variant="filled" icon={<UserRound size={12} />}>
                {task.assignee}
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
        </span>
      ) : null}
    </article>
  );
}

function formatCardDate(date: string): string {
  const [, month, day] = date.split("-");
  if (!month || !day) {
    return date;
  }
  return `${Number(month)}/${Number(day)}`;
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

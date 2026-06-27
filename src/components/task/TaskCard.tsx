import { Checkbox, Tag } from "antd";
import { CalendarDays, Paperclip, Star, UserRound, Zap } from "lucide-react";
import { Task, importanceLabel, priorityLabel } from "../../domain/models/types";
import { statusClassName } from "../../utils/taskDisplay";

const VISIBLE_CARD_TAGS = 2;

interface TaskCardProps {
  task: Task;
  projectName: string;
  projectColor: string;
  showProjectName?: boolean;
  subtasks?: Task[];
  onOpen: (task: Task) => void;
  onToggleSubtask?: (task: Task, done: boolean) => void;
  dragHandleProps?: Record<string, unknown>;
  style?: React.CSSProperties;
  isDragging?: boolean;
}

export function TaskCard({
  task,
  projectName,
  projectColor,
  showProjectName = true,
  subtasks = [],
  onOpen,
  onToggleSubtask,
  dragHandleProps,
  style,
  isDragging,
}: TaskCardProps) {
  const completedSubtasks = subtasks.filter((subtask) => subtask.status === "done").length;
  const showAssignee =
    Boolean(task.assignee) && (task.status === "waiting" || task.status === "blocked");
  const visibleTags = task.tags.slice(0, VISIBLE_CARD_TAGS);
  const hiddenTagCount = task.tags.length - visibleTags.length;
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
      {showProjectName ? (
        <span
          className="task-card-project-row"
          title={projectName}
          style={{ backgroundColor: projectColor }}
        >
          <span className="task-card-project-text">{projectName}</span>
        </span>
      ) : null}
      <span className="task-card-title">{task.title}</span>
      <span className="task-card-meta-row">
        {task.dueDate ? (
          <Tag
            className="task-meta-badge due-badge"
            variant="filled"
            icon={<CalendarDays size={12} />}
          >
            {formatCardDate(task.dueDate)}
          </Tag>
        ) : null}
        {task.priority !== "none" ? (
          <Tag
            className={`task-meta-badge priority-badge priority-${task.priority}`}
            icon={<Zap size={12} />}
          >
            {priorityLabel[task.priority]}
          </Tag>
        ) : null}
        {task.importance !== "none" ? (
          <Tag
            className={`task-meta-badge importance-badge importance-${task.importance}`}
            icon={<Star size={12} fill="currentColor" />}
          >
            {importanceLabel[task.importance]}
          </Tag>
        ) : null}
      </span>
      {visibleTags.length > 0 ? (
        <span className="task-card-tags-row">
          {visibleTags.map((tag) => (
            <Tag key={tag} className="task-tag-badge" title={tag}>
              #{tag}
            </Tag>
          ))}
          {hiddenTagCount > 0 ? (
            <Tag className="task-tag-more" title={task.tags.slice(VISIBLE_CARD_TAGS).join(", ")}>
              +{hiddenTagCount}
            </Tag>
          ) : null}
        </span>
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

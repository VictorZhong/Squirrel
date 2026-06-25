import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Checkbox,
  DatePicker,
  Drawer,
  Image,
  Input,
  Select,
  Typography,
} from "antd";
import dayjs from "dayjs";
import {
  Check,
  Paperclip,
  Save,
  Split,
  Upload,
  X,
} from "lucide-react";
import {
  Attachment,
  Project,
  TASK_IMPORTANCES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  Task,
  importanceLabel,
  priorityLabel,
  statusLabel,
} from "../../domain/models/types";
import { applyTaskStatus } from "../../domain/rules/taskRules";

interface TaskDrawerProps {
  open: boolean;
  task?: Task;
  subtasks: Task[];
  projects: Project[];
  availableTags: string[];
  resolveAttachmentUrl: (attachment: Attachment) => Promise<string>;
  onClose: () => void;
  onSave: (task: Task, options?: { notify?: boolean }) => Promise<boolean>;
  onAttachFiles: (task: Task, files: File[]) => Promise<Task>;
  onRegisterTags: (tags: string[]) => Promise<void>;
  onCreateSubtask: (parent: Task, title: string) => Promise<void>;
  onPromoteSubtask: (task: Task) => Promise<void>;
}

export function TaskDrawer({
  open,
  task,
  subtasks,
  projects,
  availableTags,
  resolveAttachmentUrl,
  onClose,
  onSave,
  onAttachFiles,
  onRegisterTags,
  onCreateSubtask,
  onPromoteSubtask,
}: TaskDrawerProps) {
  const [draft, setDraft] = useState<Task | undefined>(task);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(task);
    setSubtaskTitle("");
  }, [task]);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status !== "archived"),
    [projects],
  );

  if (!draft) {
    return null;
  }

  const currentTask = draft;

  async function save(next: Task = currentTask) {
    setIsSaving(true);
    try {
      const saved = await onSave(next);
      if (saved) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  }

  function update(patch: Partial<Task>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            ...patch,
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }
    setIsSaving(true);
    try {
      const updated = await onAttachFiles(currentTask, files);
      setDraft(updated);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Drawer
      size={560}
      open={open}
      onClose={onClose}
      closeIcon={<X size={18} />}
      title="Task"
      extra={
        <Button
          type="primary"
          icon={<Save size={16} />}
          loading={isSaving}
          onClick={() => void save()}
        >
          Save
        </Button>
      }
    >
      <div className="drawer-stack">
        <section className="drawer-section">
          <Input
            className="task-title-input"
            value={draft.title}
            onChange={(event) => update({ title: event.target.value })}
          />
          <Input.TextArea
            value={draft.description}
            autoSize={{ minRows: 4, maxRows: 8 }}
            placeholder="Description"
            onChange={(event) => update({ description: event.target.value || undefined })}
          />
        </section>

        <section className="drawer-grid">
          <Field label="Status">
            <Select
              value={draft.status}
              onChange={(status) => setDraft(applyTaskStatus(draft, status))}
              options={TASK_STATUSES.map((status) => ({
                value: status,
                label: statusLabel[status],
              }))}
            />
          </Field>
          <Field label="Project">
            <Select
              allowClear
              value={draft.projectId}
              placeholder="Inbox"
              onChange={(projectId) =>
                update({
                  projectId,
                  status: projectId
                    ? draft.status === "inbox"
                      ? "todo"
                      : draft.status
                    : "inbox",
                })
              }
              options={activeProjects.map((project) => ({
                value: project.id,
                label: project.name,
              }))}
            />
          </Field>
          <Field label="Due">
            <DatePicker
              className="full-width-control"
              value={draft.dueDate ? dayjs(draft.dueDate) : undefined}
              disabledDate={(current) =>
                Boolean(current && current.startOf("day").isBefore(dayjs().startOf("day")))
              }
              onChange={(date) =>
                update({ dueDate: date ? date.format("YYYY-MM-DD") : undefined })
              }
            />
          </Field>
          <Field label="Priority">
            <Select
              value={draft.priority}
              onChange={(priority) => update({ priority })}
              options={TASK_PRIORITIES.map((priority) => ({
                value: priority,
                label: priorityLabel[priority],
              }))}
            />
          </Field>
          <Field label="Importance">
            <Select
              value={draft.importance}
              onChange={(importance) => update({ importance })}
              options={TASK_IMPORTANCES.map((importance) => ({
                value: importance,
                label: importanceLabel[importance],
              }))}
            />
          </Field>
          <Field label="Created">
            <Input value={formatDateTime(draft.createdAt)} disabled />
          </Field>
        </section>

        <section className="drawer-section">
          <Typography.Text className="drawer-label">Tags</Typography.Text>
          <Select
            mode="tags"
            value={draft.tags}
            onChange={(tags) => {
              update({ tags });
              void onRegisterTags(tags);
            }}
            options={availableTags.map((tag) => ({ value: tag, label: tag }))}
            tokenSeparators={[","]}
            placeholder="Add tags"
          />
        </section>

        <section className="drawer-section">
          <div className="drawer-section-header">
            <Typography.Text className="drawer-label">Attachments</Typography.Text>
            <Button
              icon={<Upload size={16} />}
              onClick={() => fileInputRef.current?.click()}
              loading={isSaving}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={handleFiles}
            />
          </div>
          <AttachmentList
            attachments={draft.attachments}
            resolveAttachmentUrl={resolveAttachmentUrl}
          />
        </section>

        {!draft.parentTaskId ? (
          <section className="drawer-section">
            <div className="drawer-section-header">
              <Typography.Text className="drawer-label">Subtasks</Typography.Text>
              <span>{subtasks.length}</span>
            </div>
            <div className="subtask-create">
              <Input
                value={subtaskTitle}
                placeholder="New subtask"
                onChange={(event) => setSubtaskTitle(event.target.value)}
                onPressEnter={() => {
                  if (subtaskTitle.trim()) {
                    void onCreateSubtask(draft, subtaskTitle.trim()).then(() =>
                      setSubtaskTitle(""),
                    );
                  }
                }}
              />
              <Button
                icon={<Check size={16} />}
                disabled={!subtaskTitle.trim()}
                onClick={() =>
                  void onCreateSubtask(draft, subtaskTitle.trim()).then(() =>
                    setSubtaskTitle(""),
                  )
                }
              />
            </div>
            <div className="subtask-list">
              {subtasks.map((subtask) => (
                <div key={subtask.id} className="subtask-row">
                  <Checkbox
                    checked={subtask.status === "done"}
                    onChange={(event) =>
                      void onSave(
                        applyTaskStatus(subtask, event.target.checked ? "done" : "todo"),
                        { notify: false },
                      )
                    }
                  >
                    {subtask.title}
                  </Checkbox>
                  <Button
                    type="text"
                    icon={<Split size={15} />}
                    onClick={() => void onPromoteSubtask(subtask)}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="drawer-section">
            <Button icon={<Split size={16} />} onClick={() => void onPromoteSubtask(draft)}>
              Promote
            </Button>
          </section>
        )}
      </div>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="drawer-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function AttachmentList({
  attachments,
  resolveAttachmentUrl,
}: {
  attachments: Attachment[];
  resolveAttachmentUrl: (attachment: Attachment) => Promise<string>;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      attachments.map(async (attachment) => [
        attachment.id,
        await resolveAttachmentUrl(attachment),
      ] as const),
    ).then((entries) => {
      if (!cancelled) {
        setUrls(Object.fromEntries(entries));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [attachments, resolveAttachmentUrl]);

  if (attachments.length === 0) {
    return <span className="empty-line">No attachments</span>;
  }

  return (
    <div className="attachment-grid">
      {attachments.map((attachment) => (
        <button
          type="button"
          key={attachment.id}
          className="attachment-item"
          onClick={() => {
            const url = urls[attachment.id];
            if (!url) {
              return;
            }
            if (attachment.type === "image") {
              setPreviewUrl(url);
              return;
            }
            const opened = window.open(url, "_blank");
            if (!opened) {
              downloadAttachment(url, attachment.fileName);
            }
          }}
        >
          {attachment.type === "image" && urls[attachment.id] ? (
            <img src={urls[attachment.id]} alt={attachment.fileName} />
          ) : (
            <Paperclip size={22} />
          )}
          <span>{attachment.fileName}</span>
          <Paperclip size={14} />
        </button>
      ))}
      <Image
        className="hidden-preview-image"
        src={previewUrl}
        preview={{
          open: Boolean(previewUrl),
          src: previewUrl,
          onOpenChange: (open) => {
            if (!open) {
              setPreviewUrl(undefined);
            }
          },
        }}
      />
    </div>
  );
}

function downloadAttachment(url: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function formatDateTime(value: string): string {
  return dayjs(value).format("YYYY-MM-DD HH:mm");
}

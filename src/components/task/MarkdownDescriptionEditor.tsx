import { ClipboardEvent, useEffect, useMemo, useState } from "react";
import { Button, Input, Modal, Space, Typography } from "antd";
import { Maximize2, Save, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Attachment, Task } from "../../domain/models/types";
import {
  extractClipboardSource,
  htmlToMarkdown,
  renderAttachmentImageMarkdown,
  withClipboardSource,
} from "../../utils/markdown";

interface MarkdownDescriptionEditorProps {
  task: Task;
  isSaving: boolean;
  resolveAttachmentUrl: (attachment: Attachment) => Promise<string>;
  onDescriptionChange: (description?: string) => void;
  onTaskChange: (task: Task) => void;
  onAttachFiles: (task: Task, files: File[]) => Promise<Task>;
  onSave: (task: Task, options?: { closeDrawer?: boolean; notify?: boolean }) => Promise<boolean>;
}

export function MarkdownDescriptionEditor({
  task,
  isSaving,
  resolveAttachmentUrl,
  onDescriptionChange,
  onTaskChange,
  onAttachFiles,
  onSave,
}: MarkdownDescriptionEditorProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isPastingImages, setIsPastingImages] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const description = task.description ?? "";
  const editorDisabled = isSaving || isPastingImages;

  useEffect(() => {
    let cancelled = false;
    const imageAttachments = task.attachments.filter((attachment) => attachment.type === "image");
    void Promise.all(
      imageAttachments.map(async (attachment) => [
        attachment.relativePath,
        await resolveAttachmentUrl(attachment),
      ] as const),
    ).then((entries) => {
      if (!cancelled) {
        setAttachmentUrls(Object.fromEntries(entries));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [task.attachments, resolveAttachmentUrl]);

  const attachmentUrlLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    task.attachments.forEach((attachment) => {
      const url = attachmentUrls[attachment.relativePath];
      if (!url) {
        return;
      }
      lookup.set(attachment.relativePath, url);
      lookup.set(`./${attachment.relativePath}`, url);
      lookup.set(attachment.fileName, url);
    });
    return lookup;
  }, [attachmentUrls, task.attachments]);

  function updateDescription(nextDescription: string) {
    onDescriptionChange(nextDescription || undefined);
  }

  async function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    event.stopPropagation();

    const clipboard = event.clipboardData;
    const imageFiles = Array.from(clipboard.files).filter((file) =>
      file.type.startsWith("image/"),
    );
    const html = clipboard.getData("text/html");

    if (!html && imageFiles.length === 0) {
      return;
    }

    event.preventDefault();
    const selectionStart = event.currentTarget.selectionStart;
    const selectionEnd = event.currentTarget.selectionEnd;
    const baseDescription = description;
    const htmlMarkdown = html ? htmlToMarkdown(html, { omitImages: imageFiles.length > 0 }) : "";
    const plainText = clipboard.getData("text/plain").trim();
    const source = extractClipboardSource(html, (type) => clipboard.getData(type));
    const convertedText = withClipboardSource(htmlMarkdown || plainText, source);

    if (imageFiles.length === 0) {
      updateDescription(
        insertMarkdown(baseDescription, convertedText, selectionStart, selectionEnd),
      );
      return;
    }

    setIsPastingImages(true);
    try {
      const updatedTask = await onAttachFiles(task, imageFiles);
      const imageMarkdown = updatedTask.attachments
        .slice(task.attachments.length)
        .filter((attachment) => attachment.type === "image")
        .map(renderAttachmentImageMarkdown)
        .join("\n\n");
      const insertion = [convertedText, imageMarkdown].filter(Boolean).join("\n\n");
      const descriptionWithImages = insertMarkdown(
        baseDescription,
        insertion,
        selectionStart,
        selectionEnd,
      );
      const finalTask = {
        ...updatedTask,
        description: descriptionWithImages || undefined,
        updatedAt: new Date().toISOString(),
      };
      onTaskChange(finalTask);
      await onSave(finalTask, { closeDrawer: false, notify: false });
    } finally {
      setIsPastingImages(false);
    }
  }

  async function saveFromModal() {
    const saved = await onSave(task, { closeDrawer: false });
    if (saved) {
      setModalOpen(false);
    }
  }

  return (
    <section className="drawer-section">
      <div className="drawer-section-header">
        <Typography.Text className="drawer-label">Description</Typography.Text>
        <Button
          size="small"
          icon={<Maximize2 size={14} />}
          onClick={() => setModalOpen(true)}
        >
          Markdown
        </Button>
      </div>
      <Input.TextArea
        className="task-description-input"
        value={description}
        autoSize={{ minRows: 3, maxRows: 5 }}
        disabled={editorDisabled}
        placeholder="Description"
        onChange={(event) => updateDescription(event.target.value)}
        onPaste={(event) => void handlePaste(event)}
      />
      <Modal
        title="Description"
        open={modalOpen}
        width={1040}
        onCancel={() => setModalOpen(false)}
        footer={
          <Space>
            <Button icon={<X size={16} />} onClick={() => setModalOpen(false)}>
              Close
            </Button>
            <Button
              type="primary"
              icon={<Save size={16} />}
              loading={isSaving || isPastingImages}
              onClick={() => void saveFromModal()}
            >
              Save
            </Button>
          </Space>
        }
      >
        <div
          className="markdown-editor-modal"
          data-global-paste-ignore="true"
          onPaste={(event) => event.stopPropagation()}
        >
          <section className="markdown-editor-pane">
            <Typography.Text className="drawer-label">Edit</Typography.Text>
            <Input.TextArea
              className="markdown-editor-textarea"
              value={description}
              disabled={editorDisabled}
              onChange={(event) => updateDescription(event.target.value)}
              onPaste={(event) => void handlePaste(event)}
            />
          </section>
          <section className="markdown-preview-pane">
            <Typography.Text className="drawer-label">Preview</Typography.Text>
            <MarkdownPreview markdown={description} attachmentUrlLookup={attachmentUrlLookup} />
          </section>
        </div>
      </Modal>
    </section>
  );
}

function MarkdownPreview({
  markdown,
  attachmentUrlLookup,
}: {
  markdown: string;
  attachmentUrlLookup: Map<string, string>;
}) {
  if (!markdown.trim()) {
    return (
      <div className="markdown-preview empty-markdown-preview">
        <span className="empty-line">No description</span>
      </div>
    );
  }

  return (
    <div className="markdown-preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img src={resolveMarkdownImageSource(src, attachmentUrlLookup)} alt={alt ?? ""} />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function insertMarkdown(
  value: string,
  insertion: string,
  selectionStart: number,
  selectionEnd: number,
): string {
  if (!insertion) {
    return value;
  }
  return `${value.slice(0, selectionStart)}${insertion}${value.slice(selectionEnd)}`;
}

function resolveMarkdownImageSource(
  src: string | undefined,
  attachmentUrlLookup: Map<string, string>,
): string {
  if (!src) {
    return "";
  }

  const decoded = decodeUriSafely(src);
  return attachmentUrlLookup.get(src) ?? attachmentUrlLookup.get(decoded) ?? src;
}

function decodeUriSafely(value: string): string {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

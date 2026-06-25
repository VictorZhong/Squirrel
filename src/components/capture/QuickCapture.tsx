import { KeyboardEvent, useRef, useState } from "react";
import { Button, Input } from "antd";
import { ImagePlus, Plus } from "lucide-react";

interface QuickCaptureProps {
  disabled?: boolean;
  onCreateTextTask: (title: string) => Promise<void>;
  onCreateAttachmentTask: (title: string | undefined, files: File[]) => Promise<void>;
}

export function QuickCapture({
  disabled,
  onCreateTextTask,
  onCreateAttachmentTask,
}: QuickCaptureProps) {
  const [value, setValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);

  async function submitText() {
    const title = value.trim();
    if (!title || disabled || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await onCreateTextTask(title);
      setValue("");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitFiles(title: string | undefined, files: File[]) {
    if (disabled || isSaving || files.length === 0) {
      return;
    }
    setIsSaving(true);
    try {
      await onCreateAttachmentTask(title, files);
      setValue("");
    } finally {
      setIsSaving(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitText();
    }
  }

  return (
    <div
      ref={inputRef}
      className={`quick-capture ${isDragging ? "quick-capture-dragging" : ""}`}
      onPaste={(event) => {
        const files = Array.from(event.clipboardData.files).filter((file) =>
          file.type.startsWith("image/"),
        );
        if (files.length > 0) {
          event.preventDefault();
          void submitFiles(value.trim() || undefined, files);
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!inputRef.current?.contains(event.relatedTarget as Node | null)) {
          setIsDragging(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        const files = Array.from(event.dataTransfer.files).filter((file) =>
          file.type.startsWith("image/"),
        );
        void submitFiles(value.trim() || undefined, files);
      }}
    >
      <ImagePlus size={18} className="quick-capture-icon" />
      <Input
        variant="borderless"
        value={value}
        disabled={disabled || isSaving}
        placeholder="Type a task or paste an image"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <Button
        type="primary"
        icon={<Plus size={16} />}
        disabled={disabled || !value.trim()}
        loading={isSaving}
        onClick={() => void submitText()}
      />
    </div>
  );
}

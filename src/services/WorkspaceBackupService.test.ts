import { describe, expect, it, vi } from "vitest";
import { Attachment, WorkspaceState } from "../domain/models/types";
import { createTask } from "../domain/rules/taskRules";
import { WorkspaceRepository } from "../repositories/WorkspaceRepository";
import { createInitialWorkspaceState } from "./WorkspaceService";
import {
  createWorkspaceBackup,
  parseWorkspaceBackup,
  serializeWorkspaceBackup,
} from "./WorkspaceBackupService";

describe("WorkspaceBackupService", () => {
  it("round-trips workspace state and attachment files", async () => {
    const state = createStateWithAttachment();
    const file = new File([new Uint8Array([1, 2, 3, 4])], "sample.png", {
      type: "image/png",
    });
    const repository = {
      readAttachmentFile: vi.fn().mockResolvedValue(file),
    } as unknown as WorkspaceRepository;

    const backup = await createWorkspaceBackup(
      repository,
      state,
      new Date("2026-06-28T00:00:00.000Z"),
    );
    const parsed = parseWorkspaceBackup(JSON.parse(serializeWorkspaceBackup(backup)));

    expect(backup).toMatchObject({
      version: 1,
      exportedAt: "2026-06-28T00:00:00.000Z",
    });
    expect(parsed.state).toEqual(state);
    expect(parsed.attachmentFiles).toHaveLength(1);
    expect(parsed.attachmentFiles[0].relativePath).toBe(
      "projects/project_1/attachments/task_1/sample.png",
    );
    expect(parsed.attachmentFiles[0].file.type).toBe("image/png");
    expect(
      Array.from(new Uint8Array(await parsed.attachmentFiles[0].file.arrayBuffer())),
    ).toEqual([1, 2, 3, 4]);
  });

  it("rejects unsupported backup versions", () => {
    expect(() =>
      parseWorkspaceBackup({
        version: 999,
        state: {},
        attachments: [],
      }),
    ).toThrow("Unsupported workspace backup version");
  });
});

function createStateWithAttachment(): WorkspaceState {
  const state = createInitialWorkspaceState("Backup Test", new Date("2026-06-28T00:00:00.000Z"));
  const project = { ...state.projects[0], id: "project_1" };
  const attachment: Attachment = {
    id: "att_1",
    type: "image",
    fileName: "sample.png",
    relativePath: "projects/project_1/attachments/task_1/sample.png",
    mimeType: "image/png",
    sizeBytes: 4,
    createdAt: "2026-06-28T00:00:00.000Z",
  };
  const task = {
    ...createTask(
      {
        title: "Has attachment",
        projectId: project.id,
        status: "todo",
      },
      new Date("2026-06-28T00:00:00.000Z"),
    ),
    id: "task_1",
    attachments: [attachment],
  };

  return {
    ...state,
    preferences: {
      ...state.preferences,
      defaultProjectId: project.id,
    },
    projects: [project],
    tasks: [task],
  };
}

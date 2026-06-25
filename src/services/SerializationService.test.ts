import { describe, expect, it } from "vitest";
import { createTask } from "../domain/rules/taskRules";
import { parsePreferences, parseTask, serializeJson } from "./SerializationService";

describe("SerializationService", () => {
  it("round-trips task JSON", () => {
    const task = createTask({
      title: "Persist me",
      status: "todo",
      priority: "high",
      importance: "medium",
      dueDate: "2026-06-25",
    });

    const parsed = parseTask(JSON.parse(serializeJson(task)));

    expect(parsed).toEqual(task);
  });

  it("normalizes invalid task enum fields", () => {
    const task = createTask({ title: "Normalize" });
    const parsed = parseTask({
      ...task,
      status: "bad",
      priority: "bad",
      importance: "bad",
    });

    expect(parsed.status).toBe("inbox");
    expect(parsed.priority).toBe("none");
    expect(parsed.importance).toBe("none");
  });

  it("falls back to default preferences when preference JSON is missing", () => {
    const preferences = parsePreferences(undefined);

    expect(preferences.boardColumns).toContain("todo");
    expect(preferences.dueSoonDays).toBe(7);
  });
});

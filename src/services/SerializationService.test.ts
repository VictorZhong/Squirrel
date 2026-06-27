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

    expect(parsed.status).toBe("todo");
    expect(parsed.priority).toBe("none");
    expect(parsed.importance).toBe("none");
  });

  it("migrates legacy inbox tasks to todo while parsing", () => {
    const task = createTask({ title: "Legacy" });
    const parsed = parseTask({
      ...task,
      status: "inbox",
    });

    expect(parsed.status).toBe("todo");
  });

  it("migrates legacy urgent priority to high while parsing", () => {
    const task = createTask({ title: "Legacy priority" });
    const parsed = parseTask({
      ...task,
      priority: "urgent",
    });

    expect(parsed.priority).toBe("high");
  });

  it("falls back to default preferences when preference JSON is missing", () => {
    const preferences = parsePreferences(undefined);

    expect(preferences.boardColumns).toContain("todo");
    expect(preferences.dueSoonDays).toBe(7);
    expect(preferences.showProjectNameOnBoard).toBe(true);
    expect(preferences.globalPasteCaptureEnabled).toBe(true);
    expect(preferences.theme).toEqual({
      mode: "light",
      darkStart: "20:00",
      darkEnd: "07:00",
    });
  });

  it("folds legacy inbox board columns into todo", () => {
    const preferences = parsePreferences({
      boardColumns: ["inbox", "todo", "done"],
    });

    expect(preferences.boardColumns).toEqual(["todo", "done"]);
  });

  it("parses theme preferences defensively", () => {
    const preferences = parsePreferences({
      theme: {
        mode: "auto",
        darkStart: "21:30",
        darkEnd: "06:15",
      },
    });

    expect(preferences.theme).toEqual({
      mode: "auto",
      darkStart: "21:30",
      darkEnd: "06:15",
    });
  });

  it("parses the board project name preference", () => {
    expect(parsePreferences({ showProjectNameOnBoard: false }).showProjectNameOnBoard).toBe(false);
  });

  it("parses the global paste capture preference", () => {
    expect(
      parsePreferences({ globalPasteCaptureEnabled: false }).globalPasteCaptureEnabled,
    ).toBe(false);
  });
});

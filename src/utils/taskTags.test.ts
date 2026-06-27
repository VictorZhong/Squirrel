import { describe, expect, it } from "vitest";
import { createTask } from "../domain/rules/taskRules";
import { filterTasksByTags, normalizeTaskTags } from "./taskTags";

describe("taskTags", () => {
  it("normalizes task tags with a five tag limit", () => {
    expect(
      normalizeTaskTags([" design ", "Design", "copy", "", "home", "client", "next", "extra"]),
    ).toEqual(["design", "copy", "home", "client", "next"]);
  });

  it("filters tasks that contain every selected tag", () => {
    const design = createTask({ title: "Design" });
    const copy = createTask({ title: "Copy" });
    const both = createTask({ title: "Both" });
    const tasks = [
      { ...design, tags: ["design"] },
      { ...copy, tags: ["copy"] },
      { ...both, tags: ["design", "copy"] },
    ];

    expect(filterTasksByTags(tasks, ["design", "copy"]).map((task) => task.title)).toEqual([
      "Both",
    ]);
  });
});

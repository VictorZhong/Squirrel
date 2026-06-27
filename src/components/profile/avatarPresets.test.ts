import { describe, expect, it } from "vitest";
import { avatarPresets } from "./avatarPresets";

describe("avatarPresets", () => {
  it("provides exactly 21 unique selectable avatars", () => {
    const ids = new Set(avatarPresets.map((preset) => preset.id));
    const configs = new Set(
      avatarPresets.map((preset) => JSON.stringify(preset.config)),
    );

    expect(avatarPresets).toHaveLength(21);
    expect(ids.size).toBe(21);
    expect(configs.size).toBe(21);
  });
});

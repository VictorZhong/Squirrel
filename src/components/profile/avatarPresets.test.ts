import { describe, expect, it } from "vitest";
import { avatarPresets } from "./avatarPresets";

describe("avatarPresets", () => {
  it("provides exactly 20 unique selectable avatars", () => {
    const ids = new Set(avatarPresets.map((preset) => preset.id));
    const configs = new Set(
      avatarPresets.map((preset) => JSON.stringify(preset.config)),
    );

    expect(avatarPresets).toHaveLength(20);
    expect(ids.size).toBe(20);
    expect(configs.size).toBe(20);
  });
});

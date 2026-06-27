import { describe, expect, it } from "vitest";
import { PROJECT_COLOR_VALUES } from "./projectColors";

describe("projectColors", () => {
  it("provides a broad 12-color project palette", () => {
    expect(PROJECT_COLOR_VALUES).toHaveLength(12);
    expect(PROJECT_COLOR_VALUES).toEqual(
      expect.arrayContaining(["#fda4af", "#f9a8d4", "#f0abfc", "#c4b5fd"]),
    );
  });

  it("avoids colors reserved for theme, priority, and importance semantics", () => {
    const reservedColors = [
      "#f97316",
      "#c2410c",
      "#fff7d6",
      "#8a5a00",
      "#ffe1dc",
      "#b42318",
      "#e8e7ff",
      "#4f46a5",
      "#eee4ff",
      "#5b21b6",
    ];

    expect(PROJECT_COLOR_VALUES).not.toEqual(
      expect.arrayContaining(reservedColors),
    );
  });
});

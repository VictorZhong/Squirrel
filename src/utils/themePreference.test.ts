import { describe, expect, it } from "vitest";
import { resolveWorkspaceTheme } from "./themePreference";

describe("resolveWorkspaceTheme", () => {
  it("honors fixed light and dark modes", () => {
    expect(
      resolveWorkspaceTheme({
        mode: "light",
        darkStart: "20:00",
        darkEnd: "07:00",
      }),
    ).toBe("light");
    expect(
      resolveWorkspaceTheme({
        mode: "dark",
        darkStart: "20:00",
        darkEnd: "07:00",
      }),
    ).toBe("dark");
  });

  it("uses the dark window for auto mode across midnight", () => {
    const preferences = {
      mode: "auto" as const,
      darkStart: "20:00",
      darkEnd: "07:00",
    };

    expect(resolveWorkspaceTheme(preferences, new Date(2026, 5, 27, 21))).toBe("dark");
    expect(resolveWorkspaceTheme(preferences, new Date(2026, 5, 27, 6, 59))).toBe("dark");
    expect(resolveWorkspaceTheme(preferences, new Date(2026, 5, 27, 12))).toBe("light");
  });
});

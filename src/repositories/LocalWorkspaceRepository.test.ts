import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalWorkspaceRepository } from "./LocalWorkspaceRepository";

const originalShowDirectoryPicker = window.showDirectoryPicker;
const originalStorage = navigator.storage;

afterEach(() => {
  setBrowserCapabilities({
    showDirectoryPicker: originalShowDirectoryPicker,
    storage: originalStorage,
  });
  vi.restoreAllMocks();
});

describe("LocalWorkspaceRepository support detection", () => {
  it("detects folder-only browsers", () => {
    setBrowserCapabilities({
      showDirectoryPicker: vi.fn(),
      storage: undefined,
    });

    expect(LocalWorkspaceRepository.getSupport()).toEqual({
      folder: true,
      browser: false,
    });
  });

  it("detects OPFS-only browsers", () => {
    setBrowserCapabilities({
      showDirectoryPicker: undefined,
      storage: { getDirectory: vi.fn() } as unknown as StorageManager,
    });

    expect(LocalWorkspaceRepository.getSupport()).toEqual({
      folder: false,
      browser: true,
    });
  });

  it("detects unsupported browsers", () => {
    setBrowserCapabilities({
      showDirectoryPicker: undefined,
      storage: undefined,
    });

    expect(LocalWorkspaceRepository.getSupport()).toEqual({
      folder: false,
      browser: false,
    });
  });
});

function setBrowserCapabilities({
  showDirectoryPicker,
  storage,
}: {
  showDirectoryPicker: Window["showDirectoryPicker"];
  storage: StorageManager | undefined;
}) {
  Object.defineProperty(window, "showDirectoryPicker", {
    configurable: true,
    value: showDirectoryPicker,
  });
  Object.defineProperty(navigator, "storage", {
    configurable: true,
    value: storage,
  });
}

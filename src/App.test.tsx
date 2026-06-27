import { cleanup, render, screen } from "@testing-library/react";
import { ConfigProvider } from "antd";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const originalShowDirectoryPicker = window.showDirectoryPicker;
const originalStorage = navigator.storage;

afterEach(() => {
  cleanup();
  setBrowserCapabilities({
    showDirectoryPicker: originalShowDirectoryPicker,
    storage: originalStorage,
  });
  window.localStorage?.removeItem?.("squirrel.appPreferences.v1");
});

describe("App", () => {
  it("renders the workspace gate", () => {
    setBrowserCapabilities({
      showDirectoryPicker: undefined,
      storage: undefined,
    });
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>,
    );

    expect(screen.getByRole("heading", { name: "Squirrel" })).toBeInTheDocument();
    expect(screen.getByText("Local Workspace Task Board")).toBeInTheDocument();
  });

  it("shows the folder workspace entry for Chromium-style browsers", () => {
    setBrowserCapabilities({
      showDirectoryPicker: vi.fn(),
      storage: { getDirectory: vi.fn() } as unknown as StorageManager,
    });

    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>,
    );

    expect(
      screen.getByRole("button", { name: /open workspace folder/i }),
    ).toBeInTheDocument();
  });

  it("shows the browser workspace entry for Safari-style OPFS browsers", () => {
    setBrowserCapabilities({
      showDirectoryPicker: undefined,
      storage: { getDirectory: vi.fn() } as unknown as StorageManager,
    });

    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>,
    );

    expect(
      screen.getByRole("button", { name: /open browser workspace/i }),
    ).toBeInTheDocument();
  });

  it("shows an unsupported browser message when no workspace backend is available", () => {
    setBrowserCapabilities({
      showDirectoryPicker: undefined,
      storage: undefined,
    });

    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>,
    );

    expect(
      screen.getByText(/use chrome, microsoft edge, or desktop safari/i),
    ).toBeInTheDocument();
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

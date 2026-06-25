import { render, screen } from "@testing-library/react";
import { ConfigProvider } from "antd";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the workspace gate", () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>,
    );

    expect(screen.getByRole("heading", { name: "Squirrel" })).toBeInTheDocument();
    expect(screen.getByText("Local Workspace Task Board")).toBeInTheDocument();
  });
});

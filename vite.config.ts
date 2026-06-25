import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const localPort = 6670;
const previewPort = Number(process.env.PORT) || localPort;

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: localPort,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: previewPort,
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    globals: true,
  },
});

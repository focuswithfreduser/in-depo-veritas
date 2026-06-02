import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "src/app/generated/**"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

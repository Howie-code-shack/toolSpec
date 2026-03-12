import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "mcp-loader",
    include: ["src/**/__tests__/**/*.test.ts", "tests/**/*.test.ts"],
  },
});

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The tests import through the same `@/` alias the app uses, so a test reads
// exactly like the code it is checking and nothing has to be re-pathed.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});

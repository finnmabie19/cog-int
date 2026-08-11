import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["dotenv/config"],
    server: {
      deps: {
        // Inline so the "next/server" alias below applies to next-auth's
        // extensionless import.
        inline: ["next-auth", "@auth/core"],
      },
    },
  },
  resolve: {
    alias: {
      // audit.ts imports "server-only", which throws outside a React server
      // environment. Stub it for tests.
      "server-only": path.resolve(__dirname, "tests/server-only-stub.ts"),
      // next-auth imports "next/server" without the .js extension.
      "next/server": "next/server.js",
      "@": path.resolve(__dirname, "src"),
    },
  },
});

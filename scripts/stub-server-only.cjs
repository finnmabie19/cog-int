// Preload for the seed: stubs the "server-only" marker package so the seed
// can call withAudit() outside a React server environment (same idea as the
// vitest alias in vitest.config.mts).
/* eslint-disable @typescript-eslint/no-require-imports -- CJS preload script */
const Module = require("module");
const resolved = require.resolve("server-only");
Module._cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: {} };

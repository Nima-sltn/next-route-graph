import assert from "node:assert";
import { test } from "node:test";
import * as SDK from "../src/index.js";

test("SDK exports - exposes full programmatic public API", () => {
  assert.strictEqual(typeof SDK.analyzeRoutes, "function");
  assert.strictEqual(typeof SDK.detectAppRouter, "function");
  assert.strictEqual(typeof SDK.scanAppDir, "function");
  assert.strictEqual(typeof SDK.lintRoutes, "function");
  assert.strictEqual(typeof SDK.getRenderer, "function");
  assert.strictEqual(typeof SDK.renderTree, "function");
  assert.strictEqual(typeof SDK.renderFlat, "function");
  assert.strictEqual(typeof SDK.renderJson, "function");
  assert.strictEqual(typeof SDK.renderMermaid, "function");
  assert.strictEqual(typeof SDK.renderDot, "function");
  assert.strictEqual(typeof SDK.renderMarkdown, "function");

  assert.ok(SDK.ProjectNotFoundError);
  assert.ok(SDK.AmbiguousRouterError);
  assert.ok(SDK.NoAppRouterError);
  assert.ok(SDK.RouteLintError);
});

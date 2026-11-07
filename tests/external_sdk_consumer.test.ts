import assert from "node:assert";
import { test } from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

test("external consumer - verifies built dist/index.js module exports and execution", async () => {
  const distIndexPath = path.resolve("dist", "index.js");
  const moduleUrl = pathToFileURL(distIndexPath).href;

  // Dynamically import the compiled production artifact
  const SDK = await import(moduleUrl);

  // Core API functions
  assert.strictEqual(typeof SDK.analyzeRoutes, "function");
  assert.strictEqual(typeof SDK.detectAppRouter, "function");
  assert.strictEqual(typeof SDK.scanAppDir, "function");
  assert.strictEqual(typeof SDK.lintRoutes, "function");
  assert.strictEqual(typeof SDK.getRenderer, "function");
  assert.strictEqual(typeof SDK.detectRenderingType, "function");
  assert.strictEqual(typeof SDK.detectHttpMethods, "function");
  assert.strictEqual(typeof SDK.detectServerActions, "function");
  assert.strictEqual(typeof SDK.detectRouteConfig, "function");

  // Strategy Pattern Renderers
  const treeRenderer = SDK.getRenderer("tree");
  assert.ok(treeRenderer);
  assert.strictEqual(typeof treeRenderer.render, "function");

  const mermaidRenderer = SDK.getRenderer("mermaid");
  assert.ok(mermaidRenderer);
  assert.strictEqual(typeof mermaidRenderer.render, "function");

  // Domain Errors
  const notFound = new SDK.ProjectNotFoundError("/sample");
  assert.strictEqual(notFound.code, "ERR_PROJECT_NOT_FOUND");
  assert.ok(notFound instanceof Error);
});

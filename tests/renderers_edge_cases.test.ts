import assert from "node:assert";
import { test } from "node:test";
import {
  renderDot,
  renderFlat,
  renderMarkdown,
  renderMermaid,
  renderTree,
} from "../src/render/index.js";
import { AnalysisResult } from "../src/types/index.js";

const emptyResult: AnalysisResult = {
  project: "empty-app",
  router: "App Router",
  root: "app",
  routes: [],
  summary: {
    routes: 0,
    dynamic: 0,
    client: 0,
    server: 0,
    layouts: 0,
    loading: 0,
    errors: 0,
  },
  executionTimeMs: 2,
};

test("renderers - handle empty projects safely", () => {
  const tree = renderTree(emptyResult);
  assert.ok(tree.includes("(No routes found)"));

  const flat = renderFlat(emptyResult);
  assert.strictEqual(flat, "");

  const mermaid = renderMermaid(emptyResult);
  assert.ok(mermaid.includes('empty["(No routes discovered)"]'));

  const dot = renderDot(emptyResult);
  assert.ok(dot.includes('empty [label="(No routes discovered)"];'));

  const markdown = renderMarkdown(emptyResult);
  assert.ok(markdown.includes("*(No routes discovered)*"));
});

test("renderMermaid - encodes brackets in node labels to avoid breaking node shapes", () => {
  const result: AnalysisResult = {
    project: "bracket-app",
    router: "App Router",
    root: "app",
    routes: [
      {
        path: "/blog/[slug]",
        type: "page",
        file: "blog/[slug]/page.tsx",
        segmentType: "dynamic",
        rendering: "server",
        files: [],
      },
    ],
    summary: {
      routes: 1,
      dynamic: 1,
      client: 0,
      server: 1,
      layouts: 0,
      loading: 0,
      errors: 0,
    },
    executionTimeMs: 5,
  };

  const output = renderMermaid(result);
  assert.ok(output.includes("#91;slug#93;"), "Square brackets must be entity-encoded in Mermaid labels");
});

test("renderDot - escapes backslashes and quotes in paths and project names", () => {
  const result: AnalysisResult = {
    project: 'my "special" \\ app',
    router: "App Router",
    root: "app",
    routes: [
      {
        path: '/path\\with"quotes',
        type: "page",
        file: 'path/page.tsx',
        segmentType: "static",
        rendering: "server",
        files: [],
      },
    ],
    summary: {
      routes: 1,
      dynamic: 0,
      client: 0,
      server: 1,
      layouts: 0,
      loading: 0,
      errors: 0,
    },
    executionTimeMs: 4,
  };

  const output = renderDot(result);
  assert.ok(output.includes('\\\\'));
  assert.ok(output.includes('\\"'));
});

test("renderMarkdown - escapes pipe characters in table rows", () => {
  const result: AnalysisResult = {
    project: "pipe-app",
    router: "App Router",
    root: "app",
    routes: [
      {
        path: "/api/test|pipe",
        type: "route",
        file: "api/test|pipe/route.ts",
        segmentType: "static",
        rendering: "server",
        methods: ["GET"],
        files: [],
      },
    ],
    summary: {
      routes: 1,
      dynamic: 0,
      client: 0,
      server: 1,
      layouts: 0,
      loading: 0,
      errors: 0,
    },
    executionTimeMs: 3,
  };

  const md = renderMarkdown(result);
  assert.ok(md.includes("\\|pipe"));
});

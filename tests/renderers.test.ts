import assert from "node:assert";
import { test } from "node:test";
import {
  DotRenderer,
  FlatRenderer,
  getRenderer,
  JsonRenderer,
  MarkdownRenderer,
  MermaidRenderer,
  renderDot,
  renderMarkdown,
  renderMermaid,
  TreeRenderer,
} from "../src/render/index.js";
import { AnalysisResult } from "../src/types/index.js";

const mockResult: AnalysisResult = {
  project: "test-app",
  router: "App Router",
  root: "app",
  routes: [
    {
      path: "/",
      type: "page",
      file: "page.tsx",
      segmentType: "static",
      rendering: "server",
      files: [],
    },
    {
      path: "/about",
      type: "page",
      file: "about/page.tsx",
      segmentType: "static",
      rendering: "client",
      files: [],
    },
    {
      path: "/api/users",
      type: "route",
      file: "api/users/route.ts",
      segmentType: "static",
      rendering: "server",
      methods: ["GET", "POST"],
      files: [],
    },
  ],
  summary: {
    routes: 3,
    dynamic: 0,
    client: 1,
    server: 2,
    layouts: 1,
    loading: 0,
    errors: 0,
    apiRoutes: 1,
  },
  executionTimeMs: 12,
};

test("renderMermaid - formats flowchart TD block correctly", () => {
  const output = renderMermaid(mockResult);
  assert.ok(output.includes("```mermaid"));
  assert.ok(output.includes("flowchart TD"));
  assert.ok(output.includes("/about"));
  assert.ok(output.includes("GET/POST"));
  assert.ok(output.endsWith("```"));
});

test("renderDot - formats valid Graphviz DOT output", () => {
  const output = renderDot(mockResult);
  assert.ok(output.startsWith('digraph "test-appRoutes" {'));
  assert.ok(output.includes('node [shape=box'));
  assert.ok(output.includes("/about"));
  assert.ok(output.includes("[GET, POST]"));
  assert.ok(output.endsWith("}"));
});

test("renderMarkdown - formats clean markdown table", () => {
  const output = renderMarkdown(mockResult);
  assert.ok(output.includes("### Next.js Route Graph: `test-app`"));
  assert.ok(output.includes("| `/about` | page | `static` | **Client** | - | `about/page.tsx` |"));
  assert.ok(output.includes("`GET, POST`"));
});

test("getRenderer - instantiates correct Strategy implementations", () => {
  assert.ok(getRenderer("tree") instanceof TreeRenderer);
  assert.ok(getRenderer("flat") instanceof FlatRenderer);
  assert.ok(getRenderer("json") instanceof JsonRenderer);
  assert.ok(getRenderer("mermaid") instanceof MermaidRenderer);
  assert.ok(getRenderer("dot") instanceof DotRenderer);
  assert.ok(getRenderer("markdown") instanceof MarkdownRenderer);
});

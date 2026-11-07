import assert from "node:assert";
import { test } from "node:test";
import { lintRoutes } from "../src/core/linter.js";
import { DiscoveredFile, RouteEntry } from "../src/types/index.js";

test("linter - supports Multiple Root Layouts across Route Groups without false positive", () => {
  const routes: RouteEntry[] = [
    {
      path: "/",
      type: "page",
      file: "(marketing)/page.tsx",
      segmentType: "static",
      rendering: "server",
      files: [],
      layoutChain: ["(marketing)/layout.tsx"],
    },
    {
      path: "/shop",
      type: "page",
      file: "(shop)/shop/page.tsx",
      segmentType: "static",
      rendering: "server",
      files: [],
      layoutChain: ["(shop)/layout.tsx"],
    },
  ];

  const files: DiscoveredFile[] = [
    {
      relativePath: "(marketing)/layout.tsx",
      fullPath: "/mock/(marketing)/layout.tsx",
      fileName: "layout.tsx",
      extension: ".tsx",
    },
    {
      relativePath: "(marketing)/page.tsx",
      fullPath: "/mock/(marketing)/page.tsx",
      fileName: "page.tsx",
      extension: ".tsx",
    },
    {
      relativePath: "(shop)/layout.tsx",
      fullPath: "/mock/(shop)/layout.tsx",
      fileName: "layout.tsx",
      extension: ".tsx",
    },
    {
      relativePath: "(shop)/shop/page.tsx",
      fullPath: "/mock/(shop)/shop/page.tsx",
      fileName: "page.tsx",
      extension: ".tsx",
    },
  ];

  const result = lintRoutes(routes, files);
  const rootLayoutIssue = result.issues.find((i) => i.rule === "require-root-layout");
  assert.strictEqual(rootLayoutIssue, undefined, "Should not emit require-root-layout when multiple root layouts exist");
});

test("linter - catches exact duplicate URL path collisions across Route Groups", () => {
  const routes: RouteEntry[] = [
    {
      path: "/about",
      type: "page",
      file: "(marketing)/about/page.tsx",
      segmentType: "static",
      rendering: "server",
      files: [],
      layoutChain: ["layout.tsx"],
    },
    {
      path: "/about",
      type: "page",
      file: "(shop)/about/page.tsx",
      segmentType: "static",
      rendering: "server",
      files: [],
      layoutChain: ["layout.tsx"],
    },
  ];

  const files: DiscoveredFile[] = [
    {
      relativePath: "layout.tsx",
      fullPath: "/mock/layout.tsx",
      fileName: "layout.tsx",
      extension: ".tsx",
    },
    {
      relativePath: "(marketing)/about/page.tsx",
      fullPath: "/mock/(marketing)/about/page.tsx",
      fileName: "page.tsx",
      extension: ".tsx",
    },
    {
      relativePath: "(shop)/about/page.tsx",
      fullPath: "/mock/(shop)/about/page.tsx",
      fileName: "page.tsx",
      extension: ".tsx",
    },
  ];

  const result = lintRoutes(routes, files);
  const dupIssue = result.issues.find((i) => i.rule === "no-duplicate-paths");
  assert.ok(dupIssue, "Should flag duplicate URL paths across route groups");
  assert.strictEqual(dupIssue?.severity, "error");
});

test("linter - allows valid static and dynamic segment combinations without collision", () => {
  const routes: RouteEntry[] = [
    {
      path: "/users/new",
      type: "page",
      file: "users/new/page.tsx",
      segmentType: "static",
      rendering: "server",
      files: [],
      layoutChain: ["layout.tsx"],
    },
    {
      path: "/users/[id]",
      type: "page",
      file: "users/[id]/page.tsx",
      segmentType: "dynamic",
      rendering: "server",
      files: [],
      layoutChain: ["layout.tsx"],
    },
  ];

  const files: DiscoveredFile[] = [
    {
      relativePath: "layout.tsx",
      fullPath: "/mock/layout.tsx",
      fileName: "layout.tsx",
      extension: ".tsx",
    },
  ];

  const result = lintRoutes(routes, files);
  const collision = result.issues.find((i) => i.rule === "no-route-collisions");
  assert.strictEqual(collision, undefined, "Static and dynamic segments should not collide");
});

test("linter - catches catch-all parameter collisions", () => {
  const routes: RouteEntry[] = [
    {
      path: "/docs/[...slug]",
      type: "page",
      file: "docs/[...slug]/page.tsx",
      segmentType: "catch-all",
      rendering: "server",
      files: [],
      layoutChain: ["layout.tsx"],
    },
    {
      path: "/docs/[...path]",
      type: "page",
      file: "docs/[...path]/page.tsx",
      segmentType: "catch-all",
      rendering: "server",
      files: [],
      layoutChain: ["layout.tsx"],
    },
  ];

  const files: DiscoveredFile[] = [
    {
      relativePath: "layout.tsx",
      fullPath: "/mock/layout.tsx",
      fileName: "layout.tsx",
      extension: ".tsx",
    },
  ];

  const result = lintRoutes(routes, files);
  const collision = result.issues.find((i) => i.rule === "no-route-collisions");
  assert.ok(collision, "Multiple catch-alls at the same level must be flagged");
});

test("linter - warns if global-error is located in nested subdirectory", () => {
  const routes: RouteEntry[] = [
    {
      path: "/",
      type: "page",
      file: "page.tsx",
      segmentType: "static",
      rendering: "server",
      files: [],
      layoutChain: ["layout.tsx"],
    },
  ];

  const files: DiscoveredFile[] = [
    {
      relativePath: "layout.tsx",
      fullPath: "/mock/layout.tsx",
      fileName: "layout.tsx",
      extension: ".tsx",
    },
    {
      relativePath: "page.tsx",
      fullPath: "/mock/page.tsx",
      fileName: "page.tsx",
      extension: ".tsx",
    },
    {
      relativePath: "dashboard/global-error.tsx",
      fullPath: "/mock/dashboard/global-error.tsx",
      fileName: "global-error.tsx",
      extension: ".tsx",
    },
  ];

  const result = lintRoutes(routes, files);
  const issue = result.issues.find((i) => i.rule === "global-error-location");
  assert.ok(issue);
  assert.strictEqual(issue?.severity, "warning");
});

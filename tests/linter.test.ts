import assert from "node:assert";
import { test } from "node:test";
import { lintRoutes } from "../src/core/linter.js";
import { DiscoveredFile, RouteEntry } from "../src/types/index.js";

test("lintRoutes - detects missing root layout", () => {
  const routes: RouteEntry[] = [
    {
      path: "/",
      type: "page",
      file: "page.tsx",
      segmentType: "static",
      rendering: "server",
      files: [],
    },
  ];

  const files: DiscoveredFile[] = [
    {
      relativePath: "page.tsx",
      fullPath: "/mock/page.tsx",
      fileName: "page.tsx",
      extension: ".tsx",
    },
  ];

  const result = lintRoutes(routes, files);
  assert.strictEqual(result.hasErrors, true);
  assert.ok(result.issues.some((i) => i.rule === "require-root-layout"));
});

test("lintRoutes - detects dynamic route collision", () => {
  const routes: RouteEntry[] = [
    {
      path: "/users/[id]",
      type: "page",
      file: "users/[id]/page.tsx",
      segmentType: "dynamic",
      rendering: "server",
      files: [],
    },
    {
      path: "/users/[slug]",
      type: "page",
      file: "users/[slug]/page.tsx",
      segmentType: "dynamic",
      rendering: "server",
      files: [],
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
      relativePath: "users/[id]/page.tsx",
      fullPath: "/mock/users/[id]/page.tsx",
      fileName: "page.tsx",
      extension: ".tsx",
    },
    {
      relativePath: "users/[slug]/page.tsx",
      fullPath: "/mock/users/[slug]/page.tsx",
      fileName: "page.tsx",
      extension: ".tsx",
    },
  ];

  const result = lintRoutes(routes, files);
  assert.strictEqual(result.hasErrors, true);
  assert.ok(result.issues.some((i) => i.rule === "no-route-collisions"));
});

test("lintRoutes - detects page and route handler conflict", () => {
  const routes: RouteEntry[] = [
    {
      path: "/api/test",
      type: "page",
      file: "api/test/page.tsx",
      segmentType: "static",
      rendering: "server",
      files: [],
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
      relativePath: "api/test/page.tsx",
      fullPath: "/mock/api/test/page.tsx",
      fileName: "page.tsx",
      extension: ".tsx",
    },
    {
      relativePath: "api/test/route.ts",
      fullPath: "/mock/api/test/route.ts",
      fileName: "route.ts",
      extension: ".ts",
    },
  ];

  const result = lintRoutes(routes, files);
  assert.strictEqual(result.hasErrors, true);
  assert.ok(result.issues.some((i) => i.rule === "no-page-route-conflict"));
});

test("lintRoutes - detects parallel slot missing default.tsx", () => {
  const routes: RouteEntry[] = [
    {
      path: "/dashboard",
      type: "page",
      file: "dashboard/page.tsx",
      segmentType: "static",
      rendering: "server",
      files: [],
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
      relativePath: "dashboard/page.tsx",
      fullPath: "/mock/dashboard/page.tsx",
      fileName: "page.tsx",
      extension: ".tsx",
    },
    {
      relativePath: "dashboard/@analytics/page.tsx",
      fullPath: "/mock/dashboard/@analytics/page.tsx",
      fileName: "page.tsx",
      extension: ".tsx",
    },
  ];

  const result = lintRoutes(routes, files);
  assert.strictEqual(result.warningCount > 0, true);
  assert.ok(result.issues.some((i) => i.rule === "parallel-missing-default"));
});

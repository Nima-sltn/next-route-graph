import assert from "node:assert";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { analyzeRoutes } from "../src/core/analyzer.js";
import { detectAppRouter } from "../src/core/detector.js";
import { scanAppDir } from "../src/core/scanner.js";

test("integration - end-to-end analysis of a realistic Next.js App Router project fixture", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nrg-realistic-fixture-"));
  const appDir = path.join(tmp, "src", "app");

  // Create folder structure
  await fs.mkdir(path.join(appDir, "about"), { recursive: true });
  await fs.mkdir(path.join(appDir, "blog", "[slug]"), { recursive: true });
  await fs.mkdir(path.join(appDir, "dashboard", "@modal", "login"), { recursive: true });
  await fs.mkdir(path.join(appDir, "feed", "(..)photo", "[id]"), { recursive: true });
  await fs.mkdir(path.join(appDir, "api", "auth"), { recursive: true });
  await fs.mkdir(path.join(appDir, "_private"), { recursive: true });

  // Root files
  await fs.writeFile(
    path.join(appDir, "layout.tsx"),
    "export default function RootLayout({ children }: { children: React.ReactNode }) { return <html><body>{children}</body></html>; }",
  );
  await fs.writeFile(path.join(appDir, "page.tsx"), "export default function HomePage() { return <h1>Home</h1>; }");
  await fs.writeFile(path.join(appDir, "loading.tsx"), "export default function Loading() {}");
  await fs.writeFile(path.join(appDir, "error.tsx"), "'use client'; export default function Error() {}");
  await fs.writeFile(path.join(appDir, "global-error.tsx"), "'use client'; export default function GlobalError() {}");

  // About page (Client Component with comments)
  await fs.writeFile(
    path.join(appDir, "about", "page.tsx"),
    "// Copyright (c) 2026\n'use client';\nexport default function About() { return <div>About</div>; }",
  );

  // Dynamic Blog page (with route segment config)
  await fs.writeFile(
    path.join(appDir, "blog", "[slug]", "page.tsx"),
    "export const runtime = 'edge';\nexport const dynamic = 'force-dynamic';\nexport default function BlogPost() {}",
  );

  // Dashboard with nested layout and parallel route slot
  await fs.writeFile(
    path.join(appDir, "dashboard", "layout.tsx"),
    "export default function DashboardLayout({ children, modal }: any) { return <section>{children}{modal}</section>; }",
  );
  await fs.writeFile(
    path.join(appDir, "dashboard", "page.tsx"),
    "export default function DashboardPage() {}",
  );
  await fs.writeFile(
    path.join(appDir, "dashboard", "@modal", "default.tsx"),
    "export default function ModalDefault() { return null; }",
  );
  await fs.writeFile(
    path.join(appDir, "dashboard", "@modal", "login", "page.tsx"),
    "export default function LoginModal() {}",
  );

  // Intercepting route
  await fs.writeFile(
    path.join(appDir, "feed", "(..)photo", "[id]", "page.tsx"),
    "export default function InterceptedPhoto() {}",
  );

  // API route handler with GET and POST
  await fs.writeFile(
    path.join(appDir, "api", "auth", "route.ts"),
    `import { NextResponse } from 'next/server';
     export async function GET() { return NextResponse.json({}); }
     export const POST = async () => { return NextResponse.json({}); };`,
  );

  // Private folder files (must be completely ignored)
  await fs.writeFile(path.join(appDir, "_private", "page.tsx"), "export default function Private() {}");

  // Run detection
  const detection = detectAppRouter(tmp);
  assert.strictEqual(detection.displayRoot, "src/app");
  assert.strictEqual(detection.appDir, appDir);

  // Run scanner
  const files = await scanAppDir(detection.appDir);
  const filePaths = files.map((f) => f.relativePath);
  assert.strictEqual(filePaths.some((p) => p.includes("_private")), false, "Private folders must be skipped");

  // Run analysis
  const result = await analyzeRoutes(files, tmp, detection.displayRoot);

  // Assert routes count (7 routes: /, /about, /blog/[slug], /dashboard, /dashboard/login, /feed/photo/[id], /api/auth)
  assert.strictEqual(result.summary.routes, 7);
  assert.strictEqual(result.summary.client, 1); // about
  assert.strictEqual(result.summary.server, 6);
  assert.strictEqual(result.summary.dynamic, 2); // blog/[slug] and photo/[id]
  assert.strictEqual(result.summary.apiRoutes, 1);
  assert.strictEqual(result.summary.layouts, 2); // root + dashboard
  assert.strictEqual(result.summary.loading, 1);
  assert.strictEqual(result.summary.errors, 2); // error + global-error

  // Verify route details
  const blogRoute = result.routes.find((r) => r.path === "/blog/[slug]");
  assert.ok(blogRoute);
  assert.strictEqual(blogRoute?.runtime, "edge");
  assert.strictEqual(blogRoute?.dynamicConfig, "force-dynamic");

  const apiRoute = result.routes.find((r) => r.path === "/api/auth");
  assert.ok(apiRoute);
  assert.deepStrictEqual(apiRoute?.methods?.sort(), ["GET", "POST"]);

  const dashboardRoute = result.routes.find((r) => r.path === "/dashboard");
  assert.ok(dashboardRoute);
  assert.strictEqual(dashboardRoute?.layoutChain?.length, 2, "Dashboard route must inherit both root and nested layout");

  const interceptedRoute = result.routes.find((r) => r.path === "/feed/photo/[id]");
  assert.ok(interceptedRoute);
  assert.strictEqual(interceptedRoute?.intercepting, "(..)");

  // Verify linter passed with 0 errors
  assert.strictEqual(result.lint?.hasErrors, false);
  assert.strictEqual(result.lint?.errorCount, 0);

  await fs.rm(tmp, { recursive: true, force: true });
});

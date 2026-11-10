import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { Script } from "node:vm";
import {
  analyzeRoutes,
  buildRouteGraph,
  filterRoutes,
  getRenderer,
  inspectProject,
  lintRoutes,
  parseRoutePath,
  renderDot,
  renderHtml,
  renderMermaid,
  renderSvg,
  RouteFileReadError,
} from "../src/index.js";
import { startPreview } from "../src/preview.js";
import type { AnalysisResult, RouteEntry } from "../src/types/index.js";

const exec = promisify(execFile);
const cli = path.resolve("dist/cli.js");
const endpoint = (
  file: string,
  overrides: Partial<RouteEntry> = {},
): RouteEntry => ({
  path: parseRoutePath(file),
  type: "page",
  rendering: "server",
  segmentType: "static",
  file,
  files: [],
  ...overrides,
});
const report = (routes: RouteEntry[]): AnalysisResult => ({
  project: "storefront",
  root: "app",
  router: "App Router",
  routes,
  executionTimeMs: 0,
  summary: {
    routes: routes.length,
    client: 0,
    server: routes.length,
    dynamic: 0,
    layouts: 1,
    errors: 0,
    loading: 0,
  },
});

test("graph exports retain missing parent segments and duplicate endpoint sources", () => {
  const routes = [
    endpoint("photo/[id]/page.tsx"),
    endpoint("@modal/(.)photo/[id]/page.tsx", {
      parallelSlots: ["@modal"],
      intercepting: "(.)",
    }),
  ];
  const nodes = buildRouteGraph(routes);
  assert.deepEqual(
    nodes.map((node) => node.path),
    ["/", "/photo", "/photo/[id]"],
  );
  assert.equal(nodes[2].routes.length, 2);
  assert.equal(new Set(nodes.map((node) => node.id)).size, nodes.length);
  for (const render of [renderSvg, renderDot, renderMermaid]) {
    const text = render(report(routes));
    assert.ok(text.includes("/photo"));
    assert.ok(text.includes("root") || text.includes("URL hierarchy"));
  }
  const svg = renderSvg(report(routes));
  assert.ok(svg.includes("@modal"));
  assert.ok(svg.includes("photo/[id]/page.tsx"));
  assert.ok(renderSvg(report([])).includes("No routes discovered"));
  assert.throws(() => getRenderer("typo" as any), /Unsupported output format/);
});

test("HTML and SVG escape hostile paths and keep browser scripts valid", () => {
  const attack = '</script><img src=x onerror="globalThis.pwned=true">';
  const data = report([endpoint("safe/page.tsx", { path: "/" + attack })]);
  data.project = attack;
  const html = renderHtml(data);
  assert.ok(!html.includes(attack));
  assert.ok(
    !html.includes("innerHTML"),
    "Source values must never become executable markup",
  );
  assert.ok(renderSvg(data).includes("&lt;/script&gt;"));
  const scripts = [
    ...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g),
  ];
  assert.equal(scripts.length, 2);
  assert.equal(JSON.parse(scripts[0][1]).result.project, attack);
  assert.doesNotThrow(() => new Script(scripts[1][1]));
});

test("interception resolves URL levels while ignoring route groups and slots", () => {
  assert.equal(
    parseRoutePath("(shop)/feed/@modal/(..)photo/[id]/page.tsx"),
    "/photo/[id]",
  );
  assert.equal(
    parseRoutePath("a/(group)/b/@modal/(..)(..)photo/page.tsx"),
    "/photo",
  );
  assert.equal(parseRoutePath("a/b/@modal/(...)photo/page.tsx"), "/photo");
  assert.equal(parseRoutePath("a/@modal/(.)photo/page.tsx"), "/a/photo");
});

test("lint permits parallel and intercepted variants, case-sensitive paths, and API-only projects", () => {
  const variants = [
    endpoint("dashboard/page.tsx"),
    endpoint("dashboard/@analytics/page.tsx", {
      parallelSlots: ["@analytics"],
    }),
    endpoint("@modal/(.)dashboard/page.tsx", { intercepting: "(.)" }),
  ];
  const lint = lintRoutes(variants, []);
  assert.ok(!lint.issues.some((issue) => issue.rule === "no-duplicate-paths"));
  assert.ok(
    !lintRoutes(
      [endpoint("About/page.tsx"), endpoint("about/page.tsx")],
      [],
    ).issues.some((issue) => issue.rule === "no-route-collisions"),
  );
  assert.ok(
    !lintRoutes([endpoint("api/route.ts", { type: "route" })], []).hasErrors,
  );
  const duplicate = lintRoutes(
    [endpoint("(a)/about/page.tsx"), endpoint("(b)/about/page.tsx")],
    [],
  );
  assert.ok(
    duplicate.issues.some((issue) => issue.rule === "no-duplicate-paths"),
  );
  const divergent = lintRoutes(
    [
      endpoint("users/[id]/settings/page.tsx"),
      endpoint("users/[slug]/profile/page.tsx"),
    ],
    [],
  );
  assert.ok(
    divergent.issues.some((issue) => issue.rule === "no-route-collisions"),
  );
});

test("unreadable convention files abort analysis instead of inventing metadata", async () => {
  await assert.rejects(
    analyzeRoutes(
      [
        {
          relativePath: "page.tsx",
          fullPath: path.join(os.tmpdir(), "nrg-missing-file", "page.tsx"),
          fileName: "page.tsx",
          extension: ".tsx",
        },
      ],
      ".",
      "app",
    ),
    RouteFileReadError,
  );
});

test("CLI and SDK share scanning, filtering, exports, and complete-project CI policy", async (t) => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nrg-workflow-"));
  t.after(() => fs.rm(tmp, { recursive: true, force: true }));
  for (const [file, source] of Object.entries({
    "layout.tsx": "export default function Layout() {}",
    "page.tsx": "export default function Page() {}",
    "api/users/route.ts": "export function GET() {}",
    "blog/[slug]/page.tsx": "'use client'; export default function Page() {}",
  })) {
    const target = path.join(tmp, "app", file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, source);
  }
  const full = await inspectProject(tmp);
  assert.equal(full.summary.routes, 3);
  const filtered = filterRoutes(full, "GET");
  assert.equal(filtered.summary.apiRoutes, 1);
  assert.equal(filtered.summary.client, 0);
  assert.equal(filtered.summary.dynamic, 0);
  assert.equal(filterRoutes(full, "BLOG").summary.apiRoutes, 0);
  assert.equal(full.routes.length, 3, "Filtering must not mutate its input");
  assert.equal(filtered.lint, full.lint);

  const output = path.join(tmp, "reports", "map.svg");
  const written = await exec(process.execPath, [
    cli,
    tmp,
    "--svg",
    "--output",
    output,
  ]);
  assert.equal(written.stdout, "");
  assert.ok((await fs.readFile(output, "utf8")).startsWith("<svg"));
  const html = await exec(process.execPath, [cli, tmp, "--format", "html"]);
  assert.ok(html.stdout.startsWith("<!DOCTYPE html>"));
  await assert.rejects(
    exec(process.execPath, [cli, tmp, "--json", "--html"]),
    /Choose one output format/,
  );
  await assert.rejects(
    exec(process.execPath, [cli, tmp, "--format", "typo"]),
    /Allowed choices/,
  );
  await assert.rejects(
    exec(process.execPath, [cli, tmp, "--serve", "12oops"]),
    /Preview port/,
  );
  const missing = await exec(process.execPath, [
    cli,
    path.join(tmp, "missing"),
    "--format",
    "json",
  ]).catch((error) => error);
  assert.equal(JSON.parse(missing.stderr).code, "ERR_PROJECT_NOT_FOUND");

  await fs.rm(path.join(tmp, "app", "layout.tsx"));
  const failingFile = path.join(tmp, "reports", "failing.json");
  const failed = await exec(process.execPath, [
    cli,
    tmp,
    "--format",
    "json",
    "--output",
    failingFile,
    "--search",
    "api",
    "--strict",
  ]).catch((error) => error);
  assert.equal(failed.code, 1);
  const failedReport = JSON.parse(await fs.readFile(failingFile, "utf8"));
  assert.equal(failedReport.routes.length, 1);
  assert.equal(failedReport.lint.hasErrors, true);
});

test("preview binds loopback, serves HTML only, and reports port conflicts", async (t) => {
  const server = await startPreview("<!DOCTYPE html><title>Report</title>", 0);
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  assert.equal(address.address, "127.0.0.1");
  const url = `http://127.0.0.1:${address.port}`;
  const response = await fetch(url);
  assert.equal(
    response.headers.get("content-type"),
    "text/html; charset=utf-8",
  );
  assert.equal(await response.text(), "<!DOCTYPE html><title>Report</title>");
  assert.equal((await fetch(url, { method: "HEAD" })).status, 200);
  assert.equal((await fetch(url + "/src/cli.ts")).status, 404);
  assert.equal((await fetch(url, { method: "POST" })).status, 405);
  await assert.rejects(startPreview("x", address.port), { code: "EADDRINUSE" });
});

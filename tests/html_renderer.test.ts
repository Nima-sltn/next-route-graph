import assert from "node:assert";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { getRenderer, HtmlRenderer, renderHtml } from "../src/render/index.js";
import { AnalysisResult } from "../src/types/index.js";

const exec = promisify(execFile);
const cliPath = path.resolve("dist", "cli.js");

const mockResult: AnalysisResult = {
  project: "html-showcase-app",
  router: "App Router",
  root: "src/app",
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
    {
      path: "/blog/[slug]",
      type: "page",
      file: "blog/[slug]/page.tsx",
      segmentType: "dynamic",
      rendering: "server",
      runtime: "edge",
      dynamicConfig: "force-dynamic",
      files: [],
    },
  ],
  summary: {
    routes: 4,
    dynamic: 1,
    client: 1,
    server: 3,
    layouts: 1,
    loading: 1,
    errors: 0,
    apiRoutes: 1,
  },
  executionTimeMs: 14,
  lint: {
    issues: [
      {
        rule: "parallel-missing-default",
        severity: "warning",
        message:
          'Parallel route slot "@modal" does not define a default fallback.',
        filePath: "dashboard/@modal",
        hint: "Add default.tsx to prevent 404s.",
      },
    ],
    hasErrors: false,
    errorCount: 0,
    warningCount: 1,
    infoCount: 0,
  },
};

test("renderHtml - produces complete self-contained HTML document", () => {
  const html = renderHtml(mockResult);

  // Document structure
  assert.ok(html.startsWith("<!DOCTYPE html>"));
  assert.ok(
    html.includes("<title>next-route-graph | html-showcase-app</title>"),
  );

  // Summary stats
  assert.ok(html.includes("Total Routes"));
  assert.ok(html.includes("4")); // routes count
  assert.ok(html.includes("Server"));
  assert.ok(html.includes("Client"));

  // Formats tabs presence
  assert.ok(html.includes("Route map"));
  assert.ok(html.includes("Endpoints"));
  assert.ok(html.includes("Project health"));
  assert.ok(html.includes("Share the route map"));
  assert.ok(
    html.includes('data-node-index="0"'),
    "Must contain an actual SVG graph",
  );

  // Pre-rendered format contents
  assert.ok(html.includes("flowchart TD"), "Must contain Mermaid definition");
  assert.ok(
    html.includes("html-showcase-appRoutes") && html.includes("digraph"),
    "Must contain Graphviz DOT definition",
  );
  assert.ok(
    html.includes("### Next.js Route Graph: `html-showcase-app`"),
    "Must contain Markdown table",
  );
  assert.ok(html.includes("/api/users"), "Must contain route path in table");
  assert.ok(
    html.includes("parallel-missing-default"),
    "Must display linter diagnostics",
  );
  assert.ok(
    html.includes("Add default.tsx to prevent 404s."),
    "Must include actionable hints",
  );

  // Zero external dependencies
  assert.doesNotMatch(html, /<(?:script|link)[^>]+(?:src|href)=/);
  assert.ok(html.includes("default-src 'none'"));
});

test("HtmlRenderer - implements Strategy Pattern correctly", () => {
  const renderer = getRenderer("html");
  assert.ok(renderer instanceof HtmlRenderer);

  const output = renderer.render(mockResult);
  assert.ok(output.includes("<!DOCTYPE html>"));
});

test("CLI e2e - supports --html [outputFile] and --format html", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nrg-cli-html-"));
  const appDir = path.join(tmp, "app");
  const htmlOutPath = path.join(tmp, "custom-report.html");

  await fs.mkdir(path.join(appDir, "about"), { recursive: true });
  await fs.writeFile(
    path.join(appDir, "layout.tsx"),
    "export default () => {}",
  );
  await fs.writeFile(path.join(appDir, "page.tsx"), "export default () => {}");
  await fs.writeFile(
    path.join(appDir, "about", "page.tsx"),
    "export default () => {}",
  );

  // Test 1: --html <filePath>
  const { stderr: htmlLog } = await exec(process.execPath, [
    cliPath,
    tmp,
    "--html",
    htmlOutPath,
  ]);
  assert.ok(htmlLog.includes("HTML report written to"));

  const fileExists = await fs
    .stat(htmlOutPath)
    .then((s) => s.isFile())
    .catch(() => false);
  assert.strictEqual(fileExists, true);

  const writtenHtml = await fs.readFile(htmlOutPath, "utf-8");
  assert.ok(writtenHtml.includes("<!DOCTYPE html>"));
  assert.ok(writtenHtml.includes("/about"));

  // Test 2: --format html outputs to stdout
  const { stdout: stdoutHtml } = await exec(process.execPath, [
    cliPath,
    tmp,
    "--format",
    "html",
  ]);
  assert.ok(stdoutHtml.includes("<!DOCTYPE html>"));
  assert.ok(stdoutHtml.includes("Route map"));

  await fs.rm(tmp, { recursive: true, force: true });
});

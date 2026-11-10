import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { renderHtml } from "../../dist/index.js";

const pageRoute = (routePath, file, extra = {}) => ({
  path: routePath,
  file,
  type: "page",
  rendering: "server",
  segmentType: "static",
  files: [],
  layoutChain: ["layout.tsx"],
  ...extra,
});
const routes = [
  pageRoute("/", "page.tsx"),
  pageRoute("/api/products", "api/products/route.ts", {
    type: "route",
    methods: ["GET", "POST"],
  }),
  pageRoute("/dashboard", "dashboard/page.tsx", {
    layoutChain: ["layout.tsx", "dashboard/layout.tsx"],
  }),
  pageRoute("/dashboard", "dashboard/@analytics/page.tsx", {
    parallelSlots: ["@analytics"],
  }),
  pageRoute("/products/[slug]", "products/[slug]/page.tsx", {
    segmentType: "dynamic",
    runtime: "edge",
    dynamicConfig: "force-dynamic",
  }),
  pageRoute("/search", "search/page.tsx", { rendering: "client" }),
];
const result = {
  project: "storefront",
  router: "App Router",
  root: "src/app",
  routes,
  summary: {
    routes: 6,
    dynamic: 1,
    client: 1,
    server: 5,
    layouts: 2,
    loading: 1,
    errors: 1,
    apiRoutes: 1,
  },
  executionTimeMs: 8,
  lint: {
    issues: [
      {
        rule: "parallel-missing-default",
        severity: "warning",
        filePath: "dashboard/@analytics",
        message: "Parallel slot has no default fallback.",
        hint: "Add default.tsx to handle unmatched navigation.",
      },
    ],
    errorCount: 0,
    warningCount: 1,
    hasErrors: false,
  },
};

test("offline browser report: selection, filtering, downloads, keyboard, mobile, and source safety", async (t) => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nrg-browser-"));
  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || undefined,
  });
  t.after(async () => {
    await browser.close();
    await fs.rm(tmp, { recursive: true, force: true });
  });
  const context = await browser.newContext({
    offline: true,
    acceptDownloads: true,
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [];
  const network = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) network.push(request.url());
  });
  const file = path.join(tmp, "report.html");
  await fs.writeFile(file, renderHtml(result));
  await page.goto(pathToFileURL(file).href);
  assert.equal(await page.locator("svg").count(), 1);
  assert.equal(await page.locator("[data-node-index]").count(), 7);
  const dashboard = page
    .locator("[data-node-index]")
    .filter({ hasText: "/dashboard" });
  await dashboard.focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await page.locator("#detail article").count(),
    2,
    "Both parallel endpoint sources must remain inspectable",
  );
  assert.match(
    await page.locator("#detail").innerText(),
    /dashboard\/layout.tsx/,
  );
  assert.match(await page.locator("#detail").innerText(), /@analytics/);

  const artifactDir = process.env.NRG_REPORT_ARTIFACT_DIR;
  if (artifactDir) {
    await fs.mkdir(artifactDir, { recursive: true });
    await fs.copyFile(file, path.join(artifactDir, "demo.html"));
    await page.screenshot({
      path: path.join(artifactDir, "report-desktop.png"),
      fullPage: true,
    });
  }

  await page.getByRole("button", { name: "Routes (6)", exact: true }).click();
  await page.getByLabel("Find routes").fill("POST");
  assert.equal(await page.locator("tbody tr:visible").count(), 1);
  assert.equal(
    await page.locator("#match-count").innerText(),
    "1 of 6 endpoints",
  );
  const csvDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download filtered CSV" }).click();
  const csv = await csvDownload;
  const csvText = await fs.readFile(await csv.path(), "utf8");
  assert.match(csvText, /GET, POST/);
  assert.ok(!csvText.includes("search/page.tsx"));
  await page.getByLabel("Find routes").fill("does-not-exist");
  assert.equal(await page.locator("#no-matches").isVisible(), true);
  await page.getByLabel("Find routes").fill("");
  await page.getByLabel("Show", { exact: true }).selectOption("client");
  assert.equal(await page.locator("tbody tr:visible").count(), 1);
  await page.locator('[data-select-route="5"]').click();
  assert.match(await page.locator("#detail").innerText(), /search\/page.tsx/);
  assert.equal(await page.locator("#map").isVisible(), true);

  await page.getByRole("button", { name: "Health (1)", exact: true }).click();
  assert.match(await page.locator("#health").innerText(), /Add default.tsx/);
  assert.equal(await page.locator("#filters").isVisible(), false);
  await page.getByRole("button", { name: "Exports", exact: true }).click();
  for (const format of [
    "svg",
    "json",
    "dot",
    "mermaid",
    "markdown",
    "flat",
    "tree",
  ]) {
    await page.getByLabel("Format", { exact: true }).selectOption(format);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download", exact: true }).click();
    const data = await download;
    const content = await fs.readFile(await data.path(), "utf8");
    assert.ok(content.length > 0);
    if (format === "svg") {
      assert.equal(
        await page.evaluate(
          (text) =>
            new DOMParser()
              .parseFromString(text, "image/svg+xml")
              .querySelector("parsererror")?.textContent ?? null,
          content,
        ),
        null,
      );
    }
    if (format === "json") assert.equal(JSON.parse(content).routes.length, 6);
    if (format === "mermaid") {
      assert.ok(content.startsWith("flowchart TD"));
      assert.ok(!content.includes("```"), "MMD downloads must contain raw source");
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Route map", exact: true }).click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
    "Mobile report must not overflow the page",
  );
  if (artifactDir)
    await page.screenshot({
      path: path.join(artifactDir, "report-mobile.png"),
      fullPage: true,
    });

  const attack = '</script><img src=x onerror="globalThis.pwned=1">';
  const hostile = {
    ...result,
    project: attack,
    routes: [pageRoute("/" + attack, "=1+1")],
  };
  const hostileFile = path.join(tmp, "hostile.html");
  await fs.writeFile(hostileFile, renderHtml(hostile));
  await page.goto(pathToFileURL(hostileFile).href);
  await page.locator("[data-node-index]").last().click();
  assert.equal(await page.evaluate(() => globalThis.pwned), undefined);
  assert.equal(await page.locator("img").count(), 0);
  assert.ok((await page.locator("#detail").innerText()).includes("=1+1"));
  await page.getByRole("button", { name: "Routes (1)", exact: true }).click();
  const safeCsv = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download filtered CSV" }).click();
  assert.ok(
    (await fs.readFile(await (await safeCsv).path(), "utf8")).includes("'=1+1"),
  );
  assert.deepEqual(
    network,
    [],
    "Reports must work without external network requests",
  );
  assert.deepEqual(errors, [], "Browser scripts must run without errors");
});

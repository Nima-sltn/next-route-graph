import assert from "node:assert";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  detectRenderingType,
  getSegmentType,
  parseRoutePath,
  parseSpecialFileType,
} from "../src/core/parser.js";

test("parseRoutePath - normalizes routes correctly", () => {
  assert.strictEqual(parseRoutePath("page.tsx"), "/");
  assert.strictEqual(parseRoutePath("about/page.tsx"), "/about");
  assert.strictEqual(parseRoutePath("blog/[slug]/page.tsx"), "/blog/[slug]");
  assert.strictEqual(
    parseRoutePath("(marketing)/pricing/page.tsx"),
    "/pricing",
  );
  assert.strictEqual(
    parseRoutePath("dashboard/@analytics/page.tsx"),
    "/dashboard",
  );
  assert.strictEqual(parseRoutePath("feed/(.)photo/page.tsx"), "/feed/photo");
});

test("getSegmentType - detects parameter patterns", () => {
  assert.strictEqual(getSegmentType("/about"), "static");
  assert.strictEqual(getSegmentType("/blog/[slug]"), "dynamic");
  assert.strictEqual(getSegmentType("/docs/[...slug]"), "catch-all");
  assert.strictEqual(getSegmentType("/docs/[[...slug]]"), "optional-catch-all");
});

test("parseSpecialFileType - checks valid next route files", () => {
  assert.strictEqual(parseSpecialFileType("page.tsx"), "page");
  assert.strictEqual(parseSpecialFileType("layout.js"), "layout");
  assert.strictEqual(parseSpecialFileType("route.ts"), "route");
  assert.strictEqual(parseSpecialFileType("random.ts"), null);
});

test("detectRenderingType - identifies client vs server directives", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nrm-test-"));

  const clientFile = path.join(tmp, "client.tsx");
  await fs.writeFile(
    clientFile,
    '"use client";\nexport default function C() {}',
  );

  const serverFile = path.join(tmp, "server.tsx");
  await fs.writeFile(serverFile, "export default function S() {}");

  assert.strictEqual(await detectRenderingType(clientFile), "client");
  assert.strictEqual(await detectRenderingType(serverFile), "server");

  await fs.rm(tmp, { recursive: true, force: true });
});

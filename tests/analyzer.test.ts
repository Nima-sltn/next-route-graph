import assert from "node:assert";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { analyzeRoutes } from "../src/core/analyzer.js";
import { scanAppDir } from "../src/core/scanner.js";
import { renderFlat } from "../src/render/flat.js";
import { renderJson } from "../src/render/json.js";

test("analyzeRoutes - scans and summarizes project", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nrm-test-"));
  const appDir = path.join(tmp, "app");

  await fs.mkdir(path.join(appDir, "about"), { recursive: true });
  await fs.mkdir(path.join(appDir, "api", "users"), { recursive: true });

  await fs.writeFile(path.join(appDir, "page.tsx"), "export default () => {}");
  await fs.writeFile(
    path.join(appDir, "about", "page.tsx"),
    '"use client"; export default () => {}',
  );
  await fs.writeFile(
    path.join(appDir, "api", "users", "route.ts"),
    "export function GET() {}",
  );

  const scannedFiles = await scanAppDir(appDir);
  const result = await analyzeRoutes(scannedFiles, tmp, "app");

  assert.strictEqual(result.summary.routes, 3);
  assert.strictEqual(result.summary.client, 1);
  assert.strictEqual(result.summary.server, 2);

  const flatOutput = renderFlat(result.routes);
  assert.strictEqual(flatOutput, "/\n/about\n/api/users");

  const jsonParsed = JSON.parse(renderJson(result));
  assert.strictEqual(jsonParsed.routes.length, 3);

  await fs.rm(tmp, { recursive: true, force: true });
});

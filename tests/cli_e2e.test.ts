import assert from "node:assert";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

const exec = promisify(execFile);
const cliPath = path.resolve("dist", "cli.js");

test("CLI e2e - supports --help and --version", async () => {
  const { stdout: helpOut } = await exec(process.execPath, [cliPath, "--help"]);
  assert.ok(helpOut.includes("Usage: next-route-graph"));

  const { stdout: verOut } = await exec(process.execPath, [cliPath, "--version"]);
  assert.ok(verOut.includes("1.1.0"));
});

test("CLI e2e - outputs valid JSON format and handles --search", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nrg-cli-test-"));
  const appDir = path.join(tmp, "app");

  await fs.mkdir(path.join(appDir, "about"), { recursive: true });
  await fs.mkdir(path.join(appDir, "blog"), { recursive: true });
  await fs.writeFile(path.join(appDir, "layout.tsx"), "export default () => {}");
  await fs.writeFile(path.join(appDir, "page.tsx"), "export default () => {}");
  await fs.writeFile(path.join(appDir, "about", "page.tsx"), "export default () => {}");
  await fs.writeFile(path.join(appDir, "blog", "page.tsx"), "export default () => {}");

  // Run with --json
  const { stdout: jsonOut } = await exec(process.execPath, [
    cliPath,
    tmp,
    "--json",
  ]);
  const parsed = JSON.parse(jsonOut);
  assert.strictEqual(parsed.routes.length, 3);
  assert.strictEqual(parsed.summary.routes, 3);

  // Run with --search blog --flat
  const { stdout: searchOut } = await exec(process.execPath, [
    cliPath,
    tmp,
    "--search",
    "blog",
    "--flat",
  ]);
  assert.strictEqual(searchOut.trim(), "/blog");

  // Run check subcommand (must exit 0 on clean project)
  const { stdout: checkOut } = await exec(process.execPath, [
    cliPath,
    "check",
    tmp,
  ]);
  assert.ok(checkOut.includes("Routes"));

  await fs.rm(tmp, { recursive: true, force: true });
});

test("CLI e2e - check command exits with code 1 on route collisions", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nrg-cli-err-"));
  const appDir = path.join(tmp, "app");

  await fs.mkdir(path.join(appDir, "users", "[id]"), { recursive: true });
  await fs.mkdir(path.join(appDir, "users", "[slug]"), { recursive: true });
  await fs.writeFile(path.join(appDir, "layout.tsx"), "export default () => {}");
  await fs.writeFile(path.join(appDir, "users", "[id]", "page.tsx"), "export default () => {}");
  await fs.writeFile(path.join(appDir, "users", "[slug]", "page.tsx"), "export default () => {}");

  let exitCode = 0;
  let stderr = "";
  try {
    await exec(process.execPath, [cliPath, "check", tmp]);
  } catch (err: any) {
    exitCode = err.code;
    stderr = err.stderr || err.stdout;
  }

  assert.strictEqual(exitCode, 1, "Check command must exit with code 1 when collisions are found");
  assert.ok(stderr.includes("Route validation failed") || stderr.includes("no-route-collisions"));

  await fs.rm(tmp, { recursive: true, force: true });
});

test("CLI e2e - invalid project directory returns error code 1 with hint", async () => {
  let exitCode = 0;
  let stderr = "";
  try {
    await exec(process.execPath, [cliPath, "./nonexistent-directory-test"]);
  } catch (err: any) {
    exitCode = err.code;
    stderr = err.stderr;
  }

  assert.strictEqual(exitCode, 1);
  assert.ok(stderr.includes("The specified project path does not exist"));
  assert.ok(stderr.includes("Hint:"));
});

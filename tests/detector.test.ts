import assert from "node:assert";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { detectAppRouter } from "../src/core/detector.js";

test("detectAppRouter - detects app/", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nrm-test-"));
  await fs.mkdir(path.join(tmp, "app"), { recursive: true });

  const result = detectAppRouter(tmp);
  assert.strictEqual(result.displayRoot, "app");

  await fs.rm(tmp, { recursive: true, force: true });
});

test("detectAppRouter - detects src/app/", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nrm-test-"));
  await fs.mkdir(path.join(tmp, "src", "app"), { recursive: true });

  const result = detectAppRouter(tmp);
  assert.strictEqual(result.displayRoot, "src/app");

  await fs.rm(tmp, { recursive: true, force: true });
});

test("detectAppRouter - fails when both exist", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nrm-test-"));
  await fs.mkdir(path.join(tmp, "app"), { recursive: true });
  await fs.mkdir(path.join(tmp, "src", "app"), { recursive: true });

  assert.throws(() => detectAppRouter(tmp), /Found both/);

  await fs.rm(tmp, { recursive: true, force: true });
});

test("detectAppRouter - fails when missing app dir", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nrm-test-"));

  assert.throws(
    () => detectAppRouter(tmp),
    /No Next.js App Router directory found/,
  );

  await fs.rm(tmp, { recursive: true, force: true });
});

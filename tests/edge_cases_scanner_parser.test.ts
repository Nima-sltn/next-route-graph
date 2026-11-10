import assert from "node:assert";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  detectHttpMethods,
  detectRenderingType,
  detectRouteConfig,
  detectServerActions,
  extractRouteMetadata,
  getPrologueDirectives,
  parseRoutePath,
  parseSpecialFileType,
} from "../src/core/parser.js";
import { scanAppDir } from "../src/core/scanner.js";

test("scanner - ignores private folders (_components, _lib)", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nrg-test-scan-"));
  const appDir = path.join(tmp, "app");

  await fs.mkdir(path.join(appDir, "_components"), { recursive: true });
  await fs.mkdir(path.join(appDir, "_lib", "nested"), { recursive: true });
  await fs.mkdir(path.join(appDir, ".hidden"), { recursive: true });
  await fs.mkdir(path.join(appDir, "blog"), { recursive: true });

  await fs.writeFile(path.join(appDir, "_components", "Button.tsx"), "export default () => {}");
  await fs.writeFile(path.join(appDir, "_components", "page.tsx"), "export default () => {}");
  await fs.writeFile(path.join(appDir, "_lib", "nested", "page.tsx"), "export default () => {}");
  await fs.writeFile(path.join(appDir, ".hidden", "page.tsx"), "export default () => {}");
  await fs.writeFile(path.join(appDir, "blog", "page.tsx"), "export default () => {}");

  const scanned = await scanAppDir(appDir);
  const scannedRelative = scanned.map((f) => f.relativePath);

  assert.strictEqual(scanned.length, 1);
  assert.strictEqual(scannedRelative[0], "blog/page.tsx");

  await fs.rm(tmp, { recursive: true, force: true });
});

test("parser - decodes %5F escaped underscores in URL segments", () => {
  assert.strictEqual(parseRoutePath("%5Fprivate/page.tsx"), "/_private");
  assert.strictEqual(parseRoutePath("api/%5Fsecret/route.ts"), "/api/_secret");
});

test("parser - strips multi-level intercepting routes (..)(..) properly", () => {
  const path1 = parseRoutePath("feed/(..)(..)photo/[id]/page.tsx");
  assert.strictEqual(path1, "/photo/[id]");

  const meta = extractRouteMetadata("feed/(..)(..)photo/[id]/page.tsx");
  assert.strictEqual(meta.intercepting, "(..)(..)");
});

test("parser - detects 'use client' after long multi-line license headers", async () => {
  const longHeader = "/*\n" + " * Company License Agreement\n".repeat(40) + " */\n\n'use client';\nexport default function Page() {}";
  const directives = getPrologueDirectives(longHeader);
  assert.ok(directives.has("use client"));

  const rendering = await detectRenderingType(longHeader);
  assert.strictEqual(rendering, "client");
});

test("parser - avoids false positives from 'use client' in comments or strings", async () => {
  const commentedOut = `
    // "use client";
    /*
      'use client';
    */
    const info = "use client in component";
    export default function Page() {}
  `;
  const directives = getPrologueDirectives(commentedOut);
  assert.strictEqual(directives.has("use client"), false);

  const rendering = await detectRenderingType(commentedOut);
  assert.strictEqual(rendering, "server");
});

test("parser - detects inline function-level server actions", () => {
  const codeWithInlineAction = `
    import db from "@/lib/db";

    export default function Page() {
      async function addItem(formData: FormData) {
        "use server";
        await db.save(formData);
      }
      return <form action={addItem}></form>;
    }
  `;
  assert.strictEqual(detectServerActions(codeWithInlineAction), true);
});

test("parser - ignores commented-out HTTP methods", () => {
  const codeWithCommentedMethod = `
    import { NextResponse } from "next/server";

    // export async function GET() {}
    /*
    export async function POST() {}
    */
    export async function DELETE() {
      return NextResponse.json({ ok: true });
    }
  `;
  const methods = detectHttpMethods(codeWithCommentedMethod);
  assert.deepStrictEqual(methods, ["DELETE"]);
});

test("parser - extracts typed route configurations", () => {
  const code = `
    export const runtime: ServerRuntime = 'edge';
    export const dynamic: DynamicMode = 'force-dynamic';
  `;
  const config = detectRouteConfig(code);
  assert.strictEqual(config.runtime, "edge");
  assert.strictEqual(config.dynamicConfig, "force-dynamic");
});

test("parser - recognizes global-error special file", () => {
  assert.strictEqual(parseSpecialFileType("global-error.tsx"), "global-error");
  assert.strictEqual(parseSpecialFileType("global-error.js"), "global-error");
});

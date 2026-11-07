import assert from "node:assert";
import { test } from "node:test";
import {
  detectHttpMethods,
  detectRouteConfig,
  detectServerActions,
  extractRouteMetadata,
} from "../src/core/parser.js";

test("detectHttpMethods - identifies exported HTTP handler functions", () => {
  const code = `
    import { NextResponse } from "next/server";

    export async function GET(request: Request) {
      return NextResponse.json({ ok: true });
    }

    export const POST = async () => {
      return NextResponse.json({ created: true });
    };

    export function DELETE() {}
  `;

  const methods = detectHttpMethods(code);
  assert.deepStrictEqual(methods.sort(), ["DELETE", "GET", "POST"]);
});

test("detectServerActions - detects 'use server' directive", () => {
  const serverActionCode = `
    "use server";

    export async function submitForm(data: FormData) {
      // process
    }
  `;

  const regularCode = `
    export default function Page() {
      return <div>Hello</div>;
    }
  `;

  assert.strictEqual(detectServerActions(serverActionCode), true);
  assert.strictEqual(detectServerActions(regularCode), false);
});

test("detectRouteConfig - extracts runtime and dynamic configs", () => {
  const code = `
    export const runtime = 'edge';
    export const dynamic = 'force-dynamic';

    export default function Page() {}
  `;

  const config = detectRouteConfig(code);
  assert.strictEqual(config.runtime, "edge");
  assert.strictEqual(config.dynamicConfig, "force-dynamic");
});

test("extractRouteMetadata - extracts slots and intercepting markers", () => {
  const meta1 = extractRouteMetadata("dashboard/@analytics/page.tsx");
  assert.deepStrictEqual(meta1.slots, ["@analytics"]);

  const meta2 = extractRouteMetadata("feed/(..)photo/[id]/page.tsx");
  assert.strictEqual(meta2.intercepting, "(..)");
});

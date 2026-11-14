import assert from "node:assert/strict";
import { test } from "node:test";
import { escapeMarkup, buildRouteGraph } from "../src/render/graph.js";
import { getPrologueDirectives } from "../src/core/parser.js";

test("markup escaping removes forbidden controls and retains XML whitespace", () => {
  const controls = Array.from({ length: 32 }, (_, code) =>
    String.fromCharCode(code),
  ).join("");
  assert.equal(escapeMarkup(controls), "\t\n\r");
  assert.equal(
    escapeMarkup(`<&>"' café 🚀`),
    "&lt;&amp;&gt;&quot;&#39; café 🚀",
  );
});

test("directive scanning handles comments, multiple directives, and unfinished input", () => {
  assert.deepEqual(
    [
      ...getPrologueDirectives(
        `#!/usr/bin/env node\n// comment\n/* block */\n"use strict"; 'use client'\nexport default 1;`,
      ),
    ],
    ["use strict", "use client"],
  );
  for (const content of [
    "/* unfinished",
    '"use client',
    "// use client",
    '"use client" + value',
  ]) {
    assert.equal(getPrologueDirectives(content).size, 0);
  }
});

test("graph hierarchy retains deterministic code point ordering", () => {
  const routes = ["/a", "/Z", "/a/nested"].map((path) => ({
    path,
    file: path + "/page.tsx",
    type: "page" as const,
    segmentType: "static" as const,
    rendering: "server" as const,
    files: [],
  }));
  assert.deepEqual(
    buildRouteGraph(routes).map((node) => node.path),
    ["/", "/Z", "/a", "/a/nested"],
  );
});

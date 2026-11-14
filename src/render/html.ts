import type { AnalysisResult, RouteEntry, LintIssue } from "../types/index.js";
import { renderDot } from "./dot.js";
import { renderFlat } from "./flat.js";
import { buildRouteGraph, escapeMarkup as esc } from "./graph.js";
import { renderJson } from "./json.js";
import { renderMarkdown } from "./markdown.js";
import { renderMermaid } from "./mermaid.js";
import type { OutputRenderer } from "./renderer.interface.js";
import { renderSvg } from "./svg.js";
import { renderTree } from "./tree.js";
import { stripVTControlCharacters } from "node:util";

/** Self-contained report. All source data is escaped; no project code is executed. */
export function renderHtml(result: AnalysisResult): string {
  const svg = renderSvg(result);
  const sources = {
    svg: { text: svg, extension: "svg", mime: "image/svg+xml" },
    mermaid: {
      text: renderMermaid(result).split("\n").slice(1, -1).join("\n"),
      extension: "mmd",
      mime: "text/plain",
    },
    dot: {
      text: renderDot(result),
      extension: "dot",
      mime: "text/vnd.graphviz",
    },
    markdown: {
      text: renderMarkdown(result),
      extension: "md",
      mime: "text/markdown",
    },
    json: {
      text: renderJson(result),
      extension: "json",
      mime: "application/json",
    },
    flat: { text: renderFlat(result), extension: "txt", mime: "text/plain" },
    tree: {
      text: stripVTControlCharacters(renderTree(result)),
      extension: "txt",
      mime: "text/plain",
    },
  };
  const payload = JSON.stringify({
    result,
    nodes: buildRouteGraph(result.routes),
    sources,
  }).replace(/</g, "\\u003c");
  const issues = result.lint?.issues ?? [];
  const healthSummary = result.lint
    ? result.lint.errorCount +
      " errors · " +
      result.lint.warningCount +
      " warnings"
    : "No lint results available";
  const stats = [
    ["Endpoints", result.routes.length],
    ["Server", result.summary.server],
    ["Client", result.summary.client],
    ["Dynamic", result.summary.dynamic],
    ["API handlers", result.summary.apiRoutes ?? 0],
    ["Layouts", result.summary.layouts],
  ];
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; base-uri 'none'; form-action 'none'">
<title>next-route-graph | ${esc(result.project)}</title>
<style>
:root {
  color-scheme: dark;
  --bg: #0b1020;
  --surface: #111a2b;
  --line: #2b3851;
  --text: #edf2fa;
  --muted: #a6b4ca;
  --accent: #67e8f9;
  font-family:
    system-ui,
    -apple-system,
    Segoe UI,
    sans-serif;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
}
main {
  max-width: 1480px;
  margin: auto;
  padding: 32px;
}
h1,
h2,
h3,
p {
  margin: 0 0 12px;
}
h1 {
  font-size: 24px;
  letter-spacing: -0.7px;
}
h2 {
  font-size: 18px;
}
h3 {
  font-size: 15px;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
}
.eyebrow {
  color: var(--accent);
  font-size: 11px;
  letter-spacing: 2px;
  font-weight: 700;
  margin-bottom: 6px;
}
.muted,
small {
  color: var(--muted);
}
code,
pre,
.mono {
  font-family: ui-monospace, Consolas, monospace;
}
code {
  overflow-wrap: anywhere;
}
button,
input,
select {
  font: inherit;
}
button,
select {
  cursor: pointer;
}
button,
select,
input {
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #172237;
  color: var(--text);
  padding: 9px 13px;
}
button:hover {
  border-color: var(--accent);
}
button:focus-visible,
input:focus-visible,
select:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
button[aria-current="page"] {
  background: #164155;
  border-color: var(--accent);
  color: var(--accent);
}
.stats {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.stat {
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
}
.stat b {
  display: block;
  font-size: 26px;
  line-height: 1.2;
}
.stat span {
  font-size: 12px;
  color: var(--muted);
}
nav {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}
.toolbar input {
  flex: 1;
  min-width: 180px;
}
.toolbar label {
  font-size: 13px;
  color: var(--muted);
}
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 20px;
  min-width: 0;
}
.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
}
.map-scroll {
  max-height: 68vh;
  overflow: auto;
  border-radius: 8px;
}
.map-scroll svg {
  display: block;
  min-width: 100%;
  height: auto;
}
.map-scroll g[aria-pressed="true"] rect:first-of-type {
  stroke: var(--accent);
  stroke-width: 2;
}
.map-scroll g.dim {
  opacity: 0.22;
}
.detail {
  max-height: 72vh;
  overflow: auto;
}
.detail article + article {
  border-top: 1px solid var(--line);
  padding-top: 18px;
  margin-top: 18px;
}
.detail dt {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--muted);
  margin-top: 14px;
}
.detail dd {
  margin: 4px 0;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.detail ol,
.detail ul {
  padding-left: 20px;
  font-size: 13px;
}
.badge {
  display: inline-block;
  padding: 2px 7px;
  border: 1px solid var(--line);
  border-radius: 4px;
  font:
    11px ui-monospace,
    Consolas,
    monospace;
  color: #c7d2fe;
  margin: 2px;
}
.badge.client {
  color: var(--accent);
}
.badge.route {
  color: #d8b4fe;
}
.table-wrap {
  overflow: auto;
}
table {
  border-collapse: collapse;
  width: 100%;
  text-align: left;
  font-size: 13px;
}
caption {
  text-align: left;
  color: var(--muted);
  padding-bottom: 12px;
}
th,
td {
  padding: 12px 10px;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
}
th {
  color: var(--muted);
  font-weight: 500;
}
td button {
  font-family: ui-monospace, Consolas, monospace;
  text-align: left;
  white-space: normal;
  overflow-wrap: anywhere;
}
.issue {
  border-left: 3px solid #fbbf24;
  padding: 16px 18px;
  margin: 14px 0;
  background: #172237;
  border-radius: 5px;
  overflow-wrap: anywhere;
}
.issue.error {
  border-color: #f87171;
}
.issue.info {
  border-color: var(--accent);
}
pre {
  white-space: pre;
  overflow: auto;
  max-height: 65vh;
  background: #080d18;
  padding: 18px;
  border-radius: 8px;
  font-size: 12px;
}
details {
  margin-top: 12px;
}
summary {
  cursor: pointer;
  color: var(--muted);
}
.legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: var(--muted);
  font-size: 12px;
  margin-top: 12px;
}
.legend span::before {
  content: "●";
  color: #a5b4fc;
  margin-right: 6px;
}
.legend .client::before {
  color: var(--accent);
}
.legend .api::before {
  color: #d8b4fe;
}
footer {
  font-size: 12px;
  color: var(--muted);
  margin-top: 24px;
}
#status {
  min-height: 24px;
  font-size: 13px;
  color: var(--accent);
  margin-top: 12px;
}
[hidden] {
  display: none !important;
}
@media (max-width: 950px) {
  .workspace {
    grid-template-columns: 1fr;
  }
  .detail {
    max-height: none;
  }
  .stats {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 550px) {
  main {
    padding: 16px;
  }
  header {
    display: block;
  }
  .stats {
    gap: 8px;
  }
  .stat {
    padding: 12px;
  }
  .stat b {
    font-size: 22px;
  }
  .toolbar {
    align-items: stretch;
  }
  .toolbar input {
    min-width: 100%;
  }
  .card {
    padding: 14px;
  }
  nav button {
    flex: 1;
  }
  header small {
    display: block;
    margin-top: 8px;
  }
}
@media print {
  nav,
  .toolbar,
  footer,
  #status {
    display: none;
  }
  .panel[hidden] {
    display: block !important;
  }
  .workspace {
    display: block;
  }
  .map-scroll,
  .detail,
  pre {
    max-height: none;
  }
  body {
    background: white;
    color: black;
  }
  .card {
    break-inside: avoid;
  }
  .panel {
    margin-bottom: 24px;
  }
}
</style>
</head>
<body>
<main>
<header><div><p class="eyebrow">NEXT.JS / APP ROUTER</p><h1>${esc(result.project)}</h1><p class="muted"><code>${esc(result.root)}</code> · Route architecture report</p></div><small>next-route-graph · ${result.executionTimeMs} ms · Offline report</small></header>
<section class="stats" aria-label="Route summary">${stats.map(([label, value]) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`).join("")}</section>
<nav aria-label="Report sections">
  <button data-panel="map" aria-current="page" aria-controls="map">Route map</button>
  <button data-panel="routes" aria-controls="routes">Routes (${result.routes.length})</button>
  <button data-panel="health" aria-controls="health">Health (${issues.length})</button>
  <button data-panel="exports" aria-controls="exports">Exports</button>
</nav>
<div id="filters" class="toolbar">
  <label for="search">Find routes</label><input id="search" type="search" placeholder="Path, file, HTTP method, or layout…">
  <label for="kind">Show</label><select id="kind"><option value="all">All endpoints</option><option value="page">Pages</option><option value="route">API handlers</option><option value="client">Client</option><option value="server">Server</option><option value="dynamic">Dynamic</option><option value="parallel">Parallel slots</option><option value="intercepted">Intercepted</option></select>
  <span id="match-count" role="status" class="muted">${result.routes.length} endpoints</span>
</div>
<section id="map" class="panel" aria-label="Route map">
  <div class="workspace"><div class="card"><h2>URL hierarchy</h2><p class="muted">Select a node to inspect its source and layout chain. Branches include segments without pages.</p><div class="map-scroll">${svg.replace('role="img"', 'role="group"')}</div><div class="legend"><span>Server page</span><span class="client">Client page</span><span class="api">API handler</span></div></div>
  <aside class="card detail" id="detail" aria-label="Selected route"><h2>Route details</h2><p class="muted">Select a route in the map or route table.</p></aside></div>
</section>
<section id="routes" class="panel card" hidden aria-label="Route table">
  <div class="toolbar"><h2>Endpoints</h2><button id="csv">Download filtered CSV</button></div>
  <div class="table-wrap"><table><caption>Every endpoint source is retained, including parallel and intercepted variants.</caption><thead><tr><th scope="col">Path</th><th scope="col">Type</th><th scope="col">Rendering</th><th scope="col">Methods / segment</th><th scope="col">Source file</th></tr></thead><tbody>
  ${result.routes.map(renderRouteRow).join("")}
  </tbody></table></div><p id="no-matches" class="muted"${result.routes.length ? " hidden" : ""}>No matching endpoints. Clear the search or choose another filter.</p>
</section>
<section id="health" class="panel card" hidden aria-label="Route health"><h2>Project health</h2><p class="muted">${healthSummary}. Diagnostics cover the full project, even when routes are filtered.</p>
${renderHealthIssues(issues, Boolean(result.lint))}
</section>
<section id="exports" class="panel card" hidden aria-label="Export routes"><h2>Share the route map</h2><p class="muted">SVG is a rendered vector image. Mermaid and DOT are source formats for documentation and graph tools. Downloads contain all endpoints in this report; CSV follows the current filter.</p>
  <div class="toolbar"><label for="export-format">Format</label><select id="export-format"><option value="svg">SVG image</option><option value="mermaid">Mermaid source</option><option value="dot">Graphviz DOT source</option><option value="markdown">Markdown table</option><option value="json">JSON</option><option value="flat">Flat paths</option><option value="tree">Terminal tree (plain text)</option></select><button id="download">Download</button><button id="copy">Copy source</button></div>
  <details><summary>View export source</summary><pre id="source">${esc(svg)}</pre></details>
</section>
<p id="status" role="status" aria-live="polite"></p>
<noscript><p>This report’s interactive controls require JavaScript. The full route table and health report are shown below.</p><style>.panel[hidden]{display:block!important}nav,#filters{display:none}</style></noscript>
<footer>Source inspection only · Layout chains follow files, not runtime behavior · Import graphs, rewrites, middleware, and inherited rendering configuration are not evaluated.</footer>
</main>
<script id="report-data" type="application/json">${payload}</script>
<script>${reportScript}</script>
</body>
</html>`;
}

// String.raw keeps browser-side regular expressions and newline escapes intact.
const reportScript = String.raw`
"use strict";
const { result, nodes, sources } = JSON.parse(
  document.getElementById("report-data").textContent,
);
const byId = (id) => document.getElementById(id);
const status = (message) => {
  byId("status").textContent = message;
};
let filtered = result.routes;
function showPanel(id) {
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.hidden = panel.id !== id;
  });
  document.querySelectorAll("[data-panel]").forEach((button) => {
    if (button.dataset.panel === id)
      button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  byId("filters").hidden = id === "health" || id === "exports";
}
document
  .querySelectorAll("[data-panel]")
  .forEach((button) =>
    button.addEventListener("click", () => showPanel(button.dataset.panel)),
  );
function selectNode(index) {
  const node = nodes[index];
  if (!node) return;
  const detail = byId("detail");
  detail.replaceChildren();
  const heading = document.createElement("h2");
  heading.textContent = node.path;
  detail.append(heading);
  if (!node.routes.length) {
    const note = document.createElement("p");
    note.textContent =
      "This segment groups child routes and has no endpoint file.";
    detail.append(note);
  }
  node.routes.forEach((route) => {
    const article = document.createElement("article");
    const list = document.createElement("dl");
    const fields = {
      Source: route.file,
      Endpoint:
        route.type + " · " + route.rendering + " · " + route.segmentType,
      "HTTP methods": route.methods && route.methods.join(", "),
      "Runtime (declared)": route.runtime,
      "Dynamic mode (declared)": route.dynamicConfig,
      "Parallel slots": route.parallelSlots && route.parallelSlots.join(", "),
      Interception: route.intercepting,
      "Server actions": route.hasServerActions
        ? "Detected in this file"
        : undefined,
    };
    Object.entries(fields).forEach(([label, value]) => {
      if (!value) return;
      const term = document.createElement("dt");
      term.textContent = label;
      const description = document.createElement("dd");
      description.textContent = value;
      list.append(term, description);
    });
    article.append(list);
    [
      ["Layout chain (outer → inner)", route.layoutChain || []],
      [
        "Convention files in this segment",
        (route.files || []).map((file) => file.relativePath),
      ],
    ].forEach(([label, values]) => {
      const title = document.createElement("h3");
      title.textContent = label;
      title.style.marginTop = "18px";
      const ordered = document.createElement("ol");
      (values.length ? values : ["None"]).forEach((value) => {
        const item = document.createElement("li");
        item.textContent = value;
        ordered.append(item);
      });
      article.append(title, ordered);
    });
    detail.append(article);
  });
  document
    .querySelectorAll("[data-node-index]")
    .forEach((group) =>
      group.setAttribute(
        "aria-pressed",
        String(Number(group.dataset.nodeIndex) === index),
      ),
    );
}
document.querySelectorAll("[data-node-index]").forEach((group) => {
  group.addEventListener("click", () =>
    selectNode(Number(group.dataset.nodeIndex)),
  );
  group.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectNode(Number(group.dataset.nodeIndex));
    }
  });
});
document.querySelectorAll("[data-select-route]").forEach((button) =>
  button.addEventListener("click", () => {
    const route = result.routes[Number(button.dataset.selectRoute)];
    const index = nodes.findIndex((node) => node.path === route.path);
    selectNode(index);
    showPanel("map");
    document.querySelector('[data-node-index="' + index + '"]').focus();
    byId("detail").scrollIntoView({ block: "nearest" });
  }),
);
function applyFilter() {
  const query = byId("search").value.trim().toLowerCase();
  const kind = byId("kind").value;
  const matches = new Set();
  filtered = result.routes.filter((route, index) => {
    const text = [
      route.path,
      route.file,
      ...(route.methods || []),
      ...(route.layoutChain || []),
    ]
      .join(" ")
      .toLowerCase();
    const category =
      kind === "all" ||
      route.type === kind ||
      route.rendering === kind ||
      (kind === "dynamic" && route.segmentType !== "static") ||
      (kind === "parallel" &&
        route.parallelSlots &&
        route.parallelSlots.length) ||
      (kind === "intercepted" && route.intercepting);
    if (category && text.includes(query)) {
      matches.add(index);
      return true;
    }
    return false;
  });
  document.querySelectorAll("[data-route-index]").forEach((row) => {
    row.hidden = !matches.has(Number(row.dataset.routeIndex));
  });
  const visiblePaths = new Set(["/"]);
  filtered.forEach((route) => {
    const segments = route.path.split("/").filter(Boolean);
    for (let depth = 1; depth <= segments.length; depth++)
      visiblePaths.add("/" + segments.slice(0, depth).join("/"));
  });
  document
    .querySelectorAll("[data-node-index]")
    .forEach((group) =>
      group.classList.toggle(
        "dim",
        !visiblePaths.has(nodes[Number(group.dataset.nodeIndex)].path),
      ),
    );
  byId("match-count").textContent =
    filtered.length + " of " + result.routes.length + " endpoints";
  byId("no-matches").hidden = filtered.length > 0;
}
byId("search").addEventListener("input", applyFilter);
byId("kind").addEventListener("change", applyFilter);
function download(text, filename, mime) {
  const url = URL.createObjectURL(
    new Blob([text], { type: mime + ";charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status("Downloaded " + filename);
}
byId("export-format").addEventListener("change", () => {
  byId("source").textContent = sources[byId("export-format").value].text;
});
byId("download").addEventListener("click", () => {
  const source = sources[byId("export-format").value];
  download(source.text, "routes." + source.extension, source.mime);
});
byId("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(
      sources[byId("export-format").value].text,
    );
    status("Source copied.");
  } catch {
    byId("source").parentElement.open = true;
    status("Clipboard unavailable. Select the source text or use Download.");
  }
});
byId("csv").addEventListener("click", () => {
  const cell = (value) => {
    let text = String(value || "");
    if (/^[\s]*[=+@\-\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const rows = [
    ["Path", "Type", "Rendering", "Segment", "Methods", "File"],
    ...filtered.map((route) => [
      route.path,
      route.type,
      route.rendering,
      route.segmentType,
      (route.methods || []).join(", "),
      route.file,
    ]),
  ];
  download(
    rows.map((row) => row.map(cell).join(",")).join("\r\n"),
    "routes.csv",
    "text/csv",
  );
});
applyFilter();
`;

export class HtmlRenderer implements OutputRenderer {
  render(result: AnalysisResult): string {
    return renderHtml(result);
  }
}

function renderRouteRow(route: RouteEntry, index: number): string {
  const slots = (route.parallelSlots ?? [])
    .map((slot) => '<span class="badge">' + esc(slot) + "</span>")
    .join("");
  return `<tr data-route-index="${index}"><td><button data-select-route="${index}">${esc(route.path)}</button></td><td><span class="badge ${route.type}">${route.type}</span></td><td><span class="badge ${route.rendering}">${route.rendering}</span></td><td>${esc(route.methods?.join(", ") || route.segmentType)}${slots}${route.intercepting ? '<span class="badge">intercepted</span>' : ""}</td><td><code>${esc(route.file)}</code></td></tr>`;
}

function renderHealthIssues(issues: LintIssue[], hasLint: boolean): string {
  if (issues.length) return issues.map(renderHealthIssue).join("");
  const message = hasLint
    ? "No routing issues found by the available static checks."
    : "Run route linting to populate this section.";
  return "<p>" + message + "</p>";
}

function renderHealthIssue(issue: LintIssue): string {
  const location = issue.filePath ?? issue.routePath;
  const locationMarkup = location
    ? "<p><code>" + esc(location) + "</code></p>"
    : "";
  const hint = issue.hint ? '<p class="muted">' + esc(issue.hint) + "</p>" : "";
  return `<article class="issue ${issue.severity}"><h3>${esc(issue.rule)} <span class="badge">${issue.severity}</span></h3><p>${esc(issue.message)}</p>${locationMarkup}${hint}</article>`;
}

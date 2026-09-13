import pc from "picocolors";

import { AnalysisResult } from "../types/index.js";

export function renderTree(result: AnalysisResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(pc.bold("next-route-graph"));
  lines.push("");

  lines.push(`${pc.dim("Project    ")}${result.project}`);
  lines.push(`${pc.dim("Router     ")}${result.router}`);
  lines.push(`${pc.dim("Root       ")}${result.root}`);
  lines.push("");

  lines.push(pc.bold("Routes"));
  lines.push(pc.dim("────────────────────────────────────────"));

  const routes = result.routes;

  routes.forEach((route, index) => {
    const isLast = index === routes.length - 1;
    const prefix = isLast ? "└── " : "├── ";
    const pathStr = route.path.padEnd(28, " ");
    const fileStr = pc.dim(route.file.split("/").pop() || "");

    let badge = "";

    if (route.rendering === "client") {
      const clientBadge = pc.cyan("[client]");
      badge = `  ${clientBadge}`;
    } else if (route.segmentType !== "static") {
      const segmentBadge = `[${route.segmentType}]`;
      badge = `  ${pc.yellow(segmentBadge)}`;
    }

    const routeLine = `${pc.dim(prefix)}${pc.bold(pathStr)} ${fileStr}${badge}`;
    lines.push(routeLine);
  });

  if (routes.length === 0) {
    lines.push(pc.dim("  (No routes found)"));
  }

  lines.push("");
  lines.push(pc.bold("Summary"));
  lines.push(pc.dim("────────────────────────────────────────"));

  lines.push(`${pc.dim("Routes       ")}${result.summary.routes}`);
  lines.push(`${pc.dim("Dynamic      ")}${result.summary.dynamic}`);
  lines.push(`${pc.dim("Client       ")}${result.summary.client}`);
  lines.push(`${pc.dim("Server       ")}${result.summary.server}`);
  lines.push(`${pc.dim("Layouts      ")}${result.summary.layouts}`);
  lines.push(`${pc.dim("Loading      ")}${result.summary.loading}`);
  lines.push(`${pc.dim("Errors       ")}${result.summary.errors}`);

  lines.push("");
  lines.push(pc.green(`✓ Analysis completed in ${result.executionTimeMs}ms`));
  lines.push("");

  return lines.join("\n");
}

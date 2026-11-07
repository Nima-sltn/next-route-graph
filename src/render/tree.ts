import pc from "picocolors";
import { AnalysisResult } from "../types/index.js";
import type { OutputRenderer } from "./renderer.interface.js";

/**
 * Formats the route graph and project summary as a styled terminal tree.
 *
 * @param result - Analysis result data
 * @returns Styled terminal string representation
 */
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
  const maxPathLen = Math.max(
    28,
    ...routes.map((r) => r.path.length),
  );

  routes.forEach((route, index) => {
    const isLast = index === routes.length - 1;
    const prefix = isLast ? "└── " : "├── ";
    const pathStr = route.path.padEnd(maxPathLen, " ");
    const fileStr = pc.dim(route.file.split("/").pop() || "");

    const badges: string[] = [];

    // HTTP Methods for API handlers
    if (route.methods && route.methods.length > 0) {
      badges.push(pc.magenta(`[${route.methods.join(", ")}]`));
    }

    // Rendering or Segment Type
    if (route.rendering === "client") {
      badges.push(pc.cyan("[client]"));
    } else if (route.segmentType !== "static") {
      badges.push(pc.yellow(`[${route.segmentType}]`));
    }

    // Parallel route slots
    if (route.parallelSlots && route.parallelSlots.length > 0) {
      badges.push(pc.blue(`[${route.parallelSlots.join(", ")}]`));
    }

    // Intercepting route indicator
    if (route.intercepting) {
      badges.push(pc.magenta(`[${route.intercepting}]`));
    }

    const badgeStr = badges.length > 0 ? `  ${badges.join(" ")}` : "";
    const routeLine = `${pc.dim(prefix)}${pc.bold(pathStr)} ${fileStr}${badgeStr}`;
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

  if (result.summary.apiRoutes && result.summary.apiRoutes > 0) {
    lines.push(`${pc.dim("API Routes   ")}${result.summary.apiRoutes}`);
  }
  if (result.summary.parallelRoutes && result.summary.parallelRoutes > 0) {
    lines.push(`${pc.dim("Parallel     ")}${result.summary.parallelRoutes}`);
  }
  if (result.summary.interceptedRoutes && result.summary.interceptedRoutes > 0) {
    lines.push(`${pc.dim("Intercepted  ")}${result.summary.interceptedRoutes}`);
  }

  // Display lint issues if present
  if (result.lint && result.lint.issues.length > 0) {
    lines.push("");
    lines.push(pc.bold("Route Health"));
    lines.push(pc.dim("────────────────────────────────────────"));

    for (const issue of result.lint.issues) {
      const tag =
        issue.severity === "error"
          ? pc.red("✖ [error]")
          : issue.severity === "warning"
            ? pc.yellow("▲ [warning]")
            : pc.blue("ℹ [info]");
      lines.push(`${tag} ${pc.bold(issue.rule)}: ${issue.message}`);
      if (issue.hint) {
        lines.push(`  ${pc.dim("hint: " + issue.hint)}`);
      }
    }
  }

  lines.push("");
  lines.push(pc.green(`✓ Analysis completed in ${result.executionTimeMs}ms`));
  lines.push("");

  return lines.join("\n");
}

export class TreeRenderer implements OutputRenderer {
  render(result: AnalysisResult): string {
    return renderTree(result);
  }
}

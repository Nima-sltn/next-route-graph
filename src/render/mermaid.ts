import { AnalysisResult, RouteEntry } from "../types/index.js";
import type { OutputRenderer } from "./renderer.interface.js";
import { buildRouteGraph } from "./graph.js";

/**
 * Creates a clean Mermaid node label for a route.
 * Replaces square brackets with HTML character entities to avoid breaking Mermaid node shape syntax.
 */
function createNodeLabel(
  route: Pick<RouteEntry, "path" | "rendering" | "segmentType" | "methods">,
): string {
  const parts: string[] = [route.path];

  if (route.methods && route.methods.length > 0) {
    parts.push(`(${route.methods.join("/")})`);
  } else if (route.rendering === "client") {
    parts.push("(client)");
  } else if (route.segmentType !== "static") {
    parts.push(`(${route.segmentType})`);
  }

  // Escape square brackets and quotation marks for safe Mermaid rendering
  return parts
    .join(" ")
    .replace(/&/g, "#38;")
    .replace(/</g, "#60;")
    .replace(/>/g, "#62;")
    .replace(/\r?\n/g, " ")
    .replace(/\[/g, "#91;")
    .replace(/\]/g, "#93;")
    .replace(/"/g, "#quot;");
}

/**
 * Generates a Mermaid flowchart diagram representing the App Router routes.
 *
 * @param result - AnalysisResult
 * @returns Mermaid flowchart markdown block
 */
export function renderMermaid(result: AnalysisResult): string {
  const lines: string[] = [];

  lines.push("```mermaid");
  lines.push("flowchart TD");
  lines.push(
    `  %% Next.js Route Graph for ${result.project.replace(/[\r\n]/g, " ")}`,
  );

  const routes = result.routes;

  if (routes.length === 0) {
    lines.push('  empty["(No routes discovered)"]');
    lines.push("```");
    return lines.join("\n");
  }

  for (const node of buildRouteGraph(routes)) {
    const label = node.routes.length
      ? node.routes.map(createNodeLabel).join(" | ")
      : createNodeLabel({
          path: node.path,
          rendering: "server",
          segmentType: "static",
        });
    lines.push(`  ${node.id}["${label}"]`);
    if (node.parentId) lines.push(`  ${node.parentId} --> ${node.id}`);
  }

  lines.push("```");
  return lines.join("\n");
}

export class MermaidRenderer implements OutputRenderer {
  render(result: AnalysisResult): string {
    return renderMermaid(result);
  }
}

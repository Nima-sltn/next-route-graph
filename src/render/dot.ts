import { AnalysisResult } from "../types/index.js";
import { buildRouteGraph } from "./graph.js";
import type { OutputRenderer } from "./renderer.interface.js";

/**
 * Escapes backslashes and double quotes for Graphviz DOT format.
 */
function escapeDot(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

/**
 * Generates a Graphviz DOT representation of the routes.
 *
 * @param result - AnalysisResult
 * @returns Graphviz DOT diagram string
 */
export function renderDot(result: AnalysisResult): string {
  const lines: string[] = [];
  const graphName = `${escapeDot(result.project)}Routes`;

  lines.push(`digraph "${graphName}" {`);
  lines.push("  rankdir=TB;");
  lines.push(
    '  node [shape=box, style="rounded,filled", fontname="Helvetica", fillcolor="#f8fafc", color="#cbd5e1"];',
  );
  lines.push('  edge [color="#94a3b8"];');
  lines.push("");

  const routes = result.routes;

  if (routes.length === 0) {
    lines.push('  empty [label="(No routes discovered)"];');
    lines.push("}");
    return lines.join("\n");
  }

  const nodes = buildRouteGraph(routes);
  nodes.forEach((node) => {
    const route = node.routes[0];
    const id = node.id;

    const labels: string[] = [node.path];
    for (const endpoint of node.routes) {
      labels.push(endpoint.file);
      if (endpoint.methods?.length)
        labels.push(`[${endpoint.methods.join(", ")}]`);
      else if (endpoint.rendering === "client") labels.push("[client]");
      else if (endpoint.segmentType !== "static")
        labels.push(`[${endpoint.segmentType}]`);
    }

    const labelText = labels.map(escapeDot).join("\\n");
    let color = 'fillcolor="#f8fafc", color="#64748b"';
    if (route?.rendering === "client")
      color = 'fillcolor="#ecfeff", color="#06b6d4"';
    else if (route?.type === "route")
      color = 'fillcolor="#fdf4ff", color="#c026d3"';

    lines.push(`  ${id} [label="${labelText}", ${color}];`);
  });

  lines.push("");

  nodes.forEach((node) => {
    if (node.parentId) lines.push(`  ${node.parentId} -> ${node.id};`);
  });

  lines.push("}");
  return lines.join("\n");
}

export class DotRenderer implements OutputRenderer {
  render(result: AnalysisResult): string {
    return renderDot(result);
  }
}

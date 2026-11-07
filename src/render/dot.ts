import { AnalysisResult, RouteEntry } from "../types/index.js";
import type { OutputRenderer } from "./renderer.interface.js";

/**
 * Escapes backslashes and double quotes for Graphviz DOT format.
 */
function escapeDot(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Sanitizes project name to form a valid Graphviz identifier.
 */
function sanitizeIdentifier(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

/**
 * Finds the nearest parent route in the route list.
 */
function findParentRoute(
  route: RouteEntry,
  allRoutes: RouteEntry[],
): RouteEntry | null {
  if (route.path === "/") return null;

  const parts = route.path.split("/").filter(Boolean);
  while (parts.length > 1) {
    parts.pop();
    const parentPath = "/" + parts.join("/");
    const match = allRoutes.find((r) => r.path === parentPath);
    if (match) return match;
  }

  const rootRoute = allRoutes.find((r) => r.path === "/");
  return rootRoute && rootRoute !== route ? rootRoute : null;
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

  const idMap = new Map<RouteEntry, string>();

  routes.forEach((route, index) => {
    const id = `node_${index}`;
    idMap.set(route, id);

    const labels: string[] = [route.path];
    if (route.methods && route.methods.length > 0) {
      labels.push(`[${route.methods.join(", ")}]`);
    } else if (route.rendering === "client") {
      labels.push("[client]");
    } else if (route.segmentType !== "static") {
      labels.push(`[${route.segmentType}]`);
    }

    const labelText = escapeDot(labels.join("\\n"));
    const color =
      route.rendering === "client"
        ? 'fillcolor="#ecfeff", color="#06b6d4"'
        : route.type === "route"
          ? 'fillcolor="#fdf4ff", color="#c026d3"'
          : 'fillcolor="#f8fafc", color="#64748b"';

    lines.push(`  ${id} [label="${labelText}", ${color}];`);
  });

  lines.push("");

  routes.forEach((route) => {
    const currentId = idMap.get(route)!;
    const parent = findParentRoute(route, routes);
    if (parent) {
      const parentId = idMap.get(parent)!;
      lines.push(`  ${parentId} -> ${currentId};`);
    }
  });

  lines.push("}");
  return lines.join("\n");
}

export class DotRenderer implements OutputRenderer {
  render(result: AnalysisResult): string {
    return renderDot(result);
  }
}

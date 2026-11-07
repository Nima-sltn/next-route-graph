import { AnalysisResult, RouteEntry } from "../types/index.js";
import type { OutputRenderer } from "./renderer.interface.js";

/**
 * Sanitizes a route path or segment into a valid Mermaid node identifier.
 */
function toNodeId(pathStr: string, index: number): string {
  if (pathStr === "/") return "root";
  return `route_${index}_` + pathStr.replace(/[^a-zA-Z0-9_]/g, "_");
}

/**
 * Creates a clean Mermaid node label for a route.
 * Replaces square brackets with HTML character entities to avoid breaking Mermaid node shape syntax.
 */
function createNodeLabel(route: RouteEntry): string {
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
    .replace(/\[/g, "#91;")
    .replace(/\]/g, "#93;")
    .replace(/"/g, '\\"');
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

  // Fallback to root route if it exists
  const rootRoute = allRoutes.find((r) => r.path === "/");
  return rootRoute && rootRoute !== route ? rootRoute : null;
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
  lines.push(`  %% Next.js Route Graph for ${result.project}`);

  const routes = result.routes;

  if (routes.length === 0) {
    lines.push('  empty["(No routes discovered)"]');
    lines.push("```");
    return lines.join("\n");
  }

  const idMap = new Map<RouteEntry, string>();

  routes.forEach((route, index) => {
    const id = toNodeId(route.path, index);
    idMap.set(route, id);
    const label = createNodeLabel(route);
    lines.push(`  ${id}["${label}"]`);
  });

  routes.forEach((route) => {
    const currentId = idMap.get(route)!;
    const parent = findParentRoute(route, routes);

    if (parent) {
      const parentId = idMap.get(parent)!;
      lines.push(`  ${parentId} --> ${currentId}`);
    }
  });

  lines.push("```");
  return lines.join("\n");
}

export class MermaidRenderer implements OutputRenderer {
  render(result: AnalysisResult): string {
    return renderMermaid(result);
  }
}

import type { RouteEntry } from "../types/index.js";

export interface RouteGraphNode {
  id: string;
  path: string;
  depth: number;
  parentId?: string;
  routes: RouteEntry[];
}

/** URL hierarchy, including non-endpoint segments. Duplicate URLs retain every source. */
export function buildRouteGraph(routes: RouteEntry[]): RouteGraphNode[] {
  if (routes.length === 0) return [];
  const nodes = new Map<string, RouteGraphNode>();
  nodes.set("/", { id: "root", path: "/", depth: 0, routes: [] });
  for (const route of routes) {
    let parent = nodes.get("/")!;
    const segments = route.path.split("/").filter(Boolean);
    for (let depth = 1; depth <= segments.length; depth++) {
      const path = "/" + segments.slice(0, depth).join("/");
      let node = nodes.get(path);
      if (!node) {
        node = {
          id: `segment_${nodes.size}`,
          path,
          depth,
          parentId: parent.id,
          routes: [],
        };
        nodes.set(path, node);
      }
      parent = node;
    }
    parent.routes.push(route);
  }
  // A preorder keeps connecting lines clear even when SDK input is unsorted.
  const children = new Map<string, RouteGraphNode[]>();
  for (const node of nodes.values()) {
    const siblings = children.get(node.parentId ?? "") ?? [];
    siblings.push(node);
    children.set(node.parentId ?? "", siblings);
  }
  const ordered: RouteGraphNode[] = [];
  const visit = (parentId: string) => {
    const siblings = children.get(parentId) ?? [];
    siblings.sort((a, b) => {
      if (a.path === b.path) return 0;
      return a.path < b.path ? -1 : 1;
    });
    for (const node of siblings) {
      ordered.push(node);
      visit(node.id);
    }
  };
  visit("");
  return ordered;
}

/** Escape text and attributes in HTML and XML, including untrusted source filenames. */
export function escapeMarkup(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .split("")
    .filter((char) => char.charCodeAt(0) >= 32 || "\t\n\r".includes(char))
    .join("");
}

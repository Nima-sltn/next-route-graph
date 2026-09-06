import { RouteEntry } from "../types/index.js";

export function renderFlat(routes: RouteEntry[]): string {
  return routes.map((r) => r.path).join("\n");
}

import { AnalysisResult, RouteEntry } from "../types/index.js";
import type { OutputRenderer } from "./renderer.interface.js";

/**
 * Formats routes as a flat list of URL paths.
 *
 * @param input - Array of route entries or full AnalysisResult
 * @returns Newline-separated route paths
 */
export function renderFlat(input: RouteEntry[] | AnalysisResult): string {
  const routes = Array.isArray(input) ? input : input.routes;
  return routes.map((route) => route.path).join("\n");
}

export class FlatRenderer implements OutputRenderer {
  render(result: AnalysisResult): string {
    return renderFlat(result);
  }
}

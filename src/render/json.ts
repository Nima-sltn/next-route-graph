import { AnalysisResult } from "../types/index.js";
import type { OutputRenderer } from "./renderer.interface.js";

/**
 * Formats analysis result as structured, indented JSON.
 *
 * @param result - AnalysisResult object
 * @returns Serialized JSON string
 */
export function renderJson(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}

export class JsonRenderer implements OutputRenderer {
  render(result: AnalysisResult): string {
    return renderJson(result);
  }
}

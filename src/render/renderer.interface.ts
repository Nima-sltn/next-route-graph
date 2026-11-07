import { AnalysisResult } from "../types/index.js";

/**
 * Common interface for all output formatters (Strategy Pattern)
 */
export interface OutputRenderer {
  render(result: AnalysisResult): string;
}

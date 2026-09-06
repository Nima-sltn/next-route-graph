import { AnalysisResult } from "../types/index.js";

export function renderJson(result: AnalysisResult): string {
  const output = {
    project: result.project,
    router: "app",
    root: result.root,
    routes: result.routes.map((r) => ({
      path: r.path,
      type: r.type,
      file: r.file,
      segmentType: r.segmentType,
      rendering: r.rendering,
    })),
    summary: result.summary,
  };

  return JSON.stringify(output, null, 2);
}

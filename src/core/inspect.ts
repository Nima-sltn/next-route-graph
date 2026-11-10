import { analyzeRoutes, getRoutesSummary } from "./analyzer.js";
import { detectAppRouter } from "./detector.js";
import { scanAppDir } from "./scanner.js";
import type { AnalysisResult } from "../types/index.js";

/** Scan a project without starting Next.js or executing project code. */
export async function inspectProject(
  projectPath = ".",
): Promise<AnalysisResult> {
  const start = performance.now();
  const { appDir, displayRoot } = detectAppRouter(projectPath);
  const files = await scanAppDir(appDir);
  const result = await analyzeRoutes(files, projectPath, displayRoot);
  return { ...result, executionTimeMs: Math.round(performance.now() - start) };
}

/** Filter endpoint counts; convention-file totals and diagnostics remain project-wide. */
export function filterRoutes(
  result: AnalysisResult,
  query: string,
): AnalysisResult {
  const search = query.toLowerCase();
  const routes = result.routes.filter((route) =>
    [route.path, route.file, ...(route.methods ?? [])].some((value) =>
      value.toLowerCase().includes(search),
    ),
  );
  return {
    ...result,
    routes,
    summary: getRoutesSummary(
      routes,
      result.summary.layouts,
      result.summary.loading,
      result.summary.errors,
    ),
  };
}

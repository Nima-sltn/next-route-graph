import path from "node:path";
import {
  AnalysisResult,
  DiscoveredFile,
  RouteEntry,
  RouteFile,
  SummaryStats,
} from "../types/index.js";
import {
  detectRenderingType,
  getSegmentType,
  parseRoutePath,
  parseSpecialFileType,
} from "./parser.js";

export async function analyzeRoutes(
  files: DiscoveredFile[],
  projectPath: string,
  displayRoot: string,
): Promise<AnalysisResult> {
  const startTime = Date.now();
  const dirMap = new Map<string, DiscoveredFile[]>();

  for (const file of files) {
    const dir = path.dirname(file.relativePath).replace(/\\/g, "/");
    if (!dirMap.has(dir)) {
      dirMap.set(dir, []);
    }
    dirMap.get(dir)!.push(file);
  }

  const routesMap = new Map<string, RouteEntry>();
  let totalLayouts = 0;
  let totalLoading = 0;
  let totalErrors = 0;

  for (const [dir, dirFiles] of dirMap.entries()) {
    const routeFiles: RouteFile[] = [];

    for (const file of dirFiles) {
      const specialType = parseSpecialFileType(file.fileName);
      if (specialType) {
        const rendering = await detectRenderingType(file.fullPath);
        routeFiles.push({
          type: specialType,
          fileName: file.fileName,
          relativePath: file.relativePath,
          rendering,
        });

        if (specialType === "layout") totalLayouts++;
        if (specialType === "loading") totalLoading++;
        if (specialType === "error") totalErrors++;
      }
    }

    const pageFile = routeFiles.find((f) => f.type === "page");
    const routeHandlerFile = routeFiles.find((f) => f.type === "route");

    if (pageFile || routeHandlerFile) {
      const primaryFile = (pageFile || routeHandlerFile)!;
      const computedPath = parseRoutePath(primaryFile.relativePath);

      routesMap.set(computedPath, {
        path: computedPath,
        type: pageFile ? "page" : "route",
        file: primaryFile.relativePath,
        segmentType: getSegmentType(computedPath),
        rendering: primaryFile.rendering,
        files: routeFiles,
      });
    }
  }

  const routes = Array.from(routesMap.values()).sort((a, b) =>
    a.path.localeCompare(b.path),
  );

  let dynamicCount = 0;
  let clientCount = 0;
  let serverCount = 0;

  for (const route of routes) {
    if (route.segmentType !== "static") {
      dynamicCount++;
    }
    if (route.rendering === "client") {
      clientCount++;
    } else {
      serverCount++;
    }
  }

  const projectName = path.basename(path.resolve(projectPath));
  const summary: SummaryStats = {
    routes: routes.length,
    dynamic: dynamicCount,
    client: clientCount,
    server: serverCount,
    layouts: totalLayouts,
    loading: totalLoading,
    errors: totalErrors,
  };

  return {
    project: projectName,
    router: "App Router",
    root: displayRoot,
    routes,
    summary,
    executionTimeMs: Date.now() - startTime,
  };
}

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

function groupFilesByDirectory(
  files: DiscoveredFile[],
): Map<string, DiscoveredFile[]> {
  const dirMap = new Map<string, DiscoveredFile[]>();

  for (const file of files) {
    const dir = path.dirname(file.relativePath).replace(/\\/g, "/");

    const dirFiles = dirMap.get(dir);

    if (dirFiles) {
      dirFiles.push(file);
    } else {
      dirMap.set(dir, [file]);
    }
  }

  return dirMap;
}

async function processDirectoryFiles(dirFiles: DiscoveredFile[]): Promise<{
  routeFiles: RouteFile[];
  layouts: number;
  loading: number;
  errors: number;
}> {
  const routeFiles: RouteFile[] = [];
  let layouts = 0;
  let loading = 0;
  let errors = 0;

  for (const file of dirFiles) {
    const specialType = parseSpecialFileType(file.fileName);

    if (!specialType) {
      continue;
    }

    const rendering = await detectRenderingType(file.fullPath);

    routeFiles.push({
      type: specialType,
      fileName: file.fileName,
      relativePath: file.relativePath,
      rendering,
    });

    if (specialType === "layout") {
      layouts++;
    }

    if (specialType === "loading") {
      loading++;
    }

    if (specialType === "error") {
      errors++;
    }
  }

  return {
    routeFiles,
    layouts,
    loading,
    errors,
  };
}

function createRouteEntry(routeFiles: RouteFile[]): RouteEntry | null {
  const pageFile = routeFiles.find((file) => file.type === "page");
  const routeHandlerFile = routeFiles.find((file) => file.type === "route");
  const primaryFile = pageFile ?? routeHandlerFile;

  if (!primaryFile) {
    return null;
  }

  const computedPath = parseRoutePath(primaryFile.relativePath);

  return {
    path: computedPath,
    type: pageFile ? "page" : "route",
    file: primaryFile.relativePath,
    segmentType: getSegmentType(computedPath),
    rendering: primaryFile.rendering,
    files: routeFiles,
  };
}

async function analyzeDirectories(
  dirMap: Map<string, DiscoveredFile[]>,
): Promise<{
  routesMap: Map<string, RouteEntry>;
  totalLayouts: number;
  totalLoading: number;
  totalErrors: number;
}> {
  const routesMap = new Map<string, RouteEntry>();
  let totalLayouts = 0;
  let totalLoading = 0;
  let totalErrors = 0;

  for (const dirFiles of dirMap.values()) {
    const result = await processDirectoryFiles(dirFiles);

    totalLayouts += result.layouts;
    totalLoading += result.loading;
    totalErrors += result.errors;

    const route = createRouteEntry(result.routeFiles);

    if (route) {
      routesMap.set(route.path, route);
    }
  }

  return {
    routesMap,
    totalLayouts,
    totalLoading,
    totalErrors,
  };
}

function getRoutesSummary(
  routes: RouteEntry[],
  layouts: number,
  loading: number,
  errors: number,
): SummaryStats {
  let dynamic = 0;
  let client = 0;

  for (const route of routes) {
    dynamic += route.segmentType !== "static" ? 1 : 0;
    client += route.rendering === "client" ? 1 : 0;
  }

  return {
    routes: routes.length,
    dynamic,
    client,
    server: routes.length - client,
    layouts,
    loading,
    errors,
  };
}

export async function analyzeRoutes(
  files: DiscoveredFile[],
  projectPath: string,
  displayRoot: string,
): Promise<AnalysisResult> {
  const startTime = Date.now();
  const dirMap = groupFilesByDirectory(files);

  const { routesMap, totalLayouts, totalLoading, totalErrors } =
    await analyzeDirectories(dirMap);

  const routes = Array.from(routesMap.values()).sort((a, b) =>
    a.path.localeCompare(b.path),
  );

  const summary = getRoutesSummary(
    routes,
    totalLayouts,
    totalLoading,
    totalErrors,
  );

  return {
    project: path.basename(path.resolve(projectPath)),
    router: "App Router",
    root: displayRoot,
    routes,
    summary,
    executionTimeMs: Date.now() - startTime,
  };
}

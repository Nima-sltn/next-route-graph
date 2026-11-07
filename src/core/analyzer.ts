import fs from "node:fs/promises";
import path from "node:path";

import {
  AnalysisResult,
  DiscoveredFile,
  RouteEntry,
  RouteFile,
  SummaryStats,
} from "../types/index.js";
import { lintRoutes } from "./linter.js";
import {
  detectHttpMethods,
  detectRenderingType,
  detectRouteConfig,
  detectServerActions,
  extractRouteMetadata,
  getSegmentType,
  parseRoutePath,
  parseSpecialFileType,
} from "./parser.js";

/**
 * Groups discovered files by their directory relative to the App Router root.
 */
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

/**
 * Processes all special convention files in a single directory.
 * Performs a single disk read per file to extract rendering directives,
 * HTTP methods, server actions, and segment configs.
 */
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

    let content = "";
    try {
      content = await fs.readFile(file.fullPath, "utf-8");
    } catch {}

    const rendering = await detectRenderingType(content);
    const methods =
      specialType === "route" ? detectHttpMethods(content) : undefined;
    const hasServerActions = detectServerActions(content);
    const config = detectRouteConfig(content);

    routeFiles.push({
      type: specialType,
      fileName: file.fileName,
      relativePath: file.relativePath,
      rendering,
      methods,
      hasServerActions,
      runtime: config.runtime,
      dynamicConfig: config.dynamicConfig,
    });

    if (specialType === "layout") {
      layouts++;
    }

    if (specialType === "loading") {
      loading++;
    }

    if (specialType === "error" || specialType === "global-error") {
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

/**
 * Finds all layout files in parent directories that wrap a specific directory.
 */
function findLayoutChain(
  targetDir: string,
  allFiles: DiscoveredFile[],
): string[] {
  const layoutChain: string[] = [];
  const normalizedTarget = targetDir === "." ? "" : targetDir;
  const segments = normalizedTarget ? normalizedTarget.split("/") : [];

  // Check from root downwards
  for (let i = 0; i <= segments.length; i++) {
    const currentPath = segments.slice(0, i).join("/");
    const checkDir = currentPath === "" ? "." : currentPath;

    const layout = allFiles.find((f) => {
      const dir = path.dirname(f.relativePath).replace(/\\/g, "/");
      const isDir = dir === checkDir || (checkDir === "." && dir === "");
      return isDir && parseSpecialFileType(f.fileName) === "layout";
    });

    if (layout) {
      layoutChain.push(layout.relativePath);
    }
  }

  return layoutChain;
}

/**
 * Creates a RouteEntry from the convention files in a directory.
 * Uses cached metadata from the in-memory RouteFile to eliminate duplicate disk reads.
 */
function createRouteEntry(
  routeFiles: RouteFile[],
  allFiles: DiscoveredFile[],
): RouteEntry | null {
  const pageFile = routeFiles.find((file) => file.type === "page");
  const routeHandlerFile = routeFiles.find((file) => file.type === "route");
  const primaryFile = pageFile ?? routeHandlerFile;

  if (!primaryFile) {
    return null;
  }

  const computedPath = parseRoutePath(primaryFile.relativePath);
  const metadata = extractRouteMetadata(primaryFile.relativePath);
  const dir = path.dirname(primaryFile.relativePath).replace(/\\/g, "/");
  const layoutChain = findLayoutChain(dir, allFiles);

  return {
    path: computedPath,
    type: pageFile ? "page" : "route",
    file: primaryFile.relativePath,
    segmentType: getSegmentType(computedPath),
    rendering: primaryFile.rendering,
    methods: primaryFile.methods,
    hasServerActions: primaryFile.hasServerActions,
    runtime: primaryFile.runtime,
    dynamicConfig: primaryFile.dynamicConfig,
    files: routeFiles,
    parallelSlots: metadata.slots.length > 0 ? metadata.slots : undefined,
    intercepting: metadata.intercepting,
    layoutChain: layoutChain.length > 0 ? layoutChain : undefined,
  };
}

/**
 * Aggregates summary statistics for the analyzed routes and convention files.
 */
function getRoutesSummary(
  routes: RouteEntry[],
  layouts: number,
  loading: number,
  errors: number,
): SummaryStats {
  let dynamic = 0;
  let client = 0;
  let apiRoutes = 0;
  let parallelRoutes = 0;
  let interceptedRoutes = 0;

  for (const route of routes) {
    dynamic += route.segmentType !== "static" ? 1 : 0;
    client += route.rendering === "client" ? 1 : 0;
    apiRoutes += route.type === "route" ? 1 : 0;
    parallelRoutes +=
      route.parallelSlots && route.parallelSlots.length > 0 ? 1 : 0;
    interceptedRoutes += route.intercepting ? 1 : 0;
  }

  return {
    routes: routes.length,
    dynamic,
    client,
    server: routes.length - client,
    layouts,
    loading,
    errors,
    apiRoutes,
    parallelRoutes,
    interceptedRoutes,
  };
}

/**
 * Analyzes discovered files in a Next.js App Router to construct route entries,
 * evaluate rendering types, HTTP methods, layouts, and linter rules.
 *
 * @param files - All discovered files within the App Router directory
 * @param projectPath - Base directory path of the project
 * @param displayRoot - Display name of the App Router root ('app' or 'src/app')
 * @returns Fully populated AnalysisResult with route metadata and lint report
 */
export async function analyzeRoutes(
  files: DiscoveredFile[],
  projectPath: string,
  displayRoot: string,
): Promise<AnalysisResult> {
  const startTime = Date.now();
  const dirMap = groupFilesByDirectory(files);

  const discoveredRoutes: RouteEntry[] = [];
  let totalLayouts = 0;
  let totalLoading = 0;
  let totalErrors = 0;

  for (const dirFiles of dirMap.values()) {
    const result = await processDirectoryFiles(dirFiles);

    totalLayouts += result.layouts;
    totalLoading += result.loading;
    totalErrors += result.errors;

    const route = createRouteEntry(result.routeFiles, files);
    if (route) {
      discoveredRoutes.push(route);
    }
  }

  // Sort routes deterministically by URL path, then by file path for duplicate paths
  const routes = discoveredRoutes.sort((a, b) => {
    const cmp = a.path.localeCompare(b.path);
    return cmp !== 0 ? cmp : a.file.localeCompare(b.file);
  });

  const summary = getRoutesSummary(
    routes,
    totalLayouts,
    totalLoading,
    totalErrors,
  );

  const lint = lintRoutes(routes, files);

  return {
    project: path.basename(path.resolve(projectPath)),
    router: "App Router",
    root: displayRoot,
    routes,
    summary,
    lint,
    executionTimeMs: Date.now() - startTime,
  };
}

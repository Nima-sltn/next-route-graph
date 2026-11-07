import path from "node:path";
import {
  DiscoveredFile,
  LintIssue,
  LintResult,
  RouteEntry,
} from "../types/index.js";

/**
 * Normalizes dynamic segments (e.g. [id], [slug], [...catch]) to a wildcard token
 * to detect overlapping routing patterns.
 */
function createPatternKey(routePath: string): string {
  const segments = routePath.split("/").filter(Boolean);
  return segments
    .map((seg) => {
      if (seg.startsWith("[[...") && seg.endsWith("]]")) return ":optCatchAll";
      if (seg.startsWith("[...") && seg.endsWith("]")) return ":catchAll";
      if (seg.startsWith("[") && seg.endsWith("]")) return ":dynamic";
      return seg.toLowerCase();
    })
    .join("/");
}

/**
 * Validates Next.js App Router routes and file structures against best practices
 * and official framework rules.
 *
 * @param routes - Array of all analyzed route entries
 * @param files - All discovered files in the App Router directory
 * @returns LintResult containing discovered errors, warnings, and info diagnostics
 */
export function lintRoutes(
  routes: RouteEntry[],
  files: DiscoveredFile[],
): LintResult {
  const issues: LintIssue[] = [];

  // Group files by relative directory
  const dirGroup = new Map<string, DiscoveredFile[]>();
  for (const file of files) {
    const dir = path.dirname(file.relativePath).replace(/\\/g, "/");
    const existing = dirGroup.get(dir) || [];
    existing.push(file);
    dirGroup.set(dir, existing);
  }

  // -------------------------------------------------------------
  // Rule 1: Root Layout Check (require-root-layout)
  // -------------------------------------------------------------
  // Next.js requires a root layout. If top-level layout is absent,
  // Next.js supports Multiple Root Layouts inside top-level route groups (e.g. app/(shop)/layout.tsx).
  const hasTopLevelRootLayout = files.some((f) => {
    const dir = path.dirname(f.relativePath).replace(/\\/g, "/");
    const isRoot = dir === "." || dir === "";
    return isRoot && /^layout\.(tsx|ts|jsx|js)$/.test(f.fileName);
  });

  if (!hasTopLevelRootLayout && routes.length > 0) {
    // Check if every route has at least one layout in its layoutChain
    const routesWithoutLayout = routes.filter(
      (r) => !r.layoutChain || r.layoutChain.length === 0,
    );

    if (routesWithoutLayout.length > 0) {
      issues.push({
        rule: "require-root-layout",
        severity: "error",
        message:
          "Root layout is missing from the App Router root, and one or more routes lack a route group root layout.",
        hint: "Create an 'app/layout.tsx' file, or add a 'layout.tsx' inside each top-level route group.",
      });
    }
  }

  // -------------------------------------------------------------
  // Rule 2: Page and Route Handler Conflict (no-page-route-conflict)
  // -------------------------------------------------------------
  for (const [dir, dirFiles] of dirGroup.entries()) {
    const hasPage = dirFiles.some((f) =>
      /^page\.(tsx|ts|jsx|js)$/.test(f.fileName),
    );
    const hasRoute = dirFiles.some((f) =>
      /^route\.(tsx|ts|jsx|js)$/.test(f.fileName),
    );

    if (hasPage && hasRoute) {
      const displayDir = dir === "." ? "root (app/)" : dir;
      issues.push({
        rule: "no-page-route-conflict",
        severity: "error",
        filePath: dir,
        message: `Segment "${displayDir}" contains both page and route handler files.`,
        hint: "Next.js does not allow page.(tsx|js) and route.(ts|js) in the same directory segment.",
      });
    }
  }

  // -------------------------------------------------------------
  // Rule 3: Exact URL Collision across Route Groups (no-duplicate-paths)
  // -------------------------------------------------------------
  const pathToFileMap = new Map<string, string[]>();
  for (const route of routes) {
    const existing = pathToFileMap.get(route.path) || [];
    existing.push(route.file);
    pathToFileMap.set(route.path, existing);
  }

  for (const [routePath, fileList] of pathToFileMap.entries()) {
    if (fileList.length > 1) {
      issues.push({
        rule: "no-duplicate-paths",
        severity: "error",
        routePath,
        message: `Multiple route files resolve to the same public URL path "${routePath}":\n  - ${fileList.join("\n  - ")}`,
        hint: "Next.js cannot serve multiple pages at the exact same URL. Remove or rename one of the conflicting routes.",
      });
    }
  }

  // -------------------------------------------------------------
  // Rule 4: Dynamic Segment Collisions (no-route-collisions)
  // -------------------------------------------------------------
  const patternMap = new Map<string, RouteEntry[]>();
  for (const route of routes) {
    const key = createPatternKey(route.path);
    const existing = patternMap.get(key) || [];
    existing.push(route);
    patternMap.set(key, existing);
  }

  for (const [pattern, patternRoutes] of patternMap.entries()) {
    if (patternRoutes.length > 1) {
      const uniquePaths = Array.from(new Set(patternRoutes.map((r) => r.path)));
      if (uniquePaths.length > 1) {
        issues.push({
          rule: "no-route-collisions",
          severity: "error",
          message: `Dynamic route collision detected matching pattern "/${pattern}": ${uniquePaths.join(", ")}`,
          hint: "Next.js cannot disambiguate multiple dynamic segments at the same level. Unify the dynamic parameter names.",
        });
      }
    }
  }

  // -------------------------------------------------------------
  // Rule 5: Parallel Route Slot Fallback (parallel-missing-default)
  // -------------------------------------------------------------
  const slotDirs = new Set<string>();
  for (const file of files) {
    const parts = file.relativePath.replace(/\\/g, "/").split("/");
    for (let i = 0; i < parts.length - 1; i++) {
      if (parts[i]?.startsWith("@")) {
        const slotPath = parts.slice(0, i + 1).join("/");
        slotDirs.add(slotPath);
      }
    }
  }

  for (const slotDir of slotDirs) {
    const slotFiles = dirGroup.get(slotDir) || [];
    const hasDefault = slotFiles.some((f) =>
      /^default\.(tsx|ts|jsx|js)$/.test(f.fileName),
    );

    if (!hasDefault) {
      issues.push({
        rule: "parallel-missing-default",
        severity: "warning",
        filePath: slotDir,
        message: `Parallel route slot "${slotDir}" does not define a default.(tsx|js) fallback.`,
        hint: "Next.js requires default.js in parallel slots to prevent 404s when navigating between unrelated pages.",
      });
    }
  }

  // -------------------------------------------------------------
  // Rule 6: Global Error Boundary Location (global-error-location)
  // -------------------------------------------------------------
  for (const file of files) {
    if (/^global-error\.(tsx|ts|jsx|js)$/.test(file.fileName)) {
      const dir = path.dirname(file.relativePath).replace(/\\/g, "/");
      const isRoot = dir === "." || dir === "";
      if (!isRoot) {
        issues.push({
          rule: "global-error-location",
          severity: "warning",
          filePath: file.relativePath,
          message: `global-error must be defined at the root App Router directory, but was found in "${dir}".`,
          hint: "Move global-error.(tsx|js) to the root app directory. Subdirectories should use error.(tsx|js).",
        });
      }
    }
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  return {
    issues,
    hasErrors: errorCount > 0,
    errorCount,
    warningCount,
    infoCount,
  };
}

/**
 * Supported Next.js segment dynamics
 */
export type SegmentType =
  "static" | "dynamic" | "catch-all" | "optional-catch-all";

/**
 * Next.js App Router special convention files
 */
export type SpecialFileType =
  | "page"
  | "layout"
  | "loading"
  | "error"
  | "global-error"
  | "not-found"
  | "template"
  | "default"
  | "route";

/**
 * React rendering environment
 */
export type RenderingType = "client" | "server";

/**
 * Standard HTTP methods supported in route handlers
 */
export type HttpMethod =
  "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

/**
 * Discovered file in the App Router tree
 */
export interface DiscoveredFile {
  relativePath: string; // Relative to App Router root directory
  fullPath: string; // Absolute filesystem path
  fileName: string;
  extension: string;
}

/**
 * App Router convention file entry
 */
export interface RouteFile {
  type: SpecialFileType;
  fileName: string;
  relativePath: string;
  rendering: RenderingType;
  methods?: HttpMethod[];
  hasServerActions?: boolean;
  runtime?: string;
  dynamicConfig?: string;
}

/**
 * Represents a resolved Next.js route endpoint (page or route handler)
 */
export interface RouteEntry {
  path: string;
  type: "page" | "route";
  file: string;
  segmentType: SegmentType;
  rendering: RenderingType;
  methods?: HttpMethod[];
  hasServerActions?: boolean;
  runtime?: string;
  dynamicConfig?: string;
  files: RouteFile[];
  parallelSlots?: string[];
  intercepting?: string;
  layoutChain?: string[];
}

/**
 * Lint severity level
 */
export type LintSeverity = "error" | "warning" | "info";

/**
 * Lint issue discovered during route inspection
 */
export interface LintIssue {
  rule: string;
  severity: LintSeverity;
  message: string;
  routePath?: string;
  filePath?: string;
  hint?: string;
}

/**
 * Lint summary report
 */
export interface LintResult {
  issues: LintIssue[];
  hasErrors: boolean;
  warningCount: number;
  errorCount: number;
  infoCount?: number;
}

/**
 * Summary statistics for the scanned project
 */
export interface SummaryStats {
  routes: number;
  dynamic: number;
  client: number;
  server: number;
  layouts: number;
  loading: number;
  errors: number;
  apiRoutes?: number;
  parallelRoutes?: number;
  interceptedRoutes?: number;
}

/**
 * Overall analysis output
 */
export interface AnalysisResult {
  project: string;
  router: "App Router";
  root: string;
  routes: RouteEntry[];
  summary: SummaryStats;
  executionTimeMs: number;
  lint?: LintResult;
}

/**
 * Output format types
 */
export type OutputFormat =
  "tree" | "flat" | "json" | "mermaid" | "dot" | "markdown" | "html" | "svg";

/**
 * CLI command line options
 */
export interface CLIOptions {
  flat?: boolean;
  json?: boolean;
  mermaid?: boolean;
  dot?: boolean;
  markdown?: boolean;
  svg?: boolean;
  output?: string;
  html?: boolean | string;
  serve?: boolean | number | string;
  format?: OutputFormat;
  search?: string;
  check?: boolean;
  strict?: boolean;
  methods?: boolean;
}

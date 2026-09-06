export type SegmentType =
  | "static"
  | "dynamic"
  | "catch-all"
  | "optional-catch-all";

export type SpecialFileType =
  | "page"
  | "layout"
  | "loading"
  | "error"
  | "not-found"
  | "template"
  | "default"
  | "route";

export type RenderingType = "client" | "server";

export interface DiscoveredFile {
  relativePath: string; // Relative to App Router root directory
  fullPath: string; // Absolute filesystem path
  fileName: string;
  extension: string;
}

export interface RouteFile {
  type: SpecialFileType;
  fileName: string;
  relativePath: string;
  rendering: RenderingType;
}

export interface RouteEntry {
  path: string;
  type: "page" | "route";
  file: string;
  segmentType: SegmentType;
  rendering: RenderingType;
  files: RouteFile[];
}

export interface SummaryStats {
  routes: number;
  dynamic: number;
  client: number;
  server: number;
  layouts: number;
  loading: number;
  errors: number;
}

export interface AnalysisResult {
  project: string;
  router: "App Router";
  root: string;
  routes: RouteEntry[];
  summary: SummaryStats;
  executionTimeMs: number;
}

export interface CLIOptions {
  flat?: boolean;
  json?: boolean;
  search?: string;
}

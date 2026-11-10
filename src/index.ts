/**
 * next-route-graph
 *
 * Inspect, lint, and visualize Next.js App Router project routes.
 * Programmatic SDK entry point.
 */

export { analyzeRoutes } from "./core/analyzer.js";
export { inspectProject, filterRoutes } from "./core/inspect.js";
export { buildRouteGraph, type RouteGraphNode } from "./render/graph.js";
export { detectAppRouter, type DetectionResult } from "./core/detector.js";
export { lintRoutes } from "./core/linter.js";
export {
  detectHttpMethods,
  detectRenderingType,
  detectRouteConfig,
  detectServerActions,
  extractRouteMetadata,
  getPrologueDirectives,
  getSegmentType,
  HTTP_METHODS,
  parseRoutePath,
  parseSpecialFileType,
  SPECIAL_FILES,
  stripComments,
} from "./core/parser.js";
export { scanAppDir } from "./core/scanner.js";

// Domain Errors
export {
  AmbiguousRouterError,
  NextRouteGraphError,
  NoAppRouterError,
  ProjectNotFoundError,
  RouteDirectoryReadError,
  RouteFileReadError,
  RouteLintError,
} from "./errors/index.js";

// Renderers & Strategy Pattern
export {
  DotRenderer,
  FlatRenderer,
  getRenderer,
  HtmlRenderer,
  JsonRenderer,
  MarkdownRenderer,
  MermaidRenderer,
  renderDot,
  renderFlat,
  renderHtml,
  renderJson,
  renderMarkdown,
  renderMermaid,
  renderTree,
  TreeRenderer,
  SvgRenderer,
  renderSvg,
} from "./render/index.js";

export type { OutputRenderer } from "./render/index.js";

// Domain Types
export type {
  AnalysisResult,
  CLIOptions,
  DiscoveredFile,
  HttpMethod,
  LintIssue,
  LintResult,
  LintSeverity,
  OutputFormat,
  RenderingType,
  RouteEntry,
  RouteFile,
  SegmentType,
  SpecialFileType,
  SummaryStats,
} from "./types/index.js";

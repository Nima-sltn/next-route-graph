# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-11-10

### Added
- Offline SVG route maps with intermediate URL segments and source information; available through `--svg`, `--format svg`, and the SDK.
- A focused HTML explorer with route selection, layout chains, search, endpoint filters, health diagnostics, and downloadable exports.
- `--output <file>` for every format, including creation of parent directories.
- `inspectProject()` and immutable `filterRoutes()` SDK helpers, plus a shared `buildRouteGraph()` model for visual exporters.
- Offline browser regression tests and Windows/Linux CI checks.

### Fixed
- Interception markers now resolve target URL segments while ignoring route groups and parallel slots.
- Valid parallel and intercepted views no longer trigger duplicate URL diagnostics. API-only projects do not require UI layouts.
- Dynamic parameter conflicts are detected even when descendant endpoints differ; static paths remain case-sensitive.
- File read failures abort with `ERR_FILE_READ` instead of silently producing incomplete metadata.
- Named HTTP exports use the exported alias and ignore type-only entries.
- HTML uses escaped markup and text nodes for source data, a restrictive content policy, and spreadsheet-safe CSV cells.
- Preview binds to `127.0.0.1`, validates ports, handles occupied ports, and serves only the report.
- Format conflicts and unknown formats fail explicitly. Reports remain available when strict validation fails; status messages use stderr.
- Mermaid and DOT now share the URL hierarchy, including segments without endpoints; DOT line breaks render correctly.
- Tests rebuild production artifacts first, preventing stale CLI and SDK tests.

### Changed
- Indexed layout lookup replaces repeated scans of every discovered file per endpoint.
- Search updates every endpoint summary count while keeping convention totals and diagnostics project-wide.
- CLI version is read from package metadata; npm packages include the linked guides, changelog, and report screenshot.

## [1.1.0] - 2026-11-07

### Added
- **Route Linter & Collision Detection Engine**: Built-in validation rules detecting dynamic segment collisions (`/users/[id]` vs `/users/[slug]`), duplicate URL path conflicts across route groups (`no-duplicate-paths`), conflicting `page.tsx` and `route.ts` handlers, missing root layouts, and unhandled parallel route slots (`@slot`).
- **Strategy Pattern Renderers**:
  - `MermaidRenderer` (`--mermaid` or `--format mermaid`): Generates Mermaid flowchart diagrams with entity-encoded node shapes.
  - `DotRenderer` (`--dot` or `--format dot`): Generates Graphviz DOT graphs with properly escaped string literals.
  - `MarkdownRenderer` (`--markdown` or `--format markdown`): Generates GitHub-flavored Markdown tables.
  - `HtmlRenderer` (`--html`, `--serve`, or `--format html`): Generates a standalone, zero-dependency interactive visual HTML report with route hierarchy cards, searchable data table, CSV export, integrated tabbed format explorer (Mermaid, DOT, Markdown, ANSI Terminal, JSON, Flat), and built-in local preview server.
- **Deep HTTP Method & Metadata Inspection**: Automatically detects exported HTTP handlers (`GET`, `POST`, `PUT`, `DELETE`, etc.) in `route.ts`, React Server Actions (`"use server"`), and route segment configurations (`runtime`, `dynamic`).
- **Programmatic TypeScript SDK**: Exported root module `dist/index.js` with TypeScript type declarations (`dist/index.d.ts`) and `"exports"` map, enabling library usage via `import { analyzeRoutes } from 'next-route-graph'`.
- **Domain Error Hierarchy**: Structured error classes (`ProjectNotFoundError`, `AmbiguousRouterError`, `NoAppRouterError`, `RouteLintError`) with machine-readable codes and actionable hints.
- **New CLI Commands & Flags**:
  - `next-route-graph check`: Run route linting checks with exit codes.
  - `--strict`: Fails with non-zero exit code if route issues or collisions are detected.
  - `--format <tree|flat|json|mermaid|dot|markdown|html>`: Flexible format selector.
  - `--html [file]`: Export self-contained interactive HTML report (defaults to `route-graph.html`).
  - `--serve [port]`: Spin up zero-dependency local HTTP preview server (defaults to port 3000) and open in default browser.
- **Comprehensive Automated Test Suite**: Expanded test coverage from 9 to 50 unit and integration tests, including end-to-end Next.js project fixtures, CLI subprocess tests, scanner edge cases, linter edge cases, external SDK consumer verification, and HTML report validation.
- **Documentation & Governance Suite**: Added `docs/ARCHITECTURE.md`, `docs/adr/0001-hybrid-parsing-and-strategy-renderers.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`.

### Fixed
- **Private Folders**: Ignored Next.js private folders (`_folder`, e.g. `_components`, `_lib`) and hidden directories during route discovery so internal components are not treated as public routes.
- **Multiple Root Layouts**: Added support for Multiple Root Layouts partitioned within top-level route groups (e.g. `app/(marketing)/layout.tsx` and `app/(shop)/layout.tsx`), eliminating false-positive `require-root-layout` errors.
- **Intercepting Routes**: Fixed regex in `parseRoutePath` and `extractRouteMetadata` to match multi-level intercepting tokens `(..)(..)` before single-level `(..)`.
- **Directive Truncation**: Replaced 500-character slice heuristic with a prologue parser (`getPrologueDirectives`), fixing missed `"use client"` / `"use server"` directives in files with long license headers.
- **Comment-Stripped Extraction**: Stripped comments before extracting HTTP methods, Server Actions, and route configs to prevent commented-out code (e.g. `// export function GET()`) from being reported.
- **Renderer Escaping**:
  - Escaped backslashes before double quotes in Graphviz DOT output.
  - Entity-encoded square brackets (`#91;`, `#93;`) in Mermaid labels to prevent broken node shape syntax.
  - Escaped pipe characters (`\|`) in Markdown table cells.

### Performance
- **Reduced Disk I/O**: Reduced filesystem reads by 66% in `analyzer.ts` by reading each file once into memory and caching parsed metadata.
- **Deterministic Route Ordering**: Implemented composite multi-level sorting (`path`, then `file`) guaranteeing consistent output across operating systems.

### Changed
- Refactored `analyzer.ts` into a decoupled pipeline supporting layout hierarchy tracking and slot resolution.
- Enriched `AnalysisResult` and `SummaryStats` with API route, parallel route, and interceptor counts.
- Enabled direct path execution in `detectAppRouter` when targeting `app/` or `src/app/` directly.
- Decoded Next.js `%5F` prefix syntax to underscores in URL routes (e.g. `%5Fprivate` ➔ `/_private`).
- Aligned route tree columns dynamically based on the longest route path in the project.
- Fixed nested markdown code blocks in `README.md`.

---

## [1.0.2] - 2026-09-13

### Changed
- Improved rendering performance and CLI tree layout formatting.

---

## [1.0.0] - 2026-09-05

### Added
- Initial release of `next-route-graph`.
- Support for static, dynamic, catch-all, and optional catch-all route detection.
- App Router directory auto-discovery (`app` and `src/app`).
- Basic tree, flat, and JSON output formats.

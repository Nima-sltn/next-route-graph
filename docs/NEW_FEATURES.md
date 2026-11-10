# Improvement evidence

The purpose of this work is a more useful route inspector, not a larger feature count. GitRoll scores must be measured by GitRoll after a rescan; this document makes no predicted score claims.

| Area | Concrete improvement | Evidence |
| --- | --- | --- |
| Architecture | One scan entry point for CLI and SDK; output and preview stay outside analysis; indexed layout lookup. | `src/core/inspect.ts`, `src/core/analyzer.ts`, workflow and consumer tests. |
| Interoperability | Rendered SVG, offline HTML, existing documentation/machine formats, and a shared graph exposed to SDK consumers. | `src/render/graph.ts`, `src/render/svg.ts`, export and browser tests. |
| Useful exploration | Select endpoint sources and layout chains; search/filter routes; inspect project health; download results. | `src/render/html.ts`, `tests/browser/report.test.mjs`. |
| Correctness | Interception target resolution, valid parallel variants, API-only layouts, case-sensitive paths, dynamic-prefix collisions, explicit read failures. | `tests/report_workflow.test.ts` plus existing parser/linter fixtures. |
| Safety | Escaped source data, restrictive report CSP, spreadsheet-safe CSV, loopback-only preview. | Hostile-input browser checks, markup checks, HTTP integration tests. |
| Documentation | Working examples, exit-code contract, explicit static-analysis limitations, architecture boundaries, and an implemented ADR. | README, architecture guide, ADR, CI workflow. |

The SVG URL graph is deliberately simple. It includes missing parent segments and keeps all endpoint sources without adding a graph runtime, CDN, database, plugin framework, watch daemon, or a replacement Next.js compiler. Mermaid/DOT remain useful source exports; HTML renders a native SVG instead of pretending those source blocks are visual previews.

Run `npm run typecheck`, `npm test`, and `npm run test:browser` to reproduce the checks. Browser setup and artifact generation are documented in the [README](../README.md#development).

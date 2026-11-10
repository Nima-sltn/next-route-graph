# ADR 0001: Offline SVG reports with a shared URL graph

- Status: Accepted
- Date: 2026-11-10

## Context

The CLI exports Mermaid and DOT source, but users also need a diagram that is already rendered and a report they can inspect without running a graph tool. A list of route cards does not convey nesting. Duplicate public URLs can represent valid parallel or intercepted sources and must remain inspectable.

## Decision

Build one URL hierarchy from `RouteEntry[]`, including URL segments without endpoints. Keep an array of endpoint sources on each node. Use the model for SVG, Mermaid, and DOT; embed SVG directly in the offline HTML report. Provide source/layout details beside the diagram, a filterable route table, full-project health checks, and one export selector.

Keep analysis independent of transport: renderers return strings; the CLI writes files or starts a small loopback HTTP server. Reuse the same `inspectProject()` pipeline in the CLI and SDK. Retain existing low-level APIs.

## Alternatives

- Bundle Mermaid and Graphviz renderers: more JavaScript and maintenance for a graph that can be drawn directly with SVG.
- Load a CDN: breaks offline reports and introduces network and privacy requirements.
- Add a graph application/framework: unnecessary for URL ancestry, selection, and basic filtering.
- Keep only source exports: useful for pipelines, but does not meet the need for a rendered artifact.

## Consequences

No new runtime dependency is required. SVG works in browsers, documents, and design tools, and the HTML remains a portable single file. Missing segments and parallel sources use consistent semantics across visual formats.

The map is a scrollable hierarchy rather than a force-directed canvas; it does not attempt drag layouts, runtime navigation, import analysis, or continuous watching. Large reports grow with endpoint count. The source parser remains heuristic and documented as such; adding a compiler dependency would require demonstrated parsing needs and its own decision.

Playwright is a development-only dependency to verify the actual offline browser behavior and downloads. Unit and integration tests continue using Node's built-in runner.

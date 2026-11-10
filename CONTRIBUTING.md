# Contributing to next-route-graph

Thank you for your interest in contributing! We welcome bug reports, documentation improvements, new renderers, and feature contributions.

---

## Development Setup

1. **Prerequisites**:
   * Node.js >= 18.0.0
   * npm >= 9.0.0
   * Node.js >= 20 for the optional browser tests

2. **Clone and Install**:
   ```bash
   git clone https://github.com/Nima-sltn/next-route-graph.git
   cd next-route-graph
   npm install
   ```

3. **Running the Development CLI**:
   ```bash
   npm run dev -- [path-to-nextjs-app]
   ```

---

## Quality Checks & Testing

Before submitting a Pull Request, ensure all tests, type checks, and builds pass:

```bash
# Run unit tests
npm test

# Run TypeScript type check
npm run typecheck

# Build the project
npm run build

# Exercise the offline HTML report in Chromium
npx playwright install chromium
npm run test:browser

# Run the complete pre-publish verification suite
npm run prepublishOnly
```

---

## Project Structure

* `src/cli.ts` - Command line interface definition and options.
* `src/index.ts` - Programmatic public SDK entry point.
* `src/core/detector.ts` - App Router root directory detection.
* `src/core/scanner.ts` - File discovery and directory traversal.
* `src/core/parser.ts` - Directive detection, HTTP method parsing, and URL resolution.
* `src/core/linter.ts` - Route collision and framework best practice validation.
* `src/core/analyzer.ts` - Core analysis orchestrator and indexed layout lookup.
* `src/core/inspect.ts` - Shared CLI/SDK scan entry point and immutable filtering.
* `src/render/` - Text, SVG, and offline HTML renderers with a shared URL graph.
* `src/preview.ts` - Loopback-only static report serving.
* `src/errors/` - Domain error classes and actionable hints.
* `tests/` - Node.js built-in unit/integration tests and Playwright browser checks.

---

## Pull Request Guidelines

1. Create a descriptive branch name (e.g. `feature/openapi-export` or `fix/parallel-routes`).
2. Add unit tests for any new functionality in `tests/`.
3. Follow existing code conventions and maintain explicit TypeScript types.
4. Update `README.md` and `CHANGELOG.md` when introducing user-facing changes.

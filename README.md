````md
# next-route-graph

> Visualize and inspect your Next.js App Router structure from the terminal.

`next-route-graph` is a lightweight, zero-config CLI that scans your `app/` or `src/app/` directory and turns your routing structure into a clear overview.

Useful for quickly understanding unfamiliar projects, documenting routes in a GitHub README, onboarding developers, or giving AI coding tools a structured view of your project's routing architecture.

No configuration. No network requests. No Next.js runtime.

## Features

- Detects static, dynamic, catch-all, and optional catch-all routes
- Supports Route Groups, Parallel Routes, and Intercepting Routes
- Detects Server/Client rendering
- Detects layouts, route handlers, and special App Router files
- Tree, flat, and JSON output
- Route search and filtering
- Lightweight and fast

## Installation

```bash
npx next-route-graph
```
````

Or install globally:

```bash
npm install -g next-route-graph
```

## Usage

Run from your Next.js project:

```bash
npx next-route-graph
```

Analyze another project:

```bash
npx next-route-graph ./my-next-app
```

Example output:

```text
Project     my-next-app
Router      App Router
Root        src/app

Routes
────────────────────────────────────────
├── /[locale]                    page.tsx  [dynamic]
├── /[locale]/about              page.tsx  [dynamic]
├── /[locale]/blog               page.tsx  [dynamic]
├── /[locale]/blog/[slug]        page.tsx  [dynamic]
└── /api                         route.ts

Summary
────────────────────────────────────────
Routes       5
Dynamic      4
Client       0
Server       5
Layouts      1
```

## CLI

```text
next-route-graph
next-route-graph <projectPath>
next-route-graph --flat
next-route-graph --json
next-route-graph --search <query>
next-route-graph --help
next-route-graph --version
```

### `--flat`

Show only route paths:

```bash
npx next-route-graph --flat
```

### `--json`

Output structured JSON for scripts, automation, AI tools, or CI:

```bash
npx next-route-graph --json
```

### `--search`

Filter routes:

```bash
npx next-route-graph --search blog
```

Options can be combined:

```bash
npx next-route-graph --search blog --json
```

## Development

```bash
git clone https://github.com/Nima-sltn/next-route-graph.git
cd next-route-graph
npm install
npm test
npm run typecheck
npm run build
```

## License

MIT © 2026 Nima Soltanian

[GitHub](https://github.com/Nima-sltn/next-route-graph) · [npm](https://www.npmjs.com/package/next-route-graph)

```

```

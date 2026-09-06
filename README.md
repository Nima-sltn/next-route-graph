# next-route-graph

> Visualize and inspect the structure of a Next.js App Router project directly from your terminal.

`next-route-graph` is a lightweight, fast, zero-config CLI tool for Next.js developers.

It scans your local App Router structure and provides useful information about routes, dynamic segments, rendering types, layouts, route handlers, and special Next.js files — without requiring any configuration or network requests.

## Features

- ⚡ **Zero-config** — Works out of the box with no configuration files.
- 🚫 **Zero-network** — Analyzes your project locally without sending files or data anywhere.
- 🎯 **App Router focused** — Automatically detects both `app/` and `src/app/`.
- 📁 **Dynamic route support** — Detects dynamic, catch-all, and optional catch-all segments.
- 🧩 **Advanced routing support** — Recognizes Route Groups, Parallel Routes, and Intercepting Routes.
- 🖥️ **Rendering detection** — Identifies Server and Client components.
- 📄 **Special files** — Detects Next.js App Router special files and route handlers.
- 🔍 **Search & filter** — Quickly find routes matching a specific query.
- 📊 **Multiple output formats** — Human-readable tree, flat route list, or machine-readable JSON.
- 🚀 **Fast & lightweight** — No Next.js runtime or project configuration required.

## Installation

### Run with npx

The easiest way to use `next-route-graph`:

```bash
npx next-route-graph
```

### Install globally

You can also install it globally:

```bash
npm install -g next-route-graph
```

Then run:

```bash
next-route-graph
```

## Usage

Run the CLI from the root of your Next.js project:

```bash
npx next-route-graph
```

The CLI automatically detects your App Router directory:

```text
app/
```

or:

```text
src/app/
```

You can also provide a custom project path:

```bash
npx next-route-graph ./my-next-app
```

## Example

For a project with the following structure:

```text
src/app/
├── [locale]/
│   ├── about/
│   │   └── page.tsx
│   ├── concepts/
│   │   ├── [category]/
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   └── page.tsx
│   └── page.tsx
├── api/
│   └── route.ts
└── layout.tsx
```

`next-route-graph` produces a route overview such as:

```text
Project     my-next-app
Router      App Router
Root        src/app

Routes
────────────────────────────────────────
├── /[locale]                    page.tsx  [dynamic]
├── /[locale]/about              page.tsx  [dynamic]
├── /[locale]/concepts           page.tsx  [dynamic]
├── /[locale]/concepts/[category] page.tsx [dynamic]
├── /[locale]/concepts/[category]/[slug] page.tsx [dynamic]
└── /api                         route.ts

Summary
────────────────────────────────────────
Routes       6
Dynamic      5
Client       0
Server       6
Layouts      1
Loading      0
Errors       0

✓ Analysis completed in 18ms
```

## CLI Options

### `--flat`

Output only route paths as a flat list.

```bash
npx next-route-graph --flat
```

Example:

```text
/[locale]
/[locale]/about
/[locale]/concepts
/[locale]/concepts/[category]
/api
```

This format is useful when you only need the route paths without additional metadata.

### `--json`

Output the complete analysis as machine-readable JSON.

```bash
npx next-route-graph --json
```

This is useful for scripts, automation, CI workflows, and other development tools.

### `--search <query>`

Filter routes using a search query.

```bash
npx next-route-graph --search blog
```

For example:

```text
/blog
/blog/[slug]
/blog/archive
```

Search can be combined with other output modes:

```bash
npx next-route-graph --search blog --flat
```

or:

```bash
npx next-route-graph --search blog --json
```

### `<projectPath>`

Analyze a specific Next.js project instead of the current directory.

```bash
npx next-route-graph ./my-next-app
```

## Command Reference

| Command / Option                 | Description                         |
| -------------------------------- | ----------------------------------- |
| `next-route-graph`               | Analyze the current Next.js project |
| `next-route-graph <projectPath>` | Analyze a specific project          |
| `--flat`                         | Output only route paths             |
| `--json`                         | Output machine-readable JSON        |
| `--search <query>`               | Filter routes by search string      |
| `--help`                         | Show CLI help                       |
| `--version`                      | Show the installed version          |

## Supported Next.js Routing Features

`next-route-graph` understands common Next.js App Router conventions, including:

### Static Routes

```text
/about
/dashboard
/settings/profile
```

### Dynamic Routes

```text
/[id]
/products/[productId]
```

### Catch-all Routes

```text
/docs/[...slug]
```

### Optional Catch-all Routes

```text
/docs/[[...slug]]
```

### Route Groups

```text
/(marketing)/about
```

### Parallel Routes

```text
/dashboard/@analytics
```

### Intercepting Routes

```text
(.)photo
(..)photo
(...)photo
```

### Route Handlers

```text
/api/users/route.ts
```

### Special App Router Files

The analyzer detects relevant Next.js App Router files such as:

```text
layout.tsx
page.tsx
loading.tsx
error.tsx
not-found.tsx
route.ts
```

## Output Formats

`next-route-graph` currently provides three output modes.

### Tree

The default output provides a human-readable overview of the project.

```bash
npx next-route-graph
```

### Flat

Outputs only route paths.

```bash
npx next-route-graph --flat
```

### JSON

Outputs structured data for programmatic use.

```bash
npx next-route-graph --json
```

## Why next-route-graph?

Next.js App Router projects can become difficult to navigate as the number of routes, layouts, dynamic segments, and special files grows.

`next-route-graph` gives you a quick overview of the routing structure directly from your terminal.

No configuration.

No network requests.

No Next.js runtime.

Just run it and inspect your routes.

## Development

Clone the repository:

```bash
git clone https://github.com/Nima-sltn/next-route-graph.git
cd next-route-graph
```

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Run type checking:

```bash
npm run typecheck
```

Build the project:

```bash
npm run build
```

## Contributing

Contributions, bug reports, feature requests, and improvements are welcome.

If you find an issue or have an idea for improving `next-route-graph`, feel free to open an issue or submit a pull request.

Before submitting a pull request, please make sure that:

- Tests are passing.
- Type checking passes.
- The project builds successfully.

## License

MIT © 2026 Next Route Map Contributors

See the [LICENSE](./LICENSE) file for the full license text.

## Links

- **npm:** https://www.npmjs.com/package/next-route-graph
- **GitHub:** https://github.com/Nima-sltn/next-route-graph

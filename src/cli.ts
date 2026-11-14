#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import { Command, Option } from "commander";
import pc from "picocolors";
import { filterRoutes, inspectProject } from "./core/inspect.js";
import { NextRouteGraphError, RouteLintError } from "./errors/index.js";
import { startPreview } from "./preview.js";
import { getRenderer } from "./render/index.js";
import type {
  AnalysisResult,
  CLIOptions,
  OutputFormat,
} from "./types/index.js";

function resolveFormat(options: CLIOptions): OutputFormat {
  const aliases = [
    "json",
    "flat",
    "mermaid",
    "dot",
    "markdown",
    "html",
    "svg",
  ] as const;
  const selected = aliases.filter((format) => options[format]);
  if (selected.length + Number(Boolean(options.format)) > 1) {
    throw new Error(
      "Choose one output format: --format <type> or one format flag.",
    );
  }
  const format =
    selected[0] ??
    options.format ??
    (options.serve !== undefined ? "html" : "tree");
  if (options.html && options.output)
    throw new Error("Use --html [file] or --output <file>, not both.");
  if (
    options.serve !== undefined &&
    (format !== "html" || options.output || options.html)
  ) {
    throw new Error(
      "Use --serve on its own or with --format html; file output is separate.",
    );
  }
  return format;
}

async function runAnalysis(projectPath: string, options: CLIOptions) {
  try {
    const format = resolveFormat(options);
    const portText = resolvePort(options);
    const fullResult = await inspectProject(projectPath);
    const result = options.search
      ? filterRoutes(fullResult, options.search)
      : fullResult;
    const output = getRenderer(format).render(result);
    const lint = fullResult.lint;
    const failed = checkFailed(fullResult, options);

    if (options.serve !== undefined) {
      // A failed CI check must terminate instead of leaving a preview process alive.
      if (failed && lint)
        throw new RouteLintError(lint.errorCount, lint.warningCount);
      await serveReport(output, Number(portText));
      return;
    }

    await writeOutput(output, format, options);
    // Write the report before applying CI exit policy so failing checks leave artifacts.
    if (failed && lint)
      throw new RouteLintError(lint.errorCount, lint.warningCount);
  } catch (error: unknown) {
    reportError(error, options);
    process.exitCode = 1;
  }
}

async function writeOutput(
  output: string,
  format: OutputFormat,
  options: CLIOptions,
) {
  let target = options.output;
  if (options.html)
    target =
      typeof options.html === "string" ? options.html : "route-graph.html";
  if (target && target !== "-") {
    const absolute = path.resolve(target);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    if (format === "tree") output = stripVTControlCharacters(output);
    await fs.writeFile(absolute, output + "\n", "utf-8");
    console.error(
      pc.green(
        `✓ ${format === "html" ? "HTML report" : format.toUpperCase() + " export"} written to ${target}`,
      ),
    );
  } else if (output) {
    process.stdout.write(output + "\n");
  }
}

function reportError(error: unknown, options: CLIOptions) {
  const message = error instanceof Error ? error.message : String(error);
  if (options.json || options.format === "json") {
    console.error(
      JSON.stringify({
        error: message,
        code: error instanceof NextRouteGraphError ? error.code : "ERR_CLI",
      }),
    );
  } else {
    console.error(pc.red(`✗ ${message}`));
    if (error instanceof NextRouteGraphError && error.hint)
      console.error(pc.dim(`  Hint: ${error.hint}`));
  }
}

function resolvePort(options: CLIOptions): string {
  const portText = options.serve === true ? "3000" : String(options.serve);
  if (
    options.serve !== undefined &&
    (!/^\d+$/.test(portText) || Number(portText) > 65535)
  ) {
    throw new Error(
      "Preview port must be an integer between 0 and 65535 (0 chooses a free port).",
    );
  }
  return portText;
}

function checkFailed(result: AnalysisResult, options: CLIOptions): boolean {
  if (!result.lint) return false;
  if (options.strict)
    return result.lint.hasErrors || result.lint.warningCount > 0;
  return Boolean(options.check && result.lint.hasErrors);
}

async function serveReport(output: string, port: number) {
  const server = await startPreview(output, port);
  const address = server.address();
  if (address && typeof address !== "string") {
    console.error(
      pc.green(
        `✓ Route Graph server running at http://127.0.0.1:${address.port}`,
      ),
    );
    console.error("Static snapshot · Press Ctrl+C to stop");
  }
}

const program = new Command();
const { version } = JSON.parse(
  await fs.readFile(new URL("../package.json", import.meta.url), "utf-8"),
);
program
  .name("next-route-graph")
  .description("Inspect, lint, and visualize Next.js App Router project routes")
  .version(version)
  .argument("[projectPath]", "Path to the Next.js project root", ".")
  .option("--flat", "Output flat route paths")
  .option("--json", "Output machine-readable JSON")
  .option("--mermaid", "Output Mermaid diagram source")
  .option("--dot", "Output Graphviz DOT source")
  .option("--markdown", "Output a Markdown table")
  .option("--svg", "Output a rendered SVG route diagram")
  .option(
    "--html [file]",
    "Write an offline interactive HTML report (default: route-graph.html)",
  )
  .option(
    "--serve [port]",
    "Preview an HTML snapshot on 127.0.0.1 (default: 3000)",
  )
  .addOption(
    new Option("--format <type>", "Output format (default: tree)").choices([
      "tree",
      "flat",
      "json",
      "mermaid",
      "dot",
      "markdown",
      "html",
      "svg",
    ]),
  )
  .option(
    "-o, --output <file>",
    "Write any format to a file; '-' writes to stdout",
  )
  .option(
    "--search <query>",
    "Filter path, source file, or HTTP method (case-insensitive)",
  )
  .option("--check", "Fail on route validation errors")
  .option("--strict", "Fail on errors or warnings")
  .action(runAnalysis);

program
  .command("check")
  .description("Check route collisions, root layouts, and slot fallbacks")
  .argument("[projectPath]", "Path to the Next.js project root", ".")
  .option("--strict", "Fail on warnings in addition to errors")
  .option("--json", "Output check report as JSON")
  .action(async (projectPath: string, options: CLIOptions) => {
    await runAnalysis(projectPath, { ...options, check: true });
  });

await program.parseAsync(process.argv);

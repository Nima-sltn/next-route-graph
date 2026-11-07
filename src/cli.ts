#!/usr/bin/env node

import { Command } from "commander";
import pc from "picocolors";
import { analyzeRoutes } from "./core/analyzer.js";
import { detectAppRouter } from "./core/detector.js";
import { scanAppDir } from "./core/scanner.js";
import { NextRouteGraphError, RouteLintError } from "./errors/index.js";
import { getRenderer } from "./render/index.js";
import { CLIOptions, OutputFormat } from "./types/index.js";

/**
 * Determines the target output format based on CLI flags.
 */
function resolveFormat(options: CLIOptions): OutputFormat {
  if (options.json) return "json";
  if (options.flat) return "flat";
  if (options.mermaid) return "mermaid";
  if (options.dot) return "dot";
  if (options.markdown) return "markdown";
  if (options.format) return options.format;
  return "tree";
}

async function runAnalysis(projectPath: string, options: CLIOptions) {
  try {
    const { appDir, displayRoot } = detectAppRouter(projectPath);
    const scannedFiles = await scanAppDir(appDir);
    let analysisResult = await analyzeRoutes(
      scannedFiles,
      projectPath,
      displayRoot,
    );

    if (options.search) {
      const search = options.search;
      analysisResult.routes = analysisResult.routes.filter((route) =>
        route.path.includes(search),
      );

      analysisResult.summary = {
        ...analysisResult.summary,
        routes: analysisResult.routes.length,
        dynamic: analysisResult.routes.filter(
          (route) => route.segmentType !== "static",
        ).length,
        client: analysisResult.routes.filter(
          (route) => route.rendering === "client",
        ).length,
        server: analysisResult.routes.filter(
          (route) => route.rendering === "server",
        ).length,
      };
    }

    const format = resolveFormat(options);
    const renderer = getRenderer(format);
    const output = renderer.render(analysisResult);

    if (output) {
      console.log(output);
    }

    // Determine exit code policy based on check mode and strict flag
    const lint = analysisResult.lint;
    if (lint) {
      if (options.check) {
        // In check mode: errors always fail; warnings fail if --strict is enabled
        if (lint.hasErrors) {
          throw new RouteLintError(lint.errorCount, lint.warningCount);
        }
        if (options.strict && lint.warningCount > 0) {
          throw new RouteLintError(0, lint.warningCount);
        }
      } else if (options.strict) {
        // In default mode: fail if strict and either errors or warnings exist
        if (lint.hasErrors || lint.warningCount > 0) {
          throw new RouteLintError(lint.errorCount, lint.warningCount);
        }
      }
    }
  } catch (error: any) {
    if (options.json) {
      console.error(
        JSON.stringify({ error: error.message, code: error.code }),
      );
    } else {
      console.error(pc.red(`✗ ${error.message}`));
      if (error instanceof NextRouteGraphError && error.hint) {
        console.error(pc.dim(`  Hint: ${error.hint}`));
      }
    }
    process.exit(1);
  }
}

const program = new Command();

program
  .name("next-route-graph")
  .description("Inspect, lint, and visualize Next.js App Router project routes")
  .version("1.1.0")
  .argument("[projectPath]", "Path to the Next.js project root", ".")
  .option("--flat", "Output only flat route paths")
  .option("--json", "Output machine-readable JSON")
  .option("--mermaid", "Output Mermaid flowchart diagram")
  .option("--dot", "Output Graphviz DOT graph")
  .option("--markdown", "Output GitHub-flavored Markdown table")
  .option(
    "--format <type>",
    "Output format: tree, flat, json, mermaid, dot, markdown",
    "tree",
  )
  .option("--search <query>", "Filter routes by search string")
  .option("--check", "Run route validation and lint checks")
  .option("--strict", "Exit with non-zero code if route issues are detected")
  .action(async (projectPath: string, options: CLIOptions) => {
    await runAnalysis(projectPath, options);
  });

program
  .command("check")
  .description("Lint Next.js App Router for collisions, missing roots, and slot errors")
  .argument("[projectPath]", "Path to the Next.js project root", ".")
  .option("--strict", "Fail on warnings in addition to errors")
  .option("--json", "Output check report as JSON")
  .action(
    async (
      projectPath: string,
      options: { strict?: boolean; json?: boolean },
    ) => {
      await runAnalysis(projectPath, {
        check: true,
        strict: options.strict ?? false,
        json: options.json,
      });
    },
  );

program.parse(process.argv);

#!/usr/bin/env node

import { Command } from "commander";
import pc from "picocolors";
import { analyzeRoutes } from "./core/analyzer.js";
import { detectAppRouter } from "./core/detector.js";
import { scanAppDir } from "./core/scanner.js";
import { renderFlat } from "./render/flat.js";
import { renderJson } from "./render/json.js";
import { renderTree } from "./render/tree.js";
import { CLIOptions } from "./types/index.js";

const program = new Command();

program
  .name("next-route-graph")
  .description("Inspect and visualize Next.js App Router project routes")
  .version("1.0.0")
  .argument("[projectPath]", "Path to the Next.js project root", ".")
  .option("--flat", "Output only flat route paths")
  .option("--json", "Output machine-readable JSON")
  .option("--search <query>", "Filter routes by search string")
  .action(async (projectPath: string, options: CLIOptions) => {
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
            (route) => route.segmentType === "dynamic",
          ).length,
          client: analysisResult.routes.filter(
            (route) => route.rendering === "client",
          ).length,
          server: analysisResult.routes.filter(
            (route) => route.rendering === "server",
          ).length,
        };
      }

      if (options.json) {
        console.log(renderJson(analysisResult));
      } else if (options.flat) {
        const flatOutput = renderFlat(analysisResult.routes);
        if (flatOutput) {
          console.log(flatOutput);
        }
      } else {
        console.log(renderTree(analysisResult));
      }
    } catch (error: any) {
      if (options.json) {
        console.error(JSON.stringify({ error: error.message }));
      } else {
        console.error(pc.red(`✗ ${error.message}`));
      }
      process.exit(1);
    }
  });

program.parse(process.argv);

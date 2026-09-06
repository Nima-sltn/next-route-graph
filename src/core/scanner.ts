import fs from "node:fs/promises";
import path from "node:path";
import { DiscoveredFile } from "../types/index.js";

const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
]);

export async function scanAppDir(
  rootDir: string,
  currentDir: string = rootDir,
): Promise<DiscoveredFile[]> {
  let files: DiscoveredFile[] = [];
  let entries;

  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true });
  } catch {
    throw new Error("Unable to read the App Router directory.");
  }

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) {
        const subFiles = await scanAppDir(rootDir, fullPath);
        files = files.concat(subFiles);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (ALLOWED_EXTENSIONS.has(ext)) {
        const relativePath = path
          .relative(rootDir, fullPath)
          .replace(/\\/g, "/");
        files.push({
          relativePath,
          fullPath,
          fileName: entry.name,
          extension: ext,
        });
      }
    }
  }

  return files;
}

import fs from "node:fs/promises";
import path from "node:path";
import { RouteDirectoryReadError } from "../errors/index.js";
import { DiscoveredFile } from "../types/index.js";

const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const IGNORE_DIR_NAMES = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  "out",
  ".next",
  ".git",
  ".turbo",
  ".vercel",
]);

/**
 * Checks whether a directory should be excluded from App Router route discovery.
 * Follows Next.js conventions:
 * - Folders starting with '_' are Private Folders (opted out of routing).
 * - Folders starting with '.' are hidden / tooling directories.
 * - Build output and dependency folders are excluded.
 */
function shouldIgnoreDirectory(dirName: string): boolean {
  if (dirName.startsWith("_") || dirName.startsWith(".")) {
    return true;
  }
  return IGNORE_DIR_NAMES.has(dirName);
}

/**
 * Recursively scans a Next.js App Router directory to discover route-related source files.
 * Correctly ignores private folders (_folder), hidden directories, and build artifacts.
 *
 * @param rootDir - Root App Router directory path
 * @param currentDir - Current directory during recursive traversal
 * @returns Array of discovered App Router files
 * @throws {RouteDirectoryReadError} If directory reading fails
 */
export async function scanAppDir(
  rootDir: string,
  currentDir: string = rootDir,
): Promise<DiscoveredFile[]> {
  let files: DiscoveredFile[] = [];
  let entries;

  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true });
  } catch (err) {
    throw new RouteDirectoryReadError(currentDir, err);
  }

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      if (!shouldIgnoreDirectory(entry.name)) {
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

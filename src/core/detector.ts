import fs from "node:fs";
import path from "node:path";
import {
  AmbiguousRouterError,
  NoAppRouterError,
  ProjectNotFoundError,
} from "../errors/index.js";

/**
 * Result of App Router detection
 */
export interface DetectionResult {
  appDir: string;
  displayRoot: string;
}

/**
 * Detects the Next.js App Router root directory within a project path.
 * Supports standard `./app`, `./src/app`, and direct App Router folder execution.
 *
 * @param projectDir - Path to the project root or App Router directory
 * @returns DetectionResult containing absolute app directory and relative display path
 * @throws {ProjectNotFoundError} If the target project directory does not exist
 * @throws {AmbiguousRouterError} If both ./app and ./src/app are present
 * @throws {NoAppRouterError} If neither ./app nor ./src/app are found
 */
export function detectAppRouter(projectDir: string): DetectionResult {
  const absoluteDir = path.resolve(projectDir);

  if (!fs.existsSync(absoluteDir)) {
    throw new ProjectNotFoundError(projectDir);
  }

  const srcAppPath = path.join(absoluteDir, "src", "app");
  const appPath = path.join(absoluteDir, "app");

  const hasSrcApp =
    fs.existsSync(srcAppPath) && fs.statSync(srcAppPath).isDirectory();
  const hasApp = fs.existsSync(appPath) && fs.statSync(appPath).isDirectory();

  if (hasSrcApp && hasApp) {
    throw new AmbiguousRouterError();
  }

  if (hasSrcApp) {
    return {
      appDir: srcAppPath,
      displayRoot: "src/app",
    };
  }

  if (hasApp) {
    return {
      appDir: appPath,
      displayRoot: "app",
    };
  }

  // Fallback: Check if the user pointed directly to the app directory itself
  const isDirectAppDir =
    fs.statSync(absoluteDir).isDirectory() &&
    (path.basename(absoluteDir) === "app" ||
      fs.existsSync(path.join(absoluteDir, "layout.tsx")) ||
      fs.existsSync(path.join(absoluteDir, "layout.jsx")) ||
      fs.existsSync(path.join(absoluteDir, "layout.js")) ||
      fs.existsSync(path.join(absoluteDir, "page.tsx")) ||
      fs.existsSync(path.join(absoluteDir, "page.jsx")) ||
      fs.existsSync(path.join(absoluteDir, "page.js")));

  if (isDirectAppDir) {
    const parentDirName = path.basename(path.dirname(absoluteDir));
    const displayRoot =
      parentDirName === "src" ? "src/app" : path.basename(absoluteDir);
    return {
      appDir: absoluteDir,
      displayRoot,
    };
  }

  throw new NoAppRouterError();
}

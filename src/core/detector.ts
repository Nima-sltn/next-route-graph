import fs from "node:fs";
import path from "node:path";

export interface DetectionResult {
  appDir: string;
  displayRoot: string;
}

export function detectAppRouter(projectDir: string): DetectionResult {
  const absoluteDir = path.resolve(projectDir);

  if (!fs.existsSync(absoluteDir)) {
    throw new Error("The specified project path does not exist.");
  }

  const srcAppPath = path.join(absoluteDir, "src", "app");
  const appPath = path.join(absoluteDir, "app");

  const hasSrcApp =
    fs.existsSync(srcAppPath) && fs.statSync(srcAppPath).isDirectory();
  const hasApp = fs.existsSync(appPath) && fs.statSync(appPath).isDirectory();

  if (hasSrcApp && hasApp) {
    throw new Error(
      `Could not determine the App Router root.\n\nFound both:\n  ./app\n  ./src/app\n\nPlease keep only one App Router root for analysis.`,
    );
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

  throw new Error(
    `No Next.js App Router directory found.\n\nExpected:\n  ./app\n  ./src/app`,
  );
}

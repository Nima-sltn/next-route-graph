/**
 * Custom error hierarchy for next-route-graph
 */

export abstract class NextRouteGraphError extends Error {
  abstract readonly code: string;
  readonly hint?: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = this.constructor.name;
    this.hint = hint;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ProjectNotFoundError extends NextRouteGraphError {
  readonly code = "ERR_PROJECT_NOT_FOUND";

  constructor(projectPath?: string) {
    super(
      projectPath
        ? `The specified project path does not exist: "${projectPath}"`
        : "The specified project path does not exist.",
      "Please verify the directory path exists and you have read permissions.",
    );
  }
}

export class AmbiguousRouterError extends NextRouteGraphError {
  readonly code = "ERR_AMBIGUOUS_ROUTER";

  constructor() {
    super(
      `Could not determine the App Router root. Found both "./app" and "./src/app".`,
      "Next.js only supports one App Router root. Please keep either ./app or ./src/app.",
    );
  }
}

export class NoAppRouterError extends NextRouteGraphError {
  readonly code = "ERR_NO_APP_ROUTER";

  constructor() {
    super(
      `No Next.js App Router directory found.\n\nExpected:\n  ./app\n  ./src/app`,
      "Expected to find an ./app or ./src/app directory containing App Router files.",
    );
  }
}

export class RouteDirectoryReadError extends NextRouteGraphError {
  readonly code = "ERR_DIRECTORY_READ";

  constructor(dirPath?: string, cause?: unknown) {
    super(
      "Unable to read the App Router directory.",
      dirPath
        ? `Ensure you have filesystem read permissions for "${dirPath}".`
        : "Ensure you have filesystem read permissions for this folder.",
    );
    if (cause) {
      this.cause = cause;
    }
  }
}

export class RouteFileReadError extends NextRouteGraphError {
  readonly code = "ERR_FILE_READ";

  constructor(filePath: string, cause: unknown) {
    super(
      `Unable to read route file: "${filePath}"`,
      "Check that the file still exists and is readable, then scan again.",
    );
    this.cause = cause;
  }
}

export class RouteLintError extends NextRouteGraphError {
  readonly code = "ERR_ROUTE_LINT";
  readonly errorCount: number;
  readonly warningCount: number;

  constructor(errorCount: number, warningCount: number = 0) {
    const details: string[] = [];
    if (errorCount > 0) details.push(`${errorCount} error(s)`);
    if (warningCount > 0) details.push(`${warningCount} warning(s)`);
    super(
      `Route validation failed with ${details.join(" and ") || "issues"}.`,
      "Fix the reported route issues. Use a normal scan without --check or --strict to inspect without failing validation.",
    );
    this.errorCount = errorCount;
    this.warningCount = warningCount;
  }
}

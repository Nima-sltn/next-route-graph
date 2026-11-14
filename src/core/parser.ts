import fs from "node:fs/promises";
import path from "node:path";
import {
  HttpMethod,
  RenderingType,
  SpecialFileType,
  SegmentType,
} from "../types/index.js";

/**
 * Recognizable Next.js App Router special file names without extensions
 */
export const SPECIAL_FILES: Set<SpecialFileType> = new Set([
  "page",
  "layout",
  "loading",
  "error",
  "global-error",
  "not-found",
  "template",
  "default",
  "route",
]);

/**
 * Standard HTTP methods handled by Next.js route handlers
 */
export const HTTP_METHODS: readonly HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

/**
 * Determines whether a file name matches a Next.js App Router convention file.
 *
 * @param fileName - File name with extension (e.g., 'page.tsx', 'layout.js', 'global-error.tsx')
 * @returns SpecialFileType or null if it's not a recognized convention file
 */
export function parseSpecialFileType(fileName: string): SpecialFileType | null {
  const baseName = path.parse(fileName).name;

  if (SPECIAL_FILES.has(baseName as SpecialFileType)) {
    return baseName as SpecialFileType;
  }

  return null;
}

/**
 * Extracts prologue directives (e.g., "use client", "use server") declared at the
 * top of a JavaScript/TypeScript source file.
 *
 * Accurately skips shebangs, whitespace, single-line comments, and multi-line comments.
 * Avoids false positives from comments, template strings, or inner variables.
 *
 * @param content - Source file content
 * @returns Set of discovered directive strings
 */
export function getPrologueDirectives(content: string): Set<string> {
  const directives = new Set<string>();
  const code = content.replace(/^#![^\n]*\n/, "");
  let index = skipTrivia(code, 0);
  while (index < code.length) {
    const directive = readDirective(code, index);
    if (!directive) break;
    directives.add(directive.value);
    index = skipTrivia(code, directive.end);
  }
  return directives;
}

function skipTrivia(code: string, start: number): number {
  let index = start;
  while (index < code.length) {
    if (/\s/.test(code[index])) {
      index++;
      continue;
    }
    if (code.startsWith("//", index)) {
      const end = code.indexOf("\n", index + 2);
      index = end < 0 ? code.length : end + 1;
      continue;
    }
    if (code.startsWith("/*", index)) {
      const end = code.indexOf("*/", index + 2);
      index = end < 0 ? code.length : end + 2;
      continue;
    }
    break;
  }
  return index;
}

function readDirective(
  code: string,
  index: number,
): { value: string; end: number } | undefined {
  const quote = code[index];
  if (quote !== '"' && quote !== "'") return;
  let end = index + 1;
  while (end < code.length && code[end] !== quote && code[end] !== "\n") end++;
  if (code[end] !== quote) return;
  let after = end + 1;
  while (code[after] === " " || code[after] === "\t") after++;
  if (after < code.length && !";\n\r".includes(code[after])) return;
  return {
    value: code.slice(index + 1, end),
    end: code[after] === ";" ? after + 1 : after,
  };
}

/**
 * Strips comments from JavaScript/TypeScript source code to avoid false positives
 * when matching exported declarations.
 */
export function stripComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/**
 * Analyzes the source content or file on disk to detect if a "use client" directive is present.
 * Defaults to 'server' per Next.js App Router defaults.
 *
 * @param fileContentOrPath - Source code string or disk path to the file
 * @returns 'client' if "use client" directive is declared, otherwise 'server'
 */
export async function detectRenderingType(
  fileContentOrPath: string,
): Promise<RenderingType> {
  let content = fileContentOrPath;

  // If input looks like a potential file path, attempt reading from disk
  if (
    !fileContentOrPath.includes("\n") &&
    !fileContentOrPath.includes("\r") &&
    !fileContentOrPath.includes(";") &&
    !fileContentOrPath.includes("{")
  ) {
    try {
      content = await fs.readFile(fileContentOrPath, "utf-8");
    } catch {
      // If reading fails, treat input string directly as content
      content = fileContentOrPath;
    }
  }

  const directives = getPrologueDirectives(content);
  return directives.has("use client") ? "client" : "server";
}

/**
 * Inspects a route file's source content to detect exported HTTP methods.
 * Used for App Router route.ts handlers.
 * Ignores commented-out declarations and matches multiline or typed exports.
 *
 * @param content - Source code content of the file
 * @returns Array of discovered HTTP methods
 */
export function detectHttpMethods(content: string): HttpMethod[] {
  const cleanCode = stripComments(content);
  const namedExports = new Set<string>();
  for (const match of cleanCode.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    for (const entry of match[1].split(",")) {
      const specifier = entry.trim();
      if (!specifier || specifier.startsWith("type ")) continue;
      const name = specifier
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name) namedExports.add(name);
    }
  }

  return HTTP_METHODS.filter((method) => {
    // Direct declarations and named exports use the exported name, not the local alias.
    const pattern = new RegExp(
      `export\\s+(?:async\\s+)?(?:function\\s+${method}\\b|(?:const|let|var)\\s+${method}(?:\\s*:[^=]+)?\\s*=)`,
      "m",
    );
    return namedExports.has(method) || pattern.test(cleanCode);
  });
}

/**
 * Detects if a file defines Server Actions via the "use server" directive.
 * Checks file-level directive as well as inline function-level Server Actions.
 *
 * @param content - Source code content of the file
 * @returns True if the file contains a "use server" directive
 */
export function detectServerActions(content: string): boolean {
  const directives = getPrologueDirectives(content);
  if (directives.has("use server")) {
    return true;
  }

  const cleanCode = stripComments(content);
  // Matches inline server actions: async function / function / arrow function body starting with 'use server'
  const inlinePattern =
    /(?:async\s+function|function|=>)\s*[^{]*\{\s*['"]use server['"]/m;
  return inlinePattern.test(cleanCode);
}

/**
 * Extracts route segment configuration options like runtime and dynamic mode.
 * Supports TypeScript type annotations and ignores commented-out code.
 *
 * @param content - Source code content
 * @returns Extracted configuration object
 */
export function detectRouteConfig(content: string): {
  runtime?: "nodejs" | "edge";
  dynamicConfig?: "auto" | "force-dynamic" | "error" | "force-static";
} {
  const result: {
    runtime?: "nodejs" | "edge";
    dynamicConfig?: "auto" | "force-dynamic" | "error" | "force-static";
  } = {};

  const cleanCode = stripComments(content);

  const runtimeMatch =
    /export\s+(?:const|let)\s+runtime(?:\s*:\s*[^=]+)?\s*=\s*['"](nodejs|edge)['"]/.exec(
      cleanCode,
    );
  if (runtimeMatch?.[1]) {
    result.runtime = runtimeMatch[1] as "nodejs" | "edge";
  }

  const dynamicMatch =
    /export\s+(?:const|let)\s+dynamic(?:\s*:\s*[^=]+)?\s*=\s*['"](auto|force-dynamic|error|force-static)['"]/.exec(
      cleanCode,
    );
  if (dynamicMatch?.[1]) {
    result.dynamicConfig = dynamicMatch[1] as
      "auto" | "force-dynamic" | "error" | "force-static";
  }

  return result;
}

/**
 * Extracts parallel slots (e.g., '@modal') and intercepting markers from a path.
 *
 * @param relativePath - Relative file path
 * @returns Discovered metadata about slots and intercepting patterns
 */
export function extractRouteMetadata(relativePath: string): {
  slots: string[];
  intercepting?: string;
} {
  const parts = relativePath.split("/");
  const slots: string[] = [];
  let intercepting: string | undefined;

  for (const part of parts) {
    if (part.startsWith("@")) {
      slots.push(part);
    }
    // Match (..)(..) before (..)
    const interceptMatch =
      /^(\(\.\.\)\(\.\.\)|\(\.\.\.\)|\(\.\.\)|\(\.\))/.exec(part);
    if (interceptMatch && !intercepting) {
      intercepting = interceptMatch[1];
    }
  }

  return { slots, intercepting };
}

/**
 * Normalizes a relative filesystem path within App Router into a public URL route.
 * Handles Route Groups (folder), Parallel Routes (@slot), and Intercepting Routes.
 * Decodes Next.js %5F prefixes to underscores for public URLs.
 *
 * @param relativePath - App-relative path to a convention file (e.g. 'blog/[slug]/page.tsx')
 * @returns Normalized URL path (e.g. '/blog/[slug]')
 */
export function parseRoutePath(relativePath: string): string {
  const parts = relativePath.split("/");
  parts.pop(); // Remove file name

  const urlSegments: string[] = [];

  for (const part of parts) {
    if (!part) continue;

    if (isInvisibleSegment(part)) continue;

    let cleanedPart = part;

    // Decode escaped underscore %5F per Next.js spec
    if (cleanedPart.startsWith("%5F") || cleanedPart.startsWith("%5f")) {
      cleanedPart = "_" + cleanedPart.slice(3);
    }

    // Match URL segments, not filesystem levels: groups and slots never count.
    const interception = /^(\(\.\.\.\)|(?:\(\.\.\))+|\(\.\))/.exec(
      cleanedPart,
    )?.[0];
    if (interception) {
      if (interception === "(...)") urlSegments.length = 0;
      else if (interception !== "(.)") {
        const levels = interception.length / "(..)".length;
        urlSegments.splice(Math.max(0, urlSegments.length - levels));
      }
      cleanedPart = cleanedPart.slice(interception.length);
    }

    urlSegments.push(cleanedPart);
  }

  const routePath = "/" + urlSegments.join("/");
  return routePath === "/" ? "/" : routePath.replace(/\/+/g, "/");
}

/**
 * Classifies a route path into its segment dynamic type.
 *
 * @param routePath - Normalized route path
 * @returns 'optional-catch-all' | 'catch-all' | 'dynamic' | 'static'
 */
export function getSegmentType(routePath: string): SegmentType {
  if (routePath.includes("[[...")) {
    return "optional-catch-all";
  }

  if (routePath.includes("[...")) {
    return "catch-all";
  }

  if (routePath.includes("[")) {
    return "dynamic";
  }

  return "static";
}

function isInvisibleSegment(part: string): boolean {
  if (part.startsWith("@")) return true;
  if (!part.startsWith("(") || !part.endsWith(")")) return false;
  const inner = part.slice(1, -1);
  return !inner.startsWith(".") && inner !== "...";
}

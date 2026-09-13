import fs from "node:fs/promises";
import path from "node:path";

import { RenderingType, SpecialFileType } from "../types/index.js";

export const SPECIAL_FILES: Set<SpecialFileType> = new Set([
  "page",
  "layout",
  "loading",
  "error",
  "not-found",
  "template",
  "default",
  "route",
]);

export function parseSpecialFileType(fileName: string): SpecialFileType | null {
  const baseName = path.parse(fileName).name;

  if (SPECIAL_FILES.has(baseName as SpecialFileType)) {
    return baseName as SpecialFileType;
  }

  return null;
}

export async function detectRenderingType(
  filePath: string,
): Promise<RenderingType> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const firstLines = content.slice(0, 500);

    const clientDirectiveRegex =
      /^(?:(?:\s*\/\/.*?\n)|(?:\s*\/\*[\s\S]*?\*\/)|(?:\s*))["']use client["']/m;

    if (clientDirectiveRegex.test(firstLines)) {
      return "client";
    }
  } catch {}

  return "server";
}

export function parseRoutePath(relativePath: string): string {
  const parts = relativePath.split("/");
  parts.pop();

  const urlSegments: string[] = [];

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith("(") && part.endsWith(")")) {
      const inner = part.slice(1, -1);

      if (!inner.startsWith(".") && inner !== "...") {
        continue;
      }
    }

    if (part.startsWith("@")) {
      continue;
    }

    let cleanedPart = part;

    if (
      cleanedPart.startsWith("(.)") ||
      cleanedPart.startsWith("(..)") ||
      cleanedPart.startsWith("(...)") ||
      cleanedPart.startsWith("(..)(..)")
    ) {
      cleanedPart = cleanedPart.replace(/^(?:\(\.\.\.\)|\(\.\.\)|\(\.\))/, "");
    }

    urlSegments.push(cleanedPart);
  }

  const routePath = "/" + urlSegments.join("/");

  return routePath === "/" ? "/" : routePath.replace(/\/+/g, "/");
}

export function getSegmentType(
  routePath: string,
): "static" | "dynamic" | "catch-all" | "optional-catch-all" {
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

import type { AnalysisResult, RouteEntry } from "../types/index.js";
import type { OutputRenderer } from "./renderer.interface.js";

/**
 * Escapes pipe characters so Markdown table cells do not break table layout.
 */
function escapeCell(val: string): string {
  return val.replace(/\|/g, "\\|");
}

/**
 * Formats the route analysis result as a GitHub-flavored Markdown document with a table.
 *
 * @param result - AnalysisResult
 * @returns Formatted Markdown string
 */
export function renderMarkdown(result: AnalysisResult): string {
  const lines: string[] = [];

  lines.push(`### Next.js Route Graph: \`${result.project}\``);
  lines.push("");
  lines.push(`- **Router:** ${result.router}`);
  lines.push(`- **Root:** \`${result.root}\``);
  lines.push(`- **Total Routes:** ${result.summary.routes}`);
  lines.push(
    `- **Breakdown:** ${result.summary.server} Server, ${result.summary.client} Client, ${result.summary.dynamic} Dynamic`,
  );
  lines.push("");

  lines.push(
    "| Route Path | Type | Segment | Rendering | Methods / Details | File |",
  );
  lines.push("| :--- | :--- | :--- | :--- | :--- | :--- |");

  for (const route of result.routes) lines.push(renderRouteRow(route));

  if (result.routes.length === 0) {
    lines.push("| *(No routes discovered)* | - | - | - | - | - |");
  }

  if (result.lint && result.lint.issues.length > 0) {
    lines.push("");
    lines.push("#### Route Health Warnings & Issues");
    lines.push("");
    lines.push("| Severity | Rule | Message | File / Location |");
    lines.push("| :--- | :--- | :--- | :--- |");
    for (const issue of result.lint.issues) {
      const badge = {
        error: "🛑 Error",
        warning: "⚠️ Warning",
        info: "ℹ️ Info",
      }[issue.severity];
      const loc = issue.filePath ? `\`${escapeCell(issue.filePath)}\`` : "-";
      lines.push(
        `| ${badge} | \`${escapeCell(issue.rule)}\` | ${escapeCell(issue.message.replace(/\n/g, " "))} | ${loc} |`,
      );
    }
  }

  lines.push("");
  return lines.join("\n");
}

export class MarkdownRenderer implements OutputRenderer {
  render(result: AnalysisResult): string {
    return renderMarkdown(result);
  }
}

function renderRouteRow(route: RouteEntry): string {
  const methods =
    route.methods && route.methods.length > 0
      ? `\`${escapeCell(route.methods.join(", "))}\``
      : "-";
  const segment = `\`${escapeCell(route.segmentType)}\``;
  const rendering = route.rendering === "client" ? "**Client**" : "Server";
  const file = `\`${escapeCell(route.file)}\``;

  return `| \`${escapeCell(route.path)}\` | ${route.type} | ${segment} | ${rendering} | ${methods} | ${file} |`;
}

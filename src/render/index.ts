import { OutputFormat } from "../types/index.js";
import { DotRenderer, renderDot } from "./dot.js";
import { FlatRenderer, renderFlat } from "./flat.js";
import { HtmlRenderer, renderHtml } from "./html.js";
import { JsonRenderer, renderJson } from "./json.js";
import { MarkdownRenderer, renderMarkdown } from "./markdown.js";
import { MermaidRenderer, renderMermaid } from "./mermaid.js";
import type { OutputRenderer } from "./renderer.interface.js";
import { renderTree, TreeRenderer } from "./tree.js";
import { renderSvg, SvgRenderer } from "./svg.js";

export {
  DotRenderer,
  FlatRenderer,
  HtmlRenderer,
  JsonRenderer,
  MarkdownRenderer,
  MermaidRenderer,
  renderDot,
  renderFlat,
  renderHtml,
  renderJson,
  renderMarkdown,
  renderMermaid,
  renderTree,
  TreeRenderer,
  renderSvg,
  SvgRenderer,
};

export type { OutputRenderer };

/**
 * Factory function to retrieve an OutputRenderer instance by format name (Strategy Pattern).
 *
 * @param format - Output format name (tree, flat, json, mermaid, dot, markdown, html, svg)
 * @returns Configured OutputRenderer implementation
 */
export function getRenderer(format: OutputFormat): OutputRenderer {
  switch (format) {
    case "flat":
      return new FlatRenderer();
    case "json":
      return new JsonRenderer();
    case "mermaid":
      return new MermaidRenderer();
    case "dot":
      return new DotRenderer();
    case "markdown":
      return new MarkdownRenderer();
    case "html":
      return new HtmlRenderer();
    case "svg":
      return new SvgRenderer();
    case "tree":
      return new TreeRenderer();
    default:
      throw new Error(`Unsupported output format: ${String(format)}`);
  }
}

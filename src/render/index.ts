import { OutputFormat } from "../types/index.js";
import { DotRenderer, renderDot } from "./dot.js";
import { FlatRenderer, renderFlat } from "./flat.js";
import { JsonRenderer, renderJson } from "./json.js";
import { MarkdownRenderer, renderMarkdown } from "./markdown.js";
import { MermaidRenderer, renderMermaid } from "./mermaid.js";
import type { OutputRenderer } from "./renderer.interface.js";
import { renderTree, TreeRenderer } from "./tree.js";

export {
  DotRenderer,
  FlatRenderer,
  JsonRenderer,
  MarkdownRenderer,
  MermaidRenderer,
  renderDot,
  renderFlat,
  renderJson,
  renderMarkdown,
  renderMermaid,
  renderTree,
  TreeRenderer,
};

export type { OutputRenderer };

/**
 * Factory function to retrieve an OutputRenderer instance by format name (Strategy Pattern).
 *
 * @param format - Output format name ('tree' | 'flat' | 'json' | 'mermaid' | 'dot' | 'markdown')
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
    case "tree":
    default:
      return new TreeRenderer();
  }
}

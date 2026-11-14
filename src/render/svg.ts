import type { AnalysisResult } from "../types/index.js";
import { buildRouteGraph, escapeMarkup } from "./graph.js";
import type { OutputRenderer } from "./renderer.interface.js";

/** A real, offline vector diagram suitable for reports, READMEs, and design tools. */
export function renderSvg(result: AnalysisResult): string {
  const nodes = buildRouteGraph(result.routes);
  const rowHeight = 70;
  const width = Math.max(
    760,
    ...nodes.map(
      (node) => 340 + node.depth * 28 + Array.from(node.path).length * 9,
    ),
  );
  const height = Math.max(180, 110 + nodes.length * rowHeight);
  const rows = new Map(nodes.map((node, index) => [node.id, index]));
  const edges = nodes
    .filter((node) => node.parentId)
    .map((node) => {
      const parentRow = rows.get(node.parentId!)!;
      const row = rows.get(node.id)!;
      const x = 30 + (node.depth - 1) * 28;
      return `<path d="M${x},${100 + parentRow * rowHeight} V${100 + row * rowHeight} H${x + 28}" fill="none" stroke="#475569"/>`;
    })
    .join("\n");
  const cards = nodes
    .map((node, index) => {
      const x = 18 + node.depth * 28;
      const y = 76 + index * rowHeight;
      const route = node.routes[0];
      let color = "#64748b";
      if (route?.type === "route") color = "#d8b4fe";
      else if (route?.rendering === "client") color = "#67e8f9";
      else if (route) color = "#a5b4fc";
      const description =
        node.routes.length === 0
          ? "segment · no endpoint"
          : node.routes
              .map((route) =>
                [
                  route.type === "route"
                    ? `API ${(route.methods ?? []).join(" / ")}`
                    : `${route.rendering} page`,
                  route.segmentType !== "static" ? route.segmentType : "",
                  ...(route.parallelSlots ?? []),
                  route.intercepting ? "intercepted" : "",
                ]
                  .filter(Boolean)
                  .join(" · "),
              )
              .join(" | ");
      const title = [
        node.path,
        ...node.routes.map(
          (route) =>
            route.file +
            (route.layoutChain?.length
              ? " — layouts: " + route.layoutChain.join(" → ")
              : ""),
        ),
      ].join("\n");
      const maxDescription = Math.floor((width - x - 50) / 7);
      const shortDescription =
        description.length > maxDescription
          ? description.slice(0, maxDescription - 1) + "…"
          : description;
      return `<g data-node-index="${index}" tabindex="0" role="button" aria-label="${escapeMarkup(title)}">
      <title>${escapeMarkup(title)}</title>
      <rect x="${x}" y="${y}" width="${width - x - 18}" height="54" rx="8" fill="#172033" stroke="#334155"/>
      <rect x="${x}" y="${y + 8}" width="3" height="38" rx="1" fill="${color}"/>
      <text x="${x + 14}" y="${y + 22}" fill="${color}" font-size="14">${escapeMarkup(node.path)}</text>
      <text x="${x + 14}" y="${y + 41}" fill="#cbd5e1" font-size="11">${escapeMarkup(shortDescription)}</text>
    </g>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="graph-title graph-description">
  <title id="graph-title">${escapeMarkup(result.project)} — route map</title>
  <desc id="graph-description">URL segment hierarchy. Source files, slots, and intercepted variants are preserved. This shows route structure, not imports or navigation.</desc>
  <style>text{font-family:ui-monospace,Consolas,monospace}g:focus rect:first-of-type,g:hover rect:first-of-type{stroke:#67e8f9;stroke-width:2}g{cursor:pointer;outline:none}</style>
  <rect width="100%" height="100%" rx="12" fill="#0b1020"/>
  <text x="22" y="32" fill="#f1f5f9" font-size="17">${escapeMarkup(result.project)} / route map</text>
  <text x="22" y="54" fill="#94a3b8" font-size="12">${result.routes.length} endpoints · ${escapeMarkup(result.root)} · URL hierarchy</text>
  ${edges}
  ${cards || '<text x="22" y="106" fill="#94a3b8" font-size="14">No routes discovered</text>'}
</svg>`;
}

export class SvgRenderer implements OutputRenderer {
  render(result: AnalysisResult): string {
    return renderSvg(result);
  }
}

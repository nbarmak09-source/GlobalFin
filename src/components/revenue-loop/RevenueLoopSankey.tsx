"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { sankey as d3Sankey, sankeyLinkHorizontal } from "d3-sankey";
import type { RevenueLoopEntry } from "@/lib/revenueLoopTypes";

interface Props {
  entry: RevenueLoopEntry;
}

/** Small D3 Sankey: investor → investee (capital) → investor sink (cloud revenue). */
export default function RevenueLoopSankey({ entry }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const svgEl = ref.current;
    if (!svgEl) return;

    function draw() {
      if (!svgEl) return;
      const parent = svgEl.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = Math.max(140, Math.min(200, w * 0.35));
      const svg = d3.select(svgEl);
      svg.selectAll("*").remove();
      svg.attr("viewBox", `0 0 ${w} ${h}`).attr("width", "100%").attr("height", h);

      const layout = d3Sankey()
        .nodeWidth(14)
        .nodePadding(28)
        .extent([
          [8, 8],
          [w - 8, h - 8],
        ]);

      const capital = Math.max(0.1, entry.capitalOutAmountBn);
      const rev = Math.max(0.1, entry.cloudSpendDelta12mBn);

      const graph = layout({
        nodes: [
          { name: entry.investorLabel },
          { name: entry.investeeLabel },
          { name: `${entry.investorLabel} (cloud)` },
        ] as unknown as Parameters<typeof layout>[0]["nodes"],
        links: [
          { source: 0, target: 1, value: capital },
          { source: 1, target: 2, value: rev },
        ],
      });

      const g = svg.append("g");
      const linkPath = sankeyLinkHorizontal();

      g.append("g")
        .attr("fill", "none")
        .selectAll("path")
        .data(graph.links)
        .join("path")
        .attr("d", (d) => linkPath(d as never))
        .attr("stroke", (_d, i) =>
          i === 0 ? "rgba(201, 162, 39, 0.45)" : "rgba(59, 130, 246, 0.45)"
        )
        .attr("stroke-width", (d) =>
          Math.max(1, (d as { width?: number }).width ?? 2)
        )
        .attr("opacity", 0.9);

      g.append("g")
        .selectAll("rect")
        .data(graph.nodes)
        .join("rect")
        .attr("x", (d) => d.x0 ?? 0)
        .attr("y", (d) => d.y0 ?? 0)
        .attr("height", (d) => Math.max(1, (d.y1 ?? 0) - (d.y0 ?? 0)))
        .attr("width", (d) => Math.max(1, (d.x1 ?? 0) - (d.x0 ?? 0)))
        .attr("fill", "#1c2128")
        .attr("stroke", "#2d333b")
        .attr("rx", 2);

      g.append("g")
        .selectAll("text")
        .data(graph.nodes)
        .join("text")
        .attr("x", (d) => ((d.x0 ?? 0) + (d.x1 ?? 0)) / 2)
        .attr("y", (d) => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("font-size", 9)
        .attr("fill", "#e8e6e1")
        .text((d) => {
          const n = d as { name?: string };
          return n.name ?? "";
        });

      g.append("g")
        .selectAll("text.flow")
        .data(graph.links)
        .join("text")
        .attr("class", "flow")
        .attr("x", (d) => {
          const s = d.source as { x1?: number };
          const t = d.target as { x0?: number };
          return ((s.x1 ?? 0) + (t.x0 ?? 0)) / 2;
        })
        .attr("y", (d) => {
          const s = d.source as { y0?: number; y1?: number };
          return ((s.y0 ?? 0) + (s.y1 ?? 0)) / 2;
        })
        .attr("dy", "-6")
        .attr("text-anchor", "middle")
        .attr("font-size", 8)
        .attr("fill", "#8b949e")
        .text((_d, i) => (i === 0 ? "Capital out" : "Revenue in"));
    }

    draw();
    roRef.current = new ResizeObserver(draw);
    roRef.current.observe(svgEl.parentElement!);
    return () => roRef.current?.disconnect();
  }, [entry]);

  return <svg ref={ref} className="block w-full" role="img" aria-label="Capital flow Sankey" />;
}

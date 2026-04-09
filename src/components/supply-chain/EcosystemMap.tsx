"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as d3 from "d3";
import {
  NODES,
  EDGES,
  TIER_COLORS,
  EDGE_COLORS,
} from "@/lib/ecosystemData";
import type { EcoNode, EdgeType } from "@/lib/ecosystemData";
import PowerTierBadge from "@/components/research/PowerTierBadge";
import AiCompanyList from "@/components/research/AiCompanyList";
import {
  getLordDisplayName,
  isHighTetherDependency,
} from "@/lib/tiers";
import {
  getSupplyChainForEcosystemNode,
  buildSupplyChainViewHref,
  type SupplyChainMatch,
} from "@/lib/supplyChainLookup";
import SupplyChainCrossLinkSection from "@/components/supply-chain/SupplyChainCrossLinkSection";
import { useDependencyGraph } from "@/lib/useDependencyGraph";
import ComputeReservePanel from "@/components/research/ComputeReservePanel";
import RevolvingDoorBadge from "@/components/revenue-loop/RevolvingDoorBadge";
import RevenueLoopDrawer from "@/components/revenue-loop/RevenueLoopDrawer";
import { OrganicRevenueProvider } from "@/lib/revenue-loop-context";
import RevenueLoopDashboardBand from "@/components/revenue-loop/RevenueLoopDashboardBand";
import type { RevenueLoopEntry, RevenueLoopsFile } from "@/lib/revenueLoopTypes";
import { X } from "lucide-react";

// D3 augments nodes/edges with simulation coordinates
type SimNode = EcoNode & d3.SimulationNodeDatum;
interface SimEdge extends d3.SimulationLinkDatum<SimNode> {
  type: EdgeType;
  label: string;
}

interface TooltipState {
  x: number;
  y: number;
  node: EcoNode;
}

const NODE_RADIUS = 28;
const LABEL_OFFSET = NODE_RADIUS + 14;

function EdgeTypeBadge({ type }: { type: EdgeType }) {
  const color = EDGE_COLORS[type];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      {type}
    </span>
  );
}

function DetailPanel({
  node,
  onClose,
  onNavigate,
  hasRoundTrip,
  onRevolvingDoorClick,
}: {
  node: EcoNode;
  onClose: () => void;
  onNavigate: (companyId: string) => void;
  hasRoundTrip: boolean;
  onRevolvingDoorClick: () => void;
}) {
  const { upstream, downstream } = useDependencyGraph(node.id);
  const supplyMatch = getSupplyChainForEcosystemNode(node);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-base text-foreground">{node.displayName}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <PowerTierBadge tier={node.tier} />
            {hasRoundTrip && (
              <RevolvingDoorBadge onClick={onRevolvingDoorClick} />
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted hover:text-foreground transition-colors p-0.5 shrink-0"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted uppercase tracking-wide font-medium">
          Infrastructure Self-Ownership
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${node.selfOwnership}%`,
                background: TIER_COLORS[node.tier],
              }}
            />
          </div>
          <span className="text-sm font-mono text-foreground">
            {node.selfOwnership}%
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted uppercase tracking-wide font-medium">
          Primary Dependency
        </p>
        <p className="text-sm text-foreground">{node.primaryDependency}</p>
      </div>

      {node.tier === "vassal" && (
        <div className="space-y-2 rounded-lg border border-border bg-background/60 px-3 py-2.5">
          <p className="text-xs text-muted uppercase tracking-wide font-medium">
            Tether score
          </p>
          <p className="text-sm text-foreground">
            <span className="font-mono font-semibold">{node.tetherScore}%</span>
            <span className="text-muted"> of compute from </span>
            <span className="font-medium">
              {getLordDisplayName(node.primaryLordId)}
            </span>
          </p>
          {isHighTetherDependency(node.tetherScore) && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium leading-snug">
              High single-vendor dependency
            </p>
          )}
        </div>
      )}

      {supplyMatch && (
        <SupplyChainCrossLinkSection match={supplyMatch} compact />
      )}

      {upstream.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted uppercase tracking-wide font-medium">
            Depends On
          </p>
          <div className="space-y-1.5">
            {upstream.map((e) => {
              const target = NODES.find((n) => n.id === e.target);
              return (
                <div
                  key={`${e.source}-${e.target}`}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="text-foreground">{target?.displayName ?? e.target}</span>
                  <EdgeTypeBadge type={e.type} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {downstream.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted uppercase tracking-wide font-medium">
            Relied Upon By
          </p>
          <div className="space-y-1.5">
            {downstream.map((e) => {
              const source = NODES.find((n) => n.id === e.source);
              return (
                <div
                  key={`${e.source}-${e.target}`}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="text-foreground">{source?.displayName ?? e.source}</span>
                  <EdgeTypeBadge type={e.type} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {upstream.length === 0 && downstream.length === 0 && (
        <p className="text-sm text-muted italic">No direct dependency edges.</p>
      )}

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Compute Reserve panel — stat cards + ranking chart */}
      <ComputeReservePanel
        companyId={node.id}
        onNavigate={onNavigate}
        showRanking
      />
    </div>
  );
}

function EcosystemMapInner() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimEdge> | null>(null);

  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [selectedNode, setSelectedNode] = useState<EcoNode | null>(null);
  const [loopsFile, setLoopsFile] = useState<RevenueLoopsFile | null>(null);
  const [roundTripIds, setRoundTripIds] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoops, setDrawerLoops] = useState<RevenueLoopEntry[]>([]);

  const roundTripDepKey = useMemo(
    () => [...roundTripIds].sort().join(","),
    [roundTripIds]
  );

  useEffect(() => {
    fetch("/data/revenue-loops.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((f: RevenueLoopsFile | null) => {
        if (!f?.loops) return;
        setLoopsFile(f);
        const s = new Set<string>();
        for (const l of f.loops) {
          if (!l.roundTripDetected) continue;
          s.add(l.investeeId);
          s.add(l.investorId);
        }
        setRoundTripIds(s);
      })
      .catch(() => {});
  }, []);

  const openRevenueDrawer = useCallback(
    (companyId: string) => {
      if (!loopsFile) return;
      const loops = loopsFile.loops.filter(
        (l) =>
          l.roundTripDetected &&
          (l.investeeId === companyId || l.investorId === companyId)
      );
      setDrawerLoops(loops);
      setDrawerOpen(loops.length > 0);
    },
    [loopsFile]
  );

  const openRevenueDrawerRef = useRef(openRevenueDrawer);
  openRevenueDrawerRef.current = openRevenueDrawer;

  const supplyChainNavigateRef = useRef<(m: SupplyChainMatch) => void>(
    () => {}
  );
  supplyChainNavigateRef.current = (m) => {
    router.push(buildSupplyChainViewHref(m));
  };

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ w: width, h: height });
    });
    ro.observe(el);
    // Trigger initial measurement
    const { width, height } = el.getBoundingClientRect();
    setDimensions({ w: width, h: height });
    return () => ro.disconnect();
  }, []);

  const handleDeselect = useCallback(() => {
    setSelectedNode(null);
    setTooltip(null);
  }, []);

  // Build / rebuild the graph whenever dimensions change
  useEffect(() => {
    const { w, h } = dimensions;
    if (w === 0 || h === 0 || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Stop any previous simulation
    simRef.current?.stop();

    // ── Deep-copy nodes so D3 can annotate with x/y/vx/vy ──
    const simNodes: SimNode[] = NODES.map((n) => ({ ...n }));
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));

    const simEdges: SimEdge[] = EDGES.map((e) => ({
      ...e,
      source: nodeById.get(e.source) as SimNode,
      target: nodeById.get(e.target) as SimNode,
    }));

    // ── Arrow-head markers, one per edge type ──
    const defs = svg.append("defs");
    (Object.entries(EDGE_COLORS) as [EdgeType, string][]).forEach(
      ([type, color]) => {
        defs
          .append("marker")
          .attr("id", `arrow-${type}`)
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", NODE_RADIUS + 12)
          .attr("refY", 0)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M0,-5L10,0L0,5")
          .attr("fill", color);

        // Dimmed variant for non-selected state
        defs
          .append("marker")
          .attr("id", `arrow-${type}-dim`)
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", NODE_RADIUS + 12)
          .attr("refY", 0)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M0,-5L10,0L0,5")
          .attr("fill", color)
          .attr("opacity", 0.25);
      }
    );

    const rootG = svg.append("g");

    // ── Zoom / pan ──
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 3])
      .on("zoom", (event) => {
        rootG.attr("transform", event.transform);
      });
    svg.call(zoom);

    // ── Links ──
    const linkG = rootG.append("g").attr("class", "links");
    const linkSel = linkG
      .selectAll<SVGLineElement, SimEdge>("line")
      .data(simEdges)
      .join("line")
      .attr("stroke", (d) => EDGE_COLORS[d.type])
      .attr("stroke-width", 1.8)
      .attr("stroke-opacity", 0.55)
      .attr("marker-end", (d) => `url(#arrow-${d.type})`);

    // ── Edge labels (hidden until a node is selected) ──
    const edgeLabelSel = rootG
      .append("g")
      .attr("class", "edge-labels")
      .selectAll<SVGTextElement, SimEdge>("text")
      .data(simEdges)
      .join("text")
      .text((d) => d.label)
      .attr("font-size", 10)
      .attr("fill", (d) => EDGE_COLORS[d.type])
      .attr("text-anchor", "middle")
      .attr("dy", "-4")
      .attr("opacity", 0)
      .attr("pointer-events", "none");

    // ── Nodes ──
    const nodeG = rootG.append("g").attr("class", "nodes");
    const nodeSel = nodeG
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Outer glow ring (appears on select)
    nodeSel
      .append("circle")
      .attr("r", NODE_RADIUS + 6)
      .attr("fill", "none")
      .attr("stroke", (d) => TIER_COLORS[d.tier])
      .attr("stroke-width", 2)
      .attr("opacity", 0)
      .attr("class", "node-ring");

    // Main circle
    nodeSel
      .append("circle")
      .attr("r", NODE_RADIUS)
      .attr("fill", (d) => `${TIER_COLORS[d.tier]}22`)
      .attr("stroke", (d) => TIER_COLORS[d.tier])
      .attr("stroke-width", 2);

    // Label below node
    nodeSel
      .append("text")
      .text((d) => d.displayName)
      .attr("text-anchor", "middle")
      .attr("dy", LABEL_OFFSET)
      .attr("font-size", 11)
      .attr("fill", "#e8e6e1")
      .attr("font-family", "var(--font-sans-pro, sans-serif)")
      .attr("pointer-events", "none");

    // Tier initial (letter inside node)
    nodeSel
      .append("text")
      .text((d) => d.displayName[0])
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", 15)
      .attr("font-weight", "600")
      .attr("fill", (d) => TIER_COLORS[d.tier])
      .attr("pointer-events", "none");

    // Revolving-door badge (round-trip detected)
    nodeSel.each(function drawRevolvingBadge(d: SimNode) {
      if (!roundTripIds.has(d.id)) return;
      const g = d3.select(this);
      const bx = NODE_RADIUS * 0.55;
      const by = -NODE_RADIUS - 4;
      const badgeG = g
        .append("g")
        .attr("class", "revolving-door-icon")
        .style("cursor", "pointer")
        .on("click", (event: MouseEvent) => {
          event.stopPropagation();
          openRevenueDrawerRef.current(d.id);
        });
      badgeG
        .append("circle")
        .attr("cx", bx)
        .attr("cy", by)
        .attr("r", 9)
        .attr("fill", "#450a0a")
        .attr("stroke", "#dc2626")
        .attr("stroke-width", 1.5);
      badgeG
        .append("text")
        .attr("x", bx)
        .attr("y", by)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .attr("font-weight", "700")
        .attr("fill", "#fecaca")
        .attr("pointer-events", "none")
        .text("!");
    });

    // Supply-chain layer badge (data from supply-chain-layers.json)
    nodeSel.each(function drawSupplyChainLayerBadge(d: SimNode) {
      const match = getSupplyChainForEcosystemNode(d);
      if (!match) return;
      const g = d3.select(this);
      const by = NODE_RADIUS + 11;
      const label = match.layerId;
      const w = Math.max(28, label.length * 7 + 10);
      const badgeG = g
        .append("g")
        .attr("class", "supply-chain-layer-badge")
        .style("cursor", "pointer")
        .on("click", (event: MouseEvent) => {
          event.stopPropagation();
          supplyChainNavigateRef.current(match);
        });
      badgeG
        .append("rect")
        .attr("x", -w / 2)
        .attr("y", by - 8)
        .attr("width", w)
        .attr("height", 15)
        .attr("rx", 4)
        .attr("fill", match.dotColor)
        .attr("stroke", "rgba(255,255,255,0.22)")
        .attr("stroke-width", 1);
      badgeG
        .append("text")
        .attr("x", 0)
        .attr("y", by)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("font-size", 9)
        .attr("font-weight", "700")
        .attr("font-family", "var(--font-mono-pro, ui-monospace, monospace)")
        .attr("fill", "#0c0e14")
        .attr("pointer-events", "none")
        .text(label);
    });

    // ── Interactions ──
    nodeSel
      .on("mouseover", (event: MouseEvent, d: SimNode) => {
        const rect = (
          svgRef.current as SVGSVGElement
        ).getBoundingClientRect();
        const containerRect = containerRef.current!.getBoundingClientRect();
        const pt = d3
          .select(svgRef.current)
          .node()!
          .createSVGPoint();
        pt.x = event.clientX;
        pt.y = event.clientY;
        const svgPt = pt.matrixTransform(
          (svgRef.current as SVGSVGElement).getScreenCTM()!.inverse()
        );
        setTooltip({
          x: event.clientX - containerRect.left,
          y: event.clientY - containerRect.top,
          node: d,
        });
        void rect; // suppress unused warning
        void svgPt;
      })
      .on("mousemove", (event: MouseEvent) => {
        const containerRect = containerRef.current!.getBoundingClientRect();
        setTooltip((prev) =>
          prev
            ? {
                ...prev,
                x: event.clientX - containerRect.left,
                y: event.clientY - containerRect.top,
              }
            : null
        );
      })
      .on("mouseleave", () => {
        setTooltip(null);
      })
      .on("click", (_event: MouseEvent, d: SimNode) => {
        const isSame = selectedNode?.id === d.id;

        if (isSame) {
          // Deselect
          setSelectedNode(null);
          linkSel
            .transition()
            .duration(300)
            .attr("stroke-opacity", 0.55)
            .attr("marker-end", (ed) => `url(#arrow-${ed.type})`);
          edgeLabelSel.transition().duration(200).attr("opacity", 0);
          nodeSel
            .select(".node-ring")
            .transition()
            .duration(300)
            .attr("opacity", 0);
          nodeSel.select("circle:nth-child(2)").transition().duration(300).attr("stroke-width", 2);
        } else {
          setSelectedNode(d);

          // Highlight connected edges, dim the rest
          linkSel
            .transition()
            .duration(300)
            .attr("stroke-opacity", (ed) => {
              const src =
                typeof ed.source === "object"
                  ? (ed.source as SimNode).id
                  : ed.source;
              const tgt =
                typeof ed.target === "object"
                  ? (ed.target as SimNode).id
                  : ed.target;
              return src === d.id || tgt === d.id ? 1 : 0.08;
            })
            .attr("stroke-width", (ed) => {
              const src =
                typeof ed.source === "object"
                  ? (ed.source as SimNode).id
                  : ed.source;
              const tgt =
                typeof ed.target === "object"
                  ? (ed.target as SimNode).id
                  : ed.target;
              return src === d.id || tgt === d.id ? 2.5 : 1.8;
            });

          edgeLabelSel
            .transition()
            .duration(300)
            .attr("opacity", (ed) => {
              const src =
                typeof ed.source === "object"
                  ? (ed.source as SimNode).id
                  : ed.source;
              const tgt =
                typeof ed.target === "object"
                  ? (ed.target as SimNode).id
                  : ed.target;
              return src === d.id || tgt === d.id ? 1 : 0;
            });

          // Glow ring on selected node, dim rings on others
          nodeSel
            .select(".node-ring")
            .transition()
            .duration(300)
            .attr("opacity", (nd) => (nd.id === d.id ? 0.7 : 0));
        }
      });

    // Click on SVG background = deselect
    svg.on("click", (event) => {
      if ((event.target as Element).tagName === "svg") {
        setSelectedNode(null);
        linkSel
          .transition()
          .duration(300)
          .attr("stroke-opacity", 0.55)
          .attr("stroke-width", 1.8);
        edgeLabelSel.transition().duration(200).attr("opacity", 0);
        nodeSel
          .select(".node-ring")
          .transition()
          .duration(300)
          .attr("opacity", 0);
      }
    });

    // ── Force simulation ──
    const sim = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimEdge>(simEdges)
          .id((d) => d.id)
          .distance(160)
          .strength(0.6)
      )
      .force("charge", d3.forceManyBody<SimNode>().strength(-600))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force(
        "collide",
        d3.forceCollide<SimNode>(NODE_RADIUS + 30)
      );

    simRef.current = sim;

    sim.on("tick", () => {
      linkSel
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);

      edgeLabelSel
        .attr(
          "x",
          (d) =>
            (((d.source as SimNode).x ?? 0) + ((d.target as SimNode).x ?? 0)) /
            2
        )
        .attr(
          "y",
          (d) =>
            (((d.source as SimNode).y ?? 0) + ((d.target as SimNode).y ?? 0)) /
            2
        );

      nodeSel.attr(
        "transform",
        (d) => `translate(${d.x ?? 0},${d.y ?? 0})`
      );
    });

    return () => {
      sim.stop();
      svg.on("click", null);
      svg.on(".zoom", null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions, roundTripDepKey]);

  // Legend data
  const tierLegend = [
    { tier: "lord" as const, label: "Infrastructure Lords" },
    { tier: "vassal" as const, label: "Value-Add Vassals" },
    { tier: "serf" as const, label: "Retail Serfs" },
  ];
  const edgeLegend = [
    { type: "compute" as const },
    { type: "hardware" as const },
    { type: "equity" as const },
    { type: "distribution" as const },
  ];

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <AiCompanyList />

      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-foreground">AI Ecosystem Map</h2>
        <p className="text-xs text-muted mt-0.5">
          Dependency graph of AI companies, infrastructure providers, and capital
          relationships. Click a node to explore its links.
        </p>
      </div>

      <RevenueLoopDashboardBand showOrganicToggle />

      {/* Main layout */}
      <div className="flex gap-4 min-w-0" style={{ minHeight: "520px" }}>
        {/* Graph */}
        <div
          className="relative flex-1 rounded-xl border border-border bg-card overflow-hidden"
          ref={containerRef}
          style={{ minHeight: "480px" }}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ display: "block" }}
          />

          {/* Hover tooltip */}
          {tooltip &&
            (() => {
              const sc = getSupplyChainForEcosystemNode(tooltip.node);
              return (
            <div
              className="absolute z-10 pointer-events-none"
              style={{
                left: tooltip.x + 16,
                top: tooltip.y - 12,
                maxWidth: 220,
              }}
            >
              <div className="rounded-lg border border-border bg-card shadow-lg px-3 py-2.5 space-y-1.5">
                <p className="font-semibold text-sm text-foreground">
                  {tooltip.node.displayName}
                </p>
                <PowerTierBadge tier={tooltip.node.tier} />
                {sc && (
                  <p className="text-[11px] font-mono text-accent leading-snug">
                    {sc.layerId} — {sc.layerName}
                  </p>
                )}
                <p className="text-xs text-muted">
                  <span className="text-foreground/70">Primary dep:</span>{" "}
                  {tooltip.node.primaryDependency}
                </p>
                <p className="text-xs text-muted">
                  <span className="text-foreground/70">Self-owns:</span>{" "}
                  <span className="font-mono">{tooltip.node.selfOwnership}%</span>{" "}
                  of infra
                </p>
              </div>
            </div>
              );
            })()}

          {/* Legend — bottom-left inside graph */}
          <div className="absolute bottom-3 left-3 flex flex-col gap-3 pointer-events-none">
            <div className="rounded-lg border border-border bg-card/90 px-2.5 py-2 space-y-1">
              <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
                Tier
              </p>
              {tierLegend.map(({ tier, label }) => (
                <div key={tier} className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: TIER_COLORS[tier] }}
                  />
                  <span className="text-[11px] text-foreground/80">{label}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-border bg-card/90 px-2.5 py-2 space-y-1">
              <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
                Edge Type
              </p>
              {edgeLegend.map(({ type }) => (
                <div key={type} className="flex items-center gap-1.5">
                  <span
                    className="w-5 h-0.5 shrink-0 rounded"
                    style={{ background: EDGE_COLORS[type] }}
                  />
                  <span className="text-[11px] text-foreground/80 capitalize">
                    {type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Zoom hint */}
          <p className="absolute top-2 right-3 text-[10px] text-muted pointer-events-none">
            Scroll to zoom · Drag to pan/move nodes
          </p>
        </div>

        {/* Detail panel */}
        {selectedNode && (
          <div className="w-72 shrink-0 rounded-xl border border-border bg-card px-4 py-4 overflow-y-auto">
            <DetailPanel
              node={selectedNode}
              onClose={handleDeselect}
              onNavigate={(id) => {
                const found = NODES.find((n) => n.id === id);
                if (found) setSelectedNode(found);
              }}
              hasRoundTrip={roundTripIds.has(selectedNode.id)}
              onRevolvingDoorClick={() => openRevenueDrawer(selectedNode.id)}
            />
          </div>
        )}
      </div>

      <RevenueLoopDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        loops={drawerLoops}
        title="Revenue loop"
      />
    </div>
  );
}

export default function EcosystemMap() {
  return (
    <OrganicRevenueProvider>
      <EcosystemMapInner />
    </OrganicRevenueProvider>
  );
}

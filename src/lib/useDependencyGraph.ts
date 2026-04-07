import { useMemo } from "react";
import { EDGES, NODES } from "@/lib/ecosystemData";
import type { EcoEdge, EcoNode } from "@/lib/ecosystemData";

export interface DependencyLinks {
  /** Edges where this company is the source (outgoing dependencies). */
  upstream: EcoEdge[];
  /** Edges where this company is the target (incoming dependencies). */
  downstream: EcoEdge[];
  /** Resolved node objects for upstream targets. */
  upstreamNodes: EcoNode[];
  /** Resolved node objects for downstream sources. */
  downstreamNodes: EcoNode[];
}

/**
 * Returns the upstream and downstream dependency links for a given company ID.
 * Upstream  = edges originating FROM this company  (things it depends on).
 * Downstream = edges pointing TO this company (things that depend on it).
 */
export function useDependencyGraph(companyId: string): DependencyLinks {
  return useMemo(() => {
    const upstream = EDGES.filter((e) => e.source === companyId);
    const downstream = EDGES.filter((e) => e.target === companyId);

    const nodeMap = new Map(NODES.map((n) => [n.id, n]));

    const upstreamNodes = upstream
      .map((e) => nodeMap.get(e.target))
      .filter((n): n is EcoNode => n !== undefined);

    const downstreamNodes = downstream
      .map((e) => nodeMap.get(e.source))
      .filter((n): n is EcoNode => n !== undefined);

    return { upstream, downstream, upstreamNodes, downstreamNodes };
  }, [companyId]);
}

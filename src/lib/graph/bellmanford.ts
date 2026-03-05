import type { Graph } from './types';
import type { AlgorithmStep } from './algorithm';
import { edgeKey } from './algorithm';

/**
 * Clone a step snapshot.
 */
function snap(
	description: string,
	activeVertices: Set<number>,
	visitedVertices: Set<number>,
	frontierVertices: Set<number>,
	activeEdges: Set<string>,
	treeEdges: Set<string>,
	data: Record<string, (string | number | null)[]>
): AlgorithmStep {
	return {
		description,
		activeVertices: new Set(activeVertices),
		visitedVertices: new Set(visitedVertices),
		frontierVertices: new Set(frontierVertices),
		activeEdges: new Set(activeEdges),
		treeEdges: new Set(treeEdges),
		data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, [...v]]))
	};
}

/**
 * Run Bellman-Ford shortest-path algorithm from a source vertex.
 *
 * Algorithm:
 *   1. Set dist[source] = 0, all others ∞.
 *   2. Repeat |V| - 1 times:
 *      For each edge (u, v) with weight w:
 *        if dist[u] + w < dist[v], update dist[v] = dist[u] + w, prev[v] = u.
 *   3. One more pass to detect negative-weight cycles:
 *      If any edge can still be relaxed, a negative cycle exists.
 *
 * Handles negative edge weights (unlike Dijkstra's).
 *
 * Outputs tracked: dist[], prev[]
 */
export function runBellmanFord(graph: Graph, startVertex: number): AlgorithmStep[] {
	const steps: AlgorithmStep[] = [];
	const n = graph.vertices.length;

	const label = (v: number) => graph.vertices[v].label;

	// Build edge list with weights (including reverse for undirected)
	const edges: { u: number; v: number; w: number }[] = [];
	for (const edge of graph.edges) {
		const w = edge.weight ?? 1;
		edges.push({ u: edge.source, v: edge.target, w });
		if (!graph.directed) {
			edges.push({ u: edge.target, v: edge.source, w });
		}
	}

	// Algorithm state
	const dist: (number | null)[] = new Array(n).fill(null); // null = ∞
	const prev: (number | null)[] = new Array(n).fill(null);

	// Visualization state
	const activeVertices = new Set<number>();
	const visitedVertices = new Set<number>();
	const frontierVertices = new Set<number>();
	const activeEdges = new Set<string>();
	const treeEdges = new Set<string>();

	function getData(): Record<string, (string | number | null)[]> {
		return {
			dist: dist.map((v) => v ?? '∞'),
			prev: prev.map((v) => (v !== null ? label(v) : '-'))
		};
	}

	// Initial step
	steps.push(
		snap(
			`Initialize Bellman-Ford from ${label(startVertex)}. All distances set to ∞.`,
			activeVertices,
			visitedVertices,
			frontierVertices,
			activeEdges,
			treeEdges,
			getData()
		)
	);

	// Set source distance
	dist[startVertex] = 0;
	visitedVertices.add(startVertex);

	steps.push(
		snap(
			`Set dist[${label(startVertex)}] = 0.`,
			activeVertices,
			visitedVertices,
			frontierVertices,
			activeEdges,
			treeEdges,
			getData()
		)
	);

	// Main loop: |V| - 1 iterations
	for (let i = 1; i < n; i++) {
		let anyRelaxed = false;

		steps.push(
			snap(
				`Begin iteration ${i} of ${n - 1}. Scan all edges for possible relaxations.`,
				activeVertices,
				visitedVertices,
				frontierVertices,
				activeEdges,
				treeEdges,
				getData()
			)
		);

		for (const { u, v, w } of edges) {
			if (dist[u] === null) continue; // source not yet reached

			const ek = edgeKey(u, v);
			activeEdges.clear();
			activeEdges.add(ek);
			activeVertices.clear();
			activeVertices.add(u);
			activeVertices.add(v);

			const newDist = dist[u]! + w;
			if (dist[v] === null || newDist < dist[v]!) {
				const oldDist = dist[v] ?? '∞';
				dist[v] = newDist;
				prev[v] = u;
				visitedVertices.add(v);
				frontierVertices.add(v);
				anyRelaxed = true;

				// Update tree edges
				for (const te of treeEdges) {
					if (te.endsWith(`-${v}`)) {
						treeEdges.delete(te);
						break;
					}
				}
				treeEdges.add(ek);

				steps.push(
					snap(
						`Relax ${label(u)} → ${label(v)}: dist ${oldDist} → ${newDist} (weight ${w}).`,
						activeVertices,
						visitedVertices,
						frontierVertices,
						activeEdges,
						treeEdges,
						getData()
					)
				);
			}
		}

		activeVertices.clear();
		activeEdges.clear();

		if (!anyRelaxed) {
			steps.push(
				snap(
					`Iteration ${i}: no edges relaxed. Algorithm can terminate early.`,
					activeVertices,
					visitedVertices,
					frontierVertices,
					activeEdges,
					treeEdges,
					getData()
				)
			);
			break;
		} else {
			frontierVertices.clear();
			steps.push(
				snap(
					`Iteration ${i} complete. Some distances were updated.`,
					activeVertices,
					visitedVertices,
					frontierVertices,
					activeEdges,
					treeEdges,
					getData()
				)
			);
		}
	}

	// Negative cycle detection: one more pass
	let hasNegativeCycle = false;
	for (const { u, v, w } of edges) {
		if (dist[u] === null) continue;
		const newDist = dist[u]! + w;
		if (dist[v] === null || newDist < dist[v]!) {
			hasNegativeCycle = true;
			activeEdges.clear();
			activeEdges.add(edgeKey(u, v));
			activeVertices.clear();
			activeVertices.add(u);
			activeVertices.add(v);

			steps.push(
				snap(
					`Negative cycle detected! Edge ${label(u)} → ${label(v)} can still be relaxed (${dist[v] ?? '∞'} → ${newDist}).`,
					activeVertices,
					visitedVertices,
					frontierVertices,
					activeEdges,
					treeEdges,
					getData()
				)
			);
			break;
		}
	}

	// Final step
	activeVertices.clear();
	activeEdges.clear();
	frontierVertices.clear();

	if (hasNegativeCycle) {
		steps.push(
			snap(
				'Bellman-Ford complete. Negative-weight cycle detected — shortest paths are undefined.',
				activeVertices,
				visitedVertices,
				frontierVertices,
				activeEdges,
				treeEdges,
				getData()
			)
		);
	} else {
		const reachable = dist.filter((d) => d !== null).length;
		const unreachable = n - reachable;

		steps.push(
			snap(
				`Bellman-Ford complete from ${label(startVertex)}. ${reachable} vertex(es) reachable${unreachable > 0 ? `, ${unreachable} unreachable` : ''}. No negative cycles.`,
				activeVertices,
				visitedVertices,
				frontierVertices,
				activeEdges,
				treeEdges,
				getData()
			)
		);
	}

	return steps;
}

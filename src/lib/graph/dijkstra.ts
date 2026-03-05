import type { Graph } from './types';
import type { AlgorithmStep } from './algorithm';
import { edgeKey } from './algorithm';

/**
 * Build adjacency list from graph edges with weights.
 */
function buildAdjacency(graph: Graph): Map<number, { neighbor: number; weight: number }[]> {
	const adj = new Map<number, { neighbor: number; weight: number }[]>();
	for (const v of graph.vertices) {
		adj.set(v.id, []);
	}
	for (const edge of graph.edges) {
		const w = edge.weight ?? 1;
		adj.get(edge.source)!.push({ neighbor: edge.target, weight: w });
		if (!graph.directed) {
			adj.get(edge.target)!.push({ neighbor: edge.source, weight: w });
		}
	}
	return adj;
}

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
 * Run Dijkstra's shortest-path algorithm from a source vertex.
 *
 * Algorithm:
 *   1. Set dist[source] = 0, all others ∞.
 *   2. Use a priority queue (min-heap by dist). Extract u with min dist.
 *   3. For each neighbor v of u, relax edge (u, v):
 *      if dist[u] + w(u,v) < dist[v], update dist[v] and prev[v].
 *   4. Mark u as finalized (visited).
 *
 * Note: Dijkstra's requires non-negative edge weights.
 *
 * Outputs tracked: dist[], prev[]
 */
export function runDijkstra(graph: Graph, startVertex: number): AlgorithmStep[] {
	const steps: AlgorithmStep[] = [];
	const n = graph.vertices.length;
	const adj = buildAdjacency(graph);

	const label = (v: number) => graph.vertices[v].label;

	// Algorithm state
	const dist: (number | null)[] = new Array(n).fill(null); // null = ∞
	const prev: (number | null)[] = new Array(n).fill(null);
	const finalized: boolean[] = new Array(n).fill(false);

	// Visualization state
	const activeVertices = new Set<number>();
	const visitedVertices = new Set<number>(); // finalized
	const frontierVertices = new Set<number>(); // in priority queue with finite dist
	const activeEdges = new Set<string>();
	const treeEdges = new Set<string>();

	function getData(): Record<string, (string | number | null)[]> {
		return {
			dist: dist.map((v) => v ?? '∞'),
			prev: prev.map((v) => (v !== null ? label(v) : '-'))
		};
	}

	// Check for negative weights
	const hasNegative = graph.edges.some((e) => (e.weight ?? 1) < 0);
	if (hasNegative) {
		steps.push(
			snap(
				"Warning: Graph contains negative edge weights. Dijkstra's algorithm may produce incorrect results. Consider using Bellman-Ford instead.",
				activeVertices,
				visitedVertices,
				frontierVertices,
				activeEdges,
				treeEdges,
				getData()
			)
		);
	}

	// Initial step
	steps.push(
		snap(
			"Initialize Dijkstra's algorithm. All distances set to ∞.",
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
	frontierVertices.add(startVertex);

	steps.push(
		snap(
			`Set dist[${label(startVertex)}] = 0. Add to priority queue.`,
			activeVertices,
			visitedVertices,
			frontierVertices,
			activeEdges,
			treeEdges,
			getData()
		)
	);

	// Simple priority queue using linear scan (fine for visualization purposes)
	for (let iteration = 0; iteration < n; iteration++) {
		// Find unfinalized vertex with minimum dist
		let u = -1;
		let minDist = Infinity;
		for (let v = 0; v < n; v++) {
			if (!finalized[v] && dist[v] !== null && dist[v]! < minDist) {
				minDist = dist[v]!;
				u = v;
			}
		}

		if (u === -1) break; // remaining vertices are unreachable

		// Extract min
		activeVertices.clear();
		activeVertices.add(u);
		frontierVertices.delete(u);
		finalized[u] = true;
		visitedVertices.add(u);
		activeEdges.clear();

		steps.push(
			snap(
				`Extract min: vertex ${label(u)} with dist = ${dist[u]}. Mark as finalized.`,
				activeVertices,
				visitedVertices,
				frontierVertices,
				activeEdges,
				treeEdges,
				getData()
			)
		);

		// Relax edges
		const neighbors = adj.get(u) || [];
		for (const { neighbor: v, weight: w } of neighbors) {
			if (finalized[v]) continue;

			const ek = edgeKey(u, v);
			activeEdges.clear();
			activeEdges.add(ek);

			const newDist = dist[u]! + w;
			if (dist[v] === null || newDist < dist[v]!) {
				const oldDist = dist[v] ?? '∞';
				dist[v] = newDist;
				prev[v] = u;
				frontierVertices.add(v);

				// Update tree edges — remove old prev edge, add new
				if (prev[v] !== null) {
					// Clear old tree edge for this vertex
					for (const te of treeEdges) {
						if (te.endsWith(`-${v}`)) {
							treeEdges.delete(te);
							break;
						}
					}
				}
				treeEdges.add(ek);
				if (!graph.directed) {
					treeEdges.add(edgeKey(v, u));
				}

				steps.push(
					snap(
						`Relax ${label(u)} → ${label(v)}: dist ${oldDist} → ${newDist} (via weight ${w}). Update prev[${label(v)}] = ${label(u)}.`,
						activeVertices,
						visitedVertices,
						frontierVertices,
						activeEdges,
						treeEdges,
						getData()
					)
				);
			} else {
				steps.push(
					snap(
						`Edge ${label(u)} → ${label(v)}: dist[${label(v)}] = ${dist[v]} ≤ ${newDist}. No improvement.`,
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
	}

	// Final step
	activeVertices.clear();
	activeEdges.clear();

	const reachable = dist.filter((d) => d !== null).length;
	const unreachable = n - reachable;

	steps.push(
		snap(
			`Dijkstra's complete from ${label(startVertex)}. ${reachable} vertex(es) reachable${unreachable > 0 ? `, ${unreachable} unreachable` : ''}.`,
			activeVertices,
			visitedVertices,
			frontierVertices,
			activeEdges,
			treeEdges,
			getData()
		)
	);

	return steps;
}

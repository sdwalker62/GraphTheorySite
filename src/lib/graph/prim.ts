import type { Graph } from './types';
import type { AlgorithmStep } from './algorithm';
import { edgeKey } from './algorithm';

/**
 * Build adjacency list from graph edges with weights (undirected).
 */
function buildAdjacency(graph: Graph): Map<number, { neighbor: number; weight: number }[]> {
	const adj = new Map<number, { neighbor: number; weight: number }[]>();
	for (const v of graph.vertices) {
		adj.set(v.id, []);
	}
	for (const edge of graph.edges) {
		const w = edge.weight ?? 1;
		adj.get(edge.source)!.push({ neighbor: edge.target, weight: w });
		adj.get(edge.target)!.push({ neighbor: edge.source, weight: w });
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
 * Run Prim's MST algorithm on an undirected weighted graph.
 *
 * Algorithm:
 *   1. Start from vertex 0. Set key[0] = 0, all others ∞.
 *   2. While there are vertices not yet in the MST:
 *      a. Extract vertex u with minimum key value (not yet in MST).
 *      b. Add u to MST. If prev[u] exists, add edge (prev[u], u) to tree.
 *      c. For each neighbor v of u not in MST:
 *         if w(u, v) < key[v], update key[v] = w(u, v), prev[v] = u.
 *
 * Outputs tracked: key[] (minimum edge weight to reach each vertex), prev[]
 */
export function runPrim(graph: Graph): AlgorithmStep[] {
	const steps: AlgorithmStep[] = [];
	const n = graph.vertices.length;
	const adj = buildAdjacency(graph);

	const label = (v: number) => graph.vertices[v].label;

	// Algorithm state
	const key: (number | null)[] = new Array(n).fill(null); // null = ∞
	const prev: (number | null)[] = new Array(n).fill(null);
	const inMST: boolean[] = new Array(n).fill(false);
	let mstWeight = 0;

	// Visualization state
	const activeVertices = new Set<number>();
	const visitedVertices = new Set<number>(); // in MST
	const frontierVertices = new Set<number>(); // reachable but not in MST
	const activeEdges = new Set<string>();
	const treeEdges = new Set<string>();

	function getData(): Record<string, (string | number | null)[]> {
		return {
			key: key.map((v) => v ?? '∞'),
			prev: prev.map((v) => (v !== null ? label(v) : '-'))
		};
	}

	// Initial step
	steps.push(
		snap(
			"Initialize Prim's algorithm. All keys set to ∞.",
			activeVertices,
			visitedVertices,
			frontierVertices,
			activeEdges,
			treeEdges,
			getData()
		)
	);

	// Start from vertex 0
	const startVertex = 0;
	key[startVertex] = 0;
	frontierVertices.add(startVertex);

	steps.push(
		snap(
			`Set key[${label(startVertex)}] = 0. Start growing MST from vertex ${label(startVertex)}.`,
			activeVertices,
			visitedVertices,
			frontierVertices,
			activeEdges,
			treeEdges,
			getData()
		)
	);

	for (let iteration = 0; iteration < n; iteration++) {
		// Find vertex with minimum key not yet in MST
		let u = -1;
		let minKey = Infinity;
		for (let v = 0; v < n; v++) {
			if (!inMST[v] && key[v] !== null && key[v]! < minKey) {
				minKey = key[v]!;
				u = v;
			}
		}

		if (u === -1) break; // remaining vertices unreachable

		// Add u to MST
		inMST[u] = true;
		activeVertices.clear();
		activeVertices.add(u);
		frontierVertices.delete(u);
		visitedVertices.add(u);
		activeEdges.clear();

		if (prev[u] !== null) {
			const ek = edgeKey(prev[u]!, u);
			const ekRev = edgeKey(u, prev[u]!);
			treeEdges.add(ek);
			treeEdges.add(ekRev);
			mstWeight += key[u]!;

			steps.push(
				snap(
					`Extract min: vertex ${label(u)} (key = ${key[u]}). Add edge ${label(prev[u]!)}–${label(u)} to MST. Total weight = ${mstWeight}.`,
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
					`Extract min: vertex ${label(u)} (key = ${key[u]}). Add to MST as root.`,
					activeVertices,
					visitedVertices,
					frontierVertices,
					activeEdges,
					treeEdges,
					getData()
				)
			);
		}

		// Update keys of adjacent vertices
		const neighbors = adj.get(u) || [];
		for (const { neighbor: v, weight: w } of neighbors) {
			if (inMST[v]) continue;

			const ek = edgeKey(u, v);
			const ekRev = edgeKey(v, u);
			activeEdges.clear();
			activeEdges.add(ek);
			activeEdges.add(ekRev);

			if (key[v] === null || w < key[v]!) {
				const oldKey = key[v] ?? '∞';
				key[v] = w;
				prev[v] = u;
				frontierVertices.add(v);

				steps.push(
					snap(
						`Edge ${label(u)}–${label(v)} (weight ${w}): key[${label(v)}] updated ${oldKey} → ${w}. prev[${label(v)}] = ${label(u)}.`,
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
						`Edge ${label(u)}–${label(v)} (weight ${w}): key[${label(v)}] = ${key[v]} ≤ ${w}. No improvement.`,
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
	frontierVertices.clear();

	const mstEdgeCount = visitedVertices.size - 1;

	if (visitedVertices.size === n) {
		steps.push(
			snap(
				`Prim's complete. MST has ${mstEdgeCount} edges with total weight ${mstWeight}.`,
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
				`Prim's complete. Graph is disconnected — MST covers ${visitedVertices.size} of ${n} vertices with weight ${mstWeight}.`,
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

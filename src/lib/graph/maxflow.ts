import type { Graph } from './types';
import type { AlgorithmStep } from './algorithm';
import { edgeKey } from './algorithm';

/**
 * Build adjacency list with capacities from graph edges.
 * Edge weights are treated as capacities. Unweighted edges default to capacity 1.
 */
function buildCapacityGraph(graph: Graph): {
	adj: Map<number, number[]>;
	capacity: Map<string, number>;
	n: number;
} {
	const n = graph.vertices.length;
	const adj = new Map<number, number[]>();
	const capacity = new Map<string, number>();

	for (const v of graph.vertices) {
		adj.set(v.id, []);
	}

	for (const edge of graph.edges) {
		const cap = edge.weight ?? 1;
		const ek = edgeKey(edge.source, edge.target);
		const ekRev = edgeKey(edge.target, edge.source);

		// Forward edge
		adj.get(edge.source)!.push(edge.target);
		capacity.set(ek, (capacity.get(ek) ?? 0) + cap);

		// Reverse edge (residual) — add to adjacency but with 0 capacity if not already present
		if (!adj.get(edge.target)!.includes(edge.source)) {
			adj.get(edge.target)!.push(edge.source);
		}
		if (!capacity.has(ekRev)) {
			capacity.set(ekRev, 0);
		}
	}

	return { adj, capacity, n };
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
	data: Record<string, (string | number | null)[]>,
	edgeLabels?: Map<string, string>
): AlgorithmStep {
	return {
		description,
		activeVertices: new Set(activeVertices),
		visitedVertices: new Set(visitedVertices),
		frontierVertices: new Set(frontierVertices),
		activeEdges: new Set(activeEdges),
		treeEdges: new Set(treeEdges),
		data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, [...v]])),
		edgeLabels: edgeLabels ? new Map(edgeLabels) : undefined
	};
}

/**
 * Find an augmenting path from source to sink using DFS.
 * Returns the path as an array of vertex IDs, or null if no path exists.
 */
function dfsPath(
	adj: Map<number, number[]>,
	residual: Map<string, number>,
	source: number,
	sink: number,
	n: number
): number[] | null {
	const visited = new Array(n).fill(false);
	const parent = new Array(n).fill(-1);
	const stack: number[] = [source];
	visited[source] = true;

	while (stack.length > 0) {
		const u = stack.pop()!;
		if (u === sink) {
			// Reconstruct path
			const path: number[] = [];
			let curr = sink;
			while (curr !== source) {
				path.unshift(curr);
				curr = parent[curr];
			}
			path.unshift(source);
			return path;
		}

		for (const v of adj.get(u) || []) {
			const ek = edgeKey(u, v);
			if (!visited[v] && (residual.get(ek) ?? 0) > 0) {
				visited[v] = true;
				parent[v] = u;
				stack.push(v);
			}
		}
	}

	return null;
}

/**
 * Find an augmenting path from source to sink using BFS (shortest path).
 * Returns the path as an array of vertex IDs, or null if no path exists.
 */
function bfsPath(
	adj: Map<number, number[]>,
	residual: Map<string, number>,
	source: number,
	sink: number,
	n: number
): number[] | null {
	const visited = new Array(n).fill(false);
	const parent = new Array(n).fill(-1);
	const queue: number[] = [source];
	visited[source] = true;

	while (queue.length > 0) {
		const u = queue.shift()!;
		for (const v of adj.get(u) || []) {
			const ek = edgeKey(u, v);
			if (!visited[v] && (residual.get(ek) ?? 0) > 0) {
				visited[v] = true;
				parent[v] = u;
				if (v === sink) {
					// Reconstruct path
					const path: number[] = [];
					let curr = sink;
					while (curr !== source) {
						path.unshift(curr);
						curr = parent[curr];
					}
					path.unshift(source);
					return path;
				}
				queue.push(v);
			}
		}
	}

	return null;
}

/**
 * Core max-flow algorithm shared by Ford-Fulkerson and Edmonds-Karp.
 * The only difference is the path-finding strategy (DFS vs BFS).
 */
function maxFlow(
	graph: Graph,
	source: number,
	sink: number,
	useBFS: boolean
): AlgorithmStep[] {
	const steps: AlgorithmStep[] = [];
	const { adj, capacity, n } = buildCapacityGraph(graph);
	const label = (v: number) => graph.vertices[v].label;
	const algoName = useBFS ? 'Edmonds-Karp' : 'Ford-Fulkerson';

	// Residual capacities (start equal to original capacities)
	const residual = new Map<string, number>(capacity);

	// Flow on each edge
	const flow = new Map<string, number>();
	for (const ek of capacity.keys()) {
		flow.set(ek, 0);
	}

	let totalFlow = 0;

	// Visualization state
	const activeVertices = new Set<number>();
	const visitedVertices = new Set<number>();
	const frontierVertices = new Set<number>();
	const activeEdges = new Set<string>();
	const treeEdges = new Set<string>(); // edges carrying flow

	function getData(): Record<string, (string | number | null)[]> {
		// Show flow/capacity for each edge connected to each vertex
		const flowArr: (string | number | null)[] = graph.vertices.map(() => '-');
		return {
			'max flow': graph.vertices.map(() => (totalFlow as number)),
		};
	}

	function getFlowData(): Record<string, (string | number | null)[]> {
		// Build a per-vertex view: for each vertex, show net flow in/out
		const netFlow: (string | number | null)[] = graph.vertices.map((_, vid) => {
			let inFlow = 0;
			let outFlow = 0;
			for (const edge of graph.edges) {
				const ek = edgeKey(edge.source, edge.target);
				if (edge.target === vid) inFlow += flow.get(ek) ?? 0;
				if (edge.source === vid) outFlow += flow.get(ek) ?? 0;
			}
			if (vid === source) return `+${outFlow}`;
			if (vid === sink) return `+${inFlow}`;
			return inFlow;
		});
		return {
			'net flow': netFlow,
			'total flow': graph.vertices.map(() => totalFlow as number)
		};
	}

	/** Build edge labels showing flow/capacity for each original edge. */
	function getEdgeLabels(): Map<string, string> {
		const labels = new Map<string, string>();
		for (const edge of graph.edges) {
			const ek = edgeKey(edge.source, edge.target);
			const f = flow.get(ek) ?? 0;
			const cap = edge.weight ?? 1;
			labels.set(ek, `${f}/${cap}`);
		}
		return labels;
	}

	/** Convenience wrapper that always includes edge labels. */
	function flowSnap(
		description: string,
		data: Record<string, (string | number | null)[]>
	): AlgorithmStep {
		return snap(
			description,
			activeVertices, visitedVertices, frontierVertices, activeEdges, treeEdges,
			data,
			getEdgeLabels()
		);
	}

	// Validate source and sink
	if (source === sink) {
		steps.push(
			snap(
				'Error: Source and sink must be different vertices.',
				activeVertices, visitedVertices, frontierVertices, activeEdges, treeEdges,
				{}
			)
		);
		return steps;
	}

	// Initial step
	steps.push(flowSnap(
		`Initialize ${algoName}. Source: ${label(source)}, Sink: ${label(sink)}. All flows start at 0.`,
		getFlowData()
	));

	let iteration = 0;
	const maxIterations = 10000; // safety limit

	while (iteration < maxIterations) {
		iteration++;

		// Find augmenting path
		activeVertices.clear();
		activeEdges.clear();
		visitedVertices.clear();
		frontierVertices.clear();

		activeVertices.add(source);
		steps.push(flowSnap(
			`Iteration ${iteration}: Search for augmenting path from ${label(source)} to ${label(sink)} using ${useBFS ? 'BFS' : 'DFS'}.`,
			getFlowData()
		));

		const path = useBFS
			? bfsPath(adj, residual, source, sink, n)
			: dfsPath(adj, residual, source, sink, n);

		if (!path) {
			activeVertices.clear();
			steps.push(flowSnap(
				`No augmenting path found. ${algoName} terminates. Maximum flow = ${totalFlow}.`,
				getFlowData()
			));
			break;
		}

		// Show the augmenting path
		activeVertices.clear();
		activeEdges.clear();
		for (const v of path) {
			frontierVertices.add(v);
		}
		const pathEdges: string[] = [];
		for (let i = 0; i < path.length - 1; i++) {
			const ek = edgeKey(path[i], path[i + 1]);
			activeEdges.add(ek);
			pathEdges.push(ek);
		}

		// Find bottleneck (minimum residual capacity along path)
		let bottleneck = Infinity;
		for (let i = 0; i < path.length - 1; i++) {
			const ek = edgeKey(path[i], path[i + 1]);
			bottleneck = Math.min(bottleneck, residual.get(ek) ?? 0);
		}

		const pathStr = path.map((v) => label(v)).join(' → ');
		steps.push(flowSnap(
			`Found augmenting path: ${pathStr}. Bottleneck capacity = ${bottleneck}.`,
			getFlowData()
		));

		// Update residual graph and flow
		for (let i = 0; i < path.length - 1; i++) {
			const u = path[i];
			const v = path[i + 1];
			const ek = edgeKey(u, v);
			const ekRev = edgeKey(v, u);

			// Update residual
			residual.set(ek, (residual.get(ek) ?? 0) - bottleneck);
			residual.set(ekRev, (residual.get(ekRev) ?? 0) + bottleneck);

			// Update flow: if this is a forward edge in the original graph, add flow.
			// If it's a reverse edge, subtract flow from the forward direction.
			const isForwardEdge = graph.edges.some(
				(e) => e.source === u && e.target === v
			);
			if (isForwardEdge) {
				flow.set(ek, (flow.get(ek) ?? 0) + bottleneck);
			} else {
				// Reverse edge — reduce flow on the forward direction
				flow.set(ekRev, (flow.get(ekRev) ?? 0) - bottleneck);
			}
		}

		totalFlow += bottleneck;

		// Update tree edges (edges carrying positive flow)
		treeEdges.clear();
		for (const edge of graph.edges) {
			const ek = edgeKey(edge.source, edge.target);
			if ((flow.get(ek) ?? 0) > 0) {
				treeEdges.add(ek);
			}
		}

		// Highlight the path vertices as active
		activeVertices.clear();
		for (const v of path) {
			activeVertices.add(v);
		}
		frontierVertices.clear();

		steps.push(flowSnap(
			`Push ${bottleneck} units of flow along path. Total flow = ${totalFlow}.`,
			getFlowData()
		));
	}

	// Final state: show all flow-carrying edges
	activeVertices.clear();
	activeEdges.clear();
	frontierVertices.clear();

	// Mark source and sink
	activeVertices.add(source);
	activeVertices.add(sink);

	// Mark all vertices reachable from source in residual graph (min-cut)
	const reachable = new Set<number>();
	const cutStack = [source];
	const cutVisited = new Array(n).fill(false);
	cutVisited[source] = true;
	while (cutStack.length > 0) {
		const u = cutStack.pop()!;
		reachable.add(u);
		for (const v of adj.get(u) || []) {
			const ek = edgeKey(u, v);
			if (!cutVisited[v] && (residual.get(ek) ?? 0) > 0) {
				cutVisited[v] = true;
				cutStack.push(v);
			}
		}
	}

	// Edges in the min-cut
	const cutEdges: string[] = [];
	for (const edge of graph.edges) {
		if (reachable.has(edge.source) && !reachable.has(edge.target)) {
			cutEdges.push(`${label(edge.source)}→${label(edge.target)}`);
			activeEdges.add(edgeKey(edge.source, edge.target));
		}
	}

	for (const v of reachable) visitedVertices.add(v);

	steps.push(flowSnap(
		`${algoName} complete. Max flow = ${totalFlow}. Min-cut edges: ${cutEdges.length > 0 ? cutEdges.join(', ') : 'none'}.`,
		getFlowData()
	));

	return steps;
}

/**
 * Run Ford-Fulkerson max-flow algorithm (DFS-based augmenting paths).
 *
 * Algorithm:
 *   1. Build residual graph from capacities.
 *   2. While there exists an augmenting s→t path in the residual graph (using DFS):
 *      a. Find the bottleneck (min residual capacity on the path).
 *      b. Update residual capacities and flow along the path.
 *   3. Return total flow and flow per edge.
 *
 * Runtime: O(mC) where C is the max flow value.
 */
export function runFordFulkerson(graph: Graph, source: number, sink: number): AlgorithmStep[] {
	return maxFlow(graph, source, sink, false);
}

/**
 * Run Edmonds-Karp max-flow algorithm (BFS-based augmenting paths).
 *
 * Same as Ford-Fulkerson but uses BFS to find shortest augmenting paths,
 * guaranteeing polynomial runtime.
 *
 * Runtime: O(nm²)
 */
export function runEdmondsKarp(graph: Graph, source: number, sink: number): AlgorithmStep[] {
	return maxFlow(graph, source, sink, true);
}

import type { Graph } from './types';
import type { AlgorithmStep } from './algorithm';
import { edgeKey } from './algorithm';

/**
 * Build adjacency list from graph edges.
 */
function buildAdjacency(graph: Graph): Map<number, { neighbor: number; edgeIndex: number }[]> {
	const adj = new Map<number, { neighbor: number; edgeIndex: number }[]>();
	for (const v of graph.vertices) {
		adj.set(v.id, []);
	}
	graph.edges.forEach((edge, idx) => {
		adj.get(edge.source)!.push({ neighbor: edge.target, edgeIndex: idx });
		if (!graph.directed) {
			adj.get(edge.target)!.push({ neighbor: edge.source, edgeIndex: idx });
		}
	});
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
 * Run BFS on the given graph from a starting vertex, recording every step.
 * Returns an array of AlgorithmStep snapshots.
 *
 * Outputs tracked: dist[], prev[]
 */
export function runBFS(graph: Graph, startVertex: number): AlgorithmStep[] {
	const steps: AlgorithmStep[] = [];
	const n = graph.vertices.length;
	const adj = buildAdjacency(graph);

	// Algorithm state
	const dist: (number | null)[] = new Array(n).fill(null);
	const prev: (number | null)[] = new Array(n).fill(null);

	// Visualization state
	const activeVertices = new Set<number>();
	const visitedVertices = new Set<number>();
	const frontierVertices = new Set<number>(); // queue contents
	const activeEdges = new Set<string>();
	const treeEdges = new Set<string>();

	function getData(): Record<string, (string | number | null)[]> {
		return {
			'dist': dist.map((v) => v ?? '∞'),
			'prev': prev.map((v) => (v !== null ? graph.vertices[v].label : '-'))
		};
	}

	// Initial step
	steps.push(
		snap(
			'Initialize BFS. All distances set to ∞.',
			activeVertices,
			visitedVertices,
			frontierVertices,
			activeEdges,
			treeEdges,
			getData()
		)
	);

	// Initialize start vertex
	dist[startVertex] = 0;
	visitedVertices.add(startVertex);
	frontierVertices.add(startVertex);

	steps.push(
		snap(
			`Set dist[${graph.vertices[startVertex].label}] = 0. Enqueue vertex ${graph.vertices[startVertex].label}.`,
			activeVertices,
			visitedVertices,
			frontierVertices,
			activeEdges,
			treeEdges,
			getData()
		)
	);

	// BFS queue
	const queue: number[] = [startVertex];

	while (queue.length > 0) {
		const v = queue.shift()!;
		frontierVertices.delete(v);
		activeVertices.clear();
		activeVertices.add(v);
		activeEdges.clear();

		steps.push(
			snap(
				`Dequeue vertex ${graph.vertices[v].label} (dist = ${dist[v]}). Process neighbors.`,
				activeVertices,
				visitedVertices,
				frontierVertices,
				activeEdges,
				treeEdges,
				getData()
			)
		);

		const neighbors = adj.get(v) || [];
		for (const { neighbor: u } of neighbors) {
			const ek = edgeKey(v, u);
			activeEdges.clear();
			activeEdges.add(ek);

			if (dist[u] === null) {
				dist[u] = dist[v]! + 1;
				prev[u] = v;
				queue.push(u);
				visitedVertices.add(u);
				frontierVertices.add(u);
				treeEdges.add(ek);
				if (!graph.directed) {
					treeEdges.add(edgeKey(u, v));
				}

				steps.push(
					snap(
						`Vertex ${graph.vertices[v].label} → ${graph.vertices[u].label}: unvisited. dist[${graph.vertices[u].label}] = ${dist[u]}, prev[${graph.vertices[u].label}] = ${graph.vertices[v].label}. Enqueue.`,
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
						`Vertex ${graph.vertices[v].label} → ${graph.vertices[u].label}: already visited (dist = ${dist[u]}), skip.`,
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

		activeVertices.delete(v);
	}

	// Final step
	activeEdges.clear();
	activeVertices.clear();

	const reachable = dist.filter((d) => d !== null).length;
	const unreachable = n - reachable;

	steps.push(
		snap(
			`BFS complete. ${reachable} vertex(es) reachable from ${graph.vertices[startVertex].label}${unreachable > 0 ? `, ${unreachable} unreachable` : ''}.`,
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

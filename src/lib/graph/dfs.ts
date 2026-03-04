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
 * Clone a step snapshot so each step captures independent state.
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
 * Run DFS on the given graph, recording every step for visualization.
 * Returns an array of AlgorithmStep snapshots.
 *
 * Outputs tracked: visited[], prev[], pre[], post[], ccnum[]
 */
export function runDFS(graph: Graph, startVertex?: number): AlgorithmStep[] {
	const steps: AlgorithmStep[] = [];
	const n = graph.vertices.length;
	const adj = buildAdjacency(graph);

	// Algorithm state
	const visited: boolean[] = new Array(n).fill(false);
	const prev: (number | null)[] = new Array(n).fill(null);
	const pre: (number | null)[] = new Array(n).fill(null);
	const post: (number | null)[] = new Array(n).fill(null);
	const ccnum: (number | null)[] = new Array(n).fill(null);

	let clock = 1;
	let cc = 0;

	// Visualization state
	const activeVertices = new Set<number>();
	const visitedVertices = new Set<number>();
	const frontierVertices = new Set<number>(); // stack contents
	const activeEdges = new Set<string>();
	const treeEdges = new Set<string>();

	function getData(): Record<string, (string | number | null)[]> {
		return {
			'pre': pre.map((v) => v ?? '-'),
			'post': post.map((v) => v ?? '-'),
			'prev': prev.map((v) => (v !== null ? graph.vertices[v].label : '-')),
			'ccnum': ccnum.map((v) => v ?? '-')
		};
	}

	// Initial step
	steps.push(
		snap(
			'Initialize DFS. All vertices unvisited.',
			activeVertices,
			visitedVertices,
			frontierVertices,
			activeEdges,
			treeEdges,
			getData()
		)
	);

	// Determine vertex processing order
	const vertexOrder: number[] = [];
	if (startVertex !== undefined && startVertex >= 0 && startVertex < n) {
		vertexOrder.push(startVertex);
		for (let i = 0; i < n; i++) {
			if (i !== startVertex) vertexOrder.push(i);
		}
	} else {
		for (let i = 0; i < n; i++) vertexOrder.push(i);
	}

	function explore(v: number) {
		visited[v] = true;
		pre[v] = clock++;
		ccnum[v] = cc;
		activeVertices.add(v);
		visitedVertices.add(v);
		frontierVertices.delete(v);

		steps.push(
			snap(
				`Explore vertex ${graph.vertices[v].label}: pre[${graph.vertices[v].label}] = ${pre[v]}, ccnum = ${cc}`,
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

			if (!visited[u]) {
				prev[u] = v;
				treeEdges.add(ek);
				// Also add reverse for undirected
				if (!graph.directed) {
					treeEdges.add(edgeKey(u, v));
				}
				frontierVertices.add(u);

				steps.push(
					snap(
						`Vertex ${graph.vertices[v].label} → ${graph.vertices[u].label}: unvisited, traverse tree edge. prev[${graph.vertices[u].label}] = ${graph.vertices[v].label}`,
						activeVertices,
						visitedVertices,
						frontierVertices,
						activeEdges,
						treeEdges,
						getData()
					)
				);

				explore(u);
			} else {
				steps.push(
					snap(
						`Vertex ${graph.vertices[v].label} → ${graph.vertices[u].label}: already visited, skip (back/cross/forward edge).`,
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

		activeEdges.clear();
		post[v] = clock++;
		activeVertices.delete(v);

		steps.push(
			snap(
				`Finish vertex ${graph.vertices[v].label}: post[${graph.vertices[v].label}] = ${post[v]}`,
				activeVertices,
				visitedVertices,
				frontierVertices,
				activeEdges,
				treeEdges,
				getData()
			)
		);
	}

	for (const v of vertexOrder) {
		if (!visited[v]) {
			cc++;

			steps.push(
				snap(
					`Start new connected component ${cc} from vertex ${graph.vertices[v].label}.`,
					activeVertices,
					visitedVertices,
					frontierVertices,
					activeEdges,
					treeEdges,
					getData()
				)
			);

			explore(v);
		}
	}

	// Final step
	activeEdges.clear();
	steps.push(
		snap(
			`DFS complete. Found ${cc} connected component(s).`,
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

import type { Graph } from './types';
import type { AlgorithmStep } from './algorithm';
import { edgeKey } from './algorithm';

/**
 * Build adjacency list from graph edges (directed only).
 */
function buildAdjacency(graph: Graph): Map<number, number[]> {
	const adj = new Map<number, number[]>();
	for (const v of graph.vertices) {
		adj.set(v.id, []);
	}
	for (const edge of graph.edges) {
		adj.get(edge.source)!.push(edge.target);
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
 * Run DFS-based topological sort on a directed acyclic graph.
 *
 * Algorithm:
 *   1. Run DFS on the graph, recording pre and post (finish) numbers.
 *   2. The reverse post-order gives the topological ordering.
 *      (Vertex that finishes last gets position 1.)
 *
 * Outputs tracked: pre[], post[], order[] (topological position from reverse post-order).
 */
export function runTopoSort(graph: Graph): AlgorithmStep[] {
	const steps: AlgorithmStep[] = [];
	const n = graph.vertices.length;
	const adj = buildAdjacency(graph);

	const label = (v: number) => graph.vertices[v].label;

	// Algorithm state
	const pre: (number | null)[] = new Array(n).fill(null);
	const post: (number | null)[] = new Array(n).fill(null);
	const order: (number | null)[] = new Array(n).fill(null);
	const visited: boolean[] = new Array(n).fill(false);

	let clock = 1;
	const finishOrder: number[] = []; // vertices in order of increasing post number

	// Visualization state
	const activeVertices = new Set<number>();
	const visitedVertices = new Set<number>();
	const frontierVertices = new Set<number>(); // DFS stack
	const activeEdges = new Set<string>();
	const treeEdges = new Set<string>();

	function getData(): Record<string, (string | number | null)[]> {
		return {
			pre: pre.map((v) => v ?? '-'),
			post: post.map((v) => v ?? '-'),
			order: order.map((v) => v ?? '-')
		};
	}

	// Initial step
	steps.push(
		snap(
			'Initialize DFS-based topological sort. All vertices unvisited.',
			activeVertices,
			visitedVertices,
			frontierVertices,
			activeEdges,
			treeEdges,
			getData()
		)
	);

	function explore(v: number) {
		visited[v] = true;
		pre[v] = clock++;
		activeVertices.add(v);
		visitedVertices.add(v);
		frontierVertices.delete(v);

		steps.push(
			snap(
				`Explore vertex ${label(v)}: pre[${label(v)}] = ${pre[v]}.`,
				activeVertices,
				visitedVertices,
				frontierVertices,
				activeEdges,
				treeEdges,
				getData()
			)
		);

		const neighbors = adj.get(v) || [];
		for (const u of neighbors) {
			const ek = edgeKey(v, u);
			activeEdges.clear();
			activeEdges.add(ek);

			if (!visited[u]) {
				treeEdges.add(ek);
				frontierVertices.add(u);

				steps.push(
					snap(
						`${label(v)} → ${label(u)}: unvisited, traverse tree edge.`,
						activeVertices,
						visitedVertices,
						frontierVertices,
						activeEdges,
						treeEdges,
						getData()
					)
				);

				explore(u);
			} else if (post[u] === null) {
				// Back edge — cycle detected (shouldn't happen in a DAG)
				steps.push(
					snap(
						`${label(v)} → ${label(u)}: back edge detected! Graph has a cycle.`,
						activeVertices,
						visitedVertices,
						frontierVertices,
						activeEdges,
						treeEdges,
						getData()
					)
				);
			} else {
				// Forward or cross edge
				steps.push(
					snap(
						`${label(v)} → ${label(u)}: already finished (forward/cross edge), skip.`,
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

		// Finish vertex — record post number
		activeEdges.clear();
		post[v] = clock++;
		finishOrder.push(v);
		activeVertices.delete(v);

		steps.push(
			snap(
				`Finish vertex ${label(v)}: post[${label(v)}] = ${post[v]}.`,
				activeVertices,
				visitedVertices,
				frontierVertices,
				activeEdges,
				treeEdges,
				getData()
			)
		);
	}

	// Run DFS from all unvisited vertices
	for (let v = 0; v < n; v++) {
		if (!visited[v]) {
			if (v > 0) {
				steps.push(
					snap(
						`Vertex ${label(v)} is unvisited — start new DFS from ${label(v)}.`,
						activeVertices,
						visitedVertices,
						frontierVertices,
						activeEdges,
						treeEdges,
						getData()
					)
				);
			}
			explore(v);
		}
	}

	// Compute topological order from reverse post-order
	// Vertex with highest post number gets position 1
	let position = 1;
	for (let i = finishOrder.length - 1; i >= 0; i--) {
		order[finishOrder[i]] = position++;
	}

	// Show order assignment step
	activeVertices.clear();
	activeEdges.clear();

	steps.push(
		snap(
			'DFS complete. Compute topological order as reverse post-order (highest post → position 1).',
			activeVertices,
			visitedVertices,
			frontierVertices,
			activeEdges,
			treeEdges,
			getData()
		)
	);

	// Final step — show the sorted order
	const sorted = graph.vertices
		.map((v, i) => ({ label: v.label, pos: order[i]! }))
		.sort((a, b) => a.pos - b.pos)
		.map((v) => v.label)
		.join(' → ');

	steps.push(
		snap(
			`Topological sort complete. Order: ${sorted}.`,
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

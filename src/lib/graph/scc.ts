import type { Graph } from './types';
import type { AlgorithmStep } from './algorithm';
import { edgeKey } from './algorithm';

/**
 * Build adjacency list from graph edges.
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
 * Build reverse adjacency list (transpose graph).
 */
function buildReverseAdjacency(graph: Graph): Map<number, number[]> {
	const adj = new Map<number, number[]>();
	for (const v of graph.vertices) {
		adj.set(v.id, []);
	}
	for (const edge of graph.edges) {
		adj.get(edge.target)!.push(edge.source);
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
 * Run Kosaraju's SCC algorithm on a directed graph, recording every step.
 *
 * Kosaraju's algorithm:
 *   Phase 1 – Run DFS on G and record post-order (finish times).
 *   Phase 2 – Build G^R (reverse graph).
 *   Phase 3 – Run DFS on G^R, processing vertices in decreasing post-order.
 *             Each DFS tree in this phase is one SCC.
 *
 * Outputs tracked: post[] (from phase 1), scc[] (component assignment).
 */
export function runSCC(graph: Graph): AlgorithmStep[] {
	const steps: AlgorithmStep[] = [];
	const n = graph.vertices.length;
	const adj = buildAdjacency(graph);
	const radj = buildReverseAdjacency(graph);

	const label = (v: number) => graph.vertices[v].label;

	// Algorithm state
	const post: (number | null)[] = new Array(n).fill(null);
	const scc: (number | null)[] = new Array(n).fill(null);

	// Visualization state
	const activeVertices = new Set<number>();
	const visitedVertices = new Set<number>();
	const frontierVertices = new Set<number>();
	const activeEdges = new Set<string>();
	const treeEdges = new Set<string>();

	function getData(): Record<string, (string | number | null)[]> {
		return {
			post: post.map((v) => v ?? '-'),
			scc: scc.map((v) => v ?? '-')
		};
	}

	// ===== PHASE 1: DFS on original graph for post-order =====

	steps.push(
		snap(
			'Phase 1: Run DFS on G to compute finish times (post-order).',
			activeVertices,
			visitedVertices,
			frontierVertices,
			activeEdges,
			treeEdges,
			getData()
		)
	);

	const visited1: boolean[] = new Array(n).fill(false);
	let clock = 1;
	const finishOrder: number[] = []; // vertices in order of increasing post number

	function dfsPhase1(v: number) {
		visited1[v] = true;
		activeVertices.add(v);
		visitedVertices.add(v);

		steps.push(
			snap(
				`Phase 1: Explore vertex ${label(v)}.`,
				activeVertices,
				visitedVertices,
				frontierVertices,
				activeEdges,
				treeEdges,
				getData()
			)
		);

		for (const u of adj.get(v) || []) {
			if (!visited1[u]) {
				const ek = edgeKey(v, u);
				activeEdges.clear();
				activeEdges.add(ek);
				treeEdges.add(ek);

				steps.push(
					snap(
						`Phase 1: ${label(v)} → ${label(u)}: traverse tree edge.`,
						activeVertices,
						visitedVertices,
						frontierVertices,
						activeEdges,
						treeEdges,
						getData()
					)
				);

				dfsPhase1(u);
			}
		}

		activeEdges.clear();
		post[v] = clock++;
		finishOrder.push(v);
		activeVertices.delete(v);

		steps.push(
			snap(
				`Phase 1: Finish vertex ${label(v)}: post[${label(v)}] = ${post[v]}.`,
				activeVertices,
				visitedVertices,
				frontierVertices,
				activeEdges,
				treeEdges,
				getData()
			)
		);
	}

	for (let v = 0; v < n; v++) {
		if (!visited1[v]) {
			dfsPhase1(v);
		}
	}

	// ===== PHASE 2: Prepare reverse graph =====

	activeVertices.clear();
	visitedVertices.clear();
	frontierVertices.clear();
	activeEdges.clear();
	treeEdges.clear();

	steps.push(
		snap(
			'Phase 2: Build reverse graph G^R. All edges are reversed.',
			activeVertices,
			visitedVertices,
			frontierVertices,
			activeEdges,
			treeEdges,
			getData()
		)
	);

	// ===== PHASE 3: DFS on reversed graph in decreasing post-order =====

	steps.push(
		snap(
			'Phase 3: Run DFS on G^R in decreasing post-order. Each DFS tree = one SCC.',
			activeVertices,
			visitedVertices,
			frontierVertices,
			activeEdges,
			treeEdges,
			getData()
		)
	);

	const visited2: boolean[] = new Array(n).fill(false);
	let sccCount = 0;

	function dfsPhase3(v: number) {
		visited2[v] = true;
		scc[v] = sccCount;
		activeVertices.add(v);
		visitedVertices.add(v);

		steps.push(
			snap(
				`Phase 3: Visit ${label(v)} → assign to SCC ${sccCount}.`,
				activeVertices,
				visitedVertices,
				frontierVertices,
				activeEdges,
				treeEdges,
				getData()
			)
		);

		for (const u of radj.get(v) || []) {
			if (!visited2[u]) {
				// In the reverse graph, the edge is u→v in G, shown as v→u in G^R
				// Highlight the original edge u→v
				const ek = edgeKey(u, v);
				activeEdges.clear();
				activeEdges.add(ek);
				treeEdges.add(ek);

				steps.push(
					snap(
						`Phase 3: ${label(v)} →(G^R) ${label(u)}: traverse reversed edge, assign to SCC ${sccCount}.`,
						activeVertices,
						visitedVertices,
						frontierVertices,
						activeEdges,
						treeEdges,
						getData()
					)
				);

				dfsPhase3(u);
			}
		}

		activeEdges.clear();
		activeVertices.delete(v);
	}

	// Process in decreasing post-order (reverse of finishOrder)
	for (let i = finishOrder.length - 1; i >= 0; i--) {
		const v = finishOrder[i];
		if (!visited2[v]) {
			sccCount++;

			steps.push(
				snap(
					`Phase 3: Start new SCC ${sccCount} from vertex ${label(v)} (post = ${post[v]}).`,
					activeVertices,
					visitedVertices,
					frontierVertices,
					activeEdges,
					treeEdges,
					getData()
				)
			);

			dfsPhase3(v);
		}
	}

	// Final step
	activeEdges.clear();
	activeVertices.clear();

	steps.push(
		snap(
			`SCC complete. Found ${sccCount} strongly connected component(s).`,
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

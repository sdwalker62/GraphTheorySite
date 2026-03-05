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
 * Union-Find (Disjoint Set Union) data structure for Kruskal's algorithm.
 */
class UnionFind {
	parent: number[];
	rank: number[];

	constructor(n: number) {
		this.parent = Array.from({ length: n }, (_, i) => i);
		this.rank = new Array(n).fill(0);
	}

	find(x: number): number {
		if (this.parent[x] !== x) {
			this.parent[x] = this.find(this.parent[x]);
		}
		return this.parent[x];
	}

	union(a: number, b: number): boolean {
		const ra = this.find(a);
		const rb = this.find(b);
		if (ra === rb) return false;
		if (this.rank[ra] < this.rank[rb]) {
			this.parent[ra] = rb;
		} else if (this.rank[ra] > this.rank[rb]) {
			this.parent[rb] = ra;
		} else {
			this.parent[rb] = ra;
			this.rank[ra]++;
		}
		return true;
	}
}

/**
 * Run Kruskal's MST algorithm on an undirected weighted graph.
 *
 * Algorithm:
 *   1. Sort all edges by weight (ascending).
 *   2. Initialize Union-Find with each vertex in its own set.
 *   3. For each edge in sorted order:
 *      - If the endpoints are in different components, add edge to MST and union them.
 *      - Otherwise skip (would create a cycle).
 *   4. Stop when MST has |V| - 1 edges.
 *
 * Outputs tracked: component[] (which component each vertex belongs to), MST weight.
 */
export function runKruskal(graph: Graph): AlgorithmStep[] {
	const steps: AlgorithmStep[] = [];
	const n = graph.vertices.length;

	const label = (v: number) => graph.vertices[v].label;

	// Sort edges by weight
	const sortedEdges = graph.edges
		.map((e, i) => ({ ...e, index: i }))
		.sort((a, b) => (a.weight ?? 1) - (b.weight ?? 1));

	const uf = new UnionFind(n);
	let mstWeight = 0;
	let mstEdgeCount = 0;

	// Visualization state
	const activeVertices = new Set<number>();
	const visitedVertices = new Set<number>();
	const frontierVertices = new Set<number>();
	const activeEdges = new Set<string>();
	const treeEdges = new Set<string>();

	function getData(): Record<string, (string | number | null)[]> {
		return {
			component: Array.from({ length: n }, (_, i) => uf.find(i))
		};
	}

	// Initial step
	const edgeList = sortedEdges
		.map((e) => `${label(e.source)}-${label(e.target)}(${e.weight ?? 1})`)
		.join(', ');

	steps.push(
		snap(
			`Initialize Kruskal's. Sort ${sortedEdges.length} edges by weight: ${edgeList}.`,
			activeVertices,
			visitedVertices,
			frontierVertices,
			activeEdges,
			treeEdges,
			getData()
		)
	);

	// Process edges in sorted order
	for (const edge of sortedEdges) {
		const u = edge.source;
		const v = edge.target;
		const w = edge.weight ?? 1;
		const ek = edgeKey(u, v);
		const ekRev = edgeKey(v, u);

		activeEdges.clear();
		activeEdges.add(ek);
		activeEdges.add(ekRev);
		activeVertices.clear();
		activeVertices.add(u);
		activeVertices.add(v);

		const compU = uf.find(u);
		const compV = uf.find(v);

		if (compU !== compV) {
			// Add to MST
			uf.union(u, v);
			mstWeight += w;
			mstEdgeCount++;
			treeEdges.add(ek);
			treeEdges.add(ekRev);
			visitedVertices.add(u);
			visitedVertices.add(v);

			steps.push(
				snap(
					`Edge ${label(u)}–${label(v)} (weight ${w}): different components (${compU} ≠ ${compV}). Add to MST. Total weight = ${mstWeight}.`,
					activeVertices,
					visitedVertices,
					frontierVertices,
					activeEdges,
					treeEdges,
					getData()
				)
			);

			if (mstEdgeCount === n - 1) {
				// MST is complete
				break;
			}
		} else {
			// Skip — would create a cycle
			frontierVertices.add(u);
			frontierVertices.add(v);

			steps.push(
				snap(
					`Edge ${label(u)}–${label(v)} (weight ${w}): same component (${compU}). Skip — would create cycle.`,
					activeVertices,
					visitedVertices,
					frontierVertices,
					activeEdges,
					treeEdges,
					getData()
				)
			);

			frontierVertices.delete(u);
			frontierVertices.delete(v);
		}
	}

	// Final step
	activeVertices.clear();
	activeEdges.clear();
	frontierVertices.clear();

	if (mstEdgeCount === n - 1) {
		steps.push(
			snap(
				`Kruskal's complete. MST has ${mstEdgeCount} edges with total weight ${mstWeight}.`,
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
				`Kruskal's complete. Graph is disconnected — found spanning forest with ${mstEdgeCount} edges, total weight ${mstWeight}.`,
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

import type { GraphConfig } from '$lib/stores/graphStore';
import type { Graph, Edge, Vertex } from './types';
import { layoutGraph } from './layout';

/**
 * Union-Find data structure for cycle detection in undirected graphs
 * and connectivity enforcement.
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

	connected(a: number, b: number): boolean {
		return this.find(a) === this.find(b);
	}
}

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function randomWeight(): number {
	return Math.floor(Math.random() * 20) + 1;
}

/**
 * Generate a random simple graph based on the provided configuration.
 *
 * Constraints enforced:
 * - No self-loops
 * - No multi-edges
 * - Respects directed/undirected setting
 * - Respects weighted/unweighted setting
 * - If acyclic (allowCycles=false): generates a DAG (directed) or forest/tree (undirected)
 * - Produces a connected graph when possible
 */
export function generateGraph(config: GraphConfig): Graph {
	const n = config.vertexCount;
	const { directed, weighted, allowCycles } = config;

	// Determine target edge count based on density
	// For sparse-to-moderate graphs: roughly 1.5n edges, but capped by max possible
	const maxEdges = directed ? n * (n - 1) : (n * (n - 1)) / 2;
	const acyclicMax = directed ? (n * (n - 1)) / 2 : n - 1; // DAG or tree
	const effectiveMax = allowCycles ? maxEdges : acyclicMax;

	// Target: between n-1 (connected) and ~2n edges for reasonable density
	const targetEdges = Math.min(
		Math.max(n - 1, Math.floor(n * 1.5 + Math.random() * n * 0.5)),
		effectiveMax
	);

	let edges: Edge[];

	if (!allowCycles && !directed) {
		// Undirected acyclic = forest/tree. Build a spanning tree.
		edges = generateTree(n, weighted);
	} else if (!allowCycles && directed) {
		// DAG: use topological ordering
		edges = generateDAG(n, targetEdges, weighted);
	} else {
		// General graph (may contain cycles)
		edges = generateGeneralGraph(n, targetEdges, directed, weighted);
	}

	// Create vertices with initial positions (will be laid out properly)
	const vertices: Vertex[] = Array.from({ length: n }, (_, i) => ({
		id: i,
		label: String(i + 1),
		x: 0,
		y: 0
	}));

	const graph: Graph = { vertices, edges, directed, weighted };

	// Apply force-directed layout
	layoutGraph(graph);

	return graph;
}

/**
 * Generate a random spanning tree (undirected, acyclic, connected).
 */
function generateTree(n: number, weighted: boolean): Edge[] {
	const edges: Edge[] = [];
	const vertices = shuffle(Array.from({ length: n }, (_, i) => i));

	// Build tree by connecting each vertex to a random previously-added vertex
	for (let i = 1; i < n; i++) {
		const parent = vertices[Math.floor(Math.random() * i)];
		const child = vertices[i];
		edges.push({
			source: Math.min(parent, child),
			target: Math.max(parent, child),
			weight: weighted ? randomWeight() : null
		});
	}

	return edges;
}

/**
 * Generate a random DAG using topological ordering.
 * Vertices are ordered 0..n-1; edges only go from lower to higher index.
 */
function generateDAG(n: number, targetEdges: number, weighted: boolean): Edge[] {
	const edges: Edge[] = [];
	const edgeSet = new Set<string>();

	// First ensure connectivity with a spanning path in topological order
	const order = shuffle(Array.from({ length: n }, (_, i) => i));

	for (let i = 0; i < n - 1; i++) {
		const u = order[i];
		const v = order[i + 1];
		// Edge always goes from earlier in topological order to later
		const key = `${u}-${v}`;
		edgeSet.add(key);
		edges.push({ source: u, target: v, weight: weighted ? randomWeight() : null });
	}

	// Add more random forward edges
	const allPossible: [number, number][] = [];
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			const key = `${order[i]}-${order[j]}`;
			if (!edgeSet.has(key)) {
				allPossible.push([order[i], order[j]]);
			}
		}
	}

	const shuffled = shuffle(allPossible);
	const extraEdges = Math.min(targetEdges - edges.length, shuffled.length);
	for (let i = 0; i < extraEdges; i++) {
		const [u, v] = shuffled[i];
		edges.push({ source: u, target: v, weight: weighted ? randomWeight() : null });
	}

	return edges;
}

/**
 * Generate a general graph that may contain cycles.
 * First builds a spanning tree for connectivity, then adds random edges.
 */
function generateGeneralGraph(
	n: number,
	targetEdges: number,
	directed: boolean,
	weighted: boolean
): Edge[] {
	const edges: Edge[] = [];
	const edgeSet = new Set<string>();
	const uf = new UnionFind(n);

	function edgeKey(u: number, v: number): string {
		if (!directed) {
			return `${Math.min(u, v)}-${Math.max(u, v)}`;
		}
		return `${u}-${v}`;
	}

	function addEdge(u: number, v: number): boolean {
		const key = edgeKey(u, v);
		if (edgeSet.has(key)) return false;
		// For undirected, also check reverse
		if (directed && edgeSet.has(edgeKey(v, u))) {
			// Allow both directions in directed graphs
		}
		edgeSet.add(key);
		edges.push({ source: u, target: v, weight: weighted ? randomWeight() : null });
		return true;
	}

	// Build spanning tree for connectivity
	const vertices = shuffle(Array.from({ length: n }, (_, i) => i));
	for (let i = 1; i < n; i++) {
		const parent = vertices[Math.floor(Math.random() * i)];
		const child = vertices[i];
		uf.union(parent, child);
		if (directed) {
			// Random direction
			if (Math.random() < 0.5) {
				addEdge(parent, child);
			} else {
				addEdge(child, parent);
			}
		} else {
			addEdge(parent, child);
		}
	}

	// Add random extra edges
	const allPossible: [number, number][] = [];
	for (let i = 0; i < n; i++) {
		for (let j = 0; j < n; j++) {
			if (i === j) continue; // no self-loops
			if (!directed && j <= i) continue; // undirected: avoid duplicates
			const key = edgeKey(i, j);
			if (!edgeSet.has(key)) {
				allPossible.push([i, j]);
			}
		}
	}

	const shuffled = shuffle(allPossible);
	const extraEdges = Math.min(targetEdges - edges.length, shuffled.length);
	for (let i = 0; i < extraEdges; i++) {
		addEdge(shuffled[i][0], shuffled[i][1]);
	}

	return edges;
}

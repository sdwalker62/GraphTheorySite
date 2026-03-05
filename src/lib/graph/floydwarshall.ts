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
 * Run Floyd-Warshall all-pairs shortest path algorithm.
 *
 * Algorithm:
 *   1. Initialize dist[i][j] from edge weights (0 on diagonal, ∞ if no edge).
 *   2. For each intermediate vertex k = 0..n-1:
 *        For each pair (i, j):
 *          if dist[i][k] + dist[k][j] < dist[i][j]:
 *            dist[i][j] = dist[i][k] + dist[k][j]
 *
 * The data table shows dist[i][*] as rows for each source i.
 *
 * Outputs tracked: dist matrix rows (one row per source vertex).
 */
export function runFloydWarshall(graph: Graph): AlgorithmStep[] {
	const steps: AlgorithmStep[] = [];
	const n = graph.vertices.length;

	const label = (v: number) => graph.vertices[v].label;

	// Initialize distance matrix
	const INF = Infinity;
	const dist: number[][] = Array.from({ length: n }, () => new Array(n).fill(INF));
	const next: (number | null)[][] = Array.from({ length: n }, () => new Array(n).fill(null));

	// Diagonal = 0
	for (let i = 0; i < n; i++) {
		dist[i][i] = 0;
	}

	// Fill from edges
	for (const edge of graph.edges) {
		const w = edge.weight ?? 1;
		dist[edge.source][edge.target] = w;
		next[edge.source][edge.target] = edge.target;
		if (!graph.directed) {
			dist[edge.target][edge.source] = w;
			next[edge.target][edge.source] = edge.source;
		}
	}

	// Visualization state
	const activeVertices = new Set<number>();
	const visitedVertices = new Set<number>();
	const frontierVertices = new Set<number>();
	const activeEdges = new Set<string>();
	const treeEdges = new Set<string>();

	function getData(): Record<string, (string | number | null)[]> {
		// Show dist matrix — each row is "from X" with values to each vertex
		const data: Record<string, (string | number | null)[]> = {};
		for (let i = 0; i < n; i++) {
			data[`d[${label(i)}]`] = dist[i].map((v) => (v === INF ? '∞' : v));
		}
		return data;
	}

	// Initial step
	steps.push(
		snap(
			'Initialize Floyd-Warshall. Distance matrix set from edge weights. d[i][i] = 0, no-edge = ∞.',
			activeVertices,
			visitedVertices,
			frontierVertices,
			activeEdges,
			treeEdges,
			getData()
		)
	);

	// Main triple loop
	for (let k = 0; k < n; k++) {
		activeVertices.clear();
		activeVertices.add(k);
		frontierVertices.clear();
		activeEdges.clear();

		steps.push(
			snap(
				`Intermediate vertex k = ${label(k)}. Check all pairs (i, j) for shorter path through ${label(k)}.`,
				activeVertices,
				visitedVertices,
				frontierVertices,
				activeEdges,
				treeEdges,
				getData()
			)
		);

		let anyUpdated = false;

		for (let i = 0; i < n; i++) {
			if (dist[i][k] === INF) continue; // no path i→k, skip entire row

			for (let j = 0; j < n; j++) {
				if (dist[k][j] === INF) continue; // no path k→j
				if (i === j) continue;

				const through_k = dist[i][k] + dist[k][j];
				if (through_k < dist[i][j]) {
					const oldDist = dist[i][j] === INF ? '∞' : dist[i][j];
					dist[i][j] = through_k;
					next[i][j] = next[i][k];
					anyUpdated = true;

					activeEdges.clear();
					// Highlight i→k and k→j edges conceptually
					if (i !== k) activeEdges.add(edgeKey(i, k));
					if (k !== j) activeEdges.add(edgeKey(k, j));
					frontierVertices.clear();
					frontierVertices.add(i);
					frontierVertices.add(j);

					steps.push(
						snap(
							`d[${label(i)}][${label(j)}]: ${oldDist} → ${through_k} via ${label(k)} (d[${label(i)}][${label(k)}]=${dist[i][k]} + d[${label(k)}][${label(j)}]=${dist[k][j]}).`,
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

		visitedVertices.add(k);
		frontierVertices.clear();
		activeEdges.clear();

		if (!anyUpdated) {
			steps.push(
				snap(
					`Intermediate vertex ${label(k)}: no improvements found.`,
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

	// Check for negative cycles (diagonal < 0)
	let hasNegativeCycle = false;
	for (let i = 0; i < n; i++) {
		if (dist[i][i] < 0) {
			hasNegativeCycle = true;
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
				'Floyd-Warshall complete. Negative-weight cycle detected (some d[i][i] < 0).',
				activeVertices,
				visitedVertices,
				frontierVertices,
				activeEdges,
				treeEdges,
				getData()
			)
		);
	} else {
		const pairCount = n * (n - 1);
		const reachablePairs = dist.flat().filter((d, idx) => idx % (n + 1) !== 0 && d !== INF).length;

		steps.push(
			snap(
				`Floyd-Warshall complete. ${reachablePairs}/${pairCount} vertex pairs are reachable.`,
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

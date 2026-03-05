import type { Clause, Literal, ImplicationGraph, TwoSatResult } from '$lib/stores/twoSatStore';
import type { AlgorithmStep } from './algorithm';
import { edgeKey } from './algorithm';

/**
 * Convert literal to vertex index in the implication graph.
 * Variable i (0-based): x_i = 2*i, ¬x_i = 2*i + 1
 */
function litToVertex(lit: Literal): number {
	return lit.negated ? 2 * lit.variable + 1 : 2 * lit.variable;
}

/**
 * Get the negation vertex of a literal vertex.
 */
function negVertex(v: number): number {
	return v % 2 === 0 ? v + 1 : v - 1;
}

/**
 * Build the implication graph from 2-SAT clauses.
 *
 * For each clause (a OR b):
 *   Add edges: ¬a → b and ¬b → a
 */
export function buildImplicationGraph(
	numVariables: number,
	clauses: Clause[]
): ImplicationGraph {
	const n = 2 * numVariables; // total literal vertices
	const labels: string[] = [];
	for (let i = 0; i < numVariables; i++) {
		labels.push(`x${i + 1}`);
		labels.push(`¬x${i + 1}`);
	}

	const edges: { source: number; target: number }[] = [];
	for (const clause of clauses) {
		const a = litToVertex(clause.a);
		const b = litToVertex(clause.b);
		// ¬a → b
		edges.push({ source: negVertex(a), target: b });
		// ¬b → a
		edges.push({ source: negVertex(b), target: a });
	}

	// Layout: arrange positive literals on top row, negated on bottom row
	const positions: { x: number; y: number }[] = [];
	for (let i = 0; i < numVariables; i++) {
		const xPos = (i + 1) / (numVariables + 1);
		// x_i on top
		positions.push({ x: xPos, y: 0.25 });
		// ¬x_i on bottom
		positions.push({ x: xPos, y: 0.75 });
	}

	return { labels, edges, positions };
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
 * Solve 2-SAT using Kosaraju's SCC algorithm on the implication graph.
 *
 * Steps:
 *   1. Build implication graph.
 *   2. Run Kosaraju's SCC.
 *   3. Check: for each variable i, if x_i and ¬x_i are in the same SCC → UNSAT.
 *   4. Otherwise: assign x_i = true if SCC(x_i) > SCC(¬x_i) (in topological order).
 */
export function solve2SAT(
	numVariables: number,
	clauses: Clause[]
): { result: TwoSatResult; steps: AlgorithmStep[]; graph: ImplicationGraph } {
	const igraph = buildImplicationGraph(numVariables, clauses);
	const n = 2 * numVariables;
	const steps: AlgorithmStep[] = [];

	// Build adjacency lists
	const adj = new Map<number, number[]>();
	const radj = new Map<number, number[]>();
	for (let i = 0; i < n; i++) {
		adj.set(i, []);
		radj.set(i, []);
	}
	for (const edge of igraph.edges) {
		adj.get(edge.source)!.push(edge.target);
		radj.get(edge.target)!.push(edge.source);
	}

	// Visualization state
	const activeVertices = new Set<number>();
	const visitedVertices = new Set<number>();
	const frontierVertices = new Set<number>();
	const activeEdges = new Set<string>();
	const treeEdges = new Set<string>();
	const sccArr: (number | null)[] = new Array(n).fill(null);
	const postArr: (number | null)[] = new Array(n).fill(null);

	function getData(): Record<string, (string | number | null)[]> {
		return {
			post: postArr.map((v) => v ?? '-'),
			scc: sccArr.map((v) => v ?? '-')
		};
	}

	// Initial step
	steps.push(
		snap(
			`Build implication graph with ${n} literal vertices and ${igraph.edges.length} edges from ${clauses.length} clauses.`,
			activeVertices,
			visitedVertices,
			frontierVertices,
			activeEdges,
			treeEdges,
			getData()
		)
	);

	// ===== Phase 1: DFS on G for post-order =====
	steps.push(
		snap(
			'Phase 1: Run DFS on implication graph to compute finish times.',
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
	const finishOrder: number[] = [];

	function dfsPhase1(v: number) {
		visited1[v] = true;
		activeVertices.add(v);
		visitedVertices.add(v);

		steps.push(
			snap(
				`Phase 1: Explore ${igraph.labels[v]}.`,
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
				activeEdges.clear();
				activeEdges.add(edgeKey(v, u));
				treeEdges.add(edgeKey(v, u));
				dfsPhase1(u);
			}
		}

		activeEdges.clear();
		postArr[v] = clock++;
		finishOrder.push(v);
		activeVertices.delete(v);

		steps.push(
			snap(
				`Phase 1: Finish ${igraph.labels[v]}: post = ${postArr[v]}.`,
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
		if (!visited1[v]) dfsPhase1(v);
	}

	// ===== Phase 2: Reset for reverse graph =====
	activeVertices.clear();
	visitedVertices.clear();
	frontierVertices.clear();
	activeEdges.clear();
	treeEdges.clear();

	steps.push(
		snap(
			'Phase 2: Build reverse implication graph. Prepare for SCC discovery.',
			activeVertices,
			visitedVertices,
			frontierVertices,
			activeEdges,
			treeEdges,
			getData()
		)
	);

	// ===== Phase 3: DFS on reversed graph in decreasing post-order =====
	steps.push(
		snap(
			'Phase 3: DFS on reverse graph in decreasing post-order. Each DFS tree = one SCC.',
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
		sccArr[v] = sccCount;
		activeVertices.add(v);
		visitedVertices.add(v);

		steps.push(
			snap(
				`Phase 3: Visit ${igraph.labels[v]} → assign to SCC ${sccCount}.`,
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
				activeEdges.clear();
				activeEdges.add(edgeKey(u, v));
				treeEdges.add(edgeKey(u, v));
				dfsPhase3(u);
			}
		}

		activeEdges.clear();
		activeVertices.delete(v);
	}

	for (let i = finishOrder.length - 1; i >= 0; i--) {
		const v = finishOrder[i];
		if (!visited2[v]) {
			sccCount++;
			steps.push(
				snap(
					`Phase 3: Start SCC ${sccCount} from ${igraph.labels[v]} (post = ${postArr[v]}).`,
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

	// ===== Check satisfiability =====
	activeVertices.clear();
	activeEdges.clear();

	let satisfiable = true;
	for (let i = 0; i < numVariables; i++) {
		const posV = 2 * i;     // x_i
		const negV = 2 * i + 1; // ¬x_i
		if (sccArr[posV] === sccArr[negV]) {
			satisfiable = false;
			steps.push(
				snap(
					`Check: ${igraph.labels[posV]} and ${igraph.labels[negV]} are in the same SCC (${sccArr[posV]}). UNSATISFIABLE!`,
					new Set([posV, negV]),
					visitedVertices,
					frontierVertices,
					activeEdges,
					treeEdges,
					getData()
				)
			);
			break;
		}
	}

	let assignments: boolean[] | null = null;

	if (satisfiable) {
		// Assign: x_i = true if SCC(x_i) > SCC(¬x_i)
		// In Kosaraju's, higher SCC number = earlier in reverse topological order
		// So x_i is true when its SCC number is greater (it comes later topologically)
		assignments = [];
		const assignData: (string | number | null)[] = [];
		for (let i = 0; i < numVariables; i++) {
			const posV = 2 * i;
			const negV = 2 * i + 1;
			const val = sccArr[posV]! > sccArr[negV]!;
			assignments.push(val);
			assignData.push(val ? 'T' : 'F');
		}

		const data = getData();
		data['assign'] = assignData;

		steps.push(
			snap(
				`SATISFIABLE! Assignment: ${assignments.map((v, i) => `x${i + 1}=${v ? 'T' : 'F'}`).join(', ')}.`,
				activeVertices,
				visitedVertices,
				frontierVertices,
				activeEdges,
				treeEdges,
				data
			)
		);
	} else {
		steps.push(
			snap(
				'2-SAT result: UNSATISFIABLE. No valid assignment exists.',
				activeVertices,
				visitedVertices,
				frontierVertices,
				activeEdges,
				treeEdges,
				getData()
			)
		);
	}

	return {
		result: {
			satisfiable,
			assignments,
			sccIds: sccArr.map((v) => v ?? -1)
		},
		steps,
		graph: igraph
	};
}

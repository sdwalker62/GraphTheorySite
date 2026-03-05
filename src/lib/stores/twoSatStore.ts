import { writable } from 'svelte/store';
import type { AlgorithmStep } from '$lib/graph/algorithm';

/** A 2-SAT clause: (literal1 OR literal2). Each literal is { variable, negated }. */
export interface Literal {
	/** Variable index (0-based) */
	variable: number;
	/** Whether this literal is negated */
	negated: boolean;
}

export interface Clause {
	a: Literal;
	b: Literal;
}

export interface TwoSatState {
	numVariables: number;
	clauses: Clause[];
}

export const twoSatState = writable<TwoSatState>({
	numVariables: 3,
	clauses: []
});

/** The implication graph generated from the clauses */
export interface ImplicationGraph {
	/** Vertices: 2n literals. Index 2*i = x_i, index 2*i+1 = ¬x_i */
	labels: string[];
	/** Adjacency list */
	edges: { source: number; target: number }[];
	/** Vertex positions (normalized 0-1) */
	positions: { x: number; y: number }[];
}

export const implicationGraph = writable<ImplicationGraph | null>(null);

/** Result of 2-SAT solving */
export interface TwoSatResult {
	satisfiable: boolean;
	assignments: boolean[] | null; // null if unsatisfiable
	sccIds: number[]; // SCC assignment for each literal vertex
}

export const twoSatResult = writable<TwoSatResult | null>(null);

/** Algorithm steps for visualizing the SCC pass on the implication graph */
export const twoSatSteps = writable<AlgorithmStep[]>([]);
export const twoSatCurrentStep = writable<number>(0);
export const twoSatTotalSteps = writable<number>(0);
export const twoSatIsPlaying = writable<boolean>(false);

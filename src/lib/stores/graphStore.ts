import { writable } from 'svelte/store';

export type Algorithm =
	| 'DFS'
	| 'Topological Sort'
	| 'SCC'
	| 'BFS'
	| "Dijkstra's"
	| 'Bellman-Ford'
	| 'Floyd-Warshall'
	| "Kruskal's"
	| "Prim's"
	| 'Ford-Fulkerson'
	| 'Edmonds-Karp'
	| '2-SAT';

export interface AlgorithmInfo {
	name: Algorithm;
	category: string;
	requiresDirected: boolean | null; // null = either
	requiresWeighted: boolean | null; // null = either
	requiresStartVertex: boolean;
	requiresAcyclic: boolean;
}

export const algorithms: AlgorithmInfo[] = [
	{
		name: 'DFS',
		category: 'Traversal',
		requiresDirected: null,
		requiresWeighted: null,
		requiresStartVertex: false,
		requiresAcyclic: false
	},
	{
		name: 'BFS',
		category: 'Traversal',
		requiresDirected: null,
		requiresWeighted: null,
		requiresStartVertex: true,
		requiresAcyclic: false
	},
	{
		name: 'Topological Sort',
		category: 'Ordering',
		requiresDirected: true,
		requiresWeighted: null,
		requiresStartVertex: false,
		requiresAcyclic: true
	},
	{
		name: 'SCC',
		category: 'Components',
		requiresDirected: true,
		requiresWeighted: null,
		requiresStartVertex: false,
		requiresAcyclic: false
	},
	{
		name: "Dijkstra's",
		category: 'Shortest Path',
		requiresDirected: null,
		requiresWeighted: true,
		requiresStartVertex: true,
		requiresAcyclic: false
	},
	{
		name: 'Bellman-Ford',
		category: 'Shortest Path',
		requiresDirected: null,
		requiresWeighted: true,
		requiresStartVertex: true,
		requiresAcyclic: false
	},
	{
		name: 'Floyd-Warshall',
		category: 'Shortest Path',
		requiresDirected: null,
		requiresWeighted: true,
		requiresStartVertex: false,
		requiresAcyclic: false
	},
	{
		name: "Kruskal's",
		category: 'MST',
		requiresDirected: false,
		requiresWeighted: true,
		requiresStartVertex: false,
		requiresAcyclic: false
	},
	{
		name: "Prim's",
		category: 'MST',
		requiresDirected: false,
		requiresWeighted: true,
		requiresStartVertex: false,
		requiresAcyclic: false
	},
	{
		name: 'Ford-Fulkerson',
		category: 'Network Flow',
		requiresDirected: true,
		requiresWeighted: true,
		requiresStartVertex: true,
		requiresAcyclic: false
	},
	{
		name: 'Edmonds-Karp',
		category: 'Network Flow',
		requiresDirected: true,
		requiresWeighted: true,
		requiresStartVertex: true,
		requiresAcyclic: false
	},
	{
		name: '2-SAT',
		category: 'Satisfiability',
		requiresDirected: true,
		requiresWeighted: null,
		requiresStartVertex: false,
		requiresAcyclic: false
	}
];

export interface GraphConfig {
	directed: boolean;
	weighted: boolean;
	allowCycles: boolean;
	vertexCount: number;
}

export const graphConfig = writable<GraphConfig>({
	directed: false,
	weighted: false,
	allowCycles: true,
	vertexCount: 6
});

export const selectedAlgorithm = writable<Algorithm | null>(null);

import type { Graph } from '$lib/graph/types';
import type { AlgorithmStep } from '$lib/graph/algorithm';

export const graphData = writable<Graph | null>(null);

/** The full list of recorded steps from the last algorithm run */
export const algorithmSteps = writable<AlgorithmStep[]>([]);

/** Starting vertex selected by the user (for algorithms that need one) */
export const startVertex = writable<number>(0);

export const currentStep = writable<number>(0);
export const totalSteps = writable<number>(0);
export const isPlaying = writable<boolean>(false);

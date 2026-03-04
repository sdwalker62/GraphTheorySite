/**
 * Represents a single step in an algorithm's execution for visualization.
 */
export interface AlgorithmStep {
	/** Human-readable description of what happens at this step */
	description: string;

	/** Set of vertex IDs that are currently "active" (being processed) */
	activeVertices: Set<number>;

	/** Set of vertex IDs that have been visited/finished */
	visitedVertices: Set<number>;

	/** Set of vertex IDs in the frontier (e.g., queue for BFS, stack for DFS) */
	frontierVertices: Set<number>;

	/** Set of edge keys ("source-target") that are currently being traversed */
	activeEdges: Set<string>;

	/** Set of edge keys that have been traversed (part of the search tree) */
	treeEdges: Set<string>;

	/** Optional data table rows to display (e.g. dist[], prev[], pre[], post[]) */
	data: Record<string, (string | number | null)[]>;
}

export function edgeKey(source: number, target: number): string {
	return `${source}-${target}`;
}

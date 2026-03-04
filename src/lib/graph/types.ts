export interface Vertex {
	id: number;
	label: string;
	x: number;
	y: number;
}

export interface Edge {
	source: number;
	target: number;
	weight: number | null;
}

export interface Graph {
	vertices: Vertex[];
	edges: Edge[];
	directed: boolean;
	weighted: boolean;
}

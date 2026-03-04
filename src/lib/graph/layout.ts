import type { Graph } from './types';

/**
 * Apply a simple force-directed layout to position vertices.
 * Modifies vertex x/y in place. Coordinates are normalized to [0, 1].
 */
export function layoutGraph(graph: Graph, width = 1, height = 1): void {
	const n = graph.vertices.length;
	if (n === 0) return;

	if (n === 1) {
		graph.vertices[0].x = width / 2;
		graph.vertices[0].y = height / 2;
		return;
	}

	// Initialize positions in a circle
	for (let i = 0; i < n; i++) {
		const angle = (2 * Math.PI * i) / n;
		graph.vertices[i].x = width / 2 + (width * 0.35) * Math.cos(angle);
		graph.vertices[i].y = height / 2 + (height * 0.35) * Math.sin(angle);
	}

	// Build adjacency for quick lookup
	const adjacency = new Set<string>();
	for (const edge of graph.edges) {
		adjacency.add(`${edge.source}-${edge.target}`);
		if (!graph.directed) {
			adjacency.add(`${edge.target}-${edge.source}`);
		}
	}

	const isConnected = (a: number, b: number) =>
		adjacency.has(`${a}-${b}`) || adjacency.has(`${b}-${a}`);

	// Force-directed simulation
	const iterations = Math.min(300, 50 + n * 5);
	const idealLength = Math.sqrt((width * height) / n) * 0.8;
	let temperature = width * 0.1;
	const cooling = temperature / (iterations + 1);

	for (let iter = 0; iter < iterations; iter++) {
		const dx = new Float64Array(n);
		const dy = new Float64Array(n);

		// Repulsive forces between all pairs
		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				let deltaX = graph.vertices[i].x - graph.vertices[j].x;
				let deltaY = graph.vertices[i].y - graph.vertices[j].y;
				let dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
				if (dist < 0.001) {
					deltaX = (Math.random() - 0.5) * 0.01;
					deltaY = (Math.random() - 0.5) * 0.01;
					dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
				}

				const repulsive = (idealLength * idealLength) / dist;
				const fx = (deltaX / dist) * repulsive;
				const fy = (deltaY / dist) * repulsive;
				dx[i] += fx;
				dy[i] += fy;
				dx[j] -= fx;
				dy[j] -= fy;
			}
		}

		// Attractive forces along edges
		for (const edge of graph.edges) {
			const i = edge.source;
			const j = edge.target;
			const deltaX = graph.vertices[i].x - graph.vertices[j].x;
			const deltaY = graph.vertices[i].y - graph.vertices[j].y;
			const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
			if (dist < 0.001) continue;

			const attractive = (dist * dist) / idealLength;
			const fx = (deltaX / dist) * attractive;
			const fy = (deltaY / dist) * attractive;
			dx[i] -= fx;
			dy[i] -= fy;
			dx[j] += fx;
			dy[j] += fy;
		}

		// Apply displacements with temperature limiting
		for (let i = 0; i < n; i++) {
			const disp = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]);
			if (disp < 0.001) continue;
			const scale = Math.min(disp, temperature) / disp;
			graph.vertices[i].x += dx[i] * scale;
			graph.vertices[i].y += dy[i] * scale;
		}

		temperature -= cooling;
	}

	// Normalize positions to [padding, 1-padding]
	const padding = 0.08;
	let minX = Infinity, maxX = -Infinity;
	let minY = Infinity, maxY = -Infinity;

	for (const v of graph.vertices) {
		minX = Math.min(minX, v.x);
		maxX = Math.max(maxX, v.x);
		minY = Math.min(minY, v.y);
		maxY = Math.max(maxY, v.y);
	}

	const rangeX = maxX - minX || 1;
	const rangeY = maxY - minY || 1;

	for (const v of graph.vertices) {
		v.x = padding + ((v.x - minX) / rangeX) * (width - 2 * padding);
		v.y = padding + ((v.y - minY) / rangeY) * (height - 2 * padding);
	}
}

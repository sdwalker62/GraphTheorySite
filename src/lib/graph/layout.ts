import type { Graph } from './types';

/**
 * Apply a force-directed layout to position vertices.
 * Modifies vertex x/y in place. Coordinates are normalized to [0, 1].
 *
 * Uses a Fruchterman-Reingold style algorithm with:
 * - Grid-based initial placement for large graphs
 * - Strong short-range repulsion to prevent overlaps
 * - Adaptive temperature schedule
 * - Post-processing overlap removal pass
 */
export function layoutGraph(graph: Graph, width = 1, height = 1): void {
	const n = graph.vertices.length;
	if (n === 0) return;

	if (n === 1) {
		graph.vertices[0].x = width / 2;
		graph.vertices[0].y = height / 2;
		return;
	}

	// --- Initial placement ---
	if (n <= 20) {
		// Circle for small graphs
		for (let i = 0; i < n; i++) {
			const angle = (2 * Math.PI * i) / n;
			graph.vertices[i].x = width / 2 + (width * 0.4) * Math.cos(angle);
			graph.vertices[i].y = height / 2 + (height * 0.4) * Math.sin(angle);
		}
	} else {
		// Grid with jitter for larger graphs – prevents the pile-up that
		// a circular start causes when n is large
		const cols = Math.ceil(Math.sqrt(n * (width / height)));
		const rows = Math.ceil(n / cols);
		const cellW = width / (cols + 1);
		const cellH = height / (rows + 1);
		for (let i = 0; i < n; i++) {
			const col = i % cols;
			const row = Math.floor(i / cols);
			graph.vertices[i].x = cellW * (col + 1) + (Math.random() - 0.5) * cellW * 0.5;
			graph.vertices[i].y = cellH * (row + 1) + (Math.random() - 0.5) * cellH * 0.5;
		}
	}

	// Build adjacency set for connected-pair lookups (unused for now, but cheap)
	const adjacency = new Set<string>();
	for (const edge of graph.edges) {
		adjacency.add(`${edge.source}-${edge.target}`);
		if (!graph.directed) {
			adjacency.add(`${edge.target}-${edge.source}`);
		}
	}

	// --- Force-directed simulation ---
	const area = width * height;
	// "k" is the ideal spring length – the natural distance between connected nodes
	const k = Math.sqrt(area / n) * 0.85;
	const k2 = k * k;

	// More iterations for larger graphs
	const iterations = Math.min(600, 150 + n * 5);

	// Temperature starts high (allows big moves) and cools to zero
	let temperature = Math.max(width, height) * 0.25;

	for (let iter = 0; iter < iterations; iter++) {
		const progress = iter / iterations; // 0 → 1
		const dx = new Float64Array(n);
		const dy = new Float64Array(n);

		// --- Repulsive forces (all pairs) ---
		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				let deltaX = graph.vertices[i].x - graph.vertices[j].x;
				let deltaY = graph.vertices[i].y - graph.vertices[j].y;
				let dist2 = deltaX * deltaX + deltaY * deltaY;

				if (dist2 < 1e-6) {
					// Coincident – nudge apart randomly
					deltaX = (Math.random() - 0.5) * k * 0.1;
					deltaY = (Math.random() - 0.5) * k * 0.1;
					dist2 = deltaX * deltaX + deltaY * deltaY;
				}

				const dist = Math.sqrt(dist2);

				// Fruchterman-Reingold repulsion: k² / d
				// With an extra boost at very short range to aggressively prevent overlaps
				let repForce = k2 / dist;
				if (dist < k * 0.5) {
					repForce *= 3; // triple-strength when too close
				}

				const fx = (deltaX / dist) * repForce;
				const fy = (deltaY / dist) * repForce;
				dx[i] += fx;
				dy[i] += fy;
				dx[j] -= fx;
				dy[j] -= fy;
			}
		}

		// --- Attractive forces (edges only) ---
		for (const edge of graph.edges) {
			const i = edge.source;
			const j = edge.target;
			const deltaX = graph.vertices[i].x - graph.vertices[j].x;
			const deltaY = graph.vertices[i].y - graph.vertices[j].y;
			const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
			if (dist < 1e-6) continue;

			// F_a = d² / k  (standard FR attractive)
			const attForce = (dist * dist) / k;
			const fx = (deltaX / dist) * attForce;
			const fy = (deltaY / dist) * attForce;
			dx[i] -= fx;
			dy[i] -= fy;
			dx[j] += fx;
			dy[j] += fy;
		}

		// --- Gravity toward centre (very gentle, just to keep it compact) ---
		const gravity = 0.01 + 0.02 * progress; // slightly stronger later
		const cx = width / 2;
		const cy = height / 2;
		for (let i = 0; i < n; i++) {
			dx[i] += (cx - graph.vertices[i].x) * gravity;
			dy[i] += (cy - graph.vertices[i].y) * gravity;
		}

		// --- Apply displacements clamped by temperature ---
		for (let i = 0; i < n; i++) {
			const disp = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]);
			if (disp < 1e-6) continue;
			const clamped = Math.min(disp, temperature);
			graph.vertices[i].x += (dx[i] / disp) * clamped;
			graph.vertices[i].y += (dy[i] / disp) * clamped;
		}

		// Adaptive cooling: fast at start, slow in the middle, fast at end
		temperature *= 1 - (iter + 1) / iterations;
		temperature = Math.max(temperature, 0.01 * k);
	}

	// --- Post-processing: overlap removal ---
	// Push apart any vertices still closer than a minimum distance
	const minDist = k * 0.35;
	for (let pass = 0; pass < 10; pass++) {
		let moved = false;
		for (let i = 0; i < n; i++) {
			for (let j = i + 1; j < n; j++) {
				let deltaX = graph.vertices[i].x - graph.vertices[j].x;
				let deltaY = graph.vertices[i].y - graph.vertices[j].y;
				const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
				if (dist < minDist && dist > 1e-6) {
					const push = (minDist - dist) / 2;
					const ux = deltaX / dist;
					const uy = deltaY / dist;
					graph.vertices[i].x += ux * push;
					graph.vertices[i].y += uy * push;
					graph.vertices[j].x -= ux * push;
					graph.vertices[j].y -= uy * push;
					moved = true;
				} else if (dist <= 1e-6) {
					graph.vertices[i].x += (Math.random() - 0.5) * minDist;
					graph.vertices[j].y += (Math.random() - 0.5) * minDist;
					moved = true;
				}
			}
		}
		if (!moved) break;
	}

	// --- Normalize to [padding, 1-padding] ---
	const padding = 0.04;
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

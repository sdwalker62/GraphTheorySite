<script lang="ts">
	import { graphConfig, selectedAlgorithm, graphData, algorithmSteps, currentStep } from '$lib/stores/graphStore';
	import type { Graph } from '$lib/graph/types';
	import type { AlgorithmStep } from '$lib/graph/algorithm';
	import { edgeKey } from '$lib/graph/algorithm';

	let graph: Graph | null = $state(null);
	let algorithm: string | null = $state(null);
	let vertexCount = $state(6);
	let steps: AlgorithmStep[] = $state([]);
	let stepIndex = $state(0);

	graphData.subscribe((g) => (graph = g));
	selectedAlgorithm.subscribe((a) => (algorithm = a));
	graphConfig.subscribe((c) => (vertexCount = c.vertexCount));
	algorithmSteps.subscribe((s) => (steps = s));
	currentStep.subscribe((s) => (stepIndex = s));

	/** The current step snapshot (if algorithm is running) */
	const step = $derived(steps.length > 0 && stepIndex < steps.length ? steps[stepIndex] : null);

	// Edge weight editing state
	let editingEdgeIndex: number | null = $state(null);
	let editValue = $state('');
	let inputEl: HTMLInputElement | null = $state(null);
	let editPos = $state({ x: 0, y: 0 });

	// SVG viewport dimensions — scale up for large graphs to give vertices more room
	const svgWidth = $derived(vertexCount > 30 ? 800 + (vertexCount - 30) * 6 : 800);
	const svgHeight = $derived(vertexCount > 30 ? 600 + (vertexCount - 30) * 4.5 : 600);

	// --- Adaptive sizing based on vertex count ---
	const nodeRadius = $derived(Math.max(5, Math.min(20, 160 / Math.sqrt(vertexCount))));
	const edgeStrokeBase = $derived(Math.max(0.6, Math.min(1.5, 10 / Math.sqrt(vertexCount))));
	const arrowSize = $derived(Math.max(3, Math.min(8, 50 / Math.sqrt(vertexCount))));
	const isFlowAlgo = $derived(algorithm === 'Ford-Fulkerson' || algorithm === 'Edmonds-Karp');
	const weightBadgeW = $derived(Math.max(16, Math.min(isFlowAlgo ? 38 : 28, (isFlowAlgo ? 260 : 180) / Math.sqrt(vertexCount))));
	const weightBadgeH = $derived(Math.max(11, Math.min(20, 130 / Math.sqrt(vertexCount))));
	const weightFontSize = $derived(Math.max(6, Math.min(10, 65 / Math.sqrt(vertexCount))));
	const labelFontSize = $derived(nodeRadius * 0.85);
	// Edge opacity decreases for very dense graphs
	const edgeOpacity = $derived(Math.max(0.3, Math.min(1.0, 6 / Math.sqrt(vertexCount))));

	let svgEl: SVGSVGElement | null = $state(null);

	function vx(v: { x: number }): number {
		return v.x * svgWidth;
	}

	function vy(v: { y: number }): number {
		return v.y * svgHeight;
	}

	/**
	 * Compute a slight curve offset for an edge so overlapping/nearby edges
	 * are visually distinguishable. Uses a deterministic hash of (source, target).
	 */
	function edgeCurveOffset(source: number, target: number, sx: number, sy: number, tx: number, ty: number): number {
		if (vertexCount <= 12) return 0; // no curve needed for small graphs
		// Subtle curve – only enough to disambiguate parallel edges, not add clutter
		const hash = ((source * 71) ^ (target * 113)) % 5;
		const sign = (source + target) % 2 === 0 ? 1 : -1;
		const magnitude = Math.max(5, Math.min(15, vertexCount * 0.15));
		return sign * (hash / 5) * magnitude;
	}

	function edgeEndpoints(sx: number, sy: number, tx: number, ty: number) {
		const dx = tx - sx;
		const dy = ty - sy;
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < 0.001) return { x1: sx, y1: sy, x2: tx, y2: ty };
		const ux = dx / dist;
		const uy = dy / dist;
		return {
			x1: sx + ux * nodeRadius,
			y1: sy + uy * nodeRadius,
			x2: tx - ux * (nodeRadius + (graph?.directed ? arrowSize * 0.6 : 0)),
			y2: ty - uy * (nodeRadius + (graph?.directed ? arrowSize * 0.6 : 0))
		};
	}

	function edgeMidpoint(sx: number, sy: number, tx: number, ty: number, offset: number) {
		const mx = (sx + tx) / 2;
		const my = (sy + ty) / 2;
		if (offset === 0) return { x: mx, y: my };
		// Perpendicular offset
		const dx = tx - sx;
		const dy = ty - sy;
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < 0.001) return { x: mx, y: my };
		return { x: mx + (-dy / dist) * offset, y: my + (dx / dist) * offset };
	}

	function edgePath(x1: number, y1: number, x2: number, y2: number, offset: number): string {
		if (offset === 0) {
			return `M${x1},${y1} L${x2},${y2}`;
		}
		const mid = edgeMidpoint(x1, y1, x2, y2, offset);
		return `M${x1},${y1} Q${mid.x},${mid.y} ${x2},${y2}`;
	}

	function svgToScreen(svgX: number, svgY: number): { x: number; y: number } {
		if (!svgEl) return { x: 0, y: 0 };
		const pt = svgEl.createSVGPoint();
		pt.x = svgX;
		pt.y = svgY;
		const ctm = svgEl.getScreenCTM();
		if (!ctm) return { x: 0, y: 0 };
		const screenPt = pt.matrixTransform(ctm);
		const rect = svgEl.getBoundingClientRect();
		return { x: screenPt.x - rect.left, y: screenPt.y - rect.top };
	}

	function startEditing(edgeIndex: number, midX: number, midY: number) {
		if (!graph || !graph.weighted) return;
		editingEdgeIndex = edgeIndex;
		editValue = String(graph.edges[edgeIndex].weight ?? 0);
		editPos = svgToScreen(midX, midY);
		requestAnimationFrame(() => {
			inputEl?.focus();
			inputEl?.select();
		});
	}

	function commitEdit() {
		if (editingEdgeIndex === null || !graph) return;
		const parsed = parseInt(editValue, 10);
		if (!isNaN(parsed)) {
			const newEdges = [...graph.edges];
			newEdges[editingEdgeIndex] = { ...newEdges[editingEdgeIndex], weight: parsed };
			graphData.set({ ...graph, edges: newEdges });
		}
		editingEdgeIndex = null;
	}

	function cancelEdit() {
		editingEdgeIndex = null;
	}

	function onEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') commitEdit();
		else if (e.key === 'Escape') cancelEdit();
	}

	// --- SCC region computation ---

	/** Distinct colors for SCC regions (HSL-based, semi-transparent) */
	const sccPalette = [
		'hsla(210, 80%, 60%, 0.18)',  // blue
		'hsla(340, 75%, 55%, 0.18)',  // rose
		'hsla(160, 70%, 45%, 0.18)',  // emerald
		'hsla(45, 90%, 55%, 0.18)',   // amber
		'hsla(280, 70%, 60%, 0.18)',  // purple
		'hsla(15, 85%, 55%, 0.18)',   // orange
		'hsla(190, 75%, 50%, 0.18)',  // cyan
		'hsla(100, 60%, 45%, 0.18)',  // lime
		'hsla(330, 65%, 50%, 0.18)',  // pink
		'hsla(230, 70%, 55%, 0.18)',  // indigo
		'hsla(60, 80%, 50%, 0.18)',   // yellow
		'hsla(0, 70%, 55%, 0.18)',    // red
	];

	const sccStrokePalette = [
		'hsla(210, 80%, 60%, 0.45)',
		'hsla(340, 75%, 55%, 0.45)',
		'hsla(160, 70%, 45%, 0.45)',
		'hsla(45, 90%, 55%, 0.45)',
		'hsla(280, 70%, 60%, 0.45)',
		'hsla(15, 85%, 55%, 0.45)',
		'hsla(190, 75%, 50%, 0.45)',
		'hsla(100, 60%, 45%, 0.45)',
		'hsla(330, 65%, 50%, 0.45)',
		'hsla(230, 70%, 55%, 0.45)',
		'hsla(60, 80%, 50%, 0.45)',
		'hsla(0, 70%, 55%, 0.45)',
	];

	/** Convex hull via Andrew's monotone chain. Returns points in CCW order. */
	function convexHull(points: { x: number; y: number }[]): { x: number; y: number }[] {
		if (points.length <= 1) return [...points];
		const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
		if (sorted.length === 2) return sorted;

		const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) =>
			(a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

		// Lower hull
		const lower: { x: number; y: number }[] = [];
		for (const p of sorted) {
			while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
			lower.push(p);
		}
		// Upper hull
		const upper: { x: number; y: number }[] = [];
		for (const p of sorted.reverse()) {
			while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
			upper.push(p);
		}
		lower.pop();
		upper.pop();
		return lower.concat(upper);
	}

	/** Offset a convex hull outward from centroid by `pad` pixels. */
	function padHull(hull: { x: number; y: number }[], pad: number): { x: number; y: number }[] {
		if (hull.length === 0) return [];
		const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
		const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
		return hull.map((p) => {
			const dx = p.x - cx;
			const dy = p.y - cy;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist < 0.001) return { x: p.x + pad, y: p.y };
			return { x: p.x + (dx / dist) * pad, y: p.y + (dy / dist) * pad };
		});
	}

	/** Create a smooth closed SVG path through hull points using cubic Beziers. */
	function smoothHullPath(hull: { x: number; y: number }[]): string {
		if (hull.length === 0) return '';
		if (hull.length === 1) {
			// Circle placeholder — handled separately
			return '';
		}
		if (hull.length === 2) {
			// Capsule between two points
			const [a, b] = hull;
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			const r = nodeRadius + 8;
			const nx = (-dy / dist) * r;
			const ny = (dx / dist) * r;
			return `M${a.x + nx},${a.y + ny} L${b.x + nx},${b.y + ny} A${r},${r} 0 0 1 ${b.x - nx},${b.y - ny} L${a.x - nx},${a.y - ny} A${r},${r} 0 0 1 ${a.x + nx},${a.y + ny} Z`;
		}
		// Catmull-Rom to cubic Bezier — smooth closed curve
		const n = hull.length;
		let d = `M${hull[0].x},${hull[0].y}`;
		for (let i = 0; i < n; i++) {
			const p0 = hull[(i - 1 + n) % n];
			const p1 = hull[i];
			const p2 = hull[(i + 1) % n];
			const p3 = hull[(i + 2) % n];
			// Catmull-Rom to Bezier conversion (tension = 0, alpha = 0.5)
			const cp1x = p1.x + (p2.x - p0.x) / 6;
			const cp1y = p1.y + (p2.y - p0.y) / 6;
			const cp2x = p2.x - (p3.x - p1.x) / 6;
			const cp2y = p2.y - (p3.y - p1.y) / 6;
			d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
		}
		d += ' Z';
		return d;
	}

	/** Group vertices by their SCC component number. Returns Map<sccId, vertexIndices[]>. */
	const sccGroups = $derived.by(() => {
		const groups = new Map<number, number[]>();
		if (!step || !step.data.scc || algorithm !== 'SCC' || !graph) return groups;
		const sccArr = step.data.scc;
		for (let i = 0; i < sccArr.length; i++) {
			const val = sccArr[i];
			if (typeof val === 'number') {
				if (!groups.has(val)) groups.set(val, []);
				groups.get(val)!.push(i);
			}
		}
		return groups;
	});

	/** Precomputed SCC region paths for rendering. */
	const sccRegions = $derived.by(() => {
		if (!graph || sccGroups.size === 0) return [];
		const pad = nodeRadius + 10;
		const regions: { path: string; fill: string; stroke: string; cx?: number; cy?: number; r?: number }[] = [];
		let idx = 0;
		for (const [sccId, vertexIds] of sccGroups) {
			const fill = sccPalette[idx % sccPalette.length];
			const stroke = sccStrokePalette[idx % sccStrokePalette.length];
			idx++;

			const points = vertexIds.map((vi) => ({ x: vx(graph!.vertices[vi]), y: vy(graph!.vertices[vi]) }));

			if (points.length === 1) {
				// Single vertex SCC — draw a circle
				regions.push({ path: '', fill, stroke, cx: points[0].x, cy: points[0].y, r: pad });
			} else {
				const hull = convexHull(points);
				if (hull.length <= 2) {
					// Collinear or 2 points — use capsule
					const padded = hull; // smoothHullPath handles 2-point case with capsule shape
					const capsulePath = smoothHullPath(padded);
					regions.push({ path: capsulePath, fill, stroke });
				} else {
					const padded = padHull(hull, pad);
					const pathD = smoothHullPath(padded);
					regions.push({ path: pathD, fill, stroke });
				}
			}
		}
		return regions;
	});

	// --- Color helpers for algorithm visualization ---

	function vertexFill(vid: number): string {
		if (!step) return 'fill-primary';
		if (step.activeVertices.has(vid)) return 'fill-warning';
		if (step.frontierVertices.has(vid)) return 'fill-info';
		if (step.visitedVertices.has(vid)) return 'fill-success';
		return 'fill-base-300';
	}

	function vertexStroke(vid: number): string {
		if (!step) return 'stroke-primary-content';
		if (step.activeVertices.has(vid)) return 'stroke-warning-content';
		if (step.frontierVertices.has(vid)) return 'stroke-info-content';
		if (step.visitedVertices.has(vid)) return 'stroke-success-content';
		return 'stroke-base-content/30';
	}

	function vertexTextFill(vid: number): string {
		if (!step) return 'fill-primary-content';
		if (step.activeVertices.has(vid)) return 'fill-warning-content';
		if (step.frontierVertices.has(vid)) return 'fill-info-content';
		if (step.visitedVertices.has(vid)) return 'fill-success-content';
		return 'fill-base-content/40';
	}

	function getEdgeStroke(source: number, target: number): string {
		if (!step) return 'stroke-base-content/40';
		const ek = edgeKey(source, target);
		const ekRev = edgeKey(target, source);
		if (step.activeEdges.has(ek) || step.activeEdges.has(ekRev)) return 'stroke-warning';
		if (step.treeEdges.has(ek) || step.treeEdges.has(ekRev)) return 'stroke-success';
		return 'stroke-base-content/20';
	}

	function getEdgeWidth(source: number, target: number): number {
		if (!step) return edgeStrokeBase;
		const ek = edgeKey(source, target);
		const ekRev = edgeKey(target, source);
		if (step.activeEdges.has(ek) || step.activeEdges.has(ekRev)) return edgeStrokeBase * 2.5;
		if (step.treeEdges.has(ek) || step.treeEdges.has(ekRev)) return edgeStrokeBase * 2;
		return edgeStrokeBase;
	}

	function getEdgeOpacity(source: number, target: number): number {
		if (!step) return edgeOpacity;
		const ek = edgeKey(source, target);
		const ekRev = edgeKey(target, source);
		if (step.activeEdges.has(ek) || step.activeEdges.has(ekRev)) return 1;
		if (step.treeEdges.has(ek) || step.treeEdges.has(ekRev)) return 1;
		return edgeOpacity * 0.6;
	}

	/** Parse "flow/capacity" string from edge labels. */
	function parseFlowFromLabel(label: string): { flow: number; capacity: number } | null {
		const parts = label.split('/');
		if (parts.length !== 2) return null;
		const flow = parseInt(parts[0], 10);
		const capacity = parseInt(parts[1], 10);
		if (isNaN(flow) || isNaN(capacity)) return null;
		return { flow, capacity };
	}
</script>

<div class="relative flex h-full min-h-0 w-full flex-col rounded-box bg-base-100 border border-base-300 overflow-hidden">
	<!-- Step description bar -->
	{#if step}
		<div class="flex items-center gap-3 border-b border-base-300 bg-base-200/50 px-4 py-2">
			<span class="badge badge-sm badge-primary font-mono">Step {stepIndex}</span>
			<span class="text-sm">{step.description}</span>
		</div>
	{/if}

	<!-- Main canvas area -->
	<div class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
		{#if !graph}
			<div class="text-center text-base-content/40">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="mx-auto mb-4 h-16 w-16 opacity-30"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<circle cx="12" cy="5" r="2" stroke-width="1.5" />
					<circle cx="5" cy="19" r="2" stroke-width="1.5" />
					<circle cx="19" cy="19" r="2" stroke-width="1.5" />
					<line x1="12" y1="7" x2="5" y2="17" stroke-width="1.5" />
					<line x1="12" y1="7" x2="19" y2="17" stroke-width="1.5" />
					<line x1="7" y1="19" x2="17" y2="19" stroke-width="1.5" />
				</svg>
				<p class="text-lg font-medium">No graph generated yet</p>
				<p class="mt-1 text-sm">Configure your graph on the right and click <strong>Generate Graph</strong></p>
			</div>
		{:else}
			<svg
				bind:this={svgEl}
				viewBox="0 0 {svgWidth} {svgHeight}"
				class="h-full w-full"
				xmlns="http://www.w3.org/2000/svg"
			>
				<!-- Defs -->
				<defs>
					{#if graph.directed}
						<marker
							id="arrowhead"
							markerWidth={arrowSize}
							markerHeight={arrowSize}
							refX={arrowSize * 0.9}
							refY={arrowSize / 2}
							orient="auto"
							markerUnits="userSpaceOnUse"
						>
							<polygon
								points="0 0, {arrowSize} {arrowSize / 2}, 0 {arrowSize}"
								class="fill-base-content/50"
							/>
						</marker>
						<marker
							id="arrowhead-active"
							markerWidth={arrowSize}
							markerHeight={arrowSize}
							refX={arrowSize * 0.9}
							refY={arrowSize / 2}
							orient="auto"
							markerUnits="userSpaceOnUse"
						>
							<polygon
								points="0 0, {arrowSize} {arrowSize / 2}, 0 {arrowSize}"
								class="fill-warning"
							/>
						</marker>
						<marker
							id="arrowhead-tree"
							markerWidth={arrowSize}
							markerHeight={arrowSize}
							refX={arrowSize * 0.9}
							refY={arrowSize / 2}
							orient="auto"
							markerUnits="userSpaceOnUse"
						>
							<polygon
								points="0 0, {arrowSize} {arrowSize / 2}, 0 {arrowSize}"
								class="fill-success"
							/>
						</marker>
					{/if}
				</defs>

				<!-- SCC Regions -->
				{#each sccRegions as region}
					{#if region.r != null && region.cx != null && region.cy != null}
						<!-- Single vertex SCC: circle -->
						<circle
							cx={region.cx}
							cy={region.cy}
							r={region.r}
							fill={region.fill}
							stroke={region.stroke}
							stroke-width="1.5"
							stroke-dasharray="4 2"
						/>
					{:else if region.path}
						<path
							d={region.path}
							fill={region.fill}
							stroke={region.stroke}
							stroke-width="1.5"
							stroke-dasharray="4 2"
						/>
					{/if}
				{/each}

				<!-- Edges -->
				{#each graph.edges as edge, i}
					{@const sv = graph.vertices[edge.source]}
					{@const tv = graph.vertices[edge.target]}
					{@const sx = vx(sv)}
					{@const sy = vy(sv)}
					{@const tx = vx(tv)}
					{@const ty = vy(tv)}
					{@const pts = edgeEndpoints(sx, sy, tx, ty)}
					{@const curveOff = edgeCurveOffset(edge.source, edge.target, sx, sy, tx, ty)}
					{@const mid = edgeMidpoint(sx, sy, tx, ty, curveOff)}
					{@const eStroke = getEdgeStroke(edge.source, edge.target)}
					{@const eWidth = getEdgeWidth(edge.source, edge.target)}
					{@const eOpacity = getEdgeOpacity(edge.source, edge.target)}
					{@const ek = edgeKey(edge.source, edge.target)}
					{@const ekRev = edgeKey(edge.target, edge.source)}
					{@const pathD = edgePath(pts.x1, pts.y1, pts.x2, pts.y2, curveOff)}
					<path
						id="edge-{edge.source}-{edge.target}"
						d={pathD}
						fill="none"
						class={eStroke}
						stroke-width={eWidth}
						opacity={eOpacity}
						marker-end={graph.directed
							? step && (step.activeEdges.has(ek) || step.activeEdges.has(ekRev))
								? 'url(#arrowhead-active)'
								: step && (step.treeEdges.has(ek) || step.treeEdges.has(ekRev))
									? 'url(#arrowhead-tree)'
									: 'url(#arrowhead)'
							: undefined}
					/>
					<!-- Flow animation overlay -->
					{#if isFlowAlgo && step}
						{@const flowLabel = step.edgeLabels?.get(ek)}
						{@const flowParsed = flowLabel ? parseFlowFromLabel(flowLabel) : null}
						{@const flowRatio = flowParsed && flowParsed.capacity > 0 ? flowParsed.flow / flowParsed.capacity : 0}
						{#if flowRatio > 0}
							{@const dashLen = 4 + flowRatio * 8}
							{@const gapLen = 4 + (1 - flowRatio) * 4}
							{@const animDur = Math.max(0.5, 1.8 - flowRatio * 1.2)}
							{@const pCount = Math.max(1, Math.min(3, Math.ceil(flowRatio * 3)))}
							{@const pDur = Math.max(1.5, 4 - flowRatio * 2.5)}
							{@const pRadius = Math.max(1.5, Math.min(4, nodeRadius * 0.3))}
							<!-- Animated flowing dashes -->
							<path
								d={pathD}
								fill="none"
								class="stroke-info"
								stroke-width={edgeStrokeBase * (1 + flowRatio * 2.5)}
								opacity={0.25 + flowRatio * 0.35}
								stroke-dasharray="{dashLen} {gapLen}"
								stroke-linecap="round"
							>
								<animate
									attributeName="stroke-dashoffset"
									from="0"
									to="{-(dashLen + gapLen)}"
									dur="{animDur}s"
									repeatCount="indefinite"
								/>
							</path>
							<!-- Flow particles traveling along edge -->
							{#each Array.from({length: pCount}) as _, pi}
								<circle r={pRadius} class="fill-info" opacity={0.5 + flowRatio * 0.4}>
									<animateMotion
										dur="{pDur}s"
										repeatCount="indefinite"
										begin="{pi * pDur / pCount}s"
									>
										<mpath href="#edge-{edge.source}-{edge.target}" />
									</animateMotion>
								</circle>
							{/each}
						{/if}
					{/if}
					{#if edge.weight !== null}
						{@const edgeLabel = step?.edgeLabels?.get(edgeKey(edge.source, edge.target)) ?? `${edge.weight}`}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<g
							class="cursor-pointer"
							onclick={() => startEditing(i, mid.x, mid.y)}
						>
							<rect
								x={mid.x - weightBadgeW / 2}
								y={mid.y - weightBadgeH / 2}
								width={weightBadgeW}
								height={weightBadgeH}
								rx="3"
								class="fill-base-200 stroke-base-300 transition-colors hover:fill-primary/20 hover:stroke-primary"
								stroke-width="0.8"
							/>
							<text
								x={mid.x}
								y={mid.y + 1}
								text-anchor="middle"
								dominant-baseline="middle"
								class="fill-base-content font-mono font-semibold pointer-events-none select-none"
								font-size={weightFontSize}
							>
								{edgeLabel}
							</text>
						</g>
					{/if}
				{/each}

				<!-- Vertices -->
				{#each graph.vertices as vertex}
					{@const cx = vx(vertex)}
					{@const cy = vy(vertex)}
					<circle
						{cx}
						{cy}
						r={nodeRadius}
						class="{vertexFill(vertex.id)} {vertexStroke(vertex.id)} transition-colors duration-200"
						stroke-width="2"
					/>
					<text
						x={cx}
						y={cy + 1}
						text-anchor="middle"
						dominant-baseline="middle"
						class="{vertexTextFill(vertex.id)} font-bold transition-colors duration-200"
						font-size={labelFontSize}
					>
						{vertex.label}
					</text>
				{/each}

				<!-- Algorithm label -->
				{#if algorithm}
					<text x="10" y="24" class="fill-base-content/60 text-sm font-semibold">
						{algorithm}
					</text>
				{/if}
			</svg>

			<!-- Inline weight editor overlay -->
			{#if editingEdgeIndex !== null}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="absolute inset-0"
					onclick={cancelEdit}
				></div>
				<input
					bind:this={inputEl}
					type="number"
					class="input input-xs input-bordered absolute w-16 text-center font-mono font-semibold z-10"
					style="left: {editPos.x - 32}px; top: {editPos.y - 14}px;"
					value={editValue}
					oninput={(e) => (editValue = e.currentTarget.value)}
					onblur={commitEdit}
					onkeydown={onEditKeydown}
				/>
			{/if}

			<!-- Hint for weighted graphs -->
			{#if graph.weighted && !step}
				<div class="absolute bottom-2 left-2 text-xs text-base-content/40">
					Click a weight to edit
				</div>
			{/if}

			<!-- Legend when algorithm is running -->
			{#if step}
				<div class="absolute bottom-2 left-2 flex flex-wrap gap-3 text-xs">
					<span class="flex items-center gap-1">
						<span class="inline-block h-3 w-3 rounded-full bg-warning"></span> Active
					</span>
					<span class="flex items-center gap-1">
						<span class="inline-block h-3 w-3 rounded-full bg-info"></span> Frontier
					</span>
					<span class="flex items-center gap-1">
						<span class="inline-block h-3 w-3 rounded-full bg-success"></span> Visited
					</span>
					<span class="flex items-center gap-1">
						<span class="inline-block h-3 w-3 rounded-full bg-base-300"></span> Unvisited
					</span>
					{#if sccGroups.size > 0}
						<span class="opacity-40">|</span>
						{#each Array.from(sccGroups.keys()) as sccId, idx}
							<span class="flex items-center gap-1">
								<span
									class="inline-block h-3 w-3 rounded-sm border"
									style="background: {sccPalette[idx % sccPalette.length]}; border-color: {sccStrokePalette[idx % sccStrokePalette.length]};"
								></span>
								SCC {sccId}
							</span>
						{/each}
					{/if}
				</div>
			{/if}
		{/if}
	</div>

	<!-- Data table when algorithm is running -->
	{#if step && graph && Object.keys(step.data).length > 0}
		<div class="border-t border-base-300 overflow-x-auto bg-base-200/50 px-4 py-2">
			<table class="table table-xs">
				<thead>
					<tr>
						<th class="text-xs">Vertex</th>
						{#each graph.vertices as v}
							<th class="text-center text-xs font-mono">{v.label}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each Object.entries(step.data) as [label, values]}
						<tr>
							<td class="font-semibold text-xs">{label}</td>
							{#each values as val, i}
								<td class="text-center font-mono text-xs"
									class:text-warning={step.activeVertices.has(i)}
									class:text-success={!step.activeVertices.has(i) && step.visitedVertices.has(i)}
								>
									{val}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

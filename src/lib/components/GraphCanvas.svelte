<script lang="ts">
	import { graphConfig, selectedAlgorithm, graphData } from '$lib/stores/graphStore';
	import type { Graph } from '$lib/graph/types';

	let graph: Graph | null = $state(null);
	let algorithm: string | null = $state(null);
	let vertexCount = $state(6);

	graphData.subscribe((g) => (graph = g));
	selectedAlgorithm.subscribe((a) => (algorithm = a));
	graphConfig.subscribe((c) => (vertexCount = c.vertexCount));

	// SVG viewport dimensions
	const svgWidth = 800;
	const svgHeight = 600;
	const nodeRadius = $derived(Math.max(8, Math.min(20, 200 / Math.sqrt(vertexCount))));
	const arrowSize = 8;

	function vx(v: { x: number }): number {
		return v.x * svgWidth;
	}

	function vy(v: { y: number }): number {
		return v.y * svgHeight;
	}

	/**
	 * Calculate edge endpoint offset so the line ends at the circle border, not center.
	 */
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
			x2: tx - ux * nodeRadius,
			y2: ty - uy * nodeRadius
		};
	}

	function edgeMidpoint(sx: number, sy: number, tx: number, ty: number) {
		return { x: (sx + tx) / 2, y: (sy + ty) / 2 };
	}
</script>

<div class="flex h-full w-full items-center justify-center rounded-box bg-base-100 border border-base-300">
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
			viewBox="0 0 {svgWidth} {svgHeight}"
			class="h-full w-full"
			xmlns="http://www.w3.org/2000/svg"
		>
			<!-- Arrow marker for directed edges -->
			{#if graph.directed}
				<defs>
					<marker
						id="arrowhead"
						markerWidth={arrowSize}
						markerHeight={arrowSize}
						refX={arrowSize}
						refY={arrowSize / 2}
						orient="auto"
					>
						<polygon
							points="0 0, {arrowSize} {arrowSize / 2}, 0 {arrowSize}"
							class="fill-base-content/70"
						/>
					</marker>
				</defs>
			{/if}

			<!-- Edges -->
			{#each graph.edges as edge}
				{@const sv = graph.vertices[edge.source]}
				{@const tv = graph.vertices[edge.target]}
				{@const pts = edgeEndpoints(vx(sv), vy(sv), vx(tv), vy(tv))}
				{@const mid = edgeMidpoint(vx(sv), vy(sv), vx(tv), vy(tv))}
				<line
					x1={pts.x1}
					y1={pts.y1}
					x2={pts.x2}
					y2={pts.y2}
					class="stroke-base-content/40"
					stroke-width="1.5"
					marker-end={graph.directed ? 'url(#arrowhead)' : undefined}
				/>
				{#if edge.weight !== null}
					<rect
						x={mid.x - 12}
						y={mid.y - 8}
						width="24"
						height="16"
						rx="3"
						class="fill-base-200"
					/>
					<text
						x={mid.x}
						y={mid.y + 1}
						text-anchor="middle"
						dominant-baseline="middle"
						class="fill-base-content text-[10px] font-mono font-semibold"
					>
						{edge.weight}
					</text>
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
					class="fill-primary stroke-primary-content"
					stroke-width="2"
				/>
				<text
					x={cx}
					y={cy + 1}
					text-anchor="middle"
					dominant-baseline="middle"
					class="fill-primary-content font-bold"
					font-size={nodeRadius * 0.9}
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
	{/if}
</div>

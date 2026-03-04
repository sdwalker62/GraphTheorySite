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

	// SVG viewport dimensions
	const svgWidth = 800;
	const svgHeight = 600;
	const nodeRadius = $derived(Math.max(8, Math.min(20, 200 / Math.sqrt(vertexCount))));
	const arrowSize = 8;

	let svgEl: SVGSVGElement | null = $state(null);

	function vx(v: { x: number }): number {
		return v.x * svgWidth;
	}

	function vy(v: { y: number }): number {
		return v.y * svgHeight;
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
			x2: tx - ux * nodeRadius,
			y2: ty - uy * nodeRadius
		};
	}

	function edgeMidpoint(sx: number, sy: number, tx: number, ty: number) {
		return { x: (sx + tx) / 2, y: (sy + ty) / 2 };
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

	function getEdgeWidth(source: number, target: number): string {
		if (!step) return '1.5';
		const ek = edgeKey(source, target);
		const ekRev = edgeKey(target, source);
		if (step.activeEdges.has(ek) || step.activeEdges.has(ekRev)) return '3';
		if (step.treeEdges.has(ek) || step.treeEdges.has(ekRev)) return '2.5';
		return '1.5';
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
							refX={arrowSize}
							refY={arrowSize / 2}
							orient="auto"
						>
							<polygon
								points="0 0, {arrowSize} {arrowSize / 2}, 0 {arrowSize}"
								class="fill-base-content/70"
							/>
						</marker>
						<marker
							id="arrowhead-active"
							markerWidth={arrowSize}
							markerHeight={arrowSize}
							refX={arrowSize}
							refY={arrowSize / 2}
							orient="auto"
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
							refX={arrowSize}
							refY={arrowSize / 2}
							orient="auto"
						>
							<polygon
								points="0 0, {arrowSize} {arrowSize / 2}, 0 {arrowSize}"
								class="fill-success"
							/>
						</marker>
					{/if}
				</defs>

				<!-- Edges -->
				{#each graph.edges as edge, i}
					{@const sv = graph.vertices[edge.source]}
					{@const tv = graph.vertices[edge.target]}
					{@const pts = edgeEndpoints(vx(sv), vy(sv), vx(tv), vy(tv))}
					{@const mid = edgeMidpoint(vx(sv), vy(sv), vx(tv), vy(tv))}
					{@const eStroke = getEdgeStroke(edge.source, edge.target)}
					{@const eWidth = getEdgeWidth(edge.source, edge.target)}
					{@const ek = edgeKey(edge.source, edge.target)}
					{@const ekRev = edgeKey(edge.target, edge.source)}
					<line
						x1={pts.x1}
						y1={pts.y1}
						x2={pts.x2}
						y2={pts.y2}
						class={eStroke}
						stroke-width={eWidth}
						marker-end={graph.directed
							? step && (step.activeEdges.has(ek) || step.activeEdges.has(ekRev))
								? 'url(#arrowhead-active)'
								: step && (step.treeEdges.has(ek) || step.treeEdges.has(ekRev))
									? 'url(#arrowhead-tree)'
									: 'url(#arrowhead)'
							: undefined}
					/>
					{#if edge.weight !== null}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<g
							class="cursor-pointer"
							onclick={() => startEditing(i, mid.x, mid.y)}
						>
							<rect
								x={mid.x - 14}
								y={mid.y - 10}
								width="28"
								height="20"
								rx="4"
								class="fill-base-200 stroke-base-300 transition-colors hover:fill-primary/20 hover:stroke-primary"
								stroke-width="1"
							/>
							<text
								x={mid.x}
								y={mid.y + 1}
								text-anchor="middle"
								dominant-baseline="middle"
								class="fill-base-content text-[10px] font-mono font-semibold pointer-events-none select-none"
							>
								{edge.weight}
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
				<div class="absolute bottom-2 left-2 flex gap-3 text-xs">
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

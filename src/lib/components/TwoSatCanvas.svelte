<script lang="ts">
	import {
		implicationGraph,
		twoSatSteps,
		twoSatCurrentStep,
		twoSatResult,
		twoSatState,
		type ImplicationGraph,
		type TwoSatResult
	} from '$lib/stores/twoSatStore';
	import type { AlgorithmStep } from '$lib/graph/algorithm';
	import { edgeKey } from '$lib/graph/algorithm';

	let graph: ImplicationGraph | null = $state(null);
	let steps: AlgorithmStep[] = $state([]);
	let stepIndex = $state(0);
	let result: TwoSatResult | null = $state(null);
	let numVars = $state(3);

	implicationGraph.subscribe((g) => (graph = g));
	twoSatSteps.subscribe((s) => (steps = s));
	twoSatCurrentStep.subscribe((s) => (stepIndex = s));
	twoSatResult.subscribe((r) => (result = r));
	twoSatState.subscribe((s) => (numVars = s.numVariables));

	const step = $derived(steps.length > 0 && stepIndex < steps.length ? steps[stepIndex] : null);

	const svgWidth = $derived(Math.max(600, numVars * 100));
	const svgHeight = 400;
	const nodeRadius = $derived(Math.max(14, Math.min(24, 200 / Math.sqrt(numVars * 2))));
	const fontSize = $derived(nodeRadius * 0.65);
	const arrowSize = $derived(Math.max(4, Math.min(8, 50 / Math.sqrt(numVars * 2))));

	function vx(pos: { x: number }): number {
		const pad = 0.08;
		return pad * svgWidth + pos.x * svgWidth * (1 - 2 * pad);
	}

	function vy(pos: { y: number }): number {
		const pad = 0.12;
		return pad * svgHeight + pos.y * svgHeight * (1 - 2 * pad);
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
			x2: tx - ux * (nodeRadius + arrowSize * 0.6),
			y2: ty - uy * (nodeRadius + arrowSize * 0.6)
		};
	}

	/** SCC-based coloring palette for regions */
	const sccPalette = [
		'hsla(210, 80%, 60%, 0.18)',
		'hsla(340, 75%, 55%, 0.18)',
		'hsla(160, 70%, 45%, 0.18)',
		'hsla(45, 90%, 55%, 0.18)',
		'hsla(280, 70%, 60%, 0.18)',
		'hsla(15, 85%, 55%, 0.18)',
		'hsla(190, 75%, 50%, 0.18)',
		'hsla(100, 60%, 45%, 0.18)',
		'hsla(330, 65%, 50%, 0.18)',
		'hsla(230, 70%, 55%, 0.18)',
	];

	const sccStrokePalette = [
		'hsla(210, 80%, 60%, 0.5)',
		'hsla(340, 75%, 55%, 0.5)',
		'hsla(160, 70%, 45%, 0.5)',
		'hsla(280, 70%, 60%, 0.5)',
		'hsla(45, 90%, 55%, 0.5)',
		'hsla(15, 85%, 55%, 0.5)',
		'hsla(190, 75%, 50%, 0.5)',
		'hsla(100, 60%, 45%, 0.5)',
		'hsla(330, 65%, 50%, 0.5)',
		'hsla(230, 70%, 55%, 0.5)',
	];

	/** Get SCC groups for region rendering */
	const sccGroups = $derived.by(() => {
		const groups = new Map<number, number[]>();
		if (!step || !step.data.scc || !graph) return groups;
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

	/** SCC regions — simple bounding box + padding approach for clarity */
	const sccRegions = $derived.by(() => {
		if (!graph || sccGroups.size === 0) return [];
		const pad = nodeRadius + 8;
		const regions: { x: number; y: number; w: number; h: number; fill: string; stroke: string; label: string }[] = [];
		let idx = 0;
		for (const [sccId, vertexIds] of sccGroups) {
			const fill = sccPalette[idx % sccPalette.length];
			const stroke = sccStrokePalette[idx % sccStrokePalette.length];
			idx++;

			let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
			for (const vi of vertexIds) {
				const px = vx(graph.positions[vi]);
				const py = vy(graph.positions[vi]);
				if (px < minX) minX = px;
				if (px > maxX) maxX = px;
				if (py < minY) minY = py;
				if (py > maxY) maxY = py;
			}

			regions.push({
				x: minX - pad,
				y: minY - pad,
				w: maxX - minX + 2 * pad,
				h: maxY - minY + 2 * pad,
				fill,
				stroke,
				label: `SCC ${sccId}`
			});
		}
		return regions;
	});

	function vertexFill(vid: number): string {
		if (!step) {
			// Color positive vs negative literals differently
			return vid % 2 === 0 ? 'fill-primary' : 'fill-secondary';
		}
		if (step.activeVertices.has(vid)) return 'fill-warning';
		if (step.frontierVertices.has(vid)) return 'fill-info';
		if (step.visitedVertices.has(vid)) return 'fill-success';
		return 'fill-base-300';
	}

	function vertexStroke(vid: number): string {
		if (!step) return vid % 2 === 0 ? 'stroke-primary-content' : 'stroke-secondary-content';
		if (step.activeVertices.has(vid)) return 'stroke-warning-content';
		if (step.visitedVertices.has(vid)) return 'stroke-success-content';
		return 'stroke-base-content/30';
	}

	function vertexTextFill(vid: number): string {
		if (!step) return vid % 2 === 0 ? 'fill-primary-content' : 'fill-secondary-content';
		if (step.activeVertices.has(vid)) return 'fill-warning-content';
		if (step.visitedVertices.has(vid)) return 'fill-success-content';
		return 'fill-base-content/40';
	}

	function getEdgeStroke(source: number, target: number): string {
		if (!step) return 'stroke-base-content/30';
		const ek = edgeKey(source, target);
		if (step.activeEdges.has(ek)) return 'stroke-warning';
		if (step.treeEdges.has(ek)) return 'stroke-success';
		return 'stroke-base-content/15';
	}

	function getEdgeWidth(source: number, target: number): number {
		if (!step) return 1;
		const ek = edgeKey(source, target);
		if (step.activeEdges.has(ek)) return 2.5;
		if (step.treeEdges.has(ek)) return 2;
		return 1;
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
					<circle cx="6" cy="8" r="2" stroke-width="1.5" />
					<circle cx="18" cy="8" r="2" stroke-width="1.5" />
					<circle cx="6" cy="16" r="2" stroke-width="1.5" />
					<circle cx="18" cy="16" r="2" stroke-width="1.5" />
					<line x1="8" y1="8" x2="16" y2="16" stroke-width="1.5" />
					<line x1="8" y1="16" x2="16" y2="8" stroke-width="1.5" />
				</svg>
				<p class="text-lg font-medium">Implication Graph</p>
				<p class="mt-1 text-sm">Add clauses and click <strong>Solve 2-SAT</strong> to build the graph</p>
			</div>
		{:else}
			<svg
				viewBox="0 0 {svgWidth} {svgHeight}"
				class="h-full w-full"
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs>
					<marker
						id="ig-arrow"
						markerWidth={arrowSize}
						markerHeight={arrowSize}
						refX={arrowSize * 0.9}
						refY={arrowSize / 2}
						orient="auto"
						markerUnits="userSpaceOnUse"
					>
						<polygon
							points="0 0, {arrowSize} {arrowSize / 2}, 0 {arrowSize}"
							class="fill-base-content/40"
						/>
					</marker>
					<marker
						id="ig-arrow-active"
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
						id="ig-arrow-tree"
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
				</defs>

				<!-- Row labels -->
				<text x="10" y={vy({ y: 0.25 }) + 4} class="fill-base-content/40 text-xs font-semibold" font-size="12">
					Positive
				</text>
				<text x="10" y={vy({ y: 0.75 }) + 4} class="fill-base-content/40 text-xs font-semibold" font-size="12">
					Negated
				</text>

				<!-- SCC Regions -->
				{#each sccRegions as region}
					<rect
						x={region.x}
						y={region.y}
						width={region.w}
						height={region.h}
						rx="8"
						fill={region.fill}
						stroke={region.stroke}
						stroke-width="1.5"
						stroke-dasharray="4 2"
					/>
				{/each}

				<!-- Edges -->
				{#each graph.edges as edge}
					{@const sx = vx(graph.positions[edge.source])}
					{@const sy = vy(graph.positions[edge.source])}
					{@const tx = vx(graph.positions[edge.target])}
					{@const ty = vy(graph.positions[edge.target])}
					{@const pts = edgeEndpoints(sx, sy, tx, ty)}
					{@const eStroke = getEdgeStroke(edge.source, edge.target)}
					{@const eWidth = getEdgeWidth(edge.source, edge.target)}
					{@const ek = edgeKey(edge.source, edge.target)}
					<line
						x1={pts.x1}
						y1={pts.y1}
						x2={pts.x2}
						y2={pts.y2}
						class={eStroke}
						stroke-width={eWidth}
						marker-end={step && step.activeEdges.has(ek)
							? 'url(#ig-arrow-active)'
							: step && step.treeEdges.has(ek)
								? 'url(#ig-arrow-tree)'
								: 'url(#ig-arrow)'}
					/>
				{/each}

				<!-- Vertices -->
				{#each graph.labels as label, i}
					{@const cx = vx(graph.positions[i])}
					{@const cy = vy(graph.positions[i])}
					<circle
						{cx}
						{cy}
						r={nodeRadius}
						class="{vertexFill(i)} {vertexStroke(i)} transition-colors duration-200"
						stroke-width="2"
					/>
					<text
						x={cx}
						y={cy + 1}
						text-anchor="middle"
						dominant-baseline="middle"
						class="{vertexTextFill(i)} font-bold transition-colors duration-200"
						font-size={fontSize}
					>
						{label}
					</text>
				{/each}
			</svg>

			<!-- Legend -->
			{#if step}
				<div class="absolute bottom-2 left-2 flex flex-wrap gap-3 text-xs">
					<span class="flex items-center gap-1">
						<span class="inline-block h-3 w-3 rounded-full bg-warning"></span> Active
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
			{:else}
				<div class="absolute bottom-2 left-2 flex gap-3 text-xs">
					<span class="flex items-center gap-1">
						<span class="inline-block h-3 w-3 rounded-full bg-primary"></span> Positive (xᵢ)
					</span>
					<span class="flex items-center gap-1">
						<span class="inline-block h-3 w-3 rounded-full bg-secondary"></span> Negated (¬xᵢ)
					</span>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Data table -->
	{#if step && graph && Object.keys(step.data).length > 0}
		<div class="border-t border-base-300 overflow-x-auto bg-base-200/50 px-4 py-2">
			<table class="table table-xs">
				<thead>
					<tr>
						<th class="text-xs">Literal</th>
						{#each graph.labels as lbl}
							<th class="text-center text-xs font-mono">{lbl}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each Object.entries(step.data) as [dataLabel, values]}
						<tr>
							<td class="font-semibold text-xs">{dataLabel}</td>
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

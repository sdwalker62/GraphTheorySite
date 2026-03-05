<script lang="ts">
	import { graphConfig, graphData, algorithmSteps, currentStep, totalSteps, isPlaying } from '$lib/stores/graphStore';
	import type { Graph, Vertex, Edge } from '$lib/graph/types';

	let config = $state({ directed: false, weighted: false, allowCycles: true, vertexCount: 6 });
	graphConfig.subscribe((c) => (config = { ...c }));

	// ───────────────────────── Canvas state ─────────────────────────
	const canvasW = 800;
	const canvasH = 600;
	const nodeRadius = 20;
	const arrowSize = 8;

	let vertices: Vertex[] = $state([]);
	let edges: Edge[] = $state([]);
	let nextId = $state(0);

	// Interaction modes
	type Mode = 'select' | 'vertex' | 'edge' | 'delete';
	let mode: Mode = $state('vertex');

	// Edge creation state
	let edgeSourceId: number | null = $state(null);

	// Drag state
	let draggingId: number | null = $state(null);
	let dragOffset = $state({ x: 0, y: 0 });

	// Hover state
	let hoveredVertexId: number | null = $state(null);
	let hoveredEdgeIdx: number | null = $state(null);

	// Weight editing
	let editingEdgeIdx: number | null = $state(null);
	let editValue = $state('');
	let editScreenPos = $state({ x: 0, y: 0 });
	let inputEl: HTMLInputElement | null = $state(null);
	let svgEl: SVGSVGElement | null = $state(null);

	// ───────────────────────── Helpers ─────────────────────────

	function nextLabel(): string {
		// A, B, C, ..., Z, A1, B1, ...
		const base = nextId % 26;
		const suffix = Math.floor(nextId / 26);
		return String.fromCharCode(65 + base) + (suffix > 0 ? suffix : '');
	}

	function vertexAt(svgX: number, svgY: number): Vertex | null {
		// Find vertex under cursor (reverse order = top-most first)
		for (let i = vertices.length - 1; i >= 0; i--) {
			const v = vertices[i];
			const dx = v.x * canvasW - svgX;
			const dy = v.y * canvasH - svgY;
			if (dx * dx + dy * dy <= (nodeRadius + 4) * (nodeRadius + 4)) return v;
		}
		return null;
	}

	function edgeAt(svgX: number, svgY: number): number | null {
		for (let i = edges.length - 1; i >= 0; i--) {
			const e = edges[i];
			const sv = vertices.find((v) => v.id === e.source);
			const tv = vertices.find((v) => v.id === e.target);
			if (!sv || !tv) continue;
			const sx = sv.x * canvasW, sy = sv.y * canvasH;
			const tx = tv.x * canvasW, ty = tv.y * canvasH;
			const dist = pointToSegmentDist(svgX, svgY, sx, sy, tx, ty);
			if (dist < 8) return i;
		}
		return null;
	}

	function pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
		const dx = bx - ax, dy = by - ay;
		const lenSq = dx * dx + dy * dy;
		if (lenSq < 0.001) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
		let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
		t = Math.max(0, Math.min(1, t));
		const cx = ax + t * dx, cy = ay + t * dy;
		return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
	}

	function hasEdge(src: number, tgt: number): boolean {
		return edges.some((e) => e.source === src && e.target === tgt);
	}

	function svgCoords(e: MouseEvent): { x: number; y: number } {
		if (!svgEl) return { x: 0, y: 0 };
		const ctm = svgEl.getScreenCTM();
		if (!ctm) return { x: 0, y: 0 };
		const pt = svgEl.createSVGPoint();
		pt.x = e.clientX;
		pt.y = e.clientY;
		const svgPt = pt.matrixTransform(ctm.inverse());
		return { x: svgPt.x, y: svgPt.y };
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

	function syncToStore() {
		// Build a clean Graph and push to graphData
		// Re-index vertices 0..n-1
		const idMap = new Map<number, number>();
		const newVerts: Vertex[] = vertices.map((v, i) => {
			idMap.set(v.id, i);
			return { id: i, label: v.label, x: v.x, y: v.y };
		});
		const newEdges: Edge[] = edges
			.filter((e) => idMap.has(e.source) && idMap.has(e.target))
			.map((e) => ({
				source: idMap.get(e.source)!,
				target: idMap.get(e.target)!,
				weight: config.weighted ? (e.weight ?? 1) : null
			}));

		const graph: Graph = {
			vertices: newVerts,
			edges: newEdges,
			directed: config.directed,
			weighted: config.weighted
		};
		graphData.set(graph);
		graphConfig.update((c) => ({ ...c, vertexCount: newVerts.length }));

		// Clear algorithm run state
		algorithmSteps.set([]);
		currentStep.set(0);
		totalSteps.set(0);
		isPlaying.set(false);
	}

	// ───────────────────────── Event handlers ─────────────────────────

	function onCanvasClick(e: MouseEvent) {
		if (e.button !== 0) return;
		const { x, y } = svgCoords(e);
		const v = vertexAt(x, y);

		if (mode === 'vertex') {
			if (v) return; // don't place on top of existing
			const newV: Vertex = {
				id: nextId,
				label: nextLabel(),
				x: x / canvasW,
				y: y / canvasH
			};
			nextId++;
			vertices = [...vertices, newV];
			syncToStore();
		} else if (mode === 'edge') {
			if (!v) {
				edgeSourceId = null;
				return;
			}
			if (edgeSourceId === null) {
				edgeSourceId = v.id;
			} else {
				if (edgeSourceId !== v.id) {
					// No self-loops, no multi-edges
					if (!hasEdge(edgeSourceId, v.id)) {
						const newEdge: Edge = {
							source: edgeSourceId,
							target: v.id,
							weight: config.weighted ? 1 : null
						};
						edges = [...edges, newEdge];
						// For undirected, also add reverse
						if (!config.directed && !hasEdge(v.id, edgeSourceId)) {
							edges = [...edges, { source: v.id, target: edgeSourceId, weight: newEdge.weight }];
						}
						syncToStore();
					}
				}
				edgeSourceId = null;
			}
		} else if (mode === 'delete') {
			if (v) {
				deleteVertex(v.id);
			} else {
				const ei = edgeAt(x, y);
				if (ei !== null) deleteEdge(ei);
			}
		} else if (mode === 'select') {
			// Handled via mousedown/move/up for dragging
		}
	}

	function onCanvasMouseDown(e: MouseEvent) {
		if (e.button !== 0 || mode !== 'select') return;
		const { x, y } = svgCoords(e);
		const v = vertexAt(x, y);
		if (v) {
			draggingId = v.id;
			dragOffset = { x: v.x * canvasW - x, y: v.y * canvasH - y };
			e.preventDefault();
		}
	}

	function onCanvasMouseMove(e: MouseEvent) {
		const { x, y } = svgCoords(e);

		if (draggingId !== null) {
			const nx = Math.max(0.03, Math.min(0.97, (x + dragOffset.x) / canvasW));
			const ny = Math.max(0.03, Math.min(0.97, (y + dragOffset.y) / canvasH));
			vertices = vertices.map((v) =>
				v.id === draggingId ? { ...v, x: nx, y: ny } : v
			);
			return;
		}

		// Hover detection
		const v = vertexAt(x, y);
		hoveredVertexId = v?.id ?? null;
		if (!v) {
			hoveredEdgeIdx = edgeAt(x, y);
		} else {
			hoveredEdgeIdx = null;
		}
	}

	function onCanvasMouseUp() {
		if (draggingId !== null) {
			draggingId = null;
			syncToStore();
		}
	}

	function onContextMenu(e: MouseEvent) {
		e.preventDefault();
		const { x, y } = svgCoords(e);
		const v = vertexAt(x, y);
		if (v) {
			deleteVertex(v.id);
			return;
		}
		const ei = edgeAt(x, y);
		if (ei !== null) deleteEdge(ei);
	}

	function deleteVertex(id: number) {
		vertices = vertices.filter((v) => v.id !== id);
		edges = edges.filter((e) => e.source !== id && e.target !== id);
		if (edgeSourceId === id) edgeSourceId = null;
		syncToStore();
	}

	function deleteEdge(idx: number) {
		const e = edges[idx];
		// For undirected, also remove reverse
		if (!config.directed) {
			edges = edges.filter((ed) =>
				!(ed.source === e.source && ed.target === e.target) &&
				!(ed.source === e.target && ed.target === e.source)
			);
		} else {
			edges = edges.filter((_, i) => i !== idx);
		}
		syncToStore();
	}

	// Weight editing
	function onEdgeDblClick(idx: number, midX: number, midY: number) {
		if (!config.weighted) return;
		editingEdgeIdx = idx;
		editValue = String(edges[idx].weight ?? 1);
		editScreenPos = svgToScreen(midX, midY);
		requestAnimationFrame(() => {
			inputEl?.focus();
			inputEl?.select();
		});
	}

	function commitWeightEdit() {
		if (editingEdgeIdx === null) return;
		const parsed = parseInt(editValue, 10);
		if (!isNaN(parsed)) {
			const e = edges[editingEdgeIdx];
			edges = edges.map((ed, i) => {
				if (i === editingEdgeIdx) return { ...ed, weight: parsed };
				// For undirected, sync reverse
				if (!config.directed && ed.source === e.target && ed.target === e.source) {
					return { ...ed, weight: parsed };
				}
				return ed;
			});
			syncToStore();
		}
		editingEdgeIdx = null;
	}

	function cancelWeightEdit() {
		editingEdgeIdx = null;
	}

	function onWeightKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') commitWeightEdit();
		else if (e.key === 'Escape') cancelWeightEdit();
	}

	// ───────────────────────── Clear ─────────────────────────
	function clearAll() {
		vertices = [];
		edges = [];
		nextId = 0;
		edgeSourceId = null;
		draggingId = null;
		syncToStore();
	}

	// ───────────────────────── Edge rendering helpers ─────────────────────────
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
			x2: tx - ux * (nodeRadius + (config.directed ? arrowSize * 0.6 : 0)),
			y2: ty - uy * (nodeRadius + (config.directed ? arrowSize * 0.6 : 0))
		};
	}

	// Cursor for current mode
	const cursorClass = $derived(
		mode === 'vertex' ? 'cursor-crosshair' :
		mode === 'edge' ? 'cursor-cell' :
		mode === 'delete' ? 'cursor-not-allowed' :
		'cursor-default'
	);

	// The source vertex being connected (for edge mode visual feedback)
	const edgeSourceVertex = $derived(
		edgeSourceId !== null ? vertices.find((v) => v.id === edgeSourceId) ?? null : null
	);

	// Deduplicated edges for undirected rendering (only show one direction)
	const renderEdges = $derived.by(() => {
		if (config.directed) return edges.map((e, i) => ({ ...e, _idx: i }));
		const seen = new Set<string>();
		const result: (Edge & { _idx: number })[] = [];
		for (let i = 0; i < edges.length; i++) {
			const e = edges[i];
			const key = `${Math.min(e.source, e.target)}-${Math.max(e.source, e.target)}`;
			if (!seen.has(key)) {
				seen.add(key);
				result.push({ ...e, _idx: i });
			}
		}
		return result;
	});
</script>

<div class="relative flex h-full min-h-0 w-full flex-col rounded-box bg-base-100 border border-base-300 overflow-hidden">
	<!-- Toolbar -->
	<div class="flex items-center gap-1.5 border-b border-base-300 bg-base-200/50 px-3 py-1.5">
		<span class="mr-1 text-xs font-semibold text-base-content/50 uppercase tracking-wider">Mode</span>
		<div class="join">
			<button
				class="join-item btn btn-xs {mode === 'select' ? 'btn-primary' : 'btn-ghost'}"
				onclick={() => { mode = 'select'; edgeSourceId = null; }}
				title="Select & move vertices"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
				</svg>
				Move
			</button>
			<button
				class="join-item btn btn-xs {mode === 'vertex' ? 'btn-primary' : 'btn-ghost'}"
				onclick={() => { mode = 'vertex'; edgeSourceId = null; }}
				title="Click to place vertices"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
					<circle cx="12" cy="12" r="6" />
				</svg>
				Vertex
			</button>
			<button
				class="join-item btn btn-xs {mode === 'edge' ? 'btn-primary' : 'btn-ghost'}"
				onclick={() => { mode = 'edge'; edgeSourceId = null; }}
				title="Click two vertices to connect"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<line x1="5" y1="19" x2="19" y2="5" />
					<circle cx="5" cy="19" r="2" fill="currentColor" />
					<circle cx="19" cy="5" r="2" fill="currentColor" />
				</svg>
				Edge
			</button>
			<button
				class="join-item btn btn-xs {mode === 'delete' ? 'btn-error' : 'btn-ghost'}"
				onclick={() => { mode = 'delete'; edgeSourceId = null; }}
				title="Click to delete"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path d="M6 18L18 6M6 6l12 12" />
				</svg>
				Delete
			</button>
		</div>

		<div class="ml-auto flex items-center gap-2">
			<span class="badge badge-sm badge-outline font-mono">{vertices.length}V {renderEdges.length}E</span>
			<button class="btn btn-xs btn-ghost btn-error" onclick={clearAll} disabled={vertices.length === 0} title="Clear all">
				Clear
			</button>
		</div>
	</div>

	<!-- Canvas -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden {cursorClass}"
		onmouseup={onCanvasMouseUp}
	>
		{#if vertices.length === 0 && mode === 'vertex'}
			<div class="pointer-events-none absolute inset-0 flex items-center justify-center text-base-content/30">
				<div class="text-center">
					<svg xmlns="http://www.w3.org/2000/svg" class="mx-auto mb-3 h-12 w-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<circle cx="12" cy="5" r="2" stroke-width="1.5" />
						<circle cx="5" cy="19" r="2" stroke-width="1.5" />
						<circle cx="19" cy="19" r="2" stroke-width="1.5" />
						<line x1="12" y1="7" x2="5" y2="17" stroke-width="1.5" />
						<line x1="12" y1="7" x2="19" y2="17" stroke-width="1.5" />
						<line x1="7" y1="19" x2="17" y2="19" stroke-width="1.5" />
					</svg>
					<p class="text-sm font-medium">Click anywhere to place a vertex</p>
					<p class="mt-1 text-xs">Right-click to delete &middot; Switch to <strong>Edge</strong> mode to connect</p>
				</div>
			</div>
		{/if}

		<svg
			bind:this={svgEl}
			viewBox="0 0 {canvasW} {canvasH}"
			class="h-full w-full"
			xmlns="http://www.w3.org/2000/svg"
			onclick={onCanvasClick}
			onmousedown={onCanvasMouseDown}
			onmousemove={onCanvasMouseMove}
			oncontextmenu={onContextMenu}
		>
			<defs>
				{#if config.directed}
					<marker
						id="designer-arrow"
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
						id="designer-arrow-hl"
						markerWidth={arrowSize}
						markerHeight={arrowSize}
						refX={arrowSize * 0.9}
						refY={arrowSize / 2}
						orient="auto"
						markerUnits="userSpaceOnUse"
					>
						<polygon
							points="0 0, {arrowSize} {arrowSize / 2}, 0 {arrowSize}"
							class="fill-primary"
						/>
					</marker>
				{/if}
			</defs>

			<!-- Grid dots for visual reference -->
			{#each Array(9) as _, gx}
				{#each Array(7) as _, gy}
					<circle
						cx={(gx + 1) * canvasW / 10}
						cy={(gy + 1) * canvasH / 8}
						r="1"
						class="fill-base-content/8"
					/>
				{/each}
			{/each}

			<!-- Edges -->
			{#each renderEdges as edge}
				{@const sv = vertices.find((v) => v.id === edge.source)}
				{@const tv = vertices.find((v) => v.id === edge.target)}
				{#if sv && tv}
					{@const sx = sv.x * canvasW}
					{@const sy = sv.y * canvasH}
					{@const tx = tv.x * canvasW}
					{@const ty = tv.y * canvasH}
					{@const pts = edgeEndpoints(sx, sy, tx, ty)}
					{@const mx = (sx + tx) / 2}
					{@const my = (sy + ty) / 2}
					{@const isHovered = hoveredEdgeIdx === edge._idx}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<line
						x1={pts.x1}
						y1={pts.y1}
						x2={pts.x2}
						y2={pts.y2}
						class={isHovered && mode === 'delete' ? 'stroke-error' : 'stroke-base-content/40'}
						stroke-width={isHovered ? 2.5 : 1.5}
						marker-end={config.directed
							? isHovered && mode === 'delete' ? undefined : 'url(#designer-arrow)'
							: undefined}
					/>
					{#if config.weighted}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<g
							class="cursor-pointer"
							ondblclick={() => onEdgeDblClick(edge._idx, mx, my)}
						>
							<rect
								x={mx - 14}
								y={my - 10}
								width="28"
								height="20"
								rx="3"
								class="fill-base-200 stroke-base-300 transition-colors hover:fill-primary/20 hover:stroke-primary"
								stroke-width="0.8"
							/>
							<text
								x={mx}
								y={my + 1}
								text-anchor="middle"
								dominant-baseline="middle"
								class="fill-base-content font-mono font-semibold pointer-events-none select-none"
								font-size="10"
							>
								{edge.weight ?? 1}
							</text>
						</g>
					{/if}
				{/if}
			{/each}

			<!-- Pending edge line (edge mode, first vertex selected) -->
			{#if edgeSourceVertex}
				{@const sx = edgeSourceVertex.x * canvasW}
				{@const sy = edgeSourceVertex.y * canvasH}
				<circle
					cx={sx}
					cy={sy}
					r={nodeRadius + 4}
					fill="none"
					class="stroke-primary"
					stroke-width="2"
					stroke-dasharray="4 3"
				/>
			{/if}

			<!-- Vertices -->
			{#each vertices as vertex}
				{@const cx = vertex.x * canvasW}
				{@const cy = vertex.y * canvasH}
				{@const isSource = edgeSourceId === vertex.id}
				{@const isHovered = hoveredVertexId === vertex.id}
				{@const isDragging = draggingId === vertex.id}
				<circle
					{cx}
					{cy}
					r={nodeRadius}
					class="{isSource ? 'fill-primary stroke-primary-content' :
						isDragging ? 'fill-accent stroke-accent-content' :
						isHovered && mode === 'delete' ? 'fill-error stroke-error-content' :
						isHovered ? 'fill-secondary stroke-secondary-content' :
						'fill-primary stroke-primary-content'}"
					stroke-width="2"
				/>
				<text
					x={cx}
					y={cy + 1}
					text-anchor="middle"
					dominant-baseline="middle"
					class="{isHovered && mode === 'delete' ? 'fill-error-content' : 'fill-primary-content'} font-bold select-none pointer-events-none"
					font-size="14"
				>
					{vertex.label}
				</text>
			{/each}
		</svg>

		<!-- Weight editor overlay -->
		{#if editingEdgeIdx !== null}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="absolute inset-0" onclick={cancelWeightEdit}></div>
			<input
				bind:this={inputEl}
				type="number"
				class="input input-xs input-bordered absolute w-16 text-center font-mono font-semibold z-10"
				style="left: {editScreenPos.x - 32}px; top: {editScreenPos.y - 14}px;"
				value={editValue}
				oninput={(e) => (editValue = e.currentTarget.value)}
				onblur={commitWeightEdit}
				onkeydown={onWeightKeydown}
			/>
		{/if}
	</div>

	<!-- Status bar -->
	<div class="flex items-center gap-3 border-t border-base-300 bg-base-200/50 px-3 py-1.5 text-xs text-base-content/60">
		{#if mode === 'vertex'}
			<span>Click empty space to <strong>place</strong> a vertex</span>
		{:else if mode === 'edge'}
			{#if edgeSourceId !== null}
				<span>Click a second vertex to <strong>connect</strong> (or empty space to cancel)</span>
			{:else}
				<span>Click a vertex to start an <strong>edge</strong></span>
			{/if}
		{:else if mode === 'delete'}
			<span>Click a vertex or edge to <strong>delete</strong> it</span>
		{:else}
			<span>Drag vertices to <strong>reposition</strong> them</span>
		{/if}
		<span class="ml-auto text-base-content/40">Right-click to delete &middot; Double-click weight to edit</span>
	</div>
</div>

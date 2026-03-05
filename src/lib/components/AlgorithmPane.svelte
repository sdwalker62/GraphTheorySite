<script lang="ts">
	import {
		algorithms,
		selectedAlgorithm,
		graphConfig,
		graphData,
		algorithmSteps,
		startVertex,
		sinkVertex,
		currentStep,
		totalSteps,
		isPlaying,
		playbackSpeed,
		type Algorithm
	} from '$lib/stores/graphStore';
	import type { Graph } from '$lib/graph/types';
	import { runDFS } from '$lib/graph/dfs';
	import { runBFS } from '$lib/graph/bfs';
	import { runSCC } from '$lib/graph/scc';
	import { runTopoSort } from '$lib/graph/toposort';
	import { runDijkstra } from '$lib/graph/dijkstra';
	import { runBellmanFord } from '$lib/graph/bellmanford';
	import { runFloydWarshall } from '$lib/graph/floydwarshall';
	import { runKruskal } from '$lib/graph/kruskal';
	import { runPrim } from '$lib/graph/prim';
	import { runFordFulkerson, runEdmondsKarp } from '$lib/graph/maxflow';

	let config = $state({ directed: false, weighted: false, allowCycles: true });
	let graph: Graph | null = $state(null);
	let start = $state(0);
	let sink = $state(1);

	graphConfig.subscribe((c) => {
		config = { directed: c.directed, weighted: c.weighted, allowCycles: c.allowCycles };
	});
	graphData.subscribe((g) => (graph = g));
	startVertex.subscribe((v) => (start = v));
	sinkVertex.subscribe((v) => (sink = v));

	// Group algorithms by category
	const grouped = $derived.by(() => {
		const groups: Record<string, typeof algorithms> = {};
		for (const algo of algorithms) {
			if (!groups[algo.category]) groups[algo.category] = [];
			groups[algo.category].push(algo);
		}
		return groups;
	});

	function isCompatible(algo: (typeof algorithms)[0]): boolean {
		if (algo.requiresDirected === true && !config.directed) return false;
		if (algo.requiresDirected === false && config.directed) return false;
		if (algo.requiresWeighted === true && !config.weighted) return false;
		if (algo.requiresAcyclic && config.allowCycles) return false;
		return true;
	}

	let current: Algorithm | null = $state(null);
	selectedAlgorithm.subscribe((v) => (current = v));

	const currentAlgoInfo = $derived(algorithms.find((a) => a.name === current) ?? null);
	const needsStartVertex = $derived(currentAlgoInfo?.requiresStartVertex ?? false);
	const needsSinkVertex = $derived(current === 'Ford-Fulkerson' || current === 'Edmonds-Karp');
	const isImplemented = $derived(current === 'DFS' || current === 'BFS' || current === 'SCC' || current === 'Topological Sort' || current === "Dijkstra's" || current === 'Bellman-Ford' || current === 'Floyd-Warshall' || current === "Kruskal's" || current === "Prim's" || current === 'Ford-Fulkerson' || current === 'Edmonds-Karp');

	function select(name: Algorithm) {
		selectedAlgorithm.set(name);
		// Reset steps when changing algorithm
		algorithmSteps.set([]);
		currentStep.set(0);
		totalSteps.set(0);
		isPlaying.set(false);
	}

	function runAlgorithm() {
		if (!graph || !current) return;

		let steps;
		switch (current) {
			case 'DFS':
				steps = runDFS(graph, start);
				break;
			case 'BFS':
				steps = runBFS(graph, start);
				break;
			case 'SCC':
				steps = runSCC(graph);
				break;
			case 'Topological Sort':
				steps = runTopoSort(graph);
				break;
			case "Dijkstra's":
				steps = runDijkstra(graph, start);
				break;
			case 'Bellman-Ford':
				steps = runBellmanFord(graph, start);
				break;
			case 'Floyd-Warshall':
				steps = runFloydWarshall(graph);
				break;
			case "Kruskal's":
				steps = runKruskal(graph);
				break;
			case "Prim's":
				steps = runPrim(graph);
				break;
			case 'Ford-Fulkerson':
				steps = runFordFulkerson(graph, start, sink);
				break;
			case 'Edmonds-Karp':
				steps = runEdmondsKarp(graph, start, sink);
				break;
			default:
				return;
		}

		algorithmSteps.set(steps);
		totalSteps.set(steps.length - 1);
		currentStep.set(0);
		isPlaying.set(true);
	}

	function onStartVertexChange(e: Event) {
		const val = parseInt((e.currentTarget as HTMLSelectElement).value, 10);
		startVertex.set(val);
	}

	function onSinkVertexChange(e: Event) {
		const val = parseInt((e.currentTarget as HTMLSelectElement).value, 10);
		sinkVertex.set(val);
	}

	// Playback speed control
	const speedOptions = [
		{ label: '0.25x', ms: 2000 },
		{ label: '0.5x', ms: 1000 },
		{ label: '1x', ms: 500 },
		{ label: '1.5x', ms: 333 },
		{ label: '2x', ms: 250 },
		{ label: '3x', ms: 167 },
		{ label: '4x', ms: 125 }
	];

	let speedIndex = $state(2); // default 1x
	const speedLabel = $derived(speedOptions[speedIndex].label);

	// Sync store on init
	playbackSpeed.set(speedOptions[2].ms);

	function onSpeedChange(e: Event) {
		const idx = parseInt((e.currentTarget as HTMLInputElement).value, 10);
		speedIndex = idx;
		playbackSpeed.set(speedOptions[idx].ms);
	}
</script>

<div class="flex h-full flex-col bg-base-200">
	<!-- Scrollable algorithm list -->
	<div class="flex-1 overflow-y-auto p-4 pb-2">
		<h2 class="mb-4 text-lg font-semibold">Algorithms</h2>

		{#each Object.entries(grouped) as [category, algos]}
			<div class="mb-3">
				<h3 class="mb-1 text-xs font-bold uppercase tracking-wider text-base-content/60">
					{category}
				</h3>
				<ul class="menu menu-sm w-full rounded-box bg-base-100">
					{#each algos as algo}
						{@const compatible = isCompatible(algo)}
						<li>
							<button
								class="flex items-center justify-between"
								class:active={current === algo.name}
								class:opacity-40={!compatible}
								disabled={!compatible}
								onclick={() => select(algo.name)}
							>
								<span>{algo.name}</span>
								{#if !compatible}
									<span class="badge badge-xs badge-ghost">N/A</span>
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>

	<!-- Pinned controls at bottom -->
	{#if current && graph}
		<div class="shrink-0 border-t border-base-300 bg-base-200 p-4 pt-3 space-y-3">
			<!-- Start vertex selector -->
			{#if needsStartVertex || current === 'DFS'}
				<div class="form-control">
					<label class="label" for="start-vertex">
						<span class="label-text text-sm">{needsSinkVertex ? 'Source Vertex' : 'Start Vertex'}</span>
					</label>
					<select
						id="start-vertex"
						class="select select-bordered select-sm w-full"
						value={start}
						onchange={onStartVertexChange}
					>
						{#each graph.vertices as v}
							<option value={v.id}>{v.label}</option>
						{/each}
					</select>
				</div>
			{/if}

			{#if needsSinkVertex}
				<div class="form-control">
					<label class="label" for="sink-vertex">
						<span class="label-text text-sm">Sink Vertex</span>
					</label>
					<select
						id="sink-vertex"
						class="select select-bordered select-sm w-full"
						value={sink}
						onchange={onSinkVertexChange}
					>
						{#each graph.vertices as v}
							<option value={v.id}>{v.label}</option>
						{/each}
					</select>
				</div>
			{/if}

			<!-- Playback speed -->
			<div class="form-control">
				<label class="label" for="playback-speed">
					<span class="label-text text-sm">Speed</span>
					<span class="label-text-alt font-mono text-xs">{speedLabel}</span>
				</label>
				<input
					id="playback-speed"
					type="range"
					min="0"
					max={speedOptions.length - 1}
					value={speedIndex}
					class="range range-xs range-primary"
					oninput={onSpeedChange}
				/>
				<div class="flex w-full justify-between px-0.5 pt-1">
					<span class="text-[10px] text-base-content/40">0.25x</span>
					<span class="text-[10px] text-base-content/40">4x</span>
				</div>
			</div>

			<!-- Run button -->
			<button
				class="btn btn-success btn-sm w-full"
				disabled={!isImplemented}
				onclick={runAlgorithm}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
					<path d="M8 5v14l11-7z" />
				</svg>
				{#if isImplemented}
					Run {current}
				{:else}
					{current} (coming soon)
				{/if}
			</button>
		</div>
	{/if}
</div>

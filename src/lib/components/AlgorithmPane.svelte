<script lang="ts">
	import {
		algorithms,
		selectedAlgorithm,
		graphConfig,
		graphData,
		algorithmSteps,
		startVertex,
		currentStep,
		totalSteps,
		isPlaying,
		type Algorithm
	} from '$lib/stores/graphStore';
	import type { Graph } from '$lib/graph/types';
	import { runDFS } from '$lib/graph/dfs';
	import { runBFS } from '$lib/graph/bfs';

	let config = $state({ directed: false, weighted: false, allowCycles: true });
	let graph: Graph | null = $state(null);
	let start = $state(0);

	graphConfig.subscribe((c) => {
		config = { directed: c.directed, weighted: c.weighted, allowCycles: c.allowCycles };
	});
	graphData.subscribe((g) => (graph = g));
	startVertex.subscribe((v) => (start = v));

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
	const isImplemented = $derived(current === 'DFS' || current === 'BFS');

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
</script>

<div class="flex h-full flex-col overflow-y-auto bg-base-200 p-4">
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

	{#if current && graph}
		<div class="divider my-2"></div>

		<!-- Start vertex selector (for algorithms that need it) -->
		{#if needsStartVertex || current === 'DFS'}
			<div class="form-control mb-3">
				<label class="label" for="start-vertex">
					<span class="label-text text-sm">Start Vertex</span>
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
	{/if}
</div>

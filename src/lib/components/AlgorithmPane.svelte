<script lang="ts">
	import { algorithms, selectedAlgorithm, graphConfig, type Algorithm } from '$lib/stores/graphStore';

	let config = $state({ directed: false, weighted: false, allowCycles: true });

	graphConfig.subscribe((c) => {
		config = { directed: c.directed, weighted: c.weighted, allowCycles: c.allowCycles };
	});

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

	function select(name: Algorithm) {
		selectedAlgorithm.set(name);
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
</div>

<script lang="ts">
	import AlgorithmPane from '$lib/components/AlgorithmPane.svelte';
	import ConfigPane from '$lib/components/ConfigPane.svelte';
	import GraphCanvas from '$lib/components/GraphCanvas.svelte';
	import IterationSlider from '$lib/components/IterationSlider.svelte';
	import TwoSatPane from '$lib/components/TwoSatPane.svelte';
	import TwoSatCanvas from '$lib/components/TwoSatCanvas.svelte';
	import TwoSatSlider from '$lib/components/TwoSatSlider.svelte';
	import { activeTab } from '$lib/stores/graphStore';

	let tab = $state<'graphs' | '2sat'>('graphs');
	activeTab.subscribe((t) => (tab = t));
</script>

<svelte:head>
	<title>Graph Theory Explorer</title>
	<meta name="description" content="Interactive graph algorithm visualizer for studying DFS, BFS, Dijkstra's, and more." />
</svelte:head>

{#if tab === 'graphs'}
	<div class="flex h-full flex-col">
		<div class="flex flex-1 overflow-hidden">
			<!-- Left pane: Algorithm selection -->
			<aside class="w-64 shrink-0 overflow-y-auto border-r border-base-300">
				<AlgorithmPane />
			</aside>

			<!-- Center: Graph visualization -->
			<div class="flex-1 overflow-hidden p-4">
				<GraphCanvas />
			</div>

			<!-- Right pane: Configuration -->
			<aside class="w-72 shrink-0 overflow-y-auto border-l border-base-300">
				<ConfigPane />
			</aside>
		</div>

		<!-- Bottom: Iteration slider -->
		<div class="border-t border-base-300">
			<IterationSlider />
		</div>
	</div>
{:else}
	<div class="flex h-full flex-col">
		<div class="flex flex-1 overflow-hidden">
			<!-- Left pane: 2-SAT clause editor -->
			<aside class="w-80 shrink-0 overflow-y-auto border-r border-base-300">
				<TwoSatPane />
			</aside>

			<!-- Center: Implication graph -->
			<div class="flex-1 overflow-hidden p-4">
				<TwoSatCanvas />
			</div>
		</div>

		<!-- Bottom: 2-SAT iteration slider -->
		<div class="border-t border-base-300">
			<TwoSatSlider />
		</div>
	</div>
{/if}

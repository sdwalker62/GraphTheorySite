<script lang="ts">
	import AlgorithmPane from '$lib/components/AlgorithmPane.svelte';
	import ConfigPane from '$lib/components/ConfigPane.svelte';
	import GraphCanvas from '$lib/components/GraphCanvas.svelte';
	import IterationSlider from '$lib/components/IterationSlider.svelte';
</script>

<svelte:head>
	<title>Graph Theory Explorer</title>
	<meta name="description" content="Interactive graph algorithm visualizer for studying DFS, BFS, Dijkstra's, and more." />
</svelte:head>

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

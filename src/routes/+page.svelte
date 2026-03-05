<script lang="ts">
	import AlgorithmPane from '$lib/components/AlgorithmPane.svelte';
	import AlgorithmReference from '$lib/components/AlgorithmReference.svelte';
	import ConfigPane from '$lib/components/ConfigPane.svelte';
	import GraphCanvas from '$lib/components/GraphCanvas.svelte';
	import GraphDesigner from '$lib/components/GraphDesigner.svelte';
	import IterationSlider from '$lib/components/IterationSlider.svelte';
	import TwoSatPane from '$lib/components/TwoSatPane.svelte';
	import TwoSatCanvas from '$lib/components/TwoSatCanvas.svelte';
	import TwoSatSlider from '$lib/components/TwoSatSlider.svelte';
	import { activeTab, graphMode, type GraphMode } from '$lib/stores/graphStore';

	let tab = $state<'graphs' | '2sat'>('graphs');
	activeTab.subscribe((t) => (tab = t));

	let gMode = $state<GraphMode>('view');
	graphMode.subscribe((m) => (gMode = m));

	function toggleGraphMode() {
		graphMode.update((m) => (m === 'view' ? 'design' : 'view'));
	}
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

			<!-- Center: Graph visualization or designer -->
			<div class="flex flex-1 flex-col overflow-hidden">
				<!-- Mode toggle bar -->
				<div class="flex items-center justify-center gap-1 border-b border-base-300 bg-base-200/30 py-1">
					<div class="join">
						<button
							class="join-item btn btn-xs {gMode === 'view' ? 'btn-primary' : 'btn-ghost'}"
							onclick={() => graphMode.set('view')}
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
								<path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7Z" />
							</svg>
							Visualize
						</button>
						<button
							class="join-item btn btn-xs {gMode === 'design' ? 'btn-primary' : 'btn-ghost'}"
							onclick={() => graphMode.set('design')}
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path d="M16.862 4.487a2.032 2.032 0 1 1 2.872 2.872L7.5 19.593l-4 1 1-4L16.862 4.487Z" />
							</svg>
							Design
						</button>
						<button
							class="join-item btn btn-xs {gMode === 'reference' ? 'btn-primary' : 'btn-ghost'}"
							onclick={() => graphMode.set('reference')}
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
							</svg>
							Algorithm
						</button>
					</div>
				</div>
				<div class="flex-1 overflow-hidden p-4">
					{#if gMode === 'design'}
						<GraphDesigner />
					{:else if gMode === 'reference'}
						<AlgorithmReference />
					{:else}
						<GraphCanvas />
					{/if}
				</div>
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

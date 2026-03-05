<script lang="ts">
	import { selectedAlgorithm } from '$lib/stores/graphStore';
	import { algorithmReferences, type AlgorithmReference } from '$lib/graph/algorithmReference';

	let algorithm: string | null = $state(null);
	selectedAlgorithm.subscribe((a) => (algorithm = a));

	const ref = $derived<AlgorithmReference | null>(
		algorithm && algorithmReferences[algorithm] ? algorithmReferences[algorithm] : null
	);

	/** All available references for browsing when no algorithm is selected */
	const allRefs = Object.values(algorithmReferences);
</script>

<div class="flex h-full min-h-0 w-full flex-col rounded-box border border-base-300 bg-base-100 overflow-hidden">
	{#if ref}
		<!-- Single algorithm view -->
		<div class="flex-1 overflow-y-auto p-6">
			<!-- Header -->
			<div class="mb-6">
				<h2 class="text-2xl font-bold text-base-content">{ref.fullName}</h2>
				<p class="mt-1 text-base text-base-content/70">{ref.summary}</p>
			</div>

			<!-- Complexity badges -->
			<div class="mb-6 flex flex-wrap gap-2">
				<div class="badge badge-primary badge-lg gap-1 font-mono">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
					</svg>
					Time: {ref.complexity.time}
				</div>
				<div class="badge badge-secondary badge-lg gap-1 font-mono">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
					</svg>
					Space: {ref.complexity.space}
				</div>
			</div>

			<!-- Explanation -->
			<div class="mb-6">
				<h3 class="mb-3 text-lg font-semibold text-base-content flex items-center gap-2">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
					</svg>
					How It Works
				</h3>
				<div class="space-y-3">
					{#each ref.explanation as paragraph}
						<p class="text-sm leading-relaxed text-base-content/80">{paragraph}</p>
					{/each}
				</div>
			</div>

			<!-- Pseudocode -->
			<div class="mb-6">
				<h3 class="mb-3 text-lg font-semibold text-base-content flex items-center gap-2">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
					</svg>
					Pseudocode
				</h3>
				<div class="mockup-code bg-neutral text-neutral-content overflow-x-auto text-sm">
					{#each ref.pseudocode.split('\n') as line, i}
						<pre data-prefix={i + 1}><code>{line}</code></pre>
					{/each}
				</div>
			</div>

			<!-- Use Cases -->
			<div>
				<h3 class="mb-3 text-lg font-semibold text-base-content flex items-center gap-2">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547Z" />
					</svg>
					Common Use Cases
				</h3>
				<ul class="ml-1 space-y-1.5">
					{#each ref.useCases as useCase}
						<li class="flex items-start gap-2 text-sm text-base-content/80">
							<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"></span>
							{useCase}
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{:else}
		<!-- No algorithm selected — show overview -->
		<div class="flex-1 overflow-y-auto p-6">
			<div class="mb-6 text-center">
				<svg xmlns="http://www.w3.org/2000/svg" class="mx-auto mb-3 h-12 w-12 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
					<path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
				</svg>
				<h2 class="text-xl font-bold text-base-content">Algorithm Reference</h2>
				<p class="mt-1 text-sm text-base-content/60">Select an algorithm from the left pane, or browse all below.</p>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				{#each allRefs as algo}
					<button
						class="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer text-left"
						onclick={() => selectedAlgorithm.set(algo.name)}
					>
						<div class="card-body p-4">
							<h3 class="card-title text-sm">{algo.fullName}</h3>
							<p class="text-xs text-base-content/60 line-clamp-2">{algo.summary}</p>
							<div class="mt-2 flex gap-1">
								<span class="badge badge-xs badge-primary font-mono">{algo.complexity.time}</span>
								<span class="badge badge-xs badge-secondary font-mono">{algo.complexity.space}</span>
							</div>
						</div>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

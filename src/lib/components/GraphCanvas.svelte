<script lang="ts">
	import { graphConfig, selectedAlgorithm } from '$lib/stores/graphStore';

	let vertexCount = $state(6);
	let algorithm: string | null = $state(null);

	graphConfig.subscribe((c) => (vertexCount = c.vertexCount));
	selectedAlgorithm.subscribe((a) => (algorithm = a));
</script>

<div class="flex h-full w-full items-center justify-center rounded-box bg-base-100 border border-base-300">
	{#if !algorithm}
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
			<p class="text-lg font-medium">Select an algorithm to begin</p>
			<p class="mt-1 text-sm">Configure your graph on the right, then pick an algorithm on the left</p>
		</div>
	{:else}
		<div class="text-center">
			<p class="text-lg font-semibold text-primary">{algorithm}</p>
			<p class="mt-2 text-sm text-base-content/60">
				Graph visualization with {vertexCount} vertices will appear here
			</p>
			<div class="mt-6 grid place-items-center">
				<!-- Placeholder graph nodes -->
				<svg viewBox="0 0 200 200" class="h-48 w-48 text-primary/30">
					{#each Array(Math.min(vertexCount, 12)) as _, i}
						{@const angle = (2 * Math.PI * i) / Math.min(vertexCount, 12)}
						{@const cx = 100 + 70 * Math.cos(angle)}
						{@const cy = 100 + 70 * Math.sin(angle)}
						<circle {cx} {cy} r="8" fill="currentColor" />
						<text
							x={cx}
							y={cy + 1}
							text-anchor="middle"
							dominant-baseline="middle"
							class="fill-base-100 text-[8px] font-bold"
						>
							{i + 1}
						</text>
					{/each}
					<!-- Draw some placeholder edges -->
					{#each Array(Math.min(vertexCount, 12)) as _, i}
						{@const angle1 = (2 * Math.PI * i) / Math.min(vertexCount, 12)}
						{@const angle2 = (2 * Math.PI * ((i + 1) % Math.min(vertexCount, 12))) / Math.min(vertexCount, 12)}
						<line
							x1={100 + 70 * Math.cos(angle1)}
							y1={100 + 70 * Math.sin(angle1)}
							x2={100 + 70 * Math.cos(angle2)}
							y2={100 + 70 * Math.sin(angle2)}
							stroke="currentColor"
							stroke-width="1.5"
							opacity="0.5"
						/>
					{/each}
				</svg>
			</div>
		</div>
	{/if}
</div>

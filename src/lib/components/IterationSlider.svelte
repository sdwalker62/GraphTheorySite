<script lang="ts">
	import { currentStep, totalSteps, isPlaying } from '$lib/stores/graphStore';

	let step = $state(0);
	let total = $state(0);
	let playing = $state(false);

	currentStep.subscribe((s) => (step = s));
	totalSteps.subscribe((t) => (total = t));
	isPlaying.subscribe((p) => (playing = p));

	let interval: ReturnType<typeof setInterval> | null = null;

	function play() {
		if (playing) {
			pause();
			return;
		}
		isPlaying.set(true);
		interval = setInterval(() => {
			currentStep.update((s) => {
				if (s >= total) {
					pause();
					return s;
				}
				return s + 1;
			});
		}, 500);
	}

	function pause() {
		isPlaying.set(false);
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
	}

	function reset() {
		pause();
		currentStep.set(0);
	}

	function stepForward() {
		if (step < total) currentStep.update((s) => s + 1);
	}

	function stepBackward() {
		if (step > 0) currentStep.update((s) => s - 1);
	}

	function onSliderInput(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		currentStep.set(parseInt(target.value));
	}
</script>

<div class="flex items-center gap-3 bg-base-200 px-6 py-3">
	<!-- Controls -->
	<div class="flex items-center gap-1">
		<button class="btn btn-sm btn-ghost" onclick={reset} title="Reset">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
			</svg>
		</button>
		<button class="btn btn-sm btn-ghost" onclick={stepBackward} disabled={step <= 0} title="Step back">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		<button class="btn btn-sm btn-primary" onclick={play} title={playing ? 'Pause' : 'Play'}>
			{#if playing}
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6" />
				</svg>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
					<path d="M8 5v14l11-7z" />
				</svg>
			{/if}
		</button>
		<button class="btn btn-sm btn-ghost" onclick={stepForward} disabled={step >= total} title="Step forward">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	</div>

	<!-- Slider -->
	<div class="flex flex-1 items-center gap-3">
		<span class="min-w-[3ch] text-right font-mono text-sm text-base-content/60">{step}</span>
		<input
			type="range"
			min="0"
			max={total}
			value={step}
			class="range range-primary range-xs flex-1"
			oninput={onSliderInput}
		/>
		<span class="min-w-[3ch] font-mono text-sm text-base-content/60">{total}</span>
	</div>

	<!-- Step info -->
	<div class="text-sm text-base-content/60">
		Step <span class="font-mono font-semibold text-base-content">{step}</span> / {total}
	</div>
</div>

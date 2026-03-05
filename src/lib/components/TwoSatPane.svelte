<script lang="ts">
	import {
		twoSatState,
		twoSatResult,
		twoSatSteps,
		twoSatCurrentStep,
		twoSatTotalSteps,
		twoSatIsPlaying,
		implicationGraph,
		type Clause,
		type Literal
	} from '$lib/stores/twoSatStore';
	import { playbackSpeed } from '$lib/stores/graphStore';
	import { solve2SAT } from '$lib/graph/twosat';

	let state = $state({ numVariables: 3, clauses: [] as Clause[] });
	let result = $state<{ satisfiable: boolean; assignments: boolean[] | null } | null>(null);

	twoSatState.subscribe((s) => (state = { ...s, clauses: [...s.clauses] }));
	twoSatResult.subscribe((r) => (result = r));

	// New clause form state
	let newClauseAVar = $state(1);
	let newClauseANeg = $state(false);
	let newClauseBVar = $state(2);
	let newClauseBNeg = $state(false);

	function setNumVariables(e: Event) {
		const val = parseInt((e.currentTarget as HTMLInputElement).value, 10);
		if (val >= 1 && val <= 20) {
			// Remove clauses referencing variables beyond the new count
			const filtered = state.clauses.filter(
				(c) => c.a.variable < val && c.b.variable < val
			);
			twoSatState.set({ numVariables: val, clauses: filtered });
			// Reset
			twoSatResult.set(null);
			twoSatSteps.set([]);
			twoSatCurrentStep.set(0);
			twoSatTotalSteps.set(0);
			implicationGraph.set(null);
		}
	}

	function addClause() {
		const a: Literal = { variable: newClauseAVar - 1, negated: newClauseANeg };
		const b: Literal = { variable: newClauseBVar - 1, negated: newClauseBNeg };
		const newClauses = [...state.clauses, { a, b }];
		twoSatState.set({ ...state, clauses: newClauses });
		twoSatResult.set(null);
		twoSatSteps.set([]);
		implicationGraph.set(null);
	}

	function removeClause(index: number) {
		const newClauses = state.clauses.filter((_, i) => i !== index);
		twoSatState.set({ ...state, clauses: newClauses });
		twoSatResult.set(null);
		twoSatSteps.set([]);
		implicationGraph.set(null);
	}

	function clearClauses() {
		twoSatState.set({ ...state, clauses: [] });
		twoSatResult.set(null);
		twoSatSteps.set([]);
		twoSatCurrentStep.set(0);
		twoSatTotalSteps.set(0);
		implicationGraph.set(null);
	}

	function litLabel(lit: Literal): string {
		return `${lit.negated ? '¬' : ''}x${lit.variable + 1}`;
	}

	function runSolver() {
		if (state.clauses.length === 0) return;
		const { result: res, steps, graph } = solve2SAT(state.numVariables, state.clauses);
		implicationGraph.set(graph);
		twoSatResult.set(res);
		twoSatSteps.set(steps);
		twoSatTotalSteps.set(steps.length - 1);
		twoSatCurrentStep.set(0);
		twoSatIsPlaying.set(true);
	}

	function addExample() {
		// Classic satisfiable example: (x1 ∨ x2) ∧ (¬x1 ∨ x3) ∧ (¬x2 ∨ ¬x3) ∧ (x1 ∨ x3)
		const exClauses: Clause[] = [
			{ a: { variable: 0, negated: false }, b: { variable: 1, negated: false } },
			{ a: { variable: 0, negated: true }, b: { variable: 2, negated: false } },
			{ a: { variable: 1, negated: true }, b: { variable: 2, negated: true } },
			{ a: { variable: 0, negated: false }, b: { variable: 2, negated: false } }
		];
		twoSatState.set({ numVariables: 3, clauses: exClauses });
		twoSatResult.set(null);
		twoSatSteps.set([]);
		implicationGraph.set(null);
	}

	// Playback speed
	const speedOptions = [
		{ label: '0.25x', ms: 2000 },
		{ label: '0.5x', ms: 1000 },
		{ label: '1x', ms: 500 },
		{ label: '1.5x', ms: 333 },
		{ label: '2x', ms: 250 },
		{ label: '3x', ms: 167 },
		{ label: '4x', ms: 125 }
	];

	let speedIndex = $state(2);
	const speedLabel = $derived(speedOptions[speedIndex].label);

	function onSpeedChange(e: Event) {
		const idx = parseInt((e.currentTarget as HTMLInputElement).value, 10);
		speedIndex = idx;
		playbackSpeed.set(speedOptions[idx].ms);
	}

	const variableOptions = $derived(
		Array.from({ length: state.numVariables }, (_, i) => i + 1)
	);
</script>

<div class="flex h-full flex-col bg-base-200">
	<!-- Scrollable clause list -->
	<div class="flex-1 overflow-y-auto p-4 pb-2">
		<h2 class="mb-4 text-lg font-semibold">2-SAT Solver</h2>

		<!-- Variable count -->
		<div class="form-control mb-4">
			<label class="label" for="num-vars">
				<span class="label-text text-sm">Number of Variables</span>
				<span class="label-text-alt font-mono">{state.numVariables}</span>
			</label>
			<input
				id="num-vars"
				type="range"
				min="1"
				max="20"
				class="range range-primary range-sm"
				value={state.numVariables}
				oninput={setNumVariables}
			/>
			<div class="flex w-full justify-between px-1 pt-1 text-xs text-base-content/40">
				<span>1</span>
				<span>5</span>
				<span>10</span>
				<span>15</span>
				<span>20</span>
			</div>
		</div>

		<div class="divider my-1 text-xs">Clauses</div>

		<!-- Existing clauses -->
		{#if state.clauses.length === 0}
			<p class="mb-3 text-sm text-base-content/50">No clauses added yet.</p>
		{:else}
			<div class="mb-3 space-y-1">
				{#each state.clauses as clause, i}
					<div class="flex items-center justify-between rounded-btn bg-base-100 px-3 py-1.5">
						<span class="font-mono text-sm">
							({litLabel(clause.a)} ∨ {litLabel(clause.b)})
						</span>
						<button
							class="btn btn-ghost btn-xs text-error"
							onclick={() => removeClause(i)}
							aria-label="Remove clause"
						>
							✕
						</button>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Add clause form -->
		<div class="rounded-box bg-base-100 p-3">
			<p class="mb-2 text-xs font-semibold uppercase tracking-wider text-base-content/60">
				Add Clause
			</p>
			<div class="flex items-center gap-2">
				<span class="text-sm font-mono">(</span>

				<!-- Literal A -->
				<label class="swap swap-flip text-xs">
					<input type="checkbox" bind:checked={newClauseANeg} />
					<span class="swap-on badge badge-sm badge-error">¬</span>
					<span class="swap-off badge badge-sm badge-ghost">&nbsp;&nbsp;</span>
				</label>
				<select
					class="select select-bordered select-xs w-16"
					bind:value={newClauseAVar}
				>
					{#each variableOptions as v}
						<option value={v}>x{v}</option>
					{/each}
				</select>

				<span class="text-sm font-mono">∨</span>

				<!-- Literal B -->
				<label class="swap swap-flip text-xs">
					<input type="checkbox" bind:checked={newClauseBNeg} />
					<span class="swap-on badge badge-sm badge-error">¬</span>
					<span class="swap-off badge badge-sm badge-ghost">&nbsp;&nbsp;</span>
				</label>
				<select
					class="select select-bordered select-xs w-16"
					bind:value={newClauseBVar}
				>
					{#each variableOptions as v}
						<option value={v}>x{v}</option>
					{/each}
				</select>

				<span class="text-sm font-mono">)</span>

				<button class="btn btn-primary btn-xs ml-auto" onclick={addClause}>
					Add
				</button>
			</div>
		</div>

		<!-- Formula display -->
		{#if state.clauses.length > 0}
			<div class="mt-3 rounded-box bg-base-100 p-3">
				<p class="mb-1 text-xs font-semibold uppercase tracking-wider text-base-content/60">
					Formula
				</p>
				<p class="font-mono text-sm break-words">
					{state.clauses.map((c) => `(${litLabel(c.a)} ∨ ${litLabel(c.b)})`).join(' ∧ ')}
				</p>
			</div>
		{/if}

		<!-- Result display -->
		{#if result}
			<div class="mt-3 rounded-box p-3 {result.satisfiable ? 'bg-success/20' : 'bg-error/20'}">
				<p class="text-sm font-bold {result.satisfiable ? 'text-success' : 'text-error'}">
					{result.satisfiable ? 'SATISFIABLE' : 'UNSATISFIABLE'}
				</p>
				{#if result.satisfiable && result.assignments}
					<p class="mt-1 font-mono text-sm">
						{result.assignments.map((v, i) => `x${i + 1} = ${v ? 'T' : 'F'}`).join(', ')}
					</p>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Pinned controls at bottom -->
	<div class="shrink-0 border-t border-base-300 bg-base-200 p-4 pt-3 space-y-3">
		<!-- Playback speed -->
		<div class="form-control">
			<label class="label" for="twosat-speed">
				<span class="label-text text-sm">Speed</span>
				<span class="label-text-alt font-mono text-xs">{speedLabel}</span>
			</label>
			<input
				id="twosat-speed"
				type="range"
				min="0"
				max={speedOptions.length - 1}
				value={speedIndex}
				class="range range-xs range-primary"
				oninput={onSpeedChange}
			/>
		</div>

		<div class="flex gap-2">
			<button class="btn btn-outline btn-sm flex-1" onclick={addExample}>
				Example
			</button>
			<button class="btn btn-outline btn-sm flex-1" onclick={clearClauses}>
				Clear
			</button>
		</div>

		<button
			class="btn btn-success btn-sm w-full"
			disabled={state.clauses.length === 0}
			onclick={runSolver}
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
				<path d="M8 5v14l11-7z" />
			</svg>
			Solve 2-SAT
		</button>
	</div>
</div>

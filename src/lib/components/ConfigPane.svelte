<script lang="ts">
	import { graphConfig } from '$lib/stores/graphStore';

	let config = $state({
		directed: false,
		weighted: false,
		allowCycles: true,
		vertexCount: 6
	});

	graphConfig.subscribe((c) => {
		config = { ...c };
	});

	function update<K extends keyof typeof config>(key: K, value: (typeof config)[K]) {
		config[key] = value;
		graphConfig.set({ ...config });
	}
</script>

<div class="flex h-full flex-col overflow-y-auto bg-base-200 p-4">
	<h2 class="mb-4 text-lg font-semibold">Graph Configuration</h2>

	<div class="flex flex-col gap-4">
		<!-- Directed / Undirected -->
		<div class="form-control">
			<label class="label cursor-pointer">
				<span class="label-text">Directed</span>
				<input
					type="checkbox"
					class="toggle toggle-primary"
					checked={config.directed}
					onchange={() => update('directed', !config.directed)}
				/>
			</label>
			<p class="text-xs text-base-content/60">
				{config.directed ? 'Edges have direction (u → v)' : 'Edges are bidirectional (u — v)'}
			</p>
		</div>

		<!-- Weighted / Unweighted -->
		<div class="form-control">
			<label class="label cursor-pointer">
				<span class="label-text">Weighted</span>
				<input
					type="checkbox"
					class="toggle toggle-secondary"
					checked={config.weighted}
					onchange={() => update('weighted', !config.weighted)}
				/>
			</label>
			<p class="text-xs text-base-content/60">
				{config.weighted ? 'Edges carry numeric weights' : 'All edges have equal cost'}
			</p>
		</div>

		<!-- Allow Cycles -->
		<div class="form-control">
			<label class="label cursor-pointer">
				<span class="label-text">Allow Cycles</span>
				<input
					type="checkbox"
					class="toggle toggle-accent"
					checked={config.allowCycles}
					onchange={() => update('allowCycles', !config.allowCycles)}
				/>
			</label>
			<p class="text-xs text-base-content/60">
				{config.allowCycles ? 'Graph may contain cycles' : 'Graph is acyclic (DAG if directed)'}
			</p>
		</div>

		<div class="divider my-0"></div>

		<!-- Number of Vertices -->
		<div class="form-control">
			<label class="label" for="vertex-count">
				<span class="label-text">Vertices</span>
				<span class="label-text-alt font-mono">{config.vertexCount}</span>
			</label>
			<input
				id="vertex-count"
				type="range"
				min="2"
				max="100"
				class="range range-primary range-sm"
				value={config.vertexCount}
				oninput={(e) => update('vertexCount', parseInt(e.currentTarget.value))}
			/>
			<div class="flex w-full justify-between px-1 pt-1 text-xs text-base-content/40">
				<span>2</span>
				<span>25</span>
				<span>50</span>
				<span>75</span>
				<span>100</span>
			</div>
		</div>
	</div>

	<div class="divider"></div>

	<!-- Summary -->
	<div class="rounded-box bg-base-100 p-3">
		<h3 class="mb-2 text-sm font-semibold">Current Graph</h3>
		<div class="flex flex-wrap gap-2">
			<span class="badge badge-outline">{config.directed ? 'Directed' : 'Undirected'}</span>
			<span class="badge badge-outline">{config.weighted ? 'Weighted' : 'Unweighted'}</span>
			<span class="badge badge-outline">{config.allowCycles ? 'Cyclic' : 'Acyclic'}</span>
			<span class="badge badge-outline">{config.vertexCount} vertices</span>
		</div>
	</div>
</div>

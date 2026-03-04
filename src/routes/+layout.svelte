<script lang="ts">
	import '../app.css';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
</script>

<div class="flex h-screen flex-col">
	<Navbar />
	<main class="flex-1 overflow-hidden">
		{@render children()}
	</main>
</div>

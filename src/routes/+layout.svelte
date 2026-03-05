<script lang="ts">
	import Navbar from "$lib/components/Navbar.svelte";
	import "../app.css";

	let { children } = $props();
</script>

<div class="flex h-screen flex-col">
	<Navbar />
	<main class="flex-1 overflow-hidden">
		{@render children()}
	</main>
</div>

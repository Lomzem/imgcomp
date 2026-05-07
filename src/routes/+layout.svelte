<script lang="ts">
  import "./layout.css"
  import favicon from "$lib/assets/favicon.svg"

  let { children } = $props()
</script>

<svelte:head>
  <title>imgcomp</title>
  <link rel="icon" href={favicon} />
</svelte:head>
<div class="grid h-svh">{@render children()}</div>

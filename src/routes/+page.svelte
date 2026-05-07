<script lang="ts">
  import FileUpload from "./components/FileUpload.svelte"
  import Output from "./components/Output.svelte"
  import { imageUpload } from "./imageUpload.svelte.ts"
</script>

<main class="w-svw p-4">
  {#if !imageUpload.originalImage}
    <FileUpload />
  {:else}
    <Output />
  {/if}
</main>

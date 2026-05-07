<script lang="ts">
  import { fade } from "svelte/transition"
  import FileUpload from "./components/FileUpload.svelte"
  import Output from "./components/Output.svelte"
  import { imageUpload } from "./imageUpload.svelte.ts"
</script>

<main class="w-svw place-self-center p-4">
  {#if !imageUpload.originalImage}
    <FileUpload />
  {:else}
    <div in:fade={{ duration: 300 }}>
      <Output />
    </div>
  {/if}
</main>

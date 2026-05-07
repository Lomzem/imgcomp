<script lang="ts">
  import FileUpload from "./components/FileUpload.svelte"
  import Output from "./components/Output.svelte"
  import { imageUpload } from "./imageUpload.svelte.ts"
  import { fade, fly } from "svelte/transition"
  import { prefersReducedMotion } from "svelte/motion"
</script>

<main class="w-svw place-self-center p-4">
  {#key imageUpload.originalImage ? "output" : "upload"}
    {#if !imageUpload.originalImage}
      <div
        in:fly={{ y: prefersReducedMotion.current ? 0 : 8, duration: 180 }}
        out:fade={{ duration: prefersReducedMotion.current ? 0 : 120 }}
      >
        <FileUpload />
      </div>
    {:else}
      <div
        in:fly={{ y: prefersReducedMotion.current ? 0 : 8, duration: 180 }}
        out:fade={{ duration: prefersReducedMotion.current ? 0 : 120 }}
      >
        <Output />
      </div>
    {/if}
  {/key}
</main>

<script lang="ts">
  import FileUpload from "./components/FileUpload.svelte"
  import ImageSideBySide from "./components/ImageSideBySide.svelte"
  import { imageUpload } from "./imageUpload.svelte.ts"
</script>

<main class="grid max-w-svw p-4">
  {#if !imageUpload.originalImage}
    <FileUpload />
  {:else}
    <ImageSideBySide />
  {/if}
</main>

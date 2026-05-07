<script lang="ts">
  import Skeleton from "$lib/components/ui/skeleton/skeleton.svelte"
  import { formatSize } from "../../lib/formatText.ts"
  import { imageUpload } from "../imageUpload.svelte.ts"

  let originalImageSize = $derived(formatSize(imageUpload.originalImage?.size ?? 0))
  let originalImageElement: HTMLImageElement | undefined = $state()

  let originalImageDimensions: { naturalWidth: number; naturalHeight: number } | undefined =
    $state()
</script>

<div class="flex justify-center gap-3">
  {#if imageUpload.originalImage}
    <!-- imageUpload should be guaranteed to not be undefined -->
    <div class="flex w-1/2 flex-col gap-1">
      <img
        bind:this={originalImageElement}
        src={URL.createObjectURL(imageUpload.originalImage)}
        alt="User Uploaded"
        class="rounded-md"
        onload={() => {
          originalImageDimensions = {
            naturalWidth: originalImageElement?.naturalWidth!,
            naturalHeight: originalImageElement?.naturalHeight!,
          }
        }}
      />
      <span>{originalImageSize}</span>
      <span
        >{originalImageDimensions?.naturalWidth} x
        {originalImageDimensions?.naturalHeight}</span
      >
    </div>
  {/if}
  {#if imageUpload.compressedImage}
    <img src={URL.createObjectURL(imageUpload.compressedImage)} alt="Compressed" class="w-1/2" />
  {:else}
    <Skeleton class="w-1/2" />
  {/if}
</div>

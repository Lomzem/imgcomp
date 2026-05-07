<script lang="ts">
  import Progress from "$lib/components/ui/progress/progress.svelte"
  import Skeleton from "$lib/components/ui/skeleton/skeleton.svelte"
  import { formatSize } from "../../lib/formatText.ts"
  import { imageUpload } from "../imageUpload.svelte.ts"

  import imageCompression from "browser-image-compression"

  let compressionProgress = $state(0)

  $effect(() => {
    if (!imageUpload.originalImage) return
    imageUpload.compressedImage = imageCompression(imageUpload.originalImage, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1600,
      preserveExif: false,
      useWebWorker: true,
      onProgress(progress) {
        compressionProgress = progress
      },
    })
  })

  let originalImageSize = $derived(formatSize(imageUpload.originalImage?.size ?? 0))
  let originalImageElement: HTMLImageElement | undefined = $state()
  let compressedImageElement: HTMLImageElement | undefined = $state()

  let originalImageDimensions: { naturalWidth: number; naturalHeight: number } | undefined =
    $state()
  let compressedImageDimensions: { naturalWidth: number; naturalHeight: number } | undefined =
    $state()

  let originalImageAspectRatio = $derived(
    originalImageDimensions
      ? `${originalImageDimensions.naturalWidth} / ${originalImageDimensions.naturalHeight}`
      : "1 / 1",
  )
</script>

<div class="flex justify-center gap-3">
  {#if imageUpload.originalImage}
    <!-- imageUpload should be guaranteed to not be undefined -->
    <div class="w-1/2">
      <div
        class="relative w-full overflow-hidden rounded-md"
        style:aspect-ratio={originalImageAspectRatio}
      >
        <img
          bind:this={originalImageElement}
          src={URL.createObjectURL(imageUpload.originalImage)}
          alt="User Uploaded"
          class="absolute inset-0 h-full w-full object-contain"
          onload={() => {
            originalImageDimensions = {
              naturalWidth: originalImageElement?.naturalWidth!,
              naturalHeight: originalImageElement?.naturalHeight!,
            }
          }}
        />
      </div>
      <p class="mt-2">{originalImageSize}</p>
      <p>
        {originalImageDimensions?.naturalWidth} x
        {originalImageDimensions?.naturalHeight}
      </p>
    </div>
  {/if}

  {#if imageUpload.compressedImage}
    {#await imageUpload.compressedImage}
      <div class="w-1/2">
        <div
          class="w-full overflow-hidden rounded-md"
          style:aspect-ratio={originalImageAspectRatio}
        >
          <Skeleton class="h-full w-full" />
        </div>
        <div class="mt-2 flex items-center gap-2">
          <Progress class="h-2" value={compressionProgress} />
          <span>{compressionProgress}%</span>
        </div>
      </div>
    {:then compressedImage}
      <div class="w-1/2">
        <div
          class="relative w-full overflow-hidden rounded-md"
          style:aspect-ratio={originalImageAspectRatio}
        >
          <img
            bind:this={compressedImageElement}
            src={URL.createObjectURL(compressedImage)}
            alt="Compressed"
            class="absolute inset-0 h-full w-full object-contain"
            onload={() => {
              compressedImageDimensions = {
                naturalWidth: compressedImageElement?.naturalWidth!,
                naturalHeight: compressedImageElement?.naturalHeight!,
              }
            }}
          />
        </div>
        <p class="mt-2">{formatSize(compressedImage.size)}</p>
        <p>
          {compressedImageDimensions?.naturalWidth} x
          {compressedImageDimensions?.naturalHeight}
        </p>
      </div>
    {/await}
  {/if}
</div>

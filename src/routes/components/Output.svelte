<script lang="ts">
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js"
  import Button from "$lib/components/ui/button/button.svelte"
  import Progress from "$lib/components/ui/progress/progress.svelte"
  import Skeleton from "$lib/components/ui/skeleton/skeleton.svelte"
  import { IconLoader2 } from "@tabler/icons-svelte"
  import { formatSize, formatSizeReduction } from "../../lib/formatText.ts"
  import { imageUpload } from "../imageUpload.svelte"

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

  let originalImageURL = $derived.by(() => {
    if (!imageUpload.originalImage) return
    return URL.createObjectURL(imageUpload.originalImage)
  })
  let compressedImageURL = $derived(
    imageUpload.compressedImage?.then((image) => URL.createObjectURL(image)),
  )

  let originalImageSize = $derived(formatSize(imageUpload.originalImage?.size ?? 0))
  let compressedImageSize = $derived.by(() => {
    if (!imageUpload.compressedImage) return
    return imageUpload.compressedImage.then((file) => formatSize(file.size))
  })
  let compressedImageSizeReduction = $derived.by(() => {
    if (!imageUpload.originalImage) return
    if (!imageUpload.compressedImage) return
    return imageUpload.compressedImage.then((compressed) =>
      formatSizeReduction(imageUpload.originalImage?.size ?? 0, compressed.size),
    )
  })

  let compressedPromises = $derived(
    Promise.all([compressedImageSize, compressedImageURL, compressedImageSizeReduction]),
  )

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

  function reset() {
    if (originalImageURL) URL.revokeObjectURL(originalImageURL)
    if (compressedImageURL) compressedImageURL.then((url) => URL.revokeObjectURL(url))
    imageUpload.fileList = undefined
    imageUpload.compressedImage = undefined
  }
</script>

<div class="flex flex-col">
  <header class="mb-4">
    <nav>
      <Breadcrumb.Root>
        <Breadcrumb.List class="text-3xl">
          <Breadcrumb.Item>
            <Breadcrumb.Link class="cursor-pointer" onclick={reset}>Upload</Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>Compress</Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>
    </nav>
  </header>

  <div class="flex justify-center gap-3">
    {#if imageUpload.originalImage}
      <div class="w-1/2">
        <div
          class="relative w-full overflow-hidden rounded-md"
          style:aspect-ratio={originalImageAspectRatio}
        >
          <img
            bind:this={originalImageElement}
            src={originalImageURL}
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
        <p class="mt-2 text-xl">{originalImageSize}</p>
        <p class="text-muted-foreground">
          {originalImageDimensions?.naturalWidth} x
          {originalImageDimensions?.naturalHeight}
        </p>
      </div>
    {/if}

    {#if imageUpload.compressedImage}
      {#await compressedPromises}
        <div class="w-1/2">
          <div
            class="w-full overflow-hidden rounded-md"
            style:aspect-ratio={originalImageAspectRatio}
          >
            <Skeleton class="h-full w-full" />
          </div>
          <div class="mt-2 flex items-center gap-2">
            <Progress class="h-4" value={compressionProgress} />
            <span>{compressionProgress}%</span>
          </div>
        </div>
      {:then [compressedImageSize, compressedImageURL, compressedImageSizeReduction]}
        <div class="w-1/2">
          <div
            class="relative w-full overflow-hidden rounded-md"
            style:aspect-ratio={originalImageAspectRatio}
          >
            <img
              bind:this={compressedImageElement}
              src={compressedImageURL}
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
          <p class="mt-2 text-xl">
            {compressedImageSize}
            <span class="text-chart-1">({compressedImageSizeReduction}) </span>
          </p>
          <p class="text-muted-foreground">
            {compressedImageDimensions?.naturalWidth} x
            {compressedImageDimensions?.naturalHeight}
          </p>
        </div>
      {/await}
    {/if}
  </div>

  {#await imageUpload.compressedImage}
    <Button disabled class="mt-4 w-full cursor-not-allowed self-center py-8 text-2xl lg:max-w-lg"
      ><IconLoader2 class="size-6 animate-spin" /></Button
    >
  {:then compressedImage}
    <Button
      class="mt-4 w-full cursor-pointer self-center py-8 text-2xl lg:max-w-lg"
      onclick={() => {}}>Download</Button
    >
  {/await}
</div>

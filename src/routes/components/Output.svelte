<script lang="ts">
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js"
  import Button from "$lib/components/ui/button/button.svelte"
  import Progress from "$lib/components/ui/progress/progress.svelte"
  import Skeleton from "$lib/components/ui/skeleton/skeleton.svelte"
  import { IconLoader2 } from "@tabler/icons-svelte"
  import { formatSize, formatSizeReduction } from "../../lib/formatText.ts"
  import { imageUpload } from "../imageUpload.svelte"

  import imageCompression from "browser-image-compression"
  import { Tween } from "svelte/motion"
  import { cubicOut } from "svelte/easing"

  let compressionProgress = new Tween(0, {
    duration: 400,
    easing: cubicOut,
  })

  let originalImageURL = $state<string | undefined>()
  let compressedImageURL = $derived.by(async () => {
    if (!imageUpload.compressedImage) return
    const compressedImage = await imageUpload.compressedImage
    return URL.createObjectURL(compressedImage)
  })

  /** @brief Give original image a URL */
  $effect(() => {
    if (!imageUpload.originalImage) return
    const url = URL.createObjectURL(imageUpload.originalImage)
    originalImageURL = url
    return () => URL.revokeObjectURL(url)
  })

  /** @brief Compress image */
  $effect(() => {
    compressionProgress.target = 0

    if (!imageUpload.originalImage) {
      imageUpload.compressedImage = undefined
      return
    }

    imageUpload.compressedImage = imageCompression(imageUpload.originalImage, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1600,
      preserveExif: false,
      useWebWorker: true,
      onProgress(progress) {
        compressionProgress.target = progress
      },
    })
  })

  let originalImageSize = $state(imageUpload.originalImage?.size ?? 0)
  let compressedImageSize = $derived.by(async () => {
    if (!imageUpload.compressedImage) return 0
    const compressedImage = await imageUpload.compressedImage
    return compressedImage.size
  })

  let originalImageElement: HTMLImageElement | undefined = $state()
  let compressedImageElement: HTMLImageElement | undefined = $state()

  let originalImageDimensions: { naturalWidth: number; naturalHeight: number } = $state({
    naturalWidth: 0,
    naturalHeight: 0,
  })
  let compressedImageDimensions: { naturalWidth: number; naturalHeight: number } = $state({
    naturalWidth: 0,
    naturalHeight: 0,
  })

  let originalImageAspectRatio = $derived(
    originalImageDimensions.naturalHeight > 0
      ? `${originalImageDimensions.naturalWidth} / ${originalImageDimensions.naturalHeight}`
      : "1 / 1",
  )

  function reset() {
    compressionProgress.target = 0
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
            bind:naturalWidth={originalImageDimensions.naturalWidth}
            bind:naturalHeight={originalImageDimensions.naturalHeight}
          />
        </div>
        <p class="mt-2 text-xl">{formatSize(originalImageSize)}</p>
        <p class="text-muted-foreground">
          {originalImageDimensions.naturalWidth} x
          {originalImageDimensions.naturalHeight}
        </p>
      </div>
    {/if}

    {#if imageUpload.compressedImage}
      {#await Promise.all([compressedImageURL, compressedImageSize])}
        <div class="w-1/2">
          <div
            class="w-full overflow-hidden rounded-md"
            style:aspect-ratio={originalImageAspectRatio}
          >
            <Skeleton class="h-full w-full" />
          </div>
          <div class="mt-2 flex items-center gap-2">
            <Progress class="h-4" value={compressionProgress.current} />
            <span>{Math.round(compressionProgress.current)}%</span>
          </div>
        </div>
      {:then [compressedImageURL, compressedImageSize]}
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
              bind:naturalWidth={compressedImageDimensions.naturalWidth}
              bind:naturalHeight={compressedImageDimensions.naturalHeight}
            />
          </div>
          <p class="mt-2 text-xl">
            {formatSize(compressedImageSize)}
            <span class="text-chart-1"
              >({formatSizeReduction(originalImageSize, compressedImageSize)})
            </span>
          </p>
          <p class="text-muted-foreground">
            {compressedImageDimensions.naturalWidth} x
            {compressedImageDimensions.naturalHeight}
          </p>
        </div>
      {/await}
    {/if}
  </div>

  {#await compressedImageURL}
    <Button disabled class="mt-4 w-full cursor-not-allowed self-center py-8 text-2xl lg:max-w-lg"
      ><IconLoader2 class="size-6 animate-spin" /></Button
    >
  {:then compressedImageURL}
    <Button
      class="mt-4 w-full cursor-pointer self-center py-8 text-2xl lg:max-w-lg"
      onclick={() => {
        const originalName = imageUpload.originalImage?.name
        const extensionIndex = originalName?.lastIndexOf(".") ?? -1
        const baseName =
          extensionIndex > 0 ? originalName?.slice(0, extensionIndex) : (originalName ?? "image")
        const extension = originalName?.split(".").pop() ?? "jpg"
        const link = document.createElement("a")
        link.href = compressedImageURL!
        link.download = `${baseName}-compressed.${extension}`
        link.click()
        link.remove()
      }}>Download</Button
    >
  {/await}
</div>

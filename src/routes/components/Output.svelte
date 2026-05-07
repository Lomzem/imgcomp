<script lang="ts">
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js"
  import Button from "$lib/components/ui/button/button.svelte"
  import Progress from "$lib/components/ui/progress/progress.svelte"
  import Skeleton from "$lib/components/ui/skeleton/skeleton.svelte"
  import { IconLoader2 } from "@tabler/icons-svelte"
  import { formatSize, formatSizeReduction } from "../../lib/formatText.ts"
  import { imageUpload } from "../imageUpload.svelte"
  import { Tween, prefersReducedMotion } from "svelte/motion"
  import { fade, fly } from "svelte/transition"

  import imageCompression from "browser-image-compression"

  let compressionProgress = $state(0)
  const tweenedCompressionProgress = new Tween(0, {
    duration: prefersReducedMotion.current ? 0 : 160,
  })
  let originalImageURL = $state<string | undefined>()
  let compressedImageURL = $state<string | undefined>()
  let compressedImageFile = $state<File | undefined>()

  $effect(() => {
    const originalImage = imageUpload.originalImage

    compressionProgress = 0
    tweenedCompressionProgress.set(0, {
      duration: prefersReducedMotion.current ? 0 : 100,
    })
    originalImageDimensions = undefined
    compressedImageDimensions = undefined

    if (!originalImage) {
      imageUpload.compressedImage = undefined
      return
    }

    imageUpload.compressedImage = imageCompression(originalImage, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1600,
      preserveExif: false,
      useWebWorker: true,
      onProgress(progress) {
        compressionProgress = progress
        tweenedCompressionProgress.set(progress, {
          duration: prefersReducedMotion.current ? 0 : 140,
        })
      },
    })
  })

  $effect(() => {
    const originalImage = imageUpload.originalImage
    originalImageURL = undefined

    if (!originalImage) return

    const url = URL.createObjectURL(originalImage)
    originalImageURL = url

    return () => URL.revokeObjectURL(url)
  })

  $effect(() => {
    const compressedImage = imageUpload.compressedImage
    compressedImageFile = undefined

    if (!compressedImage) return

    let active = true

    compressedImage.then((file) => {
      if (!active) return
      compressedImageFile = file
    })

    return () => {
      active = false
    }
  })

  $effect(() => {
    const compressedImage = compressedImageFile
    compressedImageURL = undefined

    if (!compressedImage) return

    const url = URL.createObjectURL(compressedImage)
    compressedImageURL = url

    return () => URL.revokeObjectURL(url)
  })

  let originalImageSize = $derived(formatSize(imageUpload.originalImage?.size ?? 0))
  let compressedImageSize = $derived(
    compressedImageFile ? formatSize(compressedImageFile.size) : undefined,
  )
  let compressedImageSizeReduction = $derived.by(() => {
    if (!imageUpload.originalImage) return
    if (!compressedImageFile) return
    return formatSizeReduction(imageUpload.originalImage.size, compressedImageFile.size)
  })

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
    compressionProgress = 0
    originalImageDimensions = undefined
    compressedImageDimensions = undefined
    imageUpload.fileList = undefined
    imageUpload.compressedImage = undefined
  }
</script>

<div class="flex flex-col">
  <header class="mb-4">
    <nav
      in:fly={{ y: prefersReducedMotion.current ? 0 : 6, duration: 160 }}
      out:fade={{ duration: prefersReducedMotion.current ? 0 : 100 }}
    >
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
      <div
        class="w-1/2"
        in:fly={{ y: prefersReducedMotion.current ? 0 : 8, duration: 180, delay: 40 }}
        out:fade={{ duration: prefersReducedMotion.current ? 0 : 100 }}
      >
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
      <div
        class="w-1/2"
        in:fly={{ y: prefersReducedMotion.current ? 0 : 8, duration: 180, delay: 80 }}
        out:fade={{ duration: prefersReducedMotion.current ? 0 : 100 }}
      >
        {#key compressedImageFile ? "compressed" : "loading"}
          {#if !compressedImageFile}
            <div
              in:fade={{ duration: prefersReducedMotion.current ? 0 : 140 }}
              out:fade={{ duration: prefersReducedMotion.current ? 0 : 100 }}
            >
              <div
                class="w-full overflow-hidden rounded-md"
                style:aspect-ratio={originalImageAspectRatio}
              >
                <Skeleton class="h-full w-full" />
              </div>
              <div class="mt-2 flex items-center gap-2">
                <Progress class="h-4" value={tweenedCompressionProgress.current} />
                <span>{Math.round(tweenedCompressionProgress.current)}%</span>
              </div>
            </div>
          {:else}
            <div
              in:fade={{ duration: prefersReducedMotion.current ? 0 : 160 }}
              out:fade={{ duration: prefersReducedMotion.current ? 0 : 100 }}
            >
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
              <p
                class="mt-2 text-xl"
                in:fade={{ duration: prefersReducedMotion.current ? 0 : 180, delay: 40 }}
              >
                {compressedImageSize}
                <span class="text-chart-1">({compressedImageSizeReduction}) </span>
              </p>
              <p
                class="text-muted-foreground"
                in:fade={{ duration: prefersReducedMotion.current ? 0 : 180, delay: 60 }}
              >
                {compressedImageDimensions?.naturalWidth} x
                {compressedImageDimensions?.naturalHeight}
              </p>
            </div>
          {/if}
        {/key}
      </div>
    {/if}
  </div>

  {#key compressedImageURL ? "download-ready" : "download-loading"}
    {#if compressedImageURL}
      <div
        in:fade={{ duration: prefersReducedMotion.current ? 0 : 140 }}
        out:fade={{ duration: prefersReducedMotion.current ? 0 : 100 }}
      >
        <Button
          class="mt-4 w-full cursor-pointer self-center py-8 text-2xl lg:max-w-lg"
          onclick={() => {
            if (!compressedImageFile) return
            const originalName = imageUpload.originalImage?.name
            const extensionIndex = originalName?.lastIndexOf(".") ?? -1
            const baseName =
              extensionIndex > 0
                ? originalName?.slice(0, extensionIndex)
                : (originalName ?? "image")
            const link = document.createElement("a")
            link.href = compressedImageURL!
            link.download = `${baseName}-compressed.${compressedImageFile.name.split(".").pop() ?? "jpg"}`
            link.click()
            link.remove()
          }}>Download</Button
        >
      </div>
    {:else}
      <div
        in:fade={{ duration: prefersReducedMotion.current ? 0 : 140 }}
        out:fade={{ duration: prefersReducedMotion.current ? 0 : 100 }}
      >
        <Button
          disabled
          class="mt-4 w-full cursor-not-allowed self-center py-8 text-2xl lg:max-w-lg"
          ><IconLoader2 class="size-6 animate-spin" /></Button
        >
      </div>
    {/if}
  {/key}
</div>

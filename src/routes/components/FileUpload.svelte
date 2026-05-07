<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte"
  import Input from "$lib/components/ui/input/input.svelte"
  import { imageUpload } from "../imageUpload.svelte.ts"
  import { fly } from "svelte/transition"
  import { prefersReducedMotion } from "svelte/motion"
</script>

<svelte:window
  onpaste={(event) => {
    const file = Array.from(event.clipboardData?.items ?? [])
      .find((item) => item.type.startsWith("image/"))
      ?.getAsFile()

    if (!file) return

    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    imageUpload.fileList = dataTransfer.files
  }}
/>

<div class="grid">
  <h1
    class="mb-8 place-self-center text-4xl"
    in:fly={{ y: prefersReducedMotion.current ? 0 : 6, duration: 160 }}
  >
    imgcomp
  </h1>
  <form class="grid place-items-center">
    <label
      for="file-input"
      class="
    w-full
    cursor-pointer
    rounded-md
    bg-primary
    p-4
    text-center text-2xl text-primary-foreground hover:bg-primary/80 lg:max-w-lg"
      in:fly={{ y: prefersReducedMotion.current ? 0 : 8, duration: 180, delay: 40 }}
      >Upload Image</label
    >
    <Input
      class="hidden"
      id="file-input"
      type="file"
      accept="image/*"
      name="file"
      bind:files={imageUpload.fileList}
      required
      alt="Upload an image to compress"
    />
  </form>
  <div in:fly={{ y: prefersReducedMotion.current ? 0 : 8, duration: 180, delay: 80 }}>
    <Button
      variant="outline"
      size="lg"
      class="mt-2 w-full cursor-pointer place-self-center py-6 text-xl lg:max-w-lg"
      type="button"
      onclick={async () => {
        if (!navigator.clipboard?.read) return

        const item = await navigator.clipboard
          .read()
          .then((items) =>
            items.find((clipboardItem) =>
              clipboardItem.types.some((type) => type.startsWith("image/")),
            ),
          )
          .catch(() => undefined)
        const type = item?.types.find((value) => value.startsWith("image/"))

        if (!item || !type) return

        const file = new File(
          [await item.getType(type)],
          `pasted-image.${type.split("/")[1] || "png"}`,
          {
            type,
          },
        )
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        imageUpload.fileList = dataTransfer.files
      }}
    >
      Paste Image</Button
    >
  </div>
</div>

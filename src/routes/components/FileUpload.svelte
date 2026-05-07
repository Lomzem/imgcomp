<script lang="ts">
  import Input from "$lib/components/ui/input/input.svelte"
  import { imageUpload } from "../imageUpload.svelte.ts"
</script>

<h1 class="mb-8 place-self-center text-4xl">imgcomp</h1>
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

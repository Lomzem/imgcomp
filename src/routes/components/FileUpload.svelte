<script lang="ts">
  import Input from "$lib/components/ui/input/input.svelte"
  import { slide } from "svelte/transition"
  import { fileUpload } from "../fileUpload.svelte.ts"
</script>

<main out:slide={{ duration: 300 }} class="w-sm place-self-center">
  <form>
    <Input type="file" accept="image/*" name="file" bind:files={fileUpload.files} required />
  </form>
</main>

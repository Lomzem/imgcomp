<script lang="ts">
  import Input from "$lib/components/ui/input/input.svelte"
  import { fileUpload } from "./fileUpload.svelte"

  $inspect(fileUpload.file)
</script>

<main class="w-sm place-self-center">
  <form>
    <Input type="file" accept="image/*" name="file" bind:files={fileUpload.files} required />
  </form>
</main>

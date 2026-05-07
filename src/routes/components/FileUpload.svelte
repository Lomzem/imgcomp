<script lang="ts">
  import Input from "$lib/components/ui/input/input.svelte"
  import { imageUpload } from "../imageUpload.svelte.ts"
</script>

<form>
  <Input type="file" accept="image/*" name="file" bind:files={imageUpload.fileList} required />
</form>

<script lang="ts">
  import FileUpload from "./components/FileUpload.svelte"
  import { fileUpload } from "./fileUpload.svelte"
</script>

{#if !fileUpload.file}
  <FileUpload />
{/if}

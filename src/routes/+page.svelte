<script lang="ts">
  import { fade } from "svelte/transition"
  import FileUpload from "./components/FileUpload.svelte"
  import Output from "./components/Output.svelte"
  import { imageUpload } from "./imageUpload.svelte.ts"
  import { IconBrandGithubFilled } from "@tabler/icons-svelte"
</script>

<main class="w-svw place-self-center p-4">
  {#if !imageUpload.originalImage}
    <FileUpload />
  {:else}
    <div in:fade={{ duration: 300 }}>
      <Output />
    </div>
  {/if}
</main>

<footer class="absolute">
  <a
    href="https://github.com/Lomzem/imgcomp"
    target="_blank"
    rel="noreferrer"
    aria-label="View on GitHub"
    class="mt-4 ml-4 flex gap-1 text-muted-foreground transition hover:text-foreground"
  >
    <IconBrandGithubFilled />
    <span class="self-baseline-last">view on github</span>
  </a>
</footer>

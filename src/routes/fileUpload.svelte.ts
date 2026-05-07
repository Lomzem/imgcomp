export let fileUpload = $state({
  files: undefined as FileList | undefined,
  get file() {
    return this.files?.[0] ?? null
  },
})

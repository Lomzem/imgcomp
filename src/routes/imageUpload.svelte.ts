export let imageUpload = $state({
  fileList: undefined as FileList | undefined,
  compressedImage: undefined as File | undefined,
  get originalImage() {
    return this.fileList?.[0] ?? null
  },
})

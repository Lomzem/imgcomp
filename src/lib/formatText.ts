export function formatSize(bytes: number, significantFigures = 3) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 Bytes"
  const k = 1024
  const sf = significantFigures < 1 ? 1 : significantFigures
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toPrecision(sf)) + " " + sizes[i]
}

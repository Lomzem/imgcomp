export const SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/gif',
]);

const IMAGE_EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/gif': 'gif',
};

export function isSupportedImage(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.has(file.type);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatDimensions(width?: number, height?: number): string {
  if (!width || !height) {
    return 'Unknown';
  }

  return `${width} x ${height}`;
}

export function getOutputFileName(file: File, outputType: string): string {
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const extension = IMAGE_EXTENSION_BY_TYPE[outputType] ?? 'img';
  return `${baseName}-compressed.${extension}`;
}

export function getFileKindLabel(type: string): string {
  if (type === 'image/jpeg') {
    return 'JPEG';
  }

  if (type === 'image/png') {
    return 'PNG';
  }

  if (type === 'image/webp') {
    return 'WebP';
  }

  if (type === 'image/bmp') {
    return 'BMP';
  }

  if (type === 'image/gif') {
    return 'GIF';
  }

  return type.replace('image/', '').toUpperCase();
}

export function getSavingsRatio(originalSize: number, compressedSize: number): number {
  if (originalSize <= 0) {
    return 0;
  }

  return Math.max(0, ((originalSize - compressedSize) / originalSize) * 100);
}

import { isSupportedImage } from './files';

export function supportsClipboardRead(): boolean {
  return Boolean(window.isSecureContext && navigator.clipboard && 'read' in navigator.clipboard);
}

export async function readClipboardImages(): Promise<File[]> {
  if (!supportsClipboardRead()) {
    return [];
  }

  const items = await navigator.clipboard.read();
  const files: File[] = [];

  for (const item of items) {
    const imageType = item.types.find((type) => type.startsWith('image/'));

    if (!imageType) {
      continue;
    }

    const blob = await item.getType(imageType);
    const extension = imageType.replace('image/', '') || 'png';
    const file = new File([blob], `clipboard-${Date.now()}.${extension}`, {
      type: imageType,
      lastModified: Date.now(),
    });

    if (isSupportedImage(file)) {
      files.push(file);
    }
  }

  return files;
}

export function getFilesFromPasteEvent(event: ClipboardEvent): File[] {
  const items = event.clipboardData?.items;

  if (!items) {
    return [];
  }

  const files: File[] = [];

  for (const item of items) {
    if (!item.type.startsWith('image/')) {
      continue;
    }

    const file = item.getAsFile();

    if (file && isSupportedImage(file)) {
      files.push(file);
    }
  }

  return files;
}

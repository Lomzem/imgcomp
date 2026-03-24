import imageCompression, { type Options } from 'browser-image-compression';
import compressionWorkerUrl from 'browser-image-compression/dist/browser-image-compression.js?url';

import type { CompressionSettings } from '../domain/settings';
import { getOutputFileName } from './files';

type CompressFileOptions = {
  file: File;
  settings: CompressionSettings;
  signal: AbortSignal;
  onProgress: (progress: number) => void;
};

function getWorkerLibUrl(): string {
  return new URL(compressionWorkerUrl, window.location.href).toString();
}

export async function compressFile({
  file,
  settings,
  signal,
  onProgress,
}: CompressFileOptions): Promise<File> {
  const fileType = settings.outputType === 'auto' ? file.type : settings.outputType;

  const options: Options = {
    maxSizeMB: settings.maxSizeMB,
    maxWidthOrHeight: settings.maxWidthOrHeight,
    useWebWorker: true,
    preserveExif: false,
    initialQuality: settings.initialQuality,
    fileType,
    signal,
    onProgress,
    libURL: getWorkerLibUrl(),
  };

  const compressedFile = await imageCompression(file, options);

  return new File([compressedFile], getOutputFileName(file, compressedFile.type || fileType), {
    type: compressedFile.type || fileType,
    lastModified: Date.now(),
  });
}

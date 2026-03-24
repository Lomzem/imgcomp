import imageCompression, { type Options } from 'browser-image-compression';
import compressionWorkerUrl from 'browser-image-compression/dist/browser-image-compression.js?url';

import { getOutputFileName } from './files';

export type PresetId = 'fast' | 'balanced' | 'smallest';
export type OutputMode = 'auto' | 'image/jpeg' | 'image/png' | 'image/webp';

export type CompressionSettings = {
  preset: PresetId;
  outputType: OutputMode;
  maxSizeMB: number;
  maxWidthOrHeight: number;
  initialQuality: number;
};

export const PRESETS: Record<PresetId, Omit<CompressionSettings, 'outputType'>> = {
  fast: {
    preset: 'fast',
    maxSizeMB: 2.4,
    maxWidthOrHeight: 2560,
    initialQuality: 0.88,
  },
  balanced: {
    preset: 'balanced',
    maxSizeMB: 1.4,
    maxWidthOrHeight: 2048,
    initialQuality: 0.82,
  },
  smallest: {
    preset: 'smallest',
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1600,
    initialQuality: 0.72,
  },
};

export const DEFAULT_SETTINGS: CompressionSettings = {
  ...PRESETS.balanced,
  outputType: 'auto',
};

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

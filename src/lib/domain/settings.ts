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

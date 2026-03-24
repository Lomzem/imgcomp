import type { AppState } from '../store/app-store';

export type JobStatus = 'queued' | 'compressing' | 'done' | 'error' | 'cancelled';

export type Job = {
  id: string;
  sourceFile: File;
  sourceUrl: string;
  sourceDimensions?: { width: number; height: number };
  compressedFile?: File;
  compressedUrl?: string;
  compressedDimensions?: { width: number; height: number };
  status: JobStatus;
  progress: number;
  error?: string;
  abortController?: AbortController;
  runToken: number;
  restartOnAbort?: boolean;
};

export function createJob(file: File): Job {
  return {
    id: crypto.randomUUID(),
    sourceFile: file,
    sourceUrl: URL.createObjectURL(file),
    status: 'queued',
    progress: 0,
    runToken: 0,
  };
}

export function cleanupJob(job: Job): void {
  URL.revokeObjectURL(job.sourceUrl);

  if (job.compressedUrl) {
    URL.revokeObjectURL(job.compressedUrl);
  }
}

export function getSelectedJob(state: AppState): Job | undefined {
  return state.jobs.find((job) => job.id === state.selectedJobId) ?? state.jobs[0];
}

export function getStatusLabel(job: Job): string {
  if (job.status === 'compressing') {
    return `Compressing ${Math.round(job.progress)}%`;
  }

  if (job.status === 'done') {
    return 'Ready';
  }

  if (job.status === 'error') {
    return job.error ?? 'Failed';
  }

  if (job.status === 'cancelled') {
    return 'Cancelled';
  }

  return 'Queued';
}

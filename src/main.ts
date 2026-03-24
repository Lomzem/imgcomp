import './style.css';

import {
  compressFile,
  DEFAULT_SETTINGS,
  PRESETS,
  type CompressionSettings,
  type OutputMode,
  type PresetId,
} from './lib/compress';
import {
  getFilesFromPasteEvent,
  readClipboardImages,
  supportsClipboardRead,
} from './lib/clipboard';
import {
  downloadFile,
  formatBytes,
  formatDimensions,
  getFileKindLabel,
  getImageDimensions,
  getSavingsRatio,
  isSupportedImage,
} from './lib/files';

type JobStatus = 'queued' | 'compressing' | 'done' | 'error' | 'cancelled';

type Job = {
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
};

type AppState = {
  jobs: Job[];
  selectedJobId?: string;
  settings: CompressionSettings;
  advancedOpen: boolean;
  processing: boolean;
  message?: string;
};

const rootElement = document.querySelector<HTMLDivElement>('#app');

if (!rootElement) {
  throw new Error('App root not found.');
}

const root = rootElement;

const state: AppState = {
  jobs: [],
  settings: { ...DEFAULT_SETTINGS },
  advancedOpen: false,
  processing: false,
  message: 'Paste or choose an image to compress it locally on your device.',
};

function setMessage(message?: string): void {
  state.message = message;
}

function getSelectedJob(): Job | undefined {
  return state.jobs.find((job) => job.id === state.selectedJobId) ?? state.jobs[0];
}

function cleanupJob(job: Job): void {
  URL.revokeObjectURL(job.sourceUrl);

  if (job.compressedUrl) {
    URL.revokeObjectURL(job.compressedUrl);
  }
}

function createJob(file: File): Job {
  return {
    id: crypto.randomUUID(),
    sourceFile: file,
    sourceUrl: URL.createObjectURL(file),
    status: 'queued',
    progress: 0,
  };
}

async function enrichJobDimensions(job: Job): Promise<void> {
  try {
    job.sourceDimensions = await getImageDimensions(job.sourceFile);

    if (job.compressedFile) {
      job.compressedDimensions = await getImageDimensions(job.compressedFile);
    }
  } catch {
    return;
  }
}

function getStatusLabel(job: Job): string {
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

function renderPresetButton(presetId: PresetId, label: string, description: string): string {
  const isActive = state.settings.preset === presetId;

  return `
    <button
      type="button"
      data-preset="${presetId}"
      class="rounded-2xl border px-4 py-3 text-left transition ${
        isActive
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
      }"
    >
      <div class="text-sm font-semibold">${label}</div>
      <div class="mt-1 text-xs ${isActive ? 'text-slate-200' : 'text-slate-500'}">${description}</div>
    </button>
  `;
}

function renderQueueItem(job: Job): string {
  const selected = state.selectedJobId === job.id;
  const saving = job.compressedFile
    ? `${getSavingsRatio(job.sourceFile.size, job.compressedFile.size).toFixed(0)}% smaller`
    : 'Waiting';

  return `
    <button
      type="button"
      data-select-job="${job.id}"
      class="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
        selected ? 'border-slate-900 bg-slate-900/5' : 'border-slate-200 bg-white'
      }"
    >
      <img src="${job.compressedUrl ?? job.sourceUrl}" alt="" class="h-14 w-14 rounded-xl object-cover" />
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-semibold text-slate-900">${job.sourceFile.name}</div>
        <div class="mt-1 text-xs text-slate-500">${getStatusLabel(job)}</div>
        <div class="mt-1 text-xs text-slate-500">${saving}</div>
      </div>
      <div class="shrink-0 text-right text-xs text-slate-500">${formatBytes(job.sourceFile.size)}</div>
    </button>
  `;
}

function renderSelectedJob(job?: Job): string {
  if (!job) {
    return `
      <section class="panel flex min-h-72 flex-col items-center justify-center text-center">
        <div class="max-w-xs text-balance text-sm text-slate-500">
          Choose an image, paste one from your clipboard, or drop files here.
        </div>
      </section>
    `;
  }

  const compressedSize = job.compressedFile ? formatBytes(job.compressedFile.size) : 'Not ready';
  const savings = job.compressedFile
    ? `${getSavingsRatio(job.sourceFile.size, job.compressedFile.size).toFixed(0)}% smaller`
    : getStatusLabel(job);
  const canDownload = Boolean(job.compressedFile);

  return `
    <section class="panel space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="text-lg font-semibold text-slate-950">${job.sourceFile.name}</div>
          <div class="mt-1 text-sm text-slate-500">${savings}</div>
        </div>
        <button
          type="button"
          data-remove-job="${job.id}"
          class="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600"
        >
          Remove
        </button>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <article class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Original</div>
          <img src="${job.sourceUrl}" alt="Original preview" class="mt-3 aspect-square w-full rounded-xl object-cover" />
          <div class="mt-3 space-y-1 text-sm text-slate-600">
            <div>${formatBytes(job.sourceFile.size)} · ${getFileKindLabel(job.sourceFile.type)}</div>
            <div>${formatDimensions(job.sourceDimensions?.width, job.sourceDimensions?.height)}</div>
          </div>
        </article>

        <article class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Compressed</div>
          <img
            src="${job.compressedUrl ?? job.sourceUrl}"
            alt="Compressed preview"
            class="mt-3 aspect-square w-full rounded-xl object-cover"
          />
          <div class="mt-3 space-y-1 text-sm text-slate-600">
            <div>${compressedSize} · ${getFileKindLabel(job.compressedFile?.type ?? job.sourceFile.type)}</div>
            <div>${formatDimensions(job.compressedDimensions?.width, job.compressedDimensions?.height)}</div>
          </div>
        </article>
      </div>

      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          data-recompress-selected
          class="rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
        >
          Compress selected
        </button>
        <button
          type="button"
          data-download-selected
          class="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold ${
            canDownload ? 'text-slate-900' : 'text-slate-400'
          }"
          ${canDownload ? '' : 'disabled'}
        >
          Download
        </button>
        <button
          type="button"
          data-cancel-selected
          class="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 ${
            job.status === 'compressing' ? '' : 'opacity-50'
          }"
          ${job.status === 'compressing' ? '' : 'disabled'}
        >
          Cancel
        </button>
      </div>
    </section>
  `;
}

function renderApp(): void {
  const selectedJob = getSelectedJob();
  const doneJobs = state.jobs.filter((job) => job.compressedFile);

  root.innerHTML = `
    <div class="mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-28 pt-4 text-slate-900 sm:px-6 lg:px-8">
      <header class="panel">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="max-w-2xl">
            <div class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">imgcomp</div>
            <h1 class="mt-2 text-3xl font-semibold text-slate-950">Fast local image compression for mobile-first use.</h1>
            <p class="mt-3 text-sm leading-6 text-slate-600">
              Images stay on your device. Single-image speed comes first, with batch compression and clipboard support when the browser allows it.
            </p>
          </div>
          <div class="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">EXIF stripped by default</div>
        </div>
      </header>

      <main class="mt-4 grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section class="space-y-4">
          <section class="panel">
            <div class="flex flex-col gap-3">
              <label
                for="file-input"
                id="drop-zone"
                class="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-slate-400 hover:bg-white"
              >
                <div class="text-base font-semibold text-slate-900">Choose images</div>
                <div class="mt-2 max-w-xs text-sm text-slate-500">Best for mobile. Supports single-image speed and multi-image batches.</div>
                <div class="mt-4 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Open photo library</div>
              </label>
              <input id="file-input" type="file" accept="image/*" multiple class="hidden" />

              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  data-paste-button
                  class="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 ${
                    supportsClipboardRead() ? 'bg-white' : 'bg-slate-100 text-slate-400'
                  }"
                  ${supportsClipboardRead() ? '' : 'disabled'}
                >
                  Paste image
                </button>
                <button
                  type="button"
                  data-download-all
                  class="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold ${
                    doneJobs.length ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-400'
                  }"
                  ${doneJobs.length ? '' : 'disabled'}
                >
                  Download all
                </button>
              </div>

              <div class="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">${state.message ?? ''}</div>
            </div>
          </section>

          <section class="panel space-y-4">
            <div>
              <div class="text-sm font-semibold text-slate-900">Compression preset</div>
              <div class="mt-3 grid gap-3">
                ${renderPresetButton('fast', 'Fast', 'Lighter touch, larger files')}
                ${renderPresetButton('balanced', 'Balanced', 'Good default for phone photos')}
                ${renderPresetButton('smallest', 'Smallest', 'More aggressive size reduction')}
              </div>
            </div>

            <button
              type="button"
              data-toggle-advanced
              class="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-900"
            >
              <span>Advanced</span>
              <span>${state.advancedOpen ? 'Hide' : 'Show'}</span>
            </button>

            ${
              state.advancedOpen
                ? `
                  <div class="grid gap-3">
                    <label class="grid gap-2 text-sm text-slate-600">
                      <span>Output type</span>
                      <select data-setting="outputType" class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900">
                        <option value="auto" ${state.settings.outputType === 'auto' ? 'selected' : ''}>Keep original</option>
                        <option value="image/jpeg" ${state.settings.outputType === 'image/jpeg' ? 'selected' : ''}>JPEG</option>
                        <option value="image/webp" ${state.settings.outputType === 'image/webp' ? 'selected' : ''}>WebP</option>
                        <option value="image/png" ${state.settings.outputType === 'image/png' ? 'selected' : ''}>PNG</option>
                      </select>
                    </label>
                    <label class="grid gap-2 text-sm text-slate-600">
                      <span>Target size (MB)</span>
                      <input data-setting="maxSizeMB" type="number" min="0.1" max="20" step="0.1" value="${state.settings.maxSizeMB}" class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900" />
                    </label>
                    <label class="grid gap-2 text-sm text-slate-600">
                      <span>Max width or height</span>
                      <input data-setting="maxWidthOrHeight" type="number" min="320" max="8000" step="10" value="${state.settings.maxWidthOrHeight}" class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900" />
                    </label>
                    <label class="grid gap-2 text-sm text-slate-600">
                      <span>Initial quality (${state.settings.initialQuality.toFixed(2)})</span>
                      <input data-setting="initialQuality" type="range" min="0.4" max="1" step="0.01" value="${state.settings.initialQuality}" />
                    </label>
                  </div>
                `
                : ''
            }
          </section>

          <section class="panel">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-sm font-semibold text-slate-900">Queue</div>
                <div class="mt-1 text-xs text-slate-500">${state.jobs.length} item${state.jobs.length === 1 ? '' : 's'}</div>
              </div>
              <button
                type="button"
                data-compress-all
                class="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold ${
                  state.jobs.length ? 'text-slate-900' : 'text-slate-400'
                }"
                ${state.jobs.length ? '' : 'disabled'}
              >
                Compress all
              </button>
            </div>
            <div class="mt-4 space-y-3">${state.jobs.length ? state.jobs.map(renderQueueItem).join('') : '<div class="text-sm text-slate-500">No images yet.</div>'}</div>
          </section>
        </section>

        <section>${renderSelectedJob(selectedJob)}</section>
      </main>
    </div>
  `;

  bindEvents();
}

function updateSelectedJob(jobId: string): void {
  state.selectedJobId = jobId;
  renderApp();
}

async function addFiles(files: File[]): Promise<void> {
  const acceptedFiles = files.filter(isSupportedImage);
  const skippedCount = files.length - acceptedFiles.length;

  if (!acceptedFiles.length) {
    setMessage('No supported images found. Try JPEG, PNG, WebP, BMP, or GIF.');
    renderApp();
    return;
  }

  const jobs = acceptedFiles.map(createJob);
  state.jobs.unshift(...jobs);
  state.selectedJobId = jobs[0]?.id ?? state.selectedJobId;
  setMessage(
    skippedCount
      ? `${acceptedFiles.length} image${acceptedFiles.length === 1 ? '' : 's'} added. ${skippedCount} skipped.`
      : `${acceptedFiles.length} image${acceptedFiles.length === 1 ? '' : 's'} added. Compressing now...`
  );

  renderApp();

  await Promise.all(jobs.map(enrichJobDimensions));
  renderApp();
  await processQueue();
}

async function runCompression(job: Job): Promise<void> {
  const abortController = new AbortController();
  job.abortController = abortController;
  job.status = 'compressing';
  job.progress = 1;
  job.error = undefined;
  renderApp();

  try {
    const compressedFile = await compressFile({
      file: job.sourceFile,
      settings: state.settings,
      signal: abortController.signal,
      onProgress: (progress) => {
        job.progress = progress;
        renderApp();
      },
    });

    if (job.compressedUrl) {
      URL.revokeObjectURL(job.compressedUrl);
    }

    job.compressedFile = compressedFile;
    job.compressedUrl = URL.createObjectURL(compressedFile);
    job.status = 'done';
    job.progress = 100;
    job.abortController = undefined;
    job.compressedDimensions = await getImageDimensions(compressedFile);
    setMessage('Compression finished. Download when ready.');
  } catch (error) {
    job.abortController = undefined;

    if (error instanceof Error && abortController.signal.aborted) {
      job.status = 'cancelled';
      job.progress = 0;
      job.error = 'Compression cancelled.';
      setMessage('Compression cancelled.');
    } else {
      job.status = 'error';
      job.progress = 0;
      job.error = error instanceof Error ? error.message : 'Compression failed.';
      setMessage(job.error);
    }
  }

  renderApp();
}

async function processQueue(): Promise<void> {
  if (state.processing) {
    return;
  }

  state.processing = true;

  try {
    for (const job of state.jobs) {
      if (job.status !== 'queued') {
        continue;
      }

      await runCompression(job);
    }
  } finally {
    state.processing = false;
    renderApp();
  }
}

function removeJob(jobId: string): void {
  const jobIndex = state.jobs.findIndex((job) => job.id === jobId);

  if (jobIndex === -1) {
    return;
  }

  const [job] = state.jobs.splice(jobIndex, 1);
  job.abortController?.abort();
  cleanupJob(job);

  if (state.selectedJobId === jobId) {
    state.selectedJobId = state.jobs[0]?.id;
  }

  setMessage(state.jobs.length ? 'Item removed.' : 'Queue cleared.');
  renderApp();
}

function updatePreset(presetId: PresetId): void {
  state.settings = {
    ...PRESETS[presetId],
    outputType: state.settings.outputType,
  };
  setMessage(`Using the ${presetId} preset.`);
  renderApp();
}

function updateSetting(name: string, value: string): void {
  if (name === 'outputType') {
    state.settings.outputType = value as OutputMode;
  }

  if (name === 'maxSizeMB') {
    state.settings.maxSizeMB = Number(value);
  }

  if (name === 'maxWidthOrHeight') {
    state.settings.maxWidthOrHeight = Number(value);
  }

  if (name === 'initialQuality') {
    state.settings.initialQuality = Number(value);
  }

  setMessage('Advanced settings updated. Recompress to apply them.');
  renderApp();
}

async function recompressSelected(): Promise<void> {
  const selectedJob = getSelectedJob();

  if (!selectedJob) {
    return;
  }

  selectedJob.status = 'queued';
  selectedJob.progress = 0;
  selectedJob.error = undefined;
  setMessage('Recompressing selected image...');
  renderApp();
  await processQueue();
}

function downloadAll(): void {
  const files = state.jobs.flatMap((job) => (job.compressedFile ? [job.compressedFile] : []));

  files.forEach((file, index) => {
    window.setTimeout(() => {
      downloadFile(file);
    }, index * 200);
  });
}

async function handlePasteButton(): Promise<void> {
  try {
    const files = await readClipboardImages();

    if (!files.length) {
      setMessage('No image found in the clipboard.');
      renderApp();
      return;
    }

    await addFiles(files);
  } catch (error) {
    setMessage(error instanceof Error ? error.message : 'Clipboard read failed.');
    renderApp();
  }
}

function bindEvents(): void {
  const fileInput = root.querySelector<HTMLInputElement>('#file-input');
  const dropZone = root.querySelector<HTMLElement>('#drop-zone');

  fileInput?.addEventListener('change', async (event) => {
    const target = event.currentTarget as HTMLInputElement;
    const files = Array.from(target.files ?? []);

    if (!files.length) {
      return;
    }

    target.value = '';
    await addFiles(files);
  });

  dropZone?.addEventListener('dragover', (event) => {
    event.preventDefault();
  });

  dropZone?.addEventListener('drop', async (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files ?? []);

    if (files.length) {
      await addFiles(files);
    }
  });

  root.querySelector('[data-paste-button]')?.addEventListener('click', async () => {
    await handlePasteButton();
  });

  root.querySelector('[data-download-all]')?.addEventListener('click', () => {
    downloadAll();
  });

  root.querySelector('[data-toggle-advanced]')?.addEventListener('click', () => {
    state.advancedOpen = !state.advancedOpen;
    renderApp();
  });

  root.querySelector('[data-compress-all]')?.addEventListener('click', async () => {
    state.jobs.forEach((job) => {
      if (job.status === 'error' || job.status === 'cancelled') {
        job.status = 'queued';
        job.error = undefined;
      }
    });
    setMessage('Compressing queued images...');
    renderApp();
    await processQueue();
  });

  root.querySelectorAll<HTMLElement>('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      const preset = button.dataset.preset as PresetId;
      updatePreset(preset);
    });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-select-job]').forEach((button) => {
    button.addEventListener('click', () => {
      const jobId = button.dataset.selectJob;

      if (jobId) {
        updateSelectedJob(jobId);
      }
    });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-remove-job]').forEach((button) => {
    button.addEventListener('click', () => {
      const jobId = button.dataset.removeJob;

      if (jobId) {
        removeJob(jobId);
      }
    });
  });

  root.querySelector('[data-recompress-selected]')?.addEventListener('click', async () => {
    await recompressSelected();
  });

  root.querySelector('[data-download-selected]')?.addEventListener('click', () => {
    const job = getSelectedJob();

    if (job?.compressedFile) {
      downloadFile(job.compressedFile);
    }
  });

  root.querySelector('[data-cancel-selected]')?.addEventListener('click', () => {
    const job = getSelectedJob();
    job?.abortController?.abort();
  });

  root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-setting]').forEach((input) => {
    input.addEventListener('input', () => {
      const settingName = input.dataset.setting;

      if (settingName) {
        updateSetting(settingName, input.value);
      }
    });
  });
}

window.addEventListener('paste', async (event) => {
  const files = getFilesFromPasteEvent(event);

  if (!files.length) {
    return;
  }

  event.preventDefault();
  await addFiles(files);
});

renderApp();

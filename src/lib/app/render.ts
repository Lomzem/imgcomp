import { getSelectedJob, getStatusLabel, type Job } from '../domain/jobs';
import type { PresetId } from '../domain/settings';
import type { AppState } from '../store/app-store';
import {
  formatBytes,
  formatDimensions,
  getFileKindLabel,
  getSavingsRatio,
} from '../services/files';
import { supportsClipboardRead } from '../services/clipboard';

export type AppRegions = {
  intake: HTMLElement;
  settings: HTMLElement;
  queue: HTMLElement;
  selected: HTMLElement;
};

function renderPresetButton(
  state: AppState,
  presetId: PresetId,
  label: string,
  description: string
): string {
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

function renderQueueItem(state: AppState, job: Job): string {
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

function renderIntakePanel(state: AppState): string {
  const doneJobs = state.jobs.filter((job) => job.compressedFile);

  return `
    <section class="panel">
      <div class="flex flex-col gap-3">
        <label
          for="file-input"
          data-drop-zone
          class="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-slate-400 hover:bg-white"
        >
          <div class="text-base font-semibold text-slate-900">Choose images</div>
          <div class="mt-2 max-w-xs text-sm text-slate-500">Best for mobile. Supports single-image speed and multi-image batches.</div>
          <div class="mt-4 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Open photo library</div>
        </label>
        <input id="file-input" data-file-input type="file" accept="image/*" multiple class="hidden" />

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
  `;
}

function renderSettingsPanel(state: AppState): string {
  return `
    <section class="panel space-y-4">
      <div>
        <div class="text-sm font-semibold text-slate-900">Compression preset</div>
        <div class="mt-3 grid gap-3">
          ${renderPresetButton(state, 'fast', 'Fast', 'Lighter touch, larger files')}
          ${renderPresetButton(state, 'balanced', 'Balanced', 'Good default for phone photos')}
          ${renderPresetButton(state, 'smallest', 'Smallest', 'More aggressive size reduction')}
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
  `;
}

function renderQueuePanel(state: AppState): string {
  return `
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
      <div class="mt-4 space-y-3">${state.jobs.length ? state.jobs.map((job) => renderQueueItem(state, job)).join('') : '<div class="text-sm text-slate-500">No images yet.</div>'}</div>
    </section>
  `;
}

function renderSelectedJobPanel(job?: Job): string {
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

export function renderApp(state: AppState, regions: AppRegions): void {
  regions.intake.innerHTML = renderIntakePanel(state);
  regions.settings.innerHTML = renderSettingsPanel(state);
  regions.queue.innerHTML = renderQueuePanel(state);
  regions.selected.innerHTML = renderSelectedJobPanel(getSelectedJob(state));
}

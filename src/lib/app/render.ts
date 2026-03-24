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

function renderCropMarks(interactive: boolean): string {
  const base = 'absolute h-3 w-3 transition-colors';
  const color = interactive ? 'border-ink-3/30 group-hover:border-ember/50' : 'border-stroke';

  return `
    <span class="${base} top-3 left-3 border-t border-l ${color}"></span>
    <span class="${base} top-3 right-3 border-t border-r ${color}"></span>
    <span class="${base} bottom-3 left-3 border-b border-l ${color}"></span>
    <span class="${base} bottom-3 right-3 border-b border-r ${color}"></span>
  `;
}

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
      class="rounded-xl border px-3.5 py-2.5 text-left transition-all ${
        isActive ? 'border-ember/40 bg-ember/10' : 'border-stroke hover:border-stroke-bold'
      }"
    >
      <div class="font-mono text-xs font-medium ${isActive ? 'text-ember' : 'text-ink-2'}">${label}</div>
      <div class="mt-0.5 text-xs ${isActive ? 'text-ink-2' : 'text-ink-3'}">${description}</div>
    </button>
  `;
}

function renderQueueItem(state: AppState, job: Job): string {
  const selected = state.selectedJobId === job.id;
  const saving = job.compressedFile
    ? `\u2212${getSavingsRatio(job.sourceFile.size, job.compressedFile.size).toFixed(0)}%`
    : '';

  const dotColors: Record<string, string> = {
    queued: 'bg-ink-3',
    compressing: 'bg-ember animate-pulse',
    done: 'bg-emerald-500',
    error: 'bg-red-400',
    cancelled: 'bg-ink-3',
  };

  return `
    <button
      type="button"
      data-select-job="${job.id}"
      class="flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
        selected ? 'border-ember/30 bg-ember/5' : 'border-stroke hover:border-stroke-bold'
      }"
    >
      <img src="${job.compressedUrl ?? job.sourceUrl}" alt="" class="h-10 w-10 rounded-lg object-cover" />
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm text-ink">${job.sourceFile.name}</div>
        <div class="mt-0.5 flex items-center gap-2">
          <span class="inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dotColors[job.status] ?? 'bg-ink-3'}"></span>
          <span class="font-mono text-xs text-ink-3">${formatBytes(job.sourceFile.size)}</span>
          ${saving ? `<span class="font-mono text-xs text-emerald-500">${saving}</span>` : ''}
        </div>
      </div>
    </button>
  `;
}

function renderIntakePanel(state: AppState): string {
  const doneJobs = state.jobs.filter((job) => job.compressedFile);

  return `
    <section class="card">
      <label
        for="file-input"
        data-drop-zone
        class="group relative flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-stroke-bold px-6 py-8 text-center transition-all hover:border-ember/40 hover:bg-lifted/50"
      >
        ${renderCropMarks(true)}
        <div class="font-mono text-xs uppercase tracking-[0.2em] text-ink-3 transition-colors group-hover:text-ink-2">Drop image here</div>
        <div class="mt-2 text-sm text-ink-3">or tap to open photo library</div>
      </label>
      <input id="file-input" data-file-input type="file" accept="image/*" multiple class="hidden" />

      <div class="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          data-paste-button
          class="rounded-xl border border-stroke px-3 py-2.5 font-mono text-xs transition-colors ${
            supportsClipboardRead()
              ? 'text-ink-2 hover:border-stroke-bold hover:text-ink'
              : 'text-ink-3/50'
          }"
          ${supportsClipboardRead() ? '' : 'disabled'}
        >
          Paste
        </button>
        <button
          type="button"
          data-download-all
          class="rounded-xl border border-stroke px-3 py-2.5 font-mono text-xs transition-colors ${
            doneJobs.length ? 'text-ink-2 hover:border-stroke-bold hover:text-ink' : 'text-ink-3/50'
          }"
          ${doneJobs.length ? '' : 'disabled'}
        >
          Download all
        </button>
      </div>

      ${state.message ? `<div class="mt-3 rounded-lg bg-ground/50 px-3 py-2 font-mono text-xs leading-relaxed text-ink-3">${state.message}</div>` : ''}
    </section>
  `;
}

function renderSettingsPanel(state: AppState): string {
  return `
    <section class="card space-y-3">
      <div class="flex items-center justify-between">
        <div class="font-mono text-xs uppercase tracking-[0.15em] text-ink-3">Preset</div>
        <div class="font-mono text-[10px] text-ink-3/50">EXIF auto-stripped</div>
      </div>
      <div class="grid gap-2">
        ${renderPresetButton(state, 'fast', 'Fast', 'Lighter touch, larger output')}
        ${renderPresetButton(state, 'balanced', 'Balanced', 'Good default for photos')}
        ${renderPresetButton(state, 'smallest', 'Smallest', 'Aggressive reduction')}
      </div>

      <button
        type="button"
        data-toggle-advanced
        class="flex w-full items-center justify-between rounded-xl border border-stroke px-3.5 py-2.5 text-left font-mono text-xs text-ink-2 transition-colors hover:border-stroke-bold hover:text-ink"
      >
        <span>Advanced</span>
        <span class="text-ink-3">${state.advancedOpen ? '\u2212' : '+'}</span>
      </button>

      ${
        state.advancedOpen
          ? `
            <div class="grid gap-3">
              <label class="grid gap-1.5 text-xs">
                <span class="font-mono uppercase tracking-wider text-ink-3">Output</span>
                <select data-setting="outputType" class="rounded-xl border border-stroke bg-ground px-3 py-2.5 font-mono text-sm text-ink">
                  <option value="auto" ${state.settings.outputType === 'auto' ? 'selected' : ''}>Auto</option>
                  <option value="image/jpeg" ${state.settings.outputType === 'image/jpeg' ? 'selected' : ''}>JPEG</option>
                  <option value="image/webp" ${state.settings.outputType === 'image/webp' ? 'selected' : ''}>WebP</option>
                  <option value="image/png" ${state.settings.outputType === 'image/png' ? 'selected' : ''}>PNG</option>
                </select>
              </label>
              <label class="grid gap-1.5 text-xs">
                <span class="font-mono uppercase tracking-wider text-ink-3">Max size (MB)</span>
                <input data-setting="maxSizeMB" type="number" min="0.1" max="20" step="0.1" value="${state.settings.maxSizeMB}" class="rounded-xl border border-stroke bg-ground px-3 py-2.5 font-mono text-sm text-ink" />
              </label>
              <label class="grid gap-1.5 text-xs">
                <span class="font-mono uppercase tracking-wider text-ink-3">Max dimension (px)</span>
                <input data-setting="maxWidthOrHeight" type="number" min="320" max="8000" step="10" value="${state.settings.maxWidthOrHeight}" class="rounded-xl border border-stroke bg-ground px-3 py-2.5 font-mono text-sm text-ink" />
              </label>
              <label class="grid gap-1.5 text-xs">
                <span class="font-mono uppercase tracking-wider text-ink-3">Quality \u00b7 ${state.settings.initialQuality.toFixed(2)}</span>
                <input data-setting="initialQuality" type="range" min="0.4" max="1" step="0.01" value="${state.settings.initialQuality}" class="mt-1" />
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
    <section class="card">
      <div class="flex items-center justify-between">
        <div>
          <span class="font-mono text-xs uppercase tracking-[0.15em] text-ink-3">Queue</span>
          <span class="ml-2 font-mono text-xs text-ink-3/50">${state.jobs.length}</span>
        </div>
        <button
          type="button"
          data-compress-all
          class="rounded-lg border border-stroke px-2.5 py-1.5 font-mono text-xs transition-colors ${
            state.jobs.length
              ? 'text-ink-2 hover:border-stroke-bold hover:text-ink'
              : 'text-ink-3/50'
          }"
          ${state.jobs.length ? '' : 'disabled'}
        >
          Compress all
        </button>
      </div>
      <div class="mt-3 space-y-2">${
        state.jobs.length
          ? state.jobs.map((job) => renderQueueItem(state, job)).join('')
          : '<div class="py-4 text-center font-mono text-xs text-ink-3/40">No images yet</div>'
      }</div>
    </section>
  `;
}

function renderSelectedJobPanel(job?: Job): string {
  if (!job) {
    return `
      <section class="card relative flex min-h-56 flex-col items-center justify-center text-center lg:min-h-72">
        ${renderCropMarks(false)}
        <div class="font-mono text-xs uppercase tracking-[0.2em] text-ink-3/40">No image selected</div>
        <div class="mt-2 text-sm text-ink-3/30">Drop, paste, or pick a file</div>
      </section>
    `;
  }

  const compressedSize = job.compressedFile ? formatBytes(job.compressedFile.size) : '\u2014';
  const savings = job.compressedFile
    ? getSavingsRatio(job.sourceFile.size, job.compressedFile.size).toFixed(0)
    : null;
  const statusText = savings ? `\u2212${savings}% \u00b7 ${compressedSize}` : getStatusLabel(job);
  const canDownload = Boolean(job.compressedFile);
  const isCompressing = job.status === 'compressing';

  return `
    <section class="card relative space-y-4 overflow-hidden">
      ${
        isCompressing
          ? `<div class="absolute inset-x-0 top-0 h-0.5 bg-stroke">
               <div class="h-full bg-ember transition-all duration-300 ease-out" style="width: ${job.progress}%; box-shadow: 0 0 8px rgba(212, 136, 58, 0.4)"></div>
             </div>`
          : ''
      }

      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <div class="truncate text-sm font-medium text-ink">${job.sourceFile.name}</div>
          <div class="mt-0.5 font-mono text-xs ${savings ? 'text-emerald-500' : 'text-ink-3'}">${statusText}</div>
        </div>
        <button
          type="button"
          data-remove-job="${job.id}"
          class="shrink-0 rounded-lg border border-stroke px-2.5 py-1 font-mono text-xs text-ink-3 transition-colors hover:border-red-400/40 hover:text-red-400"
        >
          Remove
        </button>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <article class="overflow-hidden rounded-xl border border-stroke bg-ground">
          <div class="px-3 py-2">
            <span class="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-3">Original</span>
          </div>
          <img src="${job.sourceUrl}" alt="Original" class="aspect-square w-full object-cover" />
          <div class="space-y-0.5 px-3 py-2 font-mono text-xs text-ink-3">
            <div>${formatBytes(job.sourceFile.size)} \u00b7 ${getFileKindLabel(job.sourceFile.type)}</div>
            <div>${formatDimensions(job.sourceDimensions?.width, job.sourceDimensions?.height)}</div>
          </div>
        </article>

        <article class="overflow-hidden rounded-xl border border-stroke bg-ground">
          <div class="px-3 py-2">
            <span class="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-3">Compressed</span>
          </div>
          <img
            src="${job.compressedUrl ?? job.sourceUrl}"
            alt="Compressed"
            class="aspect-square w-full object-cover"
          />
          <div class="space-y-0.5 px-3 py-2 font-mono text-xs text-ink-3">
            <div>${compressedSize} \u00b7 ${getFileKindLabel(job.compressedFile?.type ?? job.sourceFile.type)}</div>
            <div>${formatDimensions(job.compressedDimensions?.width, job.compressedDimensions?.height)}</div>
          </div>
        </article>
      </div>

      <div class="flex flex-wrap gap-2">
        ${
          canDownload
            ? `<button
                type="button"
                data-download-selected
                class="rounded-xl bg-ember px-4 py-2.5 text-sm font-medium text-ground transition-colors hover:bg-ember/85"
              >Download</button>`
            : ''
        }
        <button
          type="button"
          data-recompress-selected
          class="rounded-xl border border-stroke px-4 py-2.5 text-sm text-ink-2 transition-colors hover:border-stroke-bold hover:text-ink"
        >
          Recompress
        </button>
        ${
          isCompressing
            ? `<button
                type="button"
                data-cancel-selected
                class="rounded-xl border border-stroke px-4 py-2.5 text-sm text-ink-3 transition-colors hover:border-red-400/40 hover:text-red-400"
              >Cancel</button>`
            : ''
        }
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

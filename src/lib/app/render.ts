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

function renderPresetPill(state: AppState, presetId: PresetId, label: string): string {
  const isActive = state.settings.preset === presetId;

  return `
    <button
      type="button"
      data-preset="${presetId}"
      class="rounded-full px-3 py-1.5 text-xs transition-colors ${
        isActive ? 'bg-ember/15 text-ember' : 'text-ink-3 hover:text-ink-2'
      }"
    >${label}</button>
  `;
}

function renderQueueThumb(state: AppState, job: Job): string {
  const selected = state.selectedJobId === job.id;

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
      class="group relative shrink-0"
    >
      <img
        src="${job.compressedUrl ?? job.sourceUrl}"
        alt="${job.sourceFile.name}"
        class="h-11 w-11 rounded-lg object-cover transition-all ${
          selected
            ? 'ring-1 ring-ember ring-offset-2 ring-offset-ground'
            : 'opacity-50 group-hover:opacity-80'
        }"
      />
      <span class="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${dotColors[job.status] ?? 'bg-ink-3'}"></span>
    </button>
  `;
}

function renderIntakePanel(state: AppState): string {
  if (state.jobs.length === 0) {
    return `
      <section class="flex flex-1 flex-col items-center justify-center text-center">
        <label for="file-input" class="flex w-full max-w-md cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-stroke-bold p-10 transition-colors hover:border-ember/50 hover:bg-raised/50 active:scale-[0.99]">
          <svg class="h-10 w-10 text-ink-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <div class="text-sm text-ink-3">Drop an image anywhere, or <span class="font-medium text-ember">browse files</span></div>
        </label>
        <input id="file-input" data-file-input type="file" accept="image/*" multiple class="hidden" />
        ${
          supportsClipboardRead()
            ? '<button type="button" data-paste-button class="mt-4 text-xs text-ink-3 transition-colors hover:text-ink-2">or paste from clipboard</button>'
            : ''
        }
        ${state.message && state.message !== 'Paste or choose an image to compress it locally on your device.' ? `<div class="mt-6 text-xs text-ink-3/50">${state.message}</div>` : ''}
      </section>
    `;
  }

  const doneJobs = state.jobs.filter((job) => job.compressedFile);

  return `
    <section>
      <div class="flex items-center gap-3">
        <label for="file-input" class="cursor-pointer text-xs text-ink-2 transition-colors hover:text-ember">+ Add</label>
        <input id="file-input" data-file-input type="file" accept="image/*" multiple class="hidden" />
        ${
          supportsClipboardRead()
            ? '<button type="button" data-paste-button class="text-xs text-ink-3 transition-colors hover:text-ink-2">Paste</button>'
            : ''
        }
        <span class="flex-1"></span>
        ${
          state.jobs.some((j) => j.status === 'error' || j.status === 'cancelled')
            ? '<button type="button" data-compress-all class="text-xs text-ink-3 transition-colors hover:text-ink-2">Retry all</button>'
            : ''
        }
        ${
          doneJobs.length > 0
            ? '<button type="button" data-download-all class="text-xs text-ink-2 transition-colors hover:text-ember">Download all</button>'
            : ''
        }
      </div>
      ${state.message ? `<div class="mt-2 text-xs text-ink-3/40">${state.message}</div>` : ''}
    </section>
  `;
}

function renderSettingsPanel(state: AppState): string {
  if (state.jobs.length === 0) return '';

  return `
    <section>
      <div class="flex items-center gap-1">
        ${renderPresetPill(state, 'fast', 'Fast')}
        ${renderPresetPill(state, 'balanced', 'Balanced')}
        ${renderPresetPill(state, 'smallest', 'Smallest')}
        <span class="flex-1"></span>
        <button
          type="button"
          data-toggle-advanced
          class="text-xs text-ink-3/40 transition-colors hover:text-ink-3"
        >${state.advancedOpen ? 'Less' : 'More'}</button>
      </div>

      ${
        state.advancedOpen
          ? `
            <div class="mt-3 grid gap-2.5 rounded-xl bg-raised p-3">
              <label class="grid gap-1.5 text-xs">
                <span class="text-ink-3">Output</span>
                <select data-setting="outputType" class="rounded-lg border border-stroke bg-ground px-3 py-2 font-mono text-sm text-ink">
                  <option value="auto" ${state.settings.outputType === 'auto' ? 'selected' : ''}>Auto</option>
                  <option value="image/jpeg" ${state.settings.outputType === 'image/jpeg' ? 'selected' : ''}>JPEG</option>
                  <option value="image/webp" ${state.settings.outputType === 'image/webp' ? 'selected' : ''}>WebP</option>
                  <option value="image/png" ${state.settings.outputType === 'image/png' ? 'selected' : ''}>PNG</option>
                </select>
              </label>
              <label class="grid gap-1.5 text-xs">
                <span class="text-ink-3">Max size (MB)</span>
                <input data-setting="maxSizeMB" type="number" min="0.1" max="20" step="0.1" value="${state.settings.maxSizeMB}" class="rounded-lg border border-stroke bg-ground px-3 py-2 font-mono text-sm text-ink" />
              </label>
              <label class="grid gap-1.5 text-xs">
                <span class="text-ink-3">Max dimension (px)</span>
                <input data-setting="maxWidthOrHeight" type="number" min="320" max="8000" step="10" value="${state.settings.maxWidthOrHeight}" class="rounded-lg border border-stroke bg-ground px-3 py-2 font-mono text-sm text-ink" />
              </label>
              <label class="grid gap-1.5 text-xs">
                <span class="text-ink-3">Quality \u00b7 ${state.settings.initialQuality.toFixed(2)}</span>
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
  if (state.jobs.length <= 1) return '';

  return `
    <section class="flex items-center gap-2 overflow-x-auto py-1">
      ${state.jobs.map((job) => renderQueueThumb(state, job)).join('')}
    </section>
  `;
}

function renderActionBar(job: Job): string {
  const canDownload = Boolean(job.compressedFile);
  const isCompressing = job.status === 'compressing';
  const savings = job.compressedFile
    ? getSavingsRatio(job.sourceFile.size, job.compressedFile.size).toFixed(0)
    : null;

  return `
    ${
      canDownload
        ? '<button type="button" data-download-selected class="rounded-lg bg-ember px-3.5 py-2 text-sm font-medium text-ground transition-colors hover:bg-ember/85">Download</button>'
        : ''
    }
    ${
      savings
        ? `<span class="font-mono text-xs text-emerald-500">\u2212${savings}%</span>`
        : `<span class="text-xs text-ink-3">${getStatusLabel(job)}</span>`
    }
    <span class="flex-1"></span>
    <button type="button" data-recompress-selected class="text-xs text-ink-3 transition-colors hover:text-ink-2">Recompress</button>
    ${
      isCompressing
        ? '<button type="button" data-cancel-selected class="text-xs text-ink-3 transition-colors hover:text-red-400">Cancel</button>'
        : ''
    }
  `;
}

function renderSelectedJobPanel(job?: Job): string {
  if (!job) return '';

  const compressedSize = job.compressedFile ? formatBytes(job.compressedFile.size) : '\u2014';
  const isCompressing = job.status === 'compressing';

  return `
    <section class="space-y-2">
      <div class="h-px w-full bg-stroke"><div data-progress-bar class="h-full bg-ember transition-all duration-300 ease-out" style="width: ${isCompressing ? job.progress : 0}%; ${isCompressing ? 'box-shadow: 0 0 6px rgba(212,136,58,0.3)' : ''}"></div></div>

      <div class="flex items-center justify-between text-xs text-ink-3">
        <span class="min-w-0 truncate">${job.sourceFile.name}</span>
        <button type="button" data-remove-job="${job.id}" class="shrink-0 transition-colors hover:text-red-400">Remove</button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <div class="mb-1 text-[10px] uppercase tracking-wider text-ink-3/40">Original</div>
          <img src="${job.sourceUrl}" alt="Original" class="max-h-[45dvh] w-full rounded-xl object-contain" />
          <div class="mt-1 font-mono text-[10px] leading-snug text-ink-3">
            ${formatBytes(job.sourceFile.size)} \u00b7 ${getFileKindLabel(job.sourceFile.type)} \u00b7 ${formatDimensions(job.sourceDimensions?.width, job.sourceDimensions?.height)}
          </div>
        </div>
        <div>
          <div class="mb-1 text-[10px] uppercase tracking-wider text-ink-3/40">Compressed</div>
          <img src="${job.compressedUrl ?? job.sourceUrl}" alt="Compressed" class="max-h-[45dvh] w-full rounded-xl object-contain" />
          <div data-compressed-stats class="mt-1 font-mono text-[10px] leading-snug text-ink-3">
            ${compressedSize} \u00b7 ${getFileKindLabel(job.compressedFile?.type ?? job.sourceFile.type)} \u00b7 ${formatDimensions(job.compressedDimensions?.width, job.compressedDimensions?.height)}
          </div>
        </div>
      </div>

      <div data-action-bar class="flex items-center gap-3">
        ${renderActionBar(job)}
      </div>
    </section>
  `;
}

function patchSelectedPanel(region: HTMLElement, job: Job): void {
  const isCompressing = job.status === 'compressing';

  const progressBar = region.querySelector<HTMLElement>('[data-progress-bar]');
  if (progressBar) {
    progressBar.style.width = `${isCompressing ? job.progress : 0}%`;
    progressBar.style.boxShadow = isCompressing ? '0 0 6px rgba(212,136,58,0.3)' : '';
  }

  const actionBar = region.querySelector<HTMLElement>('[data-action-bar]');
  if (actionBar) {
    actionBar.innerHTML = renderActionBar(job);
  }
}

export function renderApp(state: AppState, regions: AppRegions): void {
  regions.intake.innerHTML = renderIntakePanel(state);
  regions.queue.innerHTML = renderQueuePanel(state);

  const job = getSelectedJob(state);
  const sel = regions.selected;
  const prevJobId = sel.dataset.renderedJobId ?? '';
  const prevCompUrl = sel.dataset.renderedCompUrl ?? '';
  const currCompUrl = job?.compressedUrl ?? '';

  if (job && job.id === prevJobId && currCompUrl === prevCompUrl) {
    patchSelectedPanel(sel, job);
  } else {
    sel.innerHTML = renderSelectedJobPanel(job);
    sel.dataset.renderedJobId = job?.id ?? '';
    sel.dataset.renderedCompUrl = currCompUrl;
  }

  regions.settings.innerHTML = renderSettingsPanel(state);
}

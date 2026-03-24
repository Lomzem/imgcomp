import { cleanupJob, createJob, getSelectedJob } from '../domain/jobs';
import { DEFAULT_SETTINGS, PRESETS, type OutputMode, type PresetId } from '../domain/settings';
import { createAppStore, type AppState } from '../store/app-store';
import { renderApp, type AppRegions } from './render';
import { getFilesFromPasteEvent, readClipboardImages } from '../services/clipboard';
import { compressFile } from '../services/compression';
import { downloadFile } from '../services/download';
import { isSupportedImage } from '../services/files';
import { getImageDimensions } from '../services/images';

const AUTO_RECOMPRESS_DELAY_MS = 300;

const initialState: AppState = {
  jobs: [],
  settings: { ...DEFAULT_SETTINGS },
  advancedOpen: false,
  processing: false,
  message: 'Paste or choose an image to compress it locally on your device.',
};

type ControllerOptions = {
  root: HTMLElement;
  regions: AppRegions;
};

export function createAppController({ root, regions }: ControllerOptions) {
  const store = createAppStore(initialState);
  let selectedRecompressTimer: number | undefined;

  function updateMessage(message?: string): void {
    store.update((state) => {
      state.message = message;
    });
  }

  function render(): void {
    renderApp(store.getState(), regions);
  }

  function clearSelectedRecompressTimer(): void {
    if (selectedRecompressTimer !== undefined) {
      window.clearTimeout(selectedRecompressTimer);
      selectedRecompressTimer = undefined;
    }
  }

  async function enrichJobDimensions(jobId: string): Promise<void> {
    const job = store.getState().jobs.find((currentJob) => currentJob.id === jobId);

    if (!job) {
      return;
    }

    try {
      const sourceDimensions = await getImageDimensions(job.sourceFile);
      const compressedDimensions = job.compressedFile
        ? await getImageDimensions(job.compressedFile)
        : undefined;

      store.update((state) => {
        const currentJob = state.jobs.find((item) => item.id === jobId);

        if (!currentJob) {
          return;
        }

        currentJob.sourceDimensions = sourceDimensions;
        currentJob.compressedDimensions = compressedDimensions;
      });
    } catch {
      return;
    }
  }

  async function runCompression(jobId: string, message?: string): Promise<void> {
    const job = store.getState().jobs.find((item) => item.id === jobId);

    if (!job) {
      return;
    }

    const abortController = new AbortController();
    const runToken = job.runToken + 1;

    store.update((state) => {
      const currentJob = state.jobs.find((item) => item.id === jobId);

      if (!currentJob) {
        return;
      }

      currentJob.runToken = runToken;
      currentJob.abortController = abortController;
      currentJob.status = 'compressing';
      currentJob.progress = 1;
      currentJob.error = undefined;
    });

    try {
      const compressedResult = await compressFile({
        file: job.sourceFile,
        settings: store.getState().settings,
        signal: abortController.signal,
        onProgress: (progress) => {
          store.update((state) => {
            const currentJob = state.jobs.find((item) => item.id === jobId);

            if (!currentJob || currentJob.runToken !== runToken) {
              return;
            }

            currentJob.progress = progress;
          });
        },
      });

      const compressedDimensions = await getImageDimensions(compressedResult);

      store.update((state) => {
        const currentJob = state.jobs.find((item) => item.id === jobId);

        if (!currentJob || currentJob.runToken !== runToken) {
          return;
        }

        if (currentJob.compressedUrl) {
          URL.revokeObjectURL(currentJob.compressedUrl);
        }

        currentJob.compressedFile = compressedResult;
        currentJob.compressedUrl = URL.createObjectURL(compressedResult);
        currentJob.compressedDimensions = compressedDimensions;
        currentJob.status = 'done';
        currentJob.progress = 100;
        currentJob.abortController = undefined;
        currentJob.restartOnAbort = undefined;

        if (message) {
          state.message = message;
        }
      });
    } catch (error) {
      store.update((state) => {
        const currentJob = state.jobs.find((item) => item.id === jobId);

        if (!currentJob || currentJob.runToken !== runToken) {
          return;
        }

        currentJob.abortController = undefined;

        if (abortController.signal.aborted) {
          if (currentJob.restartOnAbort) {
            currentJob.status = 'queued';
            currentJob.progress = 0;
            currentJob.error = undefined;
            currentJob.restartOnAbort = undefined;
          } else {
            currentJob.status = 'cancelled';
            currentJob.progress = 0;
            currentJob.error = 'Compression cancelled.';
            state.message = 'Compression cancelled.';
          }
        } else {
          currentJob.status = 'error';
          currentJob.progress = 0;
          currentJob.error = error instanceof Error ? error.message : 'Compression failed.';
          currentJob.restartOnAbort = undefined;
          state.message = currentJob.error;
        }
      });
    }
  }

  async function processQueue(): Promise<void> {
    if (store.getState().processing) {
      return;
    }

    store.update((state) => {
      state.processing = true;
    });

    try {
      while (true) {
        const nextJob = store.getState().jobs.find((job) => job.status === 'queued');

        if (!nextJob) {
          break;
        }

        await runCompression(nextJob.id, 'Compression finished. Download when ready.');
      }
    } finally {
      store.update((state) => {
        state.processing = false;
      });
    }
  }

  async function addFiles(files: File[]): Promise<void> {
    const acceptedFiles = files.filter(isSupportedImage);
    const skippedCount = files.length - acceptedFiles.length;

    if (!acceptedFiles.length) {
      updateMessage('No supported images found. Try JPEG, PNG, WebP, BMP, or GIF.');
      return;
    }

    const jobs = acceptedFiles.map(createJob);

    store.update((state) => {
      state.jobs.unshift(...jobs);
      state.selectedJobId = jobs[0]?.id ?? state.selectedJobId;
      state.message = skippedCount
        ? `${acceptedFiles.length} image${acceptedFiles.length === 1 ? '' : 's'} added. ${skippedCount} skipped.`
        : `${acceptedFiles.length} image${acceptedFiles.length === 1 ? '' : 's'} added. Compressing now...`;
    });

    await Promise.all(jobs.map((job) => enrichJobDimensions(job.id)));
    await processQueue();
  }

  function updateSelectedJob(jobId: string): void {
    store.update((state) => {
      state.selectedJobId = jobId;
    });
  }

  function removeJob(jobId: string): void {
    clearSelectedRecompressTimer();

    store.update((state) => {
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

      state.message = state.jobs.length ? 'Item removed.' : 'Queue cleared.';
    });
  }

  function updatePreset(presetId: PresetId): void {
    store.update((state) => {
      state.settings = {
        ...PRESETS[presetId],
        outputType: state.settings.outputType,
      };
      state.message = `Using the ${presetId} preset.`;
    });

    scheduleSelectedRecompression();
  }

  function updateSetting(name: string, value: string): void {
    store.update((state) => {
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

      state.message = 'Advanced settings updated.';
    });

    scheduleSelectedRecompression();
  }

  async function recompressSelected(isLiveUpdate = false): Promise<void> {
    clearSelectedRecompressTimer();

    const selectedJob = getSelectedJob(store.getState());

    if (!selectedJob) {
      return;
    }

    store.update((state) => {
      const currentJob = state.jobs.find((job) => job.id === selectedJob.id);

      if (!currentJob) {
        return;
      }

      if (currentJob.status === 'compressing') {
        currentJob.restartOnAbort = true;
        currentJob.abortController?.abort();
      }

      currentJob.status = 'queued';
      currentJob.progress = 0;
      currentJob.error = undefined;

      if (!isLiveUpdate) {
        state.message = 'Recompressing selected image...';
      }
    });

    await processQueue();
  }

  function scheduleSelectedRecompression(): void {
    const selectedJob = getSelectedJob(store.getState());

    if (!selectedJob) {
      return;
    }

    clearSelectedRecompressTimer();
    updateMessage('Updating selected preview...');

    selectedRecompressTimer = window.setTimeout(async () => {
      selectedRecompressTimer = undefined;
      await recompressSelected(true);
    }, AUTO_RECOMPRESS_DELAY_MS);
  }

  function downloadAll(): void {
    const files = store
      .getState()
      .jobs.flatMap((job) => (job.compressedFile ? [job.compressedFile] : []));

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
        updateMessage('No image found in the clipboard.');
        return;
      }

      await addFiles(files);
    } catch (error) {
      updateMessage(error instanceof Error ? error.message : 'Clipboard read failed.');
    }
  }

  async function handleRootClick(event: Event): Promise<void> {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest<HTMLElement>(
      '[data-preset], [data-select-job], [data-remove-job], [data-paste-button], [data-download-all], [data-toggle-advanced], [data-compress-all], [data-recompress-selected], [data-download-selected], [data-cancel-selected]'
    );

    if (!button) {
      return;
    }

    if (button.dataset.preset) {
      updatePreset(button.dataset.preset as PresetId);
      return;
    }

    if (button.dataset.selectJob) {
      updateSelectedJob(button.dataset.selectJob);
      return;
    }

    if (button.dataset.removeJob) {
      removeJob(button.dataset.removeJob);
      return;
    }

    if ('pasteButton' in button.dataset) {
      await handlePasteButton();
      return;
    }

    if ('downloadAll' in button.dataset) {
      downloadAll();
      return;
    }

    if ('toggleAdvanced' in button.dataset) {
      store.update((state) => {
        state.advancedOpen = !state.advancedOpen;
      });
      return;
    }

    if ('compressAll' in button.dataset) {
      store.update((state) => {
        state.jobs.forEach((job) => {
          if (job.status === 'error' || job.status === 'cancelled') {
            job.status = 'queued';
            job.error = undefined;
          }
        });
        state.message = 'Compressing queued images...';
      });
      await processQueue();
      return;
    }

    if ('recompressSelected' in button.dataset) {
      await recompressSelected();
      return;
    }

    if ('downloadSelected' in button.dataset) {
      const selectedJob = getSelectedJob(store.getState());

      if (selectedJob?.compressedFile) {
        downloadFile(selectedJob.compressedFile);
      }

      return;
    }

    if ('cancelSelected' in button.dataset) {
      getSelectedJob(store.getState())?.abortController?.abort();
    }
  }

  async function handleRootChange(event: Event): Promise<void> {
    const target = event.target;

    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      return;
    }

    if (target instanceof HTMLInputElement && 'fileInput' in target.dataset) {
      const files = Array.from(target.files ?? []);

      if (!files.length) {
        return;
      }

      target.value = '';
      await addFiles(files);
      return;
    }

    if (target.dataset.setting) {
      updateSetting(target.dataset.setting, target.value);
    }
  }

  async function handleDrop(event: DragEvent): Promise<void> {
    const target = event.target;

    if (!(target instanceof Element) || !target.closest('[data-drop-zone]')) {
      return;
    }

    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files ?? []);

    if (files.length) {
      await addFiles(files);
    }
  }

  function handleDragOver(event: DragEvent): void {
    const target = event.target;

    if (!(target instanceof Element) || !target.closest('[data-drop-zone]')) {
      return;
    }

    event.preventDefault();
  }

  async function handlePasteEvent(event: ClipboardEvent): Promise<void> {
    const files = getFilesFromPasteEvent(event);

    if (!files.length) {
      return;
    }

    event.preventDefault();
    await addFiles(files);
  }

  function cleanup(): void {
    clearSelectedRecompressTimer();

    for (const job of store.getState().jobs) {
      job.abortController?.abort();
      cleanupJob(job);
    }
  }

  root.addEventListener('click', (event) => {
    void handleRootClick(event);
  });
  root.addEventListener('input', (event) => {
    void handleRootChange(event);
  });
  root.addEventListener('change', (event) => {
    void handleRootChange(event);
  });
  root.addEventListener('dragover', handleDragOver);
  root.addEventListener('drop', (event) => {
    void handleDrop(event);
  });
  window.addEventListener('paste', (event) => {
    void handlePasteEvent(event);
  });
  window.addEventListener('beforeunload', cleanup);

  store.subscribe(render);
  render();
}

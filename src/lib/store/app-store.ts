import type { Job } from '../domain/jobs';
import type { CompressionSettings } from '../domain/settings';

export type AppState = {
  jobs: Job[];
  selectedJobId?: string;
  settings: CompressionSettings;
  advancedOpen: boolean;
  processing: boolean;
  message?: string;
};

type Listener = () => void;

export type AppStore = ReturnType<typeof createAppStore>;

export function createAppStore(initialState: AppState) {
  const state = initialState;
  const listeners = new Set<Listener>();

  return {
    getState(): AppState {
      return state;
    },
    update(mutator: (state: AppState) => void): void {
      mutator(state);

      for (const listener of listeners) {
        listener();
      }
    },
    subscribe(listener: Listener): () => void {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

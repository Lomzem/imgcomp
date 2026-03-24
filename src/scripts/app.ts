import { createAppController } from '../lib/app/controller';

const root = document.querySelector<HTMLElement>('[data-app-root]');

if (!root) {
  throw new Error('App root not found.');
}

const intake = root.querySelector<HTMLElement>('[data-region="intake"]');
const settings = root.querySelector<HTMLElement>('[data-region="settings"]');
const queue = root.querySelector<HTMLElement>('[data-region="queue"]');
const selected = root.querySelector<HTMLElement>('[data-region="selected"]');

if (!intake || !settings || !queue || !selected) {
  throw new Error('App regions not found.');
}

createAppController({
  root,
  regions: {
    intake,
    settings,
    queue,
    selected,
  },
});

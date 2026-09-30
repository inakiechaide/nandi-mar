import { esc } from './utils.js';

export function initMedia() {
  document.addEventListener("click", e => {
    const btn = e.target.closest("[data-load]");
    if (!btn) return;
    const stage = btn.closest(".media__stage");
    stage.innerHTML = `<iframe src="${esc(stage.dataset.embed)}" title="${esc(stage.dataset.title)}" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
  });
}

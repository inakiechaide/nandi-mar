import { $, $$, EVENTS, accentStyle, lockScroll } from './utils.js';
import { renderModal } from './components.js';

export function initModal() {
  const modal = $("#modal"), panel = $(".modal__panel", modal), body = $("#modal-body");
  let last = null;
  const focusables = () => $$('a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])', panel);
  const open = id => {
    const ev = EVENTS.find(e => e.id === id);
    if (!ev) return;
    last = document.activeElement;
    panel.setAttribute("style", accentStyle(ev.area));
    body.innerHTML = renderModal(ev);
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    $("#main").inert = true;
    lockScroll(true);
    $(".modal__close", modal).focus();
  };
  const close = (restore = true) => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    $("#main").inert = false;
    lockScroll(false);
    if (restore) last?.focus();
  };
  document.addEventListener("click", e => {
    const trigger = e.target.closest("[data-event]");
    if (trigger) return open(trigger.dataset.event);
    const closer = e.target.closest("[data-close]");
    if (closer && modal.contains(closer)) close(closer.dataset.close !== "nav");
  });
  document.addEventListener("keydown", e => {
    if (!modal.classList.contains("is-open")) return;
    if (e.key === "Escape") return close();
    if (e.key !== "Tab") return;
    const f = focusables(), first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  });
}

import { $, onSubscribe } from './utils.js';
import { CONFIG } from './config.js';

export function initNewsletter() {
  const form = $(".newsletter"), input = $("#nl-email", form), msg = $("#nl-msg", form), btn = $("button", form), n = CONFIG.newsletter;
  const setMsg = (text, type) => { msg.textContent = text; msg.className = `newsletter__msg${type ? ` is-${type}` : ""}`; };
  input.addEventListener("input", () => { if (input.getAttribute("aria-invalid") === "true") { input.removeAttribute("aria-invalid"); setMsg(""); } });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { input.setAttribute("aria-invalid", "true"); setMsg(n.error, "error"); input.focus(); return; }
    btn.disabled = true; btn.textContent = n.sending;
    try { await onSubscribe(email); form.reset(); setMsg(n.success, "ok"); }
    catch { setMsg(n.error, "error"); }
    finally { btn.disabled = false; btn.textContent = n.button; }
  });
}

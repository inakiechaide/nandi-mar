import { $, $$, REDUCED } from './utils.js';
import { renderAgendaList } from './components.js';

export function initAgenda() {
  const list = $("#agenda-list"), chips = $$(".chip");
  chips.forEach(chip => chip.addEventListener("click", () => {
    chips.forEach(c => c.setAttribute("aria-pressed", c === chip));
    const swap = () => { list.innerHTML = renderAgendaList(chip.dataset.filter); list.classList.remove("is-swapping"); };
    if (REDUCED) return swap();
    list.classList.add("is-swapping");
    setTimeout(swap, 250);
  }));
}

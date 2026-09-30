import { $, $$, UI, lockScroll, REDUCED } from './utils.js';

export function initNav() {
  const nav = $("#nav"), menu = $("#menu"), toggle = $(".nav__toggle");
  const setMenu = open => {
    toggle.setAttribute("aria-expanded", open);
    toggle.setAttribute("aria-label", open ? UI.menuClose : UI.menuOpen);
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", !open);
    $("#main").inert = open; $("#footer").inert = open;
    lockScroll(open);
  };
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  menu.addEventListener("click", e => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false); toggle.focus(); } });
  matchMedia("(min-width: 960px)").addEventListener("change", e => { if (e.matches) setMenu(false); });
  const onScroll = () => {
    nav.classList.toggle("nav--solid", scrollY > 40);
    $("#toTop").classList.toggle("is-visible", scrollY > innerHeight);
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  const links = $$(".nav__link");
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    links.forEach(l => l.setAttribute("aria-current", l.getAttribute("href") === `#${en.target.id}`));
  }), { rootMargin: "-45% 0px -50% 0px" });
  $$("[data-nav]").forEach(s => io.observe(s));
}

export function initToTop() {
  $("#toTop").addEventListener("click", () => { scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" }); $(".nav__brand").focus({ preventScroll: true }); });
}

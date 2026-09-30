import { $$, REDUCED } from './utils.js';

export function initReveal() {
  const els = $$(".reveal");
  if (REDUCED || !("IntersectionObserver" in window)) return els.forEach(el => el.classList.add("is-visible"));
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
  }), { threshold: .12, rootMargin: "0px 0px -8% 0px" });
  els.forEach(el => io.observe(el));
}

export function initParallax() {
  if (REDUCED) return;
  const els = $$("[data-parallax]");
  let ticking = false;
  const update = () => {
    const vh = innerHeight;
    els.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const offset = (r.top + r.height / 2 - vh / 2) * -parseFloat(el.dataset.parallax);
      el.style.transform = `translate3d(0,${offset.toFixed(1)}px,0)`;
    });
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener("resize", update);
  update();
}

import { CONFIG } from './modules/config.js';
import { $, icon, navItems, loadEvents, applyTheme } from './modules/utils.js';
import { renderNav, renderHero, renderAbout, renderArea, renderAgenda, renderContact, renderFooter } from './modules/components.js';
import { initNav, initToTop } from './modules/nav.js';
import { initReveal, initParallax } from './modules/scroll.js';
import { initModal } from './modules/modal.js';
import { initAgenda } from './modules/agenda.js';
import { initNewsletter } from './modules/newsletter.js';
import { initMedia } from './modules/media.js';

function mount() {
  const nav = renderNav(navItems());
  $("#nav").innerHTML = nav.bar;
  $("#menu").innerHTML = nav.menu;
  $("#app-hero").innerHTML = renderHero(CONFIG.site);
  $("#app-about").innerHTML = renderAbout(CONFIG.about);
  $("#app-areas").innerHTML = CONFIG.areas.map(renderArea).join("");
  $("#app-agenda").innerHTML = renderAgenda(CONFIG.agenda);
  $("#app-contact").innerHTML = renderContact(CONFIG.contact);
  $("#footer").innerHTML = renderFooter(CONFIG.footer);
  $(".modal__close").innerHTML = icon("close");
  $("#toTop").innerHTML = icon("up");
}

applyTheme(CONFIG.theme);
await loadEvents();
mount();
initNav();
initReveal();
initParallax();
initModal();
initAgenda();
initMedia();
initNewsletter();
initToTop();

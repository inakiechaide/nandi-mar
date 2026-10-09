import { CONFIG } from './config.js';
import { esc, icon, renderImage, accentStyle, bgStyle, EVENTS, isPast, byDate, UI, divider, toDate, fmt, rangeLabel } from './utils.js';

export function renderNav(items) {
  const links = items.map(i => `<li><a class="nav__link" href="#${i.id}">${esc(i.label)}</a></li>`).join("");
  return {
    bar: `<div class="container nav__inner"><a class="nav__brand" href="#inicio">${esc(CONFIG.site.name)}</a><nav aria-label="Principal"><ul class="nav__links">${links}</ul></nav><button class="nav__toggle" type="button" aria-expanded="false" aria-controls="menu" aria-label="${UI.menuOpen}"><span></span><span></span></button></div>`,
    menu: `<nav aria-label="Menú móvil"><ul class="menu__list">${links}</ul></nav>`
  };
}

export function renderHero(site) {
  const roles = site.roles.map(esc).join('<span aria-hidden="true">•</span>');
  return `<section id="inicio" class="hero" data-nav>
    <div class="hero__media frame" data-parallax="0.3">${renderImage(site.hero)}</div>
    <div class="hero__pulse" aria-hidden="true"></div>
    <div class="container hero__content">
      <h1 class="hero__name">${esc(site.name)}</h1>
      <p class="hero__roles">${roles}</p>
      <p class="hero__tagline">${esc(site.tagline)}</p>
      <a class="btn" href="${esc(site.cta.href)}">${esc(site.cta.label)}</a>
    </div>
    <svg class="hero__wave" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 72c180-42 360-42 540 0s360 42 540 0 270-32 360-12V120H0z" fill="currentColor"/></svg>
  </section>`;
}

export function renderAbout(a) {
  return `<section id="${a.id}" class="section" style="${esc(bgStyle(a.background))}" data-nav>
    <div class="container about__grid">
      <figure class="frame about__portrait reveal">${renderImage(a.image, 0.05)}</figure>
      <div class="prose reveal">
        <h2 class="h2">${esc(a.title)}</h2>
        <p class="lead">${esc(a.lead)}</p>
        ${a.paragraphs.map(p => `<p>${esc(p)}</p>`).join("")}
        <blockquote class="about__quote">${esc(a.quote)}</blockquote>
      </div>
    </div>
  </section>`;
}

export function renderOfferings(list) {
  if (!list?.length) return "";
  return `<div class="area__block reveal"><h3 class="h3">${UI.formats}</h3><ul class="offerings">${list.map(o => `<li class="offering"><h4 class="offering__title">${esc(o.title)}</h4><p class="offering__meta">${esc(o.meta)}</p><p class="offering__text">${esc(o.text)}</p></li>`).join("")}</ul></div>`;
}

export function renderMedia(list) {
  if (!list?.length) return "";
  const brand = { spotify: "Spotify", youtube: "YouTube" };
  return `<div class="area__block reveal"><h3 class="h3">${UI.listen}</h3><ul class="media">${list.map(m => `<li class="media__item">
    <div class="media__stage ph ph--${esc(m.tone || "tierra")}" data-embed="${esc(m.embed || "")}" data-title="${esc(m.title)}">
      ${m.embed ? `<button class="btn btn--ghost" type="button" data-load>${icon("play")}${UI.load}</button>` : `<span class="media__glyph">${icon(m.type)}</span>`}
    </div>
    <div class="media__bar"><div><p class="media__title">${esc(m.title)}</p><p class="media__kind">${esc(m.kind)}</p></div>
      <a class="social" href="${esc(m.url)}" target="_blank" rel="noopener" aria-label="${UI.openIn} ${brand[m.type] || ""}: ${esc(m.title)}">${icon(m.type)}</a></div>
  </li>`).join("")}</ul></div>`;
}

export function renderEventCard(ev, { showArea = false, level = 4 } = {}) {
  const d = toDate(ev.date);
  const h = `h${level}`;
  return `<li style="${accentStyle(ev.area)}" data-area="${ev.area.id}"><article class="event${isPast(ev) ? " event--past" : ""}">
    <div class="event__date" aria-hidden="true"><span class="event__day">${d.getDate()}</span><span class="event__month">${fmt(d, { month: "short" }).replace(".", "")}</span></div>
    <div><${h} class="event__title"><button class="event__hit" type="button" data-event="${ev.id}" aria-haspopup="dialog">${esc(ev.title)}</button></${h}>
      <p class="event__meta">${showArea ? `<span class="event__area">${esc(ev.area.navLabel)}</span> • ` : ""}<time datetime="${ev.date}">${esc(rangeLabel(ev))}</time> • ${esc(ev.place)}, ${esc(ev.city)}</p></div>
    <span class="badge badge--${ev.status}">${esc(UI.status[ev.status])}</span>
  </article></li>`;
}

const renderEmpty = () => `<p class="empty">${esc(UI.empty)}</p>`;

export function renderEvents(area) {
  const own = EVENTS.filter(e => e.area === area);
  const upcoming = own.filter(e => !isPast(e)).sort(byDate);
  const past = own.filter(isPast).sort((a, b) => byDate(b, a));
  return `<div class="area__block reveal"><h3 class="h3">${UI.upcoming}</h3>
    ${upcoming.length ? `<ul class="events">${upcoming.map(e => renderEventCard(e)).join("")}</ul>` : renderEmpty()}
    ${past.length ? `<details class="past"><summary>${UI.past} (${past.length})</summary><ul class="events">${past.map(e => renderEventCard(e)).join("")}</ul></details>` : ""}
  </div>`;
}

export function renderArea(area, index) {
  return `<section id="${area.id}" class="section area${index % 2 ? " area--alt" : ""}" style="${esc([accentStyle(area), bgStyle(area.background)].filter(Boolean).join(";"))}" data-nav>
    <div class="container">
      <div class="area__intro">
        <div class="prose reveal">
          <h2 class="h2">${esc(area.title)}</h2>
          <p class="area__sub">${esc(area.subtitle)}</p>
          <p>${esc(area.description)}</p>
        </div>
        <figure class="frame area__figure reveal">${renderImage(area.image, 0.06)}</figure>
      </div>
      ${renderOfferings(area.offerings)}
      ${renderMedia(area.media)}
      ${renderEvents(area)}
    </div>
  </section>`;
}

export function renderAgendaList(filter = "all") {
  const list = EVENTS.filter(e => !isPast(e) && (filter === "all" || e.area.id === filter)).sort(byDate);
  return list.length ? `<ul class="events">${list.map(e => renderEventCard(e, { showArea: true, level: 3 })).join("")}</ul>` : renderEmpty();
}

export function renderAgenda(a) {
  const chips = [`<button class="chip" type="button" data-filter="all" aria-pressed="true">${esc(a.allLabel)}</button>`,
    ...CONFIG.areas.map(ar => `<button class="chip" type="button" data-filter="${ar.id}" aria-pressed="false" style="${accentStyle(ar)}">${esc(ar.navLabel)}</button>`)].join("");
  return `<section id="${a.id}" class="section agenda" style="${esc(bgStyle(a.background))}" data-nav>
    <div class="container">
      <header class="section__head reveal"><h2 class="h2">${esc(a.title)}</h2><p class="lead">${esc(a.intro)}</p>${divider()}</header>
      <div class="chips reveal" role="group" aria-label="${esc(a.filterLabel)}">${chips}</div>
      <div id="agenda-list" class="agenda__list" aria-live="polite">${renderAgendaList()}</div>
    </div>
  </section>`;
}

export function renderSocials(list) {
  return `<ul class="socials">${list.map(s => `<li><a class="social" href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(s.name)}">${icon(s.icon)}</a></li>`).join("")}</ul>`;
}

export function renderNewsletter(n) {
  return `<form class="newsletter" novalidate>
    <h3 class="newsletter__title">${esc(n.title)}</h3>
    <div class="newsletter__row">
      <label class="sr-only" for="nl-email">${esc(n.label)}</label>
      <input id="nl-email" class="newsletter__input" type="email" name="email" autocomplete="email" placeholder="${esc(n.placeholder)}" aria-describedby="nl-msg nl-note">
      <button class="btn" type="submit">${esc(n.button)}</button>
    </div>
    <p id="nl-msg" class="newsletter__msg" role="status" aria-live="polite"></p>
    <p id="nl-note" class="newsletter__note">${esc(n.note)}</p>
  </form>`;
}

export function renderContact(c) {
  return `<section id="${c.id}" class="section contact" style="${esc(bgStyle(c.background))}" data-nav>
    <div class="container prose reveal">
      <h2 class="h2">${esc(c.title)}</h2>
      <p>${esc(c.text)}</p>
      ${divider()}
      ${renderSocials(CONFIG.socials)}
      ${renderNewsletter(CONFIG.newsletter)}
    </div>
  </section>`;
}

export function renderFooter(f) {
  return `<div class="container footer__inner"><span class="footer__brand">${esc(CONFIG.site.name.toUpperCase())}</span><p>${esc(f.text)} · <a class="footer__admin" href="admin.html" rel="nofollow">Admin</a></p><p>© ${new Date().getFullYear()} ${esc(CONFIG.site.name)}. ${esc(f.credits)}</p></div>`;
}

export function renderModal(ev) {
  const past = isPast(ev);
  let action = "";
  if (past) action = `<p class="modal__note">${UI.passed}</p>`;
  else if (ev.status === "open" && ev.link) action = `<a class="btn" href="${esc(ev.link)}" target="_blank" rel="noopener">${UI.book}</a>`;
  else if (ev.status === "soldout") action = `<p class="modal__note">${UI.full}</p><a class="btn btn--ghost" href="#${CONFIG.contact.id}" data-close="nav">${UI.write}</a>`;
  else action = `<a class="btn btn--ghost" href="#${CONFIG.contact.id}" data-close="nav">${UI.notify}</a>`;
  return `<p class="modal__area">${esc(ev.area.title)}</p>
    <h2 id="modal-title" class="modal__title">${esc(ev.title)}</h2>
    ${ev.description ? `<p class="modal__desc">${esc(ev.description)}</p>` : ""}
    <dl class="modal__dl">
      <dt>${UI.dt.date}</dt><dd>${esc(rangeLabel(ev))}</dd>
      <dt>${UI.dt.place}</dt><dd>${esc(ev.place)}</dd>
      <dt>${UI.dt.city}</dt><dd>${esc(ev.city)}, ${esc(ev.country)}</dd>
      <dt>${UI.dt.type}</dt><dd>${esc(ev.type)}</dd>
      <dt>${UI.dt.status}</dt><dd><span class="badge badge--${ev.status}">${esc(UI.status[ev.status])}</span></dd>
    </dl>
    <div class="modal__actions">${action}</div>`;
}

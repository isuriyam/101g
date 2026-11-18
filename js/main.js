/* =========================================================
   101 Global: interactions
   Each block is independent. If one breaks, the rest still work.
   ========================================================= */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 1. Header: add a background once you scroll ---------- */
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 20);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- 2. Mobile menu ---------- */
const navToggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('site-nav');

function setMenu(open) {
  navToggle.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('is-open', open);
  if (open) header.classList.add('is-scrolled'); else onScroll();
}
navToggle.addEventListener('click', () => setMenu(navToggle.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

/* ---------- 3. Highlight the nav link for the section on screen ---------- */
const navLinks = [...nav.querySelectorAll('a[href^="#"]:not(.btn)')];
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' }); // "on screen" = crossing the middle of the viewport
navLinks.forEach((a) => {
  const section = document.querySelector(a.getAttribute('href'));
  if (section) sectionObserver.observe(section);
});

/* ---------- 4. Reveal elements as they scroll into view ---------- */
const revealObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    obs.unobserve(entry.target); // only animate once
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 3) * 70}ms`; // small stagger for items in a row
  revealObserver.observe(el);
});

/* ---------- 5. Count-up numbers in the stats bar ---------- */
function countUp(el) {
  const end = Number(el.dataset.count);
  const start = Number(el.dataset.start || 0);
  if (reduceMotion) { el.textContent = end; return; }
  const duration = 1400;
  const t0 = performance.now();
  const tick = (now) => {
    const p = Math.min((now - t0) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3); // ease-out: fast start, slow finish
    el.textContent = Math.round(start + (end - start) * eased);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
const countObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    countUp(entry.target);
    obs.unobserve(entry.target);
  });
}, { threshold: 0.6 });
document.querySelectorAll('[data-count]').forEach((el) => countObserver.observe(el));

/* ---------- 6. Tabs (works for any role="tablist" with panels) ---------- */
function selectTab(tab) {
  const list = tab.closest('[role="tablist"]');
  list.querySelectorAll('[role="tab"]').forEach((t) => {
    const selected = t === tab;
    t.setAttribute('aria-selected', String(selected));
    t.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    if (panel && list.dataset.sharedPanel === undefined) panel.hidden = !selected;
  });
}
document.querySelectorAll('#solutions [role="tablist"]').forEach((list) => {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  list.addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (tab) selectTab(tab);
  });
  // Keyboard: left/right arrows move between tabs (standard tab behaviour)
  list.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
    if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
    if (e.key === 'Home') next = tabs[0];
    if (e.key === 'End') next = tabs[tabs.length - 1];
    if (next) { e.preventDefault(); next.focus(); selectTab(next); }
  });
});

/* ---------- 7. Office switcher: swaps the map ---------- */
const officeList = document.querySelector('.office-list');
if (officeList) {
  officeList.dataset.sharedPanel = ''; // both tabs share one map panel
  const offices = [...officeList.querySelectorAll('.office')];
  const mapPanel = document.getElementById('map-panel');
  const iframe = mapPanel.querySelector('iframe');
  const pick = (office) => {
    selectTab(office);
    iframe.src = office.dataset.map;
    mapPanel.setAttribute('aria-labelledby', office.id);
  };
  offices.forEach((office) => office.addEventListener('click', () => pick(office)));
  officeList.addEventListener('keydown', (e) => {
    const i = offices.indexOf(document.activeElement);
    if (i < 0) return;
    const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const next = offices[(i + dir + offices.length) % offices.length];
    next.focus(); pick(next);
  });
}

/* ---------- 8. Business unit pop-ups (<dialog>) ---------- */
document.addEventListener('click', (e) => {
  const opener = e.target.closest('[data-open]');
  if (opener) {
    const dialog = document.getElementById(opener.dataset.open);
    document.querySelectorAll('dialog[open]').forEach((d) => d.close());
    dialog?.showModal(); // showModal = traps focus and adds the dark backdrop
    return;
  }
  // Links inside a dialog that jump to a featured-solution tab
  const jump = e.target.closest('[data-close-dialog]');
  if (jump) {
    jump.closest('dialog')?.close();
    const tab = document.getElementById(jump.dataset.tab);
    if (tab) selectTab(tab);
  }
});
document.querySelectorAll('.unit-dialog').forEach((dialog) => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  // Clicking the dark backdrop (outside the panel) closes it
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
});

/* ---------- 9. Contact form: send without leaving the page (Netlify Forms) ---------- */
const form = document.querySelector('.contact-form');
if (form) {
  const status = form.querySelector('.form-status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    status.textContent = 'Sending…';
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString(),
      });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      status.textContent = 'Thank you, your message has been sent. We will contact you shortly.';
    } catch {
      status.textContent = 'Sorry, something went wrong. Please email support@101g.com instead.';
    } finally {
      button.disabled = false;
    }
  });
}

/* ---------- 10. Footer year ---------- */
document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- 11. Hero: network that fires signals ----------
   Dots drift slowly; nearby dots are joined by lines (the network).
   "Pulses" of light travel along those lines from node to node.
   - A few fire on their own.
   - Scrolling fires more (faster scroll = more signals), heading down the page.
   - Tapping/clicking fires a burst from the nearest node. */
(function networkCanvas() {
  const canvas = document.querySelector('.hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const hero = canvas.parentElement;
  let w, h, dpr, nodes = [], pulses = [], running = false, rafId;
  let scrollEnergy = 0, lastY = window.scrollY;
  const pointer = { x: -9999, y: -9999 };
  const LINK = 150; // max distance (px) for a line between two dots

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = hero.clientWidth; h = hero.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.max(28, Math.min(95, (w * h) / 15000)));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      glow: 0,
    }));
    pulses = [];
  }

  // Neighbours of a node = nodes within LINK distance
  const neighbours = (a) => nodes.filter((b) => b !== a && Math.hypot(a.x - b.x, a.y - b.y) < LINK);

  // Start a pulse from node `a`. preferDown = pick a neighbour lower on screen (when scrolling down)
  function fire(a, hops = 3, preferDown = false, avoid = null) {
    let options = neighbours(a).filter((b) => b !== avoid);
    if (!options.length) return;
    if (preferDown) {
      const lower = options.filter((b) => b.y > a.y);
      if (lower.length) options = lower;
    }
    const b = options[Math.floor(Math.random() * options.length)];
    pulses.push({ a, b, t: 0, speed: 0.025 + Math.random() * 0.02, hops, preferDown });
    a.glow = 1;
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    // network lines
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK) {
          ctx.strokeStyle = `rgba(95, 212, 255, ${0.18 * (1 - d / LINK)})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      const dp = Math.hypot(a.x - pointer.x, a.y - pointer.y);
      if (dp < LINK) {
        ctx.strokeStyle = `rgba(95, 212, 255, ${0.4 * (1 - dp / LINK)})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
      }
    }
    // pulses: a bright head with a fading tail
    pulses.forEach((p) => {
      const t0 = Math.max(0, p.t - 0.35);
      const x0 = p.a.x + (p.b.x - p.a.x) * t0, y0 = p.a.y + (p.b.y - p.a.y) * t0;
      const x1 = p.a.x + (p.b.x - p.a.x) * p.t, y1 = p.a.y + (p.b.y - p.a.y) * p.t;
      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, 'rgba(255, 181, 71, 0)');
      grad.addColorStop(1, 'rgba(255, 210, 140, 0.95)');
      ctx.strokeStyle = grad; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.fillStyle = 'rgba(255, 220, 160, 0.25)';
      ctx.beginPath(); ctx.arc(x1, y1, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3dc';
      ctx.beginPath(); ctx.arc(x1, y1, 2, 0, Math.PI * 2); ctx.fill();
    });
    // nodes (lit nodes glow amber, then fade back to blue)
    nodes.forEach((n) => {
      if (n.glow > 0.02) {
        ctx.fillStyle = `rgba(255, 181, 71, ${0.22 * n.glow})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, 4 + 10 * n.glow, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255, 225, 170, ${0.6 + 0.4 * n.glow})`;
      } else {
        ctx.fillStyle = 'rgba(160, 225, 255, 0.7)';
      }
      ctx.beginPath(); ctx.arc(n.x, n.y, 1.7 + n.glow, 0, Math.PI * 2); ctx.fill();
    });
  }

  function step() {
    nodes.forEach((n) => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
      n.glow *= 0.95;
    });
    // advance pulses; when one arrives, the node lights and may pass the signal on
    pulses = pulses.filter((p) => {
      p.t += p.speed;
      if (Math.hypot(p.a.x - p.b.x, p.a.y - p.b.y) > LINK * 1.3) return false; // link broke
      if (p.t >= 1) {
        p.b.glow = 1;
        if (p.hops > 0) fire(p.b, p.hops - 1, p.preferDown, p.a);
        return false;
      }
      return true;
    });
    // spawn: a trickle on its own, plus more while scrolling
    const rate = 0.025 + Math.min(scrollEnergy, 1) * 0.5;
    if (Math.random() < rate && pulses.length < 60) {
      const start = nodes[Math.floor(Math.random() * nodes.length)];
      fire(start, 3 + Math.floor(Math.random() * 3), scrollEnergy > 0.1);
    }
    scrollEnergy *= 0.92;
    draw();
    rafId = requestAnimationFrame(step);
  }

  function start() { if (!running && !reduceMotion) { running = true; step(); } }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  resize(); draw();
  new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(hero);

  window.addEventListener('scroll', () => {
    const dy = window.scrollY - lastY; lastY = window.scrollY;
    scrollEnergy = Math.min(2, scrollEnergy + Math.abs(dy) / 120);
  }, { passive: true });

  let resizeTimer, lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastW) return; // ignore phone address-bar height changes
    lastW = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); draw(); }, 150);
  });
  hero.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
  });
  hero.addEventListener('pointerleave', () => { pointer.x = pointer.y = -9999; });
  // Tap/click anywhere on the hero background: burst of signals from the nearest node
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    let nearest = nodes[0], best = Infinity;
    nodes.forEach((n) => { const d = Math.hypot(n.x - x, n.y - y); if (d < best) { best = d; nearest = n; } });
    for (let k = 0; k < 4; k++) fire(nearest, 5);
  });
})();

/* ---------- 12. Backbone: light travels down the page as you scroll ----------
   The lit line ends at 55% of the screen height. Every section .node above
   that point lights up (and plays a ripple the moment it's reached). */
(function backbone() {
  const trunk = document.querySelector('.trunk');
  if (!trunk) return;
  const fill = trunk.querySelector('.spine-fill');
  const nodes = [...trunk.querySelectorAll('.node')];
  let ticking = false;

  function update() {
    ticking = false;
    const r = trunk.getBoundingClientRect();
    const reach = Math.max(0, Math.min(r.height, window.innerHeight * 0.55 - r.top));
    fill.style.height = reach + 'px';
    nodes.forEach((n) => {
      const y = n.getBoundingClientRect().top - r.top + 6;
      n.classList.toggle('is-lit', y <= reach);
    });
  }
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
})();

/* ---------- 13. Business units network map ----------
   Draws a hub ("101G") with one spoke + node per unit row, using each row's
   data-short (label) and data-icon. The active unit's spoke fires a signal.
   Active = the row in the middle of the screen, or the one you hover/focus. */
(function unitsMap() {
  const svg = document.querySelector('.hub-map');
  const rows = [...document.querySelectorAll('.unit-row')];
  if (!svg || !rows.length) return;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    if (parent) parent.appendChild(e);
    return e;
  };

  const R = 215, HUB = 56, NODE = 26;
  el('circle', { class: 'ring', r: 120, cx: 0, cy: 0 }, svg);
  el('circle', { class: 'ring', r: R, cx: 0, cy: 0 }, svg);

  const groups = rows.map((row, i) => {
    const angle = (-90 + (360 / rows.length) * i) * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const spokeG = el('g', {}, svg);
    const line = { x1: cos * HUB, y1: sin * HUB, x2: cos * (R - NODE), y2: sin * (R - NODE) };
    el('line', { class: 'spoke', ...line }, spokeG);
    el('line', { class: 'spoke-sig', pathLength: 1, ...line }, spokeG);

    const nodeG = el('g', { class: 'bu-node', transform: `translate(${cos * R} ${sin * R})` }, svg);
    el('circle', { r: NODE }, nodeG);
    el('use', { href: '#' + row.dataset.icon, x: -11, y: -11, width: 22, height: 22 }, nodeG);
    const lx = cos * 48, ly = sin * 48 + 4;
    const label = el('text', { x: lx, y: ly, 'text-anchor': Math.abs(cos) < 0.3 ? 'middle' : cos > 0 ? 'start' : 'end' }, nodeG);
    label.textContent = row.dataset.short.toUpperCase();
    nodeG.addEventListener('click', () => row.click()); // clicking the map node opens the unit too
    return { spokeG, nodeG };
  });

  // hub drawn last so it sits on top of the spokes
  const hub = el('g', { class: 'hub' }, svg);
  el('circle', { class: 'hub-ring', r: HUB }, hub);
  el('circle', { r: HUB }, hub);
  const t = el('text', { x: 0, y: 9, 'text-anchor': 'middle' }, hub);
  t.textContent = '101G';

  let active = -1;
  function setActive(i) {
    if (i === active) return;
    active = i;
    rows.forEach((r, k) => r.classList.toggle('is-active', k === i));
    groups.forEach((g, k) => {
      g.spokeG.classList.toggle('is-active', k === i);
      g.nodeG.classList.toggle('is-active', k === i);
    });
  }

  // Scroll: the row crossing the middle of the screen becomes active
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) setActive(rows.indexOf(e.target)); });
  }, { rootMargin: '-48% 0px -48% 0px' });
  rows.forEach((row, i) => {
    io.observe(row);
    row.addEventListener('mouseenter', () => setActive(i));
    row.addEventListener('focus', () => setActive(i));
  });
  setActive(0);
})();

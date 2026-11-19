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
    if (panel) panel.hidden = !selected;
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

/* ---------- 10. Footer year ---------- */
document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- 11. Hero: network that fires signals ----------
   Dots drift slowly; nearby dots are joined by lines (the network).
   "Pulses" of light travel along those lines from node to node.
   - A steady stream fires on their own, plus a chain reaction every few seconds.
   - Tapping/clicking fires a burst from the nearest node. */
(function networkCanvas() {
  const canvas = document.querySelector('.hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const hero = canvas.parentElement;
  let w, h, dpr, nodes = [], pulses = [], running = false, rafId;
  let nextBurst = 0; // frame countdown to the next automatic chain reaction
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

  // Start a pulse from node `a`, travelling to a random neighbour (not back where it came from)
  function fire(a, hops = 3, avoid = null) {
    const options = neighbours(a).filter((b) => b !== avoid);
    if (!options.length) return;
    const b = options[Math.floor(Math.random() * options.length)];
    pulses.push({ a, b, t: 0, speed: 0.02 + Math.random() * 0.02, hops });
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
        if (p.hops > 0) fire(p.b, p.hops - 1, p.a);
        return false;
      }
      return true;
    });
    // spawn on their own: a steady stream of signals...
    const randomNode = () => nodes[Math.floor(Math.random() * nodes.length)];
    if (Math.random() < 0.09 && pulses.length < 70) fire(randomNode(), 4 + Math.floor(Math.random() * 4));
    // ...and every 2–4 seconds a node broadcasts to several neighbours at once
    if (--nextBurst <= 0) {
      nextBurst = 120 + Math.random() * 120;
      const hub = randomNode();
      for (let k = 0; k < 3; k++) fire(hub, 4);
    }
    draw();
    rafId = requestAnimationFrame(step);
  }

  function start() { if (!running && !reduceMotion) { running = true; step(); } }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  resize(); draw();
  new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(hero);

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
   that point lights up (and plays a ripple the moment it's reached).
   Smoothness: scrolling only sets a TARGET; every frame the line glides a
   fraction of the way there (easing), so wheel "steps" turn into one fluid motion. */
(function backbone() {
  const trunk = document.querySelector('.trunk');
  if (!trunk) return;
  const fill = trunk.querySelector('.spine-fill');
  const nodes = [...trunk.querySelectorAll('.node')];
  let nodeY = [], trunkTop = 0, trunkH = 0;   // measured once, not every frame
  let target = 0, current = 0, running = false, last = 0;
  const EASE = 0.14; // seconds: higher = lazier, silkier glide

  function measure() {
    const r = trunk.getBoundingClientRect();
    trunkTop = r.top + window.scrollY; trunkH = r.height;
    nodeY = nodes.map((n) => n.getBoundingClientRect().top - r.top + 6);
  }
  function setTarget() {
    target = Math.max(0, Math.min(trunkH, window.innerHeight * 0.55 - (trunkTop - window.scrollY)));
    if (reduceMotion) { current = target; render(); return; }
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  }
  function render() {
    fill.style.height = current.toFixed(1) + 'px';
    nodes.forEach((n, i) => n.classList.toggle('is-lit', nodeY[i] <= current));
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    current += (target - current) * (1 - Math.exp(-dt / EASE)); // same feel at 60Hz and 120Hz
    if (Math.abs(target - current) < 0.4) { current = target; running = false; }
    render();
    if (running) requestAnimationFrame(frame);
  }
  const remeasure = () => { measure(); setTarget(); };
  window.addEventListener('scroll', setTarget, { passive: true });
  window.addEventListener('resize', remeasure);
  window.addEventListener('load', remeasure);            // images/fonts can shift section positions
  if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(trunk); // tabs changing height etc.
  remeasure();
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


/* ---------- 14. Offices globe ----------
   A dotted Earth (orthographic projection) that sways gently, keeping Bangkok in view.
   Signals leave Bangkok along great-circle arcs to cities around the world;
   arcs bound for the far side curve up and over the horizon.
   Tap/click the globe to send a burst. */
(function officeGlobe() {
  const canvas = document.querySelector('.globe');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const RAD = Math.PI / 180;

  // Land mask: 240 x 120 cells of 1.5°, one bit each (baked from Natural Earth 1:50m countries)
  const LAND = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADofwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPj/n////2MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/++f///x8AACABgGkAAOABAAAAAAAAAAAAAAAAWPw//v///wMAAD8AAAAAAAA4AAAAAAAAAAAAAAAHAMAB/P///w8AAAwAAAAAAAgwAAAAAAAAAAAAAAC8cxgDAP7//wcAAAAAAIAHAMD/DwD0AAAAAAAAAOACAAAAAPz//wcAAAAAAGAAAPz/AQAAAAAAAAAAAOA/Y7UDAPD/vwEAAAAAABjAwP//9z9AAAAAA4AAAED8A2P/AeD/fwMAAAAAABDg9v///z//HwCAAPj/A0/8X4PkB9j//wAAAPA/AADj/v///////wc9A/7///8Hwp6hB8D/DwAAAPj/Y+z//f//////////N/D///////+Bf+D/AQAAAP6/x/+//v//////////GP7//////7/wJ+AfAH4AAD5++P//////////////AOD//////8sCH8AfAAwAwL////////////////9/APz//////wNxDIAPAAAI8M////////////////8fAPjf/////wHwAwAOAAAA+M///////////////+ADAPAB+P///wHwMwAAAAAA+A////////////9/YhgAAIAC4P///wPgfwAAAAAQABf///////////8fAB4AACAAAP///x/ofwAAAAAwYMb///////////8PAB8AAAQAgP7////5/wEAAABMwOD///////////8DAA8AAAAAAPz////5/wcAAADs8P////////////8/AAcAAAAAAPj////7/wMAAADi+f////////////+/AAEAAAAAAPj/////jwAAAAAw/v////////////+/gAAAAAAAAOD/////Gw4AAACA//////////////8fAAAAAAAAAOD/////HxAAAACA//////////////8fAAAAAAAAAOD/////PwAAAACA//9P/vj///////8PAAAAAAAAAOD/////EwAAAACA//wHfPz////////HAAAAAAAAAOD/////AQAAAAD8g/EH8Pj////////gAAAAAAAAAOD///9/AAAAAAD8Aebn+fH//////z8AAAAAAAAAAOD///9/AAAAAAD8AGD+//H//////xpgAAAAAAAAAMD///8/AAAAAAD8AMT8//H/////fzggAAAAAAAAAID///8fAAAAAAAQdADs//v//////zE4AAAAAAAAAID///8fAAAAAACwfwBD/////////zA/AAAAAAAAAAD+//8HAAAAAAD4fwAA/////////0AHAAAAAAAAAAD8//8DAAAAAAD8/2OA/////////4EAAAAAAAAAAADo//8DAAAAAAD+/+///////////wEAAAAAAAAAAAD4/xkCAAAAAAD+//////z//////wEAAAAAAAAAAADYfwACAAAAAID///8///n//////wAAAAAAAAAAAACgfwAGAAAAAMD///9//8H//////wAAAAAAAAAAAAAgfwAAAAAAAMD///9//jPg////fwAAAAAAAAAAAAAAfgAAAAAAAOD//////H/A////PwEAAAAAAAAAAAAAfAAIAAAAAOD//////f/A/+//BwAAAAAAAAAAAAAAfDBwAAAAAOD/////+X8A/sN/AAAAAAAAAAAAAAAA+DgAAwAAAOD/////+T8A/oA/AwAAAAAAAAAAAAAA4B8AAAAAAOD/////8x8AfoB/AAMAAAAAAAAAAAAAgPwAAAAAAOD/////8wcAPgD+AAEAAAAAAAAAAAAAAPgBAAAAAOD/////7wEAHAD+AQEAAAAAAAAAAAAAAMAAAAAAAOD/////PwAAHAD8AQAAAAAAAAAAAAAAAICAAgAAAOD/////HwMAGADgAQ4AAAAAAAAAAAAAAADBfgAAAID//////wMAOABAAAAAAAAAAAAAAAAAAADy/wAAAID//////wEAKAAEAAwAAAAAAAAAAAAAAADw/wEAAAD//////wEAYAAIAAgAAAAAAAAAAAAAAADw/x8AAAB88P///wAAAIAZ4AAAAAAAAAAAAAAAAADg/z8AAAAAwP///wAAAAAbMAAAAAAAAAAAAAAAAADw/z8AAAAAgP//PwAAAAAWfCAAAAAAAAAAAAAAAAD4/z8AAAAAwP//HwAAAAAMficAAAAAAAAAAAAAAAD8//8BAAAAwP//DwAAAAAYPiAFAAAAAAAAAAAAAAD8//8DAAAAwP//BwAAAAA8vgEZAAAAAAAAAAAAAAD8//8/AAAAgP//BwAAAABwMBL+AAAAAAAAAAAAAAD8////AAAAAP//BwAAAABgAADwAQAAAAAAAAAAAAD4////AQAAAP//AwAAAADAAADiAwAAAAAAAAAAAAD4////AQAAAP7/AwAAAAAAHATwBgAAAAAAAAAAAADw////AAAAAP7/AwAAAAAAAAQADAAAAAAAAAAAAADw//9/AAAAAP7/BwAAAAAAAIAAAAAAAAAAAAAAAADg//9/AAAAAP7/BwAAAAAAAICHAAAAAAAAAAAAAADg//8/AAAAAP//BwEAAAAAANDHAAAAAAAAAAAAAADA//8/AAAAAP//hwMAAAAAAPjHAQAAAAAAAAAAAAAA//8/AAAAAP//4QEAAAAAAP7fAQAAAAAAAAAAAAAA/v8/AAAAAP//4AEAAAAAAP7/AwAAAAAAAAAAAAAA/v8fAAAAAP5/wEAAAAAAgP//BwAAAAAAAAAAAAAA/v8fAAAAAP7/4AAAAAAA4P//D0AAAAAAAAAAAAAA/v8DAAAAAPz/4AAAAAAA8P//HwAAAAAAAAAAAAAA/v8AAAAAAPx/YAAAAAAA8P//PwAAAAAAAAAAAAAA/v8AAAAAAPw/AAAAAAAA+P//PwAAAAAAAAAAAAAA/v8AAAAAAPw/AAAAAAAA8P//PwAAAAAAAAAAAAAA/38AAAAAAPgfAAAAAAAA4P//PwAAAAAAAAAAAAAA/z8AAAAAAPAPAAAAAAAA4P//PwAAAAAAAAAAAAAA/x8AAAAAAPAHAAAAAAAA4B/+PwAAAAAAAAAAAAAA/w8AAAAAAPABAAAAAAAA4AP0HwAAAAAAAAAAAAAA/wMAAAAAAAAAAAAAAAAAAADwDwAIAAAAAAAAAACA/wMAAAAAAAAAAAAAAAAAAADgDwAQAAAAAAAAAACA/wEAAAAAAAAAAAAAAAAAAADAAgBwAAAAAAAAAACAfwAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAACAHwAAAAAAAAAAAAAAAAAAAAAABwAQAAAAAAAAAACAPwAAAAAAAAAAAAAAAAAAAAAABgAMAAAAAAAAAACADwAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAACABwAAAAAAAAAAAAAAAAAAAAAAAIADAAAAAAAAAADADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAwEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAD0AAPD/Htw/AAAAAAAAAAAAAAAAGAAAAAAAAAAA8P9/4P//////AwAAAAAAAAAAAAAAPwAAAAAAAADA/f8/+P///////wcAAAAAAAAAAAAAewAAAAAK//////8///////////8AAAAAAAAACAAA+AAAAMD///////////////////8BAAAAAEAo8P//fwAAAMD//////////////////z8AAAAA////////HwAAAP///////////////////w8AAICB//////8fAAAA/P///////////////////x8AAAj///////8MBMAD/////////////////////x8AAADw//////8fgPAH8P///////////////////wMAAAD+////////DwDw/////////////////////w8AwIP/////////f/7///////////////////////8A/8D/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////';
  const bits = Uint8Array.from(atob(LAND), (c) => c.charCodeAt(0));
  const dots = [];
  for (let r = 0; r < 120; r++) {
    const lat = 89.25 - r * 1.5;
    const skip = Math.max(1, Math.round(1 / Math.cos(lat * RAD))); // thin out rows near the poles
    for (let c = 0; c < 240; c += skip) {
      const i = r * 240 + c;
      if (bits[i >> 3] & (1 << (i & 7))) dots.push(toVec(lat, -179.25 + c * 1.5));
    }
  }

  const HQ = { name: 'Bangkok', lat: 13.75, lon: 100.5 };
  const CITIES = [
    ['Tokyo', 35.68, 139.69], ['Seoul', 37.57, 126.98], ['Beijing', 39.9, 116.4], ['Hong Kong', 22.32, 114.17],
    ['Singapore', 1.35, 103.82], ['Manila', 14.6, 120.98], ['Sydney', -33.87, 151.21], ['Perth', -31.95, 115.86],
    ['Auckland', -36.85, 174.76], ['Mumbai', 19.08, 72.88], ['Delhi', 28.61, 77.21], ['Dubai', 25.2, 55.27],
    ['Moscow', 55.76, 37.62], ['Istanbul', 41.0, 28.98], ['Frankfurt', 50.11, 8.68], ['London', 51.5, -0.12],
    ['Cairo', 30.04, 31.24], ['Nairobi', -1.29, 36.82], ['Johannesburg', -26.2, 28.05], ['New York', 40.71, -74.0],
    ['Toronto', 43.65, -79.38], ['San Francisco', 37.77, -122.42], ['São Paulo', -23.55, -46.63], ['Honolulu', 21.3, -157.85],
  ];
  const hq = toVec(HQ.lat, HQ.lon);
  const routes = CITIES.map(([name, lat, lon]) => {
    const v = toVec(lat, lon);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot(hq, v))));
    const lift = 0.06 + 0.32 * (angle / Math.PI); // longer routes arc higher
    const pts = [];
    for (let k = 0; k <= 64; k++) {
      const t = k / 64;
      const p = slerp(hq, v, angle, t), h = 1 + lift * Math.sin(Math.PI * t);
      pts.push([p[0] * h, p[1] * h, p[2] * h]);
    }
    return { name, v, pts, glow: 0 };
  });

  function toVec(lat, lon) {
    const φ = lat * RAD, λ = lon * RAD;
    return [Math.cos(φ) * Math.sin(λ), Math.sin(φ), Math.cos(φ) * Math.cos(λ)];
  }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function slerp(a, b, ang, t) {
    if (ang < 1e-6) return a;
    const s = Math.sin(ang), wa = Math.sin((1 - t) * ang) / s, wb = Math.sin(t * ang) / s;
    return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
  }

  // View rotation: spin around the pole by `yaw`, then tilt by `pitch`
  let yaw = 0, pitch = 0, cy, sy, cp, sp;
  function setView(lonCenter, latCenter) {
    yaw = -lonCenter * RAD; pitch = latCenter * RAD;
    cy = Math.cos(yaw); sy = Math.sin(yaw); cp = Math.cos(pitch); sp = Math.sin(pitch);
  }
  function rot(v) {
    const x = v[0] * cy + v[2] * sy, z1 = -v[0] * sy + v[2] * cy;
    const y = v[1] * cp - z1 * sp, z = v[1] * sp + z1 * cp;
    return [x, y, z];
  }
  const hidden = (p) => p[2] < 0 && p[0] * p[0] + p[1] * p[1] < 1; // behind the globe

  let size, R, cx, cyy, dpr, running = false, rafId, frame = 0, t0 = performance.now();
  let pulses = [];
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = canvas.clientWidth;
    canvas.width = size * dpr; canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = size * 0.36; cx = cyy = size / 2;
  }
  const sx = (p) => cx + p[0] * R, syy = (p) => cyy - p[1] * R;

  function launch(route, speed) {
    pulses.push({ route, t: 0, speed: speed || 0.006 + Math.random() * 0.005 });
  }

  function draw(staticFrame) {
    ctx.clearRect(0, 0, size, size);
    // ocean + rim
    const g = ctx.createRadialGradient(cx - R * 0.35, cyy - R * 0.4, R * 0.1, cx, cyy, R);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e3ebfb');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cyy, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(29, 91, 255, 0.25)'; ctx.lineWidth = 1; ctx.stroke();

    // land dots (fade toward the edge)
    const ds = Math.max(1.5, R / 105);
    for (const v of dots) {
      const p = rot(v);
      if (p[2] <= 0.02) continue;
      ctx.fillStyle = `rgba(29, 91, 255, ${0.22 + 0.55 * p[2]})`;
      ctx.fillRect(sx(p) - ds / 2, syy(p) - ds / 2, ds, ds);
    }

    // routes: faint arcs, only the visible parts
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(29, 91, 255, 0.22)';
    for (const r of routes) {
      ctx.beginPath();
      let pen = false;
      for (const q of r.pts) {
        const p = rot(q);
        if (hidden(p)) { pen = false; continue; }
        if (pen) ctx.lineTo(sx(p), syy(p)); else { ctx.moveTo(sx(p), syy(p)); pen = true; }
      }
      ctx.stroke();
      // destination dot
      const d = rot(r.v);
      if (d[2] > 0) {
        if (r.glow > 0.02) {
          ctx.fillStyle = `rgba(255, 181, 71, ${0.3 * r.glow})`;
          ctx.beginPath(); ctx.arc(sx(d), syy(d), 3 + 9 * r.glow, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = r.glow > 0.02 ? '#ffb547' : 'rgba(29, 91, 255, 0.85)';
        ctx.beginPath(); ctx.arc(sx(d), syy(d), 2.4, 0, Math.PI * 2); ctx.fill();
      }
    }

    // pulses: bright head + fading tail along the arc
    for (const pl of pulses) {
      const pts = pl.route.pts, n = pts.length - 1;
      const head = pl.t * n, tail = Math.max(0, head - n * 0.18);
      let prev = null;
      for (let k = Math.floor(tail); k <= Math.min(n, Math.ceil(head)); k++) {
        const p = rot(pts[k]);
        if (hidden(p)) { prev = null; continue; }
        if (prev) {
          const a = (k - tail) / Math.max(1, head - tail);
          ctx.strokeStyle = `rgba(255, 181, 71, ${0.95 * a})`;
          ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(sx(prev), syy(prev)); ctx.lineTo(sx(p), syy(p)); ctx.stroke();
        }
        prev = p;
      }
      const hp = rot(pts[Math.min(n, Math.round(head))]);
      if (!hidden(hp)) {
        ctx.fillStyle = 'rgba(255, 220, 160, 0.3)';
        ctx.beginPath(); ctx.arc(sx(hp), syy(hp), 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff3dc';
        ctx.beginPath(); ctx.arc(sx(hp), syy(hp), 2.2, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Bangkok: amber core with expanding rings
    const b = rot(hq), bx = sx(b), by = syy(b);
    const phase = staticFrame ? 0.4 : ((performance.now() - t0) / 2000) % 1;
    for (const off of [0, 0.5]) {
      const ph = (phase + off) % 1;
      ctx.strokeStyle = `rgba(255, 181, 71, ${0.7 * (1 - ph)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(bx, by, 5 + ph * 22, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 181, 71, 0.35)';
    ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb547';
    ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2); ctx.fill();
    // label
    ctx.font = `500 ${Math.max(10, Math.round(size / 48))}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.fillStyle = '#111827';
    ctx.textBaseline = 'middle';
    ctx.fillText('BANGKOK · HQ', bx + 14, by - 14);
  }

  function step() {
    const t = (performance.now() - t0) / 1000;
    // sway between Europe/Africa and the Pacific, Bangkok always on the visible side
    setView(95 + 42 * Math.sin(t * 0.09), 12 + 6 * Math.sin(t * 0.05));
    frame++;
    if (frame % 22 === 0 && pulses.length < 26) launch(routes[Math.floor(Math.random() * routes.length)]);
    pulses = pulses.filter((p) => {
      p.t += p.speed;
      if (p.t >= 1) { p.route.glow = 1; return false; }
      return true;
    });
    routes.forEach((r) => { r.glow *= 0.96; });
    draw(false);
    rafId = requestAnimationFrame(step);
  }

  function start() { if (!running && !reduceMotion) { running = true; step(); } }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  setView(95, 12); resize(); draw(true);
  if (!reduceMotion) for (let k = 0; k < 6; k++) launch(routes[k * 4], 0.006 + k * 0.001);
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(canvas);

  let lastW = canvas.clientWidth;
  window.addEventListener('resize', () => {
    if (canvas.clientWidth === lastW) return;
    lastW = canvas.clientWidth; resize(); if (!running) draw(true);
  });
  // Tap/click: send a burst to a handful of cities
  canvas.addEventListener('pointerdown', () => {
    if (reduceMotion) return;
    const picks = [...routes].sort(() => Math.random() - 0.5).slice(0, 8);
    picks.forEach((r) => launch(r, 0.009 + Math.random() * 0.006));
  });
})();

/* ---------- 15. Ghost words drift sideways as you scroll ----------
   Each .ghost moves a little (opposite ways in alternate sections) while its section
   crosses the screen. Gives depth: the big type moves slower than the content in front. */
(function ghostDrift() {
  if (reduceMotion) return;
  const ghosts = [...document.querySelectorAll('.ghost')];
  if (!ghosts.length) return;
  let ticking = false;
  function update() {
    ticking = false;
    const vh = window.innerHeight;
    ghosts.forEach((g, i) => {
      const r = g.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const progress = (vh - r.top) / (vh + r.height) - 0.5; // -0.5 … 0.5 while on screen
      const dir = i % 2 ? 1 : -1;
      g.style.transform = `translateX(${(progress * 12 * dir).toFixed(2)}vw)`;
    });
  }
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
})();

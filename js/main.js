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

/* ---------- 11. Hero: animated network background ----------
   Dots drift slowly. Dots close to each other get joined by a line,
   like nodes in a network. Lines also reach toward your mouse. */
(function networkCanvas() {
  const canvas = document.querySelector('.hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const hero = canvas.parentElement;
  let w, h, dpr, nodes = [], running = false, rafId;
  const pointer = { x: -9999, y: -9999 };
  const LINK = 140; // max distance (px) for a line between two dots

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = hero.clientWidth; h = hero.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(90, (w * h) / 16000)); // fewer dots on small screens
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK) {
          ctx.strokeStyle = `rgba(95, 212, 255, ${0.22 * (1 - d / LINK)})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      const dp = Math.hypot(a.x - pointer.x, a.y - pointer.y);
      if (dp < LINK * 1.4) {
        ctx.strokeStyle = `rgba(95, 212, 255, ${0.45 * (1 - dp / (LINK * 1.4))})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(160, 225, 255, 0.75)';
      ctx.beginPath(); ctx.arc(a.x, a.y, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }

  function step() {
    nodes.forEach((n) => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    });
    draw();
    rafId = requestAnimationFrame(step);
  }

  function start() { if (!running && !reduceMotion) { running = true; step(); } }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  resize(); draw();
  // Only animate while the hero is on screen (saves battery)
  new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(hero);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); draw(); }, 150);
  });
  hero.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
  });
  hero.addEventListener('pointerleave', () => { pointer.x = pointer.y = -9999; });
})();

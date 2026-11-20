/* =========================================================
   101 Global: Projects page
   Header + menu (same behaviour as the home page) and the
   live search / business-unit filter for the project cards.
   ========================================================= */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 1. Header background once you scroll ---------- */
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

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- 3. Search + filter ----------
   Every word typed must appear somewhere in a card (title, summary, sector, scope, partner, tags, unit).
   The business-unit chips narrow the list further. Matches are highlighted, and the search is kept
   in the address bar (?q=...&unit=...) so a filtered view can be shared as a link. */
const form = document.querySelector('.pj-console');
const input = document.getElementById('pj-q');
const clearBtn = form.querySelector('.pj-clear');
const chips = [...document.querySelectorAll('.pj-chip')];
const cards = [...document.querySelectorAll('.pj-card')];
const shown = document.getElementById('pj-shown');
const empty = document.getElementById('pj-empty');
const emptyQ = document.getElementById('pj-empty-q');
const pad = (n) => String(n).padStart(2, '0');
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Remember each card's searchable text and the original wording of the parts we highlight
const index = cards.map((card, i) => {
  card.style.viewTransitionName = `pj-card-${i}`;
  const parts = [...card.querySelectorAll('[data-hl]')].map((el) => ({ el, text: el.textContent }));
  return { card, parts, unit: card.dataset.unit, text: card.textContent.replace(/\s+/g, ' ').toLowerCase() };
});

let unit = 'all';

function apply() {
  const raw = input.value.trim();
  const words = raw.toLowerCase().split(/\s+/).filter(Boolean);
  const mark = words.length ? new RegExp('(' + words.map(escapeRe).sort((a, b) => b.length - a.length).join('|') + ')', 'gi') : null;
  const perUnit = {};
  let visible = 0;

  index.forEach((item) => {
    const hit = words.every((w) => item.text.includes(w));
    if (hit) { perUnit[item.unit] = (perUnit[item.unit] || 0) + 1; perUnit.all = (perUnit.all || 0) + 1; }
    const show = hit && (unit === 'all' || item.unit === unit);
    item.card.hidden = !show;
    if (show) visible++;
    item.parts.forEach(({ el, text }) => {
      el.innerHTML = mark ? text.split(mark).map((bit, j) => (j % 2 ? `<mark>${escapeHtml(bit)}</mark>` : escapeHtml(bit))).join('') : escapeHtml(text);
    });
  });

  shown.textContent = pad(visible);
  chips.forEach((chip) => {
    const n = perUnit[chip.dataset.unit] || 0;
    chip.querySelector('.pj-chip-n').textContent = pad(n);
    chip.classList.toggle('is-empty', n === 0);
    chip.setAttribute('aria-pressed', String(chip.dataset.unit === unit));
  });
  empty.hidden = visible > 0;
  const unitName = unit === 'all' ? '' : chips.find((c) => c.dataset.unit === unit).firstChild.textContent.trim();
  emptyQ.textContent = [raw, unitName && `in ${unitName}`].filter(Boolean).join(' ');
  clearBtn.hidden = !raw;
  form.classList.toggle('has-q', !!raw);

  const params = new URLSearchParams();
  if (raw) params.set('q', raw);
  if (unit !== 'all') params.set('unit', unit);
  const qs = params.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

// Cards glide to their new positions where the browser supports it
function update() {
  if (document.startViewTransition && !reduceMotion) document.startViewTransition(apply);
  else apply();
}

input.addEventListener('input', update);
form.addEventListener('submit', (e) => { e.preventDefault(); input.blur(); });
clearBtn.addEventListener('click', () => { input.value = ''; update(); input.focus(); });
chips.forEach((chip) => chip.addEventListener('click', () => { unit = chip.dataset.unit; update(); }));
document.getElementById('pj-reset').addEventListener('click', () => { input.value = ''; unit = 'all'; update(); input.focus(); });

// Clicking a #tag on a card searches for it
document.getElementById('pj-grid').addEventListener('click', (e) => {
  const tag = e.target.closest('.pj-tag');
  if (!tag) return;
  input.value = tag.dataset.tag; unit = 'all'; update();
  form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
});

// Keyboard: "/" jumps to the search box, Esc clears it (or closes the phone menu)
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== input && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); input.focus(); }
  if (e.key === 'Escape') {
    setMenu(false);
    if (document.activeElement === input) { if (input.value) { input.value = ''; update(); } else input.blur(); }
  }
});

// Start from the address bar, e.g. projects.html?q=radio
const start = new URLSearchParams(location.search);
if (start.get('q')) input.value = start.get('q');
if (chips.some((c) => c.dataset.unit === start.get('unit'))) unit = start.get('unit');
apply();

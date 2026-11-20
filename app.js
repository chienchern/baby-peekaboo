'use strict';

// ============ Settings (config.js, with defaults for anything missing) ============
const DEFAULTS = {
  title: 'Peekaboo', circlesPerRound: 4,
  colors: { background: '#bfe6ff', cover: '#7d5fe6' },
  effects: true, effectsVolume: 0.6, speakNames: false, voiceVolume: 1,
  sets: [],
};
const USER = typeof GAME_CONFIG === 'object' ? GAME_CONFIG : {};
const CFG = { ...DEFAULTS, ...USER, colors: { ...DEFAULTS.colors, ...USER.colors } };

// ============ Saved sets (this device only) ============
// Sets, photos and recordings live in this browser's storage (IndexedDB). Nothing is uploaded.
// The first time the game opens on a device, it starts with the sets from config.js.
const Store = (() => {
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((ok, fail) => {
    const r = indexedDB.open('peekaboo', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error);
  }));
  const get = async key => { const d = await db(); return new Promise((ok, fail) => {
    const q = d.transaction('kv').objectStore('kv').get(key); q.onsuccess = () => ok(q.result); q.onerror = () => fail(q.error); }); };
  const put = async (key, val) => { const d = await db(); return new Promise((ok, fail) => {
    const tx = d.transaction('kv', 'readwrite'); tx.objectStore('kv').put(val, key);
    tx.oncomplete = () => ok(); tx.onerror = tx.onabort = () => fail(tx.error); }); };
  return { get, put };
})();
const uid = () => Math.random().toString(36).slice(2, 10);
let SETS = [];          // [{ id, name, items: [{ id, name, picture: Blob|path, sound: Blob|path|null }] }]
let canSave = true;

function configSets() {
  return (Array.isArray(CFG.sets) ? CFG.sets : []).map(s => ({
    id: uid(), name: String(s.name || 'Pictures'),
    items: (s.items || []).filter(i => i && i.name && i.picture).map(i => ({
      id: uid(), name: String(i.name), picture: i.picture, sound: (CFG.speakNames && i.sound) || null })),
  }));
}
async function loadSets() {
  try {
    const saved = await Store.get('sets');
    if (Array.isArray(saved)) { SETS = saved; return; }
    SETS = configSets(); await Store.put('sets', SETS);
  } catch (e) { canSave = false; SETS = configSets(); }
}
async function saveSets() {
  if (!canSave) return;
  try { await Store.put('sets', SETS); navigator.storage?.persist?.().catch(() => {}); }
  catch (e) { alert('Sorry, this could not be saved on this device: ' + e.message); }
}
// Something an <img>/background can show: a file path as-is, or a temporary link to a saved photo.
const blobLinks = new WeakMap();
function srcOf(x) {
  if (!x) return '';
  if (typeof x === 'string') return x;
  let u = blobLinks.get(x); if (!u) { u = URL.createObjectURL(x); blobLinks.set(x, u); }
  return u;
}

const $ = id => document.getElementById(id);
const root = document.documentElement.style;
root.setProperty('--bg', CFG.colors.background);
root.setProperty('--cover', CFG.colors.cover);
document.title = CFG.title;
$('title').textContent = CFG.title;

// ============ Sound effects (soft, bell-like) ============
let ctx = null, fxOut, voiceOut;
function initAudio() {
  if (ctx) { ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  // iPhone/iPad: play even when the silent switch is on (Safari 17+)
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  fxOut = ctx.createGain(); fxOut.gain.value = CFG.effectsVolume;
  const soften = ctx.createBiquadFilter(); soften.type = 'lowpass'; soften.frequency.value = 3500;
  fxOut.connect(soften).connect(ctx.destination);
  voiceOut = ctx.createGain(); voiceOut.gain.value = CFG.voiceVolume; voiceOut.connect(ctx.destination);
  // iOS only unlocks audio if something plays during the tap
  const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0);
}
function note(freq, start = 0, dur = 0.8, vol = 0.18, slideTo) {
  if (!ctx || CFG.effects === false) return;
  const t = ctx.currentTime + start;
  [[1, vol], [2, vol * 0.25]].forEach(([mult, v]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq * mult, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo * mult, t + dur * 0.6);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(fxOut); o.start(t); o.stop(t + dur + 0.05);
  });
}
const sounds = {
  pop:     () => note(420, 0, 0.25, 0.22, 700),                                       // picture appears
  chime:   () => [784, 988, 1175].forEach((f, i) => note(f, i * 0.11, 1.0, 0.12)),   // tapped and kept
  fanfare: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => note(f, i * 0.15, 1.2, 0.12));
                   [523, 659, 784].forEach(f => note(f, 0.85, 2.0, 0.08)); },         // round complete
};

// ============ Recorded names ============
// Each item's recording (made in the Grown-ups screen, or a file named in config.js).
const voicePaths = new Map(), voiceBlobs = new WeakMap();   // recording -> decoded audio
let voiceSrc = null;
const decodeAudio = data => new Promise((ok, fail) => ctx.decodeAudioData(data, ok, fail));
async function getVoice(sound) {
  if (!sound || !ctx) return null;
  const cache = typeof sound === 'string' ? voicePaths : voiceBlobs;
  if (cache.has(sound)) return cache.get(sound);
  const p = (typeof sound === 'string' ? fetch(sound).then(r => r.arrayBuffer()) : sound.arrayBuffer())
    .then(decodeAudio).catch(() => { console.warn('Could not load a recording'); return null; });
  cache.set(sound, p);
  return p;
}
function loadVoices(set) { set.items.forEach(item => getVoice(item.sound)); }
async function playVoice(sound, delay = 0) {
  const buf = await getVoice(sound);
  if (!buf) return;
  stopVoice();
  const s = ctx.createBufferSource(); s.buffer = buf; s.connect(voiceOut);
  s.start(ctx.currentTime + delay); voiceSrc = s;
}
function sayName(item, delay = 0) { if (item.sound) playVoice(item.sound, delay); }
function stopVoice() { if (voiceSrc) { try { voiceSrc.stop(); } catch (e) {} voiceSrc = null; } }

// ============ Start screen ============
const isTouchDevice = matchMedia('(any-pointer: coarse)').matches || navigator.maxTouchPoints > 0;

function renderStart() {
  const cards = $('setcards'); cards.innerHTML = '';
  SETS.filter(set => set.items.length).forEach(set => {
    const card = document.createElement('button');
    card.className = 'setcard';
    const thumbs = document.createElement('div'); thumbs.className = 'thumbs';
    set.items.slice(0, 4).forEach(item => {
      const t = document.createElement('span'); t.style.backgroundImage = `url("${srcOf(item.picture)}")`; thumbs.appendChild(t);
    });
    const label = document.createElement('b'); label.textContent = set.name;
    card.append(thumbs, label);
    card.addEventListener('click', () => startGame(set));
    cards.appendChild(card);
  });
  if (!cards.children.length) cards.textContent = 'No pictures yet. Press and hold Grown-ups to add some.';
  $('voicenote').hidden = SETS.some(s => s.items.some(i => i.sound));
}
let triedAnyway = false;
function showStart() {
  renderStart();
  const blocked = !isTouchDevice && !triedAnyway;
  $('desktopnote').hidden = !blocked;
  $('setcards').hidden = $('grownups').hidden = blocked;
  if (blocked) $('voicenote').hidden = true;
  $('pageurl').textContent = location.href.split('#')[0];
  $('setup').hidden = $('game').hidden = true; $('start').hidden = false;
}
$('anyway').addEventListener('click', () => { triedAnyway = true; showStart(); });
loadSets().then(showStart);

// Press-and-hold buttons (so a toddler doesn't leave the game by accident)
// A quick tap shows a hint instead of doing anything.
function holdButton(el, ms, action, hint) {
  let timer = null, started = 0;
  el.style.setProperty('--hold', ms + 'ms');
  const reset = () => { clearTimeout(timer); timer = null; el.classList.remove('holding'); };
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (err) {}   // keep holding even if the finger wobbles off the edge
    started = Date.now(); el.classList.add('holding');
    timer = setTimeout(() => { reset(); action(); }, ms);
  });
  el.addEventListener('pointerup', () => {
    const wasHolding = !!timer; reset();
    if (wasHolding && hint && Date.now() - started < ms) showHint(el, hint);
  });
  el.addEventListener('pointercancel', reset);
  el.addEventListener('lostpointercapture', () => { if (timer) reset(); });
  el.addEventListener('contextmenu', e => e.preventDefault());
}
function showHint(el, text) {
  let tip = el.parentElement.querySelector('.hint');
  if (!tip) { tip = document.createElement('div'); tip.className = 'hint'; el.parentElement.appendChild(tip); }
  tip.textContent = text;
  const r = el.getBoundingClientRect(), pr = el.parentElement.getBoundingClientRect();
  tip.style.top = (r.bottom - pr.top + 10) + 'px';
  tip.style.right = (pr.right - r.right) + 'px';
  tip.classList.remove('show'); void tip.offsetWidth; tip.classList.add('show');
}

// ============ Game ============
const board = $('board');
let playing = false, currentSet = null, slots = [], roundOver = false, roundTimer = null, wakeLock = null;
const pointers = new Map();   // finger (or mouse) id -> slot it's on

function startGame(set) {
  initAudio();
  document.documentElement.requestFullscreen?.().catch(() => {});
  keepAwake();
  currentSet = set; playing = true;
  loadVoices(set);
  $('start').hidden = true; $('game').hidden = false;
  newRound();
}
function goHome() {
  playing = false; clearTimeout(roundTimer); stopVoice(); pointers.clear();
  showStart();
  wakeLock?.release?.().catch(() => {}); wakeLock = null;
}
async function keepAwake() { try { wakeLock = await navigator.wakeLock?.request('screen'); } catch (e) {} }
document.addEventListener('visibilitychange', () => { if (playing && document.visibilityState === 'visible') keepAwake(); });

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// Arrange n circles in whichever grid makes them biggest on this screen (portrait or landscape).
function layout() {
  const n = slots.length || 1, W = innerWidth, H = innerHeight - 80;
  let best = { size: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const size = Math.min(W * 0.9 / cols, H * 0.84 / rows);
    if (size > best.size) best = { cols, rows, size };
  }
  board.style.gridTemplateColumns = `repeat(${best.cols}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${best.rows}, 1fr)`;
  root.setProperty('--size', Math.floor(best.size * 0.88) + 'px');
}
addEventListener('resize', () => playing && layout());

function newRound() {
  clearTimeout(roundTimer); stopVoice(); pointers.clear();
  roundOver = false;
  const n = Math.max(1, Math.min(9, CFG.circlesPerRound | 0 || 4, currentSet.items.length));
  board.innerHTML = '';
  slots = shuffle([...currentSet.items]).slice(0, n).map(item => {
    const el = document.createElement('div');
    el.className = 'slot';
    el.innerHTML = '<div class="pic"></div><div class="cover"></div><div class="label"></div>';
    el.querySelector('.pic').style.backgroundImage = `url("${srcOf(item.picture)}")`;
    el.querySelector('.label').textContent = item.name;
    board.appendChild(el);
    return { el, item, kept: false, open: false, lastSaid: 0, nameTimer: null };
  });
  layout();
}

// Which circle is at this point? Counts a little outside the edge too (forgiving aim).
function slotAt(x, y) {
  return slots.find(s => {
    const r = s.el.getBoundingClientRect();
    return Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) <= (r.width / 2) * 1.15;
  });
}
const touched = s => [...pointers.values()].includes(s);

function reveal(s) {
  if (s.kept || s.open) return;
  s.open = true; s.el.classList.add('open');
  sounds.pop();
  // Say the name shortly after it appears (unless it was just said, or the finger lifts first: that's a tap)
  if (Date.now() - s.lastSaid > 1500) {
    clearTimeout(s.nameTimer);
    s.nameTimer = setTimeout(() => { s.lastSaid = Date.now(); sayName(s.item); }, 250);
  }
}
function hideIfUntouched(s) {
  if (s.kept || touched(s)) return;
  s.open = false; s.el.classList.remove('open'); clearTimeout(s.nameTimer);
}
function cheer(s) { s.el.classList.remove('cheer'); void s.el.offsetWidth; s.el.classList.add('cheer'); }

// Finger lifted on a circle = tap: keep it revealed, chime, then say the name.
function tap(s) {
  if (roundOver) return;
  clearTimeout(s.nameTimer); s.lastSaid = Date.now();
  if (!s.kept) {
    s.kept = s.open = true; s.el.classList.add('kept', 'open');
    sounds.chime(); cheer(s); sayName(s.item, 0.45);
    if (slots.every(t => t.kept)) celebrate();
  } else {
    sounds.pop(); cheer(s); sayName(s.item);
  }
}
function celebrate() {
  roundOver = true;
  setTimeout(() => { if (playing) { sounds.fanfare(); confetti(4000); } }, 900);
  roundTimer = setTimeout(() => playing && newRound(), 6500);
}

function moveTo(id, x, y) {
  const s = slotAt(x, y) || null, prev = pointers.get(id) || null;
  if (pointers.has(id) && s === prev) return;
  pointers.set(id, s);
  if (prev) hideIfUntouched(prev);
  if (s) reveal(s);
}
const ignore = e => !playing || e.target.closest('button');
addEventListener('pointerdown', e => { if (ignore(e)) return; moveTo(e.pointerId, e.clientX, e.clientY); });
addEventListener('pointermove', e => {
  if (!playing) return;
  if (e.pointerType !== 'mouse' && !pointers.has(e.pointerId)) return;   // fingers count only while touching
  moveTo(e.pointerId, e.clientX, e.clientY);
});
addEventListener('pointerup', e => {
  if (!playing || !pointers.has(e.pointerId)) return;
  const s = pointers.get(e.pointerId);
  if (e.pointerType !== 'mouse') pointers.delete(e.pointerId);
  if (s) tap(s);
});
addEventListener('pointercancel', e => {
  const s = pointers.get(e.pointerId); pointers.delete(e.pointerId);
  if (s) hideIfUntouched(s);
});
document.addEventListener('mouseleave', () => {
  for (const [id, s] of pointers) { pointers.delete(id); if (s) hideIfUntouched(s); }
});
addEventListener('contextmenu', e => e.preventDefault());

$('restart').addEventListener('click', () => { if (playing) { newRound(); sounds.pop(); } });
holdButton($('home'), 1000, goHome, 'Press and hold to go home');

// ============ Confetti ============
const cv = $('confetti'), cctx = cv.getContext('2d');
function confetti(ms) {
  cv.width = innerWidth; cv.height = innerHeight;
  const colors = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c'];
  const bits = Array.from({ length: 200 }, () => ({
    x: Math.random() * cv.width, y: -Math.random() * cv.height,
    vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 4,
    s: 8 + Math.random() * 10, c: colors[Math.floor(Math.random() * colors.length)],
    a: Math.random() * 6, va: (Math.random() - .5) * .3,
  }));
  const end = performance.now() + ms;
  (function frame(now) {
    cctx.clearRect(0, 0, cv.width, cv.height);
    if (now > end || !playing) return;
    bits.forEach(b => {
      b.x += b.vx; b.y += b.vy; b.a += b.va;
      if (b.y > cv.height) b.y = -20;
      cctx.save(); cctx.translate(b.x, b.y); cctx.rotate(b.a);
      cctx.fillStyle = b.c; cctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); cctx.restore();
    });
    requestAnimationFrame(frame);
  })(performance.now());
}

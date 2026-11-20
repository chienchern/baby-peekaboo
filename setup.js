'use strict';
// ============================================================
//  Grown-ups screen: add photos, record names, manage sets, back up.
//  Everything is saved only on this device (see Store in app.js).
// ============================================================

let selectedSetId = null;
let recording = null;            // { mr, item, timer } while the mic is on
const setOf = () => SETS.find(s => s.id === selectedSetId) || SETS[0];

holdButton($('grownups'), 1500, openSetup, 'Keep holding to open');

function openSetup() {
  if (recording) stopRecording();
  $('start').hidden = true; $('setup').hidden = false;
  $('nosave').hidden = canSave;
  $('backupstatus').textContent = '';
  renderSetup();
  $('setup').scrollTop = 0;
}
$('setupdone').addEventListener('click', () => { if (recording) stopRecording(); showStart(); });

// ---------- Render ----------
function button(text, attrs = {}) {
  const b = document.createElement('button');
  b.textContent = text;
  Object.entries(attrs).forEach(([k, v]) => b.setAttribute(k, v));
  return b;
}
function renderSetup() {
  const set = setOf();
  selectedSetId = set ? set.id : null;

  const tabs = $('settabs'); tabs.innerHTML = '';
  SETS.forEach(s => {
    const b = button(s.name, { 'data-set': s.id });
    if (s === set) b.className = 'on';
    tabs.appendChild(b);
  });
  tabs.appendChild(button('+ New set', { 'data-set': 'new' }));

  $('setbar').hidden = $('additem').hidden = !set;
  const list = $('items'); list.innerHTML = '';
  if (set && !set.items.length) {
    const li = document.createElement('li'); li.className = 'empty';
    li.textContent = 'No photos in this set yet. Tap "Add a photo" below.';
    list.appendChild(li);
  }
  (set ? set.items : []).forEach(item => {
    const li = document.createElement('li'); li.dataset.id = item.id;
    const thumb = document.createElement('span'); thumb.className = 'thumb';
    thumb.style.backgroundImage = `url("${srcOf(item.picture)}")`;
    const info = document.createElement('div'); info.className = 'info';
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = item.name;
    const tag = document.createElement('small'); tag.textContent = item.sound ? '\u{1F50A} recorded' : 'no recording';
    nm.appendChild(tag);
    const btns = document.createElement('div'); btns.className = 'btns';
    const isRec = recording && recording.item === item;
    const rec = button(isRec ? '■ Stop' : item.sound ? '\u{1F3A4} Re-record' : '\u{1F3A4} Record name', { 'data-act': 'rec' });
    rec.className = 'rec' + (isRec ? ' on' : '');
    btns.append(rec);
    if (item.sound) btns.append(button('▶ Play', { 'data-act': 'play' }));
    btns.append(button('\u{1F4F7} Photo', { 'data-act': 'photo' }), button('✎ Name', { 'data-act': 'rename' }),
                button('\u{1F5D1}', { 'data-act': 'delete', class: 'danger', title: 'Delete' }));
    info.append(nm, btns);
    li.append(thumb, info);
    list.appendChild(li);
  });

  // Offer to bring back any built-in set (from config.js) that was deleted
  const box = $('builtins'); box.innerHTML = '';
  configSets().filter(c => !SETS.some(s => s.name === c.name)).forEach(c => {
    const b = button(`Add back the built-in "${c.name}" set`);
    b.addEventListener('click', async () => { SETS.push(c); selectedSetId = c.id; await saveSets(); renderSetup(); });
    box.appendChild(b);
  });
}

// ---------- Sets ----------
$('settabs').addEventListener('click', async e => {
  const id = e.target.closest('button')?.dataset.set;
  if (!id) return;
  if (id === 'new') {
    const name = (prompt('Name for the new set (e.g. Family, Toys, Animals):') || '').trim();
    if (!name) return;
    const s = { id: uid(), name: name.slice(0, 40), items: [] };
    SETS.push(s); selectedSetId = s.id; await saveSets();
  } else selectedSetId = id;
  renderSetup();
});
$('renameset').addEventListener('click', async () => {
  const set = setOf(); if (!set) return;
  const name = (prompt('New name for this set:', set.name) || '').trim();
  if (!name) return;
  set.name = name.slice(0, 40); await saveSets(); renderSetup();
});
$('deleteset').addEventListener('click', async () => {
  const set = setOf(); if (!set) return;
  if (!confirm(`Delete the "${set.name}" set and its ${set.items.length} photo(s) and recordings from this device?`)) return;
  SETS = SETS.filter(s => s !== set); selectedSetId = null; await saveSets(); renderSetup();
});

// ---------- Items ----------
let photoTarget = null;      // item whose photo is being replaced (null = adding a new one)
$('additem').addEventListener('click', () => { photoTarget = null; $('photopick').value = ''; $('photopick').click(); });
$('photopick').addEventListener('change', async () => {
  const file = $('photopick').files[0];
  if (!file) return;
  const set = setOf();
  const result = await openCropper(file, !photoTarget);
  if (!result || !set) return;
  if (photoTarget) photoTarget.picture = result.blob;
  else set.items.push({ id: uid(), name: result.name, picture: result.blob, sound: null });
  await saveSets(); renderSetup();
  if (!photoTarget) $('items').lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

$('items').addEventListener('click', async e => {
  const act = e.target.closest('button')?.dataset.act;
  const li = e.target.closest('li');
  const set = setOf();
  const item = set && li && set.items.find(i => i.id === li.dataset.id);
  if (!act || !item) return;
  if (act === 'rec') { initAudio(); recording && recording.item === item ? stopRecording() : startRecording(item); }
  if (act === 'play') { initAudio(); playVoice(item.sound); }
  if (act === 'photo') { photoTarget = item; $('photopick').value = ''; $('photopick').click(); }
  if (act === 'rename') {
    const name = (prompt('Name shown on screen:', item.name) || '').trim();
    if (name) { item.name = name.slice(0, 40); await saveSets(); renderSetup(); }
  }
  if (act === 'delete') {
    if (!confirm(`Delete "${item.name}" from this set?`)) return;
    set.items = set.items.filter(i => i !== item); await saveSets(); renderSetup();
  }
});

// ---------- Photo cropper: drag to move, slider (or pinch / scroll wheel) to zoom ----------
function openCropper(file, askName) {
  return new Promise(async resolve => {
    const url = URL.createObjectURL(file), img = new Image();
    try { img.src = url; await img.decode(); }
    catch (e) { URL.revokeObjectURL(url); alert('Sorry, that photo could not be opened.'); return resolve(null); }
    const cv = $('cropcanvas'), g = cv.getContext('2d'), zoomEl = $('cropzoom');
    const W = img.naturalWidth, H = img.naturalHeight, base = 600 / Math.min(W, H);
    let zoom = 1, ox = 0, oy = 0;
    const draw = () => {
      const s = base * zoom;
      const mx = Math.max(0, (W * s - 600) / 2), my = Math.max(0, (H * s - 600) / 2);
      ox = Math.max(-mx, Math.min(mx, ox)); oy = Math.max(-my, Math.min(my, oy));
      g.fillStyle = '#fff'; g.fillRect(0, 0, 600, 600);
      g.drawImage(img, 300 - W * s / 2 + ox, 300 - H * s / 2 + oy, W * s, H * s);
    };
    const setZoom = z => { zoom = Math.max(1, Math.min(4, z)); zoomEl.value = zoom; draw(); };
    zoomEl.value = 1; zoomEl.oninput = () => setZoom(+zoomEl.value);
    cv.onwheel = e => { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08)); };

    const fingers = new Map(); let last = null;
    const spread = () => { const [a, b] = [...fingers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); fingers.set(e.pointerId, { x: e.clientX, y: e.clientY }); last = fingers.size === 2 ? spread() : null; };
    cv.onpointermove = e => {
      const f = fingers.get(e.pointerId); if (!f) return;
      const k = 600 / cv.clientWidth;
      if (fingers.size === 1) { ox += (e.clientX - f.x) * k; oy += (e.clientY - f.y) * k; }
      f.x = e.clientX; f.y = e.clientY;
      if (fingers.size === 2) { const d = spread(); if (last) setZoom(zoom * d / last); last = d; }
      draw();
    };
    cv.onpointerup = cv.onpointercancel = e => { fingers.delete(e.pointerId); last = null; };

    $('cropnamewrap').hidden = !askName;
    $('cropname').value = ''; $('cropname').placeholder = 'e.g. Grandma';
    $('cropper').hidden = false; draw();

    const done = result => {
      $('cropper').hidden = true; URL.revokeObjectURL(url);
      $('cropok').onclick = $('cropcancel').onclick = null;
      resolve(result);
    };
    $('cropcancel').onclick = () => done(null);
    $('cropok').onclick = () => {
      const name = $('cropname').value.trim().slice(0, 40);
      if (askName && !name) { $('cropname').placeholder = 'Please type a name'; $('cropname').focus(); return; }
      // Saved as a new 600x600 picture: smaller, and without the photo's hidden details (like location)
      cv.toBlob(blob => blob ? done({ blob, name }) : done(null), 'image/jpeg', 0.85);
    };
  });
}

// ---------- Recording a name ----------
async function startRecording(item) {
  if (recording) stopRecording();
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    alert('This browser can\'t record sound. Try Safari on iPhone/iPad or Chrome on Android.'); return;
  }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } }); }
  catch (e) { alert('The microphone isn\'t available. Check that this site is allowed to use it in your browser settings.'); return; }
  const mr = new MediaRecorder(stream), chunks = [];
  mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  mr.onstop = async () => {
    stream.getTracks().forEach(t => t.stop());
    const raw = new Blob(chunks, { type: mr.mimeType || 'audio/mp4' });
    try { item.sound = await tidyRecording(raw); }
    catch (e) { console.warn('Could not tidy recording, keeping it as recorded', e); item.sound = raw; }
    await saveSets(); renderSetup();
    playVoice(item.sound);      // play it back so you can hear how it came out
  };
  mr.start();
  recording = { mr, item, timer: setTimeout(stopRecording, 5000) };   // names are short: stop after 5 seconds
  renderSetup();
}
function stopRecording() {
  if (!recording) return;
  clearTimeout(recording.timer);
  const { mr } = recording; recording = null;
  if (mr.state !== 'inactive') mr.stop();
  renderSetup();
}

// Trim the silence before and after, even out the volume, and save as a small, widely playable file.
async function tidyRecording(blob) {
  const buf = await decodeAudio(await blob.arrayBuffer());
  const sr = buf.sampleRate, n = buf.length, mono = new Float32Array(n);
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / buf.numberOfChannels; }
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(mono[i]));
  if (peak < 0.003) throw new Error('silent');
  const thr = Math.max(peak * 0.08, 0.004);
  let a = 0, b = n - 1;
  while (a < n && Math.abs(mono[a]) < thr) a++;
  while (b > a && Math.abs(mono[b]) < thr) b--;
  a = Math.max(0, a - Math.round(sr * 0.06)); b = Math.min(n - 1, b + Math.round(sr * 0.2));
  const cut = mono.slice(a, b + 1), gain = 0.9 / peak, fade = Math.round(sr * 0.01);
  for (let i = 0; i < cut.length; i++) {
    const edge = Math.min(1, i / fade, (cut.length - 1 - i) / fade);
    cut[i] *= gain * edge;
  }
  // Resample to 24 kHz to keep files small
  const rate = 24000, off = new OfflineAudioContext(1, Math.ceil(cut.length * rate / sr), rate);
  const src = off.createBufferSource(), tmp = off.createBuffer(1, cut.length, sr);
  tmp.getChannelData(0).set(cut); src.buffer = tmp; src.connect(off.destination); src.start();
  const out = (await off.startRendering()).getChannelData(0);
  return wavFile(out, rate);
}
function wavFile(samples, rate) {
  const v = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const text = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  text(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); text(8, 'WAVE'); text(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); text(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return new Blob([v.buffer], { type: 'audio/wav' });
}

// ---------- Back up / restore ----------
const toDataURL = blob => new Promise((ok, fail) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => fail(r.error); r.readAsDataURL(blob); });
function fromDataURL(s) {
  const [head, b64] = s.split(','), bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: (head.match(/^data:([^;,]+)/) || [])[1] || '' });
}
let readyBackup = null;
$('backup').addEventListener('click', async () => {
  // Step 1 builds the file; step 2 (a second tap) saves it, because phones only allow
  // sharing/saving straight after a tap.
  if (readyBackup) return saveBackup(readyBackup);
  $('backupstatus').textContent = 'Preparing backup...';
  const pack = async x => x instanceof Blob ? toDataURL(x) : x;
  const data = { app: 'peekaboo', version: 1, saved: new Date().toISOString(), sets: [] };
  for (const s of SETS) data.sets.push({ name: s.name,
    items: await Promise.all(s.items.map(async i => ({ name: i.name, picture: await pack(i.picture), sound: await pack(i.sound) }))) });
  const date = new Date().toISOString().slice(0, 10);
  readyBackup = new File([JSON.stringify(data)], `peekaboo-backup-${date}.json`, { type: 'application/json' });
  const mb = (readyBackup.size / 1048576).toFixed(1);
  $('backupstatus').textContent = `Backup ready (${mb} MB). Tap "Save backup file" again to save it, e.g. to Files, Google Drive or AirDrop.`;
  $('backup').textContent = '⬇ Save backup file now';
});
async function saveBackup(file) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Peekaboo backup' }); return backupDone(); }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  backupDone();
}
function backupDone() {
  readyBackup = null;
  $('backup').textContent = '⬇ Save backup file';
  $('backupstatus').textContent = 'Backup saved. Keep it somewhere safe.';
}

$('restore').addEventListener('click', () => { $('backuppick').value = ''; $('backuppick').click(); });
$('backuppick').addEventListener('change', async () => {
  const file = $('backuppick').files[0];
  if (!file) return;
  let data;
  try { data = JSON.parse(await file.text()); } catch (e) { data = null; }
  if (!data || data.app !== 'peekaboo' || !Array.isArray(data.sets)) { alert('That file isn\'t a Peekaboo backup.'); return; }
  // Only accept pictures/recordings stored in the file itself, or the game's own drawings
  const picture = p => typeof p === 'string' && /^data:image\//.test(p) ? fromDataURL(p)
                     : typeof p === 'string' && /^pictures\/[\w.-]+$/.test(p) ? p : null;
  const sound = p => typeof p === 'string' && /^data:audio\//.test(p) ? fromDataURL(p)
                   : typeof p === 'string' && /^sounds\/[\w.-]+$/.test(p) ? p : null;
  const sets = data.sets.map(s => ({ id: uid(), name: String(s.name || 'Pictures').slice(0, 40),
    items: (Array.isArray(s.items) ? s.items : []).map(i => ({ id: uid(), name: String(i.name || '').slice(0, 40),
      picture: picture(i.picture), sound: sound(i.sound) })).filter(i => i.name && i.picture) }));
  const photos = sets.reduce((n, s) => n + s.items.length, 0);
  const when = data.saved ? ` from ${new Date(data.saved).toLocaleDateString()}` : '';
  if (!confirm(`Replace everything on this device with the backup${when}? (${sets.length} set(s), ${photos} picture(s))`)) return;
  SETS = sets; selectedSetId = null;
  await saveSets(); renderSetup();
  $('backupstatus').textContent = 'Backup restored.';
});

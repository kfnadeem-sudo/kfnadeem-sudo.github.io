import { CONFIG, isSet } from "./config.js";
import { PROJECTS } from "./projects.js";
import { asset, stillLayer, liveMachine, preloadMachine, loadChapters } from "./machine-loader.js";
import { flipbookLayer } from "./flipbook.js";
import { readAngle, jumpAngle } from "./angle.js";
import { installFilters } from "./look.js";

// Idle auto-turn is off: stepping through 5-degree frames either strobes or (blended) blurs.
// Machines rest crisp at their best angle and turn when dragged or swiped.
const IDLE_TURN = false;

installFilters();

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const mod = (n, m) => ((n % m) + m) % m;
const isPhone = matchMedia("(max-width: 767px)");
const reducedMQ = matchMedia("(prefers-reduced-motion: reduce)");
const canHover = matchMedia("(hover: hover) and (pointer: fine)");
const still = () => reducedMQ.matches;
const SPRING = "cubic-bezier(.16, 1, .3, 1)";
const idle = (fn, t = 1500) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: t }) : setTimeout(fn, 300));

const band = $("band");
const track = $("track");
const info = $("info");
const panel = $("chapter");
const N = PROJECTS.length;
const INTRO = document.documentElement.classList.contains("intro");
let introDone = !INTRO;

// Every machine idles as a flipbook: pre-rendered frames in the final look, so turning costs next to
// nothing. The live 3D machine mounts only when someone interacts with it (hover, drag, click, Explode,
// keyboard), fades in at the same angle, and hands back to the flipbook a few seconds after they stop.
const store = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} },
};

const state = {
  index: 0,      // the project in the middle (or heading there)
  p: 0,          // continuous track position, in items
  v: 0,          // track velocity, items per second
  target: 0,
  moving: false,
  exploded: false,
  chapter: null,
  chapters: [],
  returnFocus: null,
};
let bandVisible = true;

// ================================================================ slides
const slides = PROJECTS.map((p, i) => {
  const slide = document.createElement("div");
  slide.className = "slide";
  slide.id = `slide-${p.id}`;
  slide.setAttribute("role", "group");
  slide.setAttribute("aria-roledescription", "slide");
  slide.setAttribute("aria-label", `${i + 1} of ${N}: ${p.name}`);
  slide.innerHTML = `<div class="machine-box"><div class="machine-host"></div></div><span class="loading-3d" aria-hidden="true">Loading 3D</span>`;
  const box = slide.querySelector(".machine-box");
  if (p.aspect) box.style.setProperty("--ar", p.aspect);
  if (p.fit) box.style.setProperty("--fit", p.fit);
  if (p.tone) slide.dataset.tone = p.tone;
  slide.addEventListener("click", () => {
    if (i !== state.index && !suppressClick) goTo(i);
  });
  const host = slide.querySelector(".machine-host");
  // a mouse over the machine wakes the live one up (hover highlights and name tags need it)
  host.addEventListener("pointerenter", (e) => {
    live.hover = true;
    if (e.pointerType === "mouse" && i === state.index && !state.moving) goLive(i);
  });
  host.addEventListener("pointerleave", () => { live.hover = false; });
  host.addEventListener("pointermove", (e) => { if (e.buttons) noteActivity(); }, { passive: true });
  host.addEventListener("pointerdown", () => { live.down = true; noteActivity(); });
  addEventListener("pointerup", () => { live.down = false; }, { passive: true });
  host.addEventListener("keydown", () => noteActivity());
  track.appendChild(slide);
  return slide;
});
$("ticks").innerHTML = PROJECTS.map(() => "<i></i>").join("");
$("count-all").textContent = pad(N);
const hostOf = (i) => slides[i].querySelector(".machine-host");

// ================================================================ machine slots
// slot: { flip, still, live: {el,h}|null, shown (live on screen), loading, failed, visual: Promise }
const slots = new Map();
function slotOf(i) {
  const id = PROJECTS[i].id;
  if (!slots.has(id)) {
    let resolve;
    const visual = new Promise((r) => (resolve = r));
    slots.set(id, { flip: null, flipFailed: false, still: null, live: null, shown: false, loading: null, failed: false, visual, seen: resolve });
  }
  return slots.get(id);
}
/** The live machine's handle, only while it is the one on screen. */
const liveH = (i) => {
  const s = slots.get(PROJECTS[i].id);
  return s?.live && s.shown ? s.live.h : null;
};
const onStillClick = (i) => () => i === state.index && toggleExplode();

function showFlip(i) {
  const s = slotOf(i);
  if (s.flip || s.flipFailed) return s.flip ? s.flip.ready.catch(() => {}) : showStill(i);
  const p = PROJECTS[i];
  const f = flipbookLayer(p, {
    onTap: () => { if (i === state.index && !suppressClick) toggleExplode(); },
    onDrag: (on) => { live.flipDrag = on; noteActivity(); },
    onInfo: (m) => { if (!p.aspect && m.ar) slides[i].querySelector(".machine-box").style.setProperty("--ar", m.ar); },
  });
  s.flip = f;
  f.el.tabIndex = -1;
  f.el.addEventListener("keydown", (e) => onFlipKey(e, i));
  hostOf(i).prepend(f.el);
  f.ready.then(
    () => { s.seen(); syncTurning(); },
    () => {
      console.info(`[portfolio] ${p.machine}: no flipbook, showing a still`);
      s.flipFailed = true;
      f.destroy();
      s.flip = null;
      if (!s.shown) showStill(i);
    }
  );
  syncFocus();
  return f.ready.catch(() => {});
}

function onFlipKey(e, i) {
  const f = slotOf(i).flip;
  if (!f) return;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    setExploded(true).then(() => $("explode-btn")?.focus({ preventScroll: true }));
  } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    e.preventDefault();
    f.turnBy((e.key === "ArrowLeft" ? 1 : -1) * (e.shiftKey ? 45 : 15));
    noteActivity();
  }
}

function showStill(i) {
  const s = slotOf(i);
  if (s.shown) return Promise.resolve();
  if (!s.still) {
    s.still = stillLayer(PROJECTS[i], onStillClick(i));
    hostOf(i).appendChild(s.still.el);
    if (state.exploded && i === state.index) s.still.setExploded(true);
    s.still.ready.then(s.seen);
  }
  return s.still.ready;
}

/** Mount (or wake) the live machine for slide i and fade it in at the flipbook's angle. */
function goLive(i) {
  const s = slotOf(i);
  if (s.live) { reveal(i); return Promise.resolve(s.live.h); }
  if (s.loading) return s.loading;
  if (s.failed) return Promise.resolve(null);
  const p = PROJECTS[i];
  const layer = document.createElement("div");
  layer.className = "layer layer-live";
  layer.dataset.out = "";
  hostOf(i).appendChild(layer);
  slides[i].setAttribute("data-loading", "");
  s.loading = liveMachine(layer, p)
    .then((h) => {
      s.loading = null;
      slides[i].removeAttribute("data-loading");
      if (i !== state.index) { // moved on while it loaded
        h.destroy?.();
        layer.remove();
        return null;
      }
      s.live = { el: layer, h };
      if (!p.aspect) {
        const vb = layer.querySelector("svg[viewBox]")?.viewBox.baseVal;
        if (vb && vb.width && vb.height) layer.closest(".machine-box").style.setProperty("--ar", vb.width / vb.height);
      }
      reveal(i);
      return h;
    })
    .catch((err) => {
      console.info(`[portfolio] ${p.machine}: 3D model didn't load (${err.message})`);
      slides[i].removeAttribute("data-loading");
      layer.remove();
      s.loading = null;
      s.failed = true;
      if (!s.flip) showStill(i);
      if (state.exploded && i === state.index) { showStill(i); s.still?.setExploded(true); }
      if (i === state.index) centreChanged();
      return null;
    });
  return s.loading;
}

function reveal(i) {
  const s = slotOf(i);
  if (!s.live || i !== state.index) return;
  const { h, el } = s.live;
  noteActivity();
  if (!s.shown) {
    if (s.flip) jumpAngle(h, s.flip.angle);
    s.shown = true;
    h.setPaused(state.moving);
    el.removeAttribute("data-out");
    s.flip?.setTurning(false);
    clearTimeout(s.hideFlip);
    s.hideFlip = setTimeout(() => { if (s.shown && s.flip) s.flip.el.dataset.out = ""; }, 480);
    if (s.still) {
      const old = s.still;
      s.still = null;
      old.el.dataset.out = "";
      setTimeout(() => old.el.remove(), 500);
    }
  }
  if (state.exploded) explodeLive(i, h);
  syncFocus();
  centreChanged();
}

/** Back to the flipbook at the live machine's angle; the live one fades out and pauses. */
function handBack(i, { destroy = false } = {}) {
  const s = slots.get(PROJECTS[i].id);
  if (!s?.live) return;
  const { h, el } = s.live;
  if (s.shown && s.flip) {
    s.flip.setAngle(readAngle(h));
    clearTimeout(s.hideFlip);
    s.flip.el.removeAttribute("data-out");
  }
  s.shown = false;
  el.dataset.out = "";
  if (i === state.index) { hideCallouts(); co.hoverId = null; }
  if (destroy) {
    h.destroy?.();
    el.remove();
    s.live = null;
  } else setTimeout(() => { if (!s.shown) h.setPaused(true); }, 500);
  syncFocus();
  syncTurning();
}

// ---------------------------------------------------------------- live idle watch: hand back to the flipbook
const live = { last: 0, hover: false, down: false, flipDrag: false, playUntil: 0, timer: 0 };
function noteActivity() {
  live.last = performance.now();
  wakeCallouts();
  const s = slots.get(PROJECTS[state.index].id);
  clearTimeout(live.timer);
  live.timer = setTimeout(liveIdleCheck, 700);
}
function liveIdleCheck() {
  const i = state.index;
  const s = slots.get(PROJECTS[i].id);
  if (!s?.live || !s.shown) return;
  const quiet = performance.now() - live.last;
  const playing = !!s.live.h.state?.playing || performance.now() < live.playUntil;
  const busy = state.exploded || state.chapter || state.moving || live.hover || live.down || playing
    || !!hostOf(i).querySelector(":focus-visible"); // a keyboard user working the machine keeps it live
  if (!busy && quiet > 3500 && s.flip) return handBack(i);
  live.timer = setTimeout(liveIdleCheck, busy ? 900 : 400);
}

/** Only the centre flipbook turns, and only when nothing else is going on. */
function syncTurning() {
  PROJECTS.forEach((p, i) => {
    const s = slots.get(p.id);
    if (!s?.flip) return;
    s.flip.setTurning(IDLE_TURN && i === state.index && introDone && !state.moving && !state.exploded && !s.shown
      && !still() && !document.hidden && bandVisible);
  });
}
/** Keyboard focus goes to whichever version of the centre machine is showing. */
function syncFocus() {
  PROJECTS.forEach((p, i) => {
    const s = slots.get(p.id);
    if (s?.flip) {
      s.flip.el.tabIndex = i === state.index && !s.shown ? 0 : -1;
      s.flip.el.setAttribute("role", i === state.index ? "button" : "img");
      s.flip.el.setAttribute("aria-label", `${p.machineLabel || p.name}. Press Enter to take it apart; arrow keys turn it.`);
    }
  });
}

function dropSlot(i) {
  const id = PROJECTS[i].id;
  const s = slots.get(id);
  if (!s || s.loading) return;
  s.live?.h.destroy?.();
  s.live?.el.remove();
  s.flip?.destroy();
  s.still?.el.remove();
  slots.delete(id);
}

function applyPause() {
  PROJECTS.forEach((p, i) => {
    const s = slots.get(p.id);
    if (s?.live) s.live.h.setPaused(state.moving || i !== state.index || !s.shown);
  });
  syncTurning();
}

/** Flipbooks for the centre and its neighbours; everything further away is freed. */
function arrange() {
  PROJECTS.forEach((p, i) => {
    const o = Math.abs(wrapOffset(i - state.index));
    if (o <= 1) showFlip(i);
    else dropSlot(i);
  });
  // computers with a mouse fetch (not run) the centre's 3D module ahead, so hover is instant
  if (canHover.matches) idle(() => preloadMachine(PROJECTS[state.index]));
  syncTurning();
}

// ================================================================ track (spring physics, transform/opacity only)
const wrapOffset = (o) => {
  o = mod(o + N / 2, N) - N / 2;
  return o;
};
const spacing = () => (isPhone.matches ? band.clientWidth * 0.86 : Math.min(band.clientWidth * 0.47, 760));

function renderTrack() {
  const sp = spacing();
  slides.forEach((s, i) => {
    const o = wrapOffset(i - state.p);
    const a = Math.abs(o);
    // neighbours sit small and faint so the centre machine owns the stage
    const scale = 1 - 0.58 * Math.min(a, 1);
    const op = a <= 1 ? 1 - 0.7 * a : Math.max(0, 0.3 * (1 - (a - 1) / 0.45));
    s.style.transform = `translate3d(-50%, -50%, 0) translate3d(${(o * sp).toFixed(2)}px, 0, 0) scale(${scale.toFixed(4)})`;
    s.style.opacity = op.toFixed(3);
    s.style.visibility = op < 0.01 ? "hidden" : "";
  });
}

let raf = 0;
let lastT = 0;
function step(t) {
  const dt = Math.min(lastT ? (t - lastT) / 1000 : 1 / 60, 1 / 30);
  lastT = t;
  if (still()) {
    state.p = state.target;
    state.v = 0;
  } else {
    const k = 210;
    const c = 2 * Math.sqrt(k) * 0.95;
    for (let n = 0; n < 4; n++) {
      const h = dt / 4;
      state.v += (-k * (state.p - state.target) - c * state.v) * h;
      state.p += state.v * h;
    }
  }
  renderTrack();
  if (Math.abs(state.p - state.target) < 0.0006 && Math.abs(state.v) < 0.003) {
    state.p = state.target;
    state.v = 0;
    renderTrack();
    raf = 0;
    lastT = 0;
    settle();
    return;
  }
  raf = requestAnimationFrame(step);
}
function animateTo(target) {
  state.target = target;
  setMoving(true);
  if (!raf) {
    lastT = 0;
    raf = requestAnimationFrame(step);
  }
}
function setMoving(on) {
  if (state.moving === on) return;
  state.moving = on;
  applyPause();
  if (on) hideCallouts();
}
function settle() {
  setMoving(false);
  arrange();
  centreChanged();
}

/** Point the UI at project i (the track animates separately). */
function setIndex(i, { updateHash = true } = {}) {
  if (i === state.index) return;
  const dir = Math.sign(wrapOffset(i - state.index)) || 1;
  resetCallouts();
  handBack(state.index, { destroy: true }); // the old centre goes back to its flipbook and frees its 3D
  state.index = i;
  slides.forEach((s, k) => {
    const centre = k === i;
    s.classList.toggle("is-center", centre);
    s.inert = !centre;
    if (centre) s.removeAttribute("aria-hidden");
    else s.setAttribute("aria-hidden", "true");
  });
  updateChrome();
  swapInfo(PROJECTS[i], dir);
  showFlip(i);
  syncFocus();
  if (updateHash) history.replaceState(null, "", `#${PROJECTS[i].id}`);
  $("announce").textContent = `Project ${i + 1} of ${N}: ${PROJECTS[i].name}`;
}

function updateChrome() {
  [...$("ticks").children].forEach((t, k) => t.toggleAttribute("data-on", k === state.index));
  $("count-now").textContent = pad(state.index + 1);
  const prev = PROJECTS[mod(state.index - 1, N)].name;
  const next = PROJECTS[mod(state.index + 1, N)].name;
  $("prev-label").textContent = `Previous: ${prev}`;
  $("next-label").textContent = `Next: ${next}`;
}

async function goBy(d) {
  if (state.exploded) await setExploded(false);
  const target = Math.round(state.target) + d;
  setIndex(mod(target, N));
  animateTo(target);
}
function goTo(i, opts) {
  const d = wrapOffset(i - mod(Math.round(state.target), N));
  if (d === 0) return;
  if (opts?.instant) {
    setIndex(i, opts);
    state.p = state.target = Math.round(state.target) + d;
    renderTrack();
    settle();
    return;
  }
  goBy(d);
}

// ---------------------------------------------------------------- drag / swipe (1:1, momentum, snap)
let drag = null;
let suppressClick = false;
function dragSource(el) {
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || state.exploded) return;
    if (e.target.closest(".slide.is-center .layer, .hot, button, a, .chapter")) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, p0: state.p, lastX: e.clientX, lastT: performance.now(), vel: 0, active: false, el };
  });
  el.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.active) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(e.clientY - drag.y)) return;
      drag.active = true;
      try { el.setPointerCapture(e.pointerId); } catch {}
      band.setAttribute("data-dragging", "");
      if (raf) { cancelAnimationFrame(raf); raf = 0; lastT = 0; }
      drag.p0 = state.p;
      drag.x = e.clientX;
      setMoving(true);
    }
    const sp = spacing();
    const now = performance.now();
    const dtt = Math.max(0.008, (now - drag.lastT) / 1000);
    const inst = -(e.clientX - drag.lastX) / sp / dtt;
    drag.vel = drag.vel * 0.7 + inst * 0.3;
    drag.lastX = e.clientX;
    drag.lastT = now;
    state.p = drag.p0 - (e.clientX - drag.x) / sp;
    renderTrack();
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.active) return;
    band.removeAttribute("data-dragging");
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 0);
    const vel = performance.now() - d.lastT > 80 ? 0 : d.vel;
    const base = Math.round(d.p0);
    const target = Math.max(base - 1, Math.min(base + 1, Math.round(state.p + vel * 0.25)));
    state.v = vel;
    setIndex(mod(target, N));
    animateTo(target);
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}
dragSource(band);
dragSource(info);

$("prev").addEventListener("click", () => goBy(-1));
$("next").addEventListener("click", () => goBy(1));

// ================================================================ info block
function infoHTML(p) {
  const awards = p.awards?.length
    ? `<div class="outcome"><span class="tag">Winner</span><ul>${p.awards.map((a, k) => `${k ? '<li class="outcome-sep" aria-hidden="true">/</li>' : ""}<li>${esc(a)}</li>`).join("")}</ul>${p.awardNote ? `<span class="outcome-sep" aria-hidden="true">/</span><span>${esc(p.awardNote)}</span>` : ""}</div>`
    : p.outcome ? `<div class="outcome"><span>${esc(p.outcome)}</span></div>` : "";
  const links = (p.links || []).map((l) => {
    const href = CONFIG[l.href] ?? l.href;
    return isSet(href)
      ? `<a class="pill" href="${esc(href)}" target="_blank" rel="noopener">${esc(l.label)}<span class="sr-only"> (opens in a new tab)</span></a>`
      : `<span class="pill pill-ghost" title="Add this link in js/config.js">${esc(l.label)} <span class="ph">${esc(href)}</span></span>`;
  }).join("");
  return `<div class="info-inner">
      <div class="info-main">
        <h3>${esc(p.name)}</h3>
        <p class="info-line">${esc(p.line)}</p>
        ${awards}
      </div>
      <div class="info-side">
        <ul class="chips" aria-label="Tech">${p.tech.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        ${p.credits ? `<p class="credits">${esc(p.credits)}</p>` : ""}
        <div class="actions">
          <span id="extras" class="actions"></span>
          ${links}
          <button class="pill pill-primary" type="button" id="explode-btn" aria-pressed="false" aria-label="Explode" aria-controls="slide-${p.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><path d="M9 9l-5-5M15 9l5-5M9 15l-5 5M15 15l5 5"/></svg>
            <span class="morph" aria-hidden="true"><span>Explode</span><span>Reassemble</span></span>
          </button>
        </div>
      </div>
    </div>
    <p class="note" id="fallback-note" hidden>Showing a still. The 3D model didn't load.</p>`;
}
function renderInfo(p) {
  info.innerHTML = infoHTML(p);
  $("explode-btn").addEventListener("click", toggleExplode);
  syncExplodeUi();
  refreshExtras();
}
let infoAnim = null;
function swapInfo(p, dir) {
  const inner = info.querySelector(".info-inner");
  if (!inner || still()) return renderInfo(p);
  infoAnim?.cancel();
  infoAnim = inner.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translate3d(${-dir * 18}px, 0, 0)` }], { duration: 140, easing: "ease-in", fill: "forwards" });
  infoAnim.onfinish = () => {
    renderInfo(p);
    info.querySelector(".info-inner").animate([{ opacity: 0, transform: `translate3d(${dir * 24}px, 0, 0)` }, { opacity: 1, transform: "none" }], { duration: 420, easing: SPRING });
  };
}

/** Machine-specific extras (e.g. "Play a round"). They wake the live machine when pressed. */
function refreshExtras() {
  const p = PROJECTS[state.index];
  const s = slots.get(p.id);
  const note = $("fallback-note");
  if (note) note.hidden = !s?.failed;
  const box = $("extras");
  if (!box) return;
  const extras = s?.failed ? [] : p.extras || [];
  box.innerHTML = extras.map((x, k) => `<button class="pill pill-quiet" type="button" data-k="${k}">${esc(x.label)}</button>`).join("");
  box.querySelectorAll("button").forEach((b) => b.addEventListener("click", async () => {
    const i = state.index;
    if (state.exploded) await setExploded(false);
    const h = await goLive(i);
    const fn = extras[b.dataset.k].call;
    if (!h || i !== state.index || typeof h[fn] !== "function") return;
    live.playUntil = performance.now() + 14000; // keep it live (and calm) while the demo plays
    h[fn]();
    noteActivity();
  }));
}

// one soft hint by the stage; it fades for good after the first explode
let explodedOnce = store.get("kn-exploded") === "1";
function syncHint() {
  const el = $("hint");
  el.textContent = canHover.matches ? "Drag the machine to turn it. Click it to take it apart." : "Swipe the machine to turn it. Tap it to take it apart.";
  el.style.opacity = explodedOnce ? "0" : "";
  el.toggleAttribute("aria-hidden", explodedOnce);
}
syncHint();

function syncExplodeUi() {
  const btn = $("explode-btn");
  if (btn) btn.setAttribute("aria-pressed", String(state.exploded));
  band.toggleAttribute("data-exploded", state.exploded);
}

// ================================================================ callouts
// Assembled: the drawing stays clean; a name tag (with a hairline leader) follows the hovered part.
// Exploded: numbered labels sit in columns OUTSIDE the machine's silhouette, each joined to its part
// by a hairline leader that ends in a dot. Phones (or no room / no parts()): a strip of labels under the machine.
const co = {
  i: -1, mode: "off", list: [], labels: new Map(), widths: new Map(), pos: new Map(),
  raf: 0, frame: 0, bbox: null, hoverId: null, timer: 0, forceUntil: 0,
};
const calloutsEl = $("callouts");
const leadersEl = $("leaders");
const labelsEl = $("labels");
const stripEl = $("strip");
const canCallout = (i) => typeof liveH(i)?.parts === "function";

async function buildCallouts(i) {
  const list = await loadChapters(PROJECTS[i].machine);
  if (i !== state.index) return false;
  if (co.i === i && co.list === list) return true;
  co.i = i;
  co.list = list;
  co.labels.clear();
  co.widths.clear();
  co.pos.clear();
  labelsEl.innerHTML = "";
  leadersEl.innerHTML = "";
  stripEl.innerHTML = "";
  list.forEach((c, k) => {
    const mk = (cls) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = cls;
      b.dataset.part = c.id;
      b.innerHTML = `<span class="in"><b>${pad(k + 1)}</b><span class="nm">${esc(c.title)}</span></span>`;
      b.addEventListener("pointerenter", () => liveH(state.index)?.hover?.(c.id));
      b.addEventListener("pointerleave", () => liveH(state.index)?.hover?.(null));
      b.addEventListener("focus", () => liveH(state.index)?.hover?.(c.id));
      b.addEventListener("blur", () => liveH(state.index)?.hover?.(null));
      b.addEventListener("click", (e) => { e.stopPropagation(); openChapter(c.id, { focus: true, from: b }); });
      return b;
    };
    const label = mk("callout");
    label.tabIndex = -1; // focusable only while the exploded columns are showing
    label.style.setProperty("--d", `${(k * 0.045).toFixed(3)}s`);
    labelsEl.appendChild(label);
    stripEl.appendChild(mk("strip-btn"));
    leadersEl.insertAdjacentHTML("beforeend", `<g data-part="${esc(c.id)}"><polyline class="leader" points=""/><circle class="leader-dot" r="2.6" cx="-9" cy="-9"/></g>`);
    co.labels.set(c.id, { el: label, g: leadersEl.lastElementChild });
  });
  return true;
}

/** The machine's silhouette in band px (union of its live SVG content), refreshed every so often. */
function silhouette(layer, bandR) {
  const svgs = [...layer.querySelectorAll("svg")];
  const svg = svgs.find((s) => s.matches("[data-live], .iso-live")) || svgs.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
  if (!svg) return null;
  try {
    const b = svg.getBBox();
    const m = svg.getScreenCTM();
    if (!m || !b.width) return null;
    const pt = svg.createSVGPoint();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]) {
      pt.x = x; pt.y = y;
      const q = pt.matrixTransform(m);
      x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
    }
    return { l: x0 - bandR.left, r: x1 - bandR.left, t: y0 - bandR.top, b: y1 - bandR.top };
  } catch { return null; }
}

function layoutCallouts() {
  const h = liveH(co.i);
  const layer = slots.get(PROJECTS[co.i]?.id)?.live?.el;
  if (!h || !layer || typeof h.parts !== "function") return;
  const bandR = band.getBoundingClientRect();
  const lr = layer.getBoundingClientRect();
  co.frame++;
  if (!co.bbox || co.frame % 20 === 0 || performance.now() < co.forceUntil) co.bbox = silhouette(layer, bandR) || co.bbox;
  const bb = co.bbox;
  if (!bb) return;
  const all = (h.parts() || []).map((p) => ({ id: p.id, x: lr.left - bandR.left + p.x, y: lr.top - bandR.top + p.y })).filter((p) => co.labels.has(p.id));
  const parts = co.mode === "tag" ? all.filter((p) => p.id === co.hoverId) : all;
  const W = bandR.width;
  const H = bandR.height;
  const limitR = band.hasAttribute("data-panel") && !isPhone.matches ? W - panel.offsetWidth : W;
  const GAP = 28, EDGE = 16, STEP = 38, MINROOM = 130;
  const leftX = Math.max(EDGE, bb.l - GAP);
  const rightX = Math.min(limitR - EDGE, bb.r + GAP);
  const roomL = leftX - EDGE;
  const roomR = limitR - EDGE - rightX;
  if (co.mode === "side" && roomL < MINROOM && roomR < MINROOM) return setCalloutMode("strip");
  const mid = (bb.l + bb.r) / 2;
  const sides = { L: [], R: [] };
  const widthOf = (id) => {
    let w = co.widths.get(id);
    if (!w) {
      const el = co.labels.get(id).el;
      el.style.maxWidth = "none";
      w = el.offsetWidth || 160;
      co.widths.set(id, w);
    }
    return w;
  };
  const cap = Math.max(1, Math.floor((H - 2 * EDGE) / STEP));
  for (const p of parts) {
    let s = p.x < mid ? "L" : "R";
    if (s === "L" && roomL < MINROOM) s = "R";
    if (s === "R" && roomR < MINROOM) s = "L";
    // a label that would be cut short goes to the other side when it fits there
    const w = widthOf(p.id);
    if (s === "L" && w > roomL && roomR >= w && sides.R.length < cap) s = "R";
    else if (s === "R" && w > roomR && roomL >= w && sides.L.length < cap) s = "L";
    sides[s].push(p);
  }
  for (const [s, arr] of Object.entries(sides)) {
    arr.sort((a, b) => a.y - b.y);
    const ys = arr.map((p) => p.y);
    const top = EDGE + 16, bottom = H - EDGE - 16;
    for (let k = 0; k < ys.length; k++) ys[k] = Math.max(ys[k], top, k ? ys[k - 1] + STEP : -Infinity);
    for (let k = ys.length - 1; k >= 0; k--) ys[k] = Math.min(ys[k], bottom, k < ys.length - 1 ? ys[k + 1] - STEP : Infinity);
    const room = s === "L" ? roomL : roomR;
    arr.forEach((p, k) => {
      const item = co.labels.get(p.id);
      const w = widthOf(p.id);
      const lw = Math.min(w, room);
      item.el.style.maxWidth = `${Math.max(80, room)}px`;
      const prev = co.pos.get(p.id);
      const ty = prev && prev.s === s ? prev.y + (ys[k] - prev.y) * 0.4 : ys[k];
      co.pos.set(p.id, { y: ty, s });
      const lx = s === "L" ? leftX - lw : rightX;
      item.el.style.transform = `translate3d(${lx.toFixed(1)}px, ${(ty - 16).toFixed(1)}px, 0)`;
      item.el.dataset.side = s;
      const ex = s === "L" ? leftX + 4 : rightX - 4;
      const elbow = s === "L" ? ex + 10 : ex - 10;
      item.g.firstElementChild.setAttribute("points", `${ex.toFixed(1)},${ty.toFixed(1)} ${elbow.toFixed(1)},${ty.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`);
      const dot = item.g.lastElementChild;
      dot.setAttribute("cx", p.x.toFixed(1));
      dot.setAttribute("cy", p.y.toFixed(1));
    });
  }
}
// The leaders follow the parts every frame while anything moves, then the loop parks itself once the
// machine has been still for ~0.75 s (no per-frame layout reads at rest). Activity wakes it again.
function calloutLoop() {
  co.raf = 0;
  if (co.mode !== "side" && co.mode !== "tag") return;
  layoutCallouts();
  const sig = [...co.pos.values()].reduce((a, p) => a + p.y, 0) + (co.bbox ? co.bbox.l + co.bbox.t * 3 : 0);
  co.still = Math.abs(sig - (co.sig ?? NaN)) < 0.05 ? (co.still || 0) + 1 : 0;
  co.sig = sig;
  if (co.still > 45 && performance.now() > co.forceUntil && !live.down) return;
  co.raf = requestAnimationFrame(calloutLoop);
}
function wakeCallouts() {
  if ((co.mode === "side" || co.mode === "tag") && !co.raf) { co.still = 0; co.raf = requestAnimationFrame(calloutLoop); }
}
function setCalloutMode(mode) {
  co.mode = mode;
  calloutsEl.dataset.mode = mode;
  calloutsEl.toggleAttribute("data-on", mode === "side" || mode === "tag");
  band.toggleAttribute("data-strip", mode === "strip");
  labelsEl.querySelectorAll(".callout").forEach((b) => (b.tabIndex = mode === "side" ? 0 : -1));
  if ((mode === "side" || mode === "tag") && !co.raf) { co.forceUntil = performance.now() + 900; co.raf = requestAnimationFrame(calloutLoop); }
  if (mode !== "side" && mode !== "tag" && co.raf) { cancelAnimationFrame(co.raf); co.raf = 0; }
}
function hideCallouts() {
  clearTimeout(co.timer);
  if (co.mode !== "off") setCalloutMode("off");
}
function resetCallouts() {
  hideCallouts();
  co.i = -1;
  co.list = [];
  co.hoverId = null;
}
/** Show the exploded callouts once the explode has settled (after `delay` ms). */
function scheduleCallouts(delay = 0) {
  clearTimeout(co.timer);
  if (!state.exploded) return;
  co.timer = setTimeout(async () => {
    if (!state.exploded || state.moving) return;
    await buildCallouts(state.index);
    if (!state.exploded || state.moving) return;
    const side = canCallout(state.index) && !isPhone.matches;
    co.bbox = null;
    setCalloutMode(side ? "side" : "strip");
    markCurrent();
  }, still() ? 0 : delay);
}
function markHot() {
  const id = co.hoverId;
  for (const el of labelsEl.children) el.toggleAttribute("data-hot", el.dataset.part === id);
  for (const g of leadersEl.children) g.toggleAttribute("data-hot", g.dataset.part === id);
}
function markCurrent() {
  const id = state.chapter;
  for (const el of [...labelsEl.children, ...stripEl.children]) (el.dataset.part === id ? el.setAttribute("aria-current", "true") : el.removeAttribute("aria-current"));
  for (const g of leadersEl.children) g.toggleAttribute("data-current", g.dataset.part === id);
}

// a part under the pointer: name tag when assembled, emphasis on its label when exploded
band.addEventListener("anatomy:hover", async (e) => {
  if (!e.target.closest(".slide.is-center")) return;
  const id = e.detail?.id ?? null;
  co.hoverId = id;
  markHot();
  if (state.exploded || state.moving || isPhone.matches || !liveH(state.index)) return;
  if (id) {
    await buildCallouts(state.index);
    if (co.hoverId !== id || state.exploded) return;
    markHot();
    co.pos.delete(id);
    if (co.mode !== "tag") { co.bbox = null; setCalloutMode("tag"); }
    else wakeCallouts();
  } else if (co.mode === "tag") setCalloutMode("off");
});

/** Called when the centre item settles or its machine changes (flipbook to live). */
function centreChanged() {
  refreshExtras();
  if (!state.moving && state.exploded) scheduleCallouts(950);
}

// ================================================================ explode
/** Take the live machine apart and turn it to the angle that shows every part best. */
function explodeLive(i, h) {
  const p = PROJECTS[i];
  if (!h.state?.exploded) h.explode(true);
  if (typeof h.setAngle === "function" && p.explodeAngle != null) {
    const cur = readAngle(h);
    h.setAngle(cur + mod(p.explodeAngle - cur + 180, 360) - 180);
  }
}

async function setExploded(on, { fromMachine = false } = {}) {
  on = !!on;
  if (on === state.exploded) return;
  state.exploded = on;
  const i = state.index;
  const p = PROJECTS[i];
  hideCallouts();
  noteActivity();
  syncTurning();
  if (on && !explodedOnce) { explodedOnce = true; store.set("kn-exploded", "1"); syncHint(); }
  if (on) state.chapters = await loadChapters(p.machine);
  else closeChapter({ restore: false, deselect: false });
  const s = slotOf(i);
  if (on) {
    if (s.failed) { showStill(i); s.still?.setExploded(true); }
    else if (!fromMachine) {
      const h = await goLive(i); // reveal() explodes it once it is on screen
      if (h && state.exploded && state.index === i) explodeLive(i, h);
    }
  } else {
    if (!fromMachine) liveH(i)?.explode(false);
    s.still?.setExploded(false);
  }
  syncExplodeUi();
  if (on) scheduleCallouts(950);
}
const toggleExplode = () => setExploded(!state.exploded);

band.addEventListener("anatomy:explode", (e) => {
  if (!e.target.closest(".slide.is-center")) return;
  if (!!e.detail?.on !== state.exploded) setExploded(e.detail.on, { fromMachine: true });
});
band.addEventListener("anatomy:part", (e) => {
  if (!e.target.closest(".slide.is-center")) return;
  if (e.detail?.id) openChapter(e.detail.id, { select: false, focus: false });
});

// ================================================================ zoom to the chosen part
// While a chapter is open the machine glides in on its part: translate so the part sits in the middle of
// the free stage, then scale. Fractions of the live layer's rect are used, so the current transform
// (which scales that rect too) doesn't matter.
const ZOOM = { desktop: 1.6, phone: 1.9 };
let zoomTimer = 0;
function zoomTo(id, delay = 0) {
  clearTimeout(zoomTimer);
  const p = PROJECTS[state.index];
  const box = slots.get(p?.id)?.el?.querySelector?.(".machine-box") || document.querySelector(".slide.is-center .machine-box");
  const clear = () => { band.removeAttribute("data-zoom"); box?.style.removeProperty("--zx"); box?.style.removeProperty("--zy"); box?.style.removeProperty("--zs"); };
  if (!id || !box || still()) return clear();
  zoomTimer = setTimeout(() => {
    const h = liveH(state.index);
    const layer = slots.get(p.id)?.live?.el;
    const part = h?.parts?.()?.find((q) => q.id === id);
    if (!layer || !part || state.chapter !== id) return;
    const lr = layer.getBoundingClientRect();
    if (!lr.width || !lr.height) return;
    const z = isPhone.matches ? ZOOM.phone : ZOOM.desktop;
    const base = parseFloat(getComputedStyle(box).getPropertyValue("--fit")) || 1;
    const S = base * (band.hasAttribute("data-strip") ? (isPhone.matches ? 0.72 : 0.82) : 0.86) * z;
    const dx = (part.x / lr.width - 0.5) * box.offsetWidth;
    const dy = (part.y / lr.height - 0.5) * box.offsetHeight;
    let zx = -S * dx, zy = -S * dy; // desktop: the panel shift already centres the free area
    if (isPhone.matches) {
      // phone: the sheet covers the lower part of the screen, so aim for the middle of what's left above it.
      // The base rule lifts the box by 24% of its height; the box itself is centred in the band.
      const br = band.getBoundingClientRect();
      const sheetTop = Math.min(br.bottom, innerHeight - panel.offsetHeight);
      const targetY = (Math.max(br.top, 0) + sheetTop) / 2 - (br.top + br.height / 2);
      zy = targetY + 0.24 * box.offsetHeight - S * dy;
    }
    box.style.setProperty("--zs", z);
    box.style.setProperty("--zx", Math.round(zx) + "px");
    box.style.setProperty("--zy", Math.round(zy) + "px");
    band.setAttribute("data-zoom", "");
  }, delay);
}

// ================================================================ chapter panel
async function openChapter(id, { select = true, focus = true, from = null } = {}) {
  const p = PROJECTS[state.index];
  const settle = state.exploded ? 0 : 750; // let the parts finish flying out before measuring
  if (!state.exploded) await setExploded(true);
  if (!state.chapters.length) state.chapters = await loadChapters(p.machine);
  const list = state.chapters;
  const k = list.findIndex((c) => c.id === id);
  if (k < 0) return;
  const c = list[k];
  const wasOpen = !!state.chapter;
  if (!wasOpen) state.returnFocus = from || document.activeElement;
  state.chapter = id;
  if (select) liveH(state.index)?.select(id);
  noteActivity();

  const fill = () => {
    $("chapter-num").textContent = `Part ${pad(k + 1)} of ${pad(list.length)}`;
    $("chapter-title").textContent = c.title;
    $("chapter-body").textContent = c.body;
    $("chapter-tech").innerHTML = (c.tech || []).map((t) => `<li>${esc(t)}</li>`).join("");
    const shot = $("chapter-shot");
    shot.hidden = !c.image;
    if (c.image) {
      $("chapter-img").src = asset(p.machine, c.image);
      $("chapter-img").alt = c.imageAlt || "";
    }
    setNavBtn($("chapter-prev"), list[mod(k - 1, list.length)], "prev");
    setNavBtn($("chapter-next"), list[mod(k + 1, list.length)], "next");
    $("chapter-scroll").scrollTop = 0;
  };
  const scroller = $("chapter-scroll");
  if (wasOpen && !still()) {
    scroller.setAttribute("data-swap", "");
    setTimeout(() => { fill(); requestAnimationFrame(() => scroller.removeAttribute("data-swap")); }, 120);
  } else fill();
  panel.hidden = false;
  band.setAttribute("data-panel", "");
  markCurrent();
  co.forceUntil = performance.now() + 900; // the stage is making room: keep the leaders glued
  if (focus) setTimeout(() => $("chapter-title").focus({ preventScroll: true }), wasOpen ? 140 : 60);
  wakeCallouts();
  zoomTo(id, settle);
}

const ARROW = {
  prev: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
};
function setNavBtn(btn, c, dir) {
  btn.dataset.part = c.id;
  btn.innerHTML = dir === "prev"
    ? `${ARROW.prev}<span><span class="sr-only">Previous part: </span>${esc(c.title)}</span>`
    : `<span><span class="sr-only">Next part: </span>${esc(c.title)}</span>${ARROW.next}`;
}
$("chapter-prev").addEventListener("click", (e) => openChapter(e.currentTarget.dataset.part, { focus: false }));
$("chapter-next").addEventListener("click", (e) => openChapter(e.currentTarget.dataset.part, { focus: false }));
$("chapter-close").addEventListener("click", () => closeChapter());

function closeChapter({ restore = true, deselect = true } = {}) {
  if (!state.chapter) return;
  state.chapter = null;
  panel.hidden = true;
  band.removeAttribute("data-panel");
  zoomTo(null);
  if (deselect) liveH(state.index)?.select(null);
  markCurrent();
  co.forceUntil = performance.now() + 900;
  wakeCallouts();
  if (restore) {
    const back = state.returnFocus && document.contains(state.returnFocus) ? state.returnFocus : $("explode-btn");
    back?.focus({ preventScroll: true });
  }
  state.returnFocus = null;
}

// ================================================================ keyboard
document.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  const t = e.target;
  if (t.closest?.("input, textarea, select, [contenteditable]")) return;
  if (e.key === "Escape") {
    if (state.chapter || state.exploded) {
      e.preventDefault();
      setExploded(false);
      $("explode-btn")?.focus({ preventScroll: true });
    }
    return;
  }
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  if (t.closest?.(".machine-host")) return; // arrows turn the machine while it has focus
  if (state.exploded) return;
  const r = $("work").getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  e.preventDefault();
  goBy(e.key === "ArrowLeft" ? -1 : 1);
});

// ================================================================ deep links
const fromHash = () => {
  const id = decodeURIComponent(location.hash.slice(1)).toLowerCase();
  return PROJECTS.findIndex((p) => p.id.toLowerCase() === id);
};
addEventListener("hashchange", () => {
  const i = fromHash();
  if (i >= 0) {
    goTo(i, { updateHash: false });
    $("work").scrollIntoView({ block: "start" });
  }
});

// ================================================================ about + contact + header
function fillContact() {
  const values = { email: CONFIG.email, linkedin: CONFIG.linkedin, github: CONFIG.github };
  for (const [key, v] of Object.entries(values)) {
    const a = document.querySelector(`[data-link="${key}"]`);
    const out = document.querySelector(`[data-value="${key}"]`);
    if (!a || !out) continue;
    if (isSet(v)) {
      a.href = key === "email" ? `mailto:${v}` : v;
      if (key !== "email") { a.target = "_blank"; a.rel = "noopener"; }
      out.textContent = key === "email" ? v : v.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
    } else {
      a.removeAttribute("href");
      out.innerHTML = `<span class="ph">${esc(v)}</span>`;
    }
  }
}
function fillPhoto() {
  const fig = $("photo");
  const img = $("photo-img");
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:";
  img.onerror = () => (fig.dataset.state = local ? "placeholder" : "missing");
  img.onload = () => (fig.dataset.state = "ok");
  img.src = CONFIG.photo;
}
function navSpy() {
  const links = [...document.querySelectorAll("[data-nav]")];
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      links.forEach((l) => (l.dataset.nav === en.target.id ? l.setAttribute("aria-current", "true") : l.removeAttribute("aria-current")));
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  ["work", "about", "contact"].forEach((id) => io.observe($(id)));
  const top = $("top");
  const onScroll = () => top.toggleAttribute("data-scrolled", scrollY > 4);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}
// callouts and the idle turn only run while the stage is on screen and the tab is showing
new IntersectionObserver((entries) => {
  bandVisible = entries[entries.length - 1].isIntersecting;
  syncTurning();
  if (!bandVisible) hideCallouts();
  else if (state.exploded && !state.moving) scheduleCallouts(0);
}).observe(band);
document.addEventListener("visibilitychange", syncTurning);
reducedMQ.addEventListener?.("change", syncTurning);
addEventListener("resize", () => {
  renderTrack();
  co.widths.clear();
  co.bbox = null;
  co.forceUntil = performance.now() + 300;
  wakeCallouts();
  if (state.exploded && co.mode !== "off") scheduleCallouts(60); // reflow (side columns or strip)
}, { passive: true });

// ================================================================ start
const startAt = fromHash();
state.index = startAt >= 0 ? startAt : 0;
state.p = state.target = state.index;
slides.forEach((s, k) => {
  s.classList.toggle("is-center", k === state.index);
  s.inert = k !== state.index;
  if (k !== state.index) s.setAttribute("aria-hidden", "true");
});
renderTrack();
updateChrome();
renderInfo(PROJECTS[state.index]);
fillContact();
fillPhoto();
navSpy();
if (startAt >= 0) requestAnimationFrame(() => $("work").scrollIntoView({ block: "start", behavior: "instant" }));

// intro: page fades up, the centre machine rises into place, then the text
function intro() {
  const box = hostOf(state.index);
  const inner = info.querySelector(".info-inner");
  const neighbours = slides.filter((s, k) => k !== state.index).map((s) => s.querySelector(".machine-host"));
  if (!INTRO) return Promise.resolve();
  store.set("kn-intro", "1");
  [box, inner, ...neighbours].forEach((el) => el && (el.style.opacity = "0"));
  const go = () => {
    const ease = { easing: SPRING, fill: "backwards" };
    box.style.opacity = "";
    box.animate([{ opacity: 0, transform: "translate3d(0, 34px, 0) scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 1200, ...ease });
    neighbours.forEach((el, k) => { el.style.opacity = ""; el.animate([{ opacity: 0, transform: "translate3d(0, 20px, 0)" }, { opacity: 1, transform: "none" }], { duration: 1000, delay: 260 + k * 80, ...ease }); });
    if (inner) { inner.style.opacity = ""; inner.animate([{ opacity: 0, transform: "translate3d(0, 16px, 0)" }, { opacity: 1, transform: "none" }], { duration: 800, delay: 380, ...ease }); }
  };
  return Promise.race([slotOf(state.index).visual, new Promise((r) => setTimeout(r, 1600))]).then(go);
}

// the flipbook starts after first paint so the page appears straight away
requestAnimationFrame(() => setTimeout(() => {
  showFlip(state.index);
  intro().then(() => setTimeout(() => { introDone = true; arrange(); centreChanged(); }, INTRO ? 1000 : 0));
}, 0));

// test hook: ?debug exposes internals for the test scripts
if (new URLSearchParams(location.search).has("debug")) window.__kn = { state, liveH, co, setCalloutMode, slots, goLive, handBack, PROJECTS, get introDone() { return introDone; }, get bandVisible() { return bandVisible; } };

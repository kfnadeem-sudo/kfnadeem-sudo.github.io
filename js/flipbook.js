// The idle machine: pre-rendered frames (tools/make-flipbook.mjs), one every 5 degrees, already in the
// final look (tone map + glow baked in). Turning = swapping two stacked <img>s and cross-fading the top one,
// so the page does almost no work while a machine just sits there turning. The live 3D machine is mounted
// only when someone interacts (see main.js), at the same angle, and handed back here when they stop.
import { asset } from "./machine-loader.js";

const mod = (n, m) => ((n % m) + m) % m;
let avifOk;
/** Does this browser decode AVIF? (one tiny test image, cached) */
function avifSupported() {
  avifOk ??= new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img.width > 0);
    img.onerror = () => res(false);
    img.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=";
  });
  return avifOk;
}

const manifests = new Map();
export function loadManifest(machine) {
  if (!manifests.has(machine)) {
    manifests.set(machine, fetch(asset(machine, "frames/flipbook.json")).then((r) => (r.ok ? r.json() : Promise.reject(new Error("no flipbook")))));
  }
  return manifests.get(machine);
}

/**
 * A flipbook layer for one project. Returns
 * { el, ready, angle, setAngle(deg), turnBy(deg), setTurning(on), destroy() }.
 * `ready` resolves once the first frame is on screen (rejects if there are no frames).
 * opts.onTap() fires on a tap/click that wasn't a drag; opts.onDrag(on) while a drag-to-turn runs.
 */
export function flipbookLayer(project, opts = {}) {
  const el = document.createElement("div");
  el.className = "layer layer-flip";
  const a = document.createElement("img");
  const b = document.createElement("img");
  for (const img of [a, b]) {
    img.alt = "";
    img.draggable = false;
    img.decoding = "async";
    el.appendChild(img);
  }
  a.className = "flip-a";
  b.className = "flip-b";
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", `The ${project.machineLabel || project.name}, turning slowly`);

  let N = 72, step = 5, urls = [], loaded = [], shown = [-1, -1];
  let angle = 0, turning = false, raf = 0, last = 0, dead = false, speed = 9;
  let resolveReady, rejectReady;
  const ready = new Promise((r, j) => { resolveReady = r; rejectReady = j; });

  const nearestLoaded = (k, dir) => {
    for (let d = 0; d < N; d++) {
      const j = mod(k + d * dir, N);
      if (loaded[j]) return j;
    }
    return -1;
  };
  function paint() {
    if (!urls.length) return;
    const f = mod(angle, 360) / step;
    let k0 = Math.floor(f) % N;
    let k1 = (k0 + 1) % N;
    let t = f - Math.floor(f);
    // blend neighbouring frames only during the slow idle turn; standing still or dragging shows one crisp frame
    if (!turning || drag?.active) {
      if (t >= 0.5) k0 = k1;
      k1 = k0;
      t = 0;
    }
    if (!loaded[k0] || !loaded[k1]) { // still filling in: show the nearest frame we have, no blend
      k0 = nearestLoaded(Math.round(f) % N, 1);
      if (k0 < 0) return;
      k1 = k0;
      t = 0;
    }
    if (shown[0] !== k0) { a.src = urls[k0]; shown[0] = k0; }
    if (shown[1] !== k1) { b.src = urls[k1]; shown[1] = k1; }
    b.style.opacity = t.toFixed(3);
  }
  function tick(now) {
    raf = 0;
    if (!turning || dead) return;
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    angle = mod(angle + speed * dt, 360);
    paint();
    raf = requestAnimationFrame(tick);
  }

  // drag to turn (touch and mouse), with a little inertia; a press without movement is a tap
  let drag = null, coast = 0;
  const degPerPx = () => 300 / Math.max(240, el.clientWidth);
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    cancelAnimationFrame(coast);
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, a0: angle, lastX: e.clientX, lastT: performance.now(), v: 0, active: false };
  });
  el.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.active) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(e.clientY - drag.y)) return;
      drag.active = true;
      try { el.setPointerCapture(e.pointerId); } catch {}
      el.setAttribute("data-drag", "");
      opts.onDrag?.(true);
    }
    const now = performance.now();
    const inst = ((e.clientX - drag.lastX) * degPerPx()) / Math.max(0.008, (now - drag.lastT) / 1000);
    drag.v = drag.v * 0.6 + inst * 0.4;
    drag.lastX = e.clientX;
    drag.lastT = now;
    angle = mod(drag.a0 + dx * degPerPx(), 360);
    paint();
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.active) { if (e.type === "pointerup") opts.onTap?.(); return; }
    el.removeAttribute("data-drag");
    let v = performance.now() - d.lastT > 80 ? 0 : Math.max(-720, Math.min(720, d.v));
    let t0 = 0;
    const glide = (now) => {
      const dt = t0 ? (now - t0) / 1000 : 0;
      t0 = now;
      v *= Math.exp(-dt / 0.35);
      angle = mod(angle + v * dt, 360);
      paint();
      if (Math.abs(v) > 4 && !dead) coast = requestAnimationFrame(glide);
      else opts.onDrag?.(false);
    };
    coast = requestAnimationFrame(glide);
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);

  // load: ONE pack file per machine (frames back to back, nearest the start angle first), streamed, so the
  // first frame shows as soon as its bytes arrive and turning works on the coarse frames while the rest fill in
  Promise.all([loadManifest(project.machine), avifSupported()])
    .then(async ([m, avif]) => {
      if (dead) return;
      N = m.frames;
      step = m.step;
      opts.onInfo?.(m); // e.g. the drawing ratio, so the box has its final shape before anything mounts
      angle = m.start ?? 0;
      const wantPx = (el.clientWidth || 600) * Math.min(devicePixelRatio || 1, 2);
      // phones always take the small set (data and memory); bigger screens the large one when it would show
      const phone = matchMedia("(max-width: 767px)").matches;
      const fmt = avif ? "avif" : "webp";
      const size = m.sizes.d?.packs?.[fmt] && !phone && wantPx > 680 ? "d" : "m";
      const pk = m.sizes[size].packs[fmt] || m.sizes.m.packs.webp;
      urls = new Array(N);
      loaded = new Array(N).fill(false);
      const type = pk.file.endsWith("avif.bin") ? "image/avif" : "image/webp";
      const first = pk.entries[0][0];
      let started = false;
      let decoding = Promise.resolve();
      const add = (bytes, [k, off, len]) => {
        urls[k] = URL.createObjectURL(new Blob([bytes.subarray(off, off + len)], { type }));
        decoding = decoding.then(async () => {
          if (dead) return;
          const img = new Image();
          img.src = urls[k];
          try { await img.decode(); } catch { return; }
          loaded[k] = true;
          if (!started && k === first) { started = true; paint(); resolveReady(); }
          else if (!turning) paint();
        });
      };
      const res = await fetch(asset(project.machine, `frames/${pk.file}`));
      if (!res.ok) throw new Error("no frames");
      const buf = new Uint8Array(pk.bytes);
      let got = 0, next = 0;
      const take = () => { while (next < pk.entries.length && pk.entries[next][1] + pk.entries[next][2] <= got) add(buf, pk.entries[next++]); };
      if (res.body?.getReader) {
        const reader = res.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done || dead) break;
          buf.set(value.subarray(0, Math.max(0, Math.min(value.length, buf.length - got))), got);
          got += value.length;
          take();
        }
      } else {
        buf.set(new Uint8Array(await res.arrayBuffer()).subarray(0, buf.length));
        got = buf.length;
        take();
      }
      await decoding;
      if (!started) throw new Error("first frame failed");
    })
    .catch((err) => rejectReady(err));

  return {
    el,
    ready,
    get angle() { return angle; },
    setAngle(deg) { angle = mod(deg, 360); paint(); },
    turnBy(deg) { angle = mod(angle + deg, 360); paint(); },
    get dragging() { return !!drag?.active; },
    get turning() { return turning; },
    setTurning(on) {
      on = !!on;
      if (on === turning) return;
      turning = on;
      last = 0;
      if (on && !raf) raf = requestAnimationFrame(tick);
      if (!on && raf) { cancelAnimationFrame(raf); raf = 0; }
    },
    destroy() {
      dead = true;
      for (const u of urls) if (u) URL.revokeObjectURL(u);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(coast);
      el.remove();
    },
  };
}

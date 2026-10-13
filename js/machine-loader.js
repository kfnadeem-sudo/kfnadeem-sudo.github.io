// Loads anatomy machines and their stills. Every machine follows portfolio/MACHINE-API.md:
//   mount(el, { theme }) -> { explode, select, setPaused, setTheme, destroy, parts?, hover? }

const base = new URL("../machines/", import.meta.url);
export const asset = (machine, path) => new URL(`${machine}/${path}`, base).href;

const chapterCache = new Map();
/** chapters.json for a machine, as an ordered list [{ id, title, body, tech, image }]. */
export function loadChapters(machine) {
  if (!chapterCache.has(machine)) {
    chapterCache.set(
      machine,
      fetch(asset(machine, "chapters.json"))
        .then((r) => (r.ok ? r.json() : {}))
        .then((obj) => Object.entries(obj).map(([id, c]) => ({ id, ...c })))
        .catch(() => [])
    );
  }
  return chapterCache.get(machine);
}

const OUTLINE = `<svg class="still-outline" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
  <path d="M100 30l60 34v72l-60 34-60-34V64z"/><path d="M40 64l60 34 60-34M100 98v72"/></svg>`;

/**
 * A still picture of the machine in a layer. Returns { el, setExploded(on), ready }.
 * Falls back to a simple outline when the picture is missing.
 */
export function stillLayer(project, onClick) {
  const el = document.createElement("div");
  el.className = "layer layer-still";
  const wrap = document.createElement("div");
  wrap.className = "still";
  el.appendChild(wrap);
  let exploded = false;
  let resolveReady;
  const ready = new Promise((r) => (resolveReady = r));
  const outline = () => { wrap.innerHTML = OUTLINE; resolveReady(); };
  const show = () => {
    const file = exploded ? project.exploded || project.still : project.still;
    if (!file) return outline();
    let img = wrap.querySelector("img");
    if (!img) {
      wrap.textContent = "";
      img = document.createElement("img");
      img.decoding = "async";
      img.onerror = outline;
      img.onload = () => resolveReady();
      wrap.appendChild(img);
    }
    img.alt = `Still of the ${project.machineLabel || project.name}${exploded ? ", taken apart into its parts" : ""}`;
    img.src = asset(project.machine, `shots/${file}`);
  };
  show();
  wrap.addEventListener("click", () => onClick && onClick());
  return { el, ready, setExploded(on) { exploded = !!on; show(); } };
}

/** Imports and mounts the live machine into layer. Resolves to its handle; rejects if it can't. */
export async function liveMachine(layer, project, { timeout = 20000, autoRotate = false } = {}) {
  const mod = await Promise.race([
    import(asset(project.machine, "machine.js")),
    new Promise((_, no) => setTimeout(() => no(new Error("timeout")), timeout)),
  ]);
  const mount = mod.mount || mod.default;
  if (typeof mount !== "function") throw new Error("no mount()");
  // autoRotate: the machine's own slow idle turn (the site pauses it whenever it shouldn't run)
  const handle = mount(layer, { theme: "light", autoRotate });
  if (!handle || typeof handle.explode !== "function") throw new Error("bad handle");
  return handle;
}

/** Ask the browser to fetch (not run) a machine module ahead of time. */
export function preloadMachine(project) {
  const href = asset(project.machine, "machine.js");
  if (document.querySelector(`link[rel="modulepreload"][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "modulepreload";
  link.href = href;
  document.head.appendChild(link);
}

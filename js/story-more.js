// The other seven projects. Each is: a colour world, 3-5 moments, a 2D scene on the back and front SVG layers,
// and real 3D objects on the shared canvas. Objects touch the scene; anything private is invented.
window.STORY = (() => {
  const PROJECTS = [
    { id: "p-stan", n: 2, name: "Stan the Can", tag: "an animated character and his studio", world: "#7d4410", on: "#fff6e6", on2: "#efd2a6", hot: "#ffe08a",
      proof: ["One prompt to a finished short", "Rendered on my own server"],
      how: "Blender driven entirely by Python, ElevenLabs voices, automatic checks for clipping and static shots, and a review pass that every video must clear. Find him as @stan.the.can." },
    { id: "p-beat", n: 4, name: "AI Beat Studio", tag: "built in one day, 2 first places", world: "#7c1d12", on: "#fff3e4", on2: "#f4c9b6", hot: "#ffc93c",
      proof: ["1st: Best Use of OpenLoft", "1st: Applied AI Society Bradford Award"],
      how: "Electron, Tone.js, Gemma 4 running locally with a Gemini fallback, ElevenLabs for vocals, a Kotlin Android pad app over WebSocket. Built with a team of five at the Bradford Agentic AI Hackathon. Open source." },
    { id: "p-test", n: 5, name: "Test Ready", tag: "my own driving-test trainer", world: "#123f8f", on: "#f3f7ff", on2: "#bcd0f2", hot: "#ffc93c",
      proof: ["Real roads", "Wheel, clutch and gears", "VR", "279 questions"],
      how: "three.js on real map, building and height data, the Gamepad API for a Logitech G920 and H-shifter, WebXR for Meta Quest 3, and a marking engine built around the real examiner's sheet." },
    { id: "p-kn", n: 6, name: "KN Layerworks", tag: "my own 3D-print shop", world: "#3b2418", on: "#fbf1dd", on2: "#d9c3a4", hot: "#ffc93c",
      proof: ["Live on Etsy", "Designed in code", "Made to order"],
      how: "OpenSCAD and scripted Fusion models, a Python tool that turns an order into a sliced multi-colour plate, Bambu Studio, Blender for product renders." },
    { id: "p-claude", n: 7, name: "C.L.A.U.D.E", tag: "the voice assistant I use every day", world: "#0e2540", on: "#eef8ff", on2: "#a9c6dd", hot: "#62d6ff",
      proof: ["Hold one key", "Speech stays on the PC", "Replies out loud"],
      how: "Electron with two Python workers, a low-level keyboard hook, faster-whisper for local speech to text, Windows UI Automation to reach the chat, and Claude Code hooks for the spoken reply." },
    { id: "p-track", n: 8, name: "On Track", tag: "my own routine app", world: "#6d1840", on: "#fff1f5", on2: "#eab9cc", hot: "#ffc93c",
      proof: ["Native Android", "Built for a folding phone", "Forced weigh-in"],
      how: "Kotlin and Jetpack Compose, Bluetooth for the smart scale, exact alarms, camera and barcode scanning, foldable-aware layouts. Everything shown here is made-up data." },
    { id: "p-room", n: 9, name: "Room Planner", tag: "plan before you buy", world: "#2d3563", on: "#f1f3ff", on2: "#bcc3e6", hot: "#ffc93c",
      proof: ["True to the centimetre", "Real products", "2D and 3D"],
      how: "A web app with a measured room file, a widest-path search for walkways, clash checks, and an orbiting 3D view. The room shown here is made up. 3D furniture from Kenney's free CC0 kit." },
  ];
  const markup = () => {
    const contact = document.querySelector("#contact"), diss = document.querySelector("#p-diss");
    for (const p of PROJECTS) {
      const s = document.createElement("section");
      s.className = "project"; s.id = p.id; s.setAttribute("aria-label", p.name);
      s.style.cssText = `--world:${p.world};--on:${p.on};--on-2:${p.on2};--hot:${p.hot}`;
      s.innerHTML = `<div class="p-grid"><div class="p-copy">
        <span class="p-tag">Project ${p.n} of 9, ${p.tag}</span><h2>${p.name}</h2>
        <div class="caps"></div><div class="moments"></div>
        <ul class="proof">${p.proof.map((x) => `<li>${x}</li>`).join("")}</ul>
        <button class="more" aria-expanded="false">How it's built</button><p class="how" hidden>${p.how}</p></div>
        <div class="stage"><div class="rig"><svg class="back" viewBox="0 0 900 720" role="img" aria-label="${p.name}: an illustrated walk-through"></svg><div class="gl"></div><svg class="front" viewBox="0 0 900 720" aria-hidden="true"></svg></div></div></div>`;
      contact.parentNode.insertBefore(s, p.id === "p-stan" ? diss : contact);
    }
  };

  const scenes = ({ svg, $, $$, G3, project, gsap }, part) => {
    const parts = (id) => { const sec = $("#" + id); return { sec, back: $(".back", sec), front: $(".front", sec) }; };
    const T = (parent, x, y, str, attrs = {}) => { const t = svg("text", { x, y, fill: "#16202a", ...attrs }, parent); t.textContent = str; return t; };
    const D = (attrs) => ({ class: "d", "font-weight": 800, ...attrs });
    const g = (parent, attrs = {}) => svg("g", attrs, parent);
    const R = (parent, x, y, w, h, fill, rx = 12, extra = {}) => svg("rect", { x, y, width: w, height: h, fill, rx, ...extra }, parent);
    const softShadow = (parent, x, y, w, h, rx, c = "#000", dy = 12) => [[28, .05], [18, .07], [10, .09], [4, .12]].forEach(([s, a]) => R(parent, x - s, y - s * .3 + dy, w + s * 2, h + s * 2, c, rx + s, { opacity: a }));
    const tick = (p, cx, cy, r = 14, ok = true) => { const q = g(p); svg("circle", { cx, cy, r, fill: ok ? "#3f9b6a" : "#d9513c" }, q); svg("path", ok ? { d: `M${cx - r * .45} ${cy}l${r * .32} ${r * .38} ${r * .62}-${r * .76}`, stroke: "#fff", "stroke-width": 3, fill: "none" } : { d: `M${cx - r * .38} ${cy - r * .38}l${r * .76} ${r * .76}m0-${r * .76}l-${r * .76} ${r * .76}`, stroke: "#fff", "stroke-width": 3, fill: "none" }, q); return q; };
    const rngBars = (n, seed) => Array.from({ length: n }, (_, i) => 0.25 + ((i * seed) % 7) * 0.11);

    // ================================================================ STAN THE CAN
    if (part === "stan") {
      const { sec, back, front } = parts("p-stan");
      G3.light(sec, { sky: "#fff4dc", ground: "#a8621a", fill: 1.5, key: "#fff2d8", keyI: 1.9, rim: "#ffd38a", rimI: 1.4 });
      R(back, -40, 610, 980, 150, "#4a2606", 22);
      const stan = G3.add(sec, "stan", { x: 450, y: 370, size: 490, pitch: .04, sway: .42, shadow: { floor: 616, w: 300, h: 40, rest: 246, a: .55, c: "#1f0f02" } });
      const name = g(front); R(name, 620, 180, 240, 110, "#fff6e6", 20); svg("path", { d: "M640 286l-34 34 66-34z", fill: "#fff6e6" }, name); T(name, 642, 225, "This is Stan.", D({ "font-size": 27, fill: "#7d4410" })); T(name, 642, 263, "He's a tin can.", { "font-size": 22, "font-weight": 600, fill: "#7d4410" });
      // one prompt to a script
      const pr = g(front, { opacity: 0 }); softShadow(pr, 300, 60, 570, 90, 18, "#1f0f02", 8); R(pr, 300, 60, 570, 90, "#1a120a", 18); const prT = T(pr, 330, 118, "make a Stan about gum", { "font-size": 30, "font-weight": 600, "font-family": "ui-monospace,Consolas,monospace", fill: "#ffe08a" });
      const script = g(front, { opacity: 0 }); softShadow(script, 300, 176, 570, 380, 14, "#1f0f02", 8); R(script, 300, 176, 570, 380, "#fffaf0", 14);
      const lines = ["Stan sat on a bench.", "The gum didn't let go.", "That was false imprisonment.", "So he called the police."].map((s, i) => T(script, 332, 238 + i * 72, s, { "font-size": 27, "font-weight": 600, fill: "#3a2008" }));
      // the pipeline
      const pipe = g(front, { opacity: 0 });
      const STAGES = ["Script", "Voice", "3D scenes", "Captions and sound", "Checked by a reviewer"];
      const pipeEls = STAGES.map((s, i) => { const q = g(pipe), y = 74 + i * 112; softShadow(q, 300, y, 570, 90, 14, "#1f0f02", 6); R(q, 300, y, 570, 90, "#fffaf0", 14); T(q, 330, y + 56, s, { "font-size": 27, "font-weight": 700, fill: "#3a2008" }); tick(q, 826, y + 45, 19); return q; });
      // the real videos
      const vids = g(front, { opacity: 0 });
      const phones = [["stan-3d", "3D world"], ["stan-2d", "2D cartoon"], ["stan-game", "Illustrated game"]].map(([img, style], i) => { const q = g(vids), x = 300 + i * 196, y0 = 96; softShadow(q, x, y0, 182, 313, 24, "#1f0f02", 8); R(q, x, y0, 182, 313, "#0c0d10", 24); const c = svg("clipPath", { id: "stan-c" + i }, q); R(c, x + 7, y0 + 7, 168, 299, "#000", 18);
        svg("image", { href: `art/${img}.webp`, x: x + 7, y: y0 + 7, width: 168, height: 299, preserveAspectRatio: "xMidYMid slice", "clip-path": `url(#stan-c${i})` }, q);
        T(q, x + 91, y0 + 342, style, { "font-size": 21, "font-weight": 700, "text-anchor": "middle", fill: "#fff6e6" }); return q; });
      const handle = g(vids); T(handle, 588, 492, "@stan.the.can", D({ "font-size": 36, "text-anchor": "middle", fill: "#ffe08a" })); T(handle, 588, 528, "Real videos, posted on TikTok, Instagram and YouTube", { "font-size": 18, "font-weight": 500, "text-anchor": "middle", fill: "#fff6e6" });
      project("#p-stan", [
        ["Meet Stan", "An animated character I designed, with a build made entirely in code."],
        ["One prompt starts it", "A short brief becomes a script built on a fixed formula, where every line causes the next."],
        ["A studio that runs itself", "Voice, 3D scenes, captions and sound come out of one pipeline, with automatic checks for anything clipping or sitting still."],
        ["One character, three looks", "The same Stan in three different art styles, tested with real audiences. Each video goes through review passes before I see it."],
      ], (beat, tl) => {
        beat(() => { tl.from(name, { opacity: 0, scale: .7, svgOrigin: "640 286", duration: .35, ease: "back.out(2)" }, .1); }, 1);
        beat(() => { tl.to(name, { opacity: 0, duration: .2 }).to(stan, { x: 170, y: 410, size: 400, duration: .55 }, "<").to(pr, { opacity: 1, duration: .25 }, "<.1").to(script, { opacity: 1, duration: .25 }).from(lines, { opacity: 0, x: -14, duration: .22, stagger: .12 }); });
        beat(() => { tl.to([pr, script], { opacity: 0, duration: .25 }).to(pipe, { opacity: 1, duration: .1 }, "<.1").from(pipeEls, { opacity: 0, x: 30, duration: .28, stagger: .17, ease: "power2.out" }, "<"); });
        beat(() => { tl.to(pipe, { opacity: 0, duration: .25 }).to(vids, { opacity: 1, duration: .15 }, "<.1").from(phones, { y: 60, opacity: 0, duration: .4, stagger: .12, ease: "back.out(1.5)" }, "<").from(handle, { opacity: 0, duration: .25 }); }, 1.6);
      });
      return;
    }

    // ================================================================ AI BEAT STUDIO
    {
      const { sec, back, front } = parts("p-beat");
      G3.light(sec, { sky: "#ffe7cf", ground: "#a33a22", fill: 1.4, key: "#fff0d0", keyI: 1.8, rim: "#ffb27a", rimI: 1.5 });
      R(back, -40, 590, 980, 170, "#4f110a", 22); // the desk
      softShadow(back, 186, 120, 528, 450, 18);
      const laptop = g(back); R(laptop, 186, 120, 528, 450, "#14161c", 18); R(laptop, 200, 134, 500, 410, "#1f222b", 8);
      svg("path", { d: "M130 566h640l36 34H94z", fill: "#2a2d36" }, laptop); R(laptop, 395, 572, 110, 8, "#14161c", 4);
      const title = T(laptop, 222, 178, "Your riff", D({ "font-size": 27, fill: "#fff3e4" }));
      const titleB = T(laptop, 222, 178, "Neon Tide", D({ "font-size": 27, fill: "#ffc93c", opacity: 0 }));
      const CX = 226, CY = 204, CW = 28, RH = 26;
      for (let r = 0; r < 12; r++) R(laptop, CX, CY + r * RH, CW * 16, RH - 3, r % 2 ? "#2a2e39" : "#272b35", 3);
      const mine = [[0, 9], [2, 7], [4, 9], [6, 6], [8, 9], [10, 7], [12, 5], [14, 7]].map(([c, r]) => R(laptop, CX + c * CW, CY + r * RH, CW * 1.7, RH - 3, "#ffc93c", 4));
      const ai = [];
      const addRow = (cells, fill) => cells.forEach(([c, r, l]) => ai.push(R(laptop, CX + c * CW, CY + r * RH, CW * l, RH - 3, fill, 4)));
      addRow([[0, 11, 3], [4, 11, 3], [8, 10, 3], [12, 11, 3]], "#ff6b4a");
      addRow([[1, 0, 1], [3, 0, 1], [5, 0, 1], [7, 0, 1], [9, 0, 1], [11, 0, 1], [13, 0, 1], [15, 0, 1], [0, 1, 1], [4, 1, 1], [8, 1, 1], [12, 1, 1]], "#62d6ff");
      addRow([[0, 3, 4], [4, 4, 4], [8, 3, 4], [12, 5, 4]], "#c58bff");
      const head = R(laptop, CX, CY, 3, RH * 12, "#fff", 2, { opacity: 0 });
      const btn = g(front, { opacity: 0 }); R(btn, 300, 500, 300, 56, "#ffc93c", 28); T(btn, 450, 537, "Make it a banger", D({ "font-size": 25, "text-anchor": "middle", fill: "#3a1208" }));
      const ph = g(front); softShadow(ph, 36, 300, 170, 300, 24, "#000", 8); R(ph, 36, 300, 170, 300, "#0d0e12", 24); R(ph, 46, 318, 150, 264, "#1a1c24", 10);
      const pads = []; for (let i = 0; i < 12; i++) pads.push(R(ph, 54 + (i % 3) * 46, 330 + (i >> 0 ? Math.floor(i / 3) : 0) * 62, 40, 56, ["#ffc93c", "#ff6b4a", "#62d6ff", "#c58bff"][Math.floor(i / 3)], 8, { opacity: .32 }));
      const bubble = g(front, { opacity: 0 }); R(bubble, 214, 40, 472, 66, "#fff3e4", 20); svg("path", { d: "M300 104l-14 28 46-28z", fill: "#fff3e4" }, bubble); T(bubble, 240, 82, "A vocal line, written and sung for you", { "font-size": 22, "font-weight": 600, fill: "#7c1d12" });
      const pumping = { on: 0 };
      const pump = (base) => (m) => { m.size = base * (1 + pumping.on * 0.022 * Math.sin(performance.now() / 95)); };
      const spL = G3.add(sec, "speaker", { x: 92, y: -300, size: 300, pitch: .05, yaw: .3, on: 0, shadow: { floor: 596, w: 210, h: 26, rest: 152, a: .6, reach: 420, c: "#1d0603" }, sync: pump(300) });
      const spR = G3.add(sec, "speaker", { x: 808, y: -300, size: 300, pitch: .05, yaw: -.3, on: 0, shadow: { floor: 596, w: 210, h: 26, rest: 152, a: .6, reach: 420, c: "#1d0603" }, sync: pump(300) });
      const tA = G3.add(sec, "trophy", { x: 300, y: 120, size: 230, pitch: .1, spin: .7, on: 0, shadow: { floor: 610, w: 200, h: 30, rest: 116, a: .6, reach: 400, c: "#1d0603" } });
      const tB = G3.add(sec, "trophy", { x: 600, y: 120, size: 230, pitch: .1, spin: -.6, on: 0, shadow: { floor: 610, w: 200, h: 30, rest: 116, a: .6, reach: 400, c: "#1d0603" } });
      const wins = g(front, { opacity: 0 }); T(wins, 300, 665, "Best Use of OpenLoft", { "font-size": 21, "font-weight": 700, "text-anchor": "middle", fill: "#fff3e4" }); T(wins, 600, 665, "Applied AI Society award", { "font-size": 21, "font-weight": 700, "text-anchor": "middle", fill: "#fff3e4" });
      project("#p-beat", [
        ["Tap a rhythm", "On your laptop or your phone, no music knowledge needed. Everything snaps to a scale, so every note sounds right."],
        ["Gemma 4 produces it", "One button. The AI writes drums, bass and synths around your riff, names the song and picks the colours. It all stays editable."],
        ["It plays", "Your riff and the AI's parts play together through a real mixer, with vocal lines you can drop onto the track."],
        ["Two first places", "Built in a single day at the Bradford Agentic AI Hackathon, with a team of five."],
      ], (beat, tl) => {
        beat(() => { pads.forEach((p, i) => { const on = [0, 4, 7, 9, 1, 5][i % 6]; tl.to(pads[on], { opacity: 1, duration: .07 }, i * .1 + .05).to(pads[on], { opacity: .32, duration: .1 }); });
          mine.forEach((m, i) => tl.from(m, { opacity: 0, y: -22, duration: .14, ease: "power2.out" }, .05 + i * .12)); }, 1);
        beat(() => { tl.to(btn, { opacity: 1, duration: .2 }).to(btn, { scale: .95, svgOrigin: "450 528", duration: .1 }).to(btn, { scale: 1, svgOrigin: "450 528", duration: .1 }).to(btn, { opacity: 0, duration: .2 })
          .from(ai, { opacity: 0, scaleX: 0, transformOrigin: "0% 50%", duration: .16, stagger: .02 }).to(title, { opacity: 0, duration: .15 }, "<").to(titleB, { opacity: 1, duration: .25 }, "<"); });
        beat(() => { tl.set(spL, { on: 1 }).set(spR, { on: 1 }).to(spL, { y: 444, duration: .55, ease: "bounce.out" }).to(spR, { y: 444, duration: .55, ease: "bounce.out" }, "<.08")
          .to(ph, { opacity: 0, y: 50, duration: .3 }, "<").to(pumping, { on: 1, duration: .2 }).set(head, { opacity: 1 }).fromTo(head, { x: 0 }, { x: CW * 16, duration: 1.4, ease: "none", immediateRender: false })
          .to(bubble, { opacity: 1, duration: .25 }, "<.3"); });
        beat(() => { tl.to(pumping, { on: 0, duration: .15 }).to(bubble, { opacity: 0, duration: .15 }, "<").to(laptop, { opacity: .22, duration: .3 }, "<").to(head, { opacity: 0, duration: .1 }, "<")
          .to(spL, { y: 1100, duration: .4, ease: "power2.in" }, "<").to(spR, { y: 1100, duration: .4, ease: "power2.in" }, "<").set(spL, { on: 0 }).set(spR, { on: 0 })
          .set(tA, { on: 1 }).to(tA, { y: 494, duration: .65, ease: "bounce.out" }).set(tB, { on: 1 }, "<.15").to(tB, { y: 494, duration: .65, ease: "bounce.out" }, "<").to(wins, { opacity: 1, duration: .25 }); }, 1.6);
      });
    }

    // ================================================================ TEST READY
    {
      const { sec, back, front } = parts("p-test");
      G3.light(sec, { sky: "#e6f0ff", ground: "#1d3d78", fill: 1.45, key: "#fff6e0", keyI: 1.8, rim: "#b9d3ff", rimI: 1.4 });
      // the map of real roads (roads redrawn, simplified)
      const map = g(back); softShadow(map, 30, 40, 840, 640, 20, "#020f26"); R(map, 30, 40, 840, 640, "#e7ecdf", 20);
      R(map, 60, 80, 200, 150, "#cfe0c2", 18); R(map, 620, 430, 210, 200, "#cfe0c2", 18); svg("path", { d: "M430 40c-30 120 50 180 20 290s-80 180-40 350", fill: "none", stroke: "#b9d8ee", "stroke-width": 26 }, map);
      ["M30 200H870", "M30 420H870", "M180 40V680", "M640 40V680", "M30 600C280 560 420 520 620 300S800 120 870 110", "M60 680C120 480 300 380 520 370"].forEach((d, i) => svg("path", { d, fill: "none", stroke: "#fff", "stroke-width": i > 3 ? 13 : 20 }, map));
      svg("circle", { cx: 640, cy: 420, r: 40, fill: "none", stroke: "#fff", "stroke-width": 20 }, map);
      const route = svg("path", { d: "M180 620V420H600A40 40 0 0 1 640 380V200H300V140", fill: "none", stroke: "#1f6bff", "stroke-width": 9, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1 }, map);
      const pin = g(map); svg("circle", { cx: 180, cy: 620, r: 20, fill: "#d9513c" }, pin); R(pin, 206, 600, 150, 40, "#16202a", 10); T(pin, 281, 627, "Test centre", { "font-size": 19, "font-weight": 600, fill: "#fff", "text-anchor": "middle" });
      const car = svg("circle", { cx: 0, cy: 0, r: 14, fill: "#ffc93c", stroke: "#16202a", "stroke-width": 4 }, map); gsap.set(car, { x: 180, y: 620 });
      const nav = g(map, { opacity: 0 }); R(nav, 400, 64, 440, 74, "#16202a", 16); T(nav, 424, 112, "At the roundabout, take the 2nd exit", { "font-size": 21, "font-weight": 600, fill: "#fff" });
      // the driver's seat
      const cab = g(back, { opacity: 0 }); R(cab, 10, 30, 880, 660, "#8ec0ea", 26);
      const cabClip = svg("clipPath", { id: "cab-clip" }, back); R(cabClip, 10, 30, 880, 660, "#000", 26);
      const roadWrap = g(cab, { "clip-path": "url(#cab-clip)" }); // the view stays inside the windscreen when it pans
      const road = g(roadWrap); R(road, -300, 270, 1500, 300, "#7f9a68", 0); svg("path", { d: "M395 270h110l400 300H-5z", fill: "#3d4148" }, road); svg("path", { d: "M447 272h6l14 60h-34zM440 362h20l22 90h-64z", fill: "#e8e8e0" }, road);
      [[150, 215, 70, "#b55a46"], [240, 235, 50, "#9c6d4f"], [660, 205, 80, "#b55a46"], [760, 225, 60, "#8a7560"]].forEach(([x, y, w, c]) => { R(road, x, y, w, 62, c, 3); svg("path", { d: `M${x - 4} ${y}l${w / 2 + 4}-26 ${w / 2 + 4} 26z`, fill: "#54463f" }, road); });
      R(cab, 340, 44, 220, 62, "#16202a", 14); const mir = R(cab, 350, 52, 200, 46, "#a9d0ee", 10);
      const dash = g(cab); R(dash, 10, 440, 880, 250, "#191c22", 26); R(dash, 10, 440, 880, 26, "#22262d", 12);
      const gearT = g(dash); T(gearT, 110, 560, "2", D({ "font-size": 94, fill: "#ffc93c", "text-anchor": "middle" })); T(gearT, 110, 600, "gear", { "font-size": 21, fill: "#b8c0cc", "text-anchor": "middle" });
      const pedalBars = ["Clutch", "Brake", "Gas"].map((l, i) => { const x = 720 + i * 50; R(dash, x, 486, 28, 130, "#2a2f38", 7); const f = R(dash, x, 486, 28, 130, ["#62d6ff", "#ff6b4a", "#ffc93c"][i], 7); gsap.set(f, { scaleY: .1, transformOrigin: "50% 100%" }); T(dash, x + 14, 640, l, { "font-size": 15, fill: "#b8c0cc", "text-anchor": "middle" }); return f; });
      const stall = g(front, { opacity: 0 }); R(stall, 300, 130, 300, 62, "#d9513c", 14); T(stall, 450, 171, "Stalled. It gets marked.", { "font-size": 23, "font-weight": 700, fill: "#fff", "text-anchor": "middle" });
      const check = g(front, { opacity: 0 }); R(check, 240, 130, 420, 60, "#16202a", 14); tick(check, 272, 160, 15); T(check, 298, 169, "Shoulder check, a real head turn", { "font-size": 21, "font-weight": 600, fill: "#fff" });
      const wheel = G3.add(sec, "wheel", { x: 450, y: 520, size: 390, pitch: -.2, on: 0, roll: 0 });
      const vr = G3.add(sec, "headset", { x: 745, y: 392, size: 200, pitch: .12, yaw: -.5, on: 0, shadow: { floor: 448, w: 190, h: 18, rest: 56, a: .6, reach: 300, c: "#02060e" } });
      // the examiner's sheet
      const sheet = g(front, { opacity: 0 }); softShadow(sheet, 150, 50, 600, 620, 12, "#020f26"); R(sheet, 150, 50, 600, 620, "#fffdf6", 12);
      T(sheet, 182, 104, "Your drive, marked", D({ "font-size": 30, fill: "#123f8f" }));
      const rows = [["Mirrors, turning right", 2], ["Junctions, approach speed", 1], ["Roundabouts, signal", 1], ["Moving off, safety", 0], ["Clutch control", 0]];
      const rowEls = rows.map(([s, n], i) => { const q = g(sheet), y = 150 + i * 56; R(q, 180, y - 30, 540, 46, i % 2 ? "#f4f1e6" : "#fffdf6", 6); T(q, 196, y, s, { "font-size": 21 }); for (let k = 0; k < n; k++) R(q, 640 + k * 22, y - 22, 12, 30, "#d9513c", 3); return q; });
      T(sheet, 182, 462, "Faults this month", { "font-size": 20, "font-weight": 700, fill: "#123f8f" });
      const trend = [150, 128, 96, 70, 48, 30].map((h, i) => R(sheet, 186 + i * 56, 640 - h, 40, h, i === 5 ? "#3f9b6a" : "#123f8f", 5)); gsap.set(trend, { scaleY: 0, transformOrigin: "50% 100%" });
      const qb = g(sheet, { opacity: 0 }); R(qb, 544, 470, 180, 170, "#ffc93c", 14); T(qb, 634, 552, "279", D({ "font-size": 58, "text-anchor": "middle", fill: "#16202a" })); T(qb, 634, 594, "theory questions", { "font-size": 17, "font-weight": 600, "text-anchor": "middle" });
      const carPos = { d: 0 }, len = route.getTotalLength();
      project("#p-test", [
        ["The real roads round my test centre", "Real streets, buildings and hills from open map data, with traffic that gives way. Mock tests plan a route with sat-nav, like the real drive."],
        ["A real wheel, clutch and gears", "Driven with a racing wheel, pedals and an H-shifter. You can stall, you can coast, and both get marked."],
        ["Look round in VR", "On a Quest headset the same drive opens around you, so mirror and shoulder checks are real head turns."],
        ["Marked like the real examiner", "Every mistake goes down against the real test's categories, a chart shows what's going away, and 279 questions cover the theory."],
      ], (beat, tl) => {
        beat(() => { tl.to(route, { attr: { "stroke-dashoffset": 0 }, duration: 1.3, ease: "none" }, .05)
          .to(carPos, { d: 1, duration: 1.3, ease: "none", onUpdate: () => { const p = route.getPointAtLength(len * carPos.d); gsap.set(car, { x: p.x, y: p.y }); } }, "<").to(nav, { opacity: 1, duration: .25 }, "<.4"); }, 1);
        beat(() => { tl.to(map, { opacity: 0, duration: .3 }).to(cab, { opacity: 1, duration: .35 }, "<").set(wheel, { on: 1 }, "<")
          .fromTo(wheel, { y: 900 }, { y: 520, duration: .55, ease: "power3.out", immediateRender: false }, "<")
          .to(wheel, { roll: -1.3, duration: .7 }).to(road, { x: 90, duration: .7 }, "<")
          .to(pedalBars[0], { scaleY: 1, duration: .25 }, "<").to(pedalBars[2], { scaleY: .55, duration: .35 }, "<.1")
          .to(pedalBars[0], { scaleY: 0, duration: .15 }).to(pedalBars[2], { scaleY: .1, duration: .15 }, "<").to(stall, { opacity: 1, duration: .15 })
          .to(wheel, { roll: .3, duration: .6 }, "<.2").to(road, { x: -30, duration: .6 }, "<"); });
        beat(() => { tl.to(stall, { opacity: 0, duration: .15 }).to(wheel, { roll: 0, duration: .3 }, "<").to(road, { x: 0, duration: .3 }, "<")
          .to(pedalBars.map((b) => b.parentNode ? b : b), { opacity: 0, duration: .2 }, "<").set(vr, { on: 1, y: 60 }).to(vr, { y: 392, duration: .6, ease: "bounce.out" })
          .to(road, { x: 300, duration: .6 }).to(mir, { fill: "#d7ecfb", duration: .3 }, "<").to(check, { opacity: 1, duration: .2 }).to(road, { x: 0, duration: .6 }, ">.25"); });
        beat(() => { tl.to(check, { opacity: 0, duration: .15 }).to(vr, { on: 0, duration: .2 }, "<").to(wheel, { y: 950, duration: .4, ease: "power2.in" }, "<").set(wheel, { on: 0 })
          .fromTo(sheet, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: .4, ease: "power3.out", immediateRender: false }, "<.1")
          .from(rowEls, { opacity: 0, x: -14, duration: .2, stagger: .08 }).to(trend, { scaleY: 1, duration: .3, stagger: .06 }).to(qb, { opacity: 1, duration: .25 }); }, 1.6);
      });
    }

    // ================================================================ KN LAYERWORKS
    {
      const { sec, back, front } = parts("p-kn");
      G3.light(sec, { sky: "#fff0d8", ground: "#6b3f20", fill: 1.45, key: "#fff2d8", keyI: 1.8, rim: "#ffd9a0", rimI: 1.3 });
      R(back, -40, 620, 980, 140, "#241509", 22);
      const tk = g(back); softShadow(tk, 210, 100, 480, 440, 14); R(tk, 210, 100, 480, 440, "#fffaf0", 14);
      T(tk, 242, 158, "New Etsy order", D({ "font-size": 32, fill: "#3b2418" })); T(tk, 242, 214, "Personalisation", { "font-size": 19, fill: "#7d6b58" });
      const nm = T(tk, 242, 280, "AMELIA", D({ "font-size": 66, fill: "#c98a12" }));
      const tl1 = g(tk), tl2 = g(tk); tick(tl1, 258, 360, 16); T(tl1, 288, 368, "Fits the 12 letter limit", { "font-size": 22 }); tick(tl2, 258, 420, 16); T(tl2, 288, 428, "Name-check message drafted", { "font-size": 22 });
      const code = g(back, { opacity: 0 }); softShadow(code, 40, 70, 820, 300, 16); R(code, 40, 70, 820, 300, "#17120d", 16);
      ['name = "AMELIA";', "height = 3.2;", "letters = raise(text(name), height);", "keyring = plate(fit(letters)) + letters;"].forEach((line, i) => T(code, 76, 136 + i * 54, line, { "font-size": 27, "font-weight": 500, fill: i ? "#fbf1dd" : "#ffc93c" }));
      const key3 = G3.add(sec, "keyring", { x: 450, y: 100, size: 560, pitch: .1, yaw: -.2, sway: .34, on: 0, shadow: { floor: 626, w: 470, h: 26, rest: 120, a: .55, reach: 430, c: "#120904" } });
      // the printer
      const pr = g(back, { opacity: 0 }); softShadow(pr, 200, 210, 500, 416, 14); R(pr, 200, 210, 500, 416, "#22242a", 14); R(pr, 222, 232, 456, 346, "#0f1115", 8); R(pr, 222, 232, 456, 346, "#a9c6dd", 8, { opacity: .07 }); R(pr, 240, 540, 420, 24, "#3b3e46", 4); R(pr, 222, 268, 456, 10, "#4a4d55", 4);
      const headP = g(pr); R(headP, -32, 262, 64, 62, "#e6e4dc", 8); svg("path", { d: "M-9 324h18l-9 18z", fill: "#c0c4ca" }, headP); gsap.set(headP, { x: 300 });
      const clipId = "kn-clip"; const cp = svg("clipPath", { id: clipId }, back); const reveal = R(cp, 240, 540, 420, 0, "#000", 0);
      const printed = g(pr, { "clip-path": `url(#${clipId})` }); R(printed, 262, 468, 376, 72, "#2b2c31", 12); T(printed, 450, 526, "AMELIA", D({ "font-size": 56, "text-anchor": "middle", fill: "#d8ab45" }));
      R(back, 196, 148, 508, 62, "#2c2e35", 10, { opacity: 0, class: "ams" });
      const tubes = g(back, { opacity: 0 }); [290, 400, 510, 620].forEach((x) => svg("path", { d: `M${x} 208C${x} 250 450 230 ${gsap.getProperty ? 450 : 450} 268`, fill: "none", stroke: "#c8ccd2", "stroke-width": 3 }, tubes));
      const spools = [["#2b2c31", 290], ["#f2ecdc", 400], ["#d8ab45", 510], ["#d6443a", 620]].map(([c, x]) => G3.add(sec, "spool", { x, y: -200, size: 110, spin: 1.2, tint: c, pitch: .1, on: 0, shadow: { floor: 150, w: 100, h: 12, rest: 54, a: .6, reach: 300, c: "#120904" } }));
      // the shop
      const shop = g(front, { opacity: 0 });
      const SHOP = ["Name keyring", "Flexi keyring", "Spinning top", "Reveal wheel", "Lantern", "Maze box"];
      const tiles = SHOP.map((s, i) => { const q = g(shop), x = 60 + (i % 3) * 268, y = 70 + (i >> 0 ? Math.floor(i / 3) : 0) * 270; R(q, x, y, 244, 240, "#fffaf0", 16); const clipI = svg("clipPath", { id: "kn-c" + i }, q); R(clipI, x + 14, y + 14, 216, 170, "#000", 10);
        svg("image", { href: `art/${["kn-key", "kn-flexi", "kn-top", "kn-wheel", "kn-lantern", "kn-maze"][i]}.webp`, x: x + 14, y: y + 14, width: 216, height: 170, preserveAspectRatio: "xMidYMid slice", "clip-path": `url(#kn-c${i})` }, q); T(q, x + 122, y + 208, s, { "font-size": 22, "font-weight": 600, "text-anchor": "middle" }); return q; });
      const ams = $(".ams", back);
      project("#p-kn", [
        ["A name comes in", "A customer types a name on Etsy. One tool checks it against the product's limits and drafts the message to confirm it."],
        ["The name changes the design", "Every product is a model written in code, so the name reshapes the part itself instead of sitting on top."],
        ["Printed in four colours", "Four spools feed the printer. The order becomes a ready-to-print plate, with the colour changing at set heights."],
        ["A real shop", "Live on Etsy, every piece made to order in the UK and posted free."],
      ], (beat, tl) => {
        beat(() => { tl.from(nm, { opacity: 0, y: 14, duration: .3 }, .05).from(tl1, { opacity: 0, x: -14, duration: .25 }).from(tl2, { opacity: 0, x: -14, duration: .25 }); }, 1);
        beat(() => { tl.to(tk, { opacity: 0, y: -40, duration: .3 }).to(code, { opacity: 1, duration: .3 }, "<.1").set(key3, { on: 1 }).to(key3, { y: 506, duration: .7, ease: "bounce.out" }); });
        beat(() => { tl.to(key3, { y: 960, duration: .35, ease: "power2.in" }).set(key3, { on: 0 }).to(code, { opacity: 0, duration: .25 }, "<").to(pr, { opacity: 1, duration: .3 }).to(ams, { opacity: 1, duration: .25 }, "<").to(tubes, { opacity: 1, duration: .25 }, "<");
          spools.forEach((s, i) => { tl.set(s, { on: 1 }, i ? "<.06" : ">").to(s, { y: 96, duration: .5, ease: "bounce.out" }, "<"); });
          const t0 = tl.duration();
          tl.to(reveal, { attr: { y: 468, height: 72 }, duration: 1.4, ease: "none" }, t0);
          for (let i = 0; i < 7; i++) tl.to(headP, { x: i % 2 ? 300 : 600, duration: .2, ease: "none" }, t0 + i * .2); });
        beat(() => { tl.to([pr, tubes, ams], { opacity: 0, duration: .25 }); spools.forEach((s) => tl.to(s, { on: 0, duration: .15 }, "<")); tl.to(shop, { opacity: 1, duration: .15 }).from(tiles, { opacity: 0, y: 26, duration: .3, stagger: .08, ease: "back.out(1.6)" }, "<"); }, 1.6);
      });
    }

    // ================================================================ C.L.A.U.D.E
    {
      const { sec, back, front } = parts("p-claude");
      G3.light(sec, { sky: "#d8f1ff", ground: "#134a78", fill: 1.3, key: "#ffffff", keyI: 1.5, rim: "#62d6ff", rimI: 2 });
      // a keyboard on the desk, one key real
      const kb = g(back); softShadow(kb, 60, 470, 780, 210, 18, "#000"); R(kb, 60, 470, 780, 210, "#10161f", 18);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) { if (r === 2 && c > 3 && c < 8) continue; R(kb, 86 + c * 61, 490 + r * 58, 54, 50, "#1c2430", 8); }
      R(kb, 330, 606, 240, 50, "#1c2430", 8, { opacity: 0 });
      const keyc = G3.add(sec, "keycap", { x: 450, y: 610, size: 150, pitch: 1.18, on: 1, shadow: { dy: 60, w: 150, h: 20, a: .5, c: "#000" } });
      const orb = G3.add(sec, "orb", { x: 450, y: 225, size: 170, pitch: .2, spin: .55, on: 1, bob: 6, shadow: { dy: 170, w: 150, h: 20, a: .3, c: "#02101f" } });
      const rings = g(back); [120, 160, 200].forEach((r) => svg("circle", { cx: 450, cy: 225, r, fill: "none", stroke: "#62d6ff", "stroke-width": 3, opacity: 0, class: "ring" }, rings));
      const ringEls = $$(".ring", rings);
      const hold = g(front, { opacity: 0 }); R(hold, 610, 410, 220, 44, "#62d6ff", 22); T(hold, 720, 439, "Hold to talk", { "font-size": 21, "font-weight": 700, fill: "#0e2540", "text-anchor": "middle" });
      const words = g(back, { opacity: 0 }); softShadow(words, 80, 60, 560, 200, 18, "#000"); R(words, 80, 60, 560, 200, "#f4fbff", 18);
      const wordEls = [];
      [["Move", "that", "button", "down", "a"], ["bit", "and", "make", "it", "bigger"]].forEach((line, r) => {
        const t = T(words, 110, 122 + r * 48, "", { "font-size": 30, "font-weight": 600, fill: "#0e2540" });
        line.forEach((w, i) => { const sp = svg("tspan", {}, t); sp.textContent = w + (i < line.length - 1 ? " " : ""); wordEls.push(sp); });
      });
      gsap.set(wordEls, { attr: { "fill-opacity": 0 } });
      const local = g(words); R(local, 110, 200, 330, 38, "#0e2540", 19); T(local, 275, 226, "Written on this PC, not in the cloud", { "font-size": 16, "font-weight": 600, fill: "#d8f1ff", "text-anchor": "middle" });
      const chat = g(back, { opacity: 0 }); softShadow(chat, 60, 50, 780, 400, 16, "#000"); R(chat, 60, 50, 780, 400, "#f6f4ee", 16); R(chat, 60, 50, 780, 48, "#e6e3da", 16); T(chat, 86, 82, "The chat you already have open", { "font-size": 19, "font-weight": 600 });
      const old = g(chat); R(old, 96, 120, 460, 54, "#e6e3da", 16); T(old, 118, 155, "Here's the page layout you asked for.", { "font-size": 19 });
      const said = g(chat, { opacity: 0 }); R(said, 300, 192, 510, 64, "#0e2540", 16); T(said, 326, 233, "Move that button down a bit and make it bigger", { "font-size": 19, fill: "#fff" });
      const reply = g(chat, { opacity: 0 }); R(reply, 96, 276, 560, 96, "#fff", 16, { stroke: "#ddd" }); T(reply, 118, 316, "Done. The button is lower and 20% larger.", { "font-size": 21 }); T(reply, 118, 350, "Want a screenshot to check?", { "font-size": 21 });
      const donePill = g(front, { opacity: 0 }); R(donePill, 96, 392, 140, 40, "#3f9b6a", 20); T(donePill, 166, 419, "Done", { "font-size": 20, "font-weight": 700, fill: "#fff", "text-anchor": "middle" });
      project("#p-claude", [
        ["Hold one key and talk", "Hold a key anywhere in Windows and the orb listens. Let go and your message is on its way."],
        ["Your words, typed live", "Speech becomes text on the PC itself, with no cloud speech service, while you are still holding the key."],
        ["It lands in the open chat", "There's no new app to learn. Your words go straight into whichever Claude chat is open, and it checks they got there."],
        ["The reply comes back out loud", "Claude answers, the orb speaks a short summary, and its colour tells you if it's done or needs you."],
      ], (beat, tl) => {
        beat(() => { tl.to(keyc, { y: 620, duration: .2, ease: "power2.in" }, .1).to(hold, { opacity: 1, duration: .2 }, "<").to(orb, { size: 215, duration: .4, ease: "back.out(2)" }, "<")
          .to(ringEls, { opacity: .7, scale: 1.06, svgOrigin: "450 225", duration: .3, stagger: .08 }, "<.1"); }, 1);
        beat(() => { tl.to(ringEls, { opacity: 0, duration: .2 }).to(hold, { opacity: 0, duration: .15 }, "<").to(orb, { x: 760, y: 150, size: 130, duration: .55 }, "<").to(words, { opacity: 1, duration: .25 }, "<.2")
          .to(wordEls, { attr: { "fill-opacity": 1 }, duration: .08, stagger: .1, ease: "none" }).from(local, { opacity: 0, y: 8, duration: .2 }); });
        beat(() => { tl.to(keyc, { y: 610, duration: .15 }).to(words, { opacity: 0, y: 150, scale: .6, svgOrigin: "560 224", duration: .4, ease: "power2.in" }, "<").to(chat, { opacity: 1, duration: .3 }, "<.1").to(said, { opacity: 1, duration: .25 }).from(said, { y: 18, duration: .3, ease: "back.out(2)" }, "<"); });
        beat(() => { tl.to(reply, { opacity: 1, duration: .25 }, ">.1").from(reply, { y: 16, duration: .3 }, "<").to(orb, { x: 748, y: 352, size: 104, duration: .5 }, "<").to(donePill, { opacity: 1, duration: .2 }); ringEls.forEach((r, i) => { gsap.set(r, {}); });
        }, 1.6);
      });
    }

    // ================================================================ ON TRACK
    {
      const { sec, back, front } = parts("p-track");
      G3.light(sec, { sky: "#ffe9ef", ground: "#8a2a55", fill: 1.4, key: "#fff0dc", keyI: 1.9, rim: "#ffb0cc", rimI: 1.5 });
      const shelf = R(back, -40, 470, 980, 34, "#3d0d24", 10);
      let ringing = { on: 0 };
      const CLK = { x: 240, y: 345 };
      const clock = G3.add(sec, "clock", { x: CLK.x, y: 345, size: 250, pitch: .06, yaw: .28, on: 1, shadow: { dy: 126, w: 210, h: 24, a: .55, c: "#1c0411" },
        sync(m) { const t = performance.now(); m.roll = ringing.on * Math.sin(t / 34) * .05; m.x = (m.bx ?? CLK.x) + ringing.on * Math.sin(t / 27) * 3; } });
      const ph = g(front); softShadow(ph, 470, 86, 270, 540, 34, "#1c0411", 10); R(ph, 470, 86, 270, 540, "#0c0d10", 34); const sc = R(ph, 482, 100, 246, 512, "#17131a", 24);
      const lock = g(ph); T(lock, 605, 196, "06:00", D({ "font-size": 62, fill: "#fff", "text-anchor": "middle" })); T(lock, 605, 268, "Weigh in to stop", { "font-size": 26, "font-weight": 700, fill: "#ffc93c", "text-anchor": "middle" }); T(lock, 605, 300, "the alarm", { "font-size": 26, "font-weight": 700, fill: "#ffc93c", "text-anchor": "middle" });
      const read = g(ph, { opacity: 0 }); T(read, 605, 380, "Reading the scale", { "font-size": 22, fill: "#d9d4dc", "text-anchor": "middle" }); [0, 1, 2].forEach((i) => svg("circle", { cx: 585 + i * 20, cy: 410, r: 6, fill: "#ffc93c" }, read));
      const logged = g(ph, { opacity: 0 }); tick(logged, 605, 400, 34); T(logged, 605, 472, "Logged. Alarm off.", { "font-size": 22, "font-weight": 700, fill: "#fff", "text-anchor": "middle" });
      const scale = G3.add(sec, "scale", { x: 240, y: 900, size: 235, pitch: 1.02, on: 0, shadow: { floor: 665, w: 240, h: 26, rest: 50, a: .5, reach: 400, c: "#1c0411" } });
      const today = g(ph, { opacity: 0 }); R(today, 482, 100, 246, 512, "#fff7fa", 24);
      T(today, 502, 146, "Today", D({ "font-size": 30, fill: "#6d1840" }));
      const stk = g(today); R(stk, 616, 118, 96, 38, "#ffc93c", 19); const streakN = T(stk, 664, 145, "0", { "font-size": 20, "font-weight": 800, fill: "#3a0d24", "text-anchor": "middle" });
      const TASKS = [["Wake up", true, true], ["Gym", true, false], ["Prepped lunch", true, true], ["Deep work", false, false], ["Wind-down", false, true]];
      const taskEls = TASKS.map(([s, done, must], i) => { const q = g(today), y = 176 + i * 62; R(q, 498, y, 214, 52, i === 3 ? "#6d1840" : "#f4e4ea", 12); T(q, 514, y + 33, s, { "font-size": 18, "font-weight": 600, fill: i === 3 ? "#fff" : "#3a0d24" }); if (done) tick(q, 690, y + 26, 12); else if (must) { R(q, 682, y + 24, 16, 14, "#6d1840", 3); svg("path", { d: `M685 ${y + 24}v-4a5 5 0 0 1 10 0v4`, fill: "none", stroke: "#6d1840", "stroke-width": 2.5 }, q); } return q; });
      const btns = g(today); ["Done", "Skip", "Snooze"].forEach((s, i) => { R(btns, 498 + i * 73, 496, 68, 44, i ? "#f4e4ea" : "#6d1840", 12); T(btns, 532 + i * 73, 524, s, { "font-size": 15, "font-weight": 700, fill: i ? "#3a0d24" : "#fff", "text-anchor": "middle" }); });
      // unfolded, a second pane opens on the left
      const pane2 = g(back, { opacity: 0 }); softShadow(pane2, 200, 86, 270, 540, 34, "#1c0411", 10); R(pane2, 200, 86, 270, 540, "#0c0d10", 34); R(pane2, 212, 100, 258, 512, "#fff7fa", 24);
      T(pane2, 232, 146, "This week", D({ "font-size": 28, fill: "#6d1840" })); ["M", "T", "W", "T", "F", "S", "S"].forEach((d, i) => { svg("circle", { cx: 244 + i * 31, cy: 196, r: 13, fill: i < 4 ? "#6d1840" : "#f4e4ea" }, pane2); T(pane2, 244 + i * 31, 201, d, { "font-size": 13, "font-weight": 700, "text-anchor": "middle", fill: i < 4 ? "#fff" : "#6d1840" }); });
      T(pane2, 232, 260, "Cook mode", { "font-size": 21, "font-weight": 700, fill: "#6d1840" }); [190, 150, 170, 120].forEach((w, i) => R(pane2, 232, 280 + i * 42, w, 28, "#f4e4ea", 8));
      project("#p-track", [
        ["The alarm won't stop", "A full-screen alarm that only goes quiet when you've actually got up. Being firm is the whole point of the app."],
        ["Until you step on the scale", "The weight comes straight from a smart scale over Bluetooth. The app stays locked until it's in."],
        ["Then the day runs itself", "What's on now, what's next. Skipping needs a reason, the padlocked tasks can't be missed, and a good day keeps the streak alive."],
        ["Built for a folding phone", "One column when it's folded. Unfold it and the same app opens into two panes."],
      ], (beat, tl) => {
        beat(() => { tl.to(ringing, { on: 1, duration: .15 }, .05).to({}, { duration: .4 }); }, 1);
        beat(() => { tl.to(lock, { y: -30, opacity: .9, duration: .3 }).to(read, { opacity: 1, duration: .2 }, "<").set(scale, { on: 1 }).to(scale, { y: 615, duration: .5, ease: "power3.out" }, "<")
          .to({}, { duration: .35 }).to(read, { opacity: 0, duration: .15 }).to(logged, { opacity: 1, duration: .2 }, "<").from(logged, { scale: .6, svgOrigin: "605 420", duration: .3, ease: "back.out(3)" }, "<").to(ringing, { on: 0, duration: .15 }, "<"); });
        beat(() => { const n = { v: 0 }; tl.to(scale, { y: 900, duration: .35, ease: "power2.in" }).set(scale, { on: 0 }).to(clock, { x: -200, duration: .4, onUpdate: () => (clock.bx = clock.x) }, "<").to(today, { opacity: 1, duration: .3 }, "<.1").to(lock, { opacity: 0, duration: .15 }, "<")
          .to(shelf, { opacity: 0, duration: .2 }, "<")
          .to(ph, { x: -150, duration: .45 }, "<").from(taskEls, { opacity: 0, x: 14, duration: .2, stagger: .07 }).to(n, { v: 12, duration: .6, ease: "none", onUpdate: () => (streakN.textContent = Math.round(n.v) + " days") }); });
        beat(() => { tl.to(ph, { x: 0, duration: .5 }).to(pane2, { opacity: 1, duration: .3 }, "<.1").from(pane2, { scaleX: .1, svgOrigin: "470 360", duration: .5, ease: "power3.out" }, "<"); }, 1.6);
      });
    }

    // ================================================================ ROOM PLANNER
    {
      const { sec, back, front } = parts("p-room");
      G3.light(sec, { sky: "#f4f2ff", ground: "#4a5498", fill: 1.45, key: "#fff4de", keyI: 1.9, rim: "#c5ccff", rimI: 1.2 });
      const plan = g(back); softShadow(plan, 60, 50, 780, 620, 16, "#0d1130"); R(plan, 60, 50, 780, 620, "#f7f6f0", 16);
      for (let i = 0; i < 16; i++) svg("line", { x1: 60 + i * 52, y1: 50, x2: 60 + i * 52, y2: 670, stroke: "#d9dbe6", "stroke-width": 1 }, plan);
      for (let i = 0; i < 12; i++) svg("line", { x1: 60, y1: 50 + i * 52, x2: 840, y2: 50 + i * 52, stroke: "#d9dbe6", "stroke-width": 1 }, plan);
      const wall = svg("path", { d: "M170 130H690V250H740V580H170Z", fill: "#ffffff", stroke: "#2d3563", "stroke-width": 11, "stroke-linejoin": "round", pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1 }, plan);
      const dims = g(plan, { opacity: 0 }); T(dims, 430, 106, "4.20 m", { "font-size": 22, "font-weight": 700, "text-anchor": "middle", fill: "#2d3563" }); T(dims, 128, 366, "3.60 m", { "font-size": 22, "font-weight": 700, "text-anchor": "middle", fill: "#2d3563", transform: "rotate(-90 128 366)" });
      const door = g(plan, { opacity: 0 }); svg("path", { d: "M170 500A80 80 0 0 1 250 580", fill: "none", stroke: "#2d3563", "stroke-width": 3, "stroke-dasharray": "6 5" }, door); R(door, 164, 500, 12, 80, "#f7f6f0", 0);
      const FUR = [["Bed", 190, 150, 210, 250, "#9fb0ea", 0, -180], ["Wardrobe", 420, 150, 240, 80, "#d8b890", 150, -140], ["Desk", 600, 380, 124, 180, "#e0a07a", 180, 40]];
      const furEls = FUR.map(([s, x, y, w, h, c, dx, dy]) => { const q = g(plan, { opacity: 0 }); R(q, x, y, w, h, c, 8, { stroke: "#2d3563", "stroke-width": 3 }); T(q, x + w / 2, y + h / 2 + 8, s, { "font-size": 23, "font-weight": 700, "text-anchor": "middle", fill: "#1d2448" }); gsap.set(q, { x: dx * 2.2 + 340, y: dy + 60 }); return q; });
      const walk = svg("path", { d: "M212 540C330 540 420 470 470 300", fill: "none", stroke: "#d9513c", "stroke-width": 8, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1 }, plan);
      const warn = g(plan, { opacity: 0 }); R(warn, 280, 412, 260, 50, "#d9513c", 14); T(warn, 410, 445, "Walkway only 62 cm", { "font-size": 22, "font-weight": 700, fill: "#fff", "text-anchor": "middle" });
      const okay = g(plan, { opacity: 0 }); R(okay, 280, 412, 260, 50, "#3f9b6a", 14); T(okay, 410, 445, "Walkway 78 cm, fits", { "font-size": 22, "font-weight": 700, fill: "#fff", "text-anchor": "middle" });
      const floorSp = g(back, { opacity: 0 }); svg("ellipse", { cx: 400, cy: 610, rx: 340, ry: 56, fill: "#1b2147" }, floorSp);
      const room = G3.add(sec, "room", { x: 400, y: 345, size: 600, pitch: .6, yaw: -.785, sway: .5, on: 0, shadow: { dy: 268, w: 560, h: 60, a: .5, c: "#0d1130" } });
      const buy = g(front, { opacity: 0 }); softShadow(buy, 650, 60, 230, 260, 14, "#0d1130", 8); R(buy, 650, 60, 230, 260, "#fffdf6", 14);
      T(buy, 672, 104, "To buy", D({ "font-size": 27, fill: "#2d3563" })); ["Bed frame", "Wardrobe", "Desk", "Desk chair", "Rug"].forEach((s, i) => { tick(buy, 682, 138 + i * 36, 10, i < 2); T(buy, 702, 145 + i * 36, s, { "font-size": 18 }); });
      project("#p-room", [
        ["Start with the real room", "Measured walls, doors, windows and sockets. Odd shapes like alcoves and chimney breasts are fine."],
        ["Drag in real furniture", "Every piece is a real product at its true size. It snaps to the walls, and layouts can be compared side by side."],
        ["Does it actually fit?", "Every change re-checks the room: the narrowest walkway from the door, clashes, door swings and sockets."],
        ["See it, then buy it", "The same layout opens as a 3D room you can look round, with a live list of what's still to buy."],
      ], (beat, tl) => {
        beat(() => { tl.to(wall, { attr: { "stroke-dashoffset": 0 }, duration: 1, ease: "none" }, .05).to(dims, { opacity: 1, duration: .2 }).to(door, { opacity: 1, duration: .2 }, "<"); }, 1);
        beat(() => { furEls.forEach((f, i) => tl.to(f, { opacity: 1, duration: .1 }, i ? ">-.2" : ">").to(f, { x: 0, y: 0, duration: .5, ease: "back.out(1.3)" }, "<")); });
        beat(() => { tl.to(walk, { attr: { "stroke-dashoffset": 0 }, duration: .5, ease: "none" }).to(warn, { opacity: 1, duration: .2 }).to({}, { duration: .9 })
          .to(furEls[2], { x: 16, duration: .1 }).to(furEls[0], { x: -14, duration: .4 }, "<").to(furEls[1], { y: -8, duration: .4 }, "<").to(warn, { opacity: 0, duration: .15 }, "<.2").to(okay, { opacity: 1, duration: .15 }, "<").to(walk, { stroke: "#3f9b6a", duration: .15 }, "<"); });
        beat(() => { tl.to(plan, { opacity: 0, duration: .3 }).to(floorSp, { opacity: 1, duration: .3 }, "<").set(room, { on: .01 }, "<").to(room, { on: 1, duration: .55, ease: "back.out(1.5)" }, "<").to(buy, { opacity: 1, duration: .3 }); }, 1.8);
      });
    }

  };
  return { markup, scenes, PROJECTS };
})();

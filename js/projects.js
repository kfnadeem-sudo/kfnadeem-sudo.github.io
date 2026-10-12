// The carousel, in order. To add a project, add one entry here and put its
// machine in site/machines/<machine>/ (see README.md, "Add a project").
//
// id        deep link (#id) and slide key
// machine   folder name under site/machines/
// still     light-theme image in machines/<machine>/shots/ (phones, and if the 3D machine can't load)
// exploded  optional still for the exploded view, same folder
// aspect    optional width / height of the machine drawing (read from its SVG if left out)
// fit       optional extra scale when the drawing has a lot of empty margin (1 = none)
// explodeAngle  optional angle to turn to when exploding (machines with setAngle())
// extras    optional buttons that call a method on the live machine, e.g. play()
//           (only shown when the 3D machine is running and has that method)
// links     href can be a CONFIG key (e.g. "etsy") or a full URL
export const PROJECTS = [
  {
    id: "dissPICable",
    machine: "roast-o-matic",
    aspect: 720 / 760,
    name: "dissPICable",
    line: "Snap any object. It wakes up and roast-battles you.",
    machineLabel: "Roast-o-Matic arcade cabinet",
    awards: ["Best Use of Gemma 4, Hacktoberfest Hack Day Manchester 2026"],
    tech: ["Gemma 4", "ElevenLabs", "Node", "Cloudflare"],
    credits: "Built in one day with Debanjan Ray and Hussain Afham",
    links: [],
    still: "light-assembled.png",
    exploded: "light-exploded.png",
    extras: [{ label: "Play a round", call: "play" }],
    explodeAngle: -8, // the machine turns here when it comes apart, so every part is in view
  },
  {
    id: "kn-layerworks",
    machine: "kn-layerworks",
    aspect: 800 / 760,
    name: "KN Layerworks",
    line: "Name gifts that do something, designed in code and printed to order.",
    machineLabel: "desktop 3D printer with a four-colour AMS",
    outcome: "A live Etsy shop, run end to end with Claude",
    tech: ["OpenSCAD", "BOSL2", "Bambu P1S", "Etsy"],
    credits: "Solo project",
    links: [{ label: "Visit the Etsy shop", href: "etsy" }],
    still: "assembled-light.png",
    exploded: "exploded-light.png",
  },
  {
    id: "ai-beat-studio",
    machine: "ai-beat-studio",
    aspect: 900 / 640,
    name: "AI Beat Studio",
    line: "Tap a rhythm. Gemma 4 turns it into a full track.",
    machineLabel: "player-piano roll punch",
    awards: ["1st, Best Use of OpenLoft", "1st, Applied AI Society Bradford Award"],
    awardNote: "Bradford Agentic AI Hackathon, 3 Oct 2026",
    tech: ["Gemma 4", "Electron", "Tone.js", "ElevenLabs", "Kotlin"],
    credits: "Team build in one day",
    links: [],
    still: "light-assembled.png",
    exploded: "light-exploded.png",
  },
];

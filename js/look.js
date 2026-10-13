// Look F, "neon blueprint": the machines are drawn in their light theme (dark ink on white faces)
// and recoloured by one SVG filter. Luminance in, colour out: ink -> bright #e9f8ff linework,
// greys -> blues, white faces -> deep navy #0c2a4f (tables from mockups/blueprint2.html, filter dF).
//
// The highlighted part: a tone map kills colour, so the machines' accent hook (--anatomy-accent) is set
// to pure red. Red is the only coloured thing in a strictly monochrome drawing, so the filter pulls it out
// as a mask (R - B, thresholded) and paints it safety yellow on top of the tone-mapped drawing. Same pass,
// correct occlusion, no second copy of the linework.
//
// Used by the site (live machines) and by tools/flipbook.html (the pre-rendered frames), so both match.
export const ACCENT_KEY = "#ff0000"; // what the machines draw hovered / selected linework in
export const YELLOW = [1, 0.824, 0.247]; // #ffd23f
const LUM = "0.2126 0.7152 0.0722 0 0";
const T = {
  r: "0.914 0.914 0.914 0.914 0.914 0.914 0.914 0.644 0.374 0.175 0.047",
  g: "0.973 0.973 0.973 0.973 0.973 0.973 0.973 0.808 0.643 0.429 0.165",
  b: "1.000 1.000 1.000 1.000 1.000 1.000 1.000 0.936 0.871 0.663 0.310",
};
// "soft": same colours, but the ramp starts at a darker grey. For machines whose light theme uses
// mid-grey faces (ai-beat-studio), which the standard map would turn into bright white blocks.
const SOFT = {
  r: "0.914 0.914 0.914 0.914 0.800 0.644 0.500 0.374 0.260 0.175 0.047",
  g: "0.973 0.973 0.973 0.973 0.890 0.808 0.720 0.643 0.540 0.429 0.165",
  b: "1.000 1.000 1.000 1.000 0.970 0.936 0.900 0.871 0.770 0.663 0.310",
};
const filter = (id, t) => `  <filter id="${id}" color-interpolation-filters="sRGB" x="-20%" y="-20%" width="140%" height="140%">
    <feColorMatrix in="SourceGraphic" type="matrix" values="${LUM} ${LUM} ${LUM} 0 0 0 1 0" result="lum"/>
    <feComponentTransfer in="lum" result="tone">
      <feFuncR type="table" tableValues="${t.r}"/><feFuncG type="table" tableValues="${t.g}"/><feFuncB type="table" tableValues="${t.b}"/>
    </feComponentTransfer>
    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 ${YELLOW[0]}  0 0 0 0 ${YELLOW[1]}  0 0 0 0 ${YELLOW[2]}  6 0 -6 0 -0.6" result="acc"/>
    <feComposite in="acc" in2="SourceAlpha" operator="in" result="accA"/>
    <feMerge><feMergeNode in="tone"/><feMergeNode in="accA"/></feMerge>
  </filter>`;
export const FILTER_SVG = `<svg width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false">
${filter("bp", T)}
${filter("bp-soft", SOFT)}
</svg>`;

export function installFilters(doc = document) {
  if (doc.getElementById("bp")) return;
  doc.body.insertAdjacentHTML("afterbegin", FILTER_SVG);
}

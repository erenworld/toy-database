// Builds docs/anatomy/db-anatomy.html: an illustrated, byte-exact tour of the toy database.
// Every number below mirrors a constant in main.c; run `node docs/anatomy/build.mjs`.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// ---- truth: same arithmetic as main.c --------------------------------------
const ID_SIZE = 4;
const USERNAME_SIZE = 32 + 1;
const EMAIL_SIZE = 255 + 1;
const ID_OFFSET = 0;
const USERNAME_OFFSET = ID_OFFSET + ID_SIZE;
const EMAIL_OFFSET = USERNAME_OFFSET + USERNAME_SIZE;
const ROW_SIZE = ID_SIZE + USERNAME_SIZE + EMAIL_SIZE;
const STRUCT_ROW = Math.ceil(ROW_SIZE / 4) * 4;
const PAGE_SIZE = 4096;
const TABLE_MAX_PAGES = 100;
const ROWS_PER_PAGE = Math.floor(PAGE_SIZE / ROW_SIZE);
const TABLE_MAX_ROWS = ROWS_PER_PAGE * TABLE_MAX_PAGES;
const PAGE_USED = ROWS_PER_PAGE * ROW_SIZE;
const PAGE_WASTE = PAGE_SIZE - PAGE_USED;
const FIELDS = [
  { name: "id", type: "uint32_t", from: ID_OFFSET, size: ID_SIZE },
  { name: "username", type: "char[33]", from: USERNAME_OFFSET, size: USERNAME_SIZE },
  { name: "email", type: "char[256]", from: EMAIL_OFFSET, size: EMAIL_SIZE },
];
const nf = (n) => n.toLocaleString("fr-FR").replace(/ /g, " ");

const S = (P) => (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

function feetAndPlate(P, plate, plateH, footH, inset = 18) {
  const s = S(P);
  const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  const out = [`<path class="iso-halo" d="${k.haloOf(plate, -plateH - footH, plateH, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(plate, inset))) {
    out.push(s(k.cylinder(x, y, 6, -plateH - footH, 1.4, P, 28), { tone: "lo" }));
    out.push(s(k.cylinder(x, y, 4.6, -plateH - footH + 1.4, footH - 1.4, P, 28), { tone: "mid" }));
  }
  out.push(s(k.slabOf(plate, -plateH, plateH, P, 8, 1.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plate, 4.5), 0, P), { tone: "faint" }));
  const screws = k.corners(plate, 9);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => k.iso([x, y, 0], P)), { size: 0.5 }));
  return out.join("");
}

function ruler(P, strip, from, to, step, every, labels) {
  const s = S(P);
  const out = [s(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" })];
  const ticks = k.topTicks(from, to, step, every, strip.y + 0.6, 0.6, [1.8, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.lineOnTop([from, strip.y + 0.6], [from, strip.y + 4.4], 0.6, P), { tone: "hi" }));
  for (const [at, text] of labels) out.push(k.faceTextSvg(k.topMatrix([at, strip.y + strip.d - 1], 0.6, P, "x"), text, { size: 2.1, tone: "lo", anchor: "middle" }));
  out.push(D([k.iso([strip.x + 1.6, strip.y + strip.d / 2, 0.6], P), k.iso([strip.x + strip.w - 1.6, strip.y + strip.d / 2, 0.6], P)], { size: 0.45 }));
  return out.join("");
}

// ---- Fig 1: a row on a gauge bed, read by a gantry probe --------------------
function rowFigure() {
  const W = 640, H = 300;
  const PLATE = { x: -18, y: -36, w: STRUCT_ROW + 36, d: 84, r: 6 };
  const BED = { x: -5, y: -15, w: STRUCT_ROW + 10, d: 30, r: 1.5 };
  const BLOCK_Y = -12, BLOCK_D = 24, BLOCK_Z = 2, BLOCK_H = 12, TOP = BLOCK_Z + BLOCK_H;
  const RAILS = [-28, 21];
  const BAR_Z = 32;
  const P = k.fitProjection([...k.boxCorners(PLATE, -12, 0), [0, -28, BAR_Z + 8], [STRUCT_ROW, 28, BAR_Z + 8]], W, H, { pad: 26, azimuth: 58 });
  const s = S(P);
  const at = (p) => k.iso(p, P);

  const base = [feetAndPlate(P, PLATE, 8, 4)];
  base.push(k.faceTextSvg(k.sideMatrix([PLATE.x + 14, PLATE.y + PLATE.d], -2.2, P, "left"), "STRUCT ROW · 293 OCTETS SÉRIALISÉS", { size: 2.4, tone: "lo" }));
  const rail = (y) => {
    const out = [s(k.slabOf({ x: -12, y, w: STRUCT_ROW + 24, d: 5, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" })];
    out.push(D([-6, STRUCT_ROW / 2, STRUCT_ROW + 6].map((x) => at([x, y + 2.5, 3])), { size: 0.4 }));
    for (const x of [-16, STRUCT_ROW + 12]) out.push(s(k.slabOf({ x, y: y - 2, w: 4, d: 9, r: 1 }, 0, 7, P, 3, 0.5), { tone: "mid" }));
    return out.join("");
  };
  base.push(rail(RAILS[0]));

  const shoe = (y) => s(k.slabOf({ x: -6, y: y - 1.5, w: 12, d: 8, r: 1.4 }, 3, 4, P, 3, 0.5), { tone: "mid" });
  const post = (y) => s(k.slabOf({ x: -3, y: y + 0.5, w: 6, d: 4, r: 1 }, 7, BAR_Z - 7, P, 3, 0.4), { tone: "mid" });
  const back = [shoe(RAILS[0]), post(RAILS[0]), D([at([-4, RAILS[0] + 1, 7]), at([4, RAILS[0] + 1, 7])], { size: 0.4 })].join("");

  const bed = [s(k.slabOf(BED, 0, BLOCK_Z, P, 3, 0.4), { tone: "lo" })];
  bed.push(L(k.lineOnTop([BED.x + 1, -13.6], [BED.x + BED.w - 1, -13.6], BLOCK_Z, P), { tone: "faint" }));
  const pad = { x: ROW_SIZE, y: BLOCK_Y, w: STRUCT_ROW - ROW_SIZE, d: BLOCK_D, r: 0.3 };
  bed.push(L(k.planOutline(pad, BLOCK_Z, P, 2), { tone: "lo", dotted: true }));

  const blocks = FIELDS.map((field) => {
    const plan = { x: field.from, y: BLOCK_Y, w: field.size, d: BLOCK_D, r: 0.4 };
    const out = [s(k.slabOf(plan, BLOCK_Z, BLOCK_H, P, 2, field.size > 8 ? 0.5 : 0), { tone: "hi", crease: "lo" })];
    const step = field.size > 64 ? 4 : 1;
    const ticks = k.topTicks(field.from + step, field.from + field.size - step, step, 8, BLOCK_Y, TOP, [1.6, 3.2], P);
    out.push(L(ticks.minor, { tone: "faint" }), L(ticks.major, { tone: "lo" }));
    if (field.size > 20) out.push(k.faceTextSvg(k.topMatrix([field.from + 2.5, BLOCK_Y + BLOCK_D - 3], TOP, P, "x"), field.name, { size: 3, tone: "mid" }));
    return { depth: k.depthOf([field.from + field.size / 2, 0, TOP], P), svg: out.join("") };
  }).sort((a, b) => a.depth - b.depth).map((b) => b.svg);

  const probe = [
    s(k.cylinder(0, 0, 1, TOP + 2.4, BAR_Z - TOP - 2.4, P, 16), { tone: "hi", crease: "none", lit: true }),
    s(k.cylinder(0, 0, 1.9, TOP + 0.3, 2.1, P, 20), { tone: "hi", lit: true }),
    L(k.sideArc(0, 0, 1, 24, P, 10), { tone: "lo" }),
  ].join("");
  const front = [shoe(RAILS[1]), post(RAILS[1]), D([at([-4, RAILS[1] + 6, 7]), at([4, RAILS[1] + 6, 7])], { size: 0.4 })].join("");
  const bar = [
    s(k.slabOf({ x: -4.5, y: RAILS[0] - 1, w: 9, d: RAILS[1] - RAILS[0] + 7, r: 1.4 }, BAR_Z, 5, P, 3, 0.6), { tone: "mid" }),
    D([RAILS[0] + 2.5, RAILS[1] + 2.5].map((y) => at([0, y, BAR_Z + 5])), { size: 0.45 }),
    s(k.cylinder(0, 0, 3.4, BAR_Z + 5, 3.4, P, 32), { tone: "mid" }),
    L(k.knurl(0, 0, 3.4, BAR_Z + 5, BAR_Z + 8.4, 26, P), { tone: "lo" }),
    L(k.ring(0, 0, 1.2, BAR_Z + 8.4, P, 14), { tone: "mid" }),
  ].join("");
  const strip = { x: -6, y: 30, w: STRUCT_ROW + 12, d: 8, r: 1 };
  const labels = [0, 32, 64, 96, 128, 160, 192, 224, 256, 288].map((v) => [v, String(v)]);
  const scale = ruler(P, strip, 0, STRUCT_ROW, 4, 8, labels);
  const pointer = [
    s(k.slabOf({ x: -1.4, y: strip.y - 3, w: 2.8, d: 3, r: 0.6 }, 0, 1.2, P, 2), { tone: "hi", lit: true }),
    L(k.lineOnTop([0, strip.y - 0.2], [0, strip.y + 3.6], 0.62, P), { tone: "lit" }),
  ].join("");

  const move = (name, inner) => `<g data-part="${name}" transform="${k.translateAlong(P, [0.5, 0, 0])}">${inner}</g>`;
  const svg = k.figureSvg({
    width: W, height: H,
    label: "Une ligne de 293 octets posée sur un banc : trois blocs, id (4 octets), username (33) et email (256), suivis des 3 octets de padding du struct en mémoire. Un portique glisse le long du banc et sa pointe indique l'octet lu.",
    body: [base.join(""), move("back", back), bed.join(""), blocks.join(""), move("probe", probe), rail(RAILS[1]), move("front", front), move("bar", bar), scale, move("pointer", pointer)],
  });

  const live = `
(() => {
  const fig = document.getElementById("fig-row");
  const stage = fig.querySelector(".iso-stage"), svg = stage.querySelector("svg");
  const parts = ["back", "probe", "front", "bar", "pointer"].map((n) => svg.querySelector('[data-part="' + n + '"]'));
  const readout = fig.querySelector("[data-readout]");
  const P = ${JSON.stringify(P)};
  const FIELDS = ${JSON.stringify(FIELDS)}, ROW = ${ROW_SIZE}, STRUCT = ${STRUCT_ROW};
  const stops = [0, 2, 4, 20, 36, 37, 48, 160, 292, 294];
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let x = 0.5, target = 0.5, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idle = 0;
  const label = (o) => {
    if (o >= ROW) return "octet " + o + " · padding (struct en RAM, jamais copié)";
    const f = FIELDS.find((f) => o >= f.from && o < f.from + f.size);
    return "octet " + o + " · " + f.name + "[" + (o - f.from) + "] · offset " + f.from;
  };
  const draw = () => {
    const t = translateAlong(P, [x, 0, 0]);
    parts.forEach((p) => p.setAttribute("transform", t));
    const text = label(Math.max(0, Math.min(STRUCT - 1, Math.floor(x))));
    if (readout.textContent !== text) readout.textContent = text;
    stage.setAttribute("aria-valuetext", text);
  };
  const tick = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
    if (touring) { clock += dt; target = stops[Math.floor(clock / 1.8) % stops.length] + 0.5; }
    x = still.matches ? target : x + (target - x) * (1 - Math.exp(-dt / 0.3));
    if (Math.abs(target - x) < 0.01) x = target;
    draw();
    frame = visible && (touring || x !== target) ? requestAnimationFrame(tick) : 0;
  };
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  const steer = (o) => { touring = false; target = Math.max(0, Math.min(STRUCT - 1, Math.round(o))) + 0.5; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 4000); run(); };
  new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }).observe(stage);
  stage.addEventListener("pointermove", (e) => {
    const box = svg.getBoundingClientRect();
    const a = iso([0, 0, 0], P), b = iso([STRUCT, 0, 0], P);
    const vx = (e.clientX - box.left) / box.width * ${W};
    steer((vx - a[0]) / (b[0] - a[0]) * STRUCT);
  });
  stage.addEventListener("keydown", (e) => {
    const o = Math.floor(target);
    const step = e.shiftKey ? 16 : 1;
    let to = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") to = o + step;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = o - step;
    if (e.key === "Home") to = 0;
    if (e.key === "End") to = ROW - 1;
    if (to === null) return;
    e.preventDefault(); steer(to);
  });
  draw();
})();
`;
  const body = k.plateHtml({
    fig: "Fig 1",
    title: "Une ligne · 293 octets",
    hint: "Survolez le banc · ← → octet par octet",
    readout: label0(),
    keys: [
      { mark: "lit", label: "Le palpeur : l'octet lu, et son champ" },
      { mark: "raised", label: `Trois champs à 1 unité = 1 octet : id ${ID_SIZE}, username ${USERNAME_SIZE}, email ${EMAIL_SIZE}` },
      { mark: "line", label: "Contour pointillé : 3 octets de padding, présents dans struct Row (296) mais pas dans la page" },
    ],
    caption: `serialize_row copie les trois champs bout à bout : id à l'offset ${ID_OFFSET}, username à ${USERNAME_OFFSET}, email à ${EMAIL_OFFSET}, total ROW_SIZE = ${ROW_SIZE}. La règle avance par 4 octets, un grand trait tous les 32.`,
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Octet lu dans la ligne" aria-valuemin="0" aria-valuemax="${STRUCT_ROW - 1}">${svg}</div>`,
  });
  return { html: `<div id="fig-row">${body}</div>`, live };
}
function label0() { return "octet 0 · id[0] · offset 0"; }

// ---- Fig 2: one 4 KB page as a drawer of 13 row cards -----------------------
function pageFigure() {
  const W = 640, H = 300;
  const U = 8; // 1 unit = 8 bytes
  const LEN = PAGE_SIZE / U, CARD = ROW_SIZE / U, TAIL = PAGE_USED / U;
  const PLATE = { x: -22, y: -40, w: LEN + 52, d: 92, r: 6 };
  const WALL_H = 11, CARD_Z = 2, CARD_H = 6, LIFT = 14;
  const P = k.fitProjection([...k.boxCorners(PLATE, -12, 0), [0, -22, WALL_H + 2], [CARD, 0, CARD_Z + CARD_H + LIFT], [LEN + 6, 22, 18]], W, H, { pad: 22, azimuth: 60 });
  const s = S(P);
  const at = (p) => k.iso(p, P);
  const out = [feetAndPlate(P, PLATE, 8, 4, 22)];
  for (const y of [-27, 21]) {
    out.push(s(k.slabOf({ x: -6, y, w: LEN + 12, d: 6, r: 1 }, 0, 2.4, P, 3, 0.4), { tone: "lo" }));
    out.push(D([0, LEN / 2, LEN].map((x) => at([x, y + 3, 2.4])), { size: 0.4 }));
  }
  const Z0 = 2.4;
  out.push(s(k.slabOf({ x: -2, y: -24, w: LEN + 2, d: 2, r: 0.4 }, Z0, WALL_H, P, 2, 0.3), { tone: "mid" }));
  out.push(s(k.slabOf({ x: -4, y: -24, w: 2, d: 48, r: 0.4 }, Z0, WALL_H, P, 2, 0.3), { tone: "mid" }));
  out.push(s(k.slabOf({ x: -2, y: -22, w: LEN + 2, d: 44, r: 0.4 }, Z0, CARD_Z, P, 2), { tone: "lo" }));
  const FZ = Z0 + CARD_Z;
  const hatch = [];
  for (let x = TAIL + 3; x < LEN + 22; x += 4) {
    const a = [Math.min(x, LEN), -22 + Math.max(0, x - LEN)], b = [Math.max(TAIL, x - 44), -22 + Math.min(44, x - TAIL)];
    if (a[1] < 22 && b[0] <= LEN) hatch.push(k.lineOnTop(a, b, FZ, P));
  }
  out.push(L(hatch.join(""), { tone: "faint" }));
  out.push(L(k.lineOnTop([TAIL, -22], [TAIL, 22], FZ, P), { tone: "lo" }));

  const card = (i, lit = false) => {
    const x = i * CARD;
    const plan = { x: x + 0.15, y: -18, w: CARD - 0.3, d: 36, r: 0.5 };
    const top = FZ + CARD_H;
    const parts = [s(k.slabOf(plan, FZ, CARD_H, P, 2, 0.4), { tone: "hi", crease: "lo", lit })];
    parts.push(L([USERNAME_OFFSET, EMAIL_OFFSET].map((o) => k.lineOnTop([x + o / U, -18], [x + o / U, 18], top, P)).join(""), { tone: lit ? "mid" : "lo" }));
    parts.push(L(k.lineOnTop([x + EMAIL_OFFSET / U + 1.5, -14], [x + CARD - 1.5, -14], top, P), { tone: "faint" }));
    parts.push(k.faceTextSvg(k.topMatrix([x + CARD / 2, 13.5], top, P, "x"), String(i), { size: 4.2, tone: lit ? "hi" : "mid", anchor: "middle" }));
    return parts.join("");
  };
  for (let i = 0; i < ROWS_PER_PAGE; i++) out.push(`<g data-card="${i}">${card(i)}</g>`);
  out.push(s(k.slabOf({ x: -2, y: 22, w: LEN + 2, d: 2, r: 0.4 }, Z0, WALL_H, P, 2, 0.3), { tone: "mid" }));
  out.push(D(Array.from({ length: ROWS_PER_PAGE + 1 }, (_, i) => at([i * CARD, 23, Z0 + WALL_H])), { size: 0.5, tone: "hi" }));
  const front = { x: LEN, y: -27, w: 4, d: 54, r: 1 };
  out.push(s(k.slabOf(front, Z0, WALL_H + 6, P, 3, 0.6), { tone: "mid" }));
  out.push(L(k.segment([LEN + 4, -20, Z0 + WALL_H + 2], [LEN + 4, 20, Z0 + WALL_H + 2], P) + k.segment([LEN + 4, -20, Z0 + 3], [LEN + 4, 20, Z0 + 3], P) + k.segment([LEN + 4, -20, Z0 + 3], [LEN + 4, -20, Z0 + WALL_H + 2], P) + k.segment([LEN + 4, 20, Z0 + 3], [LEN + 4, 20, Z0 + WALL_H + 2], P), { tone: "faint" }));
  for (const y of [-10, 10]) out.push(s(k.slabOf({ x: LEN + 4, y: y - 1.2, w: 4, d: 2.4, r: 0.6 }, Z0 + 7, 2.4, P, 2), { tone: "mid" }));
  out.push(s(k.slabOf({ x: LEN + 8, y: -12, w: 2.4, d: 24, r: 1 }, Z0 + 7, 2.4, P, 3, 0.3), { tone: "mid" }));
  out.push(D([[-23, 3], [23, 3], [-23, 14], [23, 14]].map(([y, z]) => at([LEN + 4, y, Z0 + z])), { size: 0.45 }));
  const strip = { x: -6, y: 33, w: LEN + 12, d: 8, r: 1 };
  out.push(ruler(P, strip, 0, LEN, 16, 8, [0, 1024, 2048, 3072, 4096].map((b) => [b / U, String(b)])));
  out.push(`<g data-part="lifted" transform="${k.translateAlong(P, [0, 0, LIFT])}">${card(0, true)}</g>`);

  const svg = k.figureSvg({
    width: W, height: H,
    label: "Une page de 4096 octets dessinée comme un tiroir : 13 lignes de 293 octets rangées bout à bout, puis 287 octets hachurés qui restent vides. La ligne choisie se soulève.",
    body: out,
  });
  const live = `
(() => {
  const fig = document.getElementById("fig-page");
  const stage = fig.querySelector(".iso-stage"), svg = stage.querySelector("svg");
  const lifted = svg.querySelector('[data-part="lifted"]');
  const cards = [...svg.querySelectorAll("[data-card]")];
  const readout = fig.querySelector("[data-readout]");
  const P = ${JSON.stringify(P)}, CARD = ${CARD}, N = ${ROWS_PER_PAGE}, ROW = ${ROW_SIZE}, LIFT = ${LIFT}, LEN = ${LEN};
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let pick = 0, z = LIFT, want = LIFT, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idle = 0;
  const text = () => pick >= N
    ? "octets ${PAGE_USED}–${PAGE_SIZE - 1} · ${PAGE_WASTE} octets inutilisés"
    : "row " + pick + " · byte_offset " + pick * ROW + " · octets " + pick * ROW + "–" + (pick * ROW + ROW - 1);
  const show = (i) => {
    pick = i;
    cards.forEach((c, j) => c.style.visibility = j === i ? "hidden" : "");
    lifted.style.display = i >= N ? "none" : "";
    readout.textContent = text();
    stage.setAttribute("aria-valuetext", text());
  };
  const draw = () => lifted.setAttribute("transform", translateAlong(P, [pick * CARD, 0, z]));
  const tick = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
    if (touring) { clock += dt; const i = Math.floor(clock / 1.6) % (N + 1); if (i !== pick) { show(i); z = 0; } }
    z = still.matches ? want : z + (want - z) * (1 - Math.exp(-dt / 0.22));
    if (Math.abs(want - z) < 0.01) z = want;
    draw();
    frame = visible && (touring || z !== want) ? requestAnimationFrame(tick) : 0;
  };
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  const steer = (i) => { touring = false; i = Math.max(0, Math.min(N, i)); if (i !== pick) { show(i); z = 0; } clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; clock = pick * 1.6; run(); }, 4000); run(); };
  new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }).observe(stage);
  stage.addEventListener("pointermove", (e) => {
    const box = svg.getBoundingClientRect();
    const a = iso([0, 0, 0], P), b = iso([LEN, 0, 0], P);
    const vx = (e.clientX - box.left) / box.width * ${W};
    steer(Math.floor((vx - a[0]) / (b[0] - a[0]) * LEN / CARD));
  });
  stage.addEventListener("keydown", (e) => {
    let to = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") to = pick + 1;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = pick - 1;
    if (e.key === "Home") to = 0;
    if (e.key === "End") to = N;
    if (to === null) return;
    e.preventDefault(); steer(to);
  });
  show(0); draw();
})();
`;
  const body = k.plateHtml({
    fig: "Fig 2",
    title: "Une page · 4096 octets",
    hint: "Survolez le tiroir · ← → ligne par ligne",
    readout: `row 0 · byte_offset 0 · octets 0–${ROW_SIZE - 1}`,
    keys: [
      { mark: "lit", label: "La ligne row_offset, soulevée de sa place" },
      { mark: "raised", label: `${ROWS_PER_PAGE} lignes de ${ROW_SIZE} octets, 1 unité = 8 octets` },
      { mark: "flat", label: `Zone hachurée : ${PAGE_WASTE} octets jamais utilisés` },
    ],
    caption: `ROWS_PER_PAGE = ${PAGE_SIZE} / ${ROW_SIZE} = ${ROWS_PER_PAGE} (division entière). Les lignes ne chevauchent jamais deux pages : ${ROWS_PER_PAGE} × ${ROW_SIZE} = ${PAGE_USED} octets servent, les ${PAGE_WASTE} derniers (${((PAGE_WASTE / PAGE_SIZE) * 100).toFixed(1)} %) restent vides. Sur chaque carte, les deux traits marquent les offsets ${USERNAME_OFFSET} et ${EMAIL_OFFSET}.`,
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Ligne choisie dans la page" aria-valuemin="0" aria-valuemax="${ROWS_PER_PAGE}">${svg}</div>`,
  });
  return { html: `<div id="fig-page">${body}</div>`, live };
}

// ---- Fig 3: the table as a cabinet of 100 page drawers ----------------------
function tableFigure() {
  const W = 640, H = 420;
  const CW = 20, CH = 11, COLS = 10, ROWS = 10, BASE_Z = 6;
  const BODY = { x: -4, y: -36, w: COLS * CW + 8, d: 36, r: 1.2 };
  const TOPZ = BASE_Z + ROWS * CH + 3;
  const COUNTER = { x: 62, y: -24, w: 76, d: 18, r: 1.4 }, COUNTER_H = 13;
  const PULL = 7;
  const P = k.fitProjection([...k.boxCorners({ x: -14, y: -46, w: COLS * CW + 28, d: 64 }, -6, 0), [100, -24, TOPZ + COUNTER_H + 2], [0, 0, TOPZ], [COLS * CW, 3 + PULL, 0]], W, H, { pad: 24, azimuth: 56 });
  const s = S(P);
  const at = (p) => k.iso(p, P);
  const cell = (i) => ({ x0: (i % COLS) * CW, z0: BASE_Z + (ROWS - 1 - Math.floor(i / COLS)) * CH });
  const out = [];
  const PLINTH = { x: -12, y: -44, w: COLS * CW + 24, d: 62, r: 4 };
  out.push(feetAndPlate(P, PLINTH, 6, 0.01, 12));
  out.push(s(k.slabOf(BODY, 0, TOPZ, P, 3, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BODY, 3), TOPZ, P, 3), { tone: "faint" }));
  out.push(D(k.corners(BODY, 6).map(([x, y]) => at([x, y, TOPZ])), { size: 0.5 }));
  const face = (x, z) => [x, 0, z];
  const rect = (x0, z0, w, h, y = 0) => k.pathOf([[x0, y, z0], [x0 + w, y, z0], [x0 + w, y, z0 + h], [x0, y, z0 + h]].map(at), true);
  const recess = [];
  for (let i = 0; i < 100; i++) { const { x0, z0 } = cell(i); recess.push(rect(x0 + 1, z0 + 1, CW - 2, CH - 2)); }
  out.push(`<path class="iso-fill" d="${recess.join("")}" style="fill:var(--anatomy-shade-0)"/>`);
  out.push(L(recess.join(""), { tone: "lo" }));
  out.push(L(k.segment(face(-4, BASE_Z - 1), face(COLS * CW + 4, BASE_Z - 1), P), { tone: "faint" }));
  const drawer = (i, lit = false) => {
    const { x0, z0 } = cell(i);
    const parts = [s(k.slabOf({ x: x0 + 1.6, y: lit ? -PULL : 0, w: CW - 3.2, d: lit ? 3 + PULL : 3, r: 0.4 }, z0 + 1.6, CH - 3.2, P, 2, 0.3), { tone: lit ? "hi" : "mid", crease: "lo", lit })];
    parts.push(L(rect(x0 + 4, z0 + 5.4, 6, 2.6, 3), { tone: lit ? "mid" : "lo" }));
    parts.push(s(k.slabOf({ x: x0 + 12, y: 3, w: 4, d: 1.2, r: 0.4 }, z0 + 4.4, 1.4, P, 2), { tone: lit ? "hi" : "mid", crease: "none" }));
    parts.push(D([at([x0 + 3, 3, z0 + 3]), at([x0 + CW - 3, 3, z0 + 3])], { size: 0.35, tone: "lo" }));
    return parts.join("");
  };
  const order = Array.from({ length: 100 }, (_, i) => i).sort((a, b) => cell(a).z0 - cell(b).z0 || cell(a).x0 - cell(b).x0);
  for (const i of order) out.push(`<g data-page="${i}">${drawer(i)}</g>`);
  out.push(s(k.slabOf(COUNTER, TOPZ, COUNTER_H, P, 3, 0.6), { tone: "mid" }));
  const win = { x: COUNTER.x + 8, w: 60, z: TOPZ + 3, h: 7.4 };
  const fy = COUNTER.y + COUNTER.d;
  out.push(`<path class="iso-fill" d="${rect(win.x, win.z, win.w, win.h, fy)}" style="fill:var(--anatomy-shade-0)"/>`);
  out.push(L(rect(win.x, win.z, win.w, win.h, fy), { tone: "lo" }));
  for (let d = 1; d < 4; d++) out.push(L(k.segment([win.x + d * 15, fy, win.z], [win.x + d * 15, fy, win.z + win.h], P), { tone: "faint" }));
  const digitAt = (d) => k.sideMatrix([win.x + d * 15 + 7.5, fy], win.z + win.h - 0.8, P, "left");
  out.push(Array.from({ length: 4 }, (_, d) => `<g transform="${digitAt(d)}"><text class="iso-face-text" data-tone="hi" font-size="5.6" text-anchor="middle" y="5" data-digit="${d}">0</text></g>`).join(""));
  out.push(s(k.cylinder(COUNTER.x + COUNTER.w - 4, COUNTER.y + COUNTER.d / 2, 3.2, TOPZ + COUNTER_H, 3, P, 28), { tone: "mid" }));
  out.push(L(k.knurl(COUNTER.x + COUNTER.w - 4, COUNTER.y + COUNTER.d / 2, 3.2, TOPZ + COUNTER_H, TOPZ + COUNTER_H + 3, 24, P), { tone: "lo" }));
  out.push(D([[COUNTER.x + 3, fy, TOPZ + 2.5], [COUNTER.x + 3, fy, TOPZ + COUNTER_H - 2.5]].map(at), { size: 0.45 }));
  out.push(k.faceTextSvg(k.sideMatrix([COUNTER.x + 3, fy], TOPZ + COUNTER_H + 0.01, P, "left"), "", { size: 1 }));
  out.push(k.faceTextSvg(k.sideMatrix([BODY.x + 5, 0], 4.6, P, "left"), "TABLE · VOID *PAGES[100]", { size: 2.4, tone: "lo" }));
  out.push(`<g data-part="open" transform="${k.translateAlong(P, [0, PULL, 0])}">${drawer(0, true)}</g>`);

  const svg = k.figureSvg({
    width: W, height: H,
    label: "La table dessinée comme un meuble de 100 tiroirs, un par pointeur de pages[100]. Un compteur num_rows sur le dessus. Les tiroirs n'existent qu'une fois alloués par malloc ; le tiroir de la page qui reçoit la prochaine insertion est tiré.",
    body: out,
  });
  const live = `
(() => {
  const fig = document.getElementById("fig-table");
  const stage = fig.querySelector(".iso-stage"), svg = stage.querySelector("svg");
  const P = ${JSON.stringify(P)}, N = ${ROWS_PER_PAGE}, MAX = ${TABLE_MAX_ROWS}, PAGE = ${PAGE_SIZE}, CW = ${CW}, CH = ${CH}, COLS = ${COLS}, ROWS = ${ROWS}, PULL = ${PULL};
  const drawers = []; svg.querySelectorAll("[data-page]").forEach((g) => drawers[+g.dataset.page] = g);
  const open = svg.querySelector('[data-part="open"]');
  const digits = [...svg.querySelectorAll("[data-digit]")];
  const readout = fig.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const fmt = (n) => n.toLocaleString("fr-FR").replace(/\\u202f/g, " ");
  let rows = -1, shown = 0, target = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idle = 0;
  const set = (n) => {
    n = Math.max(0, Math.min(MAX, Math.round(n)));
    if (n === rows) return; rows = n;
    const pages = Math.ceil(n / N);
    const cur = n >= MAX ? -1 : Math.floor(n / N);
    drawers.forEach((g, i) => g.style.display = i < pages && i !== cur ? "" : "none");
    if (cur < 0) open.style.display = "none";
    else {
      open.style.display = "";
      const dx = (cur % COLS) * CW, dz = -Math.floor(cur / COLS) * CH;
      open.setAttribute("transform", translateAlong(P, [dx, PULL, dz]));
    }
    String(n).padStart(4, "0").split("").forEach((c, d) => digits[d].textContent = c);
    const text = n >= MAX
      ? "num_rows " + fmt(n) + " · 100 pages · table pleine"
      : "num_rows " + fmt(n) + " · " + pages + " page" + (pages > 1 ? "s" : "") + " · " + fmt(pages * PAGE) + " o";
    readout.textContent = text; stage.setAttribute("aria-valuetext", text);
  };
  const tick = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
    if (touring) { clock += dt; const t = clock % 14; target = t < 11 ? MAX * Math.pow(t / 11, 1.6) : t < 13 ? MAX : 0; }
    shown = still.matches || target === 0 ? target : shown + (target - shown) * (1 - Math.exp(-dt / 0.25));
    if (Math.abs(target - shown) < 0.5) shown = target;
    set(shown);
    frame = visible && (touring || shown !== target) ? requestAnimationFrame(tick) : 0;
  };
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  const steer = (n) => { touring = false; target = Math.max(0, Math.min(MAX, n)); clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 5000); run(); };
  new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }).observe(stage);
  stage.addEventListener("pointermove", (e) => {
    const box = svg.getBoundingClientRect();
    steer(Math.round(Math.max(0, Math.min(1, ((e.clientX - box.left) / box.width - 0.12) / 0.76)) * MAX));
  });
  stage.addEventListener("keydown", (e) => {
    let to = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") to = rows + (e.shiftKey ? N * 10 : N);
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = rows - (e.shiftKey ? N * 10 : N);
    if (e.key === "Home") to = 0;
    if (e.key === "End") to = MAX;
    if (to === null) return;
    e.preventDefault(); steer(to);
  });
  set(${ROWS_PER_PAGE * 27 + 5});
})();
`;
  const body = k.plateHtml({
    fig: "Fig 3",
    title: "La table · 100 pages",
    hint: "Survolez · ← → une page",
    readout: "num_rows",
    keys: [
      { mark: "lit", label: "Le tiroir tiré : la page où ira la prochaine ligne" },
      { mark: "raised", label: "Tiroirs présents : pages déjà allouées (malloc 4096)" },
      { mark: "flat", label: "Cases vides : pointeurs encore à NULL" },
    ],
    caption: `Table = num_rows + void *pages[${TABLE_MAX_PAGES}], soit 808 octets. Une page n'est allouée que quand row_slots y écrit pour la première fois. Pleine, la table tient ${nf(TABLE_MAX_ROWS)} lignes dans ${nf(TABLE_MAX_PAGES * PAGE_SIZE)} octets de pages ; la ${nf(TABLE_MAX_ROWS + 1)}ᵉ renvoie EXECUTE_TABLE_FULL.`,
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Nombre de lignes dans la table" aria-valuemin="0" aria-valuemax="${TABLE_MAX_ROWS}">${svg}</div>`,
  });
  return { html: `<div id="fig-table">${body}</div>`, live };
}

// ---- hex dump of `insert 1 cstack foo@bar.com` --------------------------------
function hexDump() {
  const bytes = [];
  const id = 1, user = "cstack", email = "foo@bar.com";
  for (let i = 0; i < 4; i++) bytes.push({ f: "id", v: (id >> (8 * i)) & 255 });
  for (let i = 0; i < USERNAME_SIZE; i++) bytes.push({ f: "username", v: i < user.length ? user.charCodeAt(i) : i === user.length ? 0 : null });
  for (let i = 0; i < EMAIL_SIZE; i++) bytes.push({ f: "email", v: i < email.length ? email.charCodeAt(i) : i === email.length ? 0 : null });
  const cells = bytes.map((b, o) => {
    const hex = b.v === null ? "··" : b.v.toString(16).padStart(2, "0");
    const ch = b.v === null ? "indéterminé" : b.v === 0 ? "\\0" : b.v >= 32 && b.v < 127 ? `'${String.fromCharCode(b.v)}'` : `0x${hex}`;
    const kind = b.v === null ? " data-undef" : b.v === 0 && b.f !== "id" ? " data-nul" : "";
    return `<span class="hx" data-f="${b.f}"${kind} data-o="${o}" title="octet ${o} · ${b.f} · ${ch}">${hex}</span>`;
  });
  return `<div class="hexdump" role="img" aria-label="Les 293 octets de la ligne insert 1 cstack foo@bar.com">${cells.join("")}</div><p class="hexinfo" aria-live="polite">Survolez un octet.</p>`;
}

// ---- page ------------------------------------------------------------------
const row = rowFigure(), page = pageFigure(), table = tableFigure();
const DOC_CSS = `
.doc h1{font-size:30px;line-height:1.15;letter-spacing:-.02em;color:var(--anatomy-strong);margin:0 0 10px;font-weight:600}
.doc h2{font-size:19px;color:var(--anatomy-strong);margin:64px 0 10px;font-weight:600;letter-spacing:-.01em}
.doc h3{font-size:14px;color:var(--anatomy-strong);margin:28px 0 6px;font-weight:600}
.doc p,.doc li{max-width:68ch}
.doc code{font-family:var(--anatomy-mono);font-size:12.5px;color:var(--anatomy-strong)}
.doc pre{font-family:var(--anatomy-mono);font-size:12.5px;line-height:1.6;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-faint);padding:14px 16px;overflow-x:auto;color:var(--anatomy-strong)}
.doc pre .c{color:var(--anatomy-muted)}
.eyebrow{font-family:var(--anatomy-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--anatomy-muted);margin-bottom:14px}
.lede{font-size:15.5px;color:var(--anatomy-text)}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--anatomy-faint);box-shadow:0 0 0 1px var(--anatomy-faint);margin:28px 0 8px}
.stat{background:var(--anatomy-card);padding:14px 14px 12px}
.stat b{display:block;font:600 22px/1.1 var(--anatomy-mono);color:var(--anatomy-strong);font-variant-numeric:tabular-nums}
.stat span{font-size:12px;color:var(--anatomy-muted)}
.tbl{width:100%;border-collapse:collapse;font-size:13px;margin:12px 0}
.tbl th{text-align:left;font-weight:500;color:var(--anatomy-muted);font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;padding:6px 10px;border-bottom:1px solid var(--anatomy-mid)}
.tbl td{padding:7px 10px;border-bottom:1px solid var(--anatomy-faint);font-variant-numeric:tabular-nums}
.tbl td.n{text-align:right;font-family:var(--anatomy-mono)}
.tbl-wrap{overflow-x:auto}
.bar{display:flex;height:34px;margin:14px 0 4px;box-shadow:0 0 0 1px var(--anatomy-mid)}
.bar>div{display:flex;align-items:center;justify-content:center;font:11px var(--anatomy-mono);color:var(--anatomy-strong);border-right:1px solid var(--anatomy-mid);min-width:0;overflow:hidden;white-space:nowrap}
.bar>div:last-child{border-right:0}
.bar-legend{display:flex;justify-content:space-between;font:11px var(--anatomy-mono);color:var(--anatomy-muted)}
[data-f="id"]{--tint:var(--anatomy-red)}[data-f="username"]{--tint:var(--anatomy-green)}[data-f="email"]{--tint:var(--anatomy-blue)}[data-f="pad"]{--tint:var(--anatomy-mid)}[data-f="waste"]{--tint:var(--anatomy-mid)}
.bar>div[data-f]{background:color-mix(in srgb,var(--tint) 22%,var(--anatomy-card))}
.bar>div[data-f="pad"],.bar>div[data-f="waste"]{background:repeating-linear-gradient(135deg,transparent 0 4px,color-mix(in srgb,var(--anatomy-mid) 40%,transparent) 4px 5px)}
.hexdump{display:grid;grid-template-columns:repeat(32,1fr);gap:2px;margin:16px 0 6px;font:10.5px/1 var(--anatomy-mono)}
.hx{aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--tint) 26%,var(--anatomy-card));color:var(--anatomy-strong);cursor:default}
.hx[data-undef]{background:color-mix(in srgb,var(--tint) 7%,var(--anatomy-card));color:var(--anatomy-muted)}
.hx[data-nul]{box-shadow:inset 0 0 0 1px var(--tint)}
.hx:hover,.hx.on{outline:1.5px solid var(--anatomy-lit);outline-offset:0;position:relative;z-index:1}
.hexinfo{font:12px var(--anatomy-mono);color:var(--anatomy-text);min-height:1.6em}
.swatches{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:12px;color:var(--anatomy-muted)}
.swatches i{display:inline-block;width:10px;height:10px;margin-right:6px;vertical-align:-1px;background:color-mix(in srgb,var(--tint) 40%,var(--anatomy-card))}
.note{border-left:2px solid var(--anatomy-mid);padding:2px 0 2px 14px;color:var(--anatomy-text)}
.theme{position:fixed;top:14px;right:16px;font:11px var(--anatomy-mono);letter-spacing:.08em;text-transform:uppercase;background:var(--anatomy-card);color:var(--anatomy-text);border:0;box-shadow:0 0 0 1px var(--anatomy-mid);padding:7px 10px;cursor:pointer;z-index:5}
.toc{display:flex;flex-wrap:wrap;gap:4px 18px;font-size:13px;margin-top:18px}
.toc a{color:var(--anatomy-text);text-decoration:none;border-bottom:1px solid var(--anatomy-faint)}
.toc a:hover{color:var(--anatomy-strong)}
.iso-stage{outline:none}.iso-stage:focus-visible{box-shadow:0 0 0 1.5px var(--anatomy-mid)}
@media (max-width:640px){.stats{grid-template-columns:repeat(2,1fr)}.hexdump{grid-template-columns:repeat(16,1fr)}.doc h1{font-size:25px}}
`;
const pct = (n, of) => `${((n / of) * 100).toFixed(2).replace(".", ",")} %`;
const bar = (segs, total) => `<div class="bar">${segs.map(([f, n, text]) => `<div data-f="${f}" style="flex:${n} 1 0" title="${text}">${n / total > 0.06 ? text : ""}</div>`).join("")}</div>`;

const body = `
<article class="doc">
<button class="theme" type="button" data-theme-toggle>Thème</button>
<div class="eyebrow">toy-database · main.c · anatomie</div>
<h1>Anatomie de la base, octet par octet</h1>
<p class="lede">Toute la base tient dans un tableau de pages de 4 Ko en mémoire. Ce document suit une ligne depuis la commande <code>insert</code> jusqu'à sa place exacte dans une page, avec chaque taille, chaque offset et chaque octet perdu. Tous les nombres sont recalculés depuis les constantes de <code>main.c</code> et vérifiés avec <code>sizeof</code> / <code>offsetof</code> sur macOS arm64.</p>
<div class="stats">
  <div class="stat"><b>${ROW_SIZE}</b><span>octets par ligne</span></div>
  <div class="stat"><b>${ROWS_PER_PAGE}</b><span>lignes par page</span></div>
  <div class="stat"><b>${nf(TABLE_MAX_ROWS)}</b><span>lignes max</span></div>
  <div class="stat"><b>${nf(TABLE_MAX_PAGES * PAGE_SIZE + 808)}</b><span>octets, table pleine</span></div>
</div>
<nav class="toc"><a href="#ligne">1 · La ligne</a><a href="#octets">2 · Les 293 octets</a><a href="#page">3 · La page</a><a href="#table">4 · La table</a><a href="#structs">5 · Les structs</a><a href="#cycle">6 · Le trajet d'un insert</a><a href="#limites">7 · Limites</a></nav>

<h2 id="ligne">1 · La ligne : ${ROW_SIZE} octets</h2>
<p>Le schéma est fixe : un entier et deux chaînes. Chaque chaîne réserve un octet de plus que sa longueur maximale pour le <code>\\0</code> final, d'où <code>username[33]</code> et <code>email[256]</code>.</p>
${row.html}
<div class="tbl-wrap"><table class="tbl">
<thead><tr><th>Champ</th><th>Type C</th><th style="text-align:right">Taille</th><th style="text-align:right">Offset</th><th style="text-align:right">Octets</th><th style="text-align:right">Part</th></tr></thead>
<tbody>
${FIELDS.map((f) => `<tr><td><code>${f.name}</code></td><td><code>${f.type}</code></td><td class="n">${f.size}</td><td class="n">${f.from}</td><td class="n">${f.from}–${f.from + f.size - 1}</td><td class="n">${pct(f.size, ROW_SIZE)}</td></tr>`).join("")}
<tr><td><b>ROW_SIZE</b></td><td></td><td class="n"><b>${ROW_SIZE}</b></td><td></td><td class="n">0–${ROW_SIZE - 1}</td><td class="n">100 %</td></tr>
<tr><td><code>sizeof(Row)</code></td><td>struct en RAM</td><td class="n">${STRUCT_ROW}</td><td></td><td class="n">+${STRUCT_ROW - ROW_SIZE} padding</td><td></td></tr>
</tbody></table></div>
${bar([["id", ID_SIZE, "id 4"], ["username", USERNAME_SIZE, "username 33"], ["email", EMAIL_SIZE, "email 256"], ["pad", STRUCT_ROW - ROW_SIZE, "pad 3"]], STRUCT_ROW)}
<div class="bar-legend"><span>0</span><span>${USERNAME_OFFSET}</span><span>${EMAIL_OFFSET}</span><span>${ROW_SIZE} · ${STRUCT_ROW}</span></div>
<p class="note">Pourquoi 296 et pas 293 ? <code>uint32_t</code> s'aligne sur 4 octets, donc le compilateur arrondit <code>sizeof(Row)</code> au multiple de 4 suivant. <code>serialize_row</code> copie champ par champ avec <code>memcpy</code> et ne copie donc jamais ces 3 octets : la forme sérialisée est plus compacte que le struct.</p>

<h2 id="octets">2 · Les 293 octets d'une vraie ligne</h2>
<p>Voici exactement ce que <code>insert 1 cstack foo@bar.com</code> écrit dans la page. L'id est en little-endian (<code>01 00 00 00</code>). Après chaque <code>\\0</code>, les octets restants sont copiés tels quels depuis le <code>Statement</code> sur la pile : leur valeur n'est pas définie.</p>
<div class="swatches"><span data-f="id"><i></i>id</span><span data-f="username"><i></i>username</span><span data-f="email"><i></i>email</span><span><i style="--tint:var(--anatomy-mid);background:transparent;box-shadow:inset 0 0 0 1px var(--anatomy-mid)"></i>\\0 terminal</span><span><i style="--tint:var(--anatomy-faint)"></i>·· indéterminé</span></div>
${hexDump()}
<p>Sur ${ROW_SIZE} octets, seuls ${4 + 7 + 12} portent la donnée de cette ligne (4 d'id, 6 + 1 de username, 11 + 1 d'email) : ${pct(23, ROW_SIZE)}. Le reste est la réserve de largeur fixe.</p>

<h2 id="page">3 · La page : ${PAGE_SIZE} octets, ${ROWS_PER_PAGE} lignes</h2>
<p>Une page est un bloc brut de <code>PAGE_SIZE = 4096</code> octets, la taille d'une page mémoire classique. Les lignes y sont rangées bout à bout et ne débordent jamais sur la page suivante.</p>
${page.html}
${bar([...Array.from({ length: ROWS_PER_PAGE }, (_, i) => [i % 2 ? "username" : "email", ROW_SIZE, String(i)]), ["waste", PAGE_WASTE, String(PAGE_WASTE)]], PAGE_SIZE)}
<div class="bar-legend"><span>0</span><span>${PAGE_USED}</span><span>${PAGE_SIZE}</span></div>
<pre><span class="c">// row_slots(table, row_num), main.c</span>
page_num    = row_num / ${ROWS_PER_PAGE};          <span class="c">// ROWS_PER_PAGE</span>
row_offset  = row_num % ${ROWS_PER_PAGE};
byte_offset = row_offset * ${ROW_SIZE};       <span class="c">// ROW_SIZE</span>
<span class="c">// exemple : row_num = 27 → page 2, slot 1, octets 293–585</span></pre>
<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Slot</th>${Array.from({ length: ROWS_PER_PAGE }, (_, i) => `<th style="text-align:right">${i}</th>`).join("")}</tr></thead>
<tbody><tr><td>byte_offset</td>${Array.from({ length: ROWS_PER_PAGE }, (_, i) => `<td class="n">${i * ROW_SIZE}</td>`).join("")}</tr></tbody></table></div>

<h2 id="table">4 · La table : 100 pointeurs, pages à la demande</h2>
<p><code>Table</code> ne contient pas les lignes : seulement un compteur et 100 pointeurs. Une page n'est allouée par <code>malloc(PAGE_SIZE)</code> que lorsque <code>row_slots</code> y accède pour la première fois ; avant cela le pointeur vaut <code>NULL</code>.</p>
${table.html}
<div class="tbl-wrap"><table class="tbl"><thead><tr><th>num_rows</th><th style="text-align:right">Pages</th><th style="text-align:right">Octets de pages</th><th style="text-align:right">Remplissage</th></tr></thead><tbody>
${[0, 1, 13, 14, 100, 500, 1000, 1300].map((n) => { const p = Math.ceil(n / ROWS_PER_PAGE); return `<tr><td class="n" style="text-align:left">${nf(n)}</td><td class="n">${p}</td><td class="n">${nf(p * PAGE_SIZE)}</td><td class="n">${p ? pct(n * ROW_SIZE, p * PAGE_SIZE) : "–"}</td></tr>`; }).join("")}
</tbody></table></div>

<h2 id="structs">5 · Les structs en mémoire</h2>
<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Struct</th><th style="text-align:right">sizeof</th><th>Disposition</th></tr></thead><tbody>
<tr><td><code>Row</code></td><td class="n">296</td><td><code>id</code> @0 (4) · <code>username</code> @4 (33) · <code>email</code> @37 (256) · padding 3</td></tr>
<tr><td><code>Table</code></td><td class="n">808</td><td><code>num_rows</code> @0 (4) · padding 4 · <code>pages[100]</code> @8 (100 × 8)</td></tr>
<tr><td><code>Statement</code></td><td class="n">300</td><td><code>type</code> @0 (4, enum) · <code>row_to_insert</code> @4 (296)</td></tr>
<tr><td><code>InputBuffer</code></td><td class="n">24</td><td><code>buffer</code> @0 (8) · <code>buffer_length</code> @8 (8) · <code>input_length</code> @16 (8)</td></tr>
<tr><td>Page</td><td class="n">4096</td><td>bloc <code>malloc</code> brut, 13 × 293 + 287 libres</td></tr>
</tbody></table></div>
${bar([["pad", 4, "num_rows"], ["waste", 4, "pad"], ...Array.from({ length: 10 }, (_, i) => [i % 2 ? "username" : "email", 80, `pages[${i * 10}…${i * 10 + 9}]`])], 808)}
<div class="bar-legend"><span>0</span><span>8</span><span>808</span></div>

<h2 id="cycle">6 · Le trajet d'un insert</h2>
<pre><span class="c">sqlite > insert 1 cstack foo@bar.com</span>
read_input        getline → InputBuffer.buffer, '\\n' remplacé par '\\0'
prepare_statement strncmp("insert", 6) → prepare_insert
prepare_insert    strtok ×4 · atoi(id) · id &lt; 0 ? · strlen ≤ 32 / ≤ 255 ?
                  strcpy → Statement.row_to_insert            <span class="c">(pile, 300 o)</span>
execute_insert    num_rows ≥ ${TABLE_MAX_ROWS} ? → EXECUTE_TABLE_FULL
row_slots         page = num_rows / 13 · malloc si NULL · + (num_rows % 13) × 293
serialize_row     memcpy 4 @0 · memcpy 33 @4 · memcpy 256 @37 <span class="c">(293 o)</span>
                  num_rows += 1 → "Executed."</pre>
<p><code>select</code> fait l'inverse : pour chaque <code>i &lt; num_rows</code>, <code>deserialize_row</code> recopie les 293 octets dans un <code>Row</code> local et l'affiche. C'est un balayage complet à chaque fois : pas d'index.</p>

<h2 id="limites">7 · Limites et points à surveiller</h2>
<ul>
<li><b>Tout est en RAM.</b> <code>.exit</code> libère les pages ; rien n'est écrit sur disque.</li>
<li><b>${pct(PAGE_WASTE, PAGE_SIZE)} de chaque page est perdu</b> (${PAGE_WASTE} octets), soit ${nf(PAGE_WASTE * TABLE_MAX_PAGES)} octets sur une table pleine.</li>
<li><b>Largeur fixe.</b> Une ligne coûte toujours ${ROW_SIZE} octets, même pour <code>insert 1 a b</code>.</li>
<li><b>Octets non initialisés.</b> Ce qui suit le <code>\\0</code> vient de la pile. Le jour où les pages iront sur disque, ces octets y partiront aussi : un <code>memset</code> de <code>row_to_insert</code> avant le <code>strcpy</code> les fixerait à zéro.</li>
<li><b><code>atoi</code></b> ne détecte pas un id hors de <code>int</code> ni un id non numérique (<code>insert abc …</code> donne id 0).</li>
<li><b>Ordre de libération.</b> <code>free_table</code> s'arrête au premier pointeur <code>NULL</code> ; c'est correct tant que les pages sont allouées dans l'ordre, ce que garantit l'insertion séquentielle.</li>
</ul>
</article>`;

const themeScript = `
(() => {
  const b = document.body, key = "db-anatomy-theme";
  let saved = null; try { saved = localStorage.getItem(key); } catch {}
  const apply = (t) => { b.dataset.theme = t; document.documentElement.style.colorScheme = t; };
  apply(saved || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
  document.querySelector("[data-theme-toggle]").addEventListener("click", () => {
    const t = b.dataset.theme === "light" ? "dark" : "light"; apply(t); try { localStorage.setItem(key, t); } catch {}
  });
  const info = document.querySelector(".hexinfo");
  document.querySelector(".hexdump").addEventListener("pointerover", (e) => { const c = e.target.closest(".hx"); if (c) info.textContent = c.title; });
})();
`;

const html = k.pageHtml({
  title: "Anatomie de la base",
  theme: "dark",
  width: 760,
  body: `<style>${DOC_CSS}</style>${body}`,
  script: kitScript() + themeScript + row.live + page.live + table.live,
}).replace('<html lang="en">', '<html lang="fr">');
writeFileSync(join(HERE, "db-anatomy.html"), html);
console.log("wrote docs/anatomy/db-anatomy.html", (html.length / 1024).toFixed(0) + " KB");

// Self-contained 3D aura renderer extracted from web/aura.js for the public download page.
// Keeps the four engine styles (claude, codex, grok, zcode), bezel, stepRing, and two-canvas 3D depth separation.
// Adds clean pause/resume & reduced-motion static paint so zero work runs off-screen or when hidden.

import { tintColor } from "./minion.js";

const TAU = Math.PI * 2;

function hueOf(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  return (mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
}

const auras = new Set();
const mouse = { x: -1e4, y: -1e4, t: 0 };
const reducedMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");
let REDUCED = reducedMotionQuery.matches;
let globalPaused = false;
let raf = 0, last = 0;

addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = performance.now(); }, { passive: true });
addEventListener("pointerleave", () => { mouse.x = mouse.y = -1e4; });

const TARGET = { idle: 0.08, offline: 0, listening: 0.35, working: 1, asking: 0.12, done: 0.7, error: 0.45 };
export const TIERS = {
  fast:     { sp: 1.75, dens: 0.6,  label: "FAST",     short: "FAST", mark: "»" },
  balanced: { sp: 1,    dens: 1,    label: "BALANCED", short: "BAL",  mark: "◆" },
  deep:     { sp: 0.6,  dens: 1.35, label: "DEEP",     short: "DEEP", mark: "♛" },
};

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function orbitPt(r, t, inc, om) {
  const x0 = r * Math.cos(t), y0 = r * Math.sin(t);
  const y1 = y0 * Math.cos(inc), z = y0 * Math.sin(inc);
  return [x0 * Math.cos(om) - y1 * Math.sin(om), x0 * Math.sin(om) + y1 * Math.cos(om), z];
}

const sprites = new Map();
function glow(color) {
  if (sprites.has(color)) return sprites.get(color);
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, color); gr.addColorStop(0.35, color + "88"); gr.addColorStop(1, color + "00");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  sprites.set(color, c);
  return c;
}
function dot(g, x, y, r, color, a) { if (a < 0.004) return; g.globalAlpha = Math.min(1, a); g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
function blob(g, x, y, r, color, a) { if (a < 0.004) return; g.globalAlpha = Math.min(1, a); g.drawImage(glow(color), x - r, y - r, r * 2, r * 2); }
function sq(g, x, y, s, color, a) { if (a < 0.004) return; g.globalAlpha = Math.min(1, a); g.fillStyle = color; g.fillRect(x - s / 2, y - s / 2, s, s); }
function stroke(g, color, w, a) { g.globalAlpha = Math.min(1, a); g.strokeStyle = color; g.lineWidth = w; }

function seg(a, r, inc, om, t0, t1, n, color, width, alpha) {
  let prev = orbitPt(r, t0, inc, om);
  for (let i = 1; i <= n; i++) {
    const cur = orbitPt(r, t0 + ((t1 - t0) * i) / n, inc, om), g = (prev[2] + cur[2]) / 2 < 0 ? a.bk : a.fr;
    const fa = typeof alpha === "function" ? alpha(i / n) : alpha;
    if (fa > 0.004) { stroke(g, color, width, fa); g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(cur[0], cur[1]); g.stroke(); }
    prev = cur;
  }
}

function bezel(a, color) {
  const g = a.bk, k = a.k, al = a.alpha, e = a.e, r0 = a.rr(2.42), rot = a.bez;
  if (a.tier === "fast") {
    for (let s = 0; s < 3; s++) {
      const h = rot * 2.2 + (s * TAU) / 3, len = 0.62;
      for (let j = 0; j < 14; j++) {
        const t0 = h - (len * j) / 14, t1 = h - (len * (j + 1)) / 14;
        stroke(g, color, 0.9 * k, al * (0.12 + e * 0.5) * (1 - j / 14)); g.beginPath(); g.arc(0, 0, r0, t1, t0); g.stroke();
      }
      dot(g, Math.cos(h) * r0, Math.sin(h) * r0, 1.5 * k, "#fff", al * (0.3 + e * 0.7));
    }
    return;
  }
  if (a.tier === "deep") {
    const r1 = r0 + 6 * k;
    stroke(g, color, 0.6 * k, al * (0.18 + e * 0.22)); g.beginPath(); g.arc(0, 0, r0, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, r1, 0, TAU); g.stroke();
    const n = a.compact ? 60 : 120;
    for (let i = 0; i < n; i++) {
      const t = rot + (i / n) * TAU, big = i % (n / 12) === 0, mid = i % (n / 24) === 0;
      stroke(g, color, (big ? 1.1 : 0.55) * k, al * (big ? 0.5 : mid ? 0.3 : 0.15) * (0.55 + e * 0.45)); g.beginPath();
      g.moveTo(Math.cos(t) * r0, Math.sin(t) * r0); g.lineTo(Math.cos(t) * (big ? r1 : r0 + (mid ? 4 : 2.5) * k), Math.sin(t) * (big ? r1 : r0 + (mid ? 4 : 2.5) * k)); g.stroke();
    }
    for (let q = 0; q < 4; q++) {
      const t = rot + (q * TAU) / 4, x = Math.cos(t) * (r0 + 3 * k), y = Math.sin(t) * (r0 + 3 * k);
      g.save(); g.translate(x, y); g.rotate(t); g.globalAlpha = al * (0.45 + e * 0.45); g.fillStyle = color; g.fillRect(-1.6 * k, -3.2 * k, 3.2 * k, 6.4 * k); g.restore();
    }
    const ri = r0 - 5 * k, m = a.compact ? 36 : 72;
    for (let i = 0; i < m; i++) { const t = -rot * 1.6 + (i / m) * TAU; dot(g, Math.cos(t) * ri, Math.sin(t) * ri, 0.6 * k, color, al * (0.12 + e * 0.3)); }
    return;
  }
  stroke(g, color, 0.55 * k, al * (0.14 + e * 0.2)); g.beginPath(); g.arc(0, 0, r0, 0, TAU); g.stroke();
  const n = a.compact ? 30 : 60;
  for (let i = 0; i < n; i++) {
    const t = rot + (i / n) * TAU, big = i % (n / 12) === 0;
    stroke(g, color, 0.6 * k, al * (big ? 0.34 : 0.14) * (0.55 + e * 0.45)); g.beginPath();
    g.moveTo(Math.cos(t) * r0, Math.sin(t) * r0); g.lineTo(Math.cos(t) * (r0 + (big ? 5 : 2.5) * k), Math.sin(t) * (r0 + (big ? 5 : 2.5) * k)); g.stroke();
    if (big) sq(g, Math.cos(t) * (r0 + 8 * k), Math.sin(t) * (r0 + 8 * k), 2.2 * k, color, al * (0.3 + e * 0.5));
  }
}

function node(g, x, y, k, a, tier) {
  dot(g, x, y, 1.9 * k, "#fff", a);
  stroke(g, "#fff", 0.7 * k, a * 0.6); g.beginPath();
  if (tier === "deep") g.rect(x - 4 * k, y - 4 * k, 8 * k, 8 * k); else g.arc(x, y, 4.5 * k, 0, TAU);
  g.stroke();
}

function railPath(r, t0, t1, inc, om, jag) {
  const n = 12, pts = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n, p = orbitPt(r, t, inc, om), q = orbitPt(r, t + 0.01, inc, om);
    const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, off = i === 0 || i === n ? 0 : rnd(-1, 1) * jag;
    pts.push([p[0] - (dy / l) * off, p[1] + (dx / l) * off, p[2]]);
  }
  return pts;
}

function zigzag(p0, p1, jag) {
  let pts = [p0, p1];
  for (let k = 0; k < 4; k++) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay, az] = pts[i - 1], [bx, by, bz] = pts[i], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
      const off = rnd(-1, 1) * jag / (k + 1);
      out.push([(ax + bx) / 2 - (dy / len) * off, (ay + by) / 2 + (dx / len) * off, ((az ?? 1) + (bz ?? 1)) / 2], pts[i]);
    }
    pts = out;
  }
  return pts;
}

const STYLES = {
  claude: {
    color: "#e8875a",
    init(a) {
      const T = a.tier, all = [{ r: 1.3, inc: 1.18, om: 0.42, sp: 0.32 }, { r: 1.62, inc: 1.28, om: -0.55, sp: -0.22 }, { r: 1.95, inc: 1.12, om: 0.15, sp: 0.15 }, { r: 2.25, inc: 1.34, om: 1.1, sp: -0.1 }];
      const rings = T === "fast" ? [{ r: 1.55, inc: 1.22, om: 0.3, sp: 0.55 }] : T === "deep" ? all : all.slice(0, 3);
      const nn = T === "fast" ? 1 : T === "deep" ? 3 : 2;
      a.rings = rings.map((r) => ({ ...r, ph: rnd(0, TAU), nodes: Array.from({ length: nn }, (_, i) => (i / nn) * TAU + rnd(0, 1)) }));
      a.arcs = T === "fast" ? [{ ring: 0, t: 0.3, len: 0.75, sp: 2.6 }] : a.rings.map((_, i) => ({ ring: i, t: i * 2.1, len: 0.8 + (i % 2) * 0.3, sp: (i % 2 ? -1 : 1) * (1.5 - i * 0.2) }));
      const nf = Math.round((T === "fast" ? 0 : T === "deep" ? 24 : 14) * (a.compact ? 0.5 : 1));
      a.fields = Array.from({ length: nf }, (_, i) => ({ a0: (i / nf) * TAU, tw: i % 2 ? 0.55 : 0.75, ph: (i * 0.37) % 1 }));
      a.cor = 0; a.bolts = []; a.nextBolt = 0.4; a.flash = 0;
    },
    step(a, dt, m) {
      for (const r of a.rings) { r.ph += r.sp * dt * m; r.nodes = r.nodes.map((n) => n + r.sp * 0.6 * dt * m); }
      for (const c of a.arcs) c.t += c.sp * dt * m;
      for (const f of a.fields) f.ph = (f.ph + 0.28 * dt * m) % 1;
      a.cor += 0.05 * dt * m;
      a.flash = Math.max(0, a.flash - dt * 4);
      a.bolts = a.bolts.filter((b) => (b.life -= dt) > 0);
      if (a.e > 0.55 && a.mood === "working" && !REDUCED && (a.nextBolt -= dt) <= 0) {
        const T = a.tier, R = a.R;
        a.nextBolt = T === "fast" ? rnd(0.28, 0.6) : T === "deep" ? rnd(1.2, 2.0) : rnd(0.85, 1.4);
        const ri = Math.floor(Math.random() * a.rings.length), r = a.rings[ri], nd = pick(r.nodes);
        const near = T !== "fast" && a.mouseD < a.rr(2.6) && Math.random() < 0.5;
        const bolt = { segs: [], life: T === "deep" ? 0.48 : 0.3 };
        bolt.max = bolt.life;
        const len = T === "deep" ? 1.1 : 0.85, dir = Math.sign(r.sp) || 1, jag = R * 0.07;
        const rail = railPath(a.rr(r.r), nd, nd + dir * len, r.inc, r.om, jag);
        bolt.segs.push({ pts: rail, w: T === "deep" ? 1.2 : 0.9 });
        const end = rail.at(-1), to = near ? [a.mx, a.my, 1] : [end[0] * (R * 1.03) / Math.hypot(end[0], end[1]), end[1] * (R * 1.03) / Math.hypot(end[0], end[1]), 1];
        if (T !== "fast") bolt.segs.push({ pts: zigzag(end, to, R * 0.1), w: 0.9 });
        if (T === "deep") {
          const r2 = a.rings[(ri + 1) % a.rings.length], p2 = orbitPt(a.rr(r2.r), nd + dir * len * 0.5, r2.inc, r2.om), mid = rail[Math.floor(rail.length / 2)];
          bolt.segs.push({ pts: zigzag(mid, p2, R * 0.08), w: 0.7 });
        }
        a.bolts.push(bolt);
        a.flash = T === "deep" ? 1 : 0.7;
      }
    },
    draw(a) {
      const back = a.bk, front = a.fr, e = a.e, al = a.alpha, k = a.k, T = a.tier, C = "#e8875a", P = "#f4b593";
      blob(back, 0, 0, a.rr(1.9), "#c9653a", al * (0.06 + e * 0.12 + a.flash * 0.12));
      for (const f of a.fields) {
        stroke(back, C, 0.6 * k, al * (0.06 + e * 0.09)); back.beginPath();
        for (let j = 0; j <= 16; j++) { const u = j / 16, r = a.rr(2.6 - 1.5 * u), ang = f.a0 + f.tw * u * u; const x = Math.cos(ang) * r, y = Math.sin(ang) * r; j ? back.lineTo(x, y) : back.moveTo(x, y); }
        back.stroke();
        for (let j = 0; j < 5; j++) {
          const u = (j / 5 + f.ph) % 1, r = a.rr(2.6 - 1.5 * u), ang = f.a0 + f.tw * u * u;
          dot(back, Math.cos(ang) * r, Math.sin(ang) * r, (j === 0 ? 1.2 : 0.8) * k, j === 0 ? "#fff" : P, al * (0.14 + e * 0.5) * Math.sin(u * Math.PI));
        }
      }
      if (T === "deep") {
        const n = a.compact ? 24 : 48, r0 = a.rr(1.12), r1 = a.rr(1.2);
        for (let i = 0; i < n; i++) {
          const t = a.cor + (i / n) * TAU, big = i % 4 === 0;
          stroke(back, big ? P : C, (big ? 1.2 : 0.7) * k, al * (big ? 0.5 : 0.25) * (0.5 + e * 0.5)); back.beginPath();
          back.moveTo(Math.cos(t) * r0, Math.sin(t) * r0); back.lineTo(Math.cos(t) * (big ? r1 + 2 * k : r1), Math.sin(t) * (big ? r1 + 2 * k : r1)); back.stroke();
        }
      }
      for (const r of a.rings) {
        const rr = a.rr(r.r);
        seg(a, rr, r.inc, r.om, 0, TAU, 72, C, 0.55 * k, al * (0.1 + e * 0.15));
        const n = Math.round(r.r * 44 * a.dens * (a.compact ? 0.45 : 1));
        for (let i = 0; i < n; i++) {
          const t = r.ph + (i / n) * TAU, [x, y, z] = orbitPt(rr, t, r.inc, r.om);
          dot(z < 0 ? back : front, x, y, 0.95 * k, P, al * (0.18 + e * 0.5) * (z < 0 ? 0.6 : 1));
        }
        for (const nd of r.nodes) {
          const [x, y, z] = orbitPt(rr, nd, r.inc, r.om);
          node(z < 0 ? back : front, x, y, k, al * (0.4 + e * 0.6), T);
        }
      }
      if (e > 0.03) for (const c of a.arcs) {
        const r = a.rings[c.ring], dir = Math.sign(c.sp), rr = a.rr(r.r);
        seg(a, rr, r.inc, r.om, c.t - dir * c.len, c.t, 24, "#ff8a50", 4.5 * k, (u) => al * e * 0.22 * u * u);
        seg(a, rr, r.inc, r.om, c.t - dir * c.len, c.t, 24, "#ffc3a3", 1.3 * k, (u) => al * e * u * u);
      }
      for (const b of a.bolts) {
        const f = b.life / b.max;
        for (const s of b.segs) {
          for (let i = 1; i < s.pts.length; i++) {
            const p = s.pts[i - 1], q = s.pts[i], g = (p[2] + q[2]) / 2 < 0 ? back : front;
            stroke(g, "#ff9a5c", 3.4 * k * s.w, al * f * 0.28); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
            stroke(g, "#fff6ee", 0.9 * k * s.w, al * f); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
          }
          const end = s.pts.at(-1); dot(front, end[0], end[1], 2.2 * k * s.w, "#fff", al * f);
        }
      }
    },
  },
  codex: {
    color: "#4d9bff",
    init(a) {
      const T = a.tier, n = T === "fast" ? 2 : T === "deep" ? 4 : 3;
      a.inc = 0.82; a.om = -0.4; a.rot = 0; a.grid = 0;
      a.arms = Array.from({ length: n }, (_, k) => ({ off: (k * TAU) / n }));
      const nc = T === "fast" ? 4 : T === "deep" ? 8 : 6;
      a.comets = Array.from({ length: nc }, (_, i) => ({ arm: i % n, u: i / nc }));
      a.nodes = Array.from({ length: n }, (_, i) => ({ arm: i, u: [0.35, 0.7, 0.55, 0.45][i] }));
      a.gridRings = T === "fast" ? 3 : 6; a.spokes = T === "fast" ? 0 : 20;
    },
    step(a, dt, m) {
      a.rot += 0.28 * dt * m; a.grid += 0.05 * dt * m;
      for (const c of a.comets) c.u = (c.u + (a.tier === "fast" ? 0.4 : 0.22) * dt * m) % 1;
    },
    draw(a) {
      const back = a.bk, front = a.fr, e = a.e, al = a.alpha, k = a.k, T = a.tier, C = "#4d9bff", P = "#b9d8ff", V = "#8b6cff";
      blob(back, 0, 0, a.rr(1.9), "#1f9c86", al * (0.05 + e * 0.12));
      const gr = (i) => a.rr(1.05 + (i * 1.44) / a.gridRings);
      for (let i = 1; i <= a.gridRings; i++) {
        const rr = gr(i), n = 56;
        stroke(back, C, 0.55 * k, al * (0.08 + e * 0.11)); back.beginPath();
        for (let j = 0; j <= n; j++) { const t = (j / n) * TAU + a.grid; let x = Math.cos(t) * rr, y = Math.sin(t) * rr * 0.42; [x, y] = a.pull(x, y, 1.2); j ? back.lineTo(x, y) : back.moveTo(x, y); }
        back.stroke();
      }
      for (let s = 0; s < a.spokes; s++) {
        const t = (s / a.spokes) * TAU + a.grid;
        stroke(back, C, 0.5 * k, al * (0.06 + e * 0.09)); back.beginPath();
        for (let j = 0; j <= a.gridRings; j++) { const rr = gr(j); let x = Math.cos(t) * rr, y = Math.sin(t) * rr * 0.42; [x, y] = a.pull(x, y, 1.2); j ? back.lineTo(x, y) : back.moveTo(x, y); }
        back.stroke();
      }
      const armPt = (arm, u) => orbitPt(a.rr(1.05 + u * 1.3), a.arms[arm].off + u * 4.2 + a.rot, a.inc, a.om);
      const beads = Math.round(72 * Math.min(1.15, a.dens) * (a.compact ? 0.5 : 1));
      for (let arm = 0; arm < a.arms.length; arm++) {
        for (let i = 0; i < beads; i++) {
          const u = i / beads, [x, y, z] = armPt(arm, u);
          dot(z < 0 ? back : front, x, y, (0.85 + (1 - u) * 0.9) * k, i % 9 === 0 ? V : i % 4 === 0 ? "#fff" : P, al * (0.26 + e * 0.66) * (1 - u * 0.45));
        }
        let prev = armPt(arm, 0);
        for (let i = 1; i <= 36; i++) { const cur = armPt(arm, i / 36), g = cur[2] < 0 ? back : front; stroke(g, C, 0.6 * k, al * (0.08 + e * 0.16)); g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(cur[0], cur[1]); g.stroke(); prev = cur; }
      }
      if (e > 0.03) for (const c of a.comets) {
        const tail = 9;
        for (let j = 0; j < tail; j++) {
          const u = 1 - ((c.u + j * 0.012) % 1), [x, y, z] = armPt(c.arm, u);
          dot(z < 0 ? back : front, x, y, (1.9 - j * (1.6 / tail)) * k, j ? C : "#fff", al * e * (1 - j / tail));
        }
      }
      for (const n of a.nodes) { const [x, y, z] = armPt(n.arm, n.u); node(z < 0 ? back : front, x, y, k, al * (0.4 + e * 0.6), T); }
    },
  },
  grok: {
    color: "#ffb547",
    init(a) {
      const T = a.tier, n = Math.round((T === "fast" ? 5 : T === "deep" ? 11 : 8) * (a.compact ? 0.7 : 1));
      a.inc = 1.34; a.om = -0.33;
      a.lanes = Array.from({ length: n }, (_, i) => ({ r: 1.06 + (i * 1.04) / Math.max(1, n - 1), ph: rnd(0, TAU) }));
      a.jet = 0; a.pulse = 0;
    },
    step(a, dt, m) {
      for (const l of a.lanes) l.ph += (1.15 / Math.pow(l.r, 1.5)) * dt * m;
      a.jet = a.mood === "working" ? Math.min(1, a.jet + dt * 0.8) : Math.max(0, a.jet - dt);
      a.pulse = (a.pulse + dt * (a.tier === "fast" ? 2.2 : 0.9) * m) % 1;
    },
    draw(a) {
      const back = a.bk, front = a.fr, R = a.R, e = a.e, al = a.alpha, k = a.k, ry = Math.cos(a.inc);
      blob(back, 0, 0, a.rr(1.9), "#ff7a2b", al * (0.06 + e * 0.16));
      if (a.jet > 0.01) for (const sgn of [-1, 1]) {
        const ax = -Math.sin(a.om) * sgn, ay = Math.cos(a.om) * sgn, g = sgn < 0 ? back : front, L = a.rr(2.45) / R;
        stroke(g, "#ffe0a8", k, al * a.jet * 0.7);
        g.beginPath(); g.moveTo(ax * R * 1.05, ay * R * 1.05); g.lineTo(ax * R * L, ay * R * L); g.stroke();
        const pt = 1.05 + a.pulse * (L - 1.05); blob(g, ax * R * pt, ay * R * pt, 5 * k, "#ffe0a8", al * a.jet);
      }
      for (const l of a.lanes) {
        const heat = 1 - (l.r - 1.06) / 1.04, col = heat > 0.75 ? "#fff3dc" : heat > 0.5 ? "#ffd27a" : heat > 0.25 ? "#ffb547" : "#ff7a3c";
        const n = Math.round(l.r * 46 * Math.min(1.1, a.dens) * (a.compact ? 0.5 : 1)), rr = a.rr(l.r);
        for (let i = 0; i < n; i++) {
          const t = l.ph + (i / n) * TAU, [x, y, z] = orbitPt(rr, t, a.inc, a.om), [px, py] = a.push(x, y, 1.1);
          const doppler = 0.45 + 0.55 * (0.5 + 0.5 * Math.cos(t)), g = z < 0 ? back : front;
          dot(g, px, py, (i % 6 === 0 ? 1.4 : 0.85) * k, col, al * (0.18 + e * 0.6) * doppler);
        }
      }
      for (const part of [back, front]) {
        stroke(part, "#fff3d6", 1.2 * k, al * (0.4 + e * 0.5));
        part.beginPath(); part.ellipse(0, 0, R, R * ry + R * 0.05, a.om, part === back ? Math.PI : 0, part === back ? TAU : Math.PI); part.stroke();
      }
    },
  },
  zcode: {
    color: "#5aa8ff",
    init(a) {
      const G = "01{}<>/=;:()[]#$&*+-xfnconstletif", T = a.tier;
      a.G = G;
      const all = [{ r: 1.3, inc: 1.2, om: 0.3, sp: 0.3 }, { r: 1.68, inc: 1.3, om: -0.5, sp: -0.22 }, { r: 2.06, inc: 1.12, om: 1.2, sp: 0.15 }];
      a.rings = (T === "fast" ? all.slice(0, 2) : all).map((r) => {
        const n = Math.round(r.r * 20 * (a.compact ? 0.45 : 1));
        return { ...r, ph: rnd(0, TAU), glyphs: Array.from({ length: n }, () => pick(G)), packets: [rnd(0, TAU), rnd(0, TAU)] };
      });
      a.sweep = 0; a.scans = []; a.nextScan = 0.5;
    },
    step(a, dt, m) {
      for (const r of a.rings) {
        r.ph += r.sp * dt * m;
        r.packets = r.packets.map((p) => p + r.sp * 4 * dt * m);
        if (a.mood === "working" && Math.random() < dt * 7) r.glyphs[Math.floor(Math.random() * r.glyphs.length)] = pick(a.G);
      }
      a.sweep += 1.6 * dt * m;
      a.scans = a.scans.filter((s) => (s.r += dt * 1.4) < 2.45);
      if (a.mood === "working" && (a.nextScan -= dt) <= 0) { a.nextScan = 1.8; a.scans.push({ r: 1.0 }); }
    },
    draw(a) {
      const back = a.bk, front = a.fr, R = a.R, e = a.e, al = a.alpha, k = a.k, C = "#5aa8ff";
      blob(back, 0, 0, a.rr(1.9), "#1642d6", al * (0.06 + e * 0.14));
      if (e > 0.03) {
        for (let j = 0; j < 14; j++) {
          const t = a.sweep - j * 0.045;
          stroke(back, C, k, al * e * 0.22 * (1 - j / 14)); back.beginPath(); back.moveTo(Math.cos(t) * R * 1.05, Math.sin(t) * R * 1.05); back.lineTo(Math.cos(t) * a.rr(2.4), Math.sin(t) * a.rr(2.4)); back.stroke();
        }
      }
      for (const s of a.scans) { stroke(back, "#8fd3ff", k, al * (1 - (s.r - 1) / 1.45) * 0.45); back.beginPath(); back.arc(0, 0, a.rr(s.r), 0, TAU); back.stroke(); }
      const fs = a.compact ? Math.max(6, 7 * k) : Math.max(7, 9 * k);
      for (const g of [back, front]) { g.font = `600 ${fs}px Cascadia Mono, Consolas, monospace`; g.textAlign = "center"; g.textBaseline = "middle"; }
      for (const r of a.rings) {
        const n = r.glyphs.length, rr = a.rr(r.r);
        for (let i = 0; i < n; i++) {
          const t = r.ph + (i / n) * TAU, [x, y, z] = orbitPt(rr, t, r.inc, r.om);
          const g = z < 0 ? back : front;
          g.globalAlpha = Math.min(1, al * (0.16 + e * 0.5) * (z < 0 ? 0.55 : 1));
          g.fillStyle = i % 7 === 0 ? "#8fd3ff" : "#d6e8ff";
          g.fillText(r.glyphs[i], x, y);
        }
        if (e > 0.03) for (const p of r.packets) {
          const [x, y, z] = orbitPt(rr, p, r.inc, r.om), g = z < 0 ? back : front;
          sq(g, x, y, 3 * k, "#fff", al * e);
          blob(g, x, y, 7 * k, "#8fd3ff", al * e * 0.8);
        }
      }
    },
  },
};

function stepRing(a, now) {
  const d = a.el._doing, plan = d && Array.isArray(d.plan) ? d.plan : null;
  if (!plan || !plan.length || a.mood === "offline") return;
  const g = a.fr, r = a.rr(1.14), n = Math.min(plan.length, 16), gap = n > 1 ? 0.14 : 0.0001, k = a.k, al = a.alpha;
  for (let i = 0; i < n; i++) {
    const st = plan[i].state, t0 = -Math.PI / 2 + (i / n) * TAU + gap / 2, t1 = -Math.PI / 2 + ((i + 1) / n) * TAU - gap / 2;
    const c = st === "done" ? "#7cf0bf" : st === "now" ? (a.mood === "asking" ? "#ffc24a" : "#5aa8ff") : a.style.color;
    const A = st === "done" ? 0.9 : st === "now" ? 0.55 + 0.45 * Math.sin(now / 160) : 0.16;
    stroke(g, c, 2.6 * k, al * A); g.beginPath(); g.arc(0, 0, r, t0, t1); g.stroke();
  }
}

class Aura {
  constructor(el, kind, extent, opts = {}) {
    this.el = el; this.kind = kind; this.style = STYLES[kind]; this.tint = opts.tint || "";
    this.extent = extent;
    this.back = document.createElement("canvas"); this.back.className = "aura-cv back";
    this.front = document.createElement("canvas"); this.front.className = "aura-cv front";
    const pct = (this.extent - 1) * 50;
    for (const c of [this.back, this.front]) {
      c.style.cssText = `left:-${pct}%;top:-${pct}%;width:${this.extent * 100}%;height:${this.extent * 100}%;`;
    }
    if (this.tint) {
      const turn = Math.round(hueOf(this.tint) - hueOf(this.style.color));
      for (const c of [this.back, this.front]) c.style.filter = `hue-rotate(${turn}deg)`;
    }
    el.classList.add("has-aura");
    el.prepend(this.back); el.appendChild(this.front);
    this.bg = this.back.getContext("2d"); this.fg = this.front.getContext("2d");
    this.e = 0.08; this.mood = "idle"; this.fx = []; this.still = false; this.size = 0; this.acc = 1; this.bez = Math.random() * TAU;
    this.tier = TIERS[el.dataset.tier] ? el.dataset.tier : "balanced";
    this.compact = false; this.dens = TIERS[this.tier].dens; this.R = 56; this.rmax = 2.65;
    this.style.init(this);
  }
  resize(w) {
    const dpr = Math.min(devicePixelRatio || 1, 2), px = Math.round(w * this.extent * dpr);
    if (px === this.size || px <= 0) return;
    this.size = px;
    for (const c of [this.back, this.front]) { c.width = c.height = px; }
    this.still = false;
  }
  rr(x) {
    if (x <= 1 || this.rmax >= 2.65) return x * this.R;
    return this.R * (1 + ((x - 1) * (this.rmax - 1)) / 1.65);
  }
  push(x, y, f) {
    const dx = x - this.mx, dy = y - this.my, d = Math.hypot(dx, dy), rad = this.R * 0.9 * f;
    if (d > rad || d < 0.01) return [x, y];
    const k = (1 - d / rad) * this.R * 0.35 * f;
    return [x + (dx / d) * k, y + (dy / d) * k];
  }
  pull(x, y, f) {
    const dx = this.mx - x, dy = this.my - y, d = Math.hypot(dx, dy), rad = this.R * 1.1 * f;
    if (d > rad || d < 0.01) return [x, y];
    const k = (1 - d / rad) * Math.min(d, this.R * 0.4);
    return [x + (dx / d) * k, y + (dy / d) * k];
  }
  tempo(now) {
    const t = now / 1000;
    if (this.tier === "fast") return TIERS.fast.sp;
    if (this.tier === "deep") return TIERS.deep.sp * (0.8 + 0.2 * Math.sin(t * 0.9));
    const beat = t % 1;
    return 0.2 + 3.4 * (beat < 0.35 ? Math.sin((Math.PI * beat) / 0.35) : 0);
  }
  frame(dt, now, forceStatic = false) {
    const el = this.el;
    if (!el.isConnected) return false;
    const r = this.rect || el.getBoundingClientRect();
    if (!r.width) return true;
    const mood = el.dataset.mood || "idle", tier = TIERS[el.dataset.tier] ? el.dataset.tier : "balanced";
    if (tier !== this.tier) { this.tier = tier; this.dens = TIERS[tier].dens * (this.compact ? 0.75 : 1); this.style.init(this); this.still = false; }
    if (mood !== this.mood) {
      this.mood = mood; this.still = false; this.acc = 1;
      if (mood === "done" && !REDUCED && !forceStatic)
        this.fx.push({ kind: "wave", t: 0 }, ...Array.from({ length: 18 }, () => ({ kind: "spark", t: 0, a: rnd(0, TAU), v: rnd(0.8, 1.6) })));
    }
    const hover = !!this.hover;
    const target = Math.max(TARGET[mood] ?? 0, hover ? 0.35 : 0);
    const near = this.mouseD < this.R * 3 && now - mouse.t < 400;
    const lively = mood === "working" || mood === "asking" || mood === "done" || this.fx.length || near || Math.abs(this.e - target) > 0.01;
    this.acc += dt;
    if (!forceStatic && !lively && this.acc < 0.1) return true;
    const sdt = forceStatic ? 0 : Math.min(0.12, this.acc);
    this.acc = 0;
    this.resize(r.width);
    if (forceStatic) this.e = mood === "working" ? 0.9 : 0.25;
    else {
      this.e += (target - this.e) * Math.min(1, sdt * (target > this.e ? 2.2 : 1.4));
      if (Math.abs(this.e - target) < 0.004) this.e = target;
    }
    const s = r.width / 140;
    this.k = Math.max(0.55, s); this.R = 56 * s;
    this.rmax = Math.min(2.65, (r.width * this.extent) / 2 / this.R - 0.08);
    const compact = this.rmax < 2.2;
    if (compact !== this.compact) { this.compact = compact; this.dens = TIERS[this.tier].dens * (compact ? 0.75 : 1); this.style.init(this); }
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    this.mx = mouse.x - cx; this.my = mouse.y - cy; this.mouseD = Math.hypot(this.mx, this.my);
    this.br = 0.5 + 0.5 * Math.sin((now / 1000) * (TAU / 5.5));
    this.alpha = mood === "offline" ? 0.18 : mood === "idle" && !hover ? 0.72 + 0.28 * this.br : 1;
    const base = REDUCED || forceStatic || mood === "offline" ? 0 : mood === "asking" ? 0.05 : mood === "idle" && !hover ? 0.12 : this.e;
    const m = base * this.tempo(now);
    this.bez += 0.06 * sdt * m * (this.tier === "fast" ? 3 : 1);
    const busy = !forceStatic && (base > 0 || this.fx.length || near || this.e !== target);
    if (!busy && this.still && !forceStatic) return true;
    this.style.step(this, sdt, m);
    this.paint(sdt, mood, now);
    this.still = !busy;
    return true;
  }
  paint(dt, mood, now) {
    const W = this.size;
    if (!W) return;
    const dpr = W / ((this.rect?.width || 140) * this.extent || 1);
    for (const g of [this.bg, this.fg]) {
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, W);
      g.setTransform(dpr, 0, 0, dpr, W / 2, W / 2);
      g.globalCompositeOperation = "lighter";
    }
    this.bk = this.bg; this.fr = this.fg;
    bezel(this, this.style.color);
    this.style.draw(this);
    const R = this.R;
    stepRing(this, now);
    {
      const g = this.fg, hole = g.createRadialGradient(0, 0, 0, 0, 0, R * 1.04);
      hole.addColorStop(0, "rgba(0,0,0,.78)"); hole.addColorStop(0.82, "rgba(0,0,0,.7)"); hole.addColorStop(1, "rgba(0,0,0,0)");
      g.globalCompositeOperation = "destination-out"; g.globalAlpha = 1; g.fillStyle = hole;
      g.beginPath(); g.arc(0, 0, R * 1.04, 0, TAU); g.fill();
      g.globalCompositeOperation = "lighter";
    }
    if (mood === "asking") {
      const p = REDUCED ? 0.45 : (now / 1100) % 1;
      stroke(this.fg, "#ffc24a", 2 * this.k, 0.55 * (1 - p)); this.fg.beginPath(); this.fg.arc(0, 0, R * (1 + p * (Math.min(1.7, this.rmax) - 1)) + 2, 0, TAU); this.fg.stroke();
      blob(this.bg, 0, 0, this.rr(1.7), "#ffc24a", 0.22);
    }
    this.fx = this.fx.filter((f) => {
      f.t += dt;
      if (f.kind === "wave") {
        const p = f.t / 0.9; if (p >= 1) return false;
        stroke(this.fg, this.style.color, 3 * this.k * (1 - p) + 0.5, 0.7 * (1 - p)); this.fg.beginPath(); this.fg.arc(0, 0, R + (this.rr(2.4) - R) * p, 0, TAU); this.fg.stroke();
        return true;
      }
      const p = f.t / 1.1; if (p >= 1) return false;
      const d = R + (this.rr(2.3) - R) * p * f.v * 0.8;
      dot(this.fg, Math.cos(f.a) * d, Math.sin(f.a) * d + p * p * R * 0.4, 2 * this.k * (1 - p), p < 0.3 ? "#fff" : this.style.color, 1 - p);
      return true;
    });
  }
}

const PACE_MS = 11;
function step(now) {
  if (globalPaused || document.hidden || REDUCED) { raf = 0; return; }
  if (last && now - last < PACE_MS) { raf = requestAnimationFrame(loop); return; }
  const dt = Math.min(0.05, (now - (last || now)) / 1000);
  last = now;
  for (const a of auras) {
    const el = a.el;
    if (!el.isConnected) { a.rect = null; continue; }
    a.rect = el.getBoundingClientRect();
    a.hover = el.matches(":hover");
  }
  for (const a of auras) if (!a.frame(dt, now)) auras.delete(a);
  raf = auras.size && !globalPaused && !document.hidden && !REDUCED ? requestAnimationFrame(loop) : 0;
}

function loop(now) {
  step(now);
}

export function attachAura(el, kind, extent = 2.25, opts = {}) {
  if (!STYLES[kind] || el.querySelector(".aura-cv")) return null;
  const a = new Aura(el, kind, extent, opts);
  auras.add(a);
  a.rect = el.getBoundingClientRect();
  a.frame(0, performance.now(), REDUCED);
  if (!raf && !globalPaused && !document.hidden && !REDUCED) {
    last = 0;
    raf = requestAnimationFrame(loop);
  }
  return a;
}

export function setAurasPaused(paused) {
  globalPaused = !!paused;
  if (globalPaused) {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    return;
  }
  if (!REDUCED && !document.hidden && auras.size && !raf) {
    last = 0;
    raf = requestAnimationFrame(loop);
  }
}

export function paintStaticAuras() {
  const now = performance.now();
  for (const a of auras) {
    if (!a.el.isConnected) continue;
    a.rect = a.el.getBoundingClientRect();
    a.frame(0, now, true);
  }
}

reducedMotionQuery.addEventListener("change", (e) => {
  REDUCED = e.matches;
  if (REDUCED) {
    setAurasPaused(true);
    paintStaticAuras();
  } else {
    setAurasPaused(globalPaused);
  }
});

// Self-contained minion rig extracted and trimmed from web/minion.js for the public download page.
// Keeps Tobia (pearl glass orb) and the 4 engine crew characters (Claude, ChatGPT, Grok, OpenCode) with zero external imports.

export const DEFS = {
  tobia:    { id: "tobia",    name: "Tobia",    role: "Host of the island",      c2: "#e2c493", world: "pearl" },
  claude:   { id: "claude",   name: "Claude",   role: "Thinks things through",   c2: "#e07a4f", world: "cloud" },
  codex:    { id: "codex",    name: "ChatGPT",  role: "Builds and fixes things", c2: "#4d9bff", world: "galaxy" },
  grok:     { id: "grok",     name: "Grok",     role: "Quick, curious, direct",  c2: "#ffb547", world: "hole" },
  opencode: { id: "opencode", name: "OpenCode", role: "Free open-source agent",  c2: "#3ee0b0", world: "code", tint: "#3ee0b0" },
};

let uid = 0;
const star4 = (r) => `M0 ${-r} Q${r * 0.18} ${-r * 0.18} ${r} 0 Q${r * 0.18} ${r * 0.18} 0 ${r} Q${-r * 0.18} ${r * 0.18} ${-r} 0 Q${-r * 0.18} ${-r * 0.18} 0 ${-r}Z`;

function pearlWorld(u) {
  return `<defs><radialGradient id="pe${u}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fffaf0"/><stop offset=".6" stop-color="#f3dfbf"/><stop offset="1" stop-color="#d9b98a"/></radialGradient></defs>
    <rect width="140" height="140" fill="url(#pe${u})"/>
    <g class="w-spin" style="transform-origin:70px 70px;animation-duration:30s"><ellipse cx="52" cy="58" rx="34" ry="18" fill="#ffd1e8" opacity=".35"/><ellipse cx="92" cy="88" rx="30" ry="16" fill="#c9f2ff" opacity=".35"/></g>`;
}

function eye(cx, u, cy = 62) {
  return `<g class="eye" transform="translate(${cx} ${cy})">
    <ellipse rx="10.6" ry="13" fill="#000" opacity=".16" transform="translate(0 1.6)"/>
    <ellipse class="white" rx="10" ry="12.4" fill="url(#ew${u})"/>
    <g class="open"><g class="pfollow"><g class="plook"><circle r="5.6" fill="url(#ep${u})"/><circle cx="-2" cy="-2.4" r="1.9" fill="#fff"/><circle cx="1.9" cy="2.1" r=".8" fill="#fff" opacity=".75"/></g></g>
      <path class="spiral" d="M0 0 m-1 0 a1 1 0 1 1 2 0 a2.4 2.4 0 1 1 -4.8 0 a3.8 3.8 0 1 1 7.6 0 a5.2 5.2 0 1 1 -10.4 0" fill="none" stroke="#0d1018" stroke-width="1.7" stroke-linecap="round"/>
      <clipPath id="ce${cx}-${u}"><ellipse rx="10" ry="12.4"/></clipPath>
      <g clip-path="url(#ce${cx}-${u})"><rect class="lid" x="-12" y="-15" width="24" height="30" fill="var(--lid)"/></g></g>
    <path class="arc" d="M-8 3 Q0 -8 8 3" fill="none" stroke="var(--ink-face)" stroke-width="3.8" stroke-linecap="round"/>
    <path class="brow" d="M-9 -20 Q0 -24 9 -20" fill="none" stroke="var(--ink-face)" stroke-width="3.2" stroke-linecap="round"/>
  </g>`;
}

const circleGrid = (w, h, cx, cy, r) =>
  Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r ? "X" : ".")).join("")
  );

const PIXEL = {
  cloud: {
    grid: [".....XXXX.......", "....XXXXXX.XXX..", "..XXXXXXXXXXXXX.", ".XXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXXX", ".XXXXXXXXXXXXXX.", "..XXXXXXXXXXXX..", "...XX..XX..XX..."],
    body: ["#9aa0aa", "#3b3e45", "#17181c", "#4b4f58"],
    eyes: [4, 10],
    eyeRow: 4,
    ink: "#f3e6dc",
    accent: "#e8875a",
    glass: ["#1d1410", "#0a0706"],
    tiers: {
      fast: {
        grid: ["........XXXX....", "ss...XXXXXXXXX..", "...XXXXXXXXXXXX.", "sssXXXXXXXXXXXXX", "...XXXXXXXXXXXXX", "ss..XXXXXXXXXXX.", "......XXXXXX...."],
        body: ["#eef1f5", "#b4bac4", "#727883", "#cdd2da"],
        colors: { s: "#d9e1ec" },
        alpha: { s: 0.5 },
        eyes: [7.4, 11.4],
        eyeRow: 2.3,
        ink: "#14161a",
        streak: false,
      },
      deep: {
        grid: [".......cc.......", "......XXXX......", ".cc...XXXX...cc.", "XXXX.XXXXXX.XXXX", "XXXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXXX", ".XXXXXXXXXXXXXX.", "..XXXXXXXXXXXX..", "...XX..b..XX....", "......bb........", ".......b........"],
        body: ["#9298a3", "#25272c", "#0b0c0f", "#33363d"],
        colors: { c: "#f0ab84", b: "#ffd2b4" },
        cls: { b: "px-bolt" },
        cs: 4.9,
        plate: false,
        eyes: [4.4, 10.4],
        eyeRow: 5.4,
        ink: "#f6e9de",
      },
    },
  },
  galaxy: {
    grid: ["..........s.......", ".....s........s...", "...........a......", "......b...aa......", "......bb..aa...c..", ".....bbb.aaa..cc..", ".....bXX.aXX.ccX..", "....XXXXXXXXXXXX..", "...XXXXXXXXXXXXX..", "...XXXXXXXXXXXXXX.", "..XXXXXXXXXXXXXXX.", "..XXXXXXXXXXXXXX..", "...XXXXXXXXXXXXX..", "....XXXXXXXXXXX...", "......kkkkkkk....."],
    body: ["#cfe6ff", "#3d8bff", "#1a3f9a", "#6aa8ff"],
    colors: { a: "#e6f3ff", b: "#8cc4ff", c: "#8cc4ff", s: "#ffc857", k: "#1a3f9a" },
    alpha: { k: 0.6 },
    cls: { a: "px-t1", b: "px-t2", c: "px-t3", s: "px-rise" },
    eyes: [6.2, 10.6],
    eyeRow: 9.2,
    ink: "#051433",
    accent: "#4d9bff",
    glass: ["#0b1630", "#040810"],
    tiers: {
      fast: {
        grid: ["..........a.....", ".........aa.....", "ss.....XXaa.....", "......XXXXX.....", "sss..XXXXXXX....", ".....XXXXXXXX...", "ss...XXXXXXXX...", "......XXXXXX....", ".......XXXX.....", "........kk......"],
        body: ["#f2f7ff", "#a9c8f0", "#5a7bb0", "#d0e2fa"],
        colors: { a: "#ffffff", s: "#dbe8fb", k: "#5a7bb0" },
        alpha: { s: 0.5, k: 0.5 },
        cls: { s: "px-streak", a: "px-t1" },
        cs: 4.6,
        eyes: [7.4, 10.4],
        eyeRow: 4.4,
        ink: "#0b1a3a",
      },
      deep: {
        grid: ["....*........*....", "........a.........", "..s.....aa......s.", "...b....aa...c....", "...bb..aaaa..cc...", "...bb..aaaa..cc...", "..bbb.aaaaaa.ccc..", "..bbXXaawwaaXXcc..", "..XXXXXXwwXXXXXX..", ".XXXXXXXwwXXXXXXX.", ".XXXXXXXXXXXXXXXX.", "XXXXXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXXXXX", ".XXXXXXXXXXXXXXXX.", "..XXXXXXXXXXXXXX..", "...XXXXXXXXXXXX...", ".....kkkkkkkk....."],
        body: ["#cfe6ff", "#2f6fe8", "#0f2a73", "#5b9bff"],
        colors: { "*": "#ffffff", a: "#e6f3ff", b: "#8cc4ff", c: "#8cc4ff", w: "#a9d2ff", s: "#ffc857", k: "#0f2a73" },
        alpha: { k: 0.6 },
        cls: { "*": "px-blink", a: "px-t1", b: "px-t2", c: "px-t3", s: "px-rise" },
        cs: 5.5,
        eyes: [5.6, 11.2],
        eyeRow: 11,
        ink: "#051433",
      },
    },
  },
  hole: {
    grid: (() => {
      const W = 18, H = 14, g = circleGrid(W, H, 9, 7, 5.9).map((r) => [...r]);
      for (let x = 0; x < W; x++) {
        const y = Math.round(8.6 + 0.3 * (x - 9));
        for (const yy of [y, y + 1]) if (yy >= 0 && yy < H) g[yy][x] = yy === y ? "r" : "o";
      }
      return g.map((r) => r.join(""));
    })(),
    body: ["#4a4038", "#1c1814", "#070605", "#26201b"],
    colors: { r: "#ffd27a", o: "#ff9a3c" },
    plate: false,
    eyes: [6, 10.4],
    eyeRow: 4,
    ink: "#fff3d6",
    accent: "#ffb547",
    glass: ["#1a1208", "#060402"],
  },
  code: {
    grid: [".XXXXXXXXXXXX.", "XXXXXXXXXXXXXX", "XddddddddddddX", "XXXXXXXXXXXXXX", "XXXXXXXXXXXXXX", "XXXXXXXXXXXXXX", "XXXXXXXXXXXXXX", "XXwXXXXXXXXXXX", "XXXwXXXXXXXXXX", "XXwXXwwwXXXXXX", "XXXXXXXXXXXXXX", ".XXXXXXXXXXXX."],
    body: ["#8cc8ff", "#2f7ef0", "#1846b0", "#3b8af5"],
    colors: { d: "#1846b0", w: "#ffffff" },
    eyes: [4, 8.4],
    eyeRow: 4,
    ink: "#061433",
    accent: "#5aa8ff",
    glass: ["#0b1530", "#03060f"],
  },
};

function hsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s2 = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s2, l];
}

function hex([h, s2, l]) {
  const k = (n) => (n + h / 30) % 12, a = s2 * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return "#" + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
}

export function tintColor(c, base, tint) {
  if (!tint || !/^#[0-9a-f]{6}$/i.test(c) || /^#f{6}$/i.test(c)) return c;
  const [hb, sb] = hsl(base), [ht, st] = hsl(tint), [h, s2, l] = hsl(c);
  if (sb < 0.15) return hex([ht, Math.min(1, st * 0.85), Math.min(0.82, l * 0.75 + 0.18)]);
  return hex([(h + ht - hb + 360) % 360, Math.max(0, Math.min(1, s2 + (st - sb) * 0.6)), l]);
}

function tinted(p, tint) {
  if (!tint) return p;
  const base = p.body[1], t = (c) => tintColor(c, base, tint);
  return {
    ...p,
    body: p.body.map(t),
    colors: Object.fromEntries(Object.entries(p.colors || {}).map(([k, v]) => [k, t(v)])),
    accent: tint,
  };
}

const HOUSE = {
  cloud:  { shape: `<circle cx="70" cy="72" r="58"/>` },
  galaxy: { shape: `<circle cx="70" cy="72" r="58"/>` },
  hole:   { shape: `<circle cx="70" cy="72" r="56"/>` },
  code:   { shape: `<rect x="13" y="15" width="114" height="114" rx="20"/>` },
};

function housing(u, p, world) {
  const A = p.accent, sh = (HOUSE[world] || HOUSE.cloud).shape;
  const tick = (n, r0, r1, every, r2) => Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2 - Math.PI / 2, rr = i % every === 0 ? r2 : r1;
    return `M${(70 + Math.cos(t) * r0).toFixed(2)} ${(72 + Math.sin(t) * r0).toFixed(2)}L${(70 + Math.cos(t) * rr).toFixed(2)} ${(72 + Math.sin(t) * rr).toFixed(2)}`;
  }).join("");
  let grid = "", rim = "", extra = "";
  switch (world) {
    case "cloud":
      grid = [16, 30, 44].map((r) => `<ellipse cx="70" cy="72" rx="${r + 12}" ry="${r}"/>`).join("") + `<path d="M12 72 H128 M70 14 V130"/>`;
      rim = `<circle cx="70" cy="72" r="58" fill="none" stroke="${A}" stroke-opacity=".6" stroke-width="1"/>`;
      extra = `<path class="h-bezel" d="${tick(60, 60.2, 62.4, 5, 64.6)}" stroke="${A}" stroke-opacity=".5" stroke-width=".7" fill="none"/>
        <circle cx="70" cy="72" r="66.6" fill="none" stroke="${A}" stroke-opacity=".18" stroke-width=".6"/>`;
      break;
    case "galaxy":
      grid = [18, 34, 50].map((r) => `<circle cx="70" cy="72" r="${r}"/>`).join("") + `<path d="${tick(12, 8, 58, 1, 58)}"/>`;
      rim = `<circle cx="70" cy="72" r="58" fill="none" stroke="${A}" stroke-opacity=".55" stroke-width="1"/>`;
      extra = [0, 90, 180, 270].map((d) => `<path d="M70 ${72 - 59.5} l-3.4 -6 h6.8z" fill="${A}" opacity=".75" transform="rotate(${d} 70 72)"/>`).join("");
      break;
    case "hole":
      grid = [24, 40].map((r) => `<circle cx="70" cy="72" r="${r}" stroke-dasharray="1 3"/>`).join("");
      rim = `<circle cx="70" cy="72" r="56" fill="none" stroke="url(#hr${u})" stroke-width="2"/><circle cx="70" cy="72" r="61" fill="none" stroke="${A}" stroke-opacity=".25" stroke-width=".6" stroke-dasharray="2 4"/>`;
      break;
    case "code":
      for (let y = 32; y < 128; y += 4) grid += `<path d="M14 ${y} H126"/>`;
      rim = `<rect x="13" y="15" width="114" height="114" rx="20" fill="none" stroke="${A}" stroke-opacity=".6" stroke-width="1"/>`;
      extra = `<path d="M14 30 H126" stroke="${A}" stroke-opacity=".35" stroke-width=".8"/>${[26, 34, 42].map((x, i) => `<rect x="${x - 1.8}" y="20.6" width="3.6" height="3.6" fill="${A}" opacity="${0.9 - i * 0.25}"/>`).join("")}`;
      break;
  }
  const glint = world === "code"
    ? `<path d="M30 19 H58" stroke="#fff" stroke-opacity=".2" stroke-width="1.4" stroke-linecap="round"/>`
    : `<path d="M28 44 A50 50 0 0 1 70 22" fill="none" stroke="#fff" stroke-opacity="${world === "hole" ? 0.08 : 0.22}" stroke-width="1.6" stroke-linecap="round"/>`;
  return `<g class="lens"><defs><radialGradient id="ln${u}" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="${world === "hole" ? "#050403" : p.glass[0]}"/><stop offset=".7" stop-color="${p.glass[1]}"/><stop offset="1" stop-color="#020101"/></radialGradient>
      <radialGradient id="lh${u}" cx=".5" cy="1" r=".7"><stop offset="0" stop-color="${A}" stop-opacity="${world === "hole" ? 0.12 : 0.26}"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient>
      <linearGradient id="hr${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3d6" stop-opacity=".35"/><stop offset=".55" stop-color="${A}" stop-opacity=".7"/><stop offset="1" stop-color="#fff3d6"/></linearGradient>
      <clipPath id="lc${u}">${sh}</clipPath></defs>
    <g fill="url(#ln${u})">${sh}</g>
    <g clip-path="url(#lc${u})"><rect width="140" height="140" fill="url(#lh${u})"/>
      <g class="lens-grid" stroke="${A}" stroke-width=".35" fill="none" opacity="${world === "code" ? 0.14 : 0.22}">${grid}</g></g>
    ${rim}${extra}${glint}</g>`;
}

const INSIGNIA = {
  fast:     ["XX..XX..", ".XX..XX.", "..XX..XX", ".XX..XX.", "XX..XX.."],
  balanced: [".....X.....", "XXX.XXX.XXX", ".....X....."],
  deep:     ["X..X..X", "X.XjX.X", "XXXXXXX", "XjXXXjX"],
};

function insignia(p) {
  const cs = 2.3;
  return `<g class="ti" shape-rendering="crispEdges">${Object.entries(INSIGNIA).map(([t, g]) => {
    const x0 = 70 - (g[0].length * cs) / 2, y0 = t === "balanced" ? 4.2 : 1.8;
    let s = "";
    g.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === ".") return;
      s += `<rect x="${(x0 + c * cs).toFixed(2)}" y="${(y0 + r * cs).toFixed(2)}" width="${cs + 0.1}" height="${cs + 0.1}" fill="${ch === "j" ? "#fff" : p.accent}"${ch === "j" ? ' class="ti-j"' : ""}/>`;
    }));
    return `<g class="ti-${t}">${s}</g>`;
  }).join("")}</g>`;
}

const lighten = (c, f) => {
  if (!/^#[0-9a-f]{6}$/i.test(c)) return c;
  const n = parseInt(c.slice(1), 16);
  return "#" + [16, 8, 0].map((s) => Math.round(((n >> s) & 255) + (255 - ((n >> s) & 255)) * f).toString(16).padStart(2, "0")).join("");
};

const GROUPED = /^px-(lr[LRUDCTBI]|lrW[LR]|lv-[tLRudlrg]|ch[1-6]|t[123]|o[1-6]|bob[1-4]|halo|blink)$/;

function pixelBody(p, tier) {
  const rows = p.grid.length, cols = p.grid[0].length, cs = p.cs || Math.min(5.4, 94 / cols), x0 = 70 - (cols * cs) / 2, y0 = 76 - (rows * cs) / 2;
  const at = (r, c) => (r < 0 || r >= rows || c < 0 || c >= cols ? "." : p.grid[r][c] || ".");
  let px = "", mod = "";
  const moved = {};
  p.grid.forEach((row, r) => [...row].forEach((ch, c) => {
    if (ch === ".") return;
    let fill = p.colors?.[ch];
    if (ch === "X") {
      const top = at(r - 1, c) === "." || at(r - 1, c) === "s", bottom = at(r + 1, c) === ".";
      fill = top ? p.body[0] : bottom ? p.body[2] : (c + r) % 7 === 0 ? p.body[3] : p.body[1];
    }
    const op = p.alpha?.[ch], cl = p.cls?.[ch];
    const together = GROUPED.test(cl || "");
    const rect = `<rect x="${(x0 + c * cs).toFixed(1)}" y="${(y0 + r * cs).toFixed(1)}" width="${(cs + 0.15).toFixed(2)}" height="${(cs + 0.15).toFixed(2)}" fill="${fill}"${op ? ` fill-opacity="${op}"` : ""}${cl && !together ? ` class="${cl}"` : ""}/>`;
    if (together) moved[cl] = (moved[cl] || "") + rect; else px += rect;
  }));
  for (const [cl, rects] of Object.entries(moved)) px += `<g class="${cl}">${rects}</g>`;
  if (tier === "deep" && p.plate !== false) {
    for (let r = -1; r <= rows; r++) for (let c = -1; c <= cols; c++) {
      if (at(r, c) !== ".") continue;
      if ([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dr, dc]) => !".s".includes(at(r + dr, c + dc))))
        mod += `<rect x="${(x0 + c * cs).toFixed(1)}" y="${(y0 + r * cs).toFixed(1)}" width="${(cs + 0.15).toFixed(2)}" height="${(cs + 0.15).toFixed(2)}"/>`;
    }
    mod = `<g class="px-plate" fill="${p.accent}" fill-opacity=".26">${mod}</g>`;
  } else if (tier === "fast" && p.streak !== false) {
    for (const fr of [0.3, 0.55, 0.78]) {
      const r = Math.round(fr * (rows - 1)), first = [...p.grid[r]].findIndex((ch) => ch !== ".");
      for (let j = 1; j <= 3; j++)
        mod += `<rect x="${(x0 + (first - j - (fr === 0.55 ? 0.6 : 0)) * cs).toFixed(1)}" y="${(y0 + r * cs + cs * 0.3).toFixed(1)}" width="${(cs * 0.9).toFixed(2)}" height="${(cs * 0.4).toFixed(2)}" fill-opacity="${(0.6 - j * 0.16).toFixed(2)}"/>`;
    }
    mod = `<g class="px-streak" fill="${lighten(p.accent, 0.35)}">${mod}</g>`;
  }
  const ex = (c) => (x0 + c * cs).toFixed(1), ey = (r) => (y0 + r * cs).toFixed(1), k = p.ink;
  const eyes = (cls, rects) => `<g class="pe ${cls}">${p.eyes.map((c) => rects(c)).join("")}</g>`;
  const E = p.eyeScale || 1;
  const sq = (c, r, s = 0.6) => `<rect x="${ex(c)}" y="${ey(r)}" width="${(cs * s * E).toFixed(2)}" height="${(cs * s * E).toFixed(2)}" fill="${k}"/>`;
  const R0 = p.eyeRow, q = (c, d) => c + d * E;
  return `<g class="tv tv-${tier}">${mod}${px}
    <g class="pfollow">${eyes("pe-open", (c) => `<rect x="${ex(c)}" y="${ey(R0)}" width="${(cs * 1.2 * E).toFixed(2)}" height="${(cs * 2 * E).toFixed(2)}" fill="${k}"/>`)}
      ${eyes("pe-closed", (c) => `<rect x="${ex(c)}" y="${ey(q(R0, 1.4))}" width="${(cs * 1.4 * E).toFixed(2)}" height="${(cs * 0.55 * E).toFixed(2)}" fill="${k}"/>`)}
      ${eyes("pe-happy", (c) => sq(q(c, -0.4), q(R0, 1), 0.7) + sq(q(c, 0.3), q(R0, 0.3), 0.7) + sq(q(c, 1), q(R0, 1), 0.7))}
      ${eyes("pe-x", (c) => sq(q(c, -0.3), q(R0, 0.3)) + sq(q(c, 0.9), q(R0, 0.3)) + sq(q(c, 0.3), q(R0, 0.9)) + sq(q(c, -0.3), q(R0, 1.5)) + sq(q(c, 0.9), q(R0, 1.5)))}</g></g>`;
}

function pixelChar(u, p0, tint, world) {
  const p = tinted(p0, tint);
  const variant = (t) => {
    const o = p0.tiers?.[t];
    if (!o) return t === "fast" ? { ...p, body: p.body.map((c) => lighten(c, 0.14)) } : p;
    return tinted({ ...p0, ...o }, tint);
  };
  return `${housing(u, p, world)}${insignia(p)}
    <g class="pxc" shape-rendering="crispEdges">${["fast", "balanced", "deep"].map((t) => pixelBody(variant(t), t)).join("")}</g>`;
}

function svg(d) {
  const u = ++uid;
  const SP = PIXEL[d.world] || null;
  const ink = "#5a4220", lid = "#f3dfbf";
  const shape = `<circle cx="70" cy="70" r="52"/>`;
  const antenna = d.id === "tobia" ? `<g class="acc-antenna"><path d="M70 18 Q69 9 72 3" fill="none" stroke="#2b2f3c" stroke-width="3" stroke-linecap="round"/><circle class="bulb" cx="72" cy="2" r="5.5"/><circle class="bulb-glow" cx="72" cy="2" r="10"/></g>` : "";
  return `<svg class="mn-svg" viewBox="0 0 140 140" aria-hidden="true" style="--ink-face:${ink};--lid:${lid}">
  <defs>
    <clipPath id="orb${u}">${shape}</clipPath>
    <radialGradient id="sh${u}" cx=".42" cy=".34" r=".78"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
    <radialGradient id="spec${u}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".62"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="rl${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".45" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".32"/></linearGradient>
    <radialGradient id="ew${u}" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#e3e8f2"/></radialGradient>
    <radialGradient id="ep${u}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#3a4256"/><stop offset=".6" stop-color="#0b0e16"/><stop offset="1" stop-color="#05070b"/></radialGradient>
    <radialGradient id="au${u}"><stop offset=".5" stop-color="#ffc24a" stop-opacity=".6"/><stop offset="1" stop-color="#ffc24a" stop-opacity="0"/></radialGradient>
  </defs>
  <circle class="aura" cx="70" cy="70" r="70" fill="url(#au${u})"/>
  <ellipse class="shadow" cx="70" cy="134" rx="30" ry="4.5" fill="#000" opacity=".35"/>
  <g class="ring"><circle class="ring-bg" cx="70" cy="70" r="62" fill="none"/><circle class="ring-fg" cx="70" cy="70" r="62" fill="none" pathLength="100" transform="rotate(-90 70 70)"/></g>
  <g class="float">
    <circle class="bond" cx="70" cy="70" r="57" fill="none"/>
    <circle class="knock" cx="70" cy="70" r="53" fill="none"/>
    ${SP ? pixelChar(u, SP, d.tint, d.world) : `<g class="inner"><g class="orb">
      <g fill="none" stroke="#000" stroke-opacity=".35" stroke-width="5" transform="translate(0 2.5)">${shape}</g>
      <g fill="none" stroke="url(#rl${u})" stroke-width="2.6">${shape}</g>
      <g clip-path="url(#orb${u})">${pearlWorld(u)}
        <rect width="140" height="140" fill="url(#sh${u})"/>
        <ellipse cx="50" cy="38" rx="30" ry="15" fill="url(#spec${u})" transform="rotate(-22 50 38)"/></g></g>
    ${antenna}
    <g class="face">${eye(54, u, 64)}${eye(86, u, 64)}
      <path class="mouth" d="M60 88 Q70 96 80 88" fill="none" stroke="var(--ink-face)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
      <ellipse class="cheek" cx="38" cy="82" rx="7" ry="4" fill="#ff7aa8" opacity="0"/><ellipse class="cheek" cx="102" cy="82" rx="7" ry="4" fill="#ff7aa8" opacity="0"/></g></g>`}
    <g class="fx">
      <g class="confetti">${[["#ffc24a", -46, -30], ["#5ee6a8", 40, -44], ["#5aa8ff", 58, -8], ["#ff7aa8", -58, -6], ["#fff", -20, -52], ["#b3a7ff", 24, -58], ["#ffc24a", 6, -64], ["#5ee6a8", -36, -50]].map(([c, x, y], i) => `<rect x="68" y="20" width="6" height="6" rx="1.5" fill="${c}" style="--x:${x}px;--y:${y}px;--r:${(i * 83) % 360}deg;animation-delay:${i * 18}ms"/>`).join("")}</g>
    </g>
  </g>
</svg>`;
}

export function createMinion(def, { scale = 1, mood = "idle", tier = "balanced" } = {}) {
  const d = typeof def === "string" ? DEFS[def] : def;
  const el = document.createElement("div");
  const SP = PIXEL[d.world] || null;
  el.className = "mn" + (SP ? " px" : "");
  el.dataset.id = d.id;
  el.dataset.mood = mood;
  if (SP && tier) el.dataset.tier = tier;
  el.style.setProperty("--s", scale);
  el.style.setProperty("--c2", d.c2);
  let h = 0;
  for (const ch of d.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  el.style.setProperty("--fd", (3.6 + (h % 14) / 10).toFixed(2) + "s");
  el.style.setProperty("--bd", (1 + (h % 40) / 10).toFixed(2) + "s");
  el.style.setProperty("--bl", (4.6 + (h % 25) / 10).toFixed(2) + "s");
  el.style.setProperty("--ld", (5 + (h % 30) / 10).toFixed(2) + "s");
  el.innerHTML = `<div class="mn-flip">${svg(d)}</div><span class="mn-tag">${d.name}</span>`;
  el.setMood = (m) => { if (el.dataset.mood !== m) el.dataset.mood = m; };
  el.setTier = (t) => { if (t && el.dataset.tier !== t) el.dataset.tier = t; };
  return el;
}

export function lookAt(el, x, y) {
  const r = el.getBoundingClientRect();
  const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height * 0.46);
  const n = Math.max(Math.hypot(dx, dy), 60);
  el.style.setProperty("--px", ((dx / n) * 3.6).toFixed(2));
  el.style.setProperty("--py", ((dy / n) * 3.4).toFixed(2));
}

export function lookCenter(el) {
  el.style.setProperty("--px", "0");
  el.style.setProperty("--py", "0");
}

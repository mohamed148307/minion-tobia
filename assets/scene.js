// Living scene controller for the Minztobia public download page.
// Drives one clean story loop inside a site-plan Frame:
// In Chat, type an action and tap Pass to hand it to an @agent. Then the desk shows that agent work and ask.

import { DEFS, createMinion, lookAt, lookCenter } from "./minion.js";
import { attachAura, setAurasPaused, paintStaticAuras } from "./aura.js";

// Coworking hand-offs shown in Chat. Each one is a different kind of action, passed to a named agent.
const PASSES = [
  { to: "Vis", kind: "Logo", line: "Finish the logo", face: "lens" },
  { to: "Vid", kind: "Shots", line: "Cut the opening", face: "tower" },
  { to: "Scribe", kind: "Page", line: "Write the page", face: "chip" },
  { to: "Forge", kind: "Build", line: "Check the install", face: "compass" },
];

const CREW = [
  { id: "claude",   kind: "claude", tier: "deep",     tierLabel: "DEEP",     task: "Tidy my Downloads folder",        pass: "Tidy the Downloads folder",  kindLabel: "Files",   askQ: "Move 18 installers & clean temp files?", askWhere: "~/Downloads · Claude",   action: "Sorting 42 files" },
  { id: "codex",    kind: "codex",  tier: "balanced", tierLabel: "BALANCED", task: "Rename screenshots by date",       pass: "Rename the screenshots",     kindLabel: "Names",   askQ: "Rename 24 PNG files on Desktop?",        askWhere: "~/Desktop · ChatGPT",    action: "Matching photo timestamps" },
  { id: "grok",     kind: "grok",   tier: "fast",     tierLabel: "FAST",     task: "Summarize 40 unread updates",      pass: "Summarize the unread updates", kindLabel: "Notes", askQ: "Save digest note to Desktop?",           askWhere: "~/Desktop · Grok",       action: "Grouping key points" },
  { id: "opencode", kind: "zcode",  tier: "balanced", tierLabel: "FREE",     task: "Clean up project build cache",     pass: "Clear the old build cache",  kindLabel: "Cache",   askQ: "Remove 310 MB of stale cache folders?",  askWhere: "~/Work/cache · OpenCode", action: "Checking old cache files" },
];

function makePlan(activeIdx, done) {
  return [0, 1, 2, 3].map((i) => ({
    state: done || i < activeIdx ? "done" : i === activeIdx ? "now" : "todo",
  }));
}

export function initScene(mount) {
  if (!mount) return;

  mount.innerHTML = `
    <div class="wall-bloom" aria-hidden="true"><i></i><i></i></div>
    <div id="demo-island" data-state="rest" data-mood="idle">
      <section class="v-rest">
        <div class="tobia"></div>
        <div class="txt"><b>Minztobia</b> · <span id="isl-status">Desk crew ready</span></div>
        <div class="pips"></div>
      </section>
      <section class="v-card" aria-label="Permission request">
        <div class="ava"></div>
        <div class="body">
          <div class="meta" id="isl-where">~/Downloads · Claude</div>
          <div class="ttl" id="isl-ask">Move 18 installers &amp; clean temp files?</div>
          <div class="sub" id="isl-sub">Waiting for your OK before changing files</div>
          <div class="acts">
            <button class="isl-btn go" type="button" id="isl-allow">Allow once</button>
            <button class="isl-btn no" type="button" id="isl-deny">Deny</button>
          </div>
        </div>
      </section>
    </div>
    <div class="dframe" id="demo-frame">
      <i class="tk tl" aria-hidden="true"></i><i class="tk tr" aria-hidden="true"></i>
      <i class="tk bl" aria-hidden="true"></i><i class="tk br" aria-hidden="true"></i>
      <header><b>Desktop Crew</b><small>4 agents</small><div class="dots"></div></header>
      <div class="crew-grid"></div>
    </div>
    <div class="dchat" id="demo-chat">
      <header><b>Chat</b><span id="chat-cap">Pass an action to an agent</span></header>
      <div class="dmsgs" id="demo-msgs"></div>
      <div class="dcomp">
        <div class="mbub" id="demo-face">
          <span class="mb-face" id="demo-mfig"></span>
          <span class="mb-nm" id="demo-mname"></span>
        </div>
        <div class="drow">
          <div class="mline" id="demo-line"></div>
          <button class="pass" type="button" id="demo-pass">Pass</button>
        </div>
      </div>
    </div>
    <div class="hud-strip" id="demo-hud" aria-live="off">
      <div class="hud-who">
        <span class="hud-dot"></span>
        <span id="hud-name">Claude</span>
        <span class="hud-tier-pill" id="hud-tier">DEEP</span>
      </div>
      <div class="hud-task" id="hud-task">Tidy my Downloads folder · Sorting 42 files</div>
      <div class="hud-phase">
        <b id="hud-step">READ</b>
        <div class="hud-track"><i></i><i></i><i></i><i></i></div>
      </div>
    </div>
  `;

  const island = mount.querySelector("#demo-island");
  const islStatus = mount.querySelector("#isl-status");
  const islWhere = mount.querySelector("#isl-where");
  const islAsk = mount.querySelector("#isl-ask");
  const islSub = mount.querySelector("#isl-sub");
  const islAllow = mount.querySelector("#isl-allow");
  const islDeny = mount.querySelector("#isl-deny");
  const pipsBox = mount.querySelector(".pips");
  const dotsBox = mount.querySelector(".dframe .dots");
  const grid = mount.querySelector(".crew-grid");
  const hud = mount.querySelector("#demo-hud");
  const hudName = mount.querySelector("#hud-name");
  const hudTier = mount.querySelector("#hud-tier");
  const hudTask = mount.querySelector("#hud-task");
  const hudStep = mount.querySelector("#hud-step");
  const hudTrack = mount.querySelectorAll(".hud-track i");

  // The island shows the agent who is working, drawn with that agent's pixel body.
  // The pearl host face is not used on this page.
  let faceId = "";
  function setIslandFace(agent, mood) {
    const rest = mount.querySelector(".v-rest .tobia");
    const ask = mount.querySelector(".v-card .ava");
    if (faceId !== agent.def.id) {
      rest.replaceChildren(createMinion(agent.def, { scale: 1, mood, tier: agent.cfg.tier }));
      ask.replaceChildren(createMinion(agent.def, { scale: 1, mood: "asking", tier: agent.cfg.tier }));
      faceId = agent.def.id;
    }
    rest.querySelector(".mn").setMood(mood);
    ask.querySelector(".mn").setMood(mood === "asking" ? "asking" : mood);
  }
  function islandRest() {
    return mount.querySelector(".v-rest .tobia .mn");
  }

  const agents = new Map();
  for (const cfg of CREW) {
    const def = DEFS[cfg.id];
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = "agent-slot";
    slot.setAttribute("aria-label", `Run demo task with ${def.name}`);
    const el = createMinion(def, { scale: null, mood: "idle", tier: cfg.tier });
    slot.appendChild(el);
    grid.appendChild(slot);
    attachAura(el, cfg.kind, 2.25, def.tint ? { tint: def.tint } : {});

    const pip = document.createElement("i");
    pip.className = "pip";
    pip.style.setProperty("--c", def.c2);
    pipsBox.appendChild(pip);

    const dot = document.createElement("i");
    dot.style.setProperty("--dc", def.c2);
    dotsBox.appendChild(dot);

    slot.addEventListener("click", () => runAgentStory(cfg.id));
    agents.set(cfg.id, { cfg, def, slot, el, pip, dot });
  }

  let crewIdx = 0;
  let timer = 0;
  let inView = true;
  let stagePhase = "idle"; // idle | mentioning | working | asking | finishing | done
  const chat = mount.querySelector("#demo-chat");
  const msgs = mount.querySelector("#demo-msgs");
  const chatCap = mount.querySelector("#chat-cap");
  const line = mount.querySelector("#demo-line");
  const passBtn = mount.querySelector("#demo-pass");
  const mfig = mount.querySelector("#demo-mfig");
  const mname = mount.querySelector("#demo-mname");
  let activeId = "claude";
  let startedOnce = false;
  const crewTabs = Array.from(document.querySelectorAll("[data-crew-pick]"));
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function syncTabs() {
    for (const tab of crewTabs) {
      const on = tab.dataset.crewPick === activeId;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-pressed", on ? "true" : "false");
    }
  }

  for (const tab of crewTabs) {
    tab.addEventListener("click", () => {
      const id = tab.dataset.crewPick;
      if (!id || !agents.has(id)) return;
      startedOnce = true;
      runAgentStory(id);
    });
  }

  function paintLine(agent, typed) {
    const at = "@" + agent.def.name;
    line.replaceChildren();
    const mark = document.createElement("span");
    mark.className = "at" + (typed.length >= at.length ? " set" : "");
    mark.textContent = typed.slice(0, at.length);
    if (mark.textContent) line.appendChild(mark);
    if (typed.length > at.length) line.appendChild(document.createTextNode(typed.slice(at.length)));
    const caret = document.createElement("i");
    caret.className = "caret";
    caret.setAttribute("aria-hidden", "true");
    line.appendChild(caret);
  }

  function passFor(agent) {
    return PASSES[CREW.findIndex((c) => c.id === agent.cfg.id)] || PASSES[0];
  }

  function showChat(agent) {
    const job = passFor(agent);
    mount.dataset.view = "chat";
    chatCap.textContent = job.kind + " · tap Pass";
    mname.textContent = "@" + job.to;
    mfig.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#ab-${job.face}"/></svg>`;
    msgs.replaceChildren();
    passBtn.classList.remove("on");
  }

  function showFrames() {
    mount.dataset.view = "frames";
    passBtn.classList.remove("on");
  }

  function syncHud(agent, stepIdx, phaseLabel, detail, color, done) {
    hud.style.setProperty("--hud-a", color);
    hudName.textContent = agent.def.name;
    hudTier.textContent = agent.cfg.tierLabel;
    hudTask.textContent = `${agent.cfg.task} · ${detail}`;
    hudStep.textContent = phaseLabel;
    hudTrack.forEach((segEl, i) => {
      segEl.className = done || i < stepIdx ? "on" : i === stepIdx ? "now" : "";
    });
  }

  function setMood(agent, mood, stepIdx, done = false) {
    agent.el.setMood(mood);
    agent.pip.dataset.mood = mood;
    agent.dot.className = mood === "idle" ? "" : mood;
    agent.el._doing = stepIdx >= 0 ? { plan: makePlan(stepIdx, done) } : null;
  }

  function clearMoods(exceptId = "") {
    for (const [id, a] of agents) {
      a.slot.classList.toggle("is-active", id === activeId);
      if (id !== exceptId) setMood(a, "idle", -1, false);
    }
  }

  function schedule(fn, ms) {
    clearTimeout(timer);
    if (reducedMotion.matches) return;
    timer = setTimeout(fn, ms);
  }

  function setStaticShowcase() {
    clearTimeout(timer);
    activeId = "claude";
    syncTabs();
    const claude = agents.get("claude");
    const codex = agents.get("codex");
    clearMoods();
    setMood(claude, "working", 2, false);
    setMood(codex, "done", 3, true);
    setIslandFace(claude, "working");
    showFrames();
    paintLine(claude, "@Claude " + claude.cfg.pass);
    island.dataset.state = "rest";
    island.dataset.mood = "working";
    islStatus.textContent = "Claude working · 1 task active";
    syncHud(claude, 2, "EDIT", claude.cfg.action, claude.def.c2, false);
    paintStaticAuras();
  }

  function finishStory(approved) {
    const a = agents.get(activeId);
    if (!a) return;
    stagePhase = "finishing";
    island.dataset.state = "rest";
    island.dataset.mood = "working";
    setIslandFace(a, "working");
    islStatus.textContent = approved ? `${a.def.name} wrapping up` : `${a.def.name} stopped safely`;
    setMood(a, "working", 3, false);
    syncHud(a, 3, approved ? "VERIFY" : "SAFE STOP", approved ? "Finalizing clean folder check" : "Left original files untouched", a.def.c2, false);

    schedule(() => {
      stagePhase = "done";
      setMood(a, "done", 3, true);
      setIslandFace(a, "done");
      island.dataset.mood = "done";
      islStatus.textContent = approved ? `Done · ${a.cfg.task}` : "Cancelled cleanly";
      syncHud(a, 3, "DONE", approved ? "All steps complete" : "No changes written", "#5ee6a8", true);

      schedule(() => {
        crewIdx = (CREW.findIndex((c) => c.id === activeId) + 1) % CREW.length;
        runAgentStory(CREW[crewIdx].id);
      }, 2800);
    }, 1500);
  }

  function runAgentStory(id) {
    clearTimeout(timer);
    activeId = id;
    syncTabs();
    const a = agents.get(id);
    if (!a) return;
    if (reducedMotion.matches) {
      setStaticShowcase();
      return;
    }

    stagePhase = "mentioning";
    clearMoods(id);
    island.dataset.state = "rest";
    island.dataset.mood = "idle";
    const job = passFor(a);
    islStatus.textContent = `Chat · pass to @${job.to}`;
    syncHud(a, -1, "PASS", job.kind, a.def.c2, false);
    showChat(a);
    const full = `@${job.to} ${job.line}`;
    let n = 0;
    paintLine(a, "");
    const type = () => {
      if (stagePhase !== "mentioning" || activeId !== id) return;
      n += 1;
      paintLine(a, full.slice(0, n));
      if (n < full.length) schedule(type, n <= a.def.name.length + 1 ? 42 : 16);
      else schedule(() => tapPass(a), 420);
    };
    schedule(type, 220);
  }

  function tapPass(a) {
    if (stagePhase !== "mentioning" || activeId !== a.cfg.id) return;
    passBtn.classList.add("on");
    const bubble = document.createElement("div");
    bubble.className = "me";
    const who = document.createElement("b");
    const job = passFor(a);
    who.textContent = "@" + job.to;
    bubble.append(who, document.createTextNode(" " + job.line));
    msgs.replaceChildren(bubble);
    schedule(() => {
      if (stagePhase !== "mentioning" || activeId !== a.cfg.id) return;
      showFrames();
      beginWork(a);
    }, 900);
  }

  function beginWork(a) {
    showFrames();
    stagePhase = "working";
    clearMoods(a.cfg.id);
    setMood(a, "working", 0, false);
    setIslandFace(a, "working");
    island.dataset.state = "rest";
    island.dataset.mood = "working";
    islStatus.textContent = `${a.def.name} · ${a.cfg.task}`;
    syncHud(a, 0, "READ", a.cfg.action, a.def.c2, false);

    schedule(() => {
      if (stagePhase !== "working" || activeId !== a.cfg.id) return;
      setMood(a, "working", 1, false);
      syncHud(a, 1, "PLAN", a.cfg.action, a.def.c2, false);
    }, 1500);

    schedule(() => {
      if (activeId !== a.cfg.id) return;
      stagePhase = "asking";
      setMood(a, "asking", 2, false);
      setIslandFace(a, "asking");
      islWhere.textContent = a.cfg.askWhere;
      islAsk.textContent = a.cfg.askQ;
      islSub.textContent = "Nothing runs without your confirmation";
      island.dataset.mood = "asking";
      island.dataset.state = "ask";
      syncHud(a, 2, "NEEDS YOU", "Waiting in Minztobia's Island", "#ffc24a", false);

      schedule(() => {
        if (stagePhase === "asking") finishStory(true);
      }, 4200);
    }, 3400);
  }

  islAllow.addEventListener("click", () => {
    if (stagePhase === "asking") finishStory(true);
  });
  islDeny.addEventListener("click", () => {
    if (stagePhase === "asking") finishStory(false);
  });
  mount.querySelector(".v-rest").addEventListener("click", () => {
    runAgentStory(activeId);
  });
  passBtn.addEventListener("click", () => {
    const a = agents.get(activeId);
    if (a && stagePhase === "mentioning") tapPass(a);
  });

  // Subtle pupil tracking inside the desk stage
  mount.addEventListener("pointermove", (e) => {
    if (reducedMotion.matches) return;
    const host = islandRest();
    if (host) lookAt(host, e.clientX, e.clientY);
    for (const a of agents.values()) lookAt(a.el, e.clientX, e.clientY);
  }, { passive: true });
  mount.addEventListener("pointerleave", () => {
    const host = islandRest();
    if (host) lookCenter(host);
    for (const a of agents.values()) lookCenter(a.el);
  });

  let wasPaused = true;
  function updateRunningState() {
    const paused = !inView || document.hidden || reducedMotion.matches;
    mount.classList.toggle("stage-paused", paused);
    setAurasPaused(paused);
    if (paused) {
      clearTimeout(timer);
      if (reducedMotion.matches) setStaticShowcase();
    } else if (!startedOnce || (wasPaused && (stagePhase === "idle" || stagePhase === "mentioning"))) {
      startedOnce = true;
      runAgentStory(activeId);
    }
    wasPaused = paused;
  }

  const r0 = mount.getBoundingClientRect();
  inView = r0.bottom > 0 && r0.top < innerHeight;

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      inView = !!entries[0]?.isIntersecting;
      updateRunningState();
      if (inView && !reducedMotion.matches && stagePhase !== "mentioning" && stagePhase !== "asking" && stagePhase !== "finishing") {
        startedOnce = true;
        runAgentStory(activeId);
      }
    }, { threshold: 0.08 });
    io.observe(mount);
  }

  document.addEventListener("visibilitychange", updateRunningState);
  reducedMotion.addEventListener("change", updateRunningState);

  syncTabs();
  if (reducedMotion.matches) {
    setStaticShowcase();
  } else if (inView) {
    startedOnce = true;
    runAgentStory("claude");
  } else {
    mount.classList.add("stage-paused");
    setAurasPaused(true);
    setStaticShowcase();
  }
}

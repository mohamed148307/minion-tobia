// Living scene controller for the Minztobia public download page.
// Drives one clean story loop inside a site-plan Frame:
// idle -> working -> asking permission in Tobia's Island -> approved -> done (shockwave & sparks) -> idle.

import { DEFS, createMinion, lookAt, lookCenter } from "./minion.js";
import { attachAura, setAurasPaused, paintStaticAuras } from "./aura.js";

const CREW = [
  { id: "claude",   kind: "claude", tier: "deep",     tierLabel: "DEEP",     task: "Tidy my Downloads folder",        askQ: "Move 18 installers & clean temp files?", askWhere: "~/Downloads · Claude",   action: "Sorting 42 files" },
  { id: "codex",    kind: "codex",  tier: "balanced", tierLabel: "BALANCED", task: "Rename screenshots by date",       askQ: "Rename 24 PNG files on Desktop?",        askWhere: "~/Desktop · ChatGPT",    action: "Matching photo timestamps" },
  { id: "grok",     kind: "grok",   tier: "fast",     tierLabel: "FAST",     task: "Summarize 40 unread updates",      askQ: "Save digest note to Desktop?",           askWhere: "~/Desktop · Grok",       action: "Grouping key points" },
  { id: "opencode", kind: "zcode",  tier: "balanced", tierLabel: "FREE",     task: "Clean up project build cache",     askQ: "Remove 310 MB of stale cache folders?",  askWhere: "~/Work/cache · OpenCode", action: "Checking old cache files" },
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

  const tobiaRest = createMinion(DEFS.tobia, { scale: 1, mood: "idle" });
  mount.querySelector(".v-rest .tobia").appendChild(tobiaRest);
  const tobiaAsk = createMinion(DEFS.tobia, { scale: 1, mood: "asking" });
  mount.querySelector(".v-card .ava").appendChild(tobiaAsk);

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
  let stagePhase = "idle"; // idle | working | asking | finishing | done
  let activeId = "claude";
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

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
    const claude = agents.get("claude");
    const codex = agents.get("codex");
    clearMoods();
    setMood(claude, "working", 2, false);
    setMood(codex, "done", 3, true);
    tobiaRest.setMood("working");
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
    tobiaRest.setMood("working");
    islStatus.textContent = approved ? `${a.def.name} wrapping up` : `${a.def.name} stopped safely`;
    setMood(a, "working", 3, false);
    syncHud(a, 3, approved ? "VERIFY" : "SAFE STOP", approved ? "Finalizing clean folder check" : "Left original files untouched", a.def.c2, false);

    schedule(() => {
      stagePhase = "done";
      setMood(a, "done", 3, true);
      tobiaRest.setMood("done");
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
    const a = agents.get(id);
    if (!a) return;
    if (reducedMotion.matches) {
      setStaticShowcase();
      return;
    }

    stagePhase = "working";
    clearMoods(id);
    setMood(a, "working", 0, false);
    tobiaRest.setMood("working");
    island.dataset.state = "rest";
    island.dataset.mood = "working";
    islStatus.textContent = `${a.def.name} · ${a.cfg.task}`;
    syncHud(a, 0, "READ", a.cfg.action, a.def.c2, false);

    schedule(() => {
      setMood(a, "working", 1, false);
      syncHud(a, 1, "PLAN", a.cfg.action, a.def.c2, false);
    }, 1500);

    schedule(() => {
      stagePhase = "asking";
      setMood(a, "asking", 2, false);
      tobiaRest.setMood("asking");
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

  // Subtle pupil tracking inside the desk stage
  mount.addEventListener("pointermove", (e) => {
    if (reducedMotion.matches) return;
    lookAt(tobiaRest, e.clientX, e.clientY);
    for (const a of agents.values()) lookAt(a.el, e.clientX, e.clientY);
  }, { passive: true });
  mount.addEventListener("pointerleave", () => {
    lookCenter(tobiaRest);
    for (const a of agents.values()) lookCenter(a.el);
  });

  function updateRunningState() {
    const paused = !inView || document.hidden || reducedMotion.matches;
    mount.classList.toggle("stage-paused", paused);
    setAurasPaused(paused);
    if (paused) {
      clearTimeout(timer);
      if (reducedMotion.matches) setStaticShowcase();
    } else if (stagePhase === "idle") {
      runAgentStory(activeId);
    }
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      inView = !!entries[0]?.isIntersecting;
      updateRunningState();
      if (inView && !reducedMotion.matches && stagePhase !== "asking" && stagePhase !== "finishing") {
        runAgentStory(activeId);
      }
    }, { threshold: 0.08 });
    io.observe(mount);
  }

  document.addEventListener("visibilitychange", updateRunningState);
  reducedMotion.addEventListener("change", updateRunningState);

  if (reducedMotion.matches) {
    setStaticShowcase();
  } else {
    runAgentStory("claude");
  }
}

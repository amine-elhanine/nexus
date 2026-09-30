/* ============================================================
   Nexus — landing page v2 ("the page is a run")
   1. Live GitHub Releases wiring (version pills + download links)
   2. Boot overlay (skippable, once per session, JS-injected)
   3. Hex particle field (canvas, mouse-reactive)
   4. Hero plan reveal + scramble/decode text
   5. Run rail (scroll progress) + scrollspy
   6. Loop animation (Brief→Plan→Act→Verify→Done)
   7. Playground terminal (typeable, with easter eggs)
   8. Undo easter egg (chip + ctrl/cmd+z + toasts)
   9. Reveal-on-scroll, mobile nav, copy button
   No dependencies. Degrades gracefully without JS or network.
   ============================================================ */

(() => {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============ 0. Random app appearance theme ============ */

  function initRandomTheme() {
    const themes = ["dark-white", "nexus", "midnight", "grape", "ember", "crimson", "lagoon", "moss", "alabaster", "daylight"];
    let previous = null;
    try { previous = sessionStorage.getItem("nexus-landing-theme"); } catch { /* storage may be unavailable */ }
    const choices = themes.filter((theme) => theme !== previous);
    const theme = choices[Math.floor(Math.random() * choices.length)] || themes[0];
    document.documentElement.setAttribute("data-theme", theme);
    try { sessionStorage.setItem("nexus-landing-theme", theme); } catch { /* storage may be unavailable */ }
  }

  /* ============ 1. GitHub Releases ============ */

  const RELEASE_REPO = "amine-elhanine/nexus"; // canonical (L7A9/nexus redirects here)
  const RELEASES_URL = `https://github.com/${RELEASE_REPO}/releases/latest`;
  const API_URL = `https://api.github.com/repos/${RELEASE_REPO}/releases/latest`;
  const CACHE_KEY = "nexus-lp-release";
  const CACHE_TTL = 60 * 60 * 1000; // 1 hour

  const DL_PATTERNS = {
    // electron-builder artifacts historically use spaces OR dots:
    // "Nexus Setup 0.4.1.exe" / "Nexus.Setup.0.4.1.exe" / "Nexus.0.4.1.Portable.exe"
    "win-setup": /Nexus[ ._-]*Setup.*\.exe$/i,
    "win-portable": /Nexus.*Portable\.exe$/i,
  };

  function versionFromTag(tag) {
    return (tag || "").replace(/^v/i, "") || null;
  }

  function assetMatch(assets, pattern) {
    if (!Array.isArray(assets)) return null;
    const hit = assets.find((a) => pattern.test(a.name || ""));
    return hit ? hit.browser_download_url : null;
  }

  function applyRelease(release) {
    const version = versionFromTag(release.tag_name);
    if (version) {
      document.querySelectorAll("[data-release-version]").forEach((el) => {
        el.textContent = `v${version}`;
      });
    }
    document.querySelectorAll("[data-dl]").forEach((a) => {
      const url = assetMatch(release.assets, DL_PATTERNS[a.getAttribute("data-dl")] || /./);
      a.setAttribute("href", url || RELEASES_URL);
      a.setAttribute("rel", "noopener");
    });
  }

  function loadCachedRelease() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { ts, release } = JSON.parse(raw);
      return Date.now() - ts > CACHE_TTL || !release ? null : release;
    } catch {
      return null;
    }
  }

  async function fetchRelease() {
    try {
      const res = await fetch(API_URL, { headers: { Accept: "application/vnd.github+json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const release = await res.json();
      if (!release || !release.tag_name) throw new Error("bad payload");
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), release }));
      } catch { /* private mode — fine */ }
      return release;
    } catch {
      return null;
    }
  }

  function setVersionText(text) {
    document.querySelectorAll("[data-release-version]").forEach((el) => (el.textContent = text));
  }

  function initReleases() {
    const cached = loadCachedRelease();
    if (cached) applyRelease(cached);
    fetchRelease().then((r) => {
      if (r) applyRelease(r);
      else setVersionText("latest"); // offline / API failure — no hardcoded version anywhere
    });
  }

  /* ============ 2. Boot overlay ============ */

  function initBoot() {
    let seen = false;
    try { seen = sessionStorage.getItem("nexus-boot-v2") === "1"; } catch { /* ok */ }
    if (seen || reduced) return;

    const boot = document.createElement("div");
    boot.className = "boot";
    boot.setAttribute("aria-hidden", "true");
    // show the release version only if we actually have one (cache or API) — never hardcoded
    const cachedNow = loadCachedRelease();
    const bootVer = cachedNow ? ` v${versionFromTag(cachedNow.tag_name) ?? ""}`.trimEnd() : "";
    const lines = [
      `<span class="hl">nexus${bootVer} — desktop agent</span>`,
      '▸ mounting system skills ......... <span class="ok">53</span>',
      "▸ linking providers .............. <span class='ok'>15</span>",
      "▸ loading rule packs ............. <span class='ok'>122</span>",
      "▸ attaching subagents ............ <span class='ok'>68</span>",
      '<span class="ok">ready</span> — welcome. scroll to run.',
    ];
    boot.innerHTML = `<div class="boot-inner">${lines
      .map((l) => `<div class="boot-line">${l}</div>`)
      .join("")}<div class="boot-skip">click or scroll to skip</div></div>`;
    document.body.appendChild(boot);
    try { sessionStorage.setItem("nexus-boot-v2", "1"); } catch { /* ok */ }

    const els = boot.querySelectorAll(".boot-line");
    let done = false;
    document.body.style.overflow = "hidden";

    function finish() {
      if (done) return;
      done = true;
      els.forEach((el) => el.classList.add("on"));
      document.body.style.overflow = "";
      boot.classList.add("done");
      setTimeout(() => boot.remove(), 600);
      ["click", "keydown", "wheel", "touchstart"].forEach((ev) =>
        window.removeEventListener(ev, finish, true)
      );
      document.dispatchEvent(new CustomEvent("nexus:boot-done"));
    }

    ["click", "keydown", "wheel", "touchstart"].forEach((ev) =>
      window.addEventListener(ev, finish, { capture: true, once: false, passive: true })
    );

    els.forEach((el, i) => setTimeout(() => el.classList.add("on"), 130 + i * 190));
    setTimeout(finish, 130 + lines.length * 190 + 800);
  }

  /* ============ 3. Hex particle field ============ */

  function initHexField() {
    const canvas = document.getElementById("hexField");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1;
    let hexes = [];
    const mouse = { x: -9999, y: -9999 };

    function hexPath(x, y, r, rot) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = rot + (i * Math.PI) / 3;
        const px = x + r * Math.cos(a);
        const py = y + r * Math.sin(a);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const hx of hexes) {
        hexPath(hx.x, hx.y, hx.r, hx.rot);
        if (hx.filled) {
          ctx.fillStyle = `rgba(52, 211, 153, ${hx.alpha * 0.5})`;
          ctx.fill();
        } else {
          ctx.strokeStyle = `rgba(52, 211, 153, ${hx.alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(24, Math.min(80, Math.round((w * h) / 26000)));
      hexes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 5 + Math.random() * 18,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.002,
        alpha: 0.04 + Math.random() * 0.16,
        filled: Math.random() < 0.18,
      }));
      if (reduced) draw();
    }

    function tick() {
      if (!document.hidden) {
        for (const hx of hexes) {
          const dx = hx.x - mouse.x;
          const dy = hx.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 22500 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const push = ((150 - d) / 150) * 0.55;
            hx.vx += (dx / d) * push;
            hx.vy += (dy / d) * push;
          }
          hx.vx *= 0.985;
          hx.vy *= 0.985;
          hx.x += hx.vx;
          hx.y += hx.vy;
          hx.rot += hx.vr;
          if (hx.x < -30) hx.x = w + 30; else if (hx.x > w + 30) hx.x = -30;
          if (hx.y < -30) hx.y = h + 30; else if (hx.y > h + 30) hx.y = -30;
        }
        draw();
      }
      requestAnimationFrame(tick);
    }

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener(
      "mousemove",
      (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      },
      { passive: true }
    );
    window.addEventListener("mouseout", () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });

    resize();
    if (!reduced) requestAnimationFrame(tick);
  }

  /* ============ 4. Hero plan reveal + scramble text ============ */

  function initHeroPlan() {
    const lines = document.querySelectorAll("#planBody .t-line");
    if (!lines.length) return;
    if (reduced) {
      lines.forEach((l) => l.classList.add("on"));
      return;
    }
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      lines.forEach((l, i) => setTimeout(() => l.classList.add("on"), 200 + i * 170));
    };
    document.addEventListener("nexus:boot-done", start, { once: true });
    // fallback if boot never fires (repeat visitor where boot is skipped)
    setTimeout(start, 600);
  }

  const SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#______";
  function scramble(el) {
    const finalText = el.dataset.final ?? el.textContent;
    el.dataset.final = finalText;
    if (reduced) {
      el.textContent = finalText;
      return;
    }
    const dur = 780;
    const start = performance.now();
    const frame = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const n = Math.floor(t * finalText.length);
      let out = finalText.slice(0, n);
      for (let i = n; i < finalText.length; i++) {
        out += finalText[i] === " " ? " " : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
      }
      el.textContent = out;
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = finalText;
    };
    requestAnimationFrame(frame);
  }

  function initScramble() {
    const els = document.querySelectorAll("[data-scramble]");
    if (!els.length) return;
    if (reduced || !("IntersectionObserver" in window)) return; // keep static text
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            scramble(e.target);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    els.forEach((el) => io.observe(el));
  }

  /* ============ 5. Run rail + scrollspy ============ */

  const STEPS = [
    ["run", "run"],
    ["surfaces", "surfaces"],
    ["loop", "how it thinks"],
    ["playground", "drive it"],
    ["trust", "trust"],
    ["download", "get it"],
  ];

  function getCurrentStep() {
    const y = window.scrollY;
    if (y <= 60) return 0;
    const mid = y + window.innerHeight * 0.45;
    let current = 0;
    STEPS.forEach(([id], i) => {
      const sec = document.getElementById(id);
      if (sec && sec.offsetTop <= mid) current = i;
    });
    return current;
  }

  function initRail() {
    const fill = document.getElementById("railFill");
    const label = document.getElementById("railLabel");
    const railSteps = document.querySelectorAll(".rail-step");
    if (!fill || !railSteps.length) return;

    let ticking = false;
    function update() {
      ticking = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const frac = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      fill.style.height = `${(frac * 100).toFixed(1)}%`;

      const current = getCurrentStep();
      railSteps.forEach((el, i) => {
        el.classList.toggle("hit", i === current);
        el.classList.toggle("done", i < current);
      });
      if (label) label.textContent = `${String(current + 1).padStart(2, "0")} · ${STEPS[current][1]}`;
    }
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }

  function initScrollspy() {
    const links = document.getElementById("navLinks");
    if (!links || !("IntersectionObserver" in window)) return;
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          links.querySelectorAll("a").forEach((a) => {
            if (a.getAttribute("href") === `#${e.target.id}`) a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    ["surfaces", "loop", "playground", "trust", "download", "man"]
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .forEach((s) => spy.observe(s));
  }

  /* ============ 6. Loop animation ============ */

  function initLoop() {
    const flow = document.getElementById("loopFlow");
    const repair = document.getElementById("repairPill");
    if (!flow || reduced || !("IntersectionObserver" in window)) {
      if (flow) flow.querySelectorAll("[data-node],[data-link]").forEach((n) => n.classList.add("lit"));
      if (repair) repair.classList.add("hot");
      return;
    }
    const nodes = [...flow.querySelectorAll("[data-node]")];
    const links = [...flow.querySelectorAll("[data-link]")];
    let timer = null;
    let running = false;

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    async function run() {
      running = true;
      while (running) {
        flow.querySelectorAll(".lit").forEach((n) => n.classList.remove("lit"));
        repair && repair.classList.remove("hot");
        for (let i = 0; i < nodes.length && running; i++) {
          nodes[i].classList.add("lit");
          if (links[i]) links[i].classList.add("lit");
          await wait(i === 0 ? 400 : 640);
        }
        if (!running) break;
        await wait(350);
        repair && repair.classList.add("hot");
        await wait(1100);
        repair && repair.classList.remove("hot");
        await wait(1500);
      }
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !running) run();
          else if (!e.isIntersecting && running) {
            running = false;
            if (timer) clearTimeout(timer);
          }
        });
      },
      { threshold: 0.25 }
    );
    io.observe(flow);
  }

  /* ============ 7. Playground terminal ============ */

  function initPlayground() {
    const out = document.getElementById("playOut");
    const form = document.getElementById("playForm");
    const input = document.getElementById("playInput");
    if (!out || !form || !input) return;

    const accents = ["emerald", "ocean", "ember"];
    let checkpoint = 20;
    const history = [];
    let histIdx = -1;

    const line = (html, cls = "") => {
      const div = document.createElement("div");
      div.className = `p-line ${cls}`;
      div.innerHTML = html;
      out.appendChild(div);
      out.scrollTop = out.scrollHeight;
      return div;
    };
    const esc = (s) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const CMDS = {
      help() {
        line("<span class='p-hl'>available commands</span>", "p-hl");
        [
          ["plan / ask / auto", "the three control modes"],
          ["verify", "run the verify supervisor (animatically)"],
          ["undo", "step back to the previous step — try ctrl+z anywhere"],
          ["providers", "list all 15 — including local ollama"],
          ["skills", "what ships in the box"],
          ["mcp", "model context protocol support"],
          ["notebook", "the groundedness gate"],
          ["theme", "recolor this page: emerald → ocean → ember"],
          ["download", "jump to step 06"],
          ["whoami / ls / clear / exit", "…you know what to do"],
        ].forEach(([c, d]) => line(`  <span class="p-ok">${c.padEnd(18)}</span><span class="p-dim">${d}</span>`));
      },
      plan() {
        line("<span class='p-hl'>plan mode</span> — recursion 40 · repairs 0", "p-warn");
        line("hard read-only: no writes, no shell, no mcp. explore with zero side effects.", "p-dim");
      },
      ask() {
        line("<span class='p-hl'>ask mode</span> — recursion 100 · repairs 3");
        line("interactive: proposes, you approve. approval gates on risky commands.", "p-dim");
      },
      auto() {
        line("<span class='p-hl'>auto mode</span> — recursion 150 · repairs 5", "p-ok");
        line("end-to-end autonomous with a verify supervisor and self-repair.", "p-dim");
      },
      async verify() {
        const steps = [
          ["diff-first baseline … scoped to files this run touched", "p-dim"],
          ["typecheck cascade (npm/pnpm/yarn/bun auto-detect)", "p-dim"],
          ["test suite ………………… <span class='p-ok'>26 passed</span>", "p-ok"],
          ["output contract ……… <span class='p-ok'>artifacts validated</span>", "p-ok"],
          ["verdict: <span class='p-ok'>grounded · checkpoint saved · undo ready</span>", "p-hl"],
        ];
        for (const [html, cls] of steps) {
          await new Promise((r) => setTimeout(r, 420));
          line(html, cls);
        }
      },
      undo() {
        const ok = undoRewind();
        if (ok) {
          const current = getCurrentStep();
          const [, name] = STEPS[current];
          line(
            `↩ stepped back to <span class="p-ok">${String(current + 1).padStart(2, "0")} · ${name}</span>.`
          );
        } else {
          line("working tree clean — already at step 01 (top of the page).", "p-warn");
        }
      },
      providers() {
        line("<span class='p-hl'>15 providers · bring-your-own-key</span>");
        line("openai · anthropic · google gemini · mistral · groq · xai · openrouter · deepseek · opencode zen · together · fireworks · azure openai · aws bedrock · <span class='p-ok'>ollama (local)</span> · any openai-compatible endpoint");
        line("keys encrypted at rest with your OS keychain.", "p-dim");
      },
      skills() {
        line("<span class='p-hl'>in the box:</span> 53 skills · 38 slash commands · 68 specialist subagents · 122 rule packs");
        line("bring your own as plain SKILL.md files in .nexus/skills.", "p-dim");
      },
      mcp() {
        line("<span class='p-hl'>mcp native</span> — stdio · http · sse transports");
        line("warm reconnects, per-server fault isolation, connection tester, encrypted secrets.", "p-dim");
      },
      notebook() {
        line("<span class='p-hl'>groundedness gate</span> — every answer scored 0–10 against your sources");
        line("not covered? nexus says “not in your files” and refuses rather than guessing.", "p-dim");
      },
      theme() {
        const cur = document.documentElement.getAttribute("data-accent") || "emerald";
        const next = accents[(accents.indexOf(cur) + 1) % accents.length];
        if (next === "emerald") document.documentElement.removeAttribute("data-accent");
        else document.documentElement.setAttribute("data-accent", next);
        line(`theme → <span class="p-ok">${next}</span>  (the whole page re-inked)`);
      },
      download() {
        line("executing step 06 — get it…", "p-ok");
        document.getElementById("download")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      },
      whoami() {
        line("visitor@desktop — <span class='p-ok'>the human in the loop</span>. the most important role here.");
      },
      ls() {
        line("surfaces/  loop/  trust/  download/   <span class='p-dim'>— it's a webpage, not your fs</span>");
      },
      clear() {
        out.innerHTML = "";
      },
      exit() {
        line("there is no exit. there is only <span class='p-ok'>download</span>.", "p-warn");
        CMDS.download();
      },
      sudo(args) {
        line(
          `<span class="p-err">approval gate: DENIED</span> — “${esc(("sudo " + (args || "")).trim())}”`,
          "p-err"
        );
        line("nice try. destructive commands are refused before they reach a shell.", "p-dim");
      },
    };

    async function run(raw) {
      const cmd = raw.trim();
      if (!cmd) return;
      history.unshift(cmd);
      histIdx = -1;
      line(`<span class="t-prompt">visitor@nexus:~$</span> ${esc(cmd)}`, "p-echo");
      const [name, ...rest] = cmd.split(/\s+/);
      const fn = CMDS[name.toLowerCase()];
      if (name.toLowerCase() === "sudo") return CMDS.sudo(rest.join(" "));
      if (fn && typeof fn === "function" && name.toLowerCase() !== "sudo") {
        if (name.toLowerCase() === "verify" || name.toLowerCase() === "download") await fn();
        else fn(rest.join(" "));
      } else if (fn) {
        fn();
      } else {
        line(
          `nexus: command not found: <span class="p-err">${esc(name)}</span> — try <span class="p-ok">help</span>`,
          "p-dim"
        );
      }
    }

    // greeting
    line("nexus playground — type <span class='p-ok'>help</span> to see what i can do.", "p-hl");
    line("this shell is a toy. the product isn't.", "p-dim");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = input.value;
      input.value = "";
      run(v);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        histIdx = Math.min(histIdx + 1, history.length - 1);
        if (histIdx >= 0) input.value = history[histIdx];
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        histIdx = Math.max(histIdx - 1, -1);
        input.value = histIdx === -1 ? "" : history[histIdx];
      }
    });
    document.querySelectorAll(".hint-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        run(chip.dataset.cmd);
        input.focus({ preventScroll: true });
      });
    });
  }

  /* ============ 8. Undo easter egg + toasts ============ */

  let toastTimer = null;
  function toast(text) {
    let t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = text;
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  let isRewindingToTop = false;

  function updateUndoState(forceTop = false) {
    const chip = document.querySelector(".undo-chip");
    if (!chip) return;
    if (forceTop || isRewindingToTop) {
      chip.disabled = true;
      chip.classList.add("disabled");
      chip.setAttribute("aria-disabled", "true");
      chip.setAttribute("title", "Already at the top of the page");
      return;
    }
    const atTop = window.scrollY <= 60;
    chip.disabled = atTop;
    chip.classList.toggle("disabled", atTop);
    if (atTop) {
      chip.setAttribute("aria-disabled", "true");
      chip.setAttribute("title", "Already at the top of the page");
    } else {
      chip.removeAttribute("aria-disabled");
      chip.setAttribute("title", "Undo to the previous step");
    }
  }

  function undoRewind() {
    if (window.scrollY <= 60) {
      updateUndoState(true);
      return false;
    }

    const current = getCurrentStep();
    const targetIndex = Math.max(0, current - 1);
    const [targetId, targetName] = STEPS[targetIndex];

    if (targetIndex === 0) {
      isRewindingToTop = true;
      updateUndoState(true);
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      setTimeout(() => {
        isRewindingToTop = false;
        updateUndoState();
      }, reduced ? 50 : 800);
    } else {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      }
    }

    toast(`↩ step ${String(targetIndex + 1).padStart(2, "0")} · ${targetName}`);
    updateUndoState();
    return true;
  }

  function initUndo() {
    const chip = document.createElement("button");
    chip.className = "undo-chip";
    chip.type = "button";
    chip.textContent = "↩ undo";
    chip.setAttribute("aria-label", "Undo — return to the previous step");
    chip.addEventListener("click", () => {
      if (!chip.disabled) undoRewind();
    });
    document.body.appendChild(chip);

    updateUndoState();

    window.addEventListener("scroll", () => updateUndoState(), { passive: true });
    ["wheel", "touchstart"].forEach((ev) =>
      window.addEventListener(ev, () => { isRewindingToTop = false; }, { passive: true })
    );

    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        const t = e.target;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        e.preventDefault();
        if (window.scrollY > 60) {
          undoRewind();
        }
      }
    });
  }

  /* ============ 9. Reveal, nav, misc ============ */

  function initReveal() {
    const items = document.querySelectorAll("[data-reveal]");
    if (reduced || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    items.forEach((el) => io.observe(el));
  }

  function initNav() {
    const nav = document.getElementById("nav");
    const links = document.getElementById("navLinks");
    const burger = document.getElementById("navBurger");
    if (!nav) return;
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (burger && links) {
      burger.addEventListener("click", () => {
        const open = links.classList.toggle("open");
        burger.setAttribute("aria-expanded", String(open));
      });
      links.addEventListener("click", (e) => {
        if (e.target.tagName === "A") {
          links.classList.remove("open");
          burger.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  function initCopy() {
    const btn = document.getElementById("copyBuild");
    const pre = document.getElementById("buildCmds");
    if (!btn || !pre) return;
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.textContent.trim());
        btn.textContent = "Copied ✓";
      } catch {
        btn.textContent = "Select + copy";
      }
      setTimeout(() => (btn.textContent = "Copy"), 1800);
    });
  }

  /* ============ boot ============ */

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  initRandomTheme();
  initReleases();
  initBoot();
  initHexField();
  initHeroPlan();
  initScramble();
  initRail();
  initScrollspy();
  initLoop();
  initPlayground();
  initUndo();
  initReveal();
  initNav();
  initCopy();
})();

/* ============================================================
   Nexus — landing page v3 (honest by design)
   1. Live GitHub Releases wiring (version pills + download links)
   2. Theme picker (nav button + swatch popover, persisted)
   3. Hex particle field (canvas, mouse-reactive, theme-aware)
   4. Scramble/decode text
   5. Run rail (scroll progress) + hero plan card scroll states
   6. Loop animation (Brief→Plan→Act→Verify→Done)
   7. Undo easter egg (chip + ctrl/cmd+z + toasts)
   8. Reveal-on-scroll, mobile nav, copy button
   No dependencies. Degrades gracefully without JS or network.
   No terminal chrome, no mock app UI — the page never pretends
   to be the product.
   ============================================================ */

(() => {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  /* ============ 2. Theme picker ============ */

  // Same appearance themes as the desktop Settings picker. "nexus" is the
  // default palette (no attribute needed).
  const THEMES = [
    { id: "nexus", label: "Nexus", sw: "#34d399" },
    { id: "dark-white", label: "Dark White", sw: "#f5f5f5" },
    { id: "midnight", label: "Midnight", sw: "#38bdf8" },
    { id: "grape", label: "Grape", sw: "#a78bfa" },
    { id: "ember", label: "Ember", sw: "#fb923c" },
    { id: "crimson", label: "Crimson", sw: "#fb7185" },
    { id: "lagoon", label: "Lagoon", sw: "#2dd4bf" },
    { id: "moss", label: "Moss", sw: "#4ade80" },
    { id: "alabaster", label: "Alabaster", sw: "#ea580c" },
    { id: "daylight", label: "Daylight", sw: "#059669" },
  ];
  const THEME_KEY = "nexus-landing-theme";
  let onThemeChange = null; // set by the hex field to re-ink the canvas

  function currentThemeId() {
    return document.documentElement.getAttribute("data-theme") || "nexus";
  }

  function applyTheme(id, persist) {
    if (id === "nexus") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", id);
    if (persist) {
      try { localStorage.setItem(THEME_KEY, id); } catch { /* private mode — fine */ }
    }
    const dot = document.getElementById("themeDot");
    if (dot) {
      const t = THEMES.find((x) => x.id === id);
      if (t) dot.style.background = t.sw;
    }
    document.querySelectorAll(".theme-item").forEach((el) => {
      el.setAttribute("aria-checked", String(el.dataset.themeId === id));
    });
    if (onThemeChange) onThemeChange();
  }

  function initThemePicker() {
    const btn = document.getElementById("themeBtn");
    const pop = document.getElementById("themePop");
    if (!btn || !pop) return;

    THEMES.forEach((t) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "theme-item";
      item.dataset.themeId = t.id;
      item.setAttribute("role", "menuitemradio");
      item.innerHTML = `<span class="sw" style="--sw:${t.sw}" aria-hidden="true"></span><span>${t.label}</span><span class="tick" aria-hidden="true">✓</span>`;
      item.addEventListener("click", () => {
        applyTheme(t.id, true);
        close();
        btn.focus({ preventScroll: true });
      });
      pop.appendChild(item);
    });

    function open() {
      pop.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      const first = pop.querySelector(".theme-item");
      if (first) first.focus({ preventScroll: true });
    }
    function close() {
      pop.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    }

    btn.addEventListener("click", () => {
      pop.hidden ? open() : close();
    });
    document.addEventListener("click", (e) => {
      if (pop.hidden) return;
      if (!pop.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !pop.hidden) {
        close();
        btn.focus({ preventScroll: true });
      }
    });

    // The head inline script already applied the saved theme (no flash);
    // sync the picker state with it.
    applyTheme(currentThemeId(), false);
  }

  /* ============ 3. Hex particle field ============ */

  function initHexField() {
    const canvas = document.getElementById("hexField");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1;
    let hexes = [];
    const mouse = { x: -9999, y: -9999 };
    // Touch devices get a static field: no cursor to repel, and a forever
    // rAF loop under iOS Safari's fixed blurred layers is the classic
    // renderer-memory crash. Desktop keeps the animated field.
    const animated = window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduced;

    // theme-aware ink: follow the --green token of the active theme
    let ink = [52, 211, 153];
    function refreshInk() {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--green").trim();
      const m = /^#([0-9a-f]{6})$/i.exec(v);
      if (m) {
        ink = [
          parseInt(m[1].slice(0, 2), 16),
          parseInt(m[1].slice(2, 4), 16),
          parseInt(m[1].slice(4, 6), 16),
        ];
      }
    }
    onThemeChange = () => {
      refreshInk();
      draw();
    };

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
      const [r, g, b] = ink;
      for (const hx of hexes) {
        hexPath(hx.x, hx.y, hx.r, hx.rot);
        if (hx.filled) {
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${hx.alpha * 0.5})`;
          ctx.fill();
        } else {
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${hx.alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    function resize() {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      // iOS fires resize for every URL-bar collapse/expand while scrolling;
      // rebuilding the field each time churns canvas buffers for nothing
      if (Math.abs(nw - w) < 2 && Math.abs(nh - h) < 2) return;
      w = nw;
      h = nh;
      dpr = Math.min(animated ? 2 : 1.5, window.devicePixelRatio || 1);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(
        animated ? 24 : 14,
        Math.min(animated ? 80 : 36, Math.round((w * h) / (animated ? 26000 : 34000)))
      );
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
      draw();
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
    if (animated) {
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
    }

    refreshInk();
    resize();
    if (animated) requestAnimationFrame(tick);
  }

  /* ============ 4. Scramble/decode text ============ */

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

  /* ============ 5. Run rail + hero plan card ============ */

  const STEPS = [
    ["run", "run"],
    ["surfaces", "surfaces"],
    ["loop", "how it thinks"],
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
    const planItems = document.querySelectorAll("#planSteps > li");
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

      // hero plan card: step i links to STEPS[i + 1]; the agent "executes"
      // as the visitor scrolls
      planItems.forEach((li, i) => {
        const idx = i + 1;
        li.classList.toggle("active", idx === current);
        li.classList.toggle("done", idx < current);
        const no = li.querySelector(".ps-no");
        if (no) no.textContent = idx < current ? "✓" : no.dataset.no;
      });
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
    ["surfaces", "loop", "trust", "download", "man"]
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

  /* ============ 7. Undo easter egg + toasts ============ */

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

  /* ============ 8. Reveal, nav, misc ============ */

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

  initReleases();
  initThemePicker();
  initHexField();
  initScramble();
  initRail();
  initScrollspy();
  initLoop();
  initUndo();
  initReveal();
  initNav();
  initCopy();
})();

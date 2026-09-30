# Nexus landing page — "the page is a run"

Static marketing site for **Nexus** with a concept that mirrors the product: **visiting the page IS a
Nexus run**. A boot sequence initializes the "agent", the hero shows the agent *planning your visit*
(the plan items are the navigation), scrolling executes the plan through six tracked steps, a
typeable playground terminal lets visitors run commands, and `ctrl+z` (or the floating **↩ undo**
chip) steps back to the previous step on the page (and is disabled when already at the top of the page).
The product's headline feature, experienced firsthand.

Zero dependencies, zero build step. Open `index.html` in a browser or host the folder on any static
host (GitHub Pages, Netlify, S3…).

**Live wiring:** version pills and download buttons resolve to the latest
[GitHub release](https://github.com/amine-elhanine/nexus/releases/latest) via the GitHub API
(`api.github.com/repos/amine-elhanine/nexus/releases/latest`), cached in `localStorage` for 1 hour.
**No version is hardcoded anywhere**: pills render as `v…` until the API responds, and fall back to
the word "latest" if the API is unreachable. Download buttons always fall back to the releases page.

## The concept, section by section

| Step | Section | What happens |
|---|---|---|
| boot | overlay | Terminal-style boot lines (skills/providers/rules/subagent counts), once per session, skippable by click/scroll/key, never shown to reduced-motion or repeat visitors |
| 01 run | hero | Hexagon particle field reacts to the mouse; the agent "plans" the visit — the 5 plan items are clickable anchors; the headline decodes with a scramble effect |
| — | kinetic | Huge scroll-stopper: "It doesn't chat. **It finishes.**" |
| 02 surfaces | modes | Home / Code / Notebook cards with mini UI mocks + capability marquee, followed by a **deep dive per mode** (alternating layout, 8-point checklists, UI mocks: memory panel / run feed with approval gate / Studio tiles) |
| 03 how it thinks | loop | Animated Brief→Plan→Act→Verify→Done flow with flashing repair loop, Plan/Ask/Auto budget table |
| 04 drive it | playground | **Typeable terminal**: `help`, `plan/ask/auto`, `verify` (animated), `undo`, `providers`, `skills`, `mcp`, `notebook`, `theme` (recolors the whole page: emerald→ocean→ember), `sudo` (denied by the approval gate), `download`, `whoami`, `ls`, `clear`, `exit`. Arrow-key history, clickable hint chips |
| 05 trust | security | Approval gates, deny backstop, encrypted secrets, honest fine print, providers marquee |
| — | man page | FAQ styled as `$ man nexus` |
| 06 get it | download | **Windows-only (64-bit)**: Setup + Portable wired to real release assets; build-from-source block |

The fixed **run rail** (left edge, desktop only) tracks scroll progress as "step n/6".

## Files

| File | Purpose |
|---|---|
| `index.html` | All content. Sections marked with `<!-- ==== NAME ==== -->` banners. |
| `styles.css` | Design system. Brand decisions are CSS custom properties in `:root`; runtime accents (`html[data-accent]`) re-ink everything — that's what the `theme` command cycles. |
| `app.js` | Release wiring, boot, hex canvas, scramble, rail, loop animation, playground, undo easter egg, reveals. Commented, no framework. |
| `icon.png` | App icon (copied from `public/icon.png`). |

## Updating it later

- **New release** — nothing to do; the page fetches it (cache TTL 1 h). No version is hardcoded anywhere: pills show `v…` while loading and `latest` if the API can't be reached.
- **If other platforms ship** — add download cards wired with `data-dl`, update `DL_PATTERNS` in `app.js`, and update the hero eyebrow + platforms FAQ.
- **Two repos** — source lives at `amine-elhanine/nexus-code`, releases at `amine-elhanine/nexus`. Page links follow that split (star/clone/issues → nexus-code; download/watch → nexus). If a repo moves, update `RELEASE_REPO` in `app.js` and the `nexus-code` links in `index.html`.
- **Installer names changed?** — update the `DL_PATTERNS` regexes in `app.js` (they match both dotted and spaced names today).
- **New playground commands** — add a method to the `CMDS` object in `app.js` and list it in `help`.
- **Restyle** — edit the `:root` tokens; the `theme` accents live in the `html[data-accent=…]` blocks.
- **Cache-busting** — asset URLs carry `?v=2`; bump when you change CSS/JS.
- **Serve locally** — `npx serve landing_page` or `python -m http.server -d landing_page` (double-clicking `index.html` also works).

## Accessibility & behavior notes

- Semantic landmarks, skip link, `aria-expanded` burger, `aria-current` scrollspy, `role="status"` toasts, visible focus states.
- `prefers-reduced-motion`: boot skipped, canvas static, scramble/loop/reveals render in final state.
- No-JS: `html.no-js` keeps all content visible (reveals and terminal lines are JS-gated), the playground shows its hint chips, and release links fall back to the releases page.
- The boot overlay is injected by JS only — it can never block a no-JS visitor.

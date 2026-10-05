# Nexus landing page — "the page is a run"

Static marketing site for **Nexus** with a concept that mirrors the product: **visiting the page IS a
Nexus run**. The hero shows the agent *planning your visit* (the plan items are the navigation), and
scrolling executes the plan — each plan card step checks off as you reach its section, and `ctrl+z`
(or the floating **↩ undo** chip) steps back to the previous step on the page (disabled at the top).

**Honest by design:** the page never pretends to be the product. There is no terminal chrome, no
boot overlay, no mock app UI, no fake buttons or fake filenames — every visual is typography,
diagrams, and real content. Deep dives illustrate features with plain-language pipelines, stat
blocks, and scales instead of screenshots of a UI that isn't there.

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
| 01 run | hero | Hexagon particle field reacts to the mouse (and re-inks with the theme); the agent "plans" the visit — the 4 plan steps are clickable anchors that check off as you scroll; the headline decodes with a scramble effect |
| — | kinetic | Huge scroll-stopper: "It doesn't chat. **It finishes.**" |
| 02 surfaces | modes | Home / Code / Notebook cards + capability marquee, followed by a **deep dive per mode** (alternating layout, 8-point checklists, honest visuals: delivery pipeline / guardrail stats / groundedness gate scale) |
| 03 how it thinks | loop | Animated Brief→Plan→Act→Verify→Done flow with flashing repair loop, Plan/Ask/Auto budget table |
| 04 trust | security | Approval gates, deny backstop, encrypted secrets, honest fine print, providers marquee |
| — | faq | Plain-language frequently-asked section |
| 05 get it | download | **Windows-only (64-bit)**: Setup + Portable wired to real release assets; build-from-source block |

The fixed **run rail** (left edge, desktop only) tracks scroll progress as "step n/5".

## Themes

The nav has a **theme picker** (palette button + swatch popover) with the same appearance themes as
the desktop Settings picker: Nexus, Dark White, Midnight, Grape, Ember, Crimson, Lagoon, Moss,
Alabaster, Daylight. The choice persists in `localStorage` (`nexus-landing-theme`); a tiny inline
script in `<head>` re-applies it before first paint (no flash). The hex canvas follows the active
theme's `--green` token automatically.

## Files

| File | Purpose |
|---|---|
| `index.html` | All content. Sections marked with `<!-- ==== NAME ==== -->` banners. The head carries the no-flash theme bootstrap. |
| `styles.css` | Design system. Brand decisions are CSS custom properties in `:root`; `html[data-theme=…]` blocks re-ink everything — that's what the nav picker switches. |
| `app.js` | Release wiring, theme picker, hex canvas, scramble, rail + plan-card states, loop animation, undo easter egg, reveals. Commented, no framework. |
| `icon.png` | App icon (copied from `public/icon.png`). |

## Updating it later

- **New release** — nothing to do; the page fetches it (cache TTL 1 h). No version is hardcoded anywhere: pills show `v…` while loading and `latest` if the API can't be reached.
- **If other platforms ship** — add download cards wired with `data-dl`, update `DL_PATTERNS` in `app.js`, and update the hero eyebrow + platforms FAQ.
- **Two repos** — source lives at `amine-elhanine/nexus-code`, releases at `amine-elhanine/nexus`. Page links follow that split (star/clone/issues → nexus-code; download/watch → nexus). If a repo moves, update `RELEASE_REPO` in `app.js` and the `nexus-code` links in `index.html`.
- **Installer names changed?** — update the `DL_PATTERNS` regexes in `app.js` (they match both dotted and spaced names today).
- **New theme** — add an `html[data-theme="…"]` token block in `styles.css` and an entry in the `THEMES` list in `app.js` (id, label, swatch color).
- **Restyle** — edit the `:root` tokens.
- **Cache-busting** — asset URLs carry `?v=6`; bump when you change CSS/JS.
- **Serve locally** — `npx serve landing_page` or `python -m http.server -d landing_page` (double-clicking `index.html` also works).

## Accessibility & behavior notes

- Semantic landmarks, skip link, `aria-expanded` burger, `aria-current` scrollspy, `role="status"` toasts, visible focus states, `role="menuitemradio"` theme items, Escape closes the picker.
- `prefers-reduced-motion`: canvas static, scramble/loop/reveals render in final state.
- No-JS: `html.no-js` keeps all content visible (reveals are JS-gated), the plan card renders as plain links, and release links fall back to the releases page.

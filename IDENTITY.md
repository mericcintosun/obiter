# IDENTITY (contract; every later phase obeys this file)

DIRECTION: D1 letterpress
GROUND: #faf6ee warm-paper
SURFACE: #f3ecdf
LINE: #e9e0cd
INK: #221d16
ACCENT: #2d4fd1 cobalt
SECOND: #2e5c3a forest
OK: #2e7d4f
WARN: #b06a12
BAD: #9c3b2a
FONT_DISPLAY: F2 Newsreader
FONT_BODY: Archivo
FONT_MONO: IBM Plex Mono, role: the compiled precedent rule JSON block, the only monospaced surface in the product
ARCHETYPE: L3 editorial
MOTION: M4 wipe, prefix obiter-
RADIUS: sharp
HEADER: solid ground, border-b, sticky
LOGO_POLICY: raster-only
DIFFERS_FROM: Checked the three ledger entries (Event Contracts Hackathon, perennis, stele). Removed from the menu: every navy-black ground (#0b0f14, #080b11) and therefore the whole dark-void family those three share; the teal/mint accent band (hue 150-215, #2dd4bf and #5eead4); amber (#F5A524) as a second brand hue; the system sans type voice; the A0 hero-split archetype with a console card; and the glow-pulse / caret-blink / reveal-stagger motion set. What survived and was chosen: a light warm-paper ground, a cobalt accent at hue 228, Newsreader as a loaded display serif, a single-column editorial archetype, and a clip-path wipe. Collision check against the most recent entry: direction differs (letterpress vs navy void), accent band differs (228 vs 172), display font differs (Newsreader vs system sans).

## Why

Obiter is a case reporter for the month-end close, so the page is set like one: warm paper, hairline ink rules, no glow, every exception a ruled ledger entry rather than a card in a grid. Cobalt is the seal color, used only where a precedent has been stamped on a record, which keeps the accent meaningful instead of decorative; forest marks the states a precedent produced (closed, applied) and reads as the ledger's own green ink. The display serif carries the "written decision" idea that the whole product is about, and a light ground is the honest choice for software a controller reads for six hours during close week.

## Amendments (append-only; later phases add dated lines here, never edit the block above)

- 6 September 2026, Phase 9: added four token-only classes to `app/globals.css`, all in the `obiter-` family: `.obiter-measure`, the 68ch reading measure now that the landing article shell is `max-w-5xl` and shares its left rule with the masthead and the colophon; `.obiter-plate` and `.obiter-plate-caption`, the oversized figure that breaks the measure to the shell width and the hairline rule that closes its caption; `.obiter-build-more`, the ruled one line disclosure under the build ledger; and `.obiter-colophon`, the footer's single sentence. Added the illustration family in `public/illustrations/`: `precedent-compile.svg`, `audit-revert.svg`, `settlement-close.svg` and `architecture.svg`, hand authored beside the existing `ledger-rule.svg` in the same terms as that file, warm paper ground `#f3ecdf`, hairline `#e9e0cd` rules, ink `#221d16` shapes, cobalt `#2d4fd1` only where a precedent seal is meant and forest `#2e5c3a` only for closed states, flat matte, no gradient and no glow. No new hex, no new keyframe: the motion signature is still the two `obiter-` keyframes and the `prefers-reduced-motion: reduce` block that disables them, and the three interactive moments added this phase all ride `.obiter-wipe`. The six ledger axes are unchanged: direction D1 letterpress, ground `#faf6ee`, accent `#2d4fd1` cobalt, display font Newsreader, archetype L3 editorial, motion M4 wipe.
- 6 September 2026, Phase 8: added the letterpress device classes to `app/globals.css` (`.obiter-lede` for the full-ink standfirst, `.obiter-runninghead` for section marks in the `.obiter-label` family, `.obiter-dateline`, `.obiter-masthead-mark`, `.obiter-footer-links`, `.obiter-queue-head`, and one global `:focus-visible` outline built on `var(--ring)`), and framed the one raster mark in a hairline `--line` tile at 30px with a dateline sibling in the header. No new hex, no new keyframe, no change to the key block above.

# Phone, tablet, and desktop audit

Audited `main` at `02acb1c` (4 Nov 2026). Every HTML demo and the hub pages (home, catalog, guided tracks, cite, licenses) were code-reviewed, then measured in headless Chrome at 390×844 (phone) and 768×1024 (tablet). The three layout fixes were rechecked at those widths, and the mixed-ANOVA drag was rechecked with a synthesized touch. This was not a physical phone or tablet, so iOS sticky-hover and iOS fullscreen were not exercised on hardware.

House rule checked against `main`: Covariance and Correlation still has press-and-hold to remove and does **not** yet add a point on a tap in empty space. Draft PR [#72](https://github.com/yiuhong/demo-library/pull/72) (`cursor/covariance-click-to-add-b88e`) is still open and still needed for that gesture.

## Fixed in this branch

These were the high-confidence breaks. Each one hid a control or made the documented gesture impossible on a phone.

- **2×2 Mixed ANOVA** (`statistics/mixed_anova_2x2.html`). The lab was a 25% / 45% / 30% grid with no breakpoint. On a 390px phone the page laid out about 990px wide, `overflow` clipped the plot and the ANOVA table, and the viewport would not scroll sideways to them. Node drag listened only for mouse events. Below 1100px the three panels now stack, the preset note sits above the plot instead of covering it, and a finger can drag a cell mean (larger transparent hit target; pointer events). At 1280px the three columns are unchanged. A touch drag of the Group A pre mean moved the signal sliders (group 4 → 20).
- **Noematachograph** (`cognitive_psychology/noematachograph.html`). `body` was `overflow: hidden` and the controls were a fixed 320px column, so on a phone the cylinder canvas was about 6px wide and could not be scrolled into view. The title was also clipped. Below 900px the canvas stacks above the controls (about 370×580 on a 390px phone), the page scrolls, and the title fits.
- **Limitations of summary statistics** (`statistics/limitations_of_summary_statistics.html`). The on-screen tip says to drag a point. The hit test already read touch coordinates, but the listeners were `mousedown` / `mousemove` / `mouseup`, so a finger could not drag. Pointer events now drag a point, with a larger touch slop. A touch that misses the points can still scroll the page (`touch-action: pan-y`).
- **Galton Board** (`statistics/galton_board.html`). The board canvas was `touch-action: none` and a bin toggled on pointer down. The board is most of a phone screen, so a slide could not scroll past it, and the start of a scroll would have selected a bin. A slide now scrolls. A still tap still toggles the bin.
- **EEG Illustration** (`neuroscience/eeg_illustration.html`). Choosing a tissue layer on the head canvas was `mousedown` only. A still tap now opens that layer. A slide still scrolls. Hover labels stay mouse-only.

## Should-fix (not changed)

- **Covariance and Correlation.** Layout already stacks (sidebar on top, plot below, plot about 364×424 on a phone) and drag / press-and-hold use pointer and touch events. Two gaps remain. Empty-plot tap to add a point is not on `main`; that is PR #72. The (x, y) readout is `mouseenter` only, and the help text says “Hover a point”. A finger never sees the coordinate tip. Point radius is 7px, which is a small hold target.
- **Probability Distributions Map.** The network fits the width and the inspector stacks under the map below 960px. Zoom buttons work. Panning is `mousedown` / `mousemove` only, and the wheel handler calls `preventDefault`, so a trackpad scroll over the map does not scroll the page. On a phone the fitted SVG is only about 240px tall inside a 520px frame, so the nodes are small.
- **Hover-only readouts** where the same fact is not printed elsewhere: KDE crosshair and floating tooltip (`statistics/kde_plots.html`), Q-Q dot values, skewed-distribution guide (that one already listens for touch), t-test-to-ANOVA dots, two-way ANOVA dots, variance-explained dots, additivity dots, statistical-power regions, and the distributions-map node tooltip. Sliders and buttons on these pages work with a finger. The missing piece is the hover sentence.
- **Partitioning Sum of Squares.** Wide trees scroll inside `.diagram-wrapper` (a 3-way tree is `min-width: 1180px`). That inner scroll is the right idea. Factor-pill explanations are `.tooltip-popup` on `:hover` only, so a tap does not reveal them. The page’s `scrollWidth` is a few dozen pixels over the viewport because of that tree; the window itself does not scroll sideways.
- **Mixed ANOVA table rows** still highlight on `mouseenter` only. The numbers are on the screen either way. The legend no longer says the table is “on the right”.
- **Slider thumbs painted at 4–6px** (`h-1.5` or a 5px rule) on EEG Illustration, ERP, KDE, and the mixed-ANOVA signal sliders. Native thumbs are often easier to grab than the CSS box suggests; this was not retested on a physical phone.
- **Hub pages disable pinch zoom.** `index.html`, `catalog.html`, `tracks.html`, `cite.html`, and `license.html` use `user-scalable=no`. The demos themselves do not. Layout of those hubs fit a 390px width (no horizontal overflow). The home carousel dots are about 11px.

## Nice-to-have

- **Moments** calculation table is `min-width: 800px` inside a horizontal scroller. The page does not grow sideways; the reader swipes the table. A stacked or card layout would be kinder than that swipe.
- **Mean, median, and mode** uses 21 columns at `min-width: 28px` inside `overflow-x: auto`. Dots are 20px and `click` works as a tap. The plot itself scrolls sideways.
- **Boxplot and histogram** draws an 800×500 SVG with `max-w-full`, so it scales down. D3 drag uses pointer events. Handles get small once the figure is about 290px wide.
- **Full screen** buttons call `requestFullscreen`. That is a no-op or a limited API on iOS Safari. Not required to use the demos.
- **Cite this demo** in the shared footer is an inline 12px text button (`assets/site-oer-footer.css`). It is a text link, not a primary control.
- **EEG Illustration** slider explanations are `group-hover` bubbles. The slider labels are visible without them.
- **NLP in Psychotherapy** term meanings are `title` tooltips.
- Several simulation readouts use `text-[10px]` and `title=` on stat cards (paired t, independent t, Horowitz CLT). The number is visible; the gloss is hover-only.

## Performance

No demo was rewritten for paint cost. Notes only:

- Mixed ANOVA calls `updateAll()` (full SVG rebuild) on every pointer move while a node is dragged. Fine for four nodes; worth knowing if that drag ever stutters.
- Covariance uses a `ResizeObserver` and rebuilds the chart on container resize. Appropriate.
- Galton, ERP, EEG illustration, and fNIRS run continuous `requestAnimationFrame` loops. Expected for those simulations.
- KDE binds many `mousemove` handlers. They do not block scrolling. They also do not run for a finger, which is the hover gap above.
- `touch-action: none` remains only on the covariance points (so a drag does not scroll) and on the mixed-ANOVA node targets. Galton no longer blocks scrolling on the board.

## Per demo

Status is after this branch. “OK” means the page fits a phone, the main controls work with a tap or a slider, and nothing critical is hover-only. Caveats are the should-fix and nice-to-have items above.

### Hubs

| Page | Status |
| --- | --- |
| `index.html` | OK. Stacks under 736px. Pinch zoom is off. Carousel dots are tiny. |
| `catalog.html` | OK. Cards collapse to one column under 736px. Pinch zoom is off. |
| `tracks.html` | OK. Same hub CSS. Pinch zoom is off. |
| `cite.html` | OK. Pinch zoom is off. |
| `license.html` | OK. Pinch zoom is off. |

### Cognitive, neuroscience, personality

| Demo | Status |
| --- | --- |
| Noematachograph | OK after this branch. Was unusable on a phone (6px canvas, no scroll). |
| EEG Illustration | OK after this branch for layout and layer tap. Slider help is still hover-only. Range tracks are styled very thin. |
| EEG Signal Decomposition | OK. Sliders and layout use `md` / `lg` breakpoints. |
| Event-related potential | OK. Controls stack. Range tracks are thin. Component markers brighten on hover only; the waveform is visible without that. |
| fNIRS Mechanism | OK. Play / reset and the layout fit. |
| Lexical Approach | OK. Keep / discard buttons are full width on a phone. |
| NLP in Psychotherapy | OK. Term glosses are hover / `title` only. |

### Statistics

| Demo | Status |
| --- | --- |
| Mean, Median, and Mode | OK. Plot scrolls sideways on purpose (21 columns). Tap adds a dot. |
| Moments | OK. The calculation table scrolls inside its card. |
| Bessel's Correction | OK. |
| Skewed Distribution | OK. The guide already listens for touch. |
| Boxplot and Histogram | OK. Figure scales. Drag handles get small. |
| Boxplot and Outliers | OK. |
| Kernel Density Estimate | Issues. Page fits and sliders work. The crosshair and tooltip are mouse-only. Many range tracks are 6px tall. |
| Q-Q Plot | Issues. Layout fits. Dot values are `mouseover` only. |
| Limitations of summary statistics | OK after this branch. Drag was mouse-only and is now a pointer drag. |
| 5-Level Conceptual Hierarchy | OK. Sections stack at `lg`. |
| Building the Normal Distribution | OK. |
| Probability Distributions Map | Issues. Fits and stacks, zoom buttons work, pan is mouse-only, and the fitted map is short on a phone. |
| Binomial and Bernoulli | OK. Columns stack under 960px. A wide MathML fragment inflates `scrollWidth`; the window does not actually scroll sideways. |
| Poisson Point Process | OK. Grids stack under 1080px. Same harmless MathML `scrollWidth` note. |
| Galton Board | OK after this branch. A slide on the board can scroll the page. A still tap still selects a bin. |
| Central Limit Theorem | OK. |
| Horowitz (1974) CLT | OK. A few stat glosses are `title` only. |
| Chi-Square Distribution | OK. |
| Target Analogy of Confidence Intervals | OK. |
| z vs t | OK. |
| Independent Samples t-Test | OK. A few stat glosses are `title` only. |
| Paired Sample t-Test | OK. Same. |
| Statistical Power | Issues. Sliders and the layout work. Region labels are `mousemove` only. |
| Power Curve | OK. |
| From t-Test to ANOVA | Issues. Sliders work. Dot values are `mouseover` only. |
| From Paired t to RM-ANOVA | OK. Breakpoints stack the grids. Subject drag uses `pointerdown`. |
| Partitioning Sum of Squares | Issues. Usable, with inner horizontal scroll for the wide trees and hover-only factor tooltips. |
| Two-Way ANOVA | Issues. Sliders and the layout work. Dot values are `mouseover` only. |
| 2×2 Mixed ANOVA | OK after this branch. Was clipped and not draggable on touch. Table-row highlight is still hover-only. |
| ANOVA Assumptions | OK. |
| Covariance and Correlation | Issues. Drag and hold-to-remove work on touch. Click-to-add is still PR #72. The coordinate tip is hover-only. |
| Variance Explained | Issues. The page stacks at `lg`. Dot values are `mouseover` only. |
| Additivity of Variance | Issues. The page stacks at `lg`. Dot values are `mouseover` only. |

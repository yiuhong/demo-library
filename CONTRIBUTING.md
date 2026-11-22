# Contributing

Thank you for helping Project Viz.

## Bugs

Report a bug or a teaching error on [GitHub Issues](https://github.com/yiuhong/demo-library/issues). Name the demo page, what you expected, and what happened.

## Ideas

GitHub Discussions are not enabled for this repository. Suggest an idea on [GitHub Issues](https://github.com/yiuhong/demo-library/issues). Start the title with "Idea:".

## Pull requests

Pull requests are welcome. Opening a pull request is not a guarantee of merge.

Small corrections — a wrong label, a broken link, a clearer sentence — are the easiest to review. Keep teaching text, explanations, and figures under CC BY 4.0, and source code under MIT, as [LICENSE](LICENSE) and [LICENSE-CODE](LICENSE-CODE) describe. [license.html](license.html) lists that split.

## Teaching source

Before you add a new demonstration, name the textbook passage, classic paper, or other reputable teaching source the lesson is based on. If there is no such source, do not add the page yet.

AI may help implement the demonstration. It must not be the origin of the lesson.

When the teaching depends on that source, cite it as [Teach and Learn](#teach-and-learn) already requires: a short teaching note next to that teaching, marked `data-teach="detail"`. There is no blanket bibliography. Footer, license, and cite-the-library pages do not need a reference list of their own. A new demonstration still follows that object list.

Do not invent a citation. If a source is uncertain, say so in the pull request and skip the guess. Do not add a citation to an existing demonstration in order to apply this rule, and do not invent one when you next touch the page.

## Self-tests

A self-test question must test the knowledge and concepts the track teaches, not the specifics of a demonstration’s setup.

Ask about the idea (a definition, a rule, or a relationship). Do not ask how a particular page is drawn, which control to move, which color a curve uses, or what a connection note says.

Do not use stems such as “on this track,” “on this page,” or “the connection note says.”

A question must still be answerable from what the track teaches. Do not invent facts or citations.

A review link back to the relevant demonstration is fine. The question stem itself stands without that page’s apparatus.

Apply this when you write a new self-test, and when you next revise an existing one. Do not rewrite an existing check or question bank only to apply this rule. This is not a library-wide rollout of the ten-question review on Shape and pictures. The Center and spread trial in [Teach and Learn](#teach-and-learn) stays a trial on that track.

## Shell

Home, Catalog, Guided Tracks, Cite & reuse, and Licenses load [`assets/foundation.css`](assets/foundation.css). Do not link a stylesheet or a script from the personal site. The notebook sheet ([`assets/notebook.css`](assets/notebook.css)) is only on Home, Catalog, and Guided Tracks: white paper, black UI ink, a faint blue grid, and a thin muted red margin. Cite & reuse and Licenses stay plain. Statistics pages take a quieter version of that sheet from [`assets/stats-demo-theme.css`](assets/stats-demo-theme.css). Do not paint the grid over a plot, a canvas, or a connection note. The public catalog is statistics. Files in `cognitive_psychology/`, `neuroscience/`, and `personality_psychology/` remain in the repository for a later project and are not part of the public catalog. A neuroscience file in that set stays the dark lab.

## Range sliders

The 44px phone and coarse-pointer range target is the standing standard for every new demonstration. Do not reinvent a thin `appearance: none` track.

A new demonstration must:

- load the shared theme, [`assets/stats-demo-theme.css`](assets/stats-demo-theme.css) or [`assets/neuroscience-demo-theme.css`](assets/neuroscience-demo-theme.css)
- keep `class="demo-page"` on `body`
- leave the shared rule alone: under `(max-width: 768px), (pointer: coarse)`, `body.demo-page input[type="range"]` is a 44px hit box (an 8px track and a 28px thumb)
- load Teach and Learn, and mark the page, as [Teach and Learn](#teach-and-learn) requires. That markup is the standing standard for every new demonstration and every new Guided Tracks connection page.
- name the textbook passage, classic paper, or other reputable teaching source the lesson is based on, as [Teaching source](#teaching-source) requires. If there is no such source, do not add the page yet. AI may help implement the demonstration. It must not be the origin of the lesson.

Page-specific thumb colors are fine. Do not override that hit box back to a thin track.

## Demo interface

These are general chrome rules, not a strict template. Do not rebuild an existing demonstration so it looks like Multiple Regression and ANOVA Equivalence. Apply the rules on new work, and when you next touch an existing demonstration.

[Shell](#shell) covers the notebook grid and the two shared looks. [Range sliders](#range-sliders) is the 44px standard. That section is also where a new demonstration loads the matching shared theme and keeps `class="demo-page"` on `body`.

The public catalog is statistics. A statistics page loads [`assets/stats-demo-theme.css`](assets/stats-demo-theme.css). Files in `cognitive_psychology/`, `neuroscience/`, and `personality_psychology/` remain in the repository for a later project and are not part of the public catalog. Do not add them to `demos.json`. A neuroscience file in that set still loads [`assets/neuroscience-demo-theme.css`](assets/neuroscience-demo-theme.css). A personality or cognitive file may keep its own look. It still needs the embed hook and an embedding contract: when `html` has `viz-embedded`, hide the return link and keep the shell pane free of a page-level horizontal scrollbar. Do not invent a third library-chrome theme. Do not force those pages onto the statistics light sheet or the neuroscience dark lab.

Catalog and Guided Tracks open a demonstration with `embed=shell`. Run the existing hook so that query adds `viz-embedded` on `html`. Fullscreen and iframe sizing in the shell depend on it. Copy the one-liner the other demonstrations already use:

```html
<script>if(/[?&]embed=shell(?:&|$)/.test(location.search))document.documentElement.classList.add("viz-embedded");</script>
```

Do not stack competing vertical scrollports that hide controls, clip the figure, or paint a scrollbar over a canvas. On a stacked phone or a narrow window, the page should usually be the only vertical scroller. A desktop inspector may still scroll when the page is locked to the viewport, provided the plot is not also a vertical scroller. A locked-viewport animation page may use `overflow: hidden`. It then needs a stacked-narrow fallback that unlocks page scroll.

Live controls stay beside the figure or immediately above it. Do not put them under a long formula, a block of prose, or a table in the same column. No particular grid, sidebar, or tab strip is required. A short shared control bar above several plots that must be seen together is fine.

A formula or a table may recede into a tab or a disclosure only when it is reference material. When the live equation, the plug-in arithmetic, or the sum-of-squares partition is the lesson, it stays on screen next to the figure. Variance Explained, Covariance and Correlation, and Moments keep that material in view.

Optional extra stage narrative may have a Show/Hide control at every size. It may start closed when the window is tight if the visitor has no saved choice. A saved preference is allowed. It is not required, and it is not forbidden. Do not auto-collapse text that is the only instructional content. Do not add this chrome to a demonstration that has no stage narrative. That narrative is commentary, so mark it `data-teach="detail"`. Its Show/Hide may close the extra narrative. It does not close the short commentary object that default Learn still shows, and it is not a substitute for Teach.

### Interface principles

Use this list when you compose a new demonstration, and when you next touch an existing one. These principles are the standard for composing the page, not a layout to copy. Do not rebuild an existing demonstration so it looks like Multiple Regression and ANOVA Equivalence. A different grid, sidebar, or document flow is fine when the page follows these principles. That demonstration’s Controls / Model / Fit tabs, its 960px, 500px, and 900px breakpoints, the `min(52vh, 90vw)` plot height, and the `demo-library-regression-anova-step-description` preference key stay that page’s chrome.

- The figure comes first. The figure, canvas, or plot is what the page is for. Controls stay beside the figure or immediately above it. Do not put them under a long formula, a block of prose, or a table in the same column.
- Controls update the figure at once.
- The live equation or readout stays with the plot. When that equation, the plug-in arithmetic, or the sum-of-squares partition is the lesson, it stays on screen next to the figure, in Learn and in Teach. A formula that is only reference material may sit in a disclosure.
- Phone and coarse-pointer sliders stay a 44px target. [Range sliders](#range-sliders) is that rule. Do not paint the hit box back to a thin track.
- No scrollbar inside a panel. The content wraps or fits in the card. On a stacked phone or a narrow window, the page is the vertical scroller. The locked-viewport cases later in this section still stand: a desktop inspector may scroll when the page is locked to the viewport, and a formula may scroll locally so the page stays free of a horizontal scrollbar. The plot is not also a vertical scroller. Never put a scrollbar over a canvas.
- Teach and Learn is one site-wide switch. Do not add a per-demo theme, a second pair of names, or a mode that only this page understands. [Teach and Learn](#teach-and-learn) is the control and the object list.
- Chrome is the shared chrome. Load the matching shared theme, keep `class="demo-page"` on `body`, and run the `embed=shell` hook. Do not invent a third library-chrome theme. A personality or cognitive file that remains for a later project may keep its own look. It is not a catalog page. It still needs the embed hook.
- Default Learn still shows a short commentary object before any drawer is opened: a visible lede or a short teaching paragraph. A long term-by-term note may start closed. That closed drawer is density inside the commentary. It is not Teach.

A pure explorer may have almost no commentary. Do not invent a note so this list has something to show. The switch still ships, so the library stays consistent.

### Teach and Learn

Teach and Learn are one control for the whole library. Both names are on the control. Learn is the default: the full page, for later review. Teach is the quieter class view. Teach includes only demonstration objects. Learn includes demonstration objects and commentary objects. The choice only changes visibility. Hiding a commentary object lets the figure use the space it leaves. That is ordinary layout after `display: none` in [`assets/teach.css`](assets/teach.css). It does not recompute a result, rewrite teaching text, invent a shorter lesson, reset the simulation, or add a scrollbar inside a panel. Do not write a Teach branch that does any of those. Leave [`assets/teach.css`](assets/teach.css) and [`assets/teach.js`](assets/teach.js) as they are. Do not invent a third visual theme. Each demonstration keeps its own plot and layout.

Catalog and Guided Tracks put the control in the pane bar, beside Fullscreen. A demonstration opened on its own gets the same control in the page top bar, next to Back. [`assets/teach.js`](assets/teach.js) inserts that control. When `html` has `viz-embedded`, the in-page control is hidden, the same way `.demo-back` is hidden, so a visitor inside the shell sees one control.

`?teach=1` opens Teach. `?learn=1` or `?teach=0` opens Learn. `?learn=0` opens Teach. `on` / `off` and `true` / `false` work too, the same tokens as `?notebook=`. If both flags are in the link, the later one wins. The page stores that choice in `localStorage` under `viz-teach` on this origin (`1` is Teach, `0` is Learn), so the shell and a standalone demonstration share it. Teach adds class `viz-teach` on `<html>`. An already-open page follows a change through the `storage` event, without a reload.

Load [`assets/teach.js`](assets/teach.js) as a blocking script in `<head>`, and [`assets/teach.css`](assets/teach.css), so `viz-teach` is on `<html>` before the first paint when the page opens in Teach. Copy the lines the demonstrations already use, immediately after the `embed=shell` hook:

```html
<script src="../assets/teach.js"></script>
<link rel="stylesheet" href="../assets/teach.css">
```

Mark regions on purpose. Do not pick the essential equation with a script. The only values are `data-teach="essential"` and `data-teach="detail"`. Do not add a third value. Map demonstration objects to `essential` and commentary objects to `detail`.

Categorize every demo element as a demonstration object or a commentary object. Page chrome is neither. The title, Back, and the footer stay in both modes. Do not mark them `detail`. They are not part of the teaching contrast.

Demonstration objects are included in both modes. Mark them `data-teach="essential"`:

- the figure, canvas, or plot
- the live equation or readout
- the controls that change the figure
- a short how-to for using the figure in class, such as “drag the handles” or “slide the correlation”
- Key points on a Guided Tracks connection page

When the live equation is the lesson, it stays on screen, including in Teach. If that equation currently lives only inside a disclosure, split it from the explanation. Learn shows it as well.

Commentary objects are included in Learn and excluded in Teach. Mark them `data-teach="detail"`:

- the lede or a short takeaway
- a teaching note or a pedagogy box
- a term-by-term explanation, including its drawer
- a citation
- a connection note and “In the next demo.”

An unmarked region follows a conservative default. Canvases, plots, headers, and controls stay. An obvious prose block such as a lede hides in Teach. Mark anything that is unclear. Mark the short how-to `essential`, or that default will treat it as a lede and hide it in Teach.

Visibility test. Open the page in default Learn and leave collapsed notes closed. Switch to Teach. Commentary objects leave. Demonstration objects stay, and they feel more central, because the figure can use the space the commentary left. If you have to hunt for what changed, the test failed. Either a short how-to was marked as commentary, or the commentary was already invisible in default Learn.

Collapsed-by-default is a density tool inside a commentary object. It is not a substitute for Teach. Default Learn still shows commentary without opening a drawer: a visible lede or a short teaching paragraph, even when the long term-by-term note starts closed. Do not recategorize a useful how-to just to create contrast. Do not invent a dummy note or a bibliography so Teach has something to hide. A page that is already a pure explorer may show only a tiny difference. That is acceptable. The switch still ships, so the library stays consistent.

Citations stay in Learn. Do not add a second reference list for Teach. There is no blanket bibliography. Footer, license, and cite-the-library pages do not need a reference list of their own. Footer and license chrome may stay as a thin line. Cite a source only where the teaching depends on one, in the style of a short teaching note next to that teaching, and mark the note `data-teach="detail"`. Do not invent a citation.

This markup is the standing standard, not a one-time pass. A new demonstration is not done until it ships with it. A new Guided Tracks connection page ships with it too. An existing page picks the object list up the next time that page is touched. Do not restyle the current library in order to apply it.

- Load [`assets/teach.js`](assets/teach.js) and [`assets/teach.css`](assets/teach.css) the same way the demonstrations already do, immediately after the `embed=shell` hook.
- `data-teach="essential"` on every demonstration object: the figure, canvas, or plot; the live equation or readout; the controls that change the figure; the short how-to; and, on a connection page, the Key points.
- `data-teach="detail"` on every commentary object: the lede or short takeaway; a teaching note or pedagogy box; a term-by-term explanation, including its drawer; a citation; and, on a connection page, the note and “In the next demo.”
- Run the visibility test above. Default Learn shows a short commentary object before any drawer is opened, unless the page is a pure explorer with nothing to hide.
- The page has a top bar. [`assets/teach.js`](assets/teach.js) inserts the Teach / Learn pair after `.demo-back`. A page with no Back link still needs a `.demo-topbar`, and the same pair is inserted there. The pair hides when `html` has `viz-embedded`.
- Learn is the default and is the full page. Teach includes only demonstration objects. The layout reflows so the figure can use the freed space. Teach does not recompute a result, rewrite teaching text, reset the simulation, or add a scrollbar inside a panel.

[`tracks/connection.html`](tracks/connection.html) is the connection page. [`assets/connection-page.js`](assets/connection-page.js) marks the figure and the Key points formulae essential, and marks the note and **In the next demo** detail. The figure and the Key points are demonstration objects. The note and **In the next demo** are commentary objects. Key points that are formulae also carry a short verbal gloss and symbol definitions. The formula is bold on its own line, then the gloss, then the symbol definitions when those are a separate sentence. A line that is already verbal stays one line. The figure stays a concept illustration, and it stays before **In the next demo**. Do not paste that note into a new HTML file. A connection step in [`tracks.json`](tracks.json) is enough. The same renderer covers a new step. A step may set `closingHeading` when that heading should not say “In the next demo”. The heading is still commentary.

Trial, on Center and spread only. That track may end with one short visualized self-test after its last demonstration. The check is a Guided Tracks step. It is not a catalog card and not a separate test. It reuses that track’s figures. The figure, the controls that change it, and the immediate feedback are demonstration objects. A longer note on why an answer is right or wrong is commentary. A short how-to may stay essential. This is not a library-wide rollout. Do not add a self-test to another track as part of this trial.

On Pearson’s χ² goodness-of-fit the live sum already sits outside “How a Pearson term is built”, so Teach keeps that equation and hides the term note. The live sum is a demonstration object. The term-by-term note, including its drawer, is commentary. Where a live equation sits only inside a disclosure, split it from the explanation so it stays on screen in Teach and in Learn.

Size the page for the catalog iframe. Avoid a page-level horizontal scrollbar. Never put a scrollbar over a canvas, especially WebGL. In Chrome that scrollbar can paint as a black band. Prefer wrapping, or a non-scrolling overlay. `height: 100vh` plus `overflow: hidden` on `body`, with no stacked fallback, is not safe in an iframe or on a phone.

For a plot-plus-inspector or a locked-viewport explorer, a stacked narrow view puts a shorter plot in the page flow, lets the page be the only vertical scroller, and wraps or locally scrolls formulae so the demonstration does not open a page-level horizontal scrollbar. On Multiple Regression and ANOVA Equivalence, a 960px stacked layout and a plot height of `min(52vh, 90vw)` are a proven example. They are not a mandatory size. A simple document-flow page does not need that media block.

A Plot / Inspector toggle, or a Plot / Controls toggle, is only for a short landscape view of one main plot plus a dense inspector. Do not force it onto a simple one-column page, a multi-plot lesson whose figures must be seen together, a map or a conceptual dashboard, or a document-like step tour.

Plot design, the statistical engine, and the theme stay with the demonstration. [Shell](#shell) keeps statistics on the light notebook. A neuroscience file kept for a later project stays on the dark lab and is not a catalog page. A page may keep a distinct look, as the Noematachograph does. That page remains in the repository for a later project and is not in the public catalog.

The equivalence demonstration’s Controls / Model / Fit tabs, its exact 960px, 500px, and 900px breakpoints, the `min(52vh, 90vw)` plot height, and the `demo-library-regression-anova-step-description` preference key are that demonstration’s chrome. They are not a library template.

When you next touch an older demonstration, the notes below are the gaps in that file. They are guidance for later work, not a list of pages to rebuild. A page that does not look like the equivalence demonstration is not a defect.

Noematachograph, NLP in Psychotherapy, and Lexical Approach remain in the repository for a later project and are not in the public catalog. They lack `demo-page`, a shared theme, and the `embed=shell` hook. Add the hook without flattening their look, and do not add them to `demos.json`. Boxplot and Outliers and From Paired t-Test to RM-ANOVA load the statistics theme but omit `body.demo-page`. From Paired t-Test to RM-ANOVA also forces a 6px range and does not restore the 44px target in [Range sliders](#range-sliders).

If you are already laying the page out again, ease a locked or competing scroll area on EEG Signal Decomposition, Chi-Square Distribution, Covariance and Correlation, Building the Normal Distribution, and Target Analogy of Confidence Intervals. EEG Signal Decomposition remains in `neuroscience/` for a later project and is not a catalog page. When you next edit the theme sheets, align the embedded `overflow-x: clip` in [`assets/neuroscience-demo-theme.css`](assets/neuroscience-demo-theme.css) with [`assets/stats-demo-theme.css`](assets/stats-demo-theme.css) (`html.viz-embedded body.demo-page`). Do that in the sheets. Do not touch every neuroscience HTML file for it.

## Plotting

Which drawing tool to use, which version to load, and how to upgrade one later are recorded in [docs/plotting-conventions.md](docs/plotting-conventions.md). The pins themselves are [`assets/vendor.json`](assets/vendor.json). A demonstration asks for a library with [`assets/vendor-loader.js`](assets/vendor-loader.js). Do not paste a CDN address for D3, Chart.js, KaTeX, jStat, or Three.js. Mathematics is KaTeX from that registry. Do not add MathJax. Do not add Plotly, Vega-Lite, Observable Plot, or another plotting library. Do not load the Tailwind Play CDN (`https://cdn.tailwindcss.com`). Utilities come from [`assets/tailwind.css`](assets/tailwind.css), built with Tailwind CSS 3.4.17. Rebuild that sheet when a page needs a utility it does not already contain. The shared theme sheets stay as they are. Labels, formulae, the shared theme, scroll, and the 44px range target stay in [Demo interface](#demo-interface) and [Range sliders](#range-sliders). The teaching source stays in [Teaching source](#teaching-source). [docs/plotting-conventions.md](docs/plotting-conventions.md) repeats that rule in the same terms.

## Catalog

The public catalog is a statistics teaching collection. Demo cards live in [`demos.json`](demos.json). Concept maps live in [`families.json`](families.json). Guided Tracks live in [`tracks.json`](tracks.json). The README lists the fields.

`cognitive_psychology/`, `neuroscience/`, and `personality_psychology/` remain in the repository for a later project. They are not listed in `demos.json`, and they are not part of the public catalog, Guided Tracks, or the home plates. Do not add those pages to the catalog. Leave the files where they are.

Before you open a pull request, run:

```bash
python3 scripts/check_catalog.py
```

When a change is something a syllabus should record, bump `version` and `updated` in [`assets/site-meta.js`](assets/site-meta.js), repeat that version and date in `index.html`, `cite.html`, and `license.html`, set the same version and `date-released` in [`CITATION.cff`](CITATION.cff), and add an entry to [CHANGELOG.md](CHANGELOG.md).

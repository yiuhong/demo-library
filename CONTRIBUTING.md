# Contributing

Thank you for helping Project Viz.

## Bugs

Report a bug or a teaching error on [GitHub Issues](https://github.com/yiuhong/demo-library/issues). Name the demo page, what you expected, and what happened.

## Ideas

GitHub Discussions are not enabled for this repository. Suggest an idea on [GitHub Issues](https://github.com/yiuhong/demo-library/issues). Start the title with "Idea:".

## Pull requests

Pull requests are welcome. Opening a pull request is not a guarantee of merge.

Small corrections — a wrong label, a broken link, a clearer sentence — are the easiest to review. Keep teaching text, explanations, and figures under CC BY 4.0, and source code under MIT, as [LICENSE](LICENSE) and [LICENSE-CODE](LICENSE-CODE) describe. [license.html](license.html) lists that split.

## Shell

Home, Catalog, Guided Tracks, Cite & reuse, and Licenses load [`assets/foundation.css`](assets/foundation.css). Do not link a stylesheet or a script from the personal site. The notebook sheet ([`assets/notebook.css`](assets/notebook.css)) is only on Home, Catalog, and Guided Tracks: white paper, black UI ink, a faint blue grid, and a thin muted red margin. Cite & reuse and Licenses stay plain. Statistics pages take a quieter version of that sheet from [`assets/stats-demo-theme.css`](assets/stats-demo-theme.css). Do not paint the grid over a plot, a canvas, or a connection note. Neuroscience stays the dark lab.

## Range sliders

The 44px phone and coarse-pointer range target is the standing standard for every new demonstration. Do not reinvent a thin `appearance: none` track.

A new demonstration must:

- load the shared theme, [`assets/stats-demo-theme.css`](assets/stats-demo-theme.css) or [`assets/neuroscience-demo-theme.css`](assets/neuroscience-demo-theme.css)
- keep `class="demo-page"` on `body`
- leave the shared rule alone: under `(max-width: 768px), (pointer: coarse)`, `body.demo-page input[type="range"]` is a 44px hit box (an 8px track and a 28px thumb)

Page-specific thumb colors are fine. Do not override that hit box back to a thin track.

## Demo interface

These are general chrome rules, not a strict template. Do not rebuild an existing demonstration so it looks like Multiple Regression and ANOVA Equivalence. Apply the rules on new work, and when you next touch an existing demonstration.

[Shell](#shell) covers the notebook grid and the two shared looks. [Range sliders](#range-sliders) is the 44px standard. That section is also where a new demonstration loads the matching shared theme and keeps `class="demo-page"` on `body`.

A statistics page loads [`assets/stats-demo-theme.css`](assets/stats-demo-theme.css). A neuroscience page loads [`assets/neuroscience-demo-theme.css`](assets/neuroscience-demo-theme.css). A personality or cognitive page may keep its own look. It still needs the embed hook and an embedding contract: when `html` has `viz-embedded`, hide the return link and keep the shell pane free of a page-level horizontal scrollbar. Do not invent a third library-chrome theme. Do not force those pages onto the statistics light sheet or the neuroscience dark lab.

Catalog and Guided Tracks open a demonstration with `embed=shell`. Run the existing hook so that query adds `viz-embedded` on `html`. Fullscreen and iframe sizing in the shell depend on it. Copy the one-liner the other demonstrations already use:

```html
<script>if(/[?&]embed=shell(?:&|$)/.test(location.search))document.documentElement.classList.add("viz-embedded");</script>
```

Do not stack competing vertical scrollports that hide controls, clip the figure, or paint a scrollbar over a canvas. On a stacked phone or a narrow window, the page should usually be the only vertical scroller. A desktop inspector may still scroll when the page is locked to the viewport, provided the plot is not also a vertical scroller. A locked-viewport animation page may use `overflow: hidden`. It then needs a stacked-narrow fallback that unlocks page scroll.

Live controls stay beside the figure or immediately above it. Do not put them under a long formula, a block of prose, or a table in the same column. No particular grid, sidebar, or tab strip is required. A short shared control bar above several plots that must be seen together is fine.

A formula or a table may recede into a tab or a disclosure only when it is reference material. When the live equation, the plug-in arithmetic, or the sum-of-squares partition is the lesson, it stays on screen next to the figure. Variance Explained, Covariance and Correlation, and Moments keep that material in view.

Optional extra stage narrative may have a Show/Hide control at every size. It may start closed when the window is tight if the visitor has no saved choice. A saved preference is allowed. It is not required, and it is not forbidden. Do not auto-collapse text that is the only instructional content. Do not add this chrome to a demonstration that has no stage narrative.

Size the page for the catalog iframe. Avoid a page-level horizontal scrollbar. Never put a scrollbar over a canvas, especially WebGL. In Chrome that scrollbar can paint as a black band. Prefer wrapping, or a non-scrolling overlay. `height: 100vh` plus `overflow: hidden` on `body`, with no stacked fallback, is not safe in an iframe or on a phone.

For a plot-plus-inspector or a locked-viewport explorer, a stacked narrow view puts a shorter plot in the page flow, lets the page be the only vertical scroller, and wraps or locally scrolls formulae so the demonstration does not open a page-level horizontal scrollbar. On Multiple Regression and ANOVA Equivalence, a 960px stacked layout and a plot height of `min(52vh, 90vw)` are a proven example. They are not a mandatory size. A simple document-flow page does not need that media block.

A Plot / Inspector toggle, or a Plot / Controls toggle, is only for a short landscape view of one main plot plus a dense inspector. Do not force it onto a simple one-column page, a multi-plot lesson whose figures must be seen together, a map or a conceptual dashboard, or a document-like step tour.

Plot design, the statistical engine, and the theme stay with the demonstration. [Shell](#shell) keeps statistics on the light notebook and neuroscience on the dark lab. A page may keep a distinct look, as the Noematachograph does.

The equivalence demonstration’s Controls / Model / Fit tabs, its exact 960px, 500px, and 900px breakpoints, the `min(52vh, 90vw)` plot height, and the `demo-library-regression-anova-step-description` preference key are that demonstration’s chrome. They are not a library template.

When you next touch an older demonstration, the notes below are the gaps in that file. They are guidance for later work, not a list of pages to rebuild. A page that does not look like the equivalence demonstration is not a defect.

Noematachograph, NLP in Psychotherapy, and Lexical Approach lack `demo-page`, a shared theme, and the `embed=shell` hook. Add the hook without flattening their look. Boxplot and Outliers and From Paired t-Test to RM-ANOVA load the statistics theme but omit `body.demo-page`. From Paired t-Test to RM-ANOVA also forces a 6px range and does not restore the 44px target in [Range sliders](#range-sliders).

If you are already laying the page out again, ease a locked or competing scroll area on EEG Signal Decomposition, Chi-Square Distribution, Covariance and Correlation, Building the Normal Distribution, and Target Analogy of Confidence Intervals. When you next edit the theme sheets, align the embedded `overflow-x: clip` in [`assets/neuroscience-demo-theme.css`](assets/neuroscience-demo-theme.css) with [`assets/stats-demo-theme.css`](assets/stats-demo-theme.css) (`html.viz-embedded body.demo-page`). Do that in the sheets. Do not touch every neuroscience HTML file for it.

## Plotting

Which drawing tool to use, which version to load, and how to upgrade one later are recorded in [docs/plotting-conventions.md](docs/plotting-conventions.md). The pins themselves are [`assets/vendor.json`](assets/vendor.json). A demonstration asks for a library with [`assets/vendor-loader.js`](assets/vendor-loader.js). Do not paste a CDN address for D3, Chart.js, KaTeX, jStat, or Three.js. Do not add Plotly, Vega-Lite, Observable Plot, or another plotting library. Labels, formulae, the shared theme, scroll, and the 44px range target stay in [Demo interface](#demo-interface) and [Range sliders](#range-sliders).

## Catalog

Demo cards live in [`demos.json`](demos.json). Concept maps live in [`families.json`](families.json). Guided Tracks live in [`tracks.json`](tracks.json). The README lists the fields. Before you open a pull request, run:

```bash
python3 scripts/check_catalog.py
```

When a change is something a syllabus should record, bump `version` and `updated` in [`assets/site-meta.js`](assets/site-meta.js), repeat that version and date in `index.html`, `cite.html`, and `license.html`, set the same version and `date-released` in [`CITATION.cff`](CITATION.cff), and add an entry to [CHANGELOG.md](CHANGELOG.md).

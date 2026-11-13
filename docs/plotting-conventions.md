# Plotting conventions

This file is the record of how a Project Viz demonstration draws a figure, and of which library versions it may load. The pins live in [`assets/vendor.json`](../assets/vendor.json). A page does not paste its own copy of a CDN address.

[CONTRIBUTING.md](../CONTRIBUTING.md) still owns the demo chrome: the shared theme, the 44px range target, labels and formulae that stay on screen, and scroll. This file does not replace that. It points at it.

## Which tool

Use the tool that already fits the picture. Do not add a new one.

**D3** is the usual choice for a statistics figure drawn as SVG: scales, axes, histograms, linked marks, and points the visitor drags. Kernel density, covariance, and the target analogy are this kind of page.

**Chart.js** is for a line, bar, or mixed chart that the page already thinks of as datasets. The z-distribution against the t-distribution, the power curve, Bessel's correction, the conceptual hierarchy, and the fNIRS demonstration use it. Do not add Chart.js to a figure that is already D3.

**A canvas or an SVG you draw yourself** is for a diagram, a board, a trace, or an illustration that is not a chart. The Galton board, the EEG traces, the noematachograph, the mixed-ANOVA cells, and the sum-of-squares partitions are this kind. Do not wrap those in a chart library.

**Three.js** is only for a 3D scene. The two multiple-regression planes use it. Do not use it for a flat plot.

Do not introduce Plotly, Vega-Lite, Observable Plot, or any other plotting library. The current tools are the ones this library keeps.

## Pins

New work loads a library from the registry. The tag is a normal blocking script, with a path relative to the page. Catalog and Guided Tracks open the demonstration in an iframe, and that relative path still resolves:

```html
<script src="../assets/vendor-loader.js" data-libs="d3"></script>
```

`data-libs` is a comma-separated list. The names are `d3`, `chart`, `jstat`, `katex`, `three`, and `orbit-controls`. The loader reads [`assets/vendor.json`](../assets/vendor.json) and writes the pinned URLs before the rest of the page runs, so a later script still sees `d3`, `Chart`, `katex`, `jStat`, and `THREE`.

Order is fixed by the registry. KaTeX is CSS, then `katex.min.js`, then auto-render. OrbitControls comes after Three.js even if the attribute lists them the other way around. Do not add `defer` or `async` to the loader. Do not copy a versioned URL into the page.

Pages that typeset on their own call `renderMathInElement` and leave `data-katex-auto` off. Two older pages need the loader to typeset once the document is parsed, because that used to be the script's `onload`:

- `data-katex-auto="default"` uses KaTeX's own delimiters (Moments as Averages).
- `data-katex-auto="dollars"` also typesets `$...$` and `$$...$$` (the central limit theorem, and z against t).

A page that does not use these libraries does not load the script.

### Versions in the registry

Checked against the package registries on 13 November 2026.

| Library | Pin | Why this one |
| --- | --- | --- |
| D3 | 7.9.2 | Current 7.x. `https://d3js.org/d3.v7.min.js` was this exact file. Two pages had been on the cdnjs 7.8.5 build. 7.9.0 adds a color scheme and changes geo precision. These demos do not use geo. |
| Chart.js | 4.6.1 | Current 4.x, and the file an unpinned `npm/chart.js` URL was already serving. One page had named 4.4.1. The releases between them are bugfixes, pie and doughnut spacing, and an optional scale-title stroke. The hierarchy chart sets its own colors. |
| KaTeX | 0.16.9 | The patch already used on the newer demos. 0.16.9 adds bold Fraktur and does not restyle the formulas already on the 0.16.8 pages. The 0.16 line later continued (0.16.47 was the last 0.16 patch on this date) and current KaTeX is 0.19.1. Those later releases change spacing, fonts, and, from 0.18, CSS class names. They are not this pin. |
| jStat | 1.9.6 | Still the latest release. `jstat@latest` was this same file. Do not put `@latest` back. |
| Three.js | 0.128.0 (r128) | Not upgraded. The cdnjs `three.js/r128/three.min.js` file is the same bytes as `three@0.128.0/build/three.min.js`. OrbitControls stays the `examples/js` build from `three@0.128.0`, which attaches `THREE.OrbitControls`. |

Each script and stylesheet URL in the registry carries a sha384 integrity hash taken from the file that URL returned. The loader adds `crossorigin="anonymous"`, which the hash requires.

## Rules for a new page

- Pin an exact version. Never `@latest`. Never a package URL with no version, such as `npm/chart.js`.
- New mathematics uses KaTeX. Do not add MathJax.
- Do not add the Tailwind Play CDN (`https://cdn.tailwindcss.com`). Use the shared theme sheet the page already should load: [`assets/stats-demo-theme.css`](../assets/stats-demo-theme.css) or [`assets/neuroscience-demo-theme.css`](../assets/neuroscience-demo-theme.css).
- Three.js stays on r128 until a deliberate upgrade of its own. Do not bump it while changing a plot.
- Name the axis, the legend, and the readout by the quantity (sample mean, SSE, frequency), not by a generic y or value.
- Keep a formula on screen when the formula is the lesson. A reference formula may sit in a disclosure. [Demo interface](../CONTRIBUTING.md#demo-interface) is the rest of that rule.
- Use the light statistics theme or the dark neuroscience lab. Do not invent a third chrome theme. Personality and cognitive pages may keep their own look, as [Demo interface](../CONTRIBUTING.md#demo-interface) already says.
- Do not put a scrollbar over a canvas, especially a WebGL canvas. In Chrome that scrollbar can paint as a black band.
- Phone and coarse-pointer range inputs stay a 44px target. [Range sliders](../CONTRIBUTING.md#range-sliders) is that rule. Do not paint the hit box back to a thin track.

## How to upgrade a library later

1. Edit [`assets/vendor.json`](../assets/vendor.json): the version, the URL, and the integrity hash. Do not edit the demonstration pages. The HTML already asks for the library by name.
2. Download the file and recompute the hash. Do not invent one. If you cannot verify a hash, omit `integrity` rather than guess. `python3 scripts/check_vendor.py --fetch` downloads every pinned URL and reports the hash it actually got when one does not match.
3. Run `python3 scripts/check_vendor.py` and `python3 scripts/check_catalog.py`.
4. Open every page in the `smoke` list below, on a local server or on GitHub Pages. The loader reads `vendor.json` from the same origin. Opening a demonstration as a `file://` URL will not.
5. Open a draft pull request. Do not bump the citation version in [`assets/site-meta.js`](../assets/site-meta.js) for a pin. A syllabus does not need a new citation when the teaching content did not change.

The short list, also stored as `smoke` in the registry:

- `statistics/kde_plots.html` — D3
- `statistics/target_analogy_confidence_intervals.html` — D3, previously the cdnjs 7.8.5 build
- `personality_psychology/lexical_approach.html` — D3 force layout, previously 7.8.5
- `statistics/stats_conceptual_hierarchy.html` — Chart.js and KaTeX, previously Chart.js 4.4.1
- `statistics/z_distribution_vs_t_distribution.html` — Chart.js, jStat, and KaTeX
- `statistics/power_curve.html` — Chart.js, jStat, and KaTeX
- `neuroscience/fnirs_mechanism.html` — Chart.js
- `statistics/central_limit_theorem.html` — KaTeX, including `$...$`
- `statistics/ols_simple_linear_regression.html` — KaTeX
- `statistics/galton_board.html` — KaTeX on a canvas board
- `statistics/two_way_anova.html` — D3 and jStat
- `statistics/statistical_power.html` — D3 and jStat
- `statistics/multiple_regression_sst_ssm_sse.html` — Three.js and OrbitControls
- `statistics/multiple_regression_anova_equivalence.html` — Three.js and OrbitControls
- `statistics/covariance_and_correlation.html` — D3, with a MathJax tag that stays
- `statistics/boxplot_outliers.html` — custom figure, no vendor plot library
- `neuroscience/eeg_illustration.html` — MathJax tag that stays, no vendor plot library
- `catalog.html?demo=statistics/kde_plots.html` — the same D3 page inside the catalog iframe

On a Three.js page, drag the plane. On a KaTeX page, the formula has to be set, not left as raw TeX. On the boxplot page, nothing about the loader should appear.

## Legacy tags that stay

These are allowed to remain. Do not copy them onto a new page.

**MathJax 3.** Older pages typeset with MathJax. New mathematics uses KaTeX. This pass does not convert the MathJax pages:

- `neuroscience/eeg_illustration.html`
- `statistics/additivity_of_variance.html`
- `statistics/bessels_correction_simulation.html`
- `statistics/covariance_and_correlation.html`
- `statistics/horowitz_1974_simulation_CLT.html`
- `statistics/independent_t_test_simulation.html`
- `statistics/paired_t_test_simulation.html`

**The Tailwind Play CDN.** Many demonstrations still load `https://cdn.tailwindcss.com`. Removing it would restyle the page. This pass leaves every existing tag in place. A new page uses the shared theme sheet and does not add the Play CDN. The pages that still have the tag are:

- `neuroscience/EEG_signal_decomposition.html`
- `neuroscience/eeg_illustration.html`
- `neuroscience/erp_demo.html`
- `neuroscience/fnirs_mechanism.html`
- `personality_psychology/lexical_approach.html`
- `personality_psychology/nlp_psychotherapy.html`
- `statistics/additivity_of_variance.html`
- `statistics/anova_assumptions.html`
- `statistics/bessels_correction_simulation.html`
- `statistics/boxplot_histogram.html`
- `statistics/building_normal_distribution.html`
- `statistics/central_limit_theorem.html`
- `statistics/chi_square_distribution.html`
- `statistics/covariance_and_correlation.html`
- `statistics/galton_board.html`
- `statistics/horowitz_1974_simulation_CLT.html`
- `statistics/independent_t_test_simulation.html`
- `statistics/kde_plots.html`
- `statistics/limitations_of_summary_statistics.html`
- `statistics/mean_mode_median_dot_plot.html`
- `statistics/moments_as_averages.html`
- `statistics/paired_t_test_simulation.html`
- `statistics/power_curve.html`
- `statistics/q_q_plot.html`
- `statistics/skewed_distribution.html`
- `statistics/statistical_power.html`
- `statistics/stats_conceptual_hierarchy.html`
- `statistics/t_test_to_anova.html`
- `statistics/target_analogy_confidence_intervals.html`
- `statistics/two_way_anova.html`
- `statistics/variance_explained.html`
- `statistics/z_distribution_vs_t_distribution.html`

**Three.js r128.** Both regression planes load r128 / 0.128.0 through the registry. That pin is deliberate. A newer Three.js is a separate change, with its own smoke of both planes, not a side effect of editing `vendor.json` for something else.

Two tags are not plot or math libraries, so they are not in the registry and this pass does not pin them: Lucide (`unpkg.com/lucide@latest`) on the ERP demonstration, and compromise on NLP in Psychotherapy.

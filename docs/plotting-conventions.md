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

Three.js r187 has no classic file. The `three` assets are `build/three.core.js` and then `build/three.module.js`. `orbit-controls` is `examples/jsm/controls/OrbitControls.js`. Each one is an ES module. The loader checks the sha384 pin and evaluates it, so a later classic script still sees `THREE` and `THREE.OrbitControls`. Core has to stay before the module entry. D3, Chart.js, jStat, and KaTeX are still ordinary script tags.

Pages that typeset on their own call `renderMathInElement` and leave `data-katex-auto` off. Other pages ask the loader to typeset once the document is parsed:

- `data-katex-auto="default"` uses KaTeX's own delimiters (Moments as Averages).
- `data-katex-auto="dollars"` also typesets `$...$` and `$$...$$`. That is the central limit theorem, z against t, Bessel's correction, covariance and correlation, the Horowitz (1974) simulation, the independent t-test, the paired t-test, additivity of variance, and the EEG illustration.

A page that replaces a caption or a formula after that pass calls `renderMathInElement` on the new text. Bessel's correction does that for the latest sample. The independent t-test does it when the explanation changes. Additivity of variance typesets the sum and difference labels, including the ones that start hidden, and again when the mode switches. The EEG illustration does it when the inspector text changes.

A page that does not use these libraries does not load the script.

### Versions in the registry

Checked against the package registries on 13 November 2026.

| Library | Pin | Why this one |
| --- | --- | --- |
| D3 | 7.9.2 | Current 7.x. `https://d3js.org/d3.v7.min.js` was this exact file. Two pages had been on the cdnjs 7.8.5 build. 7.9.0 adds a color scheme and changes geo precision. These demos do not use geo. |
| Chart.js | 4.6.1 | Current 4.x, and the file an unpinned `npm/chart.js` URL was already serving. One page had named 4.4.1. The releases between them are bugfixes, pie and doughnut spacing, and an optional scale-title stroke. The hierarchy chart sets its own colors. |
| KaTeX | 0.19.1 | Current release, pinned 13 November 2026, up from 0.16.9. Later 0.16 patches (the line ended at 0.16.47) can change spacing and fonts. From 0.18, internal CSS classes are prefixed with `katex-`: `.base` is `.katex-base`, and the same prefix applies to strut, rule, sizing, and the other short names in the KaTeX migration guide. 0.19.0 reports a missing character metric through `strict`. A later upgrade has to recheck selectors and formula spacing, not only the hash. |
| jStat | 1.9.6 | Still the latest release. `jstat@latest` was this same file. Do not put `@latest` back. |
| Three.js | 0.187.0 (r187) | Current release, pinned 13 November 2026, up from 0.128.0 (r128). r160 removed `build/three.min.js`. r147 removed `examples/js`, so OrbitControls is now `examples/jsm/controls/OrbitControls.js` and imports from `three`. The loader evaluates `build/three.core.js`, then `build/three.module.js`, then that OrbitControls file, all from jsDelivr `npm/three@0.187.0`, and still attaches `THREE` and `THREE.OrbitControls`. This is a major API jump. `outputEncoding` and `sRGBEncoding` are gone, replaced by `outputColorSpace`. Lighting is physically based, so the legacy π on ambient and hemisphere irradiance is gone. Color management is on by default and would reinterpret hex colors. The two planes turn that conversion off, put π back on the ambient or hemisphere light, keep sRGB output on Multiple Regression, and keep linear output on ANOVA Equivalence. r187 also removed `PCFSoftShadowMap`, so Multiple Regression uses `PCFShadowMap`. |

Each script and stylesheet URL in the registry carries a sha384 integrity hash taken from the file that URL returned. The loader adds `crossorigin="anonymous"`, which the hash requires.

## Rules for a new page

- Pin an exact version. Never `@latest`. Never a package URL with no version, such as `npm/chart.js`.
- Mathematics uses KaTeX. Do not add MathJax.
- Do not add the Tailwind Play CDN (`https://cdn.tailwindcss.com`). Layout utilities come from [`assets/tailwind.css`](../assets/tailwind.css). Load that sheet with the shared theme the page already should use: [`assets/stats-demo-theme.css`](../assets/stats-demo-theme.css) or [`assets/neuroscience-demo-theme.css`](../assets/neuroscience-demo-theme.css). A class that is not already in the sheet does nothing until you rebuild it. [Tailwind](#tailwind) is that rule.
- Do not bump Three.js while changing a plot. A Three.js upgrade is its own change, and it has to smoke both regression planes.
- Name the axis, the legend, and the readout by the quantity (sample mean, SSE, frequency), not by a generic y or value.
- Keep a formula on screen when the formula is the lesson. A reference formula may sit in a disclosure. [Demo interface](../CONTRIBUTING.md#demo-interface) is the rest of that rule.
- Use the light statistics theme or the dark neuroscience lab. Do not invent a third chrome theme. Personality and cognitive pages may keep their own look, as [Demo interface](../CONTRIBUTING.md#demo-interface) already says.
- Do not put a scrollbar over a canvas, especially a WebGL canvas. In Chrome that scrollbar can paint as a black band.
- Phone and coarse-pointer range inputs stay a 44px target. [Range sliders](../CONTRIBUTING.md#range-sliders) is that rule. Do not paint the hit box back to a thin track.

## How to upgrade a library later

1. Edit [`assets/vendor.json`](../assets/vendor.json): the version, the URL, and the integrity hash. The HTML asks for the library by name. A breaking API, which the r128 to r187 Three.js jump was, can still require a page change.
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
- `statistics/bessels_correction_simulation.html` — Chart.js and KaTeX. The sample card is typeset again after each draw.
- `statistics/horowitz_1974_simulation_CLT.html` — D3 and KaTeX
- `statistics/independent_t_test_simulation.html` — D3 and KaTeX. The explanation is typeset again when the test changes.
- `statistics/paired_t_test_simulation.html` — D3 and KaTeX
- `statistics/additivity_of_variance.html` — D3 and KaTeX. Sum and difference captions, including the ones that start hidden, are typeset.
- `statistics/two_way_anova.html` — D3 and jStat
- `statistics/statistical_power.html` — D3 and jStat
- `statistics/multiple_regression_sst_ssm_sse.html` — Three.js and OrbitControls
- `statistics/multiple_regression_anova_equivalence.html` — Three.js and OrbitControls
- `statistics/covariance_and_correlation.html` — D3 and KaTeX
- `statistics/boxplot_outliers.html` — custom figure, no vendor plot library
- `neuroscience/eeg_illustration.html` — KaTeX, no vendor plot library. The inspector text is typeset again when the layer changes.
- `catalog.html?demo=statistics/kde_plots.html` — the same D3 page inside the catalog iframe
- `catalog.html?demo=statistics/covariance_and_correlation.html` — the covariance page inside the catalog iframe

On a Three.js page, drag the plane. On a KaTeX page, the formula has to be set, not left as raw TeX. On the boxplot page, nothing about the loader should appear.

## Tailwind

The Play CDN (`https://cdn.tailwindcss.com`) is not allowed on a demonstration, a catalog page, or a docs page. Tailwind does not recommend that script for production. It is a browser compiler, and it is not a pinned file in [`assets/vendor.json`](../assets/vendor.json). The registry only pins `https` plot and math files with a sha384 hash. Tailwind does not publish one production CSS file that already contains these pages' utilities and the two old `tailwind.config` blocks, so the compiled sheet lives in the repo.

[`assets/tailwind.css`](../assets/tailwind.css) is that sheet. It was built with Tailwind CSS 3.4.17 on 13 November 2026. That is the compiler the Play CDN served (`https://cdn.tailwindcss.com/3.4.17`). The file's sha384 is `sha384-Ju9izHYQ0M3/6cpf6wddrym/E9zSRCNr6GY0Zbj3rr49txjfHRPzQUyomxWoCii3`, taken from the committed bytes, header included. A page loads it next to the shared theme:

```html
<link rel="stylesheet" href="../assets/tailwind.css">
```

The path is relative, the same way the vendor loader is. Put the link at the end of `head`, after the shared theme and after the page's own style block. The Play CDN appended its style at the end of `head` once the page had been parsed, so a utility won a tie with the theme. A rule that has to beat a utility comes after the link. Power Curve's Inter stack on `html` is that kind of rule. Do not paste a Tailwind URL. Do not add `defer` or `async`. A page that does not use these utilities does not load the sheet.

The build reads the demonstration HTML, including class names assigned in scripts, and writes only the utilities those files use, plus Preflight. Source and config:

- [`assets/tailwind.input.css`](../assets/tailwind.input.css)
- [`assets/tailwind.config.js`](../assets/tailwind.config.js)
- `python3 scripts/build_tailwind.py`

Two pages used to set `tailwind.config` in the browser. Those settings are kept.

- Power Curve sets `primary` to `var(--viz-group-a)`. `text-primary` still uses that token. The same config set `fontFamily.sans` to Inter. Putting that in the shared sheet would change Preflight on every page, so Power Curve sets `html { font-family: Inter, sans-serif }` itself. `body.demo-page` still forces Arial.
- The ERP page set `darkMode: 'class'` and the colors `brand` (50, 100, 500, 600, 700, 900) and `eggplant` (`#2e1065`). No `dark:`, `brand-*`, or `eggplant` utility is used, so the sheet does not emit those rules. `darkMode` stays `class`, so a later `dark:` utility follows `html.dark` on that page rather than the operating system.

To upgrade Tailwind, or to add a utility that is not in the sheet yet:

1. Edit the version in [`scripts/build_tailwind.py`](../scripts/build_tailwind.py) if the compiler changes. Edit [`assets/tailwind.config.js`](../assets/tailwind.config.js) only when a real theme value changes.
2. Run `python3 scripts/build_tailwind.py`, then `python3 scripts/build_tailwind.py --check`. Do not edit `assets/tailwind.css` by hand. Do not invent the hash. The build prints the sha384 of the file it wrote.
3. Run `python3 scripts/check_vendor.py` and `python3 scripts/check_catalog.py`.
4. Open the pages listed below. A new class has to be a whole token in the HTML (`bg-slate-800`, not `bg-` plus a variable) or the scanner will miss it.
5. Open a draft pull request. Do not bump the citation version in [`assets/site-meta.js`](../assets/site-meta.js) for a rebuild. A syllabus does not need a new citation when the teaching content did not change.

These pages load the sheet:

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

## Legacy tags that stay

These are allowed to remain. Do not copy them onto a new page.

**Three.js.** Both regression planes load 0.187.0 (r187) through the registry, as in the versions table above. A newer Three.js is still its own change, with its own smoke of both planes, not a side effect of editing `vendor.json` for something else.

Two tags are not plot or math libraries, so they are not in the registry and this pass does not pin them: Lucide (`unpkg.com/lucide@latest`) on the ERP demonstration, and compromise on NLP in Psychotherapy.

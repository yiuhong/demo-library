# Changelog

All notable changes to Project Viz are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Variance Explained uses a shorter page. The mode switch sits with the title, the slider and the distance toggles share one card, and the scatter plot and the variance breakdown sit side by side with less padding. The scatter keeps its size from that card. The model, the formulae, and the light theme are unchanged. Phone and coarse-pointer range targets stay 44px.

- Multiple Regression and ANOVA Equivalence keeps the stage controls next to the plot. The inspector opens on Controls (interaction, slice, morph, and the stage switches). Fitted OLS model, true population parameters, and variance partitioning are on Model / Fit, so those cards no longer sit above the sliders. Show description / Hide description is the same control as before, on a wide screen as well as a phone, and it still uses `demo-library-regression-anova-step-description`. With no saved choice, the step text starts closed when the window is at most 960px wide or at most 900px tall, and open on a taller wide screen. A saved choice is kept everywhere. A stacked layout (that 960px breakpoint, other than a short landscape phone) scrolls the page only. The plot is `min(52vh, 90vw)`, and the stage card and the inspector sit in that scroll, with no inner vertical scrollbar. Formulae wrap. A short landscape phone keeps the full plot under the compact header. The cite strip stays in the page, just past that plot, so it is not pinned over the legend. Inspector on that plot opens the same controls; Plot returns to the figure. On a narrow screen the stage and camera bars scroll sideways, so the plot and the controls are not pushed down by a stack of pills. The stage card no longer has its own scrollbar. The model, the scene, and the shared 44px range target are unchanged.

- Multiple Regression and ANOVA Equivalence on a landscape phone. The plot had been capped at 240px under the header, and the stage card plus a two-row legend left about a hundred pixels of the surface. The plot now fills the screen under the header, and the stage and camera bars scroll sideways. The legend stays on the plot and wraps, because a scrollbar over the canvas painted a black band across the scene. A Show description control on the plot and in the sidebar opens the step text again. The choice is kept in this browser. Stage, camera, action, and radio controls, and that description control, are 44px on a phone or a coarse pointer. A wide screen with a fine pointer keeps the compact controls. The canvas still follows its box.

- Fullscreen on Catalog and Guided Tracks still calls the browser Fullscreen API on the demo pane. The pane’s scroll height is measured while the embedded page is the pane’s own height. A demonstration that sizes itself from the viewport (100vh, 100%, or a canvas that follows its wrapper) no longer makes that iframe grow without bound. Covariance and Correlation was already stable. The Noematachograph, the probability distributions map, and the chi-square distribution were not: each kept reporting a taller page after the iframe grew, and the figure ran off without a limit. The enter control stays hidden under 480px.

- Guided Track connection notes and Key points typeset subscripts and superscripts. Pearson's r, the pooled and difference-score standard deviations, ANOVA mean squares and sums of squares, chi-square, and the Poisson count no longer show a raw underscore or `^{}`. The same notation on the paired-t figure labels is set as math text. The zero-spread note on Covariance and Correlation, and the residual-plot axis on Ordinary Least Squares, use the same subscript treatment. Meaning of each line is unchanged.

### Added

- Multiple Regression, under Statistics → Association, with an Association track step after Ordinary Least Squares. Two predictors fit a plane, and the total sum of squares splits into model and error.
- Guided Tracks opens on a topic overview. `topics` in [`tracks.json`](tracks.json) groups the playlists: Describing data, Probability & sampling, Comparing means, and Association. On a wide screen the rail lists All topics and each topic, and the pane draws one tree. All topics shows Guided Tracks and the topics only, with a small animated plate beside each topic and no tracks nested under them. Choosing a topic zooms that subtree: the same plate, then the tracks. Choosing a track opens its playlist. `tracks.html?topic=the-id` focuses a topic. A track opened from that topic keeps `topic=` so Back returns to the subtree; a track opened from the full overview does not, so Back returns to the full tree. A phone shows the same tree first, then the playlist, then the demonstration. Plates hold still when motion is reduced.
- Guided Tracks Previous and Next, on the same pane bar as Fullscreen. They step through the open track in rail order: the connection title, then its demonstration. Previous is unavailable on the first page. Next is unavailable on the last. The same controls stay on a phone. Fullscreen stays hidden under 480px.
- A Guided Tracks connection opens in the demo pane. When a step has a note, formulae, or figure, the rail lists that step's `connectionTitle` immediately before the demonstration. The same title is the heading on [`tracks/connection.html`](tracks/connection.html), which reads the step from `tracks.json`. `step=` is still that step's index. `tracks.html?track=the-id&demo=tracks/connection.html&step=0` opens the page for step 0. Phone Back returns to the same track list.
- Catalog and Guided Tracks share one shell: a top bar (Home, Catalog, Guided Tracks, About Yiu Hong), a left rail, and a demo pane. The Guided Tracks rail is a vertical menu of playlist links. The selected demonstration loads in the pane. Fullscreen puts that pane into browser fullscreen. A phone shows one step at a time; Back returns to the same category or track. `catalog.html?demo=…` and `tracks.html?demo=…` open that demonstration directly.

### Changed

- EEG Signal Decomposition unlocks page scroll on a narrow or short window, so the live controls and the traces are not trapped in two inner scrollers. On a phone the page is the only vertical scroller. On a tall desktop the side column may still scroll, and the traces do not. The raw signal, the five bands, and the power spectrum stay together. The signal math, the colors, and the dark lab are unchanged.

- Noematachograph, NLP in Psychotherapy, and Lexical Approach use the same Catalog and Guided Tracks Fullscreen hook as the other demonstrations. Noematachograph loads the dark-lab theme. The two personality pages load the light statistics theme. Each page keeps its own layout, colors, and type.

- Neuroscience demonstrations embedded in Catalog or Guided Tracks clip sideways overflow, the same way the statistics theme already does. A wide table or a hidden formula no longer opens a horizontal scrollbar that grows the catalog iframe. The dark lab look is unchanged. A page opened on its own is unchanged.

- Chi-Square Distribution, Covariance and Correlation, Building the Normal Distribution, and Target Analogy of Confidence Intervals unlock page scroll on a narrow or short window, so the live controls and the figures are not trapped in an inner scroller. On a tall desktop the side column may still scroll, and the plots do not. Chi-square keeps both charts and the bridge in the column. The target keeps both figures together. The step maths and the live formulae stay open. Plot math, copy, and the shared theme are unchanged.

- Boxplot and Outliers and From Paired t-Test to RM-ANOVA keep `body.demo-page`, so the shared statistics theme applies, including the 44px phone and coarse-pointer range target. On From Paired t-Test to RM-ANOVA the 6px range height applies only outside `(max-width: 768px), (pointer: coarse)`. Inside that query, `body.demo-page input[type="range"]` supplies the 44px hit box and `touch-action: pan-y pinch-zoom`. Plots, copy, and calculations are unchanged.

- [CONTRIBUTING.md](CONTRIBUTING.md) states the refined demonstration chrome rules. Load the matching shared theme and keep `body.demo-page`, run the `embed=shell` hook, keep one vertical scroller, leave live controls next to the figure, and size the page for the catalog iframe. Multiple Regression and ANOVA Equivalence keeps its own tabs, breakpoints, plot height, and preference key. No demonstration files changed.

- A Guided Tracks connection page shows the figure after the formulae and before **In the next demo**. The heading and the demo description still follow the figure, including in a short embedded pane: the note and the formulae scroll above that block so the figure, including its axis labels, and the closing line stay in view. The Multiple Regression connection figure is a line drawing of a fitted plane with vertical gaps, in place of a still of the demonstration.
- Hub pages name their bands `viz-section`, `viz-section--alt`, and `viz-fade-up`. The old `wrapper`, `style1`, `style1-alt`, and `fade-up` class names are gone from Home, Catalog, Guided Tracks, Cite & reuse, and Licenses. The reading column, the footer, and the load fade look the same.
- A Guided Tracks connection page puts an **In the next demo** heading immediately before `demoDescription`, when that line is present. It follows the formulae, or the note when a step has no formulae.
- A Guided Tracks connection page puts a **Key points** heading immediately before the formulae, when that step has any, and a short `demoDescription` immediately after the box. The line says what that step’s demonstration does. It still follows the note when a step has no formulae. Where a note ended in a demonstration instruction, that sentence moved into the new line. The title, the note, and the figure stay in their places.
- Landscape stays available. Nothing locks orientation. Fullscreen on Catalog and Guided Tracks still uses the browser Fullscreen API on the demo pane. Turning the device while that pane is fullscreen measures the demonstration again, so a tablet in landscape keeps a scrollable pane and Exit. The enter control stays hidden under 480px. The kernel density estimate keeps its side-by-side layout on a short wide screen and scrolls the plots; a 1024×768 landscape tablet had clipped that column.
- Fullscreen still uses the browser Fullscreen API on the demo pane. While that pane is fullscreen it is the scrollport: the embedded demonstration is laid out at its content height, so a vertical swipe scrolls a long page. The scroll is contained (`overscroll-behavior: contain`) and does not call `document.exitFullscreen()`. Exit stays on screen. Exit, Back, and Escape still leave fullscreen. The enter control stays hidden under 480px. A browser that reserves swipe-down to leave fullscreen (iPadOS Safari) can still do that; this page cannot cancel that gesture.
- Ordinary Least Squares: squares and distances are separate checkboxes on the candidate line, the OLS line, and the null model. Either, both, or neither can be on. Clearing both leaves that line and the points, with no error squares or distance marks. The page still opens with candidate squares on and candidate distances off, the OLS line off (its squares checkbox stays selected), and the null model on with both of its error checkboxes off.
- Home, Catalog, Guided Tracks, Cite & reuse, and Licenses no longer load the personal-site stylesheet or its scripts. Type, the reading column, the footer menu, and the load fade live in `assets/foundation.css`. The favicon and the About Yiu Hong link are unchanged.
- The notebook sheet is white paper, black UI ink, a faint blue grid, and a thin red margin (plus the rule above the home colophon), a little brighter than the first sheet. Statistics demonstrations use a quieter version of that same red on the page edge. Plots, canvases, Catalog browse, the empty stage, the topic overview, and connection notes stay plain. Neuroscience stays the dark lab.
- Guided Tracks tree stems share one vertical line. The short stem under the root box had sat a pixel to the right of the spine, because that stem was measured from inside the root border.
- Fullscreen stays available on a tablet. It had been hidden, and the Fullscreen API refused, at `max-width: 736px` — the same cutoff as the one-step phone shell, just under an iPad (744px mini, 768px classic). A coarse pointer did not hide it. The control is now hidden only under 480px, so a narrow phone keeps the title readable, and a tablet still in that one-step shell can enter fullscreen on the demo pane. The embedded demonstration is allowed into that fullscreen. Exit and Escape still leave it.
- Catalog: with a demonstration open, Back to browse stays at the top of the left rail and the demo list scrolls in the space below it. The button is no longer sticky inside that list, so scrolling does not slide later rows underneath it.
- Phone and coarse-pointer range sliders stay 44px tall. Their `touch-action` is `pan-y` with pinch-zoom, so a vertical finger scrolls the page and a horizontal finger still moves the control. If that gesture becomes a scroll, the value returns to where it was when the finger went down. The rule is in the shared statistics and neuroscience demo themes, and the value restore is in the shared demo footer script.
- Fullscreen on Catalog and Guided Tracks uses the browser Fullscreen API on the demo pane (the bar and the open demonstration or connection). Exit and Escape leave it. A browser without that API leaves the page as it was.
- Guided Tracks topic buttons, and the same Catalog category buttons, keep black text on `#f6f6f6` when selected. Hover and keyboard focus still fill the button black. The title follows that color, so it is white on the black fill. The selected inset bar is visible again.
- New demonstrations keep the shared 44px phone and coarse-pointer range target. Load the shared demo theme, keep `body.demo-page`, and do not paint that hit box back to a thin track. A page may still set its own thumb color. See [CONTRIBUTING.md](CONTRIBUTING.md).
- Phone and coarse-pointer range sliders have a 44px target (an 8px track and a 28px thumb) from the shared statistics and neuroscience demo themes. A finger that is not exactly on a thin track still moves the control, including where a page had painted a 4px track. The central limit theorem no longer starts its simulation on load, so those sliders are usable immediately. Run still plays it, and still disables the sliders while that run is in progress.
- Ordinary Least Squares: long-press or long-click a point (about half a second, with little movement) to remove it, with a mouse or on a touch screen. Shift+click no longer removes a point. At least three points stay. A drag past a small movement threshold still moves the point. The press target is the same 22px radius used on Covariance and Correlation, so a finger can land it; a press on a candidate-line handle still tilts the line.
- Conceptual lead copy now sits on the Guided Tracks connection note for that step. Each demonstration keeps a short line on how its controls work, so a Catalog open still has one-line context. Notes that already carried the idea were left as they were, except where the demonstration had a point the note did not: the standard error, and estimating it with s / √n, on the central limit theorem; the Horowitz (1974) sample and page citation; the general moment (center, scale, and power, including kurtosis); why a small s pushes a t statistic into the tail; the Anscombe (1973) and Matejka and Fitzmaurice (2017) citations on same-summary graphs; and Type I error and power when an ANOVA assumption breaks. Formulae and connection figures are unchanged. Demos with no connection page keep at most one short blurb. The stepped lessons (building the normal curve, the lexical-hypothesis steps) stay, because that prose is the demonstration.
- Shell panes that were a light-gray well are plain white. That is the topic overview, the empty “Select a step.” stage, Catalog browse, and an embedded connection note. The graph paper stays on the page and the rail; it does not cross those panes or a live plot. Selected rows stay `#f6f6f6` with an outline or an inset bar.
- Hover and keyboard focus on Home, Catalog, and Guided Tracks choices use a black fill and white text. The selected row keeps black text on `#f6f6f6`, with a 2px black outline or an inset black bar. A selected playlist step is no longer a solid black fill. The top bar stays a black underline on white. The home plate’s current dot is a black ring; hover still fills the control black.
- Catalog is a two-step browse, in the same spirit as Guided Tracks. With nothing open, the rail lists categories and the pane is that category’s card grid (title and one-line blurb). The first category is focused on arrival. Opening a card switches the rail to that category’s demos and loads the demonstration. Back to browse restores the grid. A phone stacks categories, then the demos in the chosen category, then the demonstration. `catalog.html?demo=…` still opens that demonstration directly. Search looks inside the focused category.
- Home, Catalog, and Guided Tracks wear a light notebook sheet (class `viz-notebook` on `<html>`, [`assets/notebook.css`](assets/notebook.css)). Graph paper sits on the page chrome, with a thin margin line on the left and a quiet ruler under the top bar. The paper is white. A featured plate keeps its own canvas, including the dark neuroscience plate. The pane around an open neuroscience demonstration uses a cool gray bar over a dark stage. The grid does not enter a demonstration iframe. Cite & reuse and Licenses stay plain. `?notebook=0` hides the sheet.
- Demo pages keep a short strip: **Cite this demo** (that demo’s citation, in a new tab) and the author site (in a new tab). License, site-wide cite, ORCID, issues, and source links stay on the library footer.
- Guided Tracks opens on the topic overview. Choosing a track shows that playlist in the rail: the connection title, then the demonstration. Back returns to the focused topic, or to the full overview. On a phone, Back from a demonstration returns to that track, and Back from the track returns to the topic tree. A shared `tracks.html?track=the-id&demo=…` link still opens the step; Back restores the playlist first.
- Home uses the same horizontal top bar as Catalog and Guided Tracks (Home, Catalog, Guided Tracks, About Yiu Hong). The page stays a featured landing: wordmark, buttons, and the plate. Cite & reuse and Licenses stay in the colophon and the footer.
- Cite & reuse and Licenses use that same horizontal top bar. The vertical sidebar, the phone Menu button, and the “← Project Viz” button are gone from those pages. The citation and license text, and the footer, stay.
- The About Yiu Hong control in the shared top bar keeps a full outline. The text-link underline no longer removes its bottom edge, so the whole label stays visible and tappable on Home, Catalog, Guided Tracks, Cite & reuse, and Licenses.
- Guided Tracks phone and tablet polish. An open connection row keeps its title and matches the height of a step card. Footer credits wrap instead of scrolling sideways, and the phone top bar no longer sits the About chip on the divider. The rail is a quarter of a tablet portrait instead of a fixed 16rem. Connection figures and statistics demonstrations scroll inside the pane without a horizontal scrollbar or a clipped axis label. Opening a step highlights that step, not every concept-map copy.
- A demonstration or connection page embedded in the shell hides Return to Project Viz. That link stays when the file is opened on its own. Home stays the featured page.

### Removed

- Home featured-plate captions (`FIG_VE`, `FIG_R`, `FIG_ERP`, and Plate 1 of 3). The drawings still loop, and they hold still when motion is reduced. Chart marks inside a drawing, such as `r = .18` and `P3`, stay.
- The Opened label on the home “Open the demo” control. That control looks the same every time. The library no longer stores which demonstrations were opened.
- The HTML5 UP design credit from the library footers on Home, Catalog, Guided Tracks, Cite, and Licenses. Those pages no longer name HTML5 UP, and the license table no longer lists a template credit.
- Variance and Correlation and covariance from the Guided Tracks menu. Those titles were concept-map strips from `families.json`. The file stays, and those families are not playlists. Real tracks keep their connection titles.
- Guided Tracks rail copy that did not navigate: the “Concept maps” heading, “Related demonstrations along a path.”, the “Concept map” kicker, the backbone sentence under a concept map, and the summary paragraph under a playlist. Section titles and demonstration titles stay.
- Fullscreen buttons on demonstrations that called the browser Fullscreen API. Catalog and Guided Tracks keep the shell Fullscreen control, which only hides the rail.
- Guided Tracks no longer fills a playlist box black after that demonstration was opened in this browser. The step that is open stays outlined. The home plate can still show Opened. The catalog already had no opened styling.
- The opened-progress counter, its Reset control, and the “Saved in this browser only. No account.” note on Home, Catalog, and Guided Tracks.
- Catalog cards no longer show an Opened tag or any open-state styling. The catalog does not read the opened list.
- The Opened label on Guided Tracks concept maps and playlist steps.
- Concept-map labels for Before, Backbone, and After, including the Backbone prefix on the shared sentence. Guided Tracks does not draw the family strips.
- The Catalog Sections jump list, and the concept-map strips that sat above catalog demo lists. Search, category filters, and the demonstration list stay.

### Added

- Ordinary Least Squares (OLS) for simple linear regression, under Statistics → Association, with an Association track step after Covariance and Correlation
- Concept maps for the variance family and for correlation and covariance. A strip on Guided Tracks. Titles come from the catalog.
- Limitations of summary statistics, under Statistics → Same summaries, different graphs, with a track step after the Q–Q plot (Datasaurus Dozen and Anscombe’s quartet)

### Changed

- A Guided Tracks box is black only when that demonstration was opened in this browser. The old backbone fill no longer paints the center box. Opening a demo is still stored in this browser for Guided Tracks and the home plate.
- Phone and tablet should-fix from the cross-device audit. A still press shows readouts that were hover-only (covariance coordinates, distribution-map edges, KDE crosshair, Q-Q, t-test-to-ANOVA, two-way ANOVA, variance explained, additivity, statistical power, sum-of-squares notes, mixed-ANOVA row highlight). The distributions map pans with one finger horizontally and with two fingers in either direction, pinches to zoom, and uses a taller frame on a narrow screen. EEG, ERP, KDE, and mixed-ANOVA sliders have a finger-sized target on narrow screens. Home, catalog, guided tracks, cite, and licenses allow pinch-zoom.
- Covariance and Correlation: press and hold a point to remove it, with a mouse or on a touch screen. At least two points stay.
- The home is a front page: wordmark, buttons for the catalog and Guided Tracks, and a featured plate that cycles Variance Explained, Covariance and Correlation, and the ERP demo. The catalog and Guided Tracks are separate pages. Choose a path is gone. Each Guided Track is a concept-map rail; the same demos are not listed again underneath.
- The library sidebar is the Project Viz menu: Home, Catalog, Guided Tracks, Cite & reuse, and Licenses. It no longer repeats the personal-site menu, including My projects. About Yiu Hong opens the personal site in a new tab.
- Guided Tracks no longer show a draft badge.
- The home wordmark is the upright black-and-white mark: thin Project, a node-and-link Viz, and a six-point asterisk over the i.
- Formal citations use the full title *Project Viz: A visualization demo library for teaching* (APA, BibTeX, CITATION.cff, the homepage preferred cite, per-demo cites, and the credit line).
- The Cards toggle is gone. A remembered Cards choice opens the catalog.
- Statistics headings match Guided Track titles. Describing data is split into Center and spread, Shape and pictures, and Same summaries, different graphs. Statistical reasoning is split into From process to distribution, Counts, arrivals, and the board, and Sampling distributions and intervals. t-test, Statistical power, ANOVA, and Association are unchanged.

## [0.1.5] - 2026-11-13

### Added

- Multiple Regression and ANOVA Equivalence, under Statistics → Association, with an Association track step after Multiple Regression. The same linear model runs from two continuous predictors through ANCOVA and a 2×2 ANOVA to dummy-coded one-way ANOVA.

## [0.1.4] - 2026-11-01

### Added

- The 5-Level Conceptual Hierarchy of Statistics, a Probability Distributions Map, and a Poisson Distribution & Poisson Point Process, under Statistics → Distributions & sampling, with Statistical reasoning track steps
- 2×2 Mixed ANOVA, under Statistics → ANOVA, with an ANOVA track step after Two-Way ANOVA

### Changed

- Partitioning Sum of Squares now covers 1-way, 2-way, and 3-way between-subjects, within-subjects, and mixed designs

## [0.1.3] - 2026-10-29

### Added

- Binomial Distribution & Bernoulli Process, a coin-flip simulation under Statistics → Distributions & sampling, and a Statistical reasoning track step before the Galton board

## [0.1.2] - 2026-10-29

### Added

- `CITATION.cff` (Citation File Format 1.2.0) for this teaching library, linked from the cite page and the README as the machine-readable citation
- Dual-license table: teaching content is CC BY 4.0, source code is MIT (`LICENSE-CODE`), and the Hyperspace template by HTML5 UP remains CC BY 3.0
- Short licenses page (`license.html`), linked from the library footer, the cite page, and the demo strip
- Accessibility note on the cite page: the library aims for keyboard use and readable contrast, and accessibility issues go to GitHub Issues

## [0.1.1] - 2026-10-29

### Added

- Cite & reuse page, with APA 7, BibTeX, the license split, what you may do, a credit line, and a link to report a mistake
- ORCID iD on the author byline in the library footer, the cite page, and the demo strip
- Short per-demo citation (catalog title, library name, demo URL, and version), including **Cite this demo** on the demo strip
- Homepage about blurb and a preferred citation line
- Personal-site link in the footer and on the cite page
- Contributing notes

## [0.1.0] - 2026-10-29

### Added

- Open license chrome: teaching content under CC BY 4.0 and source code under MIT (`LICENSE`, `LICENSE-CODE`)
- Cite page with APA 7, BibTeX, and a credit line
- Shared site facts in `assets/site-meta.js`
- Library footer and demo license strips with version, date, GitHub Issues, and the repository
- Author Yiu Hong Ko (yiuhong.ko@gmail.com, https://yiuhong.github.io/)

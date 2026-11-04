# Changelog

All notable changes to Project Viz are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A Guided Tracks connection opens in the demo pane. When a step has a note, formulae, or figure, the rail lists that step's `connectionTitle` immediately before the demonstration. The same title is the heading on [`tracks/connection.html`](tracks/connection.html), which reads the step from `tracks.json`. `step=` is still that step's index. `tracks.html?track=the-id&demo=tracks/connection.html&step=0` opens the page for step 0. Phone Back returns to the same track list.
- Catalog and Guided Tracks share one shell: a top bar (Home, Catalog, Guided Tracks, About Yiu Hong), a left rail, and a demo pane. The catalog rail is search, filters, and the list. The Guided Tracks rail is a vertical menu of playlist links. The selected demonstration loads in the pane. Fullscreen hides the rail inside the shell. A phone shows the list or map first, then the demonstration; Back returns to the same category or track. `catalog.html?demo=…` and `tracks.html?demo=…` open that demonstration directly.

### Changed

- Guided Tracks phone and tablet polish. An open connection row keeps its title and matches the height of a step card. Footer credits wrap instead of scrolling sideways, and the phone top bar no longer sits the About chip on the divider. The rail is a quarter of a tablet portrait instead of a fixed 16rem. Connection figures and statistics demonstrations scroll inside the pane without a horizontal scrollbar or a clipped axis label. Opening a step highlights that step, not every concept-map copy.
- A demonstration or connection page embedded in the shell hides Return to Project Viz. That link stays when the file is opened on its own. Home stays the featured page.

### Removed

- Variance and Correlation and covariance from the Guided Tracks menu. Those titles were concept-map strips from `families.json`. The file stays, and those families are not playlists. Real tracks keep their connection titles.
- Guided Tracks rail copy that did not navigate: the “Concept maps” heading, “Related demonstrations along a path.”, the “Concept map” kicker, the backbone sentence under a concept map, and the summary paragraph under a playlist. Section titles and demonstration titles stay.
- Fullscreen buttons on demonstrations that called the browser Fullscreen API. Catalog and Guided Tracks keep the shell Fullscreen control, which only hides the rail.
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

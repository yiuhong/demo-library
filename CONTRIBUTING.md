# Contributing

Thank you for helping Project Viz.

## Bugs

Report a bug or a teaching error on [GitHub Issues](https://github.com/yiuhong/demo-library/issues). Name the demo page, what you expected, and what happened.

## Ideas

GitHub Discussions are not enabled for this repository. Suggest an idea on [GitHub Issues](https://github.com/yiuhong/demo-library/issues). Start the title with "Idea:".

## Pull requests

Pull requests are welcome. Opening a pull request is not a guarantee of merge.

Small corrections — a wrong label, a broken link, a clearer sentence — are the easiest to review. Keep teaching text, explanations, and figures under CC BY 4.0, and source code under MIT, as [LICENSE](LICENSE) and [LICENSE-CODE](LICENSE-CODE) describe. [license.html](license.html) lists that split.

## Range sliders

The 44px phone and coarse-pointer range target is the standing standard for every new demonstration. Do not reinvent a thin `appearance: none` track.

A new demonstration must:

- load the shared theme, [`assets/stats-demo-theme.css`](assets/stats-demo-theme.css) or [`assets/neuroscience-demo-theme.css`](assets/neuroscience-demo-theme.css)
- keep `class="demo-page"` on `body`
- leave the shared rule alone: under `(max-width: 768px), (pointer: coarse)`, `body.demo-page input[type="range"]` is a 44px hit box (an 8px track and a 28px thumb)

Page-specific thumb colors are fine. Do not override that hit box back to a thin track.

## Catalog

Demo cards live in [`demos.json`](demos.json). Concept maps live in [`families.json`](families.json). Guided Tracks live in [`tracks.json`](tracks.json). The README lists the fields. Before you open a pull request, run:

```bash
python3 scripts/check_catalog.py
```

When a change is something a syllabus should record, bump `version` and `updated` in [`assets/site-meta.js`](assets/site-meta.js), repeat that version and date in `index.html`, `cite.html`, and `license.html`, set the same version and `date-released` in [`CITATION.cff`](CITATION.cff), and add an entry to [CHANGELOG.md](CHANGELOG.md).

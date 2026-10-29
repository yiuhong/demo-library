# Contributing

Thank you for helping the Teaching Materials Library.

## Bugs

Report a bug or a teaching error on [GitHub Issues](https://github.com/yiuhong/demo-library/issues). Name the demo page, what you expected, and what happened.

## Ideas

GitHub Discussions are not enabled for this repository. Suggest an idea on [GitHub Issues](https://github.com/yiuhong/demo-library/issues). Start the title with "Idea:".

## Pull requests

Pull requests are welcome. Opening a pull request is not a guarantee of merge.

Small corrections — a wrong label, a broken link, a clearer sentence — are the easiest to review. Keep teaching text, explanations, and figures under CC BY 4.0, and source code under MIT, as [LICENSE](LICENSE) and [LICENSE-CODE](LICENSE-CODE) describe. The Hyperspace template by HTML5 UP stays CC BY 3.0. [license.html](license.html) lists that split.

## Catalog

Demo cards live in [`demos.json`](demos.json). Guided Tracks live in [`tracks.json`](tracks.json). The README lists the fields. Before you open a pull request, run:

```bash
python3 scripts/check_catalog.py
```

When a change is something a syllabus should record, bump `version` and `updated` in [`assets/site-meta.js`](assets/site-meta.js), repeat that version and date in `index.html`, `cite.html`, and `license.html`, set the same version and `date-released` in [`CITATION.cff`](CITATION.cff), and add an entry to [CHANGELOG.md](CHANGELOG.md).

# Teaching Materials Library

A collection of interactive demonstrations and teaching materials designed for exploring concepts in psychology, neuroscience, and statistics. 

**🌟 [View the Live Library Here](https://yiuhong.github.io/demo-library/)**

## Cite, license, and contact

Teaching text, explanations, and figures are [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Source code is [MIT](LICENSE-CODE). [LICENSE](LICENSE) states the split: prose and figures in a page are CC BY 4.0, and the code in that page is MIT. The Hyperspace template by HTML5 UP remains [CC BY 3.0](https://html5up.net/license). The same three-way split is on [license.html](license.html).

Cite and reuse the library (APA 7, BibTeX, license, and a credit line): [cite.html](https://yiuhong.github.io/demo-library/cite.html).

A machine-readable citation is [`CITATION.cff`](CITATION.cff) (Citation File Format 1.2.0). It matches the preferred citation on the cite page: this teaching library, Yiu Hong Ko, the ORCID iD, this version, and the library URL. The file records the work as CC BY 4.0 and notes that source code is MIT.

Yiu Hong Ko · [ORCID 0000-0003-4436-0166](https://orcid.org/0000-0003-4436-0166) · [yiuhong.ko@gmail.com](mailto:yiuhong.ko@gmail.com) · [yiuhong.github.io](https://yiuhong.github.io/)

Mistakes, bugs, and ideas: [GitHub Issues](https://github.com/yiuhong/demo-library/issues). Notes for contributors: [CONTRIBUTING.md](CONTRIBUTING.md). What changed: [CHANGELOG.md](CHANGELOG.md).

Version and last-updated date live in [`assets/site-meta.js`](assets/site-meta.js). The current release is **0.1.2** (29 October 2026). Version 0.1.0 was the first versioned release. Bump `version` and `updated` there when the library changes in a way a syllabus should record, set the same version and `date-released` in [`CITATION.cff`](CITATION.cff), and add a changelog entry. The footer and cite page read that file. `index.html`, `cite.html`, and `license.html` repeat the same version and date for visitors without JavaScript; update that fallback when you bump `site-meta.js`.

## 📂 Repository Structure

Demo pages live in subject folders. The library page does not hard-code the catalog cards.

* `📁 /cognitive_psychology`
* `📁 /neuroscience`
* `📁 /statistics`
* `📁 /personality_psychology`
* [`demos.json`](demos.json) — catalog inventory for Cards and List
* [`tracks.json`](tracks.json) — Guided Tracks playlists only (order, notes, formulae, images)
* [`scripts/check_catalog.py`](scripts/check_catalog.py) — checks catalog and track paths, required titles, and site chrome
* [`CITATION.cff`](CITATION.cff) — machine-readable citation (Citation File Format 1.2.0)
* [`license.html`](license.html) — which license covers content, code, and the Hyperspace template

`demos.json` is the list of demos: titles, blurbs, links, search keywords, tags, and category order. `tracks.json` is playlists. Teaching notes stay in `tracks.json`; do not copy them into `demos.json`.

### demos.json

The library page fetches [`demos.json`](demos.json) and builds the Cards and List views. Shape:

```json
{
  "categories": [
    {
      "id": "statistics",
      "title": "Statistics",
      "domId": "stats-category",
      "panel": "style3",
      "subcategories": [
        {
          "title": "Descriptive Statistics",
          "demos": [
            {
              "href": "statistics/example_demo.html",
              "title": "Short title",
              "description": "One sentence on the card.",
              "keywords": "Extra search words",
              "tags": ["Explorer"]
            }
          ]
        }
      ]
    }
  ]
}
```

Each category has:

* `id` — chip value (`cognitive`, `neuroscience`, `statistics`, `personality`)
* `title` — category heading and chip label
* `panel` — page band: `style2`, `style3`, or `style1`. Categories that share a panel render in the same section. Cognitive psychology and neuroscience share `style2`; statistics is `style3`; personality psychology is `style1`.
* `domId` — optional element id. Current anchors: `cognitive-category`, `neuro-category`, `stats-category`, `personality-category`.
* `subcategories` — ordered groups

Each subcategory has `title`, `demos`, and an optional `group`. Subcategories with the same `group` render under one topic heading (this is how Inferential Statistics nests Distributions & sampling, t-tests & related, ANOVA, and Power, correlation & explained variance). Omit `group` for a normal subcategory.

Each demo has:

* `href` — path from the site root, such as `statistics/central_limit_theorem.html`
* `title`
* `description` — card blurb. Write characters directly (`&`, not `&amp;`). Bare inline tags `sub`, `sup`, `em`, `strong`, `i`, `b`, and `br` are rendered (for example `SS<sub>Subjects</sub>`). Any other markup is shown as text.
* `keywords` — extra search text, the old `data-keywords` value
* `tags` — labels such as `"Explorer"`, `"Simulation"`, or `"Walkthrough"`. A draft badge is `{ "label": "Draft", "draft": true }`.

### How to add a demo

1. Add the demo HTML file in the subject folder.
2. In that file, link the site-chrome stylesheet and load the two scripts below (paths are `../assets/` from a subject folder). The strip is the author, ORCID, license, cite, issues, source, and version line. When the page is listed in `demos.json`, the strip can also copy a short citation for that demo. Do not add an "All rights reserved" notice.

```html
<link rel="stylesheet" href="../assets/site-oer-footer.css">
<script src="../assets/site-meta.js"></script>
<script src="../assets/site-oer-footer.js"></script>
```

3. Append one object to that subcategory's `demos` array in `demos.json`.
4. Optionally add a step in `tracks.json` if it belongs on a playlist.

You do not edit card markup in `index.html`. A new category is a new object in `categories`; its chip is built from `id` and `title`.

## Guided tracks

Tracks are optional playlists, not filters. On the library page, **View** is Cards, List, or Tracks. Tracks uses the same page and the same menu as the catalog. The Tracks view reads [`tracks.json`](tracks.json) at the repo root and renders whatever is in that file. Adding, removing, or reordering materials later means editing `tracks.json`. Teaching notes, formulae, and images stay on the step, not in `demos.json`.

Share a track from the library view: `index.html?view=tracks&track=the-id` (or `#track-the-id`). `tracks.html?track=the-id` still opens that same view.

`tracks.json` is either a top-level array or an object `{ "tracks": [ ... ] }` (the file in this repo uses the object). Each track has:

* `id` — slug used in shareable links (`index.html?view=tracks&track=the-id` or `#track-the-id`)
* `title`
* `summary` — short overview of the path
* `status` — optional, `draft` or `ready`. Omitted means draft. Draft tracks show a draft badge.
* `steps` — ordered list. Each step has `href` (path from the site root, the same kind of path as a demo card, such as `statistics/central_limit_theorem.html`), `title` (short label; it can match the card title), and an optional `note`.

Optional fields on a step, rendered when present:

* `formulae` — array of plain-text formula strings, shown under the note. They are inserted as text, not as HTML.
* `image` — relative path from the site root, such as `tracks/images/describing-data/01-mean-median-mode.png`.
* `imageAlt` — text alternative. Required when `image` is set. If the alt text is missing, or the path is not a relative image path, the image is left out.

An image path has to stay relative: no URL scheme and no `..`. Steps that omit these fields render as before.

A step is still listed if its `href` has no matching card yet, so a playlist can name a demo before that card is in `demos.json`. The HTML file named by the `href` still has to be in the repo.

### How to add a demo to a track

1. Add the demo in `demos.json` if it should appear in Cards and List. A playlist can still name an `href` before that card exists. The HTML file named by the `href` has to be in the repo.
2. Open `tracks.json` and insert a step object in that track's `steps` array, at the point in the teaching order where it belongs:

```json
{
  "href": "statistics/example_demo.html",
  "title": "Short label",
  "note": "One sentence on why this step comes next."
}
```

To reorder, move the step object. You do not need to edit the library page to change a playlist.

### Check catalog and track links

[`scripts/check_catalog.py`](scripts/check_catalog.py) checks `demos.json` and `tracks.json`. Every demo and every track step needs a non-empty `title`. Every demo `href` and every step `href` needs to be a file in the repo, as a path from the site root (for example `statistics/central_limit_theorem.html`). When a step sets `image`, that path needs to be a file in the repo too.

Run it from any directory:

```bash
python3 scripts/check_catalog.py
```

The command exits 0 when those titles and paths are in place, and when the license files and site chrome are in place. Otherwise it prints each problem and exits with an error. GitHub Actions runs the same check on pull requests and on pushes to `main`.

The chrome check requires `LICENSE` (CC BY 4.0 for content, with the MIT split stated) and `LICENSE-CODE` (MIT for code). Every demo in `demos.json` must include `assets/site-meta.js`, `assets/site-oer-footer.js`, and `assets/site-oer-footer.css`. `index.html`, `cite.html`, and `license.html` must show the same version and date as `assets/site-meta.js`, and no public page may say "All rights reserved". It also checks the cite page sections, the ORCID link, the per-demo example title against `demos.json`, `CITATION.cff` against the current version, the dual-license wording, the accessibility note, and that `CHANGELOG.md` names the current version.

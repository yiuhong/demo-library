# Project Viz

A visualization demo library for teaching. Interactive demonstrations for exploring concepts in psychology, neuroscience, and statistics.

**🌟 [View Project Viz](https://yiuhong.github.io/demo-library/)**

## Cite, license, and contact

Teaching text, explanations, and figures are [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Source code is [MIT](LICENSE-CODE). [LICENSE](LICENSE) states the split: prose and figures in a page are CC BY 4.0, and the code in that page is MIT. The same split is on [license.html](license.html).

Cite and reuse the library (APA 7, BibTeX, license, and a credit line): [cite.html](https://yiuhong.github.io/demo-library/cite.html).

A machine-readable citation is [`CITATION.cff`](CITATION.cff) (Citation File Format 1.2.0). It matches the preferred citation on the cite page: this teaching library, Yiu Hong Ko, the ORCID iD, this version, and the library URL. The file records the work as CC BY 4.0 and notes that source code is MIT.

Yiu Hong Ko · [ORCID 0000-0003-4436-0166](https://orcid.org/0000-0003-4436-0166) · [yiuhong.ko@gmail.com](mailto:yiuhong.ko@gmail.com) · [yiuhong.github.io](https://yiuhong.github.io/)

Mistakes, bugs, and ideas: [GitHub Issues](https://github.com/yiuhong/demo-library/issues). Notes for contributors: [CONTRIBUTING.md](CONTRIBUTING.md). What changed: [CHANGELOG.md](CHANGELOG.md).

Version and last-updated date live in [`assets/site-meta.js`](assets/site-meta.js). The current release is **0.1.4** (1 November 2026). Version 0.1.0 was the first versioned release. Bump `version` and `updated` there when the library changes in a way a syllabus should record, set the same version and `date-released` in [`CITATION.cff`](CITATION.cff), and add a changelog entry. The footer and cite page read that file. `index.html`, `catalog.html`, `tracks.html`, `cite.html`, and `license.html` repeat the same version and date for visitors without JavaScript; update that fallback when you bump `site-meta.js`.

## 📂 Repository Structure

Demo pages live in subject folders. The library page does not hard-code the catalog cards.

The home page (`index.html`) is the front page: the wordmark, two buttons (the catalog and Guided Tracks), and a featured plate that cycles three demonstrations. It uses the same top bar as the catalog and Guided Tracks (Home, Catalog, Guided Tracks, About Yiu Hong). Cite & reuse ([`cite.html`](cite.html)) and Licenses ([`license.html`](license.html)) use that same bar. Those two links stay in the colophon and the footer. Home is not the two-pane shell. The catalog ([`catalog.html`](catalog.html)) and Guided Tracks ([`tracks.html`](tracks.html)) share one shell: a top bar (Home, Catalog, Guided Tracks, About Yiu Hong), a left rail, and a demo pane on the same row. The catalog rail is the category list. The pane is a card grid for the focused category, and the first category is focused when you arrive. Choosing a card loads that demonstration: the rail becomes that category’s demo list, and Back to browse restores the grid. Switching category swaps the grid. Guided Tracks opens on the list of tracks in the rail. Choosing a track replaces that list with the playlist: each step is a demonstration link, and when the step has a note, formulae, or figure, its `connectionTitle` sits immediately before the demonstration and opens that material in the pane. Back, at the top of the rail, returns to the track list. Previous and Next, on the pane bar beside Fullscreen, step through that track in the same order. Previous is unavailable on the first page and Next is unavailable on the last. Choosing a demonstration or a connection loads it in the pane. Fullscreen hides the rail and lets the pane fill the shell; it does not ask the browser to go fullscreen. Demonstrations do not add a second Fullscreen button. On a phone, Catalog shows the categories, then the demonstrations in the chosen category, then the demonstration. Back from the demonstration returns to that category. Back from the category returns to the category list. Guided Tracks shows the track list, then that track’s steps, then the demonstration. Back from the demonstration returns to that track. Back from the track returns to the track list. `catalog.html?demo=statistics/variance_explained.html` and `tracks.html?demo=statistics/variance_explained.html` open that demonstration directly. `tracks.html?track=center-and-spread&demo=tracks/connection.html&step=0` opens that connection. Opening a demonstration or connection file on its own still shows Return to Project Viz. Inside the shell that link is omitted.

Home, Catalog, and Guided Tracks wear a notebook sheet: class `viz-notebook` on `<html>`, drawn by [`assets/notebook.css`](assets/notebook.css). The page chrome is white graph paper, with a thin margin line on the left and a quiet ruler under the top bar. Cite & reuse and Licenses stay plain. A featured plate keeps its own canvas, including the dark neuroscience plate. While a neuroscience demonstration is open, the pane uses a cool gray bar over a dark stage. The demonstration stays in the iframe, which this sheet does not enter. Remove `viz-notebook` from those three pages to ship the plain shell. `?notebook=0` hides the sheet for one visit, and `?notebook=1` shows it.

Featured plates are the three `href`s in `index.html` (`FIG_VE`, `FIG_R`, `FIG_ERP`); titles and sentences come from `demos.json`. Those figure labels are only on the home plate. Concept maps are a separate list, in [`families.json`](families.json): each node is a catalog `href`, and the title is read from `demos.json`. Opening a demonstration is stored in this browser (`localStorage` key `project-viz-opened`). Guided Tracks paint a playlist box black when that demo is in the list. The home featured plate can show Opened from the same list. The catalog does not.

* `📁 /cognitive_psychology`
* `📁 /neuroscience`
* `📁 /statistics`
* `📁 /personality_psychology`
* [`demos.json`](demos.json) — catalog inventory for List
* [`families.json`](families.json) — concept maps. Titles stay in `demos.json`
* [`tracks.json`](tracks.json) — Guided Tracks playlists only (order, notes, formulae, images)
* [`scripts/check_catalog.py`](scripts/check_catalog.py) — checks catalog and track paths, required titles, and site chrome
* [`CITATION.cff`](CITATION.cff) — machine-readable citation (Citation File Format 1.2.0)
* [`license.html`](license.html) — which license covers content and code

`demos.json` is the list of demos: titles, blurbs, links, search keywords, tags, and category order. `tracks.json` is playlists. Teaching notes stay in `tracks.json`; do not copy them into `demos.json`.

### demos.json

The catalog page fetches [`demos.json`](demos.json) and builds the category rail and the card grid. Shape:

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
          "title": "Center and spread",
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

Each subcategory has `title`, `demos`, and an optional `group`. Subcategories with the same `group` render under one topic heading. Omit `group` for a normal subcategory. Statistics topics are flat headings with the same names as the Guided Tracks: Center and spread, Shape and pictures, Same summaries, different graphs, From process to distribution, Counts, arrivals, and the board, Sampling distributions and intervals, t-test, Statistical power, ANOVA, and Association.

Each demo has:

* `href` — path from the site root, such as `statistics/central_limit_theorem.html`
* `title`
* `description` — card blurb. Write characters directly (`&`, not `&amp;`). Bare inline tags `sub`, `sup`, `em`, `strong`, `i`, `b`, and `br` are rendered (for example `SS<sub>Subjects</sub>`). Any other markup is shown as text.
* `keywords` — extra search text, the old `data-keywords` value
* `tags` — labels such as `"Explorer"`, `"Simulation"`, or `"Walkthrough"`. A draft badge is `{ "label": "Draft", "draft": true }`.

### How to add a demo

1. Add the demo HTML file in the subject folder.
2. In that file, link the site-chrome stylesheet and load the two scripts below (paths are `../assets/` from a subject folder). The strip is **Cite this demo** (when the page is listed in `demos.json`; it opens that demo’s citation in a new tab) and the author’s site, also in a new tab. License, site-wide cite, and source links stay on the library footer. Do not add an "All rights reserved" notice.

```html
<link rel="stylesheet" href="../assets/site-oer-footer.css">
<script src="../assets/site-meta.js"></script>
<script src="../assets/site-oer-footer.js"></script>
```

3. Append one object to that subcategory's `demos` array in `demos.json`.
4. Optionally add a step in `tracks.json` if it belongs on a playlist.

You do not edit card markup by hand. A new category is a new object in `categories`; its rail row is built from `id` and `title`. The catalog page renders it. The first category in that list is the one focused when the catalog opens.

## Guided tracks

Tracks are optional playlists, not filters. Guided Tracks is its own page. It reads [`tracks.json`](tracks.json) at the repo root and renders whatever is in that file. Adding, removing, or reordering materials later means editing `tracks.json`. Teaching notes, formulae, and images stay on the step, not in `demos.json`. The page opens on the track list. Choosing a track shows that playlist alone in the rail, with Back at the top to return to the list. When a step has a note, formulae, or figure, the rail lists that step's `connectionTitle` immediately before the demonstration. The title is the button label and the heading on [`tracks/connection.html`](tracks/connection.html), which reads the same step from `tracks.json`. `step=` stays the zero-based index of that step. The rail does not paste the note, the formulae, or the figure between demonstrations, and the connection page does not list the other demonstrations again. Family concept maps stay in `families.json` and are not listed on this page. The track list shows each playlist title and its step count. Inside a track, the rail shows that title and the steps. It does not show a concept-map strip, a "Concept maps" heading, a "Concept map" kicker, the backbone sentence, or the playlist summary.

`tracks.html` with no track is the list. Share a track: `tracks.html?track=the-id` (or `#track-the-id`). Add `demo=` with a demonstration path to open that step in the shell. Back from that step returns to the playlist, and Back from the playlist returns to the list. Add `demo=tracks/connection.html` and `step=` (the zero-based index of that step) to open the page that introduces that demonstration. Older links `index.html?view=tracks&track=the-id` still open that page.

`tracks.json` is either a top-level array or an object `{ "tracks": [ ... ] }` (the file in this repo uses the object). Each track has:

* `id` — slug used in shareable links (`tracks.html?track=the-id` or `#track-the-id`)
* `title` — the playlist heading in the rail
* `summary` — short overview of the path, kept in the file. The rail does not show this paragraph.
* `steps` — ordered list. Each step has `href` (path from the site root, the same kind of path as a demo card, such as `statistics/central_limit_theorem.html`), `title` (short label; it can match the card title), and an optional `note`.

Optional fields on a step. When a note, formulae, or image is set, the step also needs `connectionTitle`, and the connection page renders the note, formulae, and figure that are present:

* `connectionTitle` — a few words to one short phrase that introduces the upcoming demonstration. It is taken from the note. It is the rail button label and the heading on the connection page. Do not use the word Connection as that label.
* `formulae` — array of plain-text formula strings. They are inserted as text, not as HTML.
* `image` — relative path from the site root, such as `tracks/images/describing-data/01-mean-median-mode.png`.
* `imageAlt` — text alternative. Required when `image` is set. If the alt text is missing, or the path is not a relative image path, the image is left out.

An image path has to stay relative: no URL scheme and no `..`. A step with only `href` and `title` stays a demonstration link, with no title before it. The figures stay the black-and-white preview images already in `tracks/images/`. Do not copy the note into a new HTML file; `tracks/connection.html` reads `tracks.json`. A neuroscience demonstration uses the dark demo chrome on that connection page. Other demonstrations use the light statistics chrome.

A step is still listed if its `href` has no matching card yet, so a playlist can name a demo before that card is in `demos.json`. The HTML file named by the `href` still has to be in the repo.

### How to add a demo to a track

1. Add the demo in `demos.json` if it should appear in List. A playlist can still name an `href` before that row exists. The HTML file named by the `href` has to be in the repo.
2. Open `tracks.json` and insert a step object in that track's `steps` array, at the point in the teaching order where it belongs:

```json
{
  "href": "statistics/example_demo.html",
  "title": "Short label",
  "connectionTitle": "Why this step is next",
  "note": "One sentence on why this step comes next."
}
```

To reorder, move the step object. You do not need to edit the library page to change a playlist.

## Concept maps

A concept map is a short strip of related demonstrations in teaching order. It is not a playlist and not a graph. Edit [`families.json`](families.json). The library page does not store the demo titles; it reads them from `demos.json`.

```json
{
  "id": "variance",
  "title": "Variance",
  "backbone": "One sentence naming the shared idea.",
  "show": ["hub"],
  "nodes": [
    { "href": "statistics/moments_as_averages.html", "relation": "before" },
    { "href": "statistics/bessels_correction_simulation.html", "relation": "backbone" }
  ]
}
```

* `id` — lowercase slug
* `title` — the name of the family, not a demo title
* `backbone` — one sentence for the idea the demos share. The Guided Tracks rail does not show this sentence.
* `show` — `hub` keeps the family on record. Guided Tracks does not draw these strips. The catalog does not draw them. The home page does not draw them.
* `nodes` — catalog `href`s in teaching order. `relation` is `before`, `backbone`, or `after`. Order is before, then backbone, then after. Do not add a `title`. A map needs a backbone demo and at least one before or after demo.

A node opens in this tab. A box is black only when that demonstration is in the browser's opened list. The map does not show an Opened label. The center (backbone) demo is not filled black on its own.

## Check catalog and track links

[`scripts/check_catalog.py`](scripts/check_catalog.py) checks `demos.json`, `tracks.json`, and `families.json`. Every demo and every track step needs a non-empty `title`. Every demo `href` and every step `href` needs to be a file in the repo, as a path from the site root (for example `statistics/central_limit_theorem.html`). When a step sets `image`, that path needs to be a file in the repo too. Every concept-map node needs a catalog `href` and a `before`, `backbone`, or `after` relation, with no title of its own. `show` may include `hub`. Guided Tracks does not draw the strips.

Run it from any directory:

```bash
python3 scripts/check_catalog.py
```

The command exits 0 when those titles and paths are in place, and when the license files and site chrome are in place. Otherwise it prints each problem and exits with an error. GitHub Actions runs the same check on pull requests and on pushes to `main`.

The chrome check requires `LICENSE` (CC BY 4.0 for content, with the MIT split stated) and `LICENSE-CODE` (MIT for code). Every demo in `demos.json` must include `assets/site-meta.js`, `assets/site-oer-footer.js`, and `assets/site-oer-footer.css`. `index.html`, `catalog.html`, `tracks.html`, `cite.html`, and `license.html` must show the same version and date as `assets/site-meta.js`, and no public page may say "All rights reserved". It also checks the cite page sections, the ORCID link, the per-demo example title against `demos.json`, `CITATION.cff` against the current version, the dual-license wording, the accessibility note, and that `CHANGELOG.md` names the current version.

# Teaching Materials Library

A collection of interactive demonstrations and teaching materials designed for exploring concepts in psychology, neuroscience, and statistics. 

**🌟 [View the Live Library Here](https://yiuhong.github.io/demo-library/)**

## 📂 Repository Structure

Demo pages live in subject folders. The library page does not hard-code the catalog cards.

* `📁 /cognitive_psychology`
* `📁 /neuroscience`
* `📁 /statistics`
* `📁 /personality_psychology`
* [`demos.json`](demos.json) — catalog inventory for Cards and List
* [`tracks.json`](tracks.json) — Guided Tracks playlists only (order, notes, formulae, images)

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
2. Append one object to that subcategory's `demos` array in `demos.json`.
3. Optionally add a step in `tracks.json` if it belongs on a playlist.

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

A step is still listed if its `href` has no matching card yet, so a playlist can name a demo before that page exists.

### How to add a demo to a track

1. Add the demo in `demos.json` if it should appear in Cards and List. A playlist can still name an `href` before that page exists.
2. Open `tracks.json` and insert a step object in that track's `steps` array, at the point in the teaching order where it belongs:

```json
{
  "href": "statistics/example_demo.html",
  "title": "Short label",
  "note": "One sentence on why this step comes next."
}
```

To reorder, move the step object. You do not need to edit the library page to change a playlist.

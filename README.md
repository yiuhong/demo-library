# Teaching Materials Library

A collection of interactive demonstrations and teaching materials designed for exploring concepts in psychology, neuroscience, and statistics. 

**🌟 [View the Live Library Here](https://yiuhong.github.io/demo-library/)**

## 📂 Repository Structure

The source code for the interactive demos is organized by subject area:

* `📁 /cognitive_psychology`
* `📁 /neuroscience`
* `📁 /statistics`
* `📁 /personality_psychology`

## Guided tracks

Tracks are optional playlists, not filters. The index stays the full catalog. [`tracks.html`](tracks.html) reads [`tracks.json`](tracks.json) at the repo root and renders whatever is in that file. Adding, removing, or reordering materials later means editing `tracks.json` only. `tracks.html` reads that file and stays as it is.

`tracks.json` is either a top-level array or an object `{ "tracks": [ ... ] }` (the file in this repo uses the object). Each track has:

* `id` — slug used in shareable links (`tracks.html?track=the-id` or `tracks.html#track-the-id`)
* `title`
* `summary` — one or two sentences
* `status` — optional, `draft` or `ready`. Omitted means draft. Draft tracks show a draft badge.
* `steps` — ordered list. Each step has `href` (path from the site root, the same kind of path as a demo card, such as `statistics/central_limit_theorem.html`), `title` (short label; it can match the card title), and an optional `note` (one short sentence of guidance between steps).

A step is still listed if its `href` has no matching card yet, so a playlist can name a demo before that page exists.

### How to add a demo to a track

1. Add the demo card on `index.html`, the same way as the other cards.
2. Open `tracks.json` and insert a step object in that track's `steps` array, at the point in the teaching order where it belongs:

```json
{
  "href": "statistics/example_demo.html",
  "title": "Short label",
  "note": "One sentence on why this step comes next."
}
```

To reorder, move the step object. Leave `tracks.html` as it is.

# Courses

Every course in the game is a real one. Its hole lines, greens, fairways, tees, bunkers, water, woods,
single trees, paths, streets and buildings come from OpenStreetMap. The game then draws them in its own style.

## Adding a course

```
python3 tools/add_course.py "Lions Municipal Golf Course, Austin" lm
./build.sh
```

That writes `data/lm.json` and a check drawing, `data/lm.preview.png`, and prints an entry to paste into
`COURSES` in `src/20-course.js`. In that entry you set what a map cannot know:

- the name, par, scorecard yardage and handicap of each hole
- `th`, the look of the place: what lies beyond the rough (`out`), ground colours, the mix of native trees
  that fills the woods (`mix`), whether tree belts line the holes (`belt`), and whether ordinary houses are drawn (`houses`)

The daily round draws from every course automatically, and the menu gains a practice button for the new one.

## When the map is incomplete

Some courses have their greens and bunkers mapped but no numbered hole lines. The tool then writes
`data/<id>.trace.jpg`, an aerial photo with a yard grid and the mapped features outlined. Trace each hole
on it as a few points (tee, bends, green) into `data/<id>.extra.json`, add the scorecard yardages, and run the
tool again. `data/gr.extra.json` is a worked example: Grey Rock's nine hole lines were traced this way and
checked against the card.

Features missing from the map can be fixed at the source by editing OpenStreetMap, which improves the game
and the map together. Re-run with `--refresh` to pick up changes.

## Files

- `tools/add_course.py` does the whole job. `tools/import_course.py` is the converter it uses.
- `tools/aerial.py` stitches map or aerial tiles; `tools/trace_overlay.py` draws the tracing sheet.
- `data/<id>.json` is the course as the game reads it. `data/<id>.extra.json` holds anything added by hand.
- `data/cache/` holds downloads and is not committed.

## Credit and licence

Course data is © OpenStreetMap contributors and is used under the Open Database Licence. The game shows that
credit on its How to play sheet. The files in `data/` are derived from OpenStreetMap and stay under the same
licence if you share them. Aerial photos are used only to look at while tracing. The USGS imagery the tool
fetches is public domain.

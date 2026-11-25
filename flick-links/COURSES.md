# Courses

Every course in the game is a real one. Its hole lines, greens, fairways, tees, bunkers, water, woods,
single trees, paths, streets and buildings come from OpenStreetMap. The game then draws them in its own style.

Before starting, read `COURSE_LESSONS.md`: what went wrong on earlier courses, how each one is kept distinctive, and the
checklist for calling a course done.

## Adding a course

```
python3 tools/add_course.py "Lions Municipal Golf Course, Austin" lm
./build.sh
```

That writes `data/lm.json` and a check drawing, `data/lm.preview.png`, and prints an entry to paste into
`COURSES` in `src/20-course.js`. In that entry you set what a map cannot know:

- the name of each hole, and its par, scorecard yardage and handicap where the map does not carry them
  (many courses have them on the hole lines; the tool then fills them in and sets each tee back to match)
- `th`, the look of the place: what lies beyond the rough (`out`), ground colours, the mix of native trees
  that fills the woods (`mix`), whether tree belts line the holes (`belt`), and whether ordinary houses are drawn (`houses`)

The daily round draws from every course automatically, and the menu gains a practice button for the new one.

A course's second nine is imported separately, as `<id>2`, and its holes go under `more` in the same entry:

```
python3 tools/add_course.py "Jimmy Clay Golf Course, Austin" jc2 --holes 10-18
```

The menu then offers Front, Back and 18 for that course. (Where the back nine was added first, as at Muni, the entry has
`first:10` and `more` holds holes 1 to 9.)

Then check it:

```
./build.sh && node tools/check_course.js lm f     # and again with b for a back nine
```

That times each hole's build, saves a picture of every hole and its first aiming view, fires a tee shot down each
hole to catch a tree in the way, and has a bot play all nine. Look at the pictures: some faults only show to the eye.

Two courses on one property (Jimmy Clay and Roy Kizer, say) each have a hole 1. The tool keeps the holes that lie
inside the course you named, so use the course's name as OpenStreetMap shows it.

## When the map is incomplete

Some courses have their greens and bunkers mapped but no numbered hole lines. The tool then writes
`data/<id>.trace.jpg`, an aerial photo with a yard grid and the mapped features outlined. Trace each hole
on it as a few points (tee, bends, green) into `data/<id>.extra.json`, add the scorecard yardages, and run the
tool again. `data/gr.extra.json` is a worked example: Grey Rock's nine hole lines were traced this way and
checked against the card.

Features missing from the map can be fixed at the source by editing OpenStreetMap, which improves the game
and the map together. Re-run with `--refresh` to pick up changes.

## Files

- `tools/check_course.js` checks a course in the built game.
- `tools/add_course.py` does the whole job. `tools/import_course.py` is the converter it uses.
- `tools/aerial.py` stitches map or aerial tiles; `tools/trace_overlay.py` draws the tracing sheet.
- `data/<id>.json` is the course as the game reads it. `data/<id>.extra.json` holds anything added by hand.
- `data/cache/` holds downloads and is not committed.

## Credit and licence

Course data is © OpenStreetMap contributors and is used under the Open Database Licence. The game shows that
credit on its How to play sheet. The files in `data/` are derived from OpenStreetMap and stay under the same
licence if you share them. Aerial photos are used only to look at while tracing. The USGS imagery the tool
fetches is public domain.

## Where a new course goes

Add it at the end of `COURSES` in `src/20-course.js`, and add its id and hole count to `SIZE` in `server/core.js`.
Never insert one in the middle: saved rounds keep hole indexes, and the day's course is taken in turn from the list.
See `COURSE_LESSONS.md` for the look settings added for the sea (`sea`), sand colour (`sand`), flower beds (`blooms`),
treeless ground (`clumps:0`) and salt water (`wet:false`).

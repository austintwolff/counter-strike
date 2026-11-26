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

## Fantasy courses: holes that do not exist, on ground that does

Bright Angel (the Grand Canyon) and Twenty Lakes (the Sierra Nevada) were laid out by hand on real terrain. The ground, water,
cliffs, snow, trails and plants are real; only the tees, fairways, greens and bunkers are invented.

1. **Fetch the ground.** `python3 tools/terrain.py fetch <id> <south> <west> <north> <east>` downloads elevation (AWS terrain
   tiles; USGS 3DEP in the US), aerial photography (USGS National Map, public domain) and the OpenStreetMap extract, and puts
   elevation and photograph on one grid of 3-yard cells: yards east (x) and south (y) of the box's centre. The session needs
   `s3.amazonaws.com`, `basemap.nationalmap.gov` and `api.openstreetmap.org`. Needs numpy, scipy, contourpy, shapely, Pillow.
2. **Look at it.** `python3 tools/fantasy.py view <id> out.jpg [x0 y0 x1 y1] --slope` draws the photograph with the map's water and
   trails, a yard grid, and the steep ground tinted (red: too steep to play). Find the flat ground first; route the holes over it.
3. **Write the design**, `data/<id>.design.json` (one file a nine; the second nine is `<id>2`):
   `{"id", "terrain", "look": "canyon" or "alpine", "pad": 235, "steep": 33, "gentle": 21, "holes": {"1": {"name", "par", "hcp",
   "line": [[x, y], ...], "green": [rx, ry, rot], "fw": [[from, to, half-width], ...], "bunkers": [[along, side, rx, ry, rot, "rel"]],
   ...}}, "props": [...], "snowline": feet}`. A hole is its line from tee to pin. Everything else has a default.
4. **Build and check the plan.** `python3 tools/fantasy.py build data/<id>.design.json` writes `data/<id>.json`, prints the card
   (with each hole's fall or climb in feet) and the `holes:[...]` line to paste into `COURSES`, and notes any tee or green that
   touches something it should not (below), and any hole whose fairway is mostly missing. Build until the notes are gone or
   explained (a forced carry over a river reads as a missing fairway). `python3 tools/fantasy.py plan <id> out.jpg [x0 y0 x1 y1 scale]`
   draws what was built on the painted ground with a grid, the ground too steep to mow in amber: move points, rebuild, look again.
   `python3 tools/fantasy.py room data/<id>.design.json <x> <y> [radius]` lists the nearest clear ground for a tee or a green
   and the widest clear pockets nearby, which is quicker than guessing.
5. **Add it to the game**: a `COURSES` entry (each hole has a fifth figure, the fall in feet), the id in `SIZE` in
   `server/core.js`, and in `WILD` in `src/50-ui.js` so it is listed under "Fantasy".
6. **Check it like any course**: `./build.sh && node tools/check_course.js <id> f` and `b`, and look at the pictures.
7. **Check the doglegs**: `node tools/check_doglegs.js <id>` drives every par 4 and 5 along the hole and then at the pin and at
   angles between, and flags a bend a drive can simply cut. Fix a flagged hole in the design: straighten it, or put the bend
   round water or a drop so the line across is a real carry. A carry only a perfect drive makes is shown as a gamble and allowed.

**Nothing mown may look pasted on.** The builder keeps fairways, greens and tees off ground steeper than `gentle` degrees
(21 in the canyon, 25 in the mountains), six yards back from any cliff edge, and off trails, buildings, creeks, dry washes,
snow and water. A fairway is cut where a trail or a creek crosses it. A bunker that would overlap any of those is nudged toward
the line, or left out and reported. Plants keep off trails, roofs and creeks; the game's flower beds keep off slopes, cliffs,
snow, trails and washes. A building the ground model puts on a cliff face is left out. So lay holes on ground that is really
flat enough: where the plan shows amber under a hole, the fairway will have a gap there.

What the builder makes from the terrain, and how the game uses it:

| From | The game gets | And does with it |
|---|---|---|
| Elevation | `relief`: the ground painted by height, slope and light | drawn under the hole in place of a flat floor |
| Slope over `steep` degrees | `void`: cliffs and crags | a hazard like water (drop, one stroke); shaded, with a hard edge |
| Level lines on steep faces | `ledges` | drawn as lit edges, so cliffs look layered |
| Elevation, coarse | `elev`: a grid of heights | the ball flies over it: much further off a drop (in full), a little shorter up a slope (a climb counts for 30%, `UPHILL` in `src/40-game.js`, or real headwalls would be unplayable). The preview and club choice follow. |
| Gradient at each green | `tilt` | the green breaks the way the real ground falls |
| The map | water with islands, creeks (dry washes where the map says), trails, buildings | as on any course |
| Creek gradient | `falls` | white water where the creek really drops |
| The photograph | `scatter`: trees and brush where they really grow; snow patches; in the mountains, the ground's own colours | plants are scenery (they do not stop a ball); snow plays like deep sand |
| The design's `props` | mule trains on named trails, rafts where a trail meets the river, tents, white water | small things that belong to the place |


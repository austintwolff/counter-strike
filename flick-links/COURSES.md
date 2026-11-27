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
Then rate it: `./build.sh && node tools/rate_courses.js <id>` plays every hole with the house pro (a computer player that never
mistimes a swing) and writes its average score on each into `RATING` in `server/core.js`. Handicaps are measured against
that, not par. Run it again after moving a tee or a green, and with no id after any change to how the ball flies or rolls.
Never insert one in the middle: saved rounds keep hole indexes, and the day's course is taken in turn from the list.
See `COURSE_LESSONS.md` for the look settings added for the sea (`sea`), sand colour (`sand`), flower beds (`blooms`),
treeless ground (`clumps:0`) and salt water (`wet:false`).

## Rules the game applies to every course's map

The map is real, but three things in it are tidied when a hole is built (`buildGeo` in `src/20-course.js`):

- **A green keeps five yards clear of water** (`GREEN_GAP`). Where the map draws one closer, that side of the green is drawn
  back toward its middle. A green almost ringed by water (an island green) keeps only its collar clear, so it is not
  shrunk to nothing.
- **No path runs onto a green.** One the map carries that far stops short of the collar.
- **A links played on foot has no cart paths** (`walk:true` in the theme; St Andrews). The map's greenkeepers' tracks are
  left out. Bridges stay, and so does a public way that crosses a fairway from side to side (Granny Clark's Wynd), which
  is drawn on top of the fairway.

## Birds

A course can have a bird of its own: `bird:'<kind>'` in its `th`. About one hole in four has one, and it crosses the wider
view once (a line of three, for pelicans). They are drawn in `src/35-birds.js`, each from above as two pictures, wings and body, so the
wings can beat. So far: `condor` (Grand Canyon), `hawk` (red-tailed: Texas, Georgia), `egret` (great egret: Florida, and
the Texas courses with water), `pelican` (brown: Monterey), `gannet` (Fife) and `nutcracker` (Clark's: the high Sierra).
A course with none gets a small distant flock. A new bird must be native to the place and must look right both large and
at its size in the game: in a `#dev` page, `__fl.birdArt(kind, 760)` returns its pictures for looking at.

## Fantasy courses: holes that do not exist, on ground that does

Bright Angel (the Grand Canyon), Twenty Lakes (the Sierra Nevada) and National Parks (eighteen parks: see the next section) were laid out by hand on real terrain. The ground, water,
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
the line, or left out and reported. A green is never trimmed to fit and never crowds an edge: the whole shape keeps six yards
of ground between it and water and ten from a cliff's edge, shrinking a little if it must, and the builder says when a green has
no room so it can be moved (`fantasy.py room` lists where one fits). Plants keep off trails, roofs and creeks; the game's flower beds keep off slopes, cliffs,
snow, trails and washes. One hole's ground is not another's: a tee on another hole's fairway or within 14 yards of its green
or in its line of play is reported (move it), a fairway stops short of any other hole's green, and a bunker that lands on another hole is left
out. After moving any green or tee, read the notes for the holes next to it too. A mule train keeps to a stretch of trail
clear of the holes, and every plant is checked against the true outlines, not only the three-yard grid. A building the ground model puts on a cliff face is left out. Cliff ledge lines are drawn on cliffs
only, steep patches under 1,350 square yards are plain ground rather than hazards, and a trail stub under 45 yards that stops
in the open is dropped: each of those read as a path that had been cut off. So lay holes on ground that is really
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

## A course in many places: National Parks

National Parks (`np`) is one course whose eighteen holes are in eighteen different parks, from Acadia to Kilauea. Each hole stands on its own piece of real ground, so each is built on its own:

- `data/np.design.json` lists the places and the box of ground fetched for each. `python3 tools/parks.py fetch` downloads
  any not yet in `data/cache/` (as `npNN`).
- `data/npNN.design.json` is that hole's design: an ordinary fantasy design with one hole in it, numbered as on the card.
  All the fantasy tools work on it (`fantasy.py view npNN`, `room data/npNN.design.json x y`, `plan npNN`).
- `python3 tools/parks.py build` builds all eighteen into `data/npNN.json` and writes the card (name, par, yards, stroke
  index, fall, park) into the course's entry in `src/20-course.js`, between `/*NP:BEGIN*/` and `/*NP:END*/`.
  `parks.py build 7` builds one.
- In the game the course has `sites:true`: hole N reads the map `npNN`, and a hole's own look is the `th` its design
  carries, laid over the course's. The start of each hole says where it is.
- **No haze round these holes.** Every other course shows a hole out to 94 yards from its line and fades it away by 165,
  because the neighbouring holes are not built. Here each hole has its own ground, so each design is built out to 380 yards
  (`"pad": 380`) and the course shows it to 290, gone by 350 (`fade` in the course's `th`). Beyond 235 yards half the
  plants are left out (`"thin": [235, 0.5]`), or a forest hole has six thousand trees to draw.
- Check it like any course (`check_course.js np f` and `b`, `check_doglegs.js np`, `rate_courses.js np`).
- **The ground is painted, never shown as a photograph.** `python3 tools/terrain.py photo npNN` (or `parks.py fetch`)
  fetches the same aerial photograph one zoom level closer, on a grid twice as fine as the terrain's
  (`data/cache/npNN.photo.npz`; the source has nothing closer). A design with `"fine": {...}` is painted from it at 1.5
  yards a cell, and `fine.paint` turns it into paint first: flat shapes of colour with their edges kept and none of the
  photograph's grain. Water is always the game's own painted water (`th.wat` for its colour), and a beach is the game's
  own sand. The first version left the photograph's detail and its water in the picture; magnified on a phone that is a
  blur, and with crisp painted turf on top it is two kinds of picture at once. Do not do it again.
  Three holes keep the older soft painting because their photographs are no good even for this: Sahale Arm (half in black
  shadow), Thor's Hammer and Ruby Beach (coarse squares from the photograph's compression). Angels Landing is painted by
  height (`"look": "canyon"`).

What a design can say that the two older fantasy courses never needed (all in `tools/fantasy.py`, all off unless asked for):

| Key | For |
|---|---|
| `"look": "photo"` | the photograph's own colours (the same as `alpine`), with `tone`, `keep`, `sat` and `wash` to correct them |
| `"wash": [r, g, b, amount]` | pulls the colours toward one of the place's own: for a photograph out of season or with a cast |
| `"keep": 0..1` | how much of the photograph's light and dark stays. Lifting deep shade to mid-tone turns it blue |
| `"strata": [[feet, [r, g, b]], ...]` | paints steep faces by height, in bands, over the photograph on the level ground (badlands, hoodoos, canyon walls) |
| `"relief_z"` | draws low relief larger (dunes, a salt pan) |
| `"sea": feet` | everything at or below this height is sea; `th.sea` then paints surf and a strand |
| `"land": [polygons]` | the land traced by hand, all else sea: for a low key the heights cannot find |
| `"pools": [...]`, `"only_water"`, `"skip_water"` | water the map lacks; waters kept or dropped by name |
| `"beaches": true` | the map's sand is beach: it plays as sand and nothing is mown on it |
| `"without": ["trails", "creeks", "buildings"]` | leaves the map's own out (a boardwalk the photograph already shows) |
| `"buildings": [polygons]` | roofs the map lacks or carries as one block (the walls of Fort Jefferson) |
| `"ground": "sand"` with `th.ground:'sand'` | whatever is not mown is sand (White Sands) |
| `"strew": [rules]` | what grows where, by rule; `"solid": true` makes single trees a ball cannot pass (the giant sequoias) |
| props `floe`, `logs` | ice adrift on Iceberg Lake; drift logs strewn along a tide line (Ruby Beach) |
| `"flat": feet` and `"stacks": [...]` | made ground, for a shore the survey is no use on: everything level at one height, and rock that stands up out of it (a sea stack, or an island with a level `top`), with cliff sides and heights to match. Stacks in the sea are land |
| `"woods": [polygons]`; `"woods": true` on a plant rule | forest said by hand (a ball in it is lost), and plants kept inside it |
| `"snow_yields": true` | the fairway is laid through late snow instead of stopping at it; the snow stays beside it (Sahale Arm) |
| `"level": true` on a hole | its line runs along a crest narrower than the heights can hold (the fin of Angels Landing, where the trail goes): the ground under its tee, fairways (`fw`) and green is taken as level; all to either side stays cliff |
| `"under": feet` | ground more than this far below the nearest point of a hole's line is cliff: on a mesa or a fin a ball that comes to rest a thousand feet down could never be got back up |
| `"depth": feet` | ground that far below the nearest high ground sinks into blue shadow, as on Bright Angel |
| `th.fade: [from, gone]` with a larger `pad` | the hole is seen wider than the usual 94 to 165 yards from its line. `pad` must be at least `gone + 30`. The whole National Parks course uses it |
| `"thin": [yards, share]` | beyond that far from the line only this share of the scattered plants is kept |
| `"fine": {...}` (after `terrain.py photo`) | paints from the sharper photograph, twice as fine. In it: `"paint": [cells, passes]` (use `[6, 2]`; `[4, 2]` with more `soft` where the flat squares show) turns the photograph into paint; `"soft"` and `"crisp"` smooth the result and draw its edges back; `"detail"`, `"over"`, `"floor"` say how much of the fine light and dark is kept (keep it at 0.5 or less) and how dark it may go; `"rock"` how much of it shows through `strata` |
| `fine.tints: [[r, g, b, from, to, amount], ...]` | ground whose brightness in the photograph lies in a range is pulled toward a colour: a forest photographed bare in winter made green (Acadia), dark ash made neutral and pale ash orange (Painted Dunes) |
| `fine.shadows: [below, lift, reach]` | what the photograph has in deep shadow takes its colour and most of its brightness from the sunlit ground within reach, and none of its detail (lifted that far it is only compression): a canyon at noon, the foot of a headwall, long tree shadows |
| `"crests": {...}` with `"flat"` | a dune field (White Sands). A photograph of white sand holds almost nothing but its crest lines; they are read off it, and each dune is built up again from its crest (a long slope from upwind, a short slip face beyond) and lit. Nothing is mown across a crest. Plants `"on": "flats"` grow only between the dunes |
| `"woods": false` on a plant rule | keeps a solid tree out of the lost-ball forest and off its edge, where it would knock a good shot down into it |
| props `fallen`, `boat`, `steam`, `glow` | a fallen giant sequoia beside the meadow; a sailboat at anchor (left out if not in water); steam drifting off a vent; a line of light, `"c": "lava"` for a fissure or `"fire"` for the Firefall down its cliff. `th.shoal` on a course pales big water toward its shores in bands |
| `th.detail: [texture, strength, yards a pixel, turn]` | a fine texture over the painted ground, stronger the closer the view (`ripple` for sand, `stone` for bare ground), where the painting is too smooth seen close; `th.clouds: false` leaves the cloud shadows off (they dirty white sand) |
| `"look": "canyon"` with its own `strata` and `ground` | the colours painted by height and steepness instead of taken from the photograph: for a gorge the photograph shows mostly as shadow |

A hole may be a par 6 or 7 (Angels Landing is a 7). The server takes pars 3 to 7; the day's three and a three-hole match
count anything over 5 as their long hole. The house pro (`tools/rate_courses.js`) plays a hole that turns hard along its
line rather than at the flag; `node tools/rate_courses.js --trace <id> <hole>` shows one play shot by shot (where each
ball was aimed, where the pro expected it and where it came to rest), which is the quickest way to find out why a hole
rates badly. The pro reckons without trees, so a ball it loses is not sent down the same line again from the same spot.
`check_doglegs.js` counts a ball that comes down in lost-ball woods as dead, like one in water.


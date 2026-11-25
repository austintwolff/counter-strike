# Building a course: lessons learned

Read this before adding or reworking a course. It is the record of what went wrong on the first ten
(Grey Rock, Lost Pines, Hancock, Jimmy Clay, Lions, Olmos Basin, then TPC Sawgrass, Augusta National, Pebble Beach and the Old Course
at St Andrews) and what each fix became. `COURSES.md` is the how-to;
this file is the why, and the checklist.

The aim never changes: **true to the real place, consistent with the other courses, and pretty.**
A new course should look like it belongs in the same book of paintings, and still be recognisable to
someone who has played it.

## The order of work

1. **Look first.** Pull the satellite view and the map before deciding anything:
   `python3 tools/aerial.py esri 18 <south> <west> <north> <east> out.jpg`.
   Do not design from written descriptions. The owner asked for this explicitly after an early pass built
   holes from research notes: real layouts from real imagery, or nothing.
2. **Import.** `python3 tools/add_course.py "<name as OpenStreetMap has it>" <id> [--holes 10-18]`
3. **Check the import** against the preview drawing and a published scorecard (see "Import traps").
4. **Set the look** in `COURSES` (`src/20-course.js`): compare with the satellite view, not with memory.
5. **Build and check.** `./build.sh && node tools/check_course.js <id>` then look at every picture it saves.
6. **Compare with the other courses** side by side. Same level of finish, different character.

## Import traps

| What happened | What to do |
|---|---|
| Jimmy Clay's first import took holes 1 and 9 from Roy Kizer next door: two courses on one property both have a hole 1. | The importer keeps holes inside the named course's outline. Use the course name exactly as OpenStreetMap shows it, and confirm the par pattern afterwards. |
| Hole lines that do not start at the back tee give short holes. Pushing a tee back along the line once put it on a road. | Tees snap to the mapped tee box that best matches the card yardage. Never move a tee by extending the line. |
| Grey Rock has greens and bunkers mapped but no hole lines. | Trace them on the gridded aerial the tool writes (`data/<id>.trace.jpg`) into `data/<id>.extra.json`. Verify by par pattern and by measured length against the card. |
| Many courses carry the card on the hole lines (`par`, `handicap`, `dist:<tee>`). | The importer reads them and prints them in the entry to paste. Cross-check one tee's nine-hole total against a published card. For Muni the red-tee totals matched exactly, which confirmed the rest. Published cards disagree with each other by a few yards; do not chase that. |
| Grey Rock's hand-traced 3rd, 5th and 8th measure 12 to 15% short of the card (170 for 193, 324 for 380, 158 for 187): the back tee boxes are not on the map. Still open. | `check_course.js` flags a line more than 8% off its card. Fix by tracing the back tee from the aerial into the extra file, not by stretching the line. |
| A second nine for a course. | Import it on its own as `<id>2` (`--holes 10-18`, or `1-9` where the back nine came first) and list its holes under `more` in the course's entry. It shares the course's look. Second nines are appended after every first nine in the game's hole list, so a published hole never changes its index; never reorder `COURSES` or move holes between `holes` and `more`. |
| Lost Pines' 16th and 18th greens are tagged as tees in the map, so the pin went to a green 180 yards away. | The importer now takes a tee-tagged shape at the end of a hole line as that hole's green and says so. `check_course.js` flags a pin that is not on a green. |
| Grey Rock's back nine (south of Highway 45) has almost nothing mapped: two greens, two fairways, no hole lines. The satellite photo is of dormant turf, where fairways cannot be told from rough, and the routing could not be confirmed. | Not built. A course needs either mapped features or imagery clear enough to trace and a way to confirm which hole is which. Do not fill the gap with invented holes. |
| Olmos Basin's published cards disagree by up to 650 yards, and several describe an older layout: the 4th is listed at 368 to 382 yards but the tee visible in the satellite view makes it 280. | When cards conflict, check the mapped tees against the aerial. If they are where the map says, the map is the course as it is today: use the published figure where the map agrees within 8% and the mapped length otherwise, and say so in the extra file's note. |
| Lost Pines included the whole Colorado River: 46,000 outline points and 19,000 pebbles. The game crawled. | Water is clipped to the hole at build time, but check anyway: `check_course.js` flags a hole that is slow to build. |
| The map draws the same water twice (a creek as a line and as its banks; a pond as water and as a hazard) and long rivers come in pieces. This showed as doubled creeks and seams. | All water on a hole is merged into one outline per body automatically. Still look at every creek for forks or doubles. A genuine side channel is fine. |
| The name lookup for Pebble Beach landed on the clubhouse and The Hay, the par-3 course next door: four hole lines, named Watson, Bing and Grace. | If the import finds too few holes, look at what it found. Download the map for the right area yourself (`api.openstreetmap.org/api/0.6/map?bbox=w,s,e,n` into `data/cache/<id>.osm`, with a `<id>.place.json` beside it) and run the import again. |
| The sea is not mapped as water. It is a coastline: a line with the land on its left. Pebble Beach came in with no ocean at all. | The importer joins the coastline, cuts it to a box round the holes and closes it on the seaward side. Set `sea:true` in the course's look: any water over 25,000 square yards is then painted as sea (a sand and rock strand, surf, deeper water; no reeds, lilies or ducks). |
| St Andrews has seven double greens: one huge shape serving two holes. The pin went to the middle of the shape, far from either hole. | The green is the one the hole line ends on, and on a green more than 34 yards in radius the day's pins are set round the end of the line. A hole line must end where that hole's flag goes. |
| None of the four famous courses carries yardages on the map, only par and (for two of them) stroke index. | Cards for these came from the published tournament or medal cards as remembered, checked against each course's known total, and then against the mapped lines: the published figure is used where the map agrees within 8% and the mapped length otherwise (Sawgrass 12; Pebble 9, 10, 13; St Andrews 3, 4, 6, 8, 10, 16, where the map carries the championship tees). Stroke indexes for Pebble Beach and most of St Andrews are from memory and worth checking against a card in hand. |
| A new course added in the middle of the list would shift the saved index of every later hole and change which course today's three come from. | New courses go at the end of `COURSES`. The first six keep the indexes they were published with; the daily course is taken in turn from the whole list. Check that today's three holes are the same before and after. |
| Augusta's 18th measures 505 yards along its mapped line but 462 from tee to pin: the line swings wide round the dogleg. | A line that is long only because of a bend is fine. Compare the straight distance on the hole card before worrying. |
| Checking eight nines at once on four processors made builds look slow and some pictures catch the camera still moving. | Run `check_course.js` two at a time at most; re-run alone any hole flagged slow before believing it. |
| Overpass does not work from the cloud session. | The tool uses `api.openstreetmap.org` and Nominatim. The session's network allowlist must include those, the tile hosts for imagery, and nothing else is needed. |

## The look: what stays the same, what makes each course its own

**The same everywhere**

- The painting style: striped fairways, soft relief on greens, tree sprites with shadows, the late light.
- Trees that grow in the place. In Texas: live oak, Ashe juniper, cedar elm, pecan, post oak, mesquite, loblolly pine, bald cypress
  at the water. Elsewhere: sabal palm (Sawgrass), Monterey cypress (Pebble Beach), whin, which is gorse (St Andrews).
  No ornamental pink trees: the owner had them removed. Augusta's azaleas are flower beds, not trees.
- Soft water: a shade on the grass, a thin rim, pale shallows. No heavy outlines.
- A dry creek is a rocky wash: darker and rougher than a path, wider, with cut banks. In its first form it was pale and smooth
  and read as a cart path with rocks on it.
- The hole in focus with the surroundings dissolving into a blurred haze of the terrain's own colour. Never fade to white.
- Minimal text. No captions that explain the obvious.

**Different per course** (the `th` entry)

| Course | What makes it itself | How that is expressed |
|---|---|---|
| Grey Rock | Hill Country, holes threaded through live oak and juniper, dry limestone creek beds | `out:'native'`, a tight tree belt (`belt:30`), juniper-heavy mix, no houses drawn |
| Lost Pines | Prairie ridges above the Colorado, native grass, sprawling white bunkers, pine | `out:'native'`, straw-coloured ground, post oak and pine in the mix, no belt |
| Hancock | A 1899 city park in one block, Waller Creek, old pecans, streets and houses all round | `out:'rough'`, real mapped trees that stop a ball, houses drawn, stone bridges |
| Jimmy Clay | Open parkland in a creek fork, clumps between holes, thick bottomland woods at the edge | a wide belt (`belt:46`) plus clumps, pecan and elm, the pond green at the 6th |
| Lions (Lions Municipal, "Muny") | 1924, short tight holes cut through dense oak woods, open stands of big oaks over dry ground | mapped woods do the work; sparse even scatter (`clumps:.34, clumpAt:-.5`), houses drawn |
| Olmos Basin | A flat flood basin in San Antonio: open parkland, a railroad through the middle, Olmos Creek and its drainage washes | no woods or belt, an even scatter with mesquite in the mix, the railway drawn (the importer now keeps `railway=rail`), houses drawn |
| TPC Sawgrass (Stadium) | Cut from Florida swamp: water on every hole, long waste bunkers, pine, oak and palm pressing in, the island green at 17 | mapped lakes do the work; a belt (`belt:34`) of pine, live oak and sabal palm; bald cypress at the water's edge |
| Augusta National | Wide emerald fairways with no rough to speak of, tall pines over pine straw, azaleas, white sand, Rae's Creek at Amen Corner | pine-heavy mix, woods floor the colour of pine straw (`woods:'#6a5a36'`), `sand` near white, pink flower beds (`blooms:20`), real hole names |
| Pebble Beach | Cliff-top holes over Carmel Bay, tiny greens, Monterey cypress, mansions along the inland holes | `sea:true`, `wet:false` (no bald cypress by salt water), clumps of Monterey cypress and pine, houses drawn |
| St Andrews (Old Course) | The original links: no trees, whin and fescue, double greens, over a hundred pot bunkers, the Swilcan Burn, the town at the 18th | `out:'native'`, `clumps:0`, mapped scrub filled with low whin bushes, pale lightly striped turf, houses drawn, real hole names |

Rules of thumb that came out of this:

- **Where do the trees come from?** If the map has woods outlines, let them carry the dense areas and only scatter
  lightly. If it has none, a belt fills the ground away from the fairways. Open parkland wants clumps. Decide from
  the satellite view.
- **Houses.** Draw ordinary houses only where they read as houses and matter to the place (Hancock, Muni). At Grey Rock
  they came out as blobs and were removed; only buildings larger than 650 square yards stay there (the clubhouse).
- **Ground colour.** Take it from the aerial: straw for prairie, olive for dry parkland, deeper green for irrigated turf.
- **One or two true landmarks beat any amount of decoration**: the railroad through Olmos Basin, the pond green at Jimmy Clay's 6th, Hogan's Hole at
  Muni, the island green at Sawgrass, the Swilcan Burn and the hotel on the Road Hole, the bare limestone of McKinney Falls across Onion Creek, Highway 45 over Grey Rock.
- **Hole names**: short, from real local features, no repeats across courses. Use real lore where it exists.
- After any rework, put before and after pictures side by side. "Make sure the holes still look as pretty as they did"
  is a standing requirement.

## Playability rules that scenery must respect

- **Nothing blocks the tee.** No tree stands on a tee or within the first 55 yards of the line of play (both the way
  the hole runs and the straight line the camera first aims down). Hancock shipped with trees in front of four tees.
- Only trees mapped individually stop a ball. Scattered trees are scenery.
- Water is a hazard: drop two clear yards from the bank, one stroke. Woods and out of bounds: replay, one stroke.
- The picture fades from 94 yards off the line and is gone by 165; a ball past about 150 is off the map and replayed.
  Anything that matters to play must sit inside that.
- The pin must be on a green and the tee on a tee: `check_course.js` verifies the first.

## Performance rules (learned on a real phone)

- Only the hole being played is built. Keep a hole's build well under 100 ms on a desktop.
- Menus and scorecards read a hole's par and yardage from the course list (`INFO`), never by building the hole. An
  eighteen-hole card that built every hole would stall the phone.
- Scenery is painted once into kept pictures. **Nothing whose size depends on the zoom may be painted into them**:
  the cup was, and became a giant black hole when the camera zoomed in for a putt.
- No full-screen fills every frame. Drifting cloud shadows cost more than the whole rest of the frame.
- The crisp picture is drawn when the camera's destination is known, never while a swing is being timed.

## Before calling a course done

- [ ] Preview drawing matches the satellite view: nine lines, each from a tee to a green, in the right order.
- [ ] Par pattern and yardages match a published card for the tee named in the entry.
- [ ] `node tools/check_course.js <id> f` and `... <id> b` report no problems (or only ones recorded above).
- [ ] Every saved picture looked at: no doubled water, no blobs, no bare patches, nothing over a tee.
- [ ] Side by side with two other courses: same finish, clearly a different place.
- [ ] The home menu still lays out cleanly with one more button.
- [ ] `COURSES.md` and this file updated if something new was learned.

# Breakfast Ball (the folder is still `flick-links`)

A daily three-hole golf game for a group chat. Everything lives in `flick-links/`.

- Build: `cd flick-links && ./build.sh` assembles `src/*` and `data/*.json` into `game.html` (published as the artifact)
  and `index.html` (standalone).
- **Adding or reworking a course: read `flick-links/COURSE_LESSONS.md` first**, then follow `flick-links/COURSES.md`.
  Check the result with `node flick-links/tools/check_course.js <id>` and look at the pictures it saves.
- Two courses (Bright Angel, Twenty Lakes) are invented holes on real terrain: `flick-links/COURSES.md`, "Fantasy courses".
  Their source is `flick-links/data/<id>.design.json`; rebuild with `python3 flick-links/tools/fantasy.py build <design>`.
  After changing a layout there, run `node flick-links/tools/check_doglegs.js <id>`: no bend may be cut by driving at the green.
- Handicaps are measured against a course rating, not par. After adding a course, moving a tee or green, or changing how the
  ball flies or rolls: `./build.sh && node flick-links/tools/rate_courses.js [id]` (it rewrites `RATING` in `server/core.js`).
- Hosting and the clubhouse server: `flick-links/HOSTING.md`.
- Keep on-screen text minimal. The owner wants only instructions that are needed.

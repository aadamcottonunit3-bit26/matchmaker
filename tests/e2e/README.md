# End-to-end security tests (reference harness, LOCAL only)

What it runs: a real PostgreSQL + a real PostgREST (the same engine Supabase uses for its REST API), a small **mock**
of Supabase Auth (GoTrue) and Storage (`mock.js`), the real Next.js app, and a headless Chromium (Playwright).
Because Auth and Storage are mocks, this proves the behaviour of OUR code and database rules, not of the real
Supabase services (see SECURITY_REPORT.md, "Not tested").

Needs: PostgreSQL 16, the PostgREST binary, Node 22, Python 3 with `playwright` and `pillow`, `npm i pg` next to `mock.js`.
The scripts were written for the sandbox layout (`/tmp/e2e`, `/tmp/pgrst`, `/home/claude/site/marriage-bureau`):
adjust those paths before running on another machine.

Order: `node keys.js > env.sh` -> source env.sh -> build the app with that env (`next build`) -> `setup_db.sh` ->
start PostgREST, `node mock.js`, `next start -p 3077` -> `node fixtures.js` -> `python3 e2e.py`.
Result in the last run: 86 passed, 0 failed.

# The Cornhole

Sign-ups and a live bracket for a Thanksgiving cornhole tournament.

**Public page:** https://the-cornhole.pages.dev — the one link that goes out. It shows a countdown to the
registration deadline, the sign-up form, everyone who has signed up so far, and the bracket once it's drawn.

**Admin page:** https://the-cornhole.pages.dev/admin — for the host only, behind a PIN. From here you can
remove duplicates or no-shows, add walk-ins, draw the bracket, and tap the winner of each game.

## How it works

- Registration closes at **11:59 PM Central, Nov 20, 2026** (`DEADLINE` in `lib/server.js`), or as soon as
  the bracket is drawn.
- The public page shows first name, last initial and nickname. Full last names only appear on the admin page.
- The bracket is **singles, single elimination**, sized to the next power of two. Empty slots become random
  first-round byes (30 players means 2 byes).
- Two pits: each game keeps its pit until it's scored, and a free pit goes to the next waiting game.
- Undoing a result also clears any later game that depended on it.

## Stack

Cloudflare Pages (static files in `public/`), Pages Functions (`functions/api/`) and a D1 database
(`schema.sql`). Free tier.

## Run it

```bash
npm test                                                   # bracket logic tests
npx wrangler d1 execute the-cornhole --local --file schema.sql
echo 'ADMIN_PIN=pick-a-local-pin' > .dev.vars              # local only, never committed
npx wrangler pages dev                                     # http://localhost:8788
```

Deploy: `npx wrangler pages deploy`. The admin PIN is a Cloudflare secret:
`npx wrangler pages secret put ADMIN_PIN --project-name=the-cornhole`.

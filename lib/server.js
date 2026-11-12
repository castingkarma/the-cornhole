// Shared helpers for the Pages Functions.

// Registration closes 11:59:59 PM Central on Nov 20, 2026 (CST = UTC-6).
export const DEADLINE = "2026-11-21T05:59:59Z";
export const MAX_PLAYERS = 64;

export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// Trim, drop control characters, collapse runs of spaces, cap length.
export function clean(value, max) {
  let out = "";
  for (const ch of String(value == null ? "" : value)) {
    const c = ch.codePointAt(0);
    out += c < 32 || c === 127 ? " " : ch;
  }
  return out.replace(/\s+/g, " ").trim().slice(0, max);
}

export function isOpen(now = Date.now()) {
  return now <= Date.parse(DEADLINE);
}

// Public name: first name, last initial. Full last names stay off the page.
export function publicPlayer(p) {
  const initial = p.last ? p.last.charAt(0).toUpperCase() + "." : "";
  return { id: p.id, name: (p.first + " " + initial).trim(), nick: p.nick || "" };
}

export async function getPlayers(db) {
  const { results } = await db.prepare("SELECT id, first, last, nick, created_at FROM players ORDER BY id").all();
  return results;
}

export async function getBracket(db) {
  const row = await db.prepare("SELECT value FROM meta WHERE key = 'bracket'").first();
  return row ? JSON.parse(row.value) : null;
}

export async function saveBracket(db, bracket) {
  if (bracket == null) {
    await db.prepare("DELETE FROM meta WHERE key = 'bracket'").run();
    return;
  }
  await db
    .prepare("INSERT INTO meta (key, value) VALUES ('bracket', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(JSON.stringify(bracket))
    .run();
}

export async function publicState(db) {
  const players = (await getPlayers(db)).map(publicPlayer);
  const bracket = await getBracket(db);
  return { deadline: DEADLINE, open: isOpen() && !bracket, count: players.length, players, bracket };
}

export async function addPlayer(db, body) {
  const first = clean(body.first, 30);
  const last = clean(body.last, 30);
  const nick = clean(body.nick, 30);
  if (!first || !last) return { error: "First and last name are required.", status: 400 };
  const dupe = await db
    .prepare("SELECT id FROM players WHERE lower(first) = lower(?1) AND lower(last) = lower(?2)")
    .bind(first, last)
    .first();
  if (dupe) return { error: first + " " + last + " is already signed up.", status: 409 };
  const { n } = await db.prepare("SELECT count(*) AS n FROM players").first();
  if (n >= MAX_PLAYERS) return { error: "The field is full.", status: 409 };
  const row = await db
    .prepare("INSERT INTO players (first, last, nick, created_at) VALUES (?1, ?2, ?3, ?4) RETURNING id, first, last, nick")
    .bind(first, last, nick, new Date().toISOString())
    .first();
  return { player: row };
}

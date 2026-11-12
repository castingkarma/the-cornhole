// POST /api/admin — Justin's controls. Every call carries the PIN in the
// x-admin-pin header; ADMIN_PIN is a Cloudflare secret, never in the code.
// 10 wrong PINs within 15 minutes locks the admin out for the rest of that window.
import { json, getPlayers, getBracket, saveBracket, addPlayer, publicPlayer } from "../../lib/server.js";
import { buildBracket, setWinner, clearWinner } from "../../lib/bracket.js";

const FAIL_WINDOW_MS = 15 * 60 * 1000;
const FAIL_LIMIT = 10;

function sameText(a, b) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

async function recentFails(db) {
  const row = await db.prepare("SELECT value FROM meta WHERE key = 'pin_fails'").first();
  const list = row ? JSON.parse(row.value) : [];
  const cutoff = Date.now() - FAIL_WINDOW_MS;
  return list.filter((t) => t > cutoff);
}

async function saveFails(db, list) {
  await db
    .prepare("INSERT INTO meta (key, value) VALUES ('pin_fails', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(JSON.stringify(list))
    .run();
}

function cryptoRand() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 4294967296;
}

async function fullState(db) {
  const players = await getPlayers(db);
  return {
    players: players.map((p) => ({ ...publicPlayer(p), first: p.first, last: p.last, createdAt: p.created_at })),
    bracket: await getBracket(db),
  };
}

export async function onRequestPost({ request, env }) {
  const db = env.DB;
  if (!env.ADMIN_PIN) return json({ ok: false, error: "Admin PIN isn't set up yet." }, 503);

  const fails = await recentFails(db);
  if (fails.length >= FAIL_LIMIT) return json({ ok: false, error: "Too many wrong PINs. Try again in 15 minutes." }, 429);
  if (!sameText(request.headers.get("x-admin-pin") || "", env.ADMIN_PIN)) {
    fails.push(Date.now());
    await saveFails(db, fails);
    return json({ ok: false, error: "Wrong PIN." }, 401);
  }

  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: "Bad request." }, 400); }
  const bracket = await getBracket(db);

  try {
    switch (body.action) {
      case "list":
        break;

      case "add": {
        if (bracket) return json({ ok: false, error: "Reset the bracket before adding players." }, 409);
        const r = await addPlayer(db, body);
        if (r.error) return json({ ok: false, error: r.error }, r.status);
        break;
      }

      case "remove": {
        if (bracket) return json({ ok: false, error: "Reset the bracket before removing players." }, 409);
        await db.prepare("DELETE FROM players WHERE id = ?1").bind(Number(body.id)).run();
        break;
      }

      case "draw": {
        if (bracket && !body.redraw) return json({ ok: false, error: "Already drawn." }, 409);
        const ids = (await getPlayers(db)).map((p) => p.id);
        await saveBracket(db, buildBracket(ids, cryptoRand));
        break;
      }

      case "result": {
        if (!bracket) return json({ ok: false, error: "No bracket yet." }, 409);
        await saveBracket(db, setWinner(bracket, String(body.match), Number(body.winner)));
        break;
      }

      case "undo": {
        if (!bracket) return json({ ok: false, error: "No bracket yet." }, 409);
        await saveBracket(db, clearWinner(bracket, String(body.match)));
        break;
      }

      case "reset":
        await saveBracket(db, null);
        break;

      default:
        return json({ ok: false, error: "Unknown action." }, 400);
    }
  } catch (e) {
    return json({ ok: false, error: e.message || "Something went wrong." }, 400);
  }

  return json({ ok: true, ...(await fullState(db)) });
}

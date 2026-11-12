// POST /api/register — public sign-up. Closes at the deadline or once the bracket is drawn.
import { json, isOpen, getBracket, addPlayer, publicPlayer } from "../../lib/server.js";

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: "Bad request." }, 400); }

  // Honeypot: a hidden field people never see. Bots fill it in.
  if (body.website) return json({ ok: true });

  if (!isOpen()) return json({ ok: false, error: "Registration is closed." }, 403);
  if (await getBracket(env.DB)) return json({ ok: false, error: "The bracket has already been drawn." }, 403);

  const result = await addPlayer(env.DB, body);
  if (result.error) return json({ ok: false, error: result.error }, result.status);
  return json({ ok: true, player: publicPlayer(result.player) });
}

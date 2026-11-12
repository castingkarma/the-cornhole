// GET /api/state — everything the public page shows. Polled every few seconds.
import { json, publicState } from "../../lib/server.js";

export async function onRequestGet({ env }) {
  return json(await publicState(env.DB));
}

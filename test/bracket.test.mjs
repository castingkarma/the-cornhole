import test from "node:test";
import assert from "node:assert/strict";
import { buildBracket, setWinner, clearWinner, isPlayable, nextPow2 } from "../lib/bracket.js";

const ids = (n) => [...Array(n).keys()].map((i) => i + 1);

// Seeded generator so a failure can be replayed.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Play every game, always picking p1, until a champion exists.
function playOut(b) {
  let guard = 0;
  while (b.champion == null) {
    const m = b.rounds.flat().find(isPlayable);
    assert.ok(m, "a playable game must exist until there is a champion");
    setWinner(b, m.id, m.p1);
    assert.ok(++guard < 200);
  }
  return b;
}

test("every field size from 2 to 64 seeds everyone exactly once and plays to one champion", () => {
  for (let n = 2; n <= 64; n++) {
    for (let seed = 1; seed <= 5; seed++) {
      const b = buildBracket(ids(n), seeded(n * 100 + seed));
      const size = nextPow2(n);
      assert.equal(b.size, size);
      assert.equal(b.byes, size - n);
      const seatedIds = b.rounds[0].flatMap((m) => [m.p1, m.p2]).filter((x) => x != null);
      assert.deepEqual(seatedIds.slice().sort((a, c) => a - c), ids(n), `n=${n}: everyone seated once`);
      assert.equal(b.rounds[0].filter((m) => m.bye).length, size - n, `n=${n}: bye count`);
      assert.ok(b.rounds[0].every((m) => m.p1 != null), "no empty first-round match");
      // games played = players - 1 in single elimination
      playOut(b);
      const played = b.rounds.flat().filter((m) => !m.bye && m.winner != null).length;
      assert.equal(played, n - 1, `n=${n}: ${n - 1} games`);
    }
  }
});

test("30 players: two byes, 29 games", () => {
  const b = buildBracket(ids(30), seeded(7));
  assert.equal(b.size, 32);
  assert.equal(b.byes, 2);
  playOut(b);
  assert.equal(b.rounds.flat().filter((m) => !m.bye && m.winner != null).length, 29);
});

test("byes are random, not always the same people or slots", () => {
  const byePlayers = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const b = buildBracket(ids(30), seeded(seed));
    b.rounds[0].filter((m) => m.bye).forEach((m) => byePlayers.add(m.p1));
  }
  assert.ok(byePlayers.size > 15, `byes spread across players (got ${byePlayers.size})`);
});

test("two pits: at most two games on, never the same pit twice, and a freed pit is refilled", () => {
  const b = buildBracket(ids(16), seeded(3));
  const onPit = () => b.rounds.flat().filter((m) => m.pit != null);
  assert.deepEqual(onPit().map((m) => m.pit).sort(), [1, 2]);
  const pit1 = onPit().find((m) => m.pit === 1);
  const pit2Before = onPit().find((m) => m.pit === 2).id;
  setWinner(b, pit1.id, pit1.p1);
  assert.equal(onPit().find((m) => m.pit === 2).id, pit2Before, "pit 2 game is not moved");
  assert.equal(onPit().length, 2, "pit 1 is refilled");
  assert.notEqual(onPit().find((m) => m.pit === 1).id, pit1.id);
});

test("undo clears everything downstream that depended on the result", () => {
  const b = buildBracket(ids(8), seeded(11));
  const [m1, m2] = b.rounds[0];
  setWinner(b, m1.id, m1.p1);
  setWinner(b, m2.id, m2.p1);
  const semi = b.rounds[1][0];
  assert.equal(semi.p1, m1.p1);
  setWinner(b, semi.id, semi.p1);
  assert.equal(b.rounds[2][0].p1, m1.p1);
  clearWinner(b, m1.id);
  assert.equal(semi.p1, null);
  assert.equal(semi.winner, null, "semi result cleared");
  assert.equal(b.rounds[2][0].p1, null, "final slot cleared");
  // re-picking the other player flows through
  setWinner(b, m1.id, m1.p2);
  assert.equal(semi.p1, m1.p2);
});

test("refuses bad results", () => {
  const b = buildBracket(ids(5), seeded(2));
  const bye = b.rounds[0].find((m) => m.bye);
  assert.throws(() => setWinner(b, bye.id, bye.p1));
  const real = b.rounds[0].find((m) => !m.bye);
  assert.throws(() => setWinner(b, real.id, 999));
  assert.throws(() => setWinner(b, b.rounds[2][0].id, real.p1), /aren't set/);
});

test("fewer than two players cannot be drawn", () => {
  assert.throws(() => buildBracket([1], Math.random));
});

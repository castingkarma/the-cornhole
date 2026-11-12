// Single-elimination bracket for The Cornhole.
//
// The bracket is sized to the next power of two (2, 4, 8, 16, 32, 64). Empty
// slots become first-round byes, handed out at random, so 30 players means two
// byes and 27 players means five. A bye never meets another bye in round 1.
//
// Only round-1 pairings and each match's winner are stored. Every later round is
// rebuilt from those winners by resolve(), so undoing a result can never leave
// a stale player further down the bracket.

export const PITS = [1, 2];

export function nextPow2(n) {
  let size = 2;
  while (size < n) size *= 2;
  return size;
}

// Fisher-Yates. `rand` returns a float in [0, 1).
export function shuffle(list, rand) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function roundName(round, totalRounds) {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinals";
  if (fromEnd === 2) return "Quarterfinals";
  return "Round " + round;
}

export function buildBracket(playerIds, rand) {
  const n = playerIds.length;
  if (n < 2) throw new Error("Need at least 2 players to draw a bracket.");
  const size = nextPow2(n);
  const totalRounds = Math.log2(size);
  const firstRoundMatches = size / 2;
  const byes = size - n; // always fewer than firstRoundMatches

  const order = shuffle(playerIds, rand);
  const byeSlots = new Set(shuffle([...Array(firstRoundMatches).keys()], rand).slice(0, byes));

  const rounds = [];
  let next = 0;
  const first = [];
  for (let i = 0; i < firstRoundMatches; i++) {
    const isBye = byeSlots.has(i);
    first.push({
      id: "r1m" + (i + 1),
      round: 1,
      index: i,
      p1: order[next++],
      p2: isBye ? null : order[next++],
      bye: isBye,
      winner: null,
      pit: null,
    });
  }
  rounds.push(first);
  for (let r = 2; r <= totalRounds; r++) {
    const count = size / Math.pow(2, r);
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({ id: "r" + r + "m" + (i + 1), round: r, index: i, p1: null, p2: null, bye: false, winner: null, pit: null });
    }
    rounds.push(list);
  }
  const bracket = { size, totalRounds, players: n, byes, drawnAt: new Date().toISOString(), rounds };
  return resolve(bracket);
}

export function findMatch(bracket, matchId) {
  for (const round of bracket.rounds) {
    for (const m of round) if (m.id === matchId) return m;
  }
  return null;
}

// A match can be played when both players are known and it has no winner yet.
export function isPlayable(m) {
  return !m.bye && m.p1 != null && m.p2 != null && m.winner == null;
}

// Rebuild rounds 2+ from the winners below them, clear any winner that is no
// longer one of the match's two players, then hand free pits to waiting games.
export function resolve(bracket) {
  const rounds = bracket.rounds;
  for (const m of rounds[0]) {
    if (m.bye) m.winner = m.p1;
  }
  for (let r = 1; r < rounds.length; r++) {
    for (const m of rounds[r]) {
      const a = rounds[r - 1][m.index * 2];
      const b = rounds[r - 1][m.index * 2 + 1];
      m.p1 = a.winner;
      m.p2 = b.winner;
      if (m.winner != null && m.winner !== m.p1 && m.winner !== m.p2) m.winner = null;
    }
  }
  assignPits(bracket);
  const final = rounds[rounds.length - 1][0];
  bracket.champion = final.winner;
  return bracket;
}

// A game keeps its pit until it has a winner. A free pit goes to the earliest
// waiting game: lowest round first, then top of the bracket first.
export function assignPits(bracket) {
  const all = bracket.rounds.flat();
  for (const m of all) if (!isPlayable(m)) m.pit = null;
  const busy = new Set(all.filter((m) => m.pit != null).map((m) => m.pit));
  const waiting = all.filter((m) => isPlayable(m) && m.pit == null);
  for (const pit of PITS) {
    if (busy.has(pit)) continue;
    const m = waiting.shift();
    if (!m) break;
    m.pit = pit;
  }
  return bracket;
}

export function setWinner(bracket, matchId, playerId) {
  const m = findMatch(bracket, matchId);
  if (!m) throw new Error("No such match.");
  if (m.bye) throw new Error("That was a bye.");
  if (m.p1 == null || m.p2 == null) throw new Error("Both players aren't set for that game yet.");
  if (playerId !== m.p1 && playerId !== m.p2) throw new Error("That player isn't in this game.");
  m.winner = playerId;
  return resolve(bracket);
}

export function clearWinner(bracket, matchId) {
  const m = findMatch(bracket, matchId);
  if (!m) throw new Error("No such match.");
  if (m.bye) throw new Error("A bye can't be undone.");
  m.winner = null;
  return resolve(bracket);
}

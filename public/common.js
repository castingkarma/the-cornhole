// Shared by the public page and Justin's admin page.

export function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return n;
}

export function roundName(round, total) {
  const fromEnd = total - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinals";
  if (fromEnd === 2) return "Quarterfinals";
  return "Round " + round;
}

export function nameOf(players, id) {
  return players.find((p) => p.id === id) || null;
}

function playerLine(p) {
  return [el("span", { class: "n" }, p.name, p.nick ? el("span", { class: "nk" }, "“" + p.nick + "”") : null)];
}

export function playableMatches(bracket) {
  return bracket.rounds.flat().filter((m) => !m.bye && m.p1 != null && m.p2 != null && m.winner == null);
}

// The "now playing / on deck / champion" strip above the bracket.
export function renderStatus(bracket, players) {
  const out = [];
  const label = (id) => {
    const p = nameOf(players, id);
    return p ? p.name + (p.nick ? " “" + p.nick + "”" : "") : "?";
  };
  if (bracket.champion != null) {
    out.push(el("div", { class: "champ" }, el("div", { class: "k" }, "🏆 Champion of The Cornhole"), el("div", { class: "name" }, label(bracket.champion))));
    return out;
  }
  const live = playableMatches(bracket);
  const pits = el("div", { class: "pits" });
  for (const pit of [1, 2]) {
    const m = live.find((x) => x.pit === pit);
    pits.append(
      el("div", { class: "pit" }, el("div", { class: "k" }, "Now playing · Pit " + pit),
        el("div", { class: "vs" }, m ? [label(m.p1), el("span", { class: "v" }, "vs"), label(m.p2)] : "Open"))
    );
  }
  out.push(pits);
  const deck = live.filter((m) => m.pit == null).slice(0, 2);
  if (deck.length) out.push(el("p", { class: "ondeck" }, "On deck: " + deck.map((m) => label(m.p1) + " vs " + label(m.p2)).join("  ·  ")));
  return out;
}

// opts.admin: slots become buttons. opts.onPick(matchId, playerId), opts.onUndo(matchId).
export function renderBracket(bracket, players, opts = {}) {
  const wrap = el("div", { class: "bracket" });
  bracket.rounds.forEach((round, r) => {
    const col = el("div", { class: "round" }, el("h3", {}, roundName(r + 1, bracket.totalRounds)));
    for (const m of round) {
      const live = !m.bye && m.p1 != null && m.p2 != null && m.winner == null;
      const box = el("div", { class: "match" + (m.pit ? " live" : ""), id: "m-" + m.id });
      if (m.pit) box.append(el("span", { class: "tag" }, "Pit " + m.pit));
      for (const side of ["p1", "p2"]) {
        const id = m[side];
        if (side === "p2" && m.bye) {
          box.append(el("div", { class: "slot bye" }, "Bye"));
          continue;
        }
        const p = id != null ? nameOf(players, id) : null;
        if (!p) {
          box.append(el("div", { class: "slot tbd" }, "TBD"));
          continue;
        }
        const state = m.winner == null ? "" : m.winner === id ? " win" : " lose";
        if (opts.admin && live) {
          box.append(el("button", { class: "slot", type: "button", title: "Mark " + p.name + " as the winner", onclick: () => opts.onPick(m.id, id) }, playerLine(p)));
        } else {
          box.append(el("div", { class: "slot" + state }, playerLine(p)));
        }
      }
      if (opts.admin && !m.bye && m.winner != null) {
        box.append(el("button", { class: "slot", type: "button", style: "justify-content:center;color:var(--muted);font-size:12px", onclick: () => opts.onUndo(m.id) }, "↶ Undo this result"));
      }
      col.append(box);
    }
    wrap.append(col);
  });
  return el("div", {}, el("p", { class: "swipe" }, "Swipe sideways to follow the bracket →"), el("div", { class: "bracket-scroll" }, wrap));
}

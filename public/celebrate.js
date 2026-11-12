// The "you're in" celebration: a full-screen confetti blast plus a giant banner.
// No library. Respects prefers-reduced-motion (banner only, no flying confetti).

const COLORS = ["#f08a24", "#ffad55", "#f2c14e", "#fbf3e4", "#7fc77a", "#c88a4a", "#e8705f"];
const EMOJI = ["🌽", "🦃", "🏆", "🔥"];

function rand(a, b) { return a + Math.random() * (b - a); }

function burst(list, x, y, count, angle, spread, speed) {
  for (let i = 0; i < count; i++) {
    const a = angle + rand(-spread, spread);
    const v = rand(speed * 0.55, speed);
    const isEmoji = Math.random() < 0.07;
    list.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      size: isEmoji ? rand(22, 34) : rand(7, 14),
      color: COLORS[(Math.random() * COLORS.length) | 0],
      shape: isEmoji ? "emoji" : Math.random() < 0.3 ? "circle" : "rect",
      emoji: EMOJI[(Math.random() * EMOJI.length) | 0],
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.3, 0.3),
      wobble: rand(0, Math.PI * 2),
      life: 0,
    });
  }
}

export function confetti() {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60";
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = innerWidth, H = innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);

  const parts = [];
  const big = Math.min(W, H);
  const speed = big * 0.045 + 10;
  // two cannons from the bottom corners, then a burst from the middle
  burst(parts, 0, H, 110, -Math.PI / 3, 0.35, speed * 1.25);
  burst(parts, W, H, 110, -Math.PI * 2 / 3, 0.35, speed * 1.25);
  setTimeout(() => burst(parts, W / 2, H * 0.42, 140, -Math.PI / 2, Math.PI, speed * 0.8), 220);
  setTimeout(() => {
    burst(parts, W * 0.15, H, 60, -Math.PI / 2.6, 0.3, speed * 1.15);
    burst(parts, W * 0.85, H, 60, -Math.PI / 1.6, 0.3, speed * 1.15);
  }, 650);

  const start = performance.now();
  function frame(now) {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.life++;
      p.vy += 0.32;          // gravity
      p.vx *= 0.985; p.vy *= 0.985; // air
      p.wobble += 0.12;
      p.x += p.vx + Math.sin(p.wobble) * 0.6;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, (H + 40 - p.y) / 80));
      if (p.shape === "emoji") {
        ctx.font = p.size + "px serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(p.emoji, 0, 0);
      } else if (p.shape === "circle") {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.scale(1, Math.cos(p.wobble)); // the flutter of a flat piece turning
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].y > H + 60) parts.splice(i, 1);
    if (parts.length && now - start < 9000) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}

function banner(headline, sub) {
  const style = document.createElement("style");
  style.textContent = `
    .yay{position:fixed;inset:0;z-index:59;display:flex;align-items:center;justify-content:center;flex-direction:column;
      text-align:center;padding:24px;background:radial-gradient(circle at 50% 45%,rgba(240,138,36,.35),rgba(15,20,24,.88) 65%);
      animation:yayIn .35s ease-out both;cursor:pointer}
    .yay.out{animation:yayOut .45s ease-in both}
    .yay .h{font-family:"Anton",Impact,sans-serif;text-transform:uppercase;color:#fbf3e4;line-height:.9;
      font-size:clamp(64px,17vw,180px);text-shadow:0 8px 0 rgba(240,138,36,.55),0 0 60px rgba(255,173,85,.5);
      animation:yayPop .7s cubic-bezier(.2,1.6,.4,1) both}
    .yay .s{font-family:"Anton",Impact,sans-serif;text-transform:uppercase;color:#f2c14e;letter-spacing:.04em;
      font-size:clamp(26px,6vw,52px);margin-top:14px;animation:yayPop .7s .18s cubic-bezier(.2,1.6,.4,1) both}
    .yay .t{color:#b7b0a3;margin-top:22px;font-size:15px;animation:yayIn .4s .6s both}
    @keyframes yayIn{from{opacity:0}to{opacity:1}}
    @keyframes yayOut{to{opacity:0;transform:scale(1.04)}}
    @keyframes yayPop{0%{opacity:0;transform:scale(.3) rotate(-6deg)}100%{opacity:1;transform:none}}
    main.shake{animation:shake .5s}
    @keyframes shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-7px)}40%,60%{transform:translateX(7px)}}
    @media (prefers-reduced-motion:reduce){.yay,.yay .h,.yay .s,.yay .t{animation:none}main.shake{animation:none}}
  `;
  const box = document.createElement("div");
  box.className = "yay";
  box.setAttribute("role", "status");
  box.setAttribute("aria-live", "assertive");
  const h = document.createElement("div"); h.className = "h"; h.textContent = headline;
  const s = document.createElement("div"); s.className = "s"; s.textContent = sub;
  const t = document.createElement("div"); t.className = "t"; t.textContent = "Tap anywhere to continue";
  box.append(h, s, t);
  document.head.append(style);
  document.body.append(box);
  const main = document.querySelector("main");
  if (main) { main.classList.add("shake"); setTimeout(() => main.classList.remove("shake"), 600); }

  let gone = false;
  const close = () => {
    if (gone) return; gone = true;
    box.classList.add("out");
    setTimeout(() => { box.remove(); style.remove(); }, 450);
  };
  box.addEventListener("click", close);
  document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); } });
  setTimeout(close, 4200);
}

export function celebrate(who) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  banner("You're in!", who ? who : "See you on the boards");
  if (!reduce) confetti();
  try { navigator.vibrate && navigator.vibrate([70, 50, 140]); } catch (e) {}
}

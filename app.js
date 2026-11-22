(() => {
  "use strict";
  const D = window.FEUD;
  const LS_KEY = "cusail-feud-v1";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Screens (in show order) ---------- */
  const slides = [{ type: "title", label: "Title" }, { type: "rules", label: "How to Play" }];
  D.mains.forEach((m, i) => {
    if (D.faceoffs[i]) slides.push({ type: "board", kind: "faceoff", q: D.faceoffs[i], key: "f" + i, round: i + 1, label: `Round ${i + 1} · Face-Off` });
    slides.push({ type: "board", kind: "main", q: m, key: "m" + i, round: i + 1, label: `Round ${i + 1} · Play the Board` });
    const g = D.minigames[i];
    if (g) slides.push({ type: "minigame", g, n: i + 1, label: `Minigame ${i + 1} · ${g.name}` });
  });
  slides.push({ type: "final", label: "Final Standings" });

  /* ---------- Saved state (survives refresh) ---------- */
  const fresh = () => ({ teams: D.teams.map((n) => ({ name: n, score: 0 })), boards: {}, slide: 0, muted: false, stealOrder: [] });
  let S = null;
  try { S = JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) { /* no storage */ }
  if (!S || !Array.isArray(S.teams) || S.teams.length !== D.teams.length) S = fresh();
  S.boards ||= {}; S.stealOrder ||= [];
  if (!(S.slide >= 0 && S.slide < slides.length)) S.slide = 0;
  const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };
  const board = (key) => (S.boards[key] ||= { revealed: [], strikes: 0, awarded: null, amt: 0 });
  const cur = () => slides[S.slide];

  // revealed[i]: 1 = revealed & counts toward the pot, 2 = shown via "Reveal all" (doesn't count)
  function potOf(sl) {
    const b = board(sl.key);
    if (b.awarded !== null) return b.amt;
    const vals = sl.q.answers.filter((_, i) => b.revealed[i] === 1).map((a) => a[1]);
    if (!vals.length) return 0;
    return sl.kind === "faceoff" ? Math.max(...vals) : vals.reduce((x, y) => x + y, 0);
  }

  /* ---------- Sound effects (generated, no files) ---------- */
  let actx = null;
  function tone(freq, start, dur, type = "sine", gain = 0.2) {
    if (S.muted) return;
    try {
      actx ||= new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime + start, o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* audio unavailable */ }
  }
  const sfx = {
    ding() { tone(880, 0, 0.5, "triangle", 0.28); tone(1318, 0.09, 0.7, "triangle", 0.22); },
    buzz() { tone(98, 0, 0.75, "sawtooth", 0.3); tone(104, 0, 0.75, "square", 0.14); },
    award() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.4, "triangle", 0.22)); },
    tick() { tone(1200, 0, 0.05, "square", 0.06); },
  };

  /* ---------- Elements ---------- */
  const stage = $("#stage"), steal = $("#steal"), sb = $("#scoreboard"), jump = $("#jump");
  jump.innerHTML = slides.map((s, i) => `<option value="${i}">${esc(s.label)}</option>`).join("");

  /* ---------- Navigation ---------- */
  function go(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    S.slide = i; save();
    closeSteal(); render();
  }

  function render() {
    stopTimer();
    const sl = cur();
    document.body.classList.toggle("is-title", sl.type === "title");
    jump.value = String(S.slide);
    $("#prev").disabled = S.slide === 0;
    $("#next").disabled = S.slide === slides.length - 1;
    $("#soundBtn").textContent = S.muted ? "Sound off" : "Sound on";
    stage.scrollTop = 0;
    stage.innerHTML = ({ title: titleHTML, rules: rulesHTML, board: boardHTML, minigame: minigameHTML, final: finalHTML })[sl.type](sl);
    if (sl.type === "board") updateBoardUI();
    if (sl.type === "minigame") initTimer(sl.g.minutes || 5);
    if (sl.type === "final") confetti();
    renderScores();
  }

  /* ---------- Screen templates ---------- */
  function titleHTML() {
    return `<div class="title-screen">
      <img src="images/title.webp" alt="CUSail Family Feud">
      <button class="start-btn" data-next>Start the show ›</button>
    </div>`;
  }

  function rulesHTML() {
    const cards = [
      ["Face-Off", "Each team sends up one rep. Highest-ranked answer wins control of the board <em>and</em> those points."],
      ["Play the Board", "That team answers one person at a time. Two strikes and you’re out. Clear the board to bank every point."],
      ["Steal!", "The other teams race to finish a steal challenge. Finish order = steal order. Highest-ranked answer takes the whole pot. Nobody on the board? Original team keeps it."],
      ["Minigames", "A minigame after every round for bonus points. Six rounds, six minigames — most points wins."],
    ];
    return `<div class="rules">
      <h1 class="screen-title">How to Play</h1>
      <div class="rules-grid">${cards.map((c, i) => `<div class="rule-card"><span class="rule-n">${i + 1}</span><h3>${c[0]}</h3><p>${c[1]}</p></div>`).join("")}</div>
    </div>`;
  }

  function boardHTML(sl) {
    const fo = sl.kind === "faceoff";
    let tiles = "";
    for (let i = 0; i < 8; i++) {
      const a = sl.q.answers[i];
      tiles += a
        ? `<button class="tile" data-i="${i}" aria-label="Answer ${i + 1}"><span class="tile-inner">
             <span class="face front"><span class="num">${i + 1}</span></span>
             <span class="face back"><span class="ans">${esc(a[0])}</span><span class="pts">${a[1]}</span></span>
           </span></button>`
        : `<div class="tile empty"></div>`;
    }
    return `<div class="board-wrap ${fo ? "is-faceoff" : ""}">
      <div class="board-head">
        <div class="round-tag">${fo ? `Face-Off <small>Round ${sl.round}</small>` : `Round ${sl.round}`}</div>
        <div class="pot"><span class="pot-label">${fo ? "Top answer" : "Round pot"}</span><span class="pot-val" id="potVal">0</span></div>
        <div class="strikes" id="strikes" ${fo ? "hidden" : ""}><span>✕</span><span>✕</span><span>✕</span></div>
      </div>
      <h2 class="question">${esc(sl.q.q)}</h2>
      <div class="marquee"><div class="board">${tiles}</div></div>
      <div class="board-controls">
        ${fo ? "" : `<button class="btn btn-red" data-act="strike">✕ Strike <kbd>X</kbd></button>
        <button class="btn btn-ghost" data-act="clear-strikes">Clear strikes</button>
        <button class="btn btn-gold" data-act="steal" id="goSteal">⚓ Steal challenge</button>`}
        <button class="btn btn-ghost" data-act="reveal-all" title="Show remaining answers (doesn't add to the pot)">Reveal all</button>
        <button class="btn btn-ghost" data-act="reset-board">Reset board</button>
        <span class="award-status" id="awardStatus"></span>
      </div>
      <p class="hint">${fo
        ? "Click a tile (or press 1–8) as reps answer. Highest-ranked answer wins — give that team its points with the gold <b>+</b> button on the scoreboard."
        : "Click a tile (or press 1–8) when it’s said. 2 strikes → steal. When done, award the pot with the gold <b>+</b> button on the scoreboard."}</p>
    </div>`;
  }

  function minigameHTML(sl) {
    const g = sl.g;
    const reveal = g.reveal ? `<div class="reveal">
        <h3>${esc(g.reveal.label)}</h3>
        ${g.reveal.warn ? `<p class="reveal-warn">${esc(g.reveal.warn)}</p>` : ""}
        <div class="reveal-list">${g.reveal.items.map((it, i) => `<button class="reveal-item" data-ri="${i}"><span class="ri-n">${i + 1}</span><span class="ri-t">${esc(it)}</span><span class="ri-hide">Click to reveal</span></button>`).join("")}</div>
      </div>` : "";
    return `<div class="mg">
      <div class="mg-main">
        <div class="kicker">Minigame ${sl.n} of ${D.minigames.length}</div>
        <h1 class="mg-title">${esc(g.name)}</h1>
        ${g.minutes ? `<span class="chip">${g.minutes} min</span>` : ""}
        <ol class="mg-steps">${g.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
      </div>
      <div class="mg-side">
        <div class="timer" id="timer">
          <div class="timer-val" id="timerVal">0:00</div>
          <div class="timer-btns">
            <button class="btn btn-gold" data-act="t-toggle" id="tToggle">Start</button>
            <button class="btn btn-ghost" data-act="t-add">+30s</button>
            <button class="btn btn-ghost" data-act="t-reset">Reset</button>
          </div>
        </div>
        ${reveal}
      </div>
    </div>`;
  }

  function finalHTML() {
    const ranked = S.teams.map((t, i) => ({ ...t, i })).sort((a, b) => b.score - a.score);
    const max = Math.max(1, ranked[0].score);
    const top = ranked[0].score;
    const winners = ranked.filter((t) => t.score === top && top > 0);
    return `<div class="final">
      <div class="kicker">Final Standings</div>
      <h1 class="screen-title">${winners.length ? esc(winners.map((w) => w.name).join(" & ")) + (winners.length > 1 ? " tie!" : " wins!") : "Who will win?"}</h1>
      <ol class="final-list">${ranked.map((t, r) => `<li class="${t.score === top && top > 0 ? "win" : ""}">
          <span class="f-rank">${r + 1}</span><span class="f-name">${esc(t.name)}</span>
          <span class="f-bar"><span style="width:${Math.max(2, (t.score / max) * 100)}%"></span></span>
          <span class="f-score">${t.score}</span></li>`).join("")}</ol>
    </div><div class="confetti" id="confetti"></div>`;
  }

  /* ---------- Board ---------- */
  function updateBoardUI() {
    const sl = cur(); if (sl.type !== "board") return;
    const b = board(sl.key);
    stage.querySelectorAll(".tile[data-i]").forEach((t) => {
      const v = b.revealed[+t.dataset.i];
      t.classList.toggle("revealed", v === 1);
      t.classList.toggle("shown", v === 2);
    });
    $("#potVal").textContent = potOf(sl);
    const st = $("#strikes");
    if (st) [...st.children].forEach((x, i) => x.classList.toggle("on", i < b.strikes));
    const gs = $("#goSteal");
    if (gs) gs.classList.toggle("pulse", b.strikes >= 2 && b.awarded === null);
    $("#awardStatus").innerHTML = b.awarded !== null
      ? `Awarded <b>${b.amt}</b> to <b>${esc(S.teams[b.awarded].name)}</b> <button class="link" data-act="undo-award">Undo</button>`
      : "";
  }

  function revealTile(i) {
    const sl = cur(); if (sl.type !== "board" || !sl.q.answers[i]) return;
    const b = board(sl.key);
    if (b.revealed[i] === 1) b.revealed[i] = 0; else { b.revealed[i] = 1; sfx.ding(); }
    save(); updateBoardUI(); renderScores();
  }

  function strike() {
    const sl = cur(); if (sl.type !== "board" || sl.kind === "faceoff") return;
    const b = board(sl.key);
    b.strikes = Math.min(3, b.strikes + 1);
    save(); sfx.buzz(); updateBoardUI();
    const o = $("#strikeOverlay");
    o.innerHTML = "<span>✕</span>".repeat(b.strikes);
    o.classList.remove("show"); void o.offsetWidth; o.classList.add("show");
    clearTimeout(strike._t); strike._t = setTimeout(() => o.classList.remove("show"), 1200);
  }

  function award(ti) {
    const sl = cur(); if (sl.type !== "board") return;
    const b = board(sl.key), amt = potOf(sl);
    if (b.awarded !== null || amt <= 0) return;
    S.teams[ti].score += amt; b.awarded = ti; b.amt = amt;
    save(); sfx.award(); updateBoardUI(); renderScores(ti);
    toast(`+${amt} → ${S.teams[ti].name}`);
  }

  function undoAward() {
    const sl = cur(), b = board(sl.key);
    if (b.awarded === null) return;
    S.teams[b.awarded].score -= b.amt; b.awarded = null; b.amt = 0;
    save(); updateBoardUI(); renderScores();
  }

  /* ---------- Scoreboard ---------- */
  function renderScores(bumpIdx) {
    const sl = cur();
    const pot = sl.type === "board" && board(sl.key).awarded === null ? potOf(sl) : 0;
    const max = Math.max(...S.teams.map((t) => t.score));
    sb.innerHTML = S.teams.map((t, i) => `<div class="team ${max > 0 && t.score === max ? "leader" : ""}">
        <span class="team-name" contenteditable="true" spellcheck="false" data-name="${i}" title="Click to rename">${esc(t.name)}</span>
        <button class="team-score ${bumpIdx === i ? "bump" : ""}" data-setscore="${i}" title="Click to type a score">${t.score}</button>
        <div class="team-btns">
          <button data-delta="-5" data-t="${i}" aria-label="Minus 5">−5</button>
          <button data-delta="5" data-t="${i}" aria-label="Plus 5">+5</button>
          ${pot > 0 ? `<button class="award" data-award="${i}" title="Give this team the pot">+${pot}</button>` : ""}
        </div>
      </div>`).join("");
  }

  /* ---------- Steal challenges ---------- */
  let activeCh = null;
  function openSteal() { steal.hidden = false; document.body.classList.add("steal-open"); renderSteal(); }
  function closeSteal() { steal.hidden = true; document.body.classList.remove("steal-open"); activeCh = null; }

  function renderSteal() {
    const playing = (() => { const sl = cur(); return sl.type === "board" && sl.kind === "main" ? sl.round : null; })();
    if (activeCh === null) {
      steal.innerHTML = `<div class="steal-wrap">
        <div class="steal-head">
          <div><div class="kicker">Steal the points</div><h1 class="screen-title">Steal Challenges</h1></div>
          <div class="steal-actions">
            <button class="btn btn-gold" data-act="ch-random">🎲 Random challenge</button>
            <button class="btn btn-ghost" data-act="steal-close">‹ Back to game${playing ? ` (Round ${playing})` : ""}</button>
          </div>
        </div>
        <p class="steal-rules">Call it out — the other teams race to do it. Finish order is steal order. Highest-ranked answer takes the whole pot.</p>
        <div class="ch-grid">${D.challenges.map((c, i) => `<button class="ch-card" data-ch="${i}"><img src="${esc(c.img)}" alt=""><span>${esc(c.name)}</span></button>`).join("")}</div>
      </div>`;
    } else {
      const c = D.challenges[activeCh];
      steal.innerHTML = `<div class="steal-wrap">
        <div class="ch-spot">
          <img src="${esc(c.img)}" alt="${esc(c.name)}">
          <div class="ch-info">
            <h1 class="ch-name">${esc(c.name)}</h1>
            <p class="ch-call">${esc(c.call)}</p>
            <p class="ch-action">${esc(c.action)}</p>
            <div class="order">
              <h3>Finish order <small>(click teams as they finish)</small></h3>
              <div class="order-btns">${orderHTML()}</div>
            </div>
            <div class="spot-actions">
              <button class="btn btn-ghost" data-act="order-reset">Reset order</button>
              <button class="btn btn-ghost" data-act="ch-back">‹ All challenges</button>
              <button class="btn btn-gold" data-act="steal-close">Back to game ›</button>
            </div>
          </div>
        </div>
      </div>`;
    }
  }
  function orderHTML() {
    return S.teams.map((t, i) => {
      const p = S.stealOrder.indexOf(i);
      return `<button class="${p >= 0 ? "placed" : ""}" data-order="${i}">${p >= 0 ? `<b>${ordinal(p + 1)}</b>` : ""}${esc(t.name)}</button>`;
    }).join("");
  }
  function refreshOrder() { const el = $(".order-btns", steal); if (el) el.innerHTML = orderHTML(); }
  const ordinal = (n) => n + ({ 1: "st", 2: "nd", 3: "rd" }[n] || "th");

  function showChallenge(i) { activeCh = i; S.stealOrder = []; save(); renderSteal(); }

  let spinning = false;
  function randomChallenge() {
    if (spinning) return;
    spinning = true;
    const cards = [...steal.querySelectorAll(".ch-card")];
    const target = Math.floor(Math.random() * cards.length);
    const total = cards.length * 3 + target;
    let step = 0, delay = 60;
    const hop = () => {
      cards.forEach((c) => c.classList.remove("pick"));
      cards[step % cards.length].classList.add("pick"); sfx.tick();
      if (step >= total) { setTimeout(() => { spinning = false; sfx.ding(); showChallenge(target); }, 650); return; }
      step++; delay *= 1.09; setTimeout(hop, delay);
    };
    hop();
  }

  /* ---------- Timer ---------- */
  const T = { total: 0, left: 0, end: 0, running: false, id: null };
  function initTimer(min) { stopTimer(); T.total = T.left = min * 60; drawTimer(); }
  function stopTimer() { clearInterval(T.id); T.id = null; T.running = false; }
  function toggleTimer() {
    if (T.running) { T.left = Math.max(0, (T.end - Date.now()) / 1000); stopTimer(); }
    else { if (T.left <= 0) T.left = T.total; T.end = Date.now() + T.left * 1000; T.running = true; T.id = setInterval(tickTimer, 200); }
    drawTimer();
  }
  function tickTimer() {
    T.left = Math.max(0, (T.end - Date.now()) / 1000);
    if (T.left <= 0) { stopTimer(); sfx.buzz(); }
    drawTimer();
  }
  function drawTimer() {
    const el = $("#timerVal"); if (!el) return;
    const s = Math.ceil(T.left);
    el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    $("#timer").classList.toggle("done", T.left <= 0);
    $("#timer").classList.toggle("low", T.left > 0 && T.left <= 10);
    $("#tToggle").textContent = T.running ? "Pause" : (T.left < T.total && T.left > 0 ? "Resume" : "Start");
  }

  /* ---------- Little extras ---------- */
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg;
    t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
  }
  function confetti() {
    const box = $("#confetti"); if (!box) return;
    const colors = ["#ffc83d", "#c0272d", "#4fd1d9", "#6b7fe0", "#fff6dc"];
    box.innerHTML = Array.from({ length: 120 }, () =>
      `<i style="left:${Math.random() * 100}%;background:${colors[Math.floor(Math.random() * colors.length)]};animation-delay:${(Math.random() * 2.5).toFixed(2)}s;animation-duration:${(2.8 + Math.random() * 2.5).toFixed(2)}s;transform:rotate(${Math.random() * 360}deg)"></i>`).join("");
  }

  /* ---------- Events ---------- */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("button, [data-next]");
    if (!el) return;
    const d = el.dataset;
    if (d.next !== undefined) return go(S.slide + 1);
    if (d.go !== undefined) return go(+d.go);
    if (d.i !== undefined && el.classList.contains("tile")) return revealTile(+d.i);
    if (d.award !== undefined) return award(+d.award);
    if (d.delta !== undefined) { S.teams[+d.t].score += +d.delta; save(); return renderScores(+d.t); }
    if (d.setscore !== undefined) {
      const t = S.teams[+d.setscore];
      const v = prompt(`Set score for ${t.name}:`, t.score);
      if (v !== null && v.trim() !== "" && !isNaN(+v)) { t.score = Math.round(+v); save(); renderScores(+d.setscore); }
      return;
    }
    if (d.ch !== undefined) return showChallenge(+d.ch);
    if (d.order !== undefined) {
      const i = +d.order, p = S.stealOrder.indexOf(i);
      if (p >= 0) S.stealOrder.splice(p, 1); else S.stealOrder.push(i);
      save(); return refreshOrder();
    }
    if (d.ri !== undefined) { el.classList.toggle("shown"); if (el.classList.contains("shown")) sfx.ding(); return; }
    switch (d.act) {
      case "strike": return strike();
      case "clear-strikes": board(cur().key).strikes = 0; save(); return updateBoardUI();
      case "reveal-all": {
        const sl = cur(), b = board(sl.key);
        sl.q.answers.forEach((_, i) => { if (!b.revealed[i]) b.revealed[i] = 2; });
        save(); return updateBoardUI();
      }
      case "reset-board": {
        const sl = cur(), b = board(sl.key);
        if (b.awarded !== null && !confirm("This board's points were already awarded. Reset the board anyway? (The team keeps its points — use Undo first to take them back.)")) return;
        S.boards[sl.key] = { revealed: [], strikes: 0, awarded: null, amt: 0 };
        save(); updateBoardUI(); return renderScores();
      }
      case "undo-award": return undoAward();
      case "steal": return openSteal();
      case "steal-close": return closeSteal();
      case "ch-back": activeCh = null; return renderSteal();
      case "ch-random": return randomChallenge();
      case "order-reset": S.stealOrder = []; save(); return refreshOrder();
      case "t-toggle": return toggleTimer();
      case "t-reset": stopTimer(); T.left = T.total; return drawTimer();
      case "t-add": T.left += 30; T.total = Math.max(T.total, T.left); if (T.running) T.end += 30000; return drawTimer();
    }
  });

  $("#prev").addEventListener("click", () => go(S.slide - 1));
  $("#next").addEventListener("click", () => go(S.slide + 1));
  jump.addEventListener("change", () => go(+jump.value));
  $("#stealBtn").addEventListener("click", () => (steal.hidden ? openSteal() : closeSteal()));
  $("#soundBtn").addEventListener("click", () => { S.muted = !S.muted; save(); $("#soundBtn").textContent = S.muted ? "Sound off" : "Sound on"; });
  $("#fsBtn").addEventListener("click", toggleFS);
  $("#resetBtn").addEventListener("click", () => {
    if (!confirm("Reset ALL scores, team names, and boards? This can't be undone.")) return;
    S = fresh(); save(); go(0);
  });
  function toggleFS() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }

  // Team names: edit inline
  sb.addEventListener("input", (e) => {
    const n = e.target.dataset?.name; if (n === undefined) return;
    S.teams[+n].name = e.target.textContent.trim() || `Team ${+n + 1}`; save();
  });
  sb.addEventListener("keydown", (e) => { if (e.target.dataset?.name !== undefined && e.key === "Enter") { e.preventDefault(); e.target.blur(); } });
  sb.addEventListener("focusout", (e) => { if (e.target.dataset?.name !== undefined) renderScores(); });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    const t = e.target;
    if (t.isContentEditable || /INPUT|SELECT|TEXTAREA/.test(t.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === "ArrowRight" || k === "PageDown") { e.preventDefault(); go(S.slide + 1); }
    else if (k === "ArrowLeft" || k === "PageUp") { e.preventDefault(); go(S.slide - 1); }
    else if (/^[1-8]$/.test(k) && steal.hidden) revealTile(+k - 1);
    else if (k === "x" || k === "X") { if (steal.hidden) strike(); }
    else if (k === "s" || k === "S") steal.hidden ? openSteal() : closeSteal();
    else if (k === "Escape" && !steal.hidden) { activeCh !== null ? (activeCh = null, renderSteal()) : closeSteal(); }
    else if (k === "f" || k === "F") toggleFS();
  });

  render();
})();

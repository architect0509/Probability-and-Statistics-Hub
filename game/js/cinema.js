/* =========================================================================
 * 벨레스타 연대기 — 시네마틱 컷씬 (좀비고 스타일)
 *  · 위아래 검은 레터박스 + 아래쪽 어두운 대사 바 + 큰 일러스트
 *  · 등장인물이 실제로 맵 위를 걸어 들어와 자리를 잡고, 말하는 사람 머리 위에 말풍선
 *  · 카메라가 말하는 사람 쪽으로 이동하며 줌인/줌아웃
 *  대사 형식: [누가, 대사, 효과, {walk:[누가,dx,dy], exit:누가, emote:[누가,'!'], zoom:배율, focus:누가}]
 *  (dx, dy는 플레이어 기준 칸)
 * ========================================================================= */
'use strict';
let CAM_FOCUS = null;
let CAM_SPEED = null; // 느린 패닝/줌 (웅장한 연출용)
const CINE = { on: false, phase: '', cast: {}, speaker: null, emote: null, emoteT: 0, zoomK: 1.6, waitT: 0, leaving: [] };

(function cineCss() {
  const st = document.createElement('style');
  st.textContent = `
  #cut { pointer-events: auto; }
  #cut .bar { background: #000; transition: height .55s cubic-bezier(.2,.8,.2,1); z-index: 3; }
  #cut.open .bar.top { height: 9vh; } #cut.open .bar.bot { height: 7vh; }
  #cut .cut-stage { position: absolute; left: 0; right: 0; bottom: 0; top: 0; padding: 0; display: block; z-index: 1; }
  /* 일러스트: 대사 바 위에 서 있는 느낌 (배경 투명 · 얼굴 전부 보이게 · 가슴께만 바에 겹침) */
  #cut .cut-box #cut-left { position: absolute; left: max(3vw, 6px); bottom: calc(100% - 46px); width: min(36vw, 250px); z-index: 0; opacity: 0; transform: translateY(14px); transition: opacity .25s, transform .35s cubic-bezier(.2,1.3,.4,1); pointer-events: none;
    filter: drop-shadow(0 6px 14px rgba(0,0,0,.45)) drop-shadow(0 0 1px rgba(0,0,0,.6)); }
  #cut .cut-box #cut-left.on { opacity: 1; transform: none; } #cut .cut-box #cut-left.dim { opacity: 0; }
  #cut .cut-box #cut-left img, #cut .cut-box #cut-left svg { width: 100%; height: auto; display: block; border: none; border-radius: 0; box-shadow: none; background: transparent; aspect-ratio: auto; object-fit: contain; }
  #cut .cut-box #cut-left .cutpic { width: 100%; aspect-ratio: 5 / 6; background: url(assets/portraits_cut.webp) no-repeat; background-size: 800% 800%; }
  #cut .cut-box > #cut-name, #cut .cut-box > #cut-text { position: relative; z-index: 1; }
  #cut .cut-box > .cut-hint { position: absolute; z-index: 1; }
  #cut #cut-right { display: none; }
  #cut .cut-box { left: 0; right: 0; bottom: 7vh; overflow: visible; transform: none; width: auto; min-height: 0; border: none; border-radius: 0; z-index: 2;
    background: linear-gradient(180deg, rgba(14,12,16,0) 0%, rgba(14,12,16,.82) 22%, rgba(10,9,12,.94) 100%);
    padding: 34px max(6vw, 18px) 20px; color: #f1eee9; box-shadow: none; }
  #cut .cut-box::before { content: ''; position: absolute; left: max(6vw, 18px); right: max(6vw, 18px); top: 66px; height: 1px; background: linear-gradient(90deg, rgba(255,255,255,.35), rgba(255,255,255,.08)); }
  #cut #cut-name { font-size: 19px; font-weight: 900; color: #fff; margin-bottom: 14px; min-height: 24px; letter-spacing: -.3px; text-shadow: 0 2px 0 rgba(0,0,0,.4); }
  #cut #cut-name small { font-size: 12.5px; font-weight: 600; color: #a9a3ad; margin-left: 8px; }
  #cut #cut-text { font-size: 16.5px; font-weight: 600; line-height: 1.75; color: #f1eee9; min-height: 56px; }
  #cut #cut-text.narr { color: #d8d0e6; font-style: italic; }
  #cut .cut-hint { right: max(6vw, 18px); bottom: 6px; color: #8d8794; }
  #cut #cut-skip { top: calc(9vh + 10px); z-index: 4; background: rgba(0,0,0,.45); border-color: rgba(255,255,255,.6); }
  #cut .cine-tag { position: absolute; left: max(6vw, 18px); top: calc(9vh + 12px); z-index: 4; font-size: 11px; font-weight: 900; letter-spacing: 4px; color: rgba(255,255,255,.75); }
  body.cine #hud { opacity: 0 !important; pointer-events: none; transition: opacity .3s; }
  body.cine #joyzone { pointer-events: none; }
  @media (max-width: 640px) { #cut #cut-text { font-size: 15.5px; } #cut .cut-box #cut-left { width: min(44vw, 200px); } }
  @media (max-height: 500px) { #cut .cut-box { padding: 26px max(5vw, 18px) 14px; } #cut .cut-box::before { top: 56px; } #cut #cut-name { font-size: 17px; margin-bottom: 10px; } #cut #cut-text { font-size: 15px; min-height: 44px; line-height: 1.6; } #cut .cut-box #cut-left { width: min(30vw, 46vh); bottom: calc(100% - 38px); } #cut.open .bar.top { height: 7vh; } #cut.open .bar.bot { height: 5vh; } #cut .cut-box { bottom: 5vh; } }`;
  document.head.appendChild(st);
  const cut = document.getElementById('cut');
  // 일러스트를 대사 바 안으로 옮겨서 바 위에 올라서게
  const por = document.getElementById('cut-left'), box = cut && cut.querySelector('.cut-box');
  if (por && box) box.insertBefore(por, box.firstChild);
  if (cut && !cut.querySelector('.cine-tag')) { const t = document.createElement('div'); t.className = 'cine-tag'; t.textContent = '● CUTSCENE'; cut.appendChild(t); }
})();

// 인물 정보
function cineCast(who) {
  if (!who) return null;
  if (NPCS[who]) return { id: who, n: NPCS[who].n, title: NPCS[who].title || '', look: NPCS[who].look };
  if (typeof CUT_CAST !== 'undefined' && CUT_CAST[who]) return { id: who, n: CUT_CAST[who].n, title: CUT_CAST[who].title || '', look: CUT_CAST[who].look };
  return null;
}
// 컷씬용 일러스트: 배경을 지운 버전 (없으면 원본)
function cutPortraitHTML(id, look, mood) {
  const pid = (NPCS[id] && NPCS[id].pic) || (typeof CUT_CAST !== 'undefined' && CUT_CAST[id] && CUT_CAST[id].pic) || id;
  // 배경을 지운 일러스트 57장은 한 장짜리 시트(assets/portraits_cut.webp, 8×8칸)에 모여 있다. 순서 = PORTRAIT_IDS
  const i = typeof PORTRAIT_IDS !== 'undefined' ? PORTRAIT_IDS.indexOf(pid) : -1;
  if (i >= 0) return `<div class="cutpic" role="img" style="background-position:${(i % 8) / 7 * 100}% ${Math.floor(i / 8) / 7 * 100}%"></div>`;
  return portraitHTML(id, look, mood);
}
// 칸 경로 (NPC 무시, 벽만 피함)
function cinePath(sx, sy, gx, gy) {
  if (sx === gx && sy === gy) return [];
  const W = MAP.w, H = MAP.h, key = (x, y) => y * W + x, prev = new Int32Array(W * H).fill(-2);
  prev[key(sx, sy)] = -1; const q = [[sx, sy]]; let n = 0, hit = false;
  while (q.length && n++ < 4000) {
    const [x, y] = q.shift(); if (x === gx && y === gy) { hit = true; break; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const c = MAP.g[ny][nx]; if (SOLID.has(c) || 'D^v'.includes(c)) continue; const k = key(nx, ny); if (prev[k] !== -2) continue; prev[k] = key(x, y); q.push([nx, ny]); }
  }
  if (!hit) return null;
  const path = []; let k = key(gx, gy); while (k >= 0 && k !== key(sx, sy)) { path.unshift([k % W, Math.floor(k / W)]); k = prev[k]; }
  return path;
}
function freeSpot(x, y, taken) { return x >= 0 && y >= 0 && x < MAP.w && y < MAP.h && !SOLID.has(MAP.g[y][x]) && !'D^v'.includes(MAP.g[y][x]) && !(x === PLAYER.x && y === PLAYER.y) && !taken.has(x + ',' + y) && !ACTORS.some(a => a.x === x && a.y === y && !CINE.cast[a.id]); }
const STAGE = [[2, 0], [-2, 0], [1, -2], [-1, -2], [2, -1], [-2, -1], [3, 0], [-3, 0], [0, -2], [2, 1], [-2, 1], [0, 2], [3, -2], [-3, -2]];
function stageSpot(taken, pref) {
  const tryList = pref ? [pref].concat(STAGE) : STAGE;
  for (const [dx, dy] of tryList) { const x = PLAYER.x + dx, y = PLAYER.y + dy; if (freeSpot(x, y, taken) && cinePath(x, y, PLAYER.x, PLAYER.y) !== null) return [x, y]; }
  for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = PLAYER.x + dx, y = PLAYER.y + dy; if (freeSpot(x, y, taken)) return [x, y]; }
  return null;
}
// 먼 곳에서 걸어 들어올 출발점 (플레이어와 길로 이어진 6~9칸 거리)
function entrySpot() {
  const W = MAP.w, H = MAP.h, dist = new Int16Array(W * H).fill(-1), q = [[PLAYER.x, PLAYER.y]]; dist[PLAYER.y * W + PLAYER.x] = 0; const cand = [];
  while (q.length) { const [x, y] = q.shift(), d = dist[y * W + x]; if (d >= 6 && d <= 9) cand.push([x, y]); if (d >= 9) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const c = MAP.g[ny][nx]; if (SOLID.has(c) || 'D^v'.includes(c) || dist[ny * W + nx] >= 0) continue; dist[ny * W + nx] = d + 1; q.push([nx, ny]); } }
  return cand.length ? cand[Math.floor(Math.random() * cand.length)] : null;
}
function cineWalk(a, gx, gy, speed) {
  const p = cinePath(a.x, a.y, gx, gy);
  if (p === null) { a.x = gx; a.y = gy; a.px = gx * TS; a.py = gy * TS; a.cine = null; return; }
  a.cine = { path: p, t: 0, dur: speed || 170 };
}
function faceTo(a, tx, ty) { const dx = tx - a.x, dy = ty - a.y; a.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0); }
function playerFace(tx, ty) { const dx = tx - PLAYER.x, dy = ty - PLAYER.y; if (!dx && !dy) return; PLAYER.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0); }
function castActor(id) { return ACTORS.find(a => a.id === id); }

// 등장인물 배치
function stageCast(ids) {
  const taken = new Set();
  ids.forEach(id => {
    const cc = cineCast(id); if (!cc || !cc.look) return;
    let a = castActor(id);
    const isGuard = NPCS[id] && NPCS[id].guard;
    if (a && (isGuard || Math.abs(a.x - PLAYER.x) + Math.abs(a.y - PLAYER.y) > 26)) { CINE.cast[id] = { a, still: true, home: [a.x, a.y], wander: a.wander, t: a.t }; return; } // 멀리 있거나 수호자는 그 자리에서 (카메라가 찾아감)
    if (!a) {
      if (!SPR[id]) { try { SPR[id] = buildSprite(cc.look); } catch (e) { return; } }
      const s = entrySpot() || [PLAYER.x, PLAYER.y + 3];
      a = { id, x: s[0], y: s[1], px: s[0] * TS, py: s[1] * TS, dir: 0, moving: 0, fr: 0, wander: 0, home: s, t: 1e12, spr: SPR[id], big: !!(NPCS[id] && NPCS[id].big), temp: true, cineTemp: true };
      ACTORS.push(a);
    }
    const spot = stageSpot(taken); if (!spot) return;
    taken.add(spot.join(','));
    CINE.cast[id] = { a, home: [a.x, a.y], wander: a.wander, t: a.t, spot };
    a.wander = 0; a.t = 1e12;
    cineWalk(a, spot[0], spot[1]);
  });
}
function castArrived() { return Object.values(CINE.cast).every(c => c.still || !c.a.cine); }

// ---------- 컷씬 재생 (엔진 함수 교체) ----------
const _engineCutEnd = cutEnd;
playCut = function (c) {
  setFlag('cut_' + c.id); cutOpen = true; clearHeld(); cutQ = c; cutI = -1;
  document.body.classList.add('cine');
  $('#cut').classList.add('open'); $('#hud').style.opacity = '0';
  $('#cut-name').innerHTML = ''; $('#cut-text').innerHTML = ''; $('#cut-text').classList.remove('narr');
  AudioSys.sfx('secret');
  try { AudioSys.play(c.music || 'cinema'); } catch (e) {} // 컷씬 전용 음악
  CINE.on = true; CINE.cast = {}; CINE.speaker = null; CINE.emote = null; CINE.leaving = [];
  CINE.base = targetZoom();
  // 줌아웃으로 시작 → 인물들이 걸어 들어오면 줌인
  cam.target = CINE.base * 0.82;
  CAM_FOCUS = [PLAYER.px + 8, PLAYER.py + 4, .14];
  const ids = []; c.lines.forEach(l => { if (l[0] && !ids.includes(l[0])) ids.push(l[0]); });
  stageCast(ids);
  CINE.phase = 'enter'; CINE.waitT = 0;
};
cutNext = function () {
  if (!cutQ) return;
  if (CINE.phase === 'enter') { Object.values(CINE.cast).forEach(c => { if (c.a.cine) { const p = c.a.cine.path; const l = p[p.length - 1]; if (l) { c.a.x = l[0]; c.a.y = l[1]; c.a.px = l[0] * TS; c.a.py = l[1] * TS; } c.a.cine = null; } }); CINE.phase = 'talk'; }
  const tEl = $('#cut-text');
  if (tEl.classList.contains('typing')) { tEl._finish && tEl._finish(); return; }
  cutI++;
  if (cutI >= cutQ.lines.length) return cutEnd();
  const [who, text, fx, act] = cutQ.lines[cutI];
  const cast = cineCast(who);
  if (act) cineAct(act);
  // 일러스트 (왼쪽 크게)
  const L = $('#cut-left');
  if (cast && cast.look !== null) {
    if (L.dataset.who !== cast.id) { L.classList.remove('on'); L.dataset.who = cast.id; L.innerHTML = cutPortraitHTML(cast.id, cast.look, /!|\?!/.test(text) ? 'surprise' : (NPCS[cast.id] ? NPCS[cast.id].mood : 'sly')); void L.offsetWidth; }
    L.classList.add('on'); L.classList.remove('dim');
  } else { L.classList.remove('on'); L.dataset.who = ''; }
  $('#cut-name').innerHTML = cast ? `${esc(cast.n)}<small>${esc(cast.title || '')}</small>` : '';
  tEl.classList.toggle('narr', !cast);
  tEl.innerHTML = text.replace(/\n/g, '<br>');
  if (!/<code>/.test(text)) typewrite(tEl);
  // 말하는 사람: 카메라 · 말풍선 · 서로 바라보기
  const cc = who && CINE.cast[who], a = cc ? cc.a : (who ? castActor(who) : null);
  CINE.speaker = a || null;
  CINE.emote = a ? (/[!！]/.test(text) ? '!' : /\?/.test(text) ? '?' : /♪/.test(text) ? '♪' : /…|\.\.\./.test(text) ? '…' : '•••') : null; CINE.emoteT = 0;
  if (a) {
    faceTo(a, PLAYER.x, PLAYER.y); playerFace(a.x, a.y); a.hop = 1;
    const far = Math.abs(a.x - PLAYER.x) + Math.abs(a.y - PLAYER.y) > 7;
    CAM_FOCUS = far ? [a.px + 8, a.py, .14] : [(a.px + PLAYER.px) / 2 + 8, (a.py + PLAYER.py) / 2, .14];
    cam.target = CINE.base * (far ? 1.7 : CINE.zoomK);
    Object.values(CINE.cast).forEach(o => { if (o.a !== a) faceTo(o.a, a.x, a.y); });
  } else if (!(act && (act.pan || act.zoom || act.player))) { CAM_FOCUS = [PLAYER.px + 8, PLAYER.py + 4, .14]; cam.target = CINE.base * 1.35; }
  if (fx === 'zoom') { cam.target = CINE.base * 1.95; cam.zoom = Math.max(cam.zoom, CINE.base * 1.7); }
  else if (fx) cutFx(fx);
  AudioSys.sfx('blip');
};
function cineAct(act) {
  if (act.walk) { const [id, dx, dy] = act.walk; let c = CINE.cast[id]; const a = c ? c.a : castActor(id); if (a && (!c || c.still) && !(NPCS[id] && NPCS[id].guard)) { CINE.cast[id] = c = { a, home: [a.x, a.y], wander: a.wander, t: a.t }; a.wander = 0; a.t = 1e12; } if (a && c && !c.still) { const x = PLAYER.x + dx, y = PLAYER.y + dy; if (x >= 0 && y >= 0 && x < MAP.w && y < MAP.h && !SOLID.has(MAP.g[y][x])) cineWalk(a, x, y, 150); } }
  if (act.exit) { const c = CINE.cast[act.exit]; if (c) { const s = entrySpot(); if (s) cineWalk(c.a, s[0], s[1], 120); c.exited = true; } }
  if (act.emote) { const a = castActor(act.emote[0]); if (a) { CINE.speaker = a; CINE.emote = act.emote[1]; CINE.emoteT = 0; } }
  if (act.zoom) cam.target = CINE.base * act.zoom;
  if (act.focus) { const a = castActor(act.focus); if (a) CAM_FOCUS = [a.px + 8, a.py, .14]; }
  if (act.hop) { const a = castActor(act.hop); if (a) a.hop = 1.6; }
  if (act.slow !== undefined) CAM_SPEED = act.slow ? { pan: act.slow, zoom: act.slow * 1.3 } : null;
  if (act.pan) CAM_FOCUS = [act.pan[0] * TS + 8, act.pan[1] * TS + 8, .1];
  if (act.player) CAM_FOCUS = [PLAYER.px + 8, PLAYER.py + 4, .14];
  if (act.title) epicTitle(act.title[0], act.title[1]);
  if (act.sun) sunBurst();
}
cutEnd = function () {
  CAM_SPEED = null;
  try { cineCleanup(); } catch (err) { console.error('[cine]', err); }
  const was = cutQ;
  try { _engineCutEnd(); } catch (err) { console.error('[cutEnd]', err); cutOpen = false; cutQ = null; $('#cut').classList.remove('open'); $('#hud').style.opacity = ''; }
  cutOpen = false; document.body.classList.remove('cine');
  if (was && was.keepMusic) window.BIAS_HOLD = Date.now() + 1500;
  try { if (MAP && !(was && was.keepMusic)) AudioSys.play(MAP.music, isNightMusic()); } catch (e) {}
  if (was && was.onEnd) setTimeout(() => was.onEnd(), 350);
};
function cineCleanup() {
  document.body.classList.remove('cine');
  CINE.on = false; CINE.speaker = null; CINE.emote = null; CAM_FOCUS = null;
  cam.target = targetZoom();
  // 걸어 들어온 사람들은 제자리로 돌아가고, 임시 인물은 퇴장
  Object.entries(CINE.cast).forEach(([id, c]) => {
    if (c.still || !c.home) return;
    const a = c.a;
    if (a.cineTemp) { const s = entrySpot(); a.removeAfter = true; if (s) cineWalk(a, s[0], s[1], 140); if (!a.cine) removeTemp(a); }
    else { cineWalk(a, c.home[0], c.home[1], 190); a.restore = { wander: c.wander, t: 1500 }; }
  });
  CINE.cast = {};
  $('#cut-left').classList.remove('on'); $('#cut-left').dataset.who = '';
}
function removeTemp(a) { const i = ACTORS.indexOf(a); if (i >= 0) ACTORS.splice(i, 1); }

// ---------- 매 프레임 ----------
function updateCinema(dt) {
  ACTORS.slice().forEach(a => { try {
    if (a.hop) a.hop = Math.max(0, a.hop - dt / 260);
    if (!a.cine) return;
    const c = a.cine;
    if (!c.path.length) { a.cine = null; a.fr = 0; if (a.removeAfter) removeTemp(a); if (a.restore) { a.wander = a.restore.wander; a.t = a.restore.t; a.home = [a.x, a.y]; a.restore = null; } return; }
    const [nx, ny] = c.path[0];
    faceTo(a, nx, ny);
    c.t += dt;
    const k = Math.min(1, c.t / c.dur);
    a.px = (a.x + (nx - a.x) * k) * TS; a.py = (a.y + (ny - a.y) * k) * TS;
    a.fr = (Math.floor(c.t / (c.dur / 2)) % 2) + 1;
    if (k >= 1) { a.x = nx; a.y = ny; c.path.shift(); c.t = 0; if (c.path.length % 2 === 0) AudioSys.sfx('step'); }
  } catch (err) { a.cine = null; } });
  if (!CINE.on) return;
  CINE.emoteT += dt;
  if (CINE.phase === 'enter') {
    CINE.waitT += dt;
    // 걸어오는 동안 카메라는 플레이어와 가장 가까이 온 인물 사이
    if (CINE.waitT > 350) cam.target = CINE.base * 1.25;
    if ((castArrived() && CINE.waitT > 700) || CINE.waitT > 3600) { CINE.phase = 'talk'; cutI = -1; cutNext(); }
  }
}
// 말풍선 (화면 좌표)
function drawCinemaScreen(ctx, toScreen, W, H, t, dpr) {
  if (!CINE.on || !CINE.speaker || !CINE.emote) return;
  const a = CINE.speaker, h = a.spr ? a.spr[0][0].height : 26;
  const [x, y] = toScreen(a.px + 8, a.py + 16 - h - 6);
  const pop = Math.min(1, CINE.emoteT / 160), s = (0.6 + 0.4 * pop) * dpr;
  const bw = 34 * s, bh = 24 * s, bx = x + 8 * s, by = y - bh - 4 * s;
  ctx.save();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2a1d2b'; ctx.lineWidth = 2.5 * dpr;
  roundRect(ctx, bx - bw / 2, by, bw, bh, 11 * s); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bx - 8 * s, by + bh - 1); ctx.lineTo(bx - 13 * s, by + bh + 7 * s); ctx.lineTo(bx - 2 * s, by + bh - 1); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(bx - 8 * s, by + bh); ctx.lineTo(bx - 13 * s, by + bh + 7 * s); ctx.lineTo(bx - 2 * s, by + bh); ctx.stroke();
  ctx.fillStyle = '#2a1d2b';
  if (CINE.emote === '•••') { for (let i = 0; i < 3; i++) { const on = Math.floor(t / 260) % 4 > i; ctx.globalAlpha = on ? 1 : .3; ctx.beginPath(); ctx.arc(bx - 9 * s + i * 9 * s, by + bh / 2, 2.8 * s, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
  else { ctx.font = `900 ${15 * s}px "Pretendard Variable",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = CINE.emote === '!' ? '#d6283c' : '#2a1d2b'; ctx.fillText(CINE.emote, bx, by + bh / 2 + 1); }
  ctx.restore();
}

// 초상화 없는 컷씬 인물도 portraits 일러스트로
if (typeof CUT_CAST !== 'undefined') {
  const CP = { cult: 'veil', cult2: 'log', cult3: 'pielle' };
  for (const k in CP) if (CUT_CAST[k]) CUT_CAST[k].pic = CP[k];
  if (CUT_CAST.coin) CUT_CAST.coin.look = null;
}

// ---------- 새 시네마틱 컷씬 ----------
CUTS.push(
  { id: 'cine_castle', map: 'castle', enter: true, lines: [
    [null, '거대한 문이 열린다. 금빛 융단이 왕좌까지 곧게 뻗어 있다.', 'zoom'],
    ['aegis', '「정지! …표본인가. 폐하께서 기다리고 계신다.」', null, { walk: ['aegis', 1, -1] }],
    ['vivian', '「모험가다아아아!」', 'shake', { walk: ['vivian', -1, -1] }],
    ['stokas', '「비비안, 뛰지 말거라. 분산이 커진다.」', null, { walk: ['stokas', 0, -2] }],
    ['vivian', '「…네에.」'],
    ['stokas', '「짐은 스토카스 3세. 그대가 표지판을 모으며 다닌다는 이방인이로군.」', 'zoom'],
    ['stokas', '「동쪽·서쪽·남쪽의 던전에 지식의 결계가 걸려 있다. 자세한 건 짐에게 물어보게.」'],
    ['sigma', '「참고로 알현실 벽의 기호 석판 네 개, 꼭 읽고 가세요. 결계 여는 데도 쳐 줘요!」', null, { walk: ['sigma', 2, 0] }],
    [null, '📜 국왕과 대화하면 「세 던전의 수호자」 퀘스트가 시작된다.'] ] },
  { id: 'cine_guild', map: 'advguild', enter: true, lines: [
    [null, '문을 열자 맥주 냄새와 웃음소리가 쏟아진다. 모험가 길드 「표본의 잔」.', 'zoom'],
    ['barg', '「오오! 새 얼굴이다! 다들 잔 들어!」', 'shake', { walk: ['barg', 0, -2] }],
    ['luna', '「길드마스터님, 아직 등록도 안 하셨어요…」', null, { walk: ['luna', 2, -1] }],
    ['rookie', '「서, 선배님이다! 진짜 모험가다!」', null, { walk: ['rookie', -2, 0] }],
    ['rookie', '「으앗—」', 'shake', { hop: 'rookie' }],
    [null, '피트가 의자에 걸려 철푸덕 넘어진다. 길드가 웃음바다가 된다.'],
    ['barg', '「크하하! 저놈도 처음엔 다 저랬어. 랭크는 루나한테, 무용담은 나한테. 알겠지?」', 'zoom'],
    ['luna', '「매일 의뢰가 새로 들어와요. 하루 다섯 건까지! 잘 부탁드려요~」'] ] },
  { id: 'cine_dunW', map: 'dunW', enter: true, lines: [
    [null, '물 떨어지는 소리. 발목까지 차오른 차가운 물. 추정의 지하수로.', 'zoom'],
    ['g_w1', '「뽀글… 손님이다… 뽀글.」', null, { focus: 'g_w1' }],
    ['g_wb', '「…또 왔구나. 작은 표본으로 큰 결론을 내려는 자가…」', 'shake'],
    [null, '저 멀리 보물 굴 앞에서 반투명한 망령이 고개를 든다. 길을 막은 수호자들에게 말을 걸어 문제를 풀어야 한다.'] ] },
  { id: 'cine_dunS', map: 'dunS', enter: true, lines: [
    [null, '무너진 성벽, 녹슨 깃발, 바닥을 기는 용암. 검정의 폐성채.', 'zoom'],
    ['g_s1', '「정지. 귀무가설에 따르면… 너는 여기 없다.」', null, { focus: 'g_s1' }],
    ['g_sb', '「H₀: 이 도전자는 약하다. 증거를 가져와 봐라. 기각해 줄 테니.」', 'flash'],
    [null, '흑기사의 붉은 눈이 어둠 속에서 빛난다.'] ] },
  { id: 'cine_dunE', map: 'dunE', enter: true, lines: [
    [null, '숨이 턱 막히는 열기. 바닥 틈마다 용암이 흐른다. 범주의 화염 미궁.', 'zoom'],
    ['g_e1', '「관측이 기대와 다르면… 나는 더 뜨거워진다!」', null, { focus: 'g_e1' }],
    ['g_eb', '「Σ (O − E)² / E… 네 오차를 전부 더해 불태워 주마!」', 'shake'],
    [null, '미궁 깊은 곳에서 거대한 날개가 펼쳐지는 소리가 울린다.'] ] }
);
try { (new Image()).src = 'assets/portraits_cut.webp'; } catch (e) {}

// ---------- 웅장한 연출: 큰 금빛 타이틀 · 햇살 · 꽃잎 ----------
(function epicCss() {
  const st = document.createElement('style');
  st.textContent = `
  #epic { position: fixed; inset: 0; z-index: 72; pointer-events: none; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; }
  #epic.on { animation: epicIn 5.2s ease forwards; }
  @keyframes epicIn { 0% { opacity: 0; } 14% { opacity: 1; } 78% { opacity: 1; } 100% { opacity: 0; } }
  #epic .rays { position: absolute; width: 160vmax; height: 160vmax; background: repeating-conic-gradient(from 0deg, rgba(255,233,168,.16) 0deg 6deg, transparent 6deg 18deg); -webkit-mask-image: radial-gradient(circle, #000 0%, transparent 55%); mask-image: radial-gradient(circle, #000 0%, transparent 55%); animation: rays 14s linear infinite; }
  @keyframes rays { to { transform: rotate(360deg); } }
  #epic .t { position: relative; font-size: clamp(54px, 13vw, 120px); font-weight: 900; letter-spacing: .12em; color: #ffd84d; text-shadow: 0 0 30px rgba(255,216,77,.65), 4px 4px 0 #7a2a3a, 8px 8px 0 #2a1d2b; animation: tIn 1.6s cubic-bezier(.2,.9,.2,1) both; font-family: "Pretendard Variable", serif; }
  #epic .s { position: relative; margin-top: 10px; font-size: clamp(14px, 3.4vw, 22px); font-weight: 800; letter-spacing: .6em; color: #fff7e0; text-shadow: 0 2px 8px rgba(0,0,0,.7); animation: tIn 1.6s .6s cubic-bezier(.2,.9,.2,1) both; }
  #epic .line { position: relative; width: min(70vw, 520px); height: 2px; margin: 14px 0 4px; background: linear-gradient(90deg, transparent, #ffd84d, transparent); animation: lineIn 1.4s .3s ease both; }
  @keyframes tIn { from { opacity: 0; transform: scale(1.25); filter: blur(10px); letter-spacing: .5em; } to { opacity: 1; transform: none; filter: none; } }
  @keyframes lineIn { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  #sunflash { position: fixed; inset: 0; z-index: 71; pointer-events: none; background: radial-gradient(circle at 50% 40%, #fffbe8 0%, rgba(255,240,190,.85) 35%, rgba(255,220,140,0) 75%); opacity: 0; }
  #sunflash.on { animation: sun 2.2s ease-out forwards; }
  @keyframes sun { 0% { opacity: 0; } 12% { opacity: 1; } 100% { opacity: 0; } }`;
  document.head.appendChild(st);
  const e = document.createElement('div'); e.id = 'epic'; e.innerHTML = '<div class="rays"></div><div class="t"></div><div class="line"></div><div class="s"></div>'; document.body.appendChild(e);
  const f = document.createElement('div'); f.id = 'sunflash'; document.body.appendChild(f);
})();
function epicTitle(t, sub) {
  const e = document.getElementById('epic'); if (!e) return;
  e.querySelector('.t').textContent = t; e.querySelector('.s').textContent = sub || '';
  e.classList.remove('on'); void e.offsetWidth; e.classList.add('on');
  AudioSys.sfx('level'); setTimeout(() => AudioSys.sfx('secret'), 500);
}
function sunBurst() {
  const f = document.getElementById('sunflash'); if (f) { f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
  AudioSys.sfx('door');
  // 꽃잎 · 나뭇잎이 바람에 흩날림
  const vw = canvas.clientWidth / cam.zoom, vh = canvas.clientHeight / cam.zoom;
  for (let i = 0; i < 70; i++) particles.push({ kind: 'leaf', x: cam.x + Math.random() * vw * 1.6 - vw * .3, y: cam.y + Math.random() * vh * .7 - vh * .2, vx: .3, vy: .2 + Math.random() * .35, life: 6000 + Math.random() * 5000, seed: Math.random() * 9, c: ['#ff8fb3', '#ffd84d', '#ffffff', '#9bd36a'][i % 4] });
}
// 처음 성 밖(마을)으로 나왔을 때
CUTS.push({ id: 'cine_first_out', map: 'town', enter: true, music: 'epic', lines: [
  [null, '문을 열자— 눈부신 햇살이 쏟아진다.', 'flash', { sun: true, zoom: 2.6, player: true }],
  [null, '바람에 꽃잎이 흩날린다. 종탑의 종이 울리기 시작한다.', null, { slow: 1400, zoom: 1.2, player: true }],
  [null, '……', null, { slow: 2200, pan: [43, 35], zoom: .62, title: ['벨레스타', '확 률 과   분 포 의   왕 국'] }],
  [null, '거꾸로 솟아오르는 분수. 끝없이 겹친 붉은 지붕들.', null, { slow: 1800, pan: [43, 30], zoom: .7 }],
  [null, '북쪽 언덕 위에는 왕성이, 동·서·남의 길 끝에는 지식을 가진 자만 들어갈 수 있는 던전이 잠들어 있다고 한다.', null, { slow: 2000, pan: [43, 12], zoom: .66 }],
  [null, '그리고 지금, 이 도시의 분포가 흔들리고 있다.', 'shake', { slow: 1600, pan: [43, 35], zoom: .8 }],
  [null, '당신의 모험이 시작된다.', null, { slow: 900, player: true, zoom: 1.5 }]
] });

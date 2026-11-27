/* =========================================================================
 * 벨레스타 연대기 — 엔진 (상태 · 이동 · 렌더 · 연출 · 대화 턴 시스템 · UI)
 * ========================================================================= */
'use strict';
const $ = s => document.querySelector(s);
const SAVE_KEY = 'belesta_save_v1';
const DAY = 480; // 하루 = 8분
let S = null, MAP = null, LAYER = null;
const ACTORS = [];
let PLAYER = null;
const SPR = {};
const cam = { x: 0, y: 0, zoom: 3, target: 3 };
let dlgOpen = false, panelOpen = false, transitioning = false, started = false;
let canvas, ctx, lightCv, lightCtx, dpr = 1;
const held = { dir: -1, keys: [], joy: false, jx: 0, jy: 0, run: false };
function clearHeld() { held.dir = -1; held.keys = []; held.jx = 0; held.jy = 0; if (window._joyReset) window._joyReset(); }
const particles = [];
let lastT = performance.now(), saveTimer = 0, titleMode = false;

// =========================================================================
// 상태 / 저장
// =========================================================================
function newState(name) {
  return { v: 1, name: (name || '').trim() || '모험가', origin: null, stats: { 힘: 5, 민첩: 5, 지능: 5, 정신: 5, 설득: 5, 운: 5 },
    hp: 28, maxHp: 28, gold: 20, focus: 2, items: { potion: 1 }, status: {}, aff: {}, flags: {}, quests: {}, read: {}, solvedQ: {},
    map: 'town', x: 0, y: 0, dir: 3, time: 140, zoomMul: 1, steps: 0, fishCaught: 0, deaths: 0, daily: 0, playMs: 0, opened: {} };
}
function save() { if (!S) return; try { S.map = MAP ? MAP.id : S.map; localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
function load() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.v === 1 ? s : null; } catch (e) { return null; } }

const has = (id, n = 1) => (S.items[id] || 0) >= n;
const flag = f => !!S.flags[f];
const setFlag = (f, v = true) => { S.flags[f] = v; };
const qStep = (id, startedOnly) => startedOnly ? !!S.quests[id] : (S.quests[id] ? S.quests[id].step : -1);
const qDone = id => !!(S.quests[id] && S.quests[id].done);
function aff(id) { return S.aff[id] !== undefined ? S.aff[id] : (NPCS[id] ? NPCS[id].aff || 0 : 0); }

const STATUS_MOD = { 피로: { 민첩: -2, 힘: -1 }, 혼란: { 지능: -2 }, 저주: { 운: -3 }, 의심받음: { 설득: -3 }, 고양: { 정신: 2, 설득: 1 }, 축복: { 운: 2 }, 출혈: {} };
const STATUS_DESC = { 피로: '민첩 −2 · 힘 −1', 혼란: '지능 −2', 저주: '운 −3', 의심받음: '설득 −3', 고양: '정신 +2 · 설득 +1', 축복: '운 +2', 출혈: '걸을 때마다 HP가 샌다' };
function statVal(st) {
  let v = S.stats[st];
  for (const k in S.status) if (STATUS_MOD[k] && STATUS_MOD[k][st]) v += STATUS_MOD[k][st];
  for (const id in S.items) if (S.items[id] > 0 && ITEMS[id] && ITEMS[id].passive && ITEMS[id].passive[st]) v += ITEMS[id].passive[st];
  if (flag('konami') && st === '운') v += 1;
  return v;
}

// =========================================================================
// 판정
// =========================================================================
let focusArmed = false;
function check(stat, dc) {
  const roll = 1 + Math.floor(Math.random() * 20);
  let mod = statVal(stat) - 5;
  let fb = 0;
  if (focusArmed && S.focus > 0) { S.focus--; fb = 3; focusArmed = false; syncFocusBtn(); }
  if ((MAP && MAP.dark) && stat === '정신' && has('torch')) mod += 2;
  const total = roll + mod + fb;
  const ok = roll === 20 || (roll !== 1 && total >= dc);
  AudioSys.sfx('dice');
  const line = `🎲 ${stat} 판정 · d20(${roll})${mod >= 0 ? ' + ' + mod : ' − ' + (-mod)}${fb ? ' + 집중 3' : ''} = <b>${total}</b> / 난이도 ${dc} → <b class="${ok ? 'ok' : 'ng'}">${roll === 20 ? '대성공!' : roll === 1 ? '대실패…' : ok ? '성공' : '실패'}</b>`;
  return { ok, roll, total, line, crit: roll === 20, fumble: roll === 1 };
}

// =========================================================================
// 효과 적용
// =========================================================================
function give(id, n = 1) { S.items[id] = (S.items[id] || 0) + n; checkMainProgress(); }
function take(id, n = 1) { S.items[id] = Math.max(0, (S.items[id] || 0) - n); if (!S.items[id]) delete S.items[id]; }
function setQ(id, step) {
  if (!QUESTS[id]) return null;
  const q = S.quests[id];
  if (!q) { S.quests[id] = { step, done: false }; toast(`📜 새 퀘스트 · ${QUESTS[id].t}`); return `📜 퀘스트 시작: ${QUESTS[id].t}`; }
  if (!q.done && step > q.step) { q.step = step; toast(`📜 ${QUESTS[id].t} 진행`); return `📜 퀘스트 진행: ${QUESTS[id].t}`; }
  return null;
}
function doneQ(id) {
  if (!S.quests[id]) S.quests[id] = { step: 0, done: false };
  if (S.quests[id].done) return null;
  S.quests[id].done = true; AudioSys.sfx('level'); toast(`✅ 퀘스트 완료 · ${QUESTS[id].t}`);
  return `✅ 퀘스트 완료: ${QUESTS[id].t}`;
}
function checkMainProgress() {
  if (!S) return;
  if (has('seal_est') && has('seal_test') && has('seal_cat') && qStep('main') <= 1 && !qDone('main')) setQ('main', 2);
}
function applyFx(fx, npcId) {
  const out = [];
  if (!fx) return out;
  if (typeof fx === 'function') fx = fx(S) || {};
  if (fx.hp) { const before = S.hp; S.hp = Math.max(0, Math.min(S.maxHp, S.hp + fx.hp)); out.push(`❤ HP ${fx.hp > 0 ? '+' : ''}${S.hp - before}`); if (fx.hp < 0) { AudioSys.sfx('hit'); shake(fx.hp < -4 ? 6 : 3); } }
  if (fx.heal) { const b = S.hp; S.hp = Math.min(S.maxHp, S.hp + fx.heal); out.push(`❤ HP +${S.hp - b}`); }
  if (fx.gold && fx.gold > 0 && HALF_REWARD) { fx = Object.assign({}, fx, { gold: Math.ceil(fx.gold / 2) }); HALF_REWARD = false; out.push('📖 풀이를 보고 맞혀서 보상 절반'); }
  if (fx.gold) { const b = S.gold; S.gold = Math.max(0, S.gold + fx.gold); out.push(`🪙 골드 ${fx.gold > 0 ? '+' : ''}${S.gold - b}`); if (fx.gold > 0) AudioSys.sfx('coin'); }
  if (fx.focus) { S.focus = Math.max(0, Math.min(9, S.focus + fx.focus)); out.push(`🎯 집중력 ${fx.focus > 0 ? '+' : ''}${fx.focus}`); }
  if (fx.aff && npcId) { S.aff[npcId] = Math.max(-5, Math.min(5, aff(npcId) + fx.aff)); out.push(`${fx.aff > 0 ? '💗 호감 ▲' : '💢 호감 ▼'} (${NPCS[npcId].n})`); }
  if (fx.affs) for (const k in fx.affs) { S.aff[k] = Math.max(-5, Math.min(5, aff(k) + fx.affs[k])); out.push(`${fx.affs[k] > 0 ? '💗' : '💢'} ${NPCS[k].n} 호감 ${fx.affs[k] > 0 ? '▲' : '▼'}`); }
  if (fx.take) { take(fx.take); out.push(`➖ ${ITEMS[fx.take].e} ${ITEMS[fx.take].n}`); }
  if (fx.item) { give(fx.item); out.push(`➕ ${ITEMS[fx.item].e} ${ITEMS[fx.item].n}`); }
  if (fx.items) for (const k in fx.items) { give(k, fx.items[k]); out.push(`➕ ${ITEMS[k].e} ${ITEMS[k].n} ×${fx.items[k]}`); }
  if (fx.status) for (const k in fx.status) { S.status[k] = Math.max(S.status[k] || 0, fx.status[k]); out.push(`${['고양', '축복'].includes(k) ? '✨' : '⚠'} ${k}(${fx.status[k]}) · ${STATUS_DESC[k]}`); }
  if (fx.cure) fx.cure.forEach(k => { if (S.status[k]) { delete S.status[k]; out.push(`✨ ${k} 해제`); } });
  if (fx.flag) setFlag(fx.flag);
  if (fx.flag2) setFlag(fx.flag2);
  if (fx.quest) { const l = setQ(fx.quest[0], fx.quest[1]); if (l) out.push(l); }
  if (fx.questDone) { const l = doneQ(fx.questDone); if (l) out.push(l); }
  if (fx.dailyInc) { S.daily = (S.daily || 0) + 1; if (!S.quests.daily) setQ('daily', 0); if (S.daily >= 3 && !qDone('daily')) { out.push(doneQ('daily')); S.gold += 20; out.push('🪙 의뢰 보너스 +20'); } }
  if (fx.warp) setTimeout(() => warpTo(fx.warp, null, null), 50);
  if (fx.ach) ach(fx.ach);
  checkMainProgress();
  syncHUD();
  return out.filter(Boolean);
}
function tickStatus(n = 1) {
  for (const k in S.status) { S.status[k] -= n; if (S.status[k] <= 0) delete S.status[k]; }
}

// =========================================================================
// 대화 턴 UI
// =========================================================================
let curTurn = null, typeTimer = null;
function statusHTML() {
  const st = Object.keys(S.status);
  const pot = S.items.potion || 0;
  const loc = MAP ? MAP.name : '';
  const hpPct = Math.round(S.hp / S.maxHp * 100);
  return `<div class="st-row"><span class="st-hp"><i style="width:${hpPct}%"></i><em>HP ${S.hp}/${S.maxHp}</em></span>
    <span>🪙 ${S.gold}</span><span>🎯 ${S.focus}</span><span>🧪 ${pot}</span></div>
    <div class="st-row"><span>📍 ${loc}</span><span>${st.length ? st.map(k => `<b class="${['고양', '축복'].includes(k) ? 'buff' : 'debuff'}">${k}(${S.status[k]})</b>`).join(' ') : '상태이상 없음'}</span></div>`;
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
// 읽기 쉽게: 대사(「…」)는 따로 줄, 긴 서술은 두 문장씩 끊기
function fmtLine(l) {
  if (!l.trim() || /<(div|ol|li|code|table)/.test(l)) return l;
  const parts = []; let rest = l;
  const re = /「[^」]*」[.!?…~]*/g; let m, last = 0;
  while ((m = re.exec(l))) { if (m.index > last) parts.push(['n', l.slice(last, m.index)]); parts.push(['q', m[0]]); last = m.index + m[0].length; }
  if (last < l.length) parts.push(['n', l.slice(last)]);
  const out = [];
  parts.forEach(([k, t]) => {
    t = t.trim(); if (!t) return;
    if (k === 'q') { out.push(`<span class="say">${t}</span>`); return; }
    // 서술: 문장 단위로 나눠 두 문장씩 한 줄
    if (/<[a-z]/i.test(t)) { out.push(t); return; }
    const sents = t.match(/[^.!?…]+[.!?…]+["'」)]?|[^.!?…]+$/g) || [t];
    let buf = '';
    sents.forEach((x, i) => { buf += x; if ((i % 2 === 1 || buf.length > 46) && i < sents.length - 1) { out.push(buf.trim()); buf = ''; } });
    if (buf.trim()) out.push(buf.trim());
  });
  return out.join('<br>');
}
function fmtText(s) { return String(s).split('\n').map(fmtLine).join('<br>'); }

function openTurn(turn) {
  if (!turn) { closeDlg(); return; }
  curTurn = turn; dlgOpen = true; clearHeld();
  const d = $('#dlg'); d.classList.add('open');
  // 초상화
  const pt = $('#dlg-portrait');
  if (turn.who && NPCS[turn.who]) {
    const n = NPCS[turn.who], a = aff(turn.who);
    const mood = turn.mood || (a <= -3 ? 'angry' : a >= 3 ? 'happy' : n.mood);
    pt.innerHTML = portraitHTML(turn.who, n.look, mood);
    $('#dlg-name').innerHTML = `${esc(n.n)} <small>${esc(n.title)}</small>`;
    $('#dlg-aff').innerHTML = affHearts(a);
  } else {
    pt.innerHTML = turn.svg || objectSVG(turn.obj || 'sign');
    $('#dlg-name').innerHTML = `${esc(turn.title || '')} ${turn.sub ? `<small>${esc(turn.sub)}</small>` : ''}`;
    $('#dlg-aff').innerHTML = '';
  }
  // 본문
  const descEl = $('#dlg-desc');
  const full = (turn.roll ? `<div class="roll">${turn.roll}</div>` : '') + `<div class="txt">${fmtText(turn.desc || '')}</div>` + (turn.fx && turn.fx.length ? `<div class="fx">${turn.fx.map(esc).join('<br>')}</div>` : '');
  descEl.innerHTML = full;
  { const dr = document.querySelector('.dlg-right'); if (dr) dr.scrollTop = 0; }
  typewrite(descEl.querySelector('.txt'));
  $('#dlg-status').innerHTML = statusHTML();
  // 선택지 3개
  const ch = (turn.choices || []).slice(0, 3);
  while (ch.length < 3) ch.push({ t: '자리를 뜬다', tag: '', run: () => null });
  const box = $('#dlg-choices'); box.innerHTML = '';
  ch.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'choice';
    const st = c.tag && (String(c.tag).match(/^(힘|민첩|지능|정신|설득|운)/) || [])[1]; const stc = 't-' + ({ 힘: 'str', 민첩: 'dex', 지능: 'int', 정신: 'wil', 설득: 'cha', 운: 'luk' }[st] || (/🪙|G|골드/.test(c.tag || '') ? 'gold' : /📝|문제|퀴즈/.test(c.tag || '') ? 'quiz' : 'none')); b.innerHTML = `<span class="num">${i + 1}</span><span class="ct">${esc(c.t)}</span>${c.tag ? `<span class="tag ${stc}">${c.tag}</span>` : ''}`;
    b.onclick = () => pick(i);
    box.appendChild(b);
  });
  box._choices = ch;
  const inp = $('#dlg-input'); inp.value = ''; inp.placeholder = turn.freeHint || '직접 행동 입력 (예: 노려본다, 동전을 던진다, 힌트)';
  syncFocusBtn();
  renderHelp(turn);
  AudioSys.sfx('open');
}
function affHearts(a) { const n = a + 5; let s = ''; for (let i = 0; i < 10; i++) s += `<i class="${i < n ? (a < 0 ? 'neg' : 'on') : ''}"></i>`; return `<span class="aff" title="호감도 ${a}">${s}</span>`; }
function typewrite(el) {
  if (!el) return;
  clearInterval(typeTimer);
  if (typeof symbolize === 'function') symbolize(el);
  if (typeof glossify === 'function') glossify(el);
  const html = el.innerHTML;
  const tmp = el.cloneNode(true); tmp.querySelectorAll('br').forEach(b => b.replaceWith('\n')); tmp.querySelectorAll('div,li,ol').forEach(b => b.append('\n'));
  const text = tmp.textContent;
  if (text.length < 4) return;
  el.innerHTML = ''; let i = 0;
  const step = Math.max(2, Math.round(text.length / 60));
  el.classList.add('typing');
  typeTimer = setInterval(() => {
    i += step;
    if (i >= text.length) { clearInterval(typeTimer); el.innerHTML = html; el.classList.remove('typing'); return; }
    el.textContent = text.slice(0, i);
    if (i % 6 < step) AudioSys.sfx('blip');
  }, 16);
  el._finish = () => { clearInterval(typeTimer); el.innerHTML = html; el.classList.remove('typing'); };
}
function pick(i) {
  const box = $('#dlg-choices'); const c = box._choices && box._choices[i]; if (!c) return;
  const t = $('#dlg-desc .txt'); if (t && t.classList.contains('typing')) { t._finish(); return; }
  AudioSys.sfx('select');
  const next = c.run();
  afterRun(next);
}
function afterRun(next) {
  if (S.hp <= 0 && !(next && next.isDeath)) { openTurn(deathTurn()); return; }
  if (next && next.then) { next.then(openTurn); return; }
  if (next) openTurn(next); else closeDlg();
  save();
}
function submitFree() {
  const v = $('#dlg-input').value.trim(); if (!v || !curTurn) return;
  AudioSys.sfx('select');
  const next = curTurn.free ? curTurn.free(v) : genericFree(curTurn.who, v, curTurn);
  afterRun(next);
}
function closeDlg() {
  $('#dlg').classList.remove('open'); dlgOpen = false; curTurn = null; focusArmed = false;
  AudioSys.sfx('close'); syncHUD(); save();
  if (S && S.pendingGrow) { const g = S.pendingGrow; S.pendingGrow = null; setTimeout(() => openTurn(growTurn(g)), 80); return; }
  if (typeof afterDlgHook === 'function') setTimeout(afterDlgHook, 250);
}
function syncFocusBtn() { const b = $('#focus-btn'); if (!b) return; b.classList.toggle('on', focusArmed); b.disabled = S.focus <= 0; b.textContent = focusArmed ? '🎯 집중 준비됨 (+3)' : `🎯 집중 사용 (${S.focus})`; }

// 선택지 태그 (스탯·난이도·위험 한눈에)
function tagFor(a) {
  const parts = [];
  if (a.cost && a.cost.gold) parts.push(`🪙${a.cost.gold}`);
  if (a.s) parts.push(`${a.s} ${a.dc}`);
  if (a.quiz) parts.push('📝 문제');
  if (a.go) parts.push('…');
  if (a.failFx && a.s) { const f = a.failFx; const r = []; if (f.hp) r.push(`HP${f.hp}`); if (f.gold) r.push(`G${f.gold}`); if (f.status) r.push(Object.keys(f.status)[0]); if (f.aff && f.aff < 0) r.push('호감↓'); if (r.length) parts.push('실패 시 ' + r.join('·')); }
  return parts.join(' · ');
}

// =========================================================================
// NPC 대화
// =========================================================================
function actAvailable(a) {
  if (a.leave) return false;
  if (a.req && !a.req(S)) return false;
  if (a.once && flag('once_' + a.once)) return false;
  return true;
}
function moodLine(id) {
  const a = aff(id);
  if (a <= -3) return '\n<span class="mood bad">(눈빛이 차갑다. 당신을 반기지 않는다.)</span>';
  if (a <= -1) return '\n<span class="mood bad">(경계하는 기색이다.)</span>';
  if (a >= 3) return '\n<span class="mood good">(당신을 보자 표정이 풀린다.)</span>';
  return '';
}
function npcTurn(id, pre, extra) {
  const n = NPCS[id]; if (!n) return null;
  const first = !S.flags['met_' + id];
  S.flags['met_' + id] = true;
  let base = first ? n.intro : n.again[Math.floor(Math.random() * n.again.length)];
  if (typeof base === 'function') base = base(S);
  const acts = n.acts.filter(actAvailable).slice(0, 3);
  const choices = acts.map(a => ({ t: a.t, tag: tagFor(a), run: () => resolveAct(id, a) }));
  if (choices.length < 3 && !n.guard && id !== 'easy' && !acts.some(a => a.quiz)) choices.push({ t: '문제 하나 내 달라고 한다', tag: '📝 정답 시 🪙+6 · 호감↑', run: () => quizAct(id, { quiz: { ch: 0, okFx: { gold: 6, aff: 1 }, failFx: {}, okText: '「오, 제법인데?」', failText: '「…다음엔 맞히겠지.」' } }) });
  return Object.assign({ who: id, desc: (pre ? pre + '\n\n— ' : '') + base + moodLine(id), choices, free: txt => genericFree(id, txt) }, extra || {});
}
function resolveAct(id, a) {
  const n = NPCS[id];
  if (a.cost && a.cost.gold && S.gold < a.cost.gold) return npcTurn(id, `주머니를 뒤졌지만 ${a.cost.gold}골드가 없다. ${n.n}이(가) 기다리다 시선을 돌린다.`);
  if (a.go) return a.go(n);
  if (a.quiz) return quizAct(id, a);
  let costLine = [];
  if (a.cost && a.cost.gold) costLine = applyFx({ gold: -a.cost.gold }, id);
  let ok = true, roll = null;
  if (a.s) { const r = check(a.s, a.dc + (aff(id) <= -3 && a.s === '설득' ? 2 : 0)); ok = r.ok; roll = r.line; }
  const text = ok ? (typeof a.ok === 'function' ? a.ok(S) : a.ok) : (typeof a.fail === 'function' ? a.fail(S) : a.fail);
  let fx = ok ? a.okFx : a.failFx; if (typeof fx === 'function') fx = fx(S) || {};
  const lines = costLine.concat(applyFx(fx, id));
  if (ok && a.once) setFlag('once_' + a.once);
  if (fx && fx.grow) S.pendingGrow = { from: id };
  AudioSys.sfx(a.s ? (ok ? 'ok' : 'fail') : 'select');
  const t = npcTurn(id, text, {});
  t.roll = roll; t.fx = lines; t.mood = a.s ? (ok ? 'happy' : (aff(id) < 0 ? 'angry' : 'surprise')) : undefined;
  return t;
}

// =========================================================================
// 퀴즈 턴
// =========================================================================
function pickQuiz(ch) {
  let pool = QUIZ.filter(q => !ch || q.ch === ch);
  const fresh = pool.filter(q => !S.solvedQ[q.id]);
  if (fresh.length) pool = fresh;
  return pool[Math.floor(Math.random() * pool.length)];
}
function shuffle(a) { return a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]); }
function quizTurn(o) {
  const q = o.q || pickQuiz(o.ch);
  const opts = shuffle([{ t: q.a, ok: true }, { t: q.w[0], ok: false }, { t: q.w[1], ok: false }]);
  const head = o.head || '';
  const done = (ok, picked) => {
    if (ok) { S.solvedQ[q.id] = true; AudioSys.sfx('ok'); if (o.peeked) HALF_REWARD = true; } else AudioSys.sfx('fail');
    const res = o.after(ok, q);
    HALF_REWARD = false;
    const nextQ = res && res.help && res.help.q && res.help.q !== q; // 연속 문제: 다음 문제의 힌트는 그대로
    if (res && !ok && res.isQuiz) {
      // 연속 문제에서 틀리면: 먼저 해설을 보여 주고, 「다음 문제」를 눌러야 넘어간다
      res.desc = (res.desc || '').replace(/^<span class="ex">❌ 오답[\s\S]*?<\/span>\n\n/, '');
      const head2 = (o.head || '').replace(/ · \d+\/\d+.*$/, '');
      const wrap = { who: o.who, obj: o.obj, title: o.title, sub: o.sub, mood: 'sly', fx: res.fx, roll: res.roll,
        desc: `${head2 ? head2 + '\n' : ''}<b>❌ 오답이에요.</b> 해설을 확인하고 다음 문제로 넘어가세요.\n` + solutionHTML(q, true, picked),
        choices: [{ t: '다음 문제로 넘어간다 ▶', tag: '📝 다음 문제', run: () => res }] };
      res.fx = undefined; res.roll = undefined;
      return wrap;
    }
    if (res && !ok) { res.desc = (res.desc || '') + solutionHTML(q, true, picked); if (!nextQ) res.help = null; }
    else if (res && ok && QUIZ_HELP[q.id] && !nextQ) res.help = { q, after: true };
    return res;
  };
  return {
    isQuiz: true,
    who: o.who, obj: o.obj, title: o.title, sub: o.sub,
    help: { q, o },
    desc: `${head}<div class="quiz"><span class="qch">${q.ch}장</span> ${esc(q.q).replace(/\n/g, '<br>')}</div>${o.hint ? `<div class="hint">💡 힌트: ${esc(o.hint)}</div>` : ''}${o.showF ? formulaHTML(q) : ''}${o.peeked ? solutionHTML(q, false) : ''}`,
    choices: opts.map(op => ({ t: op.t, tag: '답 제출', run: () => done(op.ok, op.t) })),
    freeHint: '숫자로 답하거나 「공식」, 「풀이」, 「모르겠다」라고 입력',
    free: txt => {
      if (/공식/.test(txt)) return quizTurn(Object.assign({}, o, { q, showF: true }));
      if (/풀이|모르겠|몰라|해설|답\s*알려/.test(txt)) return quizTurn(Object.assign({}, o, { q, showF: true, peeked: true }));
      if (/힌트|hint/i.test(txt)) {
        if (S.focus <= 0) return Object.assign(quizTurn(Object.assign({}, o, { q })), { roll: '🎯 집중력이 없다. 머리가 멍하다.' });
        S.focus--; syncHUD();
        return quizTurn(Object.assign({}, o, { q, hint: q.ex.split(/[→=]/)[0].slice(0, 40) + '…' }));
      }
      const num = parseFloat(txt.replace(/[^0-9.\-]/g, ''));
      if (q.num !== undefined && !isNaN(num)) return done(Math.abs(num - q.num) <= (q.tol || 0.01) || (q.num < 0 && Math.abs(-num - q.num) <= (q.tol || .01) && /-|−/.test(txt)), txt);
      const core = q.a.replace(/^약\s*/, '').replace(/\s/g, '');
      if (txt.replace(/\s/g, '').includes(core) || (core.length > 2 && core.includes(txt.replace(/\s/g, '')) && txt.length >= 3)) return done(true);
      return done(false, txt);
    }
  };
}
function quizAct(id, a) {
  const z = a.quiz;
  const pre = [];
  if (z.startQuest && !S.quests[z.startQuest]) { const l = setQ(z.startQuest, 0); if (l) pre.push(l); }
  const head = `${NPCS[id].n}이(가) 문제를 낸다.${pre.length ? '\n' + pre.join('\n') : ''}`;
  return quizTurn({ who: id, ch: z.ch, head, after: (ok, q) => {
    const fx = applyFx(ok ? z.okFx : z.failFx, id);
    if (ok && (z.once || a.once)) setFlag('once_' + (z.once || a.once));
    if (ok && z.okFx && z.okFx.grow) S.pendingGrow = { from: id };
    const t = npcTurn(id, (ok ? '⭕ 정답. ' + z.okText : '❌ 오답. ' + z.failText) + `\n<span class="ex">해설: ${esc(q.ex)}</span>`);
    t.fx = fx; t.mood = ok ? 'happy' : 'neutral'; return t;
  } });
}
// 여러 문제 연속 (인장 시험)
function trialTurn(npc, ch, n, need, okFx, okText, failFx, failText) {
  if (npc.id === 'categoria' && flag('twins_reported')) { n = 1; need = 1; }
  let i = 0, right = 0;
  const next = () => quizTurn({ who: npc.id, ch, head: `${npc.n}의 시험 · ${i + 1}/${n} (필요 정답 ${need})`, after: (ok, q) => {
    i++; if (ok) right++;
    const feedback = `${ok ? '⭕ 정답' : '❌ 오답'} · 해설: ${q.ex}`;
    if (i < n && right + (n - i) >= need) { const t = next(); t.desc = `<span class="ex">${esc(feedback)}</span>\n\n` + t.desc; return t; }
    const pass = right >= need;
    const fx = applyFx(pass ? okFx : failFx, npc.id);
    if (pass && okFx.grow) S.pendingGrow = { from: npc.id };
    const t = npcTurn(npc.id, `<span class="ex">${esc(feedback)}</span>\n\n${pass ? okText : failText}`);
    t.fx = fx; t.mood = pass ? 'happy' : 'angry'; return t;
  } });
  return next();
}

// =========================================================================
// 직접 입력 (키워드로 행동 해석 → 스탯 판정)
// =========================================================================
const KW = [
  ['힘', /때리|친다|치고|밀어|밀친|공격|싸우|부수|들어\s?올|힘으로|잡아당|베어|베기|박치기|주먹|발로/],
  ['민첩', /훔치|슬쩍|피하|도망|숨|달리|빨리|몰래|던지|잽싸|재빨|소매치기|뒤지/],
  ['지능', /분석|계산|조사|관찰|살펴|읽|추리|생각|검정|추정|공식|논리|따져/],
  ['정신', /참는|참아|버티|명상|기도|진정|집중|노려|침착|심호흡|견디/],
  ['운', /운에|찍|동전|아무거나|랜덤|주사위|대충|기적/],
  ['설득', /설득|부탁|칭찬|협상|거래|말을|사과|농담|꼬시|위로|부드럽|웃으|인사|애원|협박/]
];
function genericFree(id, txt, turnCtx) {
  const t = txt.trim();
  const egg = easterFree(t, id); if (egg) return egg;
  const n = id ? NPCS[id] : null;
  // 질문 → 그 NPC의 관심 주제(2학기 내용) 이야기
  if (n && /묻|질문|알려|설명|가르|뭐야|뭔가요|뭐예요|어떻게|왜\?|\?$/.test(t) && !/때리|훔치/.test(t)) {
    return npcTurn(id, `당신의 질문에 ${n.n}이(가) 잠시 생각한다.\n「${n.topic}」`);
  }
  // 선물 / 돈
  if (n && /선물|돈을|골드를|팁|뇌물|사례/.test(t)) {
    if (S.gold < 5) return npcTurn(id, '줄 돈이 없다는 걸 깨닫는다. 손이 허공에서 머쓱하게 멈춘다.');
    const fx = applyFx({ gold: -5, aff: aff(id) < -2 ? 0 : 1 }, id);
    const tt = npcTurn(id, `5골드를 건넨다. ${n.n}이(가) ${aff(id) < -2 ? '받기는 받는다. 고맙다는 말은 없다.' : '동전을 받아 넣는다. 표정이 조금 누그러진다.'}`); tt.fx = fx; return tt;
  }
  let stat = null;
  for (const [s, re] of KW) if (re.test(t)) { stat = s; break; }
  if (!stat) stat = n ? '설득' : '지능';
  const aggressive = stat === '힘' && /때리|공격|싸우|주먹|박치기|죽/.test(t);
  const dc = 12 + (n ? -Math.round(aff(id) / 2) : 0) + (aggressive ? 3 : 0);
  const r = check(stat, dc);
  const who = n ? n.n : '주변';
  let text, fx;
  if (r.ok) {
    text = {
      힘: `「${t}」 — 힘으로 밀어붙였다. ${n ? `${who}이(가) 한 발 물러선다. ${aggressive ? '눈빛에 두려움 반, 분노 반.' : '의외라는 눈치다.'}` : '뭔가가 움직였다.'}`,
      민첩: `「${t}」 — 재빠르게 해냈다. ${n ? `${who}은(는) 눈치채지 못한 것 같다. 아마도.` : '아무도 못 봤다.'}`,
      지능: `「${t}」 — 머리를 굴린 보람이 있다. ${n ? `${who}이(가) 당신을 다시 본다.` : '숨은 규칙 하나가 눈에 들어온다.'}`,
      정신: `「${t}」 — 흔들리지 않았다. ${n ? `${who}이(가) 먼저 시선을 피한다.` : '숨이 고르다.'}`,
      설득: `「${t}」 — 말이 먹혔다. ${n ? `${who}의 표정이 한결 부드러워진다.` : ''}`,
      운: `「${t}」 — 주사위가 당신 편이었다. ${n ? `${who}이(가) 어이없다는 듯 웃는다.` : '바닥에서 동전이 반짝인다.'}`
    }[stat];
    fx = { 힘: { aff: aggressive ? -2 : 0 }, 민첩: Math.random() < .5 ? { gold: 2 + (Math.random() * 5 | 0) } : {}, 지능: { focus: 1 }, 정신: { status: { 고양: 2 } }, 설득: { aff: 1 }, 운: { gold: 3 + (Math.random() * 6 | 0) } }[stat];
    if (n && !aggressive && stat !== '설득') fx = Object.assign({ aff: stat === '민첩' && /훔치|슬쩍|소매치기/.test(t) ? 0 : 1 }, fx);
  } else {
    text = {
      힘: `「${t}」 — 생각보다 단단했다. ${n ? `${who}이(가) 당신을 밀쳐낸다. ${aggressive ? '주변 사람들이 수군거린다.' : ''}` : '손목만 시큰하다.'}`,
      민첩: `「${t}」 — 발이 꼬였다. ${n ? `${who}의 눈이 가늘어진다. 「…방금 뭐 하려던 거야?」` : '요란한 소리가 났다.'}`,
      지능: `「${t}」 — 머릿속에서 숫자들이 엉켰다. 자유도가 몇이었더라.`,
      정신: `「${t}」 — 먼저 무너진 건 당신 쪽이었다. 다리에 힘이 풀린다.`,
      설득: `「${t}」 — 말이 헛나갔다. ${n ? `${who}이(가) 대답 대신 한숨을 쉰다.` : ''}`,
      운: `「${t}」 — 주사위가 등을 돌렸다. 주머니에서 동전이 굴러 하수구로 들어간다.`
    }[stat];
    fx = { 힘: { hp: aggressive ? -5 : -3, aff: aggressive ? -3 : -1 }, 민첩: { status: { 의심받음: 3 }, aff: -1 }, 지능: { status: { 혼란: 2 } }, 정신: { status: { 피로: 2 } }, 설득: { aff: -1 }, 운: { gold: -3, status: { 저주: 2 } } }[stat];
    if (!n) delete fx.aff;
  }
  const lines = applyFx(fx, id);
  AudioSys.sfx(r.ok ? 'ok' : 'fail');
  let next;
  if (n) next = npcTurn(id, text); else if (turnCtx && turnCtx.rebuild) next = turnCtx.rebuild(text); else next = { title: turnCtx ? turnCtx.title : '', obj: turnCtx ? turnCtx.obj : 'sign', desc: text, choices: [] };
  next.roll = r.line; next.fx = lines; next.mood = r.ok ? 'surprise' : (aggressive ? 'angry' : 'neutral');
  return next;
}
function easterFree(t, id) {
  const low = t.toLowerCase().replace(/\s/g, '');
  if (/p<0?\.05|피값|p값0.05/.test(low)) { AudioSys.sfx('secret'); const fx = applyFx({ status: { 축복: 3 } }); return Object.assign(id ? npcTurn(id, '당신이 「p < 0.05」를 외치자 공기가 잠깐 멈춘다. 어딘가에서 귀무가설 하나가 기각되는 소리가 난다. 철컥.') : { title: '???', desc: '귀무가설 하나가 어딘가에서 기각됐다. 철컥.', choices: [] }, { fx }); }
  if (/중꺾마/.test(low)) return Object.assign(id ? npcTurn(id, '「중심극한정리는 꺾이지 않는 마음…?」 상대가 진지하게 고개를 끄덕인다. 이 세계에선 이게 통한다.') : { title: '중꺾마', desc: '중심극한정리는 꺾이지 않는 마음.', choices: [] }, { fx: applyFx({ status: { 고양: 3 } }) });
  if (/타니아|thaniya/.test(low)) return Object.assign(id ? npcTurn(id, '그 이름을 듣자 상대가 고개를 갸웃한다. 「도서관 지하… 책장 하나가 덜 들어가 있다던데. 그거랑 상관있나?」') : { title: '???', desc: '어디선가 쿠키 냄새가 난다.', choices: [] }, {});
  if (/가보자고|갓생/.test(low)) return Object.assign(id ? npcTurn(id, '「…가보자고.」 상대가 따라 말한다. 왜인지 기운이 난다.') : { title: '가보자고', desc: '가보자고.', choices: [] }, { fx: applyFx({ focus: 1 }) });
  if (/ㅋㅋ|ㅎㅎ/.test(low) && id) return npcTurn(id, '당신이 웃자 상대도 피식 웃는다. 별 뜻 없는 웃음이 이상하게 전염된다.');
  return null;
}

// =========================================================================
// 특수 턴들
// =========================================================================
function growTurn(g) {
  const pool = shuffle(STATS.slice()).slice(0, 3);
  return {
    title: '성장', sub: '경험이 쌓였다', svg: objectSVG('statue'),
    desc: '일이 하나 끝났다. 몸 어딘가가 조금 달라진 것 같다.\n어떤 능력이 자랐는지는 당신이 정한다.',
    choices: pool.map(st => ({ t: `${st} +1 (현재 ${S.stats[st]})`, tag: '능력치', run: () => { S.stats[st]++; AudioSys.sfx('level'); toast(`⬆ ${st} ${S.stats[st]}`); if (st === '힘' || st === '정신') { S.maxHp += 2; S.hp += 2; } return null; } })),
    freeHint: '다른 능력치 이름을 입력해도 된다 (예: 설득)',
    free: txt => { const st = STATS.find(s => txt.includes(s)); if (!st) return growTurn(g); S.stats[st]++; AudioSys.sfx('level'); toast(`⬆ ${st} ${S.stats[st]}`); return null; }
  };
}
function deathTurn() {
  return {
    isDeath: true, title: '…', sub: '의식이 끊긴다', svg: objectSVG('altar'),
    desc: '시야가 하얗게 바랜다. 주사위 굴러가는 소리가 멀어진다.\n\n…눈을 뜨니 신전 천장이다. 사제 세레나가 내려다본다. 「운이 좋았네요. 분포의 꼬리에서 돌아왔어요.」\n\n주머니가 가볍다. 치료비라고 한다.',
    choices: [{ t: '몸을 일으킨다', tag: '골드 절반 소실', run: () => { ach('death'); S.gold = Math.floor(S.gold / 2); S.hp = Math.ceil(S.maxHp / 2); S.status = {}; S.deaths++; warpTo('temple', 7, 9, 3); return null; } },
      { t: '조금 더 누워 있는다', tag: '정신 판정 10', run: () => { const r = check('정신', 10); S.gold = Math.floor(S.gold / 2); S.hp = r.ok ? S.maxHp : Math.ceil(S.maxHp / 2); S.status = {}; S.deaths++; warpTo('temple', 7, 9, 3); toast(r.ok ? '푹 쉬었다. HP 전부 회복' : '잠을 설쳤다'); return null; } },
      { t: '세레나에게 치료비를 깎아 달라고 한다', tag: '설득 13', run: () => { const r = check('설득', 13); S.gold = r.ok ? Math.floor(S.gold * 0.8) : Math.floor(S.gold / 2); S.hp = Math.ceil(S.maxHp / 2); S.status = {}; S.deaths++; warpTo('temple', 7, 9, 3); toast(r.ok ? '치료비 20%만 냈다' : '「규정이라서요.」'); return null; } }]
  };
}
function restTurn(npc) {
  const free = flag('free_room'), cost = free ? 0 : 15;
  return {
    who: npc.id, desc: `「방? ${free ? '너는 공짜야. 장부 은인이니까.' : '1박 15골드. 아침밥 포함. 아침밥은 탄 빵이지만.'}」`,
    choices: [
      { t: `하룻밤 묵는다${cost ? ` (${cost}골드)` : ''}`, tag: 'HP 전부 · 상태이상 회복', run: () => { if (S.gold < cost) return npcTurn(npc.id, '「돈 없으면 바닥에서 자.」'); const fx = applyFx({ gold: -cost }, npc.id); S.hp = S.maxHp; ['피로', '혼란', '출혈', '의심받음'].forEach(k => delete S.status[k]); S.time = Math.ceil(S.time / DAY) * DAY + 10; S.focus = Math.max(S.focus, 3); const t = npcTurn(npc.id, '푹 잤다. 창밖으로 아침 햇살. 아래층에서 빵 타는 냄새가 올라온다.'); t.fx = fx.concat(['❤ HP 전부 회복', '🎯 집중력 회복']); AudioSys.sfx('level'); return t; } },
      { t: '의자에서 잠깐 눈만 붙인다 (3골드)', tag: 'HP +8', run: () => { if (S.gold < 3) return npcTurn(npc.id, '「3골드도 없어?」'); const fx = applyFx({ gold: -3, heal: 8, cure: ['피로'] }, npc.id); const t = npcTurn(npc.id, '십 분 잤는데 한 시간 잔 것 같다.'); t.fx = fx; return t; } },
      { t: '사양한다', run: () => npcTurn(npc.id, '「그래, 젊을 때 고생해.」') }]
  };
}
const SHOPS = {
  hassan: [['potion', 12], ['herb', 8], ['torch', 10], ['rod', 15], ['bread', 2]],
  kiara: [['potion', 10], ['herb', 6], ['jelly', 45]],
  categoria: [['torch', 12], ['potion', 14], ['herb', 9]]
};
function priceOf(npcId, p) { return Math.ceil(p * (npcId === 'hassan' && flag('discount') ? 0.8 : 1)); }
function shopTurn(npc, msg) {
  const list = SHOPS[npc.id] || SHOPS.hassan;
  const lines = list.map(([id, p]) => `${ITEMS[id].e} ${ITEMS[id].n} — ${priceOf(npc.id, p)}G <small>(${ITEMS[id].d})</small>`).join('\n');
  const buy = (id, p) => () => { const pr = priceOf(npc.id, p); if (S.gold < pr) return shopTurn(npc, '「돈이 부족한데, 친구.」'); const fx = applyFx({ gold: -pr, item: id }, npc.id); const t = shopTurn(npc, `「${ITEMS[id].n}! 좋은 선택!」`); t.fx = fx; return t; };
  return {
    who: npc.id, desc: (msg ? msg + '\n\n' : '') + `진열대:\n${lines}`,
    choices: list.slice(0, 3).map(([id, p]) => ({ t: `${ITEMS[id].n} 산다`, tag: `🪙${priceOf(npc.id, p)}`, run: buy(id, p) })),
    freeHint: '「횃불 산다」, 「물고기 판다」처럼 입력',
    free: txt => {
      const it = list.find(([id]) => txt.includes(ITEMS[id].n.split(' ').pop()) || txt.includes(ITEMS[id].n));
      if (it && /사|구매|줘/.test(txt)) return buy(it[0], it[1])();
      if (/팔|판매/.test(txt)) return sellFishTurn(npc);
      return genericFree(npc.id, txt);
    }
  };
}
function sellFishTurn(npc) {
  const f = S.items.fish || 0, o = S.items.outfish || 0, b = S.items.boot || 0;
  return {
    who: npc.id, desc: `「뭘 가져왔어?」\n붕어 ${f} · 이상치 물고기 ${o} · 장화 ${b}`,
    choices: [
      { t: `붕어를 전부 판다 (${f}마리 × 6G)`, run: () => { if (!f) return npcTurn(npc.id, '「붕어가 없는데?」'); take('fish', f); const fx = applyFx({ gold: f * 6 }, npc.id); const t = npcTurn(npc.id, '「싱싱하네. 오늘 저녁은 붕어찜이다.」'); t.fx = fx; return t; } },
      { t: '이상치 물고기를 판다 (40G)', run: () => { if (!o) return npcTurn(npc.id, '「그런 건 전설로만 들었어.」'); take('outfish'); const fx = applyFx({ gold: 40, aff: 1 }, npc.id); const t = npcTurn(npc.id, '「…이게 진짜 있었어? 3σ 밖의 물고기를?」'); t.fx = fx; return t; } },
      { t: '장화를 팔아 본다', tag: '설득 18', run: () => { if (!b) return npcTurn(npc.id, '「장화도 없으면서 팔려고?」'); const r = check('설득', 18); if (r.ok) { take('boot'); const fx = applyFx({ gold: 3 }, npc.id); const t = npcTurn(npc.id, '「…빈티지라고? 그래 3골드.」 어떻게 팔았는지 당신도 모른다.'); t.roll = r.line; t.fx = fx; return t; } const t = npcTurn(npc.id, '「장화는 안 받아. 이 동네 장화가 이미 평균보다 많아.」'); t.roll = r.line; return t; } }]
  };
}
function petCatTurn(npc) {
  S.flags.pets = (S.flags.pets || 0) + 1;
  AudioSys.sfx('meow');
  const k = S.flags.pets;
  if (k === 10) { AudioSys.sfx('secret'); return Object.assign(npcTurn(npc.id, '열 번째 쓰다듬자 누룽지가 몸을 뒤집는다. 배 털 무늬가… 화살표다. ↑↑↓↓←→←→. 그리고 꼬리 끝에 B, 귀 끝에 A. 우연이겠지.'), { fx: applyFx({ flag: 'konami_hint', status: { 축복: 4 } }), mood: 'happy' }); }
  const r = Math.random();
  if (r < .6) return Object.assign(npcTurn(npc.id, `골골골. 누룽지가 손에 머리를 비빈다. (${k}번째)`), { mood: 'happy', fx: applyFx({ status: { 고양: 2 } }) });
  if (r < .85) return npcTurn(npc.id, `누룽지가 귀찮다는 듯 꼬리로 손을 친다. (${k}번째)`);
  return Object.assign(npcTurn(npc.id, `할퀴었다. 정확히 3σ 확률의 기분 변화. (${k}번째)`), { fx: applyFx({ hp: -1 }), mood: 'angry' });
}
function twinsTurn(npc) {
  const d = [3, 2, 4, 3, 3, 2, 4, 3, 3, 3];
  return {
    who: 'pair', desc: '쌍둥이가 같은 사과 10개를 두 저울에 각각 올려 적은 기록을 내민다.\n리페어 저울 − 페어 저울 (그램): ' + d.join(', ') + '\n\n「누구 저울이 이상한지 판정해!」 둘이 동시에 외친다.',
    choices: [
      { t: '사과마다 차이 d를 구해 쌍체비교 t검정을 한다', tag: '지능 · 정답 루트', run: () => { const fx = applyFx({ questDone: 's_twins', aff: 1, affs: { repair: 1 }, gold: 15, grow: true }, 'pair'); S.pendingGrow = { from: 'pair' }; const t = npcTurn('pair', 'd̄ = 3, s_d ≈ 0.67, t = 3 ÷ (0.67/√10) ≈ 14.2. 자유도 9 임계값 2.262를 한참 넘는다.\n「리페어 저울이 3그램씩 더 나온다.」\n\n리페어가 얼굴을 감싼다. 페어가 환호하다가… 동생 어깨를 두드린다. 「영점만 맞추면 돼. 같이 하자.」\n카테고리아에게 알리면 좋아할 것 같다.'); t.fx = fx; t.mood = 'happy'; AudioSys.sfx('ok'); return t; } },
      { t: '두 저울의 평균만 따로 비교한다', tag: '틀린 방법일 수도', run: () => { const t = npcTurn('pair', '평균을 따로 비교하니 사과마다 크기 차이가 섞여서 결론이 흐릿하다. 「그러니까 누가 맞다는 거야?!」 쌍둥이 싸움이 두 배로 커졌다.\n(같은 사과를 두 번 잰 자료는 짝을 지어야 한다.)'); t.fx = applyFx({ aff: -1, affs: { repair: -1 }, status: { 혼란: 2 } }, 'pair'); AudioSys.sfx('fail'); return t; } },
      { t: '동전을 던져 정해 버린다', tag: '운 12 · 한쪽이 원망', run: () => { const r = check('운', 12); if (r.ok) { const fx = applyFx({ questDone: 's_twins', gold: 5, affs: { repair: -3 } }, 'pair'); const t = npcTurn('pair', '앞면. 페어의 승리. 리페어가 동전을 째려본다. 「이건 검정이 아니라 도박이야…」 그래도 싸움은 끝났다.'); t.roll = r.line; t.fx = fx; return t; } const t = npcTurn('pair', '동전이 옆으로 섰다. 대분산이다. 쌍둥이가 동시에 당신을 본다.'); t.roll = r.line; t.fx = applyFx({ aff: -2, affs: { repair: -2 } }, 'pair'); return t; } }]
  };
}
function kaiTurn(npc) {
  return {
    who: 'kai', desc: '카이 몸속 물약병들이 빛난다. 빨강 30, 초록 40, 파랑 30 (총 100).\n키아라의 이론으로는 1 : 2 : 1 이어야 한다.\n「…χ². 판정. 화내도 되는가.」',
    choices: [
      { t: 'χ² = 4.0, 자유도 2 → 5.991보다 작으니 화낼 근거 없음', run: () => { const fx = applyFx({ flag: 'kai_calm', quest: ['s_kai', 1], aff: 3, item: 'jelly' }, 'kai'); AudioSys.sfx('ok'); const t = npcTurn('kai', '기대도수 25, 50, 25. (25/25)+(100/50)+(25/25) = 4.0. 자유도 3 − 1 = 2, 임계값 5.991.\n「…기각 불가. 우연 범위. 화… 안 냄.」\n카이가 스르르 줄어든다. 말랑한 젤리 한 조각을 떼어 준다.'); t.fx = fx; t.mood = 'happy'; return t; } },
      { t: 'χ² = 4.0 > 3.84 → 화내도 된다', run: () => { const fx = applyFx({ hp: -4, status: { 혼란: 2 } }, 'kai'); AudioSys.sfx('fail'); const t = npcTurn('kai', '「…3.84는 자유도 1. 범주 셋. 자유도 둘. 틀림. 화남.」 카이가 몸을 부풀려 당신을 덮친다.'); t.fx = fx; t.mood = 'angry'; return t; } },
      { t: 'χ² = 2.0 → 완전히 기대대로다', run: () => { const fx = applyFx({ hp: -3 }, 'kai'); AudioSys.sfx('fail'); const t = npcTurn('kai', '「…계산 틀림. 초록 칸 (40−50)²/50 = 2. 빨강, 파랑도 1씩. 합 4.」 카이가 끈적한 한숨을 쉰다.'); t.fx = fx; return t; } }]
  };
}
function mimicOpenTurn(npc) {
  const know = flag('hint_mimic') || flag('dun_map');
  return {
    who: 'mimic', desc: know ? '고드릭과 핀의 말이 떠오른다. 「상자가 웃어.」 손을 뚜껑에 얹자 상자가 아주 미세하게 떤다.' : '금테 두른 보물상자. 뚜껑에 손을 얹는다. 따뜻하다. 상자가 따뜻할 이유가 있나?',
    choices: [
      { t: '확 열어젖힌다', tag: '민첩 13 · 실패 시 HP−7', run: () => { const r = check('민첩', know ? 10 : 13); if (r.ok) { const fx = applyFx({ gold: 35, flag: 'mimic_done' }); const t = npcTurn('mimic', '뚜껑이 열리는 순간 이빨이 튀어나왔지만 이미 옆으로 피했다. 미믹이 허공을 물고 당황해서 금화를 와르르 토한다.'); t.roll = r.line; t.fx = fx; t.mood = 'surprise'; return t; } const t = npcTurn('mimic', '이빨. 이빨이 있다. 팔이 물렸다.'); t.roll = r.line; t.fx = applyFx({ hp: -7, status: { 출혈: 3 } }); t.mood = 'sly'; return t; } },
      { t: '뚜껑 틈에 먹을 걸 넣어 본다', tag: '빵 필요', run: () => { if (!has('bread') && !has('skewer')) return npcTurn('mimic', '넣을 게 없다. 상자가 실망한 듯 조용하다.'); take(has('skewer') ? 'skewer' : 'bread'); const fx = applyFx({ flag: 'mimic_done', flag2: 'mimic_friend', gold: 20 }); const t = npcTurn('mimic', '와그작. 상자가 행복한 소리를 낸다. 뚜껑이 스스로 열리고 금화 몇 개가 굴러 나온다. 「…친구.」'); t.fx = fx; t.mood = 'happy'; return t; } },
      { t: '그냥 둔다', run: () => null }]
  };
}
function nullJudgeTurn(npc) {
  return {
    who: 'hypo', desc: '증언서를 단상에 올린다. 하이포가 안경을 고쳐 쓰고 한 줄씩 읽는다. 검사 알파의 얼굴이 굳는다.\n「…재심 청구인가.」',
    choices: [
      { t: '재심을 요청한다 (8장 문제로 논증)', tag: '📝', run: () => quizTurn({ who: 'hypo', ch: 8, head: '하이포: 「논증해 보게.」', after: (ok, q) => {
        if (ok) { const fx = applyFx({ flag: 'null_judged', questDone: 's_null', affs: { null: 3, alpha: -2, beta: 2 }, aff: 1 }, 'hypo'); if (!has('seal_test')) fx.push(...applyFx({ item: 'seal_test', flag: 'got_test' }, 'hypo')); const t = npcTurn('hypo', `⭕ 해설: ${q.ex}\n\n「…본 법정은 제1종 오류를 인정한다. 귀무가설 눌의 기각을 취소한다.」 쾅. 지하에서 희미한 웃음소리가 올라온다.${has('seal_test') ? '\n하이포가 저울 인장을 내민다. 「정의에 대한 대가다.」' : ''}`); t.fx = fx; t.mood = 'happy'; return t; }
        const fx = applyFx({ affs: { null: -1 }, status: { 의심받음: 2 } }, 'hypo'); const t = npcTurn('hypo', `❌ 해설: ${q.ex}\n\n「논증 부족. 기각.」 증언서가 돌려 보내진다. 다시 해 볼 수는 있다.`); t.fx = fx; return t;
      } }) },
      { t: '증언서를 인장과 거래하는 데 쓴다', tag: '설득 14 · 눌 배신', run: () => { const r = check('설득', 14); if (r.ok) { take('testimony'); const fx = applyFx({ item: 'seal_test', flag: 'got_test', flag2: 'null_judged', questDone: 's_null', affs: { null: -5, alpha: 2 } }, 'hypo'); const t = npcTurn('hypo', '「…이 문서는 없던 걸로 하지. 대신 이걸 가져가.」 저울 인장. 증언서는 서랍 깊숙이 들어간다. 지하의 웃음소리는 들리지 않는다.'); t.roll = r.line; t.fx = fx; return t; } const t = npcTurn('hypo', '「정의를 흥정하는가?」 하이포의 망치가 내려친다.'); t.roll = r.line; t.fx = applyFx({ aff: -3, status: { 의심받음: 4 } }, 'hypo'); return t; } },
      { t: '증언서를 다시 집어넣는다', run: () => npcTurn('hypo', '「…생각이 정리되면 다시 오게.」') }]
  };
}

// 보스전
function bossTurn(npc, first) {
  if (first || !S.boss) S.boss = { hp: flag('boss_weak') ? 4 : 5, max: 5, ready: false, round: 0 };
  const B = S.boss; B.round++;
  const bar = '■'.repeat(B.hp) + '□'.repeat(B.max - B.hp);
  const phase2 = B.hp <= 2;
  const lines = phase2 ? '군주의 갑옷에 금이 간다. 「평균… 평균이 뭐가 좋다는 거냐!」 붉은 빛이 미친 듯이 흔들린다.' : first ? '군주가 거대한 검을 뽑는다. 용암 빛이 칼날을 타고 흐른다. 「3σ 밖으로 데려가 주마.」' : ['군주가 숨을 고른다. 갑옷 틈으로 붉은 안개가 샌다.', '바닥의 용암이 출렁인다. 열기가 피부를 따끔하게 찌른다.', '「아직 표준화되지 않았다!」'][B.round % 3];
  const dcUp = phase2 ? 1 : 0;
  const hitBoss = (txt, extra) => { B.hp--; AudioSys.sfx('hit'); shake(5); if (B.hp <= 0) return bossWin(); const t = bossTurn(npc, false); t.desc = txt + '\n\n— ' + t.desc; if (extra) t.fx = extra; return t; };
  const hurt = (txt, dmg, extra) => { const fx = applyFx(Object.assign({ hp: -dmg }, extra || {})); if (S.hp <= 0) return deathTurn(); const t = bossTurn(npc, false); t.desc = txt + '\n\n— ' + t.desc; t.fx = fx; return t; };
  return {
    who: 'outlier', mood: 'angry', desc: `<div class="bossbar">아웃라이어 군주 · 분산 게이지 <b>${bar}</b></div>${lines}`,
    choices: [
      { t: has('tblade') ? 't-검으로 벤다' : '무기를 휘두른다', tag: `힘 ${14 + dcUp}${B.ready ? ' · 틈 노림(+5)' : ''} · 실패 시 HP−6`, run: () => { const r = check('힘', 14 + dcUp - (B.ready ? 5 : 0)); B.ready = false; if (r.ok) { const t = hitBoss(`칼날이 갑옷 이음매를 파고든다. 군주가 비틀거린다.${r.crit ? ' 대성공! 한 번 더 들어간다.' : ''}`); if (r.crit && B.hp > 0) { B.hp--; } t.roll = r.line; return t; } const t = hurt('검이 튕겨 나온다. 반격이 옆구리를 스친다.', 6); t.roll = r.line; return t; } },
      { t: '표준화의 수식으로 맞선다 (문제)', tag: '📝 정답 시 게이지 −1 · 오답 시 HP−5', run: () => quizTurn({ who: 'outlier', ch: 0, head: '군주의 붉은 눈이 문제를 쏘아낸다.', after: (ok, q) => {
        if (ok) { const t = hitBoss(`⭕ 「${q.a}」 — 답을 외치자 수식이 빛의 사슬이 되어 군주를 평균 쪽으로 끌어당긴다.\n<span class="ex">${esc(q.ex)}</span>`); return t; }
        const t = hurt(`❌ 답이 허공에서 부서진다. 군주가 웃는다. 「틀렸다. 너도 이상치다.」\n<span class="ex">해설: ${esc(q.ex)}</span>`, 5, { status: { 혼란: 2 } }); return t; } }) },
      { t: '피하면서 틈을 노린다', tag: `민첩 ${13 + dcUp} · 성공 시 다음 공격 +5 · 실패 시 HP−5`, run: () => { const r = check('민첩', 13 + dcUp); if (r.ok) { B.ready = true; const t = bossTurn(npc, false); t.desc = '거대한 검이 머리 위를 스친다. 군주의 왼쪽 무릎 갑옷이 벌어진 게 보였다.\n\n— ' + t.desc; t.roll = r.line; return t; } const t = hurt('피했다고 생각했는데 칼바람이 따라왔다.', 5); t.roll = r.line; return t; } }],
    freeHint: '물약 마신다, 설득한다, 도망친다 등 직접 입력',
    free: txt => {
      if (/물약|포션|마시/.test(txt)) { if (!has('potion')) return Object.assign(bossTurn(npc, false), { roll: '물약이 없다.' }); take('potion'); const fx = applyFx({ heal: 12 }); const t = hurt('물약을 들이켰다. 그 사이 군주의 주먹이 날아왔다.', 3); t.fx = fx.concat(t.fx || []); return t; }
      if (/도망|퇴각|후퇴/.test(txt)) { S.boss = null; return { title: '퇴각', svg: objectSVG('gate'), desc: '등 뒤로 군주의 웃음소리가 쫓아온다. 「다시 와라, 평균의 개.」 계단을 뛰어 올라갔다.', choices: [{ t: '숨을 고른다', run: () => { warpTo('dun1', null, null); return null; } }] }; }
      const r = check(/설득|말|평균|돌아/.test(txt) ? '설득' : /참|버티|정신/.test(txt) ? '정신' : '힘', 15 + dcUp);
      if (r.ok) { const t = hitBoss(`「${txt}」 — 예상하지 못한 행동에 군주가 멈칫한다. 분산이 크게 흔들린다.`); t.roll = r.line; return t; }
      const t = hurt(`「${txt}」 — 군주는 흔들리지 않았다.`, 5); t.roll = r.line; return t;
    }
  };
}
function bossWin() {
  S.boss = null;
  const fx = applyFx({ questDone: 'main', item: 'crown', gold: 100, grow: true });
  S.pendingGrow = { from: 'outlier' };
  setFlag('ending_seen'); ach('ending');
  AudioSys.play('ending');
  return {
    who: 'outlier', mood: 'sad', fx,
    desc: '분산 게이지가 바닥난다. 군주의 갑옷이 조각조각 벗겨진다. 안은 텅 비어 있다.\n바닥에 낡은 학자 모자 하나와 쪽지.\n\n「평균으로 돌아가고 싶었다.」\n\n멀리서, 아주 멀리서 분수 소리가 들리는 것 같다. 이번엔 물이 제대로 아래로 떨어지는 소리.',
    choices: [{ t: '모자를 주워 든다', run: () => endingTurn() }, { t: '쪽지를 다시 읽는다', run: () => endingTurn('쪽지 뒷면에 작은 글씨. 「다음 학자에게: 이상치도 데이터다.」') }, { t: '그냥 계단을 오른다', run: () => endingTurn() }]
  };
}
function endingTurn(extra) {
  return {
    title: '에필로그', sub: '벨레스타 연대기', svg: objectSVG('fountain'),
    desc: (extra ? extra + '\n\n' : '') + '그날 이후 벨레스타의 동전은 다시 앞면 아니면 뒷면으로만 떨어진다. 빵집 오븐은 대체로 잘 굽는다. 대체로.\n\n오웬은 게시판에 「대분산 해결됨」이라고 붙였다가, 아래에 「(95% 신뢰수준)」을 덧붙였다.\n\n분포는 제자리로 돌아왔다. 하지만 도시는 여전히 시끄럽고, 골목은 여전히 많고, 아직 안 읽은 표지판과 안 낚은 물고기가 있다.\n\n<b>— 메인 스토리 끝. 모험은 계속된다. —</b>',
    choices: [{ t: '계속 탐험한다', run: () => { showCredits(); return null; } }, { t: '광장으로 돌아간다', run: () => { warpTo('town', MAPS.town.cx, MAPS.town.cy + 4, 0); return null; } }, { t: '여기 조금 더 있는다', run: () => null }]
  };
}

// =========================================================================
// 물체와 표지판
// =========================================================================
function objectTurnBoard() { return { title: '광장 게시판', sub: '오웬이 관리함', obj: 'sign', desc: '빼곡한 의뢰서. 「고양이 찾음」, 「대분산 해결해 주실 분」, 「우리 집 동전이 옆으로 섬」, 「p값 0.051 살려 주세요」.', choices: [{ t: '의뢰 하나를 떼어 간다 (문제)', tag: '📝 보상 12G', run: () => quizTurn({ title: '게시판 의뢰', obj: 'sign', ch: 0, head: '의뢰서를 떼어 읽는다.', after: (ok, q) => ({ title: '게시판', obj: 'sign', fx: applyFx(ok ? { gold: 12, dailyInc: 1 } : { status: { 혼란: 1 } }), desc: (ok ? '⭕ 해결! 의뢰비가 게시판 옆 통에 들어 있다.' : '❌ 의뢰인이 항의 쪽지를 붙였다.') + `\n<span class="ex">해설: ${esc(q.ex)}</span>`, choices: [] }) }) }, { t: '소문 쪽지를 읽는다', run: () => { const l = LORE[Math.floor(Math.random() * LORE.length)]; return simple('소문', 'sign', `<b>${l[0]}</b>\n${l[1]}`); } }, { t: '「p값 0.051」 의뢰를 읽는다', run: () => simple('p값 0.051 살려 주세요', 'sign', '「제 실험 p값이 0.051인데요… 반올림하면 0.05 아닌가요? 기각해도 되죠?」\n\n아래에 오웬 글씨: 「안 됩니다.」\n그 아래 다른 글씨: 「ㅋㅋㅋㅋ」') }] }; }
function lessonTurn(id) {
  const L = LESSONS[id]; if (!L) return null;
  const first = !S.read[id]; S.read[id] = true;
  const cnt = Object.keys(S.read).length, total = Object.keys(LESSONS).length;
  const fx = [];
  if (first) { fx.push(`📖 도감 기록 ${cnt}/${total}`); if (cnt === 1) fx.push(setQ('s_signs', 0)); if (cnt >= 15 && qStep('s_signs') === 0) { fx.push(setQ('s_signs', 1)); fx.push(...applyFx({ gold: 30, item: 'potion' })); } if (cnt === total) { fx.push(doneQ('s_signs')); fx.push(...applyFx({ item: 'coin', focus: 3 })); } }
  const build = pre => ({
    title: L.t, sub: L.ch ? `${L.ch}장` : '벨레스타', obj: 'sign',
    desc: (pre ? pre + '\n\n' : '') + `<div class="lesson">${esc(L.x).replace(/\n/g, '<br>')}</div>`,
    choices: [
      { t: '내용을 소리 내어 외워 본다', tag: '지능 11 · 성공 시 집중력+1', run: () => { const r = check('지능', 11); const f = applyFx(r.ok ? { focus: 1 } : { status: { 혼란: 1 } }); const t = build(r.ok ? '세 번 읽자 머릿속에 딱 붙는다.' : '읽을수록 글자가 춤을 춘다.'); t.roll = r.line; t.fx = f; t.choices = t.choices.slice(1).concat([{ t: '떠난다', run: () => null }]); return t; } },
      { t: '아래 적힌 확인 문제를 푼다', tag: `📝 ${L.ch ? L.ch + '장' : '문제'} · 정답 시 🪙+5`, run: () => quizTurn({ title: L.t, sub: '확인 문제', obj: 'sign', ch: [7, 8, 9].includes(L.ch) ? L.ch : 0, head: '표지판 아래 작은 글씨로 문제가 새겨져 있다.', after: (ok, q) => { const t = build((ok ? '⭕ 정답! 받침대 틈에서 동전이 굴러 나온다.' : '❌ 틀렸다. 표지판을 다시 읽어 보자.') + `\n<span class="ex">해설: ${esc(q.ex)}</span>`); t.fx = applyFx(ok ? { gold: 5 } : {}); return t; } }) },
      { t: '떠난다', run: () => null }],
    rebuild: p => build(p)
  });
  const t = build(''); t.fx = fx.filter(Boolean);
  return t;
}
function chestTurn(key, id) {
  const c = CHESTS[id] || CHESTS._generic;
  const openIt = (disarm, kick) => {
    S.opened[key] = true;
    const lines = [];
    let txt = '뚜껑이 열린다.';
    let roll = null;
    if (c.trap && !disarm) { const r = check(c.trap.s, c.trap.dc); roll = r.line; if (!r.ok) { txt = c.trap.msg; lines.push(...applyFx({ hp: -c.trap.hp, status: { [c.trap.st[0]]: c.trap.st[1] } })); } else txt = c.trap.msg + ' 하지만 몸이 먼저 피했다.'; }
    const loot = {}; if (c.gold) loot.gold = c.gold; if (c.item) loot.item = c.item;
    lines.push(...applyFx(loot));
    AudioSys.sfx('coin'); renderMapDirty = true;
    return { title: '상자', obj: 'chest', roll, fx: lines, desc: txt + (c.note ? '\n' + c.note : ''), choices: [{ t: '닫고 떠난다', run: () => null }] };
  };
  return {
    title: '상자', obj: 'chest', desc: '낡은 상자다. 자물쇠는 녹슬었고, 경첩에 수상한 긁힘이 있다.' + (c.trap ? '' : ''),
    choices: [
      { t: '그냥 연다', tag: c.trap ? '함정 위험' : '', run: () => openIt(false) },
      { t: '함정을 살피고 조심히 연다', tag: '지능 12', run: () => { const r = check('지능', 12); const t = openIt(r.ok); t.roll = r.line + (t.roll ? '<br>' + t.roll : ''); if (r.ok && c.trap) t.desc = '경첩에 걸린 장치를 찾아 풀었다. ' + t.desc; return t; } },
      { t: '발로 차서 연다', tag: '힘 10 · 실패 시 HP−1', run: () => { const r = check('힘', 10); if (!r.ok) return Object.assign(chestTurn(key, id), { roll: r.line, fx: applyFx({ hp: -1 }), desc: '발가락이 먼저 비명을 질렀다. 상자는 멀쩡하다.' }); const t = openIt(c.trap && Math.random() < .5); t.roll = r.line + (t.roll ? '<br>' + t.roll : ''); return t; } }]
  };
}
function fishTurn() {
  if (!has('rod')) return { title: '물가', obj: 'fountain', desc: '물이 맑다. 물고기 그림자가 지나간다. 낚싯대가 있으면 좋을 텐데.\n(숲의 나무꾼이나 상회에서 구할 수 있다)', choices: [{ t: '손으로 잡아 본다', tag: '민첩 17', run: () => { const r = check('민첩', 17); if (r.ok) { S.fishCaught++; return { title: '물가', obj: 'fountain', roll: r.line, fx: applyFx({ item: 'fish' }), desc: '맨손으로 잡았다! 붕어가 어리둥절하다.', choices: [] }; } return { title: '물가', obj: 'fountain', roll: r.line, fx: applyFx({ status: { 피로: 1 } }), desc: '첨벙. 옷만 젖었다.', choices: [] }; } }, { t: '물을 바라본다', run: () => ({ title: '물가', obj: 'fountain', desc: '물에 비친 자신을 본다. 생각보다 피곤해 보인다.', choices: [] }) }] };
  const cast = (stat, dc, deep) => () => {
    const r = check(stat, dc); AudioSys.sfx('splash');
    const loot = Math.random();
    let item, txt;
    if (!r.ok) { if (deep) return Object.assign(fishTurn(), { roll: r.line, fx: applyFx({ gold: -2 }), desc: '줄이 바닥에 걸려 끊어졌다. 새 줄 값이 아깝다.' }); return Object.assign(fishTurn(), { roll: r.line, desc: '입질이 없다. 물고기들도 오늘은 귀찮은가 보다.' }); }
    if (deep && loot < 0.25 || r.crit) { item = 'outfish'; txt = '찌가 쭉 빨려 들어간다! 끌어올린 건… 평균보다 3σ 큰 물고기다. 비늘이 무지갯빛이다.'; }
    else if (loot < 0.22) { item = 'boot'; txt = '묵직하다! …장화다. 낚시의 국룰.'; ach('boot'); }
    else if (loot < 0.3) { item = null; txt = '녹슨 동전 주머니가 걸려 올라왔다.'; }
    else { item = 'fish'; txt = '붕어 한 마리. 슬픈 눈으로 당신을 본다.'; }
    S.fishCaught++;
    const fx = applyFx(item ? { item } : { gold: 6 });
    if (S.fishCaught === 5) fx.push('🎣 5마리 달성! 나무꾼 오크통에게 자랑하자');
    return Object.assign(fishTurn(), { roll: r.line, fx, desc: txt + `\n(지금까지 낚은 것: ${S.fishCaught})` });
  };
  return {
    title: '낚시', sub: '물가', obj: 'fountain', desc: '찌를 던질 자리를 고른다. 물 아래 그림자들이 정규분포처럼 흩어져 있다.',
    choices: [{ t: '얕은 곳에 던지고 기다린다', tag: '운 9', run: cast('운', 9, false) }, { t: '깊은 곳을 노린다', tag: '힘 13 · 희귀 확률↑ · 실패 시 G−2', run: cast('힘', 13, true) }, { t: '그만한다', run: () => null }]
  };
}
function objectTurn(ch, x, y) {
  const key = MAP.id + ':' + x + ',' + y;
  const simple = (title, obj, desc, choices) => ({ title, obj, desc, choices: choices || [] });
  switch (ch) {
    case 'S': { const id = MAP.signs && MAP.signs[x + ',' + y]; if (id && SPECIAL_SIGNS[id]) return SPECIAL_SIGNS[id](); return id ? lessonTurn(id) : simple('표지판', 'sign', '글씨가 다 지워졌다. 누가 「ㅋ」만 남겨 놨다.'); }
    case 'N': if (MAP.id === 'town' && typeof decreeTurn === 'function') return decreeTurn(() => objectTurnBoard()); return objectTurnBoard();
    case 'C': {
      const id = MAP.chests && MAP.chests[x + ',' + y];
      if (S.opened[key]) return simple('빈 상자', 'chest', '이미 비었다. 바닥에 먼지 뭉치만 남았다.');
      return chestTurn(key, id || '_generic');
    }
    case '~': return fishTurn();
    case 'Y': {
      if (MAP.id === 'inn2') return restTurn(NPCS.marta);
      return simple('침대', 'bed', '남의 침대다. 눕고 싶다. 하지만 남의 침대다.', [{ t: '잠깐만 눕는다', tag: '운 14', run: () => { const r = check('운', 14); return Object.assign(simple('침대', 'bed', r.ok ? '아무도 모르게 10분 잤다. 개운하다.' : '집주인과 눈이 마주쳤다. 어색하다.'), { roll: r.line, fx: applyFx(r.ok ? { heal: 6 } : { status: { 의심받음: 2 } }) }); } }, { t: '이불을 정리해 준다', run: () => simple('침대', 'bed', '각 잡힌 이불. 군대식이다. 집주인이 보면 놀랄 것이다.') }]);
    }
    case 'Z': return simple('모루', 'anvil', '쇠 냄새. 망치가 걸려 있다.', [{ t: '망치로 모루를 두드려 본다', tag: '힘 12', run: () => { const r = check('힘', 12); return Object.assign(simple('모루', 'anvil', r.ok ? '땅! 맑은 소리가 울린다. 볼칸이 고개를 돌린다. 「…박자는 좋네.」' : '망치가 손에서 미끄러져 발등으로. 볼칸이 웃는다.'), { roll: r.line, fx: applyFx(r.ok ? { affs: { volkan: 1 } } : { hp: -2 }) }); } }, { t: '모루에 새겨진 글씨를 읽는다', run: () => simple('모루', 'anvil', '「n₁ + n₂ − 2」. 볼칸의 할아버지가 새긴 것 같다.') }]);
    case 'O': return simple('솥', 'cauldron', '초록 액체가 부글거린다. 냄새가 시큼하다. 거품이 터질 때마다 작은 숫자가 떠오른다. 25… 50… 25…', [{ t: '국자로 한 모금 맛본다', tag: '정신 13', run: () => { const r = check('정신', 13); return Object.assign(simple('솥', 'cauldron', r.ok ? '혀가 얼얼하지만 머리가 맑아진다.' : '세상이 기대도수만큼 흔들린다.'), { roll: r.line, fx: applyFx(r.ok ? { focus: 2 } : { status: { 혼란: 3 }, hp: -2 }) }); } }, { t: '거품의 숫자를 받아 적는다', run: () => simple('솥', 'cauldron', '25, 50, 25. 1 : 2 : 1. 누군가의 적합도 검정 기대도수 같다.') }]);
    case 'A': return simple('제단', 'altar', '촛불 두 개, 금빛 원판. 원판에 종 모양 곡선이 새겨져 있다.', [{ t: '기도한다', tag: '정신 11', run: () => { const r = check('정신', 11); return Object.assign(simple('제단', 'altar', r.ok ? '마음이 고요해진다. 여신이 주사위를 한 번 더 굴려 줄 것 같은 기분.' : '잡생각이 너무 많다. 저녁 메뉴, 자유도, 저녁 메뉴.'), { roll: r.line, fx: applyFx(r.ok ? { status: { 축복: 4 }, heal: 4 } : {}) }); } }, { t: '헌금한다 (5골드)', run: () => { if (S.gold < 5) return simple('제단', 'altar', '헌금함 앞에서 지갑을 열었다 닫았다.'); return Object.assign(simple('제단', 'altar', '짤랑. 촛불이 조금 밝아진다.'), { fx: applyFx({ gold: -5, heal: 10, cure: ['저주'] }) }); } }]);
    case 'a': return simple('스토카 여신상', 'statue', '손에 주사위를 든 여신상. 받침대에 「모든 것은 분포를 따른다」. 누가 여신상 손에 사과를 쥐여 놨다.', [{ t: '사과를 먹는다', tag: '운 12', run: () => { const r = check('운', 12); return Object.assign(simple('여신상', 'statue', r.ok ? '달다. 여신이 웃은 것 같다.' : '사과 속에 벌레. 여신이 웃은 것 같다. 다른 의미로.'), { roll: r.line, fx: applyFx(r.ok ? { heal: 5 } : { hp: -1 }) }); } }, { t: '주사위를 만져 본다', run: () => { const v = 1 + Math.floor(Math.random() * 6); return simple('여신상', 'statue', `돌 주사위가 굴러간다. ${v}. ${v === 6 ? '…돌인데 굴러갔다.' : ''}`); } }]);
    case 'y': return simple('수정', 'crystal', '푸르게 빛나는 수정. 가까이 가면 귀에서 낮은 웅웅 소리가 난다.', [{ t: '손을 댄다', tag: '정신 12', run: () => { const r = check('정신', 12); return Object.assign(simple('수정', 'crystal', r.ok ? '차가운 기운이 머리를 맑게 한다.' : '머릿속에 숫자가 쏟아진다. 1.96, 2.576, 1.645, 1.96…'), { roll: r.line, fx: applyFx(r.ok ? { focus: 1 } : { status: { 혼란: 2 } }) }); } }, { t: '조각을 떼어 간다', tag: '힘 15', run: () => { const r = check('힘', 15); return Object.assign(simple('수정', 'crystal', r.ok ? '작은 조각이 떨어졌다. 상회에 팔면 꽤 받겠다.' : '손톱만 아프다.'), { roll: r.line, fx: applyFx(r.ok ? { gold: 15 } : { hp: -1 }) }); } }]);
    case 'u': return simple('광맥', 'ore', '돌 틈에 파란 결정이 박혀 있다. 자유도 광석이다.', [{ t: '캐낸다', tag: '힘 14 · 실패 시 HP−3', run: () => { if (has('ore')) return simple('광맥', 'ore', '이미 하나 있다. 욕심은 분산을 키운다.'); const r = check('힘', 14); return Object.assign(simple('광맥', 'ore', r.ok ? '돌이 깨지며 파란 광석이 손에 떨어진다.' : '곡괭이도 없이 돌을 치니 손이 먼저 나갔다.'), { roll: r.line, fx: applyFx(r.ok ? { item: 'ore', quest: ['s_ore', 1] } : { hp: -3 }) }); } }, { t: '결의 방향을 살핀다', tag: '지능 12 · 다음 채굴 쉬움', run: () => { const r = check('지능', 12); return Object.assign(simple('광맥', 'ore', r.ok ? '결을 따라 틈이 보인다. 손가락으로 툭 치자 광석이 떨어진다!' : '모르겠다. 돌이다.'), { roll: r.line, fx: applyFx(r.ok && !has('ore') ? { item: 'ore', quest: ['s_ore', 1] } : {}) }); } }]);
    case 'g': {
      const seals = ['seal_est', 'seal_test', 'seal_cat'].filter(s => has(s));
      if (seals.length < 3) return simple('봉인문', 'gate', `세 개의 홈. 별, 저울, 격자. 지금 가진 인장: ${seals.length}/3.\n문 아래쪽에 안에서 긁은 자국이 있다.`, [{ t: '문에 귀를 댄다', tag: '정신 12', run: () => { const r = check('정신', 12); return Object.assign(simple('봉인문', 'gate', r.ok ? '아주 멀리서, 갑옷이 끌리는 소리. 그리고 누가 숫자를 세는 소리. 「…3σ… 4σ…」' : '귀가 차갑다. 아무 소리도 없다. 아니, 있었나?'), { roll: r.line, fx: applyFx(r.ok ? {} : { status: { 저주: 1 } }) }); } }, { t: '문을 밀어 본다', tag: '힘 20', run: () => { const r = check('힘', 20); return Object.assign(simple('봉인문', 'gate', r.ok ? '…꿈쩍도 안 한다. 대성공이어도 안 된다. 인장이 필요하다.' : '꿈쩍도 안 한다.'), { roll: r.line }); } }]);
      return simple('봉인문', 'gate', '세 인장을 홈에 끼운다. 별이 빛나고, 저울이 기울고, 격자가 맞물린다. 돌 갈리는 소리와 함께 문이 아래로 가라앉는다. 차가운 바람이 올라온다.', [{ t: '아래로 내려간다', run: () => { MAP.g[y][x] = 'v'; setFlag('gate_open'); setQ('main', 3); renderMapDirty = true; AudioSys.sfx('secret'); return null; } }, { t: '잠시 준비한다', run: () => { MAP.g[y][x] = 'v'; setFlag('gate_open'); setQ('main', 3); renderMapDirty = true; return null; } }]);
    }
    case 'K': return npcTurn('saira');
    case 'd': return simple('허수아비', 'dummy', '빨간 점이 그려진 허수아비. 곳곳이 레온의 헛스윙 자국이다.', [{ t: '빨간 점을 찌른다', tag: '민첩 11', run: () => { const r = check('민첩', 11); return Object.assign(simple('허수아비', 'dummy', r.ok ? '정중앙. 허수아비가 빙글 돈다.' : '빗나갔다. 허수아비가 돌아와서 뒤통수를 친다.'), { roll: r.line, fx: applyFx(r.ok ? { status: { 고양: 2 } } : { hp: -1 }) }); } }, { t: '허수아비와 대화한다', run: () => simple('허수아비', 'dummy', '「…」 허수아비는 말이 없다. 그래도 들어 주는 것 같다.') }]);
    case 'E': {
      const msgs = ['잠겨 있다. 문틈으로 누가 코를 고는 소리.', '잠겨 있다. 「외판원 사절. 확률 판매원 특히 사절.」', '잠겨 있다. 안에서 「p값이 0.06이야… 0.06…」 하는 울음소리.', '잠겨 있다. 문패: 「이상치 아님. 그냥 사람.」', '잠겨 있다. 고양이 발자국이 문 밑으로 이어진다.', '잠겨 있다. 「공부 중. 노크하면 기각함.」'];
      const m = msgs[(x * 7 + y * 3) % msgs.length];
      return simple('민가 문', 'sign', m, [{ t: '노크한다', tag: '운 12', run: () => { const r = check('운', 12); const good = r.ok; return Object.assign(simple('민가 문', 'sign', good ? '문이 빼꼼 열리고 할머니가 빵을 쥐여 준다. 「밥은 먹고 다녀?」 문이 닫힌다.' : '「누구세요?! 시끄러워요!」 창문으로 물이 쏟아졌다.'), { roll: r.line, fx: applyFx(good ? { item: 'bread' } : { status: { 피로: 1 } }) }); } }, { t: '자물쇠를 딴다', tag: '민첩 16 · 실패 시 의심받음', run: () => { const r = check('민첩', 16); return Object.assign(simple('민가 문', 'sign', r.ok ? '철컥. 열렸다. …안을 보니 너무 평범한 가정집이라 미안해져서 다시 잠갔다. 문 앞 화분 아래 동전은 챙겼다.' : '이웃이 창문으로 당신을 본다. 손가락질과 함께.'), { roll: r.line, fx: applyFx(r.ok ? { gold: 4 } : { status: { 의심받음: 4 } }) }); } }, { t: '그냥 지나간다', run: () => null }]);
    }
    case 'B': {
      if (MAP.secret && MAP.secret[0] === x && MAP.secret[1] === y && !flag('secret_open')) {
        const dc = flag('hint_secret') || S.read.sign_libB ? 8 : 15;
        return simple('책장', 'book', '이 책장만 책 한 권이 덜 꽂혀 있다. 빈자리에 손가락이 딱 들어갈 만한 틈.', [{ t: '빈자리를 눌러 본다', tag: `지능 ${dc}`, run: () => { const r = check('지능', dc); if (r.ok) { MAP.g[y][x] = '_'; setFlag('secret_open'); renderMapDirty = true; AudioSys.sfx('secret'); return Object.assign(simple('책장', 'book', '딸깍. 책장이 옆으로 미끄러진다. 안쪽에서 쿠키 냄새가 난다.'), { roll: r.line }); } return Object.assign(simple('책장', 'book', '아무 일도 없다. 다른 방법이 있을 것 같다.'), { roll: r.line }); } }, { t: '책을 한 권 꺼내 본다', tag: '운 13', run: () => { const r = check('운', 13); if (r.ok) { MAP.g[y][x] = '_'; setFlag('secret_open'); renderMapDirty = true; AudioSys.sfx('secret'); } return Object.assign(simple('책장', 'book', r.ok ? '「비밀의 문을 여는 법」이라는 책을 당기자 책장이 열렸다. 너무 직설적이다.' : '「p-hacking 하는 법」. 금서다. 얼른 꽂아 놓는다.'), { roll: r.line }); } }]);
      }
      const books = ['「신뢰구간 입문 · 95%만 이해해도 합격」', '「검정력을 높이는 7가지 습관」', '「카이제곱 요리책 · 기대도수만큼 넣으세요」', '「표본이 작을 때 우는 법」', '「자유도 n−1의 비밀 (스포: 평균)」', '「나는 왜 제2종 오류를 범했나 · 베타 자서전」'];
      const b = books[(x * 5 + y * 11) % books.length];
      return simple('책장', 'book', `책등을 훑는다. ${b}`, [{ t: '읽어 본다', tag: '지능 10', run: () => { const r = check('지능', 10); return Object.assign(simple('책장', 'book', r.ok ? '유익하다. 의외로.' : '첫 줄부터 졸리다.'), { roll: r.line, fx: applyFx(r.ok ? { focus: 1 } : { status: { 피로: 1 } }) }); } }, { t: '책 사이를 뒤진다', tag: '운 14', run: () => { const r = check('운', 14); return Object.assign(simple('책장', 'book', r.ok ? '책갈피 대신 꽂힌 지폐… 아니 금화. 이 세계엔 지폐가 없다.' : '먼지가 코로 들어갔다. 에취.'), { roll: r.line, fx: applyFx(r.ok ? { gold: 5 } : {}) }); } }]);
    }
    case 'e': return simple('망원경', 'crystal', '황동 망원경. 하늘 쪽을 향해 있다.', [{ t: '들여다본다', tag: '정신 10', run: () => { const r = check('정신', 10); return Object.assign(simple('망원경', 'crystal', r.ok ? '별들이 종 모양으로 늘어서 있다. 가운데가 가장 빽빽하다. 오래 보고 있으니 마음이 가라앉는다.' : '눈에 눈썹이 들어갔다.'), { roll: r.line, fx: applyFx(r.ok ? { status: { 고양: 3 } } : {}) }); } }]);
    case 'q': return simple('불', 'cauldron', '타닥타닥. 따뜻하다.', [{ t: '불을 쬐며 쉰다', run: () => Object.assign(simple('불', 'cauldron', '몸이 풀린다.'), { fx: applyFx({ heal: 3, cure: ['피로'] }) }) }, { t: '불 속을 가만히 본다', run: () => simple('불', 'cauldron', '불꽃의 높이가 매번 다르다. 평균은 일정하다.') }]);
    case 'k': return simple('물약 선반', 'cauldron', '색색의 병들. 라벨에 「건드리지 마시오 (진심)」.', [{ t: '하나 슬쩍한다', tag: '민첩 15 · 실패 시 키아라 분노', run: () => { const r = check('민첩', 15); return Object.assign(simple('선반', 'cauldron', r.ok ? '빨간 병 하나가 주머니로.' : '병들이 도미노처럼 쓰러진다. 와장창.'), { roll: r.line, fx: applyFx(r.ok ? { item: 'potion', status: { 의심받음: 1 } } : { affs: { kiara: -3 }, gold: -10 }) }); } }, { t: '라벨만 읽는다', run: () => simple('선반', 'cauldron', '「적합도 물약: 마시면 기대도수만큼 건강해짐(개인차 있음)」') }]);
    case 'F': return simple('중심극한 분수', 'fountain', '물줄기가 종 모양을 그리며 떨어진다. 바닥엔 동전이 가득하다. 꼭대기의 금빛 조각이 정규분포 모양이다.', [{ t: '동전을 던진다 (1골드)', tag: '운 15', run: () => { if (S.gold < 1) return simple('분수', 'fountain', '던질 동전이 없다.'); const r = check('운', 15); S.flags.coins = (S.flags.coins || 0) + 1; const fx = applyFx(r.ok ? { gold: -1, status: { 축복: 5 } } : { gold: -1 }); if (S.flags.coins === 7 && !has('coin')) { fx.push(...applyFx({ item: 'coin' })); AudioSys.sfx('secret'); } return Object.assign(simple('분수', 'fountain', r.ok ? '동전이 물 위를 세 번 튕기고 가라앉는다. 좋은 징조 같다.' : `퐁. 평범하게 가라앉는다.${S.flags.coins === 7 ? '\n…일곱 번째 동전이 반짝이며 다시 떠올랐다?' : ''}`), { roll: r.line, fx }); } }, { t: '물을 떠 마신다', tag: '운 11', run: () => { const r = check('운', 11); return Object.assign(simple('분수', 'fountain', r.ok ? '시원하다. 동전 맛이 살짝 난다.' : '배가 살살 아프다.'), { roll: r.line, fx: applyFx(r.ok ? { heal: 4 } : { hp: -2 }) }); } }, { t: '물줄기를 오래 바라본다', run: () => simple('분수', 'fountain', '물방울 하나하나는 제멋대로인데, 다 모이면 종 모양이 된다.\n어디선가 들은 것 같다. 중심극한정리.') }]);
    case 'c': return simple('상자 더미', 'chest', '쪽지가 붙어 있다: 「쌍둥이 재고. 손대면 둘 다 화냄」');
    default: return minorTurn(ch, x, y);
  }
}

// =========================================================================
// 오프닝
// =========================================================================
const ORIGINS = {
  mage: { t: '학원 낙제생 마법사', st: { 지능: 7, 정신: 6, 힘: 3, 민첩: 4, 설득: 4, 운: 5 }, hp: 24, gold: 25, items: { potion: 1 }, look: { hair: '#4a3a6a', cloth: '#5b3fa0', type: 'robe', hat: 'wizard', hatColor: '#3e2766', accent: '#ffd84d', hairStyle: 'short', eye: '#7a5ad0', beast: 'fox', fur: '#6a4a8a', tailTip: '#f4ecff' } },
  merc: { t: '떠돌이 용병', st: { 힘: 7, 민첩: 6, 지능: 3, 정신: 5, 설득: 3, 운: 4 }, hp: 34, gold: 15, items: { potion: 2 }, look: { hair: '#2a2a2a', cloth: '#6a5a4a', type: 'armor', hat: 'bandana', hatColor: '#8a2a2a', accent: '#c0392b', hairStyle: 'spiky', eye: '#3a3a3a', beast: 'wolf', fur: '#6a6a72', tailTip: '#d8d8de', scar: true, skin: SKIN[2] } },
  noble: { t: '몰락 귀족 상인', st: { 설득: 7, 운: 6, 지능: 5, 힘: 3, 민첩: 4, 정신: 3 }, hp: 26, gold: 80, items: { potion: 1, bread: 1 }, look: { hair: '#e8c26a', cloth: '#2a6a5a', type: 'tunic', hat: 'cap', hatColor: '#1f4a40', accent: '#e1b13d', hairStyle: 'bob', eye: '#2a7a6a', beast: 'cat', fur: '#e8c26a', tailTip: '#fff4d6' } },
  free: { t: '정체불명의 여행자', st: { 힘: 5, 민첩: 5, 지능: 5, 정신: 5, 설득: 5, 운: 5 }, hp: 28, gold: 30, items: { potion: 1 }, look: { hair: '#5a3a2a', cloth: '#4f7fd6', type: 'tunic', hairStyle: 'short', eye: '#c98a2a', beast: 'fox', fur: '#c8642a', tailTip: '#fff4e6' } }
};
function setOrigin(key, customText) {
  const o = ORIGINS[key];
  S.origin = key; S.originText = customText || o.t;
  Object.assign(S.stats, o.st); S.maxHp = o.hp; S.hp = o.hp; S.gold = o.gold; S.items = Object.assign({}, o.items);
  if (key === 'free' && customText) {
    for (const [st, re] of KW) if (re.test(customText)) S.stats[st] += 2;
    if (/마법|학자|학생|연구/.test(customText)) S.stats.지능 += 2;
    if (/전사|기사|용병|군인/.test(customText)) { S.stats.힘 += 2; S.maxHp += 4; S.hp += 4; }
    if (/상인|귀족|장사/.test(customText)) { S.stats.설득 += 2; S.gold += 30; }
    if (/도둑|사냥꾼|궁수/.test(customText)) S.stats.민첩 += 2;
    if (/사제|수도|명상/.test(customText)) S.stats.정신 += 2;
    // 총합 보정 (평균 5 근처 유지)
    let sum = STATS.reduce((a, s) => a + S.stats[s], 0);
    while (sum > 32) { const s = STATS.reduce((a, b) => S.stats[a] > S.stats[b] ? a : b); S.stats[s]--; sum--; }
  }
  S.look = o.look;
  PLAYER.spr = playerSprite();
}
function openingTurn() {
  const pre = '삐걱— 나무 천장. 낯선 이불. 창문 틈으로 빵 굽는 냄새(조금 탄)가 스며든다.\n여기는… 여관 ‘신뢰구간 95%’의 2층 객실이다.\n\n문이 벌컥 열리고 앞치마를 두른 여관 주인이 쟁반을 들고 들어온다.\n「아, 깼어? 어젯밤 성문 앞에 쓰러져 있던 걸 경비대장 브루노가 업고 왔어. 무겁다고 투덜대면서.」\n마르타가 당신의 쫑긋한 귀와 이불 밖으로 삐져나온 꼬리를 보고 웃는다.\n「수인 손님은 오랜만이네. 꼬리 털 빠지는 건 숙박비에 포함이야.」\n「그래서, 뭐 하던 사람이야? 요즘 도시가 이상해서 다들 하나하나 묻거든.」';
  const pickO = k => () => { setOrigin(k); const o = ORIGINS[k]; const t = gateFeeTurn(`「${o.t}…라. 흠.」 마르타가 당신을 위아래로 훑는다.`); t.fx = [`능력치 — ${STATS.map(s => `${s} ${S.stats[s]}`).join(' · ')}`, `HP ${S.maxHp} · 골드 ${S.gold}`]; return t; };
  return {
    who: 'marta', mood: 'smile', desc: pre,
    choices: [
      { t: '「학원에서 쫓겨난 마법사다.」', tag: '지능·정신↑ 힘↓ HP 낮음', run: pickO('mage') },
      { t: '「돈 받고 싸우던 용병이다.」', tag: '힘·민첩↑ 지능↓ HP 높음', run: pickO('merc') },
      { t: '「집안은 망했지만 장사는 한다.」', tag: '설득·운↑ 골드 많음 힘↓', run: pickO('noble') }],
    freeHint: '직접 신분을 말해도 된다 (예: 떠돌이 사냥꾼)',
    free: txt => { setOrigin('free', txt); const t = gateFeeTurn(`「${txt}…? 별사람이 다 오네.」`); t.fx = [`능력치 — ${STATS.map(s => `${s} ${S.stats[s]}`).join(' · ')}`, `HP ${S.maxHp} · 골드 ${S.gold}`]; return t; }
  };
}
function gateFeeTurn(pre) {
  const go = () => { setQ('main', 0); tutorialToast(); return null; };
  const after = (txt, fx, roll) => { S.flags.met_bruno = true; const t = { who: 'marta', desc: txt + '\n\n「광장 게시판 서기 오웬한테 가 봐. 이 도시가 왜 이 모양인지 제일 시끄럽게 떠드는 애야. 아래층 계단으로 내려가서 문 밖으로 나가면 돼.」\n\n마르타가 문을 열어 둔 채 내려간다. 창밖에서 종소리와 사람들 웅성거림이 들려온다.', choices: [
    { t: '계단으로 내려간다', run: go },
    { t: '「대분산」이 뭐냐고 묻는다', run: () => { setQ('main', 0); tutorialToast(); return { who: 'marta', desc: '「동전이 옆으로 서고 빵이 반은 생, 반은 숯이야. 석 달째. 우리 여관 빵도 그래서 저 모양이고… 자세한 건 오웬한테.」', choices: [{ t: '알겠다', run: () => null }] }; } },
    { t: '창밖을 내다본다', run: () => { setQ('main', 0); tutorialToast(); return { who: 'marta', mood: 'smile', desc: '붉은 지붕들이 끝없이 이어지고, 광장 분수의 물줄기가… 아래에서 위로 떨어진다.\n「아, 저거? 석 달째 저래. 익숙해질 거야.」', fx: applyFx({ aff: 1 }, 'marta'), choices: [{ t: '내려간다', run: () => null }] }; } }] }; t.fx = fx; t.roll = roll; return t; };
  return {
    who: 'marta', desc: pre + '\n\n「아무튼 하룻밤 숙박비 5골드. 대분산 때문에 장작값이 장난 아니거든.」\n마르타가 손바닥을 내민다. 밀가루가 묻어 있다.',
    choices: [
      { t: '5골드를 낸다', tag: '골드 −5 · 마르타 호감↑', run: () => after('동전이 손바닥에 떨어진다. 「고마워. 아침은 서비스야.」 탄 빵 한 조각을 쥐여 준다.', applyFx({ gold: -5, aff: 1, item: 'bread' }, 'marta')) },
      { t: '깎아 달라고 말로 푼다', tag: '설득 13 · 실패 시 −8G·의심받음', run: () => { const r = check('설득', 13); return r.ok ? after('「…쓰러진 사람한테까지 받으면 내가 나쁜 사람이지. 이번만 공짜야.」', applyFx({ aff: 1 }, 'marta'), r.line) : after('「말 많은 손님은 8골드.」 결국 더 냈다.', applyFx({ gold: -8, status: { 의심받음: 3 } }, 'marta'), r.line); } },
      { t: '창문으로 몰래 빠져나간다', tag: '민첩 14 · 실패 시 HP−3·벌금', run: () => { const r = check('민첩', 14); return r.ok ? after('창틀을 넘어 지붕을 타고 빠져나갔다… 가 마르타가 아래층 문 앞에 팔짱을 끼고 서 있다. 「…재주는 좋네. 다음엔 내.」', applyFx({ aff: -1 }, 'marta'), r.line) : after('창틀에 발이 걸려 철푸덕. 「벌금 포함 8골드.」', applyFx({ hp: -3, gold: -8, aff: -1 }, 'marta'), r.line); } }]
  };
}
function tutorialToast() {
  if (!flag('tut_seen')) { setTimeout(() => showTutorial(0), 400); return; }
  setTimeout(() => toast('이동: 방향키/WASD · 대화·조사: E/스페이스 · 퀘스트: Q · 지도: M · 확대/축소: +/− 또는 휠'), 300);
}

// =========================================================================
// 맵 로딩 / 이동 / 워프
// =========================================================================
let renderMapDirty = false;
function applyMapMods(m) {
  const mods = S.mods && S.mods[m.id]; if (mods) for (const k in mods) { const [x, y] = k.split(',').map(Number); if (m.g[y]) m.g[y][x] = mods[k]; }
  if (m.id === 'cave' && flag('gate_open')) for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.g[y][x] === 'g') m.g[y][x] = 'v';
  if (m.id === 'libB' && flag('secret_open') && m.secret) m.g[m.secret[1]][m.secret[0]] = '_';
}
const ANIMCH = new Set('~qOzyL!');
function loadMap(id) {
  MAP = MAPS[id]; applyMapMods(MAP);
  LAYER = renderMapLayer(MAP);
  MAP.anim = []; MAP.lights = [];
  for (let y = 0; y < MAP.h; y++) for (let x = 0; x < MAP.w; x++) { const c = MAP.g[y][x]; if (ANIMCH.has(c)) MAP.anim.push([x, y, c]); if ('Lq!yzO'.includes(c)) MAP.lights.push([x, y, c]); }
  if (MAP.decor) MAP.decor.forEach(d => { if (d.kind === 'fountain') MAP.lights.push([d.x + 1, d.y + 1, 'F']); });
  spawnActors();
  AudioSys.play(MAP.music, isNightMusic());
  $('#loc-name').textContent = MAP.name;
}
function walkable(x, y, ignoreActors) {
  if (!MAP || x < 0 || y < 0 || x >= MAP.w || y >= MAP.h) return false;
  if (SOLID.has(MAP.g[y][x])) return false;
  if (!ignoreActors && ACTORS.some(a => a.x === x && a.y === y)) return false;
  return true;
}
function nearestFree(x, y) {
  const seen = new Set(), q = [[x, y]];
  while (q.length) { const [cx, cy] = q.shift(); const k = cx + ',' + cy; if (seen.has(k)) continue; seen.add(k); if (walkable(cx, cy) && !(PLAYER && PLAYER.x === cx && PLAYER.y === cy) && !'D^v'.includes(MAP.g[cy][cx])) return [cx, cy]; if (seen.size > 400) break; for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && ny >= 0 && nx < MAP.w && ny < MAP.h && !SOLID.has(MAP.g[ny][nx]) || MAP.g[ny] && MAP.g[ny][nx] === 'Q') q.push([nx, ny]); } }
  return [x, y];
}
function spawnActors() {
  ACTORS.length = 0;
  for (const id in NPCS) {
    const n = NPCS[id]; if (n.map !== MAP.id) continue;
    if (id === 'outlier' && qDone('main') && flag('ending_seen')) continue;
    if (n.guard && flag('g_' + id)) continue;
    if (id === 'mimic' && flag('mimic_done') && !flag('mimic_friend')) continue;
    let pos = null;
    if (n.at) pos = n.at; else if (n.rel) pos = [MAP.cx + n.rel[0], MAP.cy + n.rel[1]]; else if (MAP.slots && MAP.npcSlots) { const i = MAP.npcSlots.indexOf(id); if (i >= 0 && MAP.slots[i]) pos = MAP.slots[i]; }
    if (!pos) continue;
    let [x, y] = pos;
    const fixed = !n.rel && !n.at; // 실내 고정 자리 (카운터 뒤 등)
    if (!fixed || SOLID.has(MAP.g[y][x])) [x, y] = nearestFree(x, y);
    if (id === 'pivalu' && flag('cat_found')) continue;
    ACTORS.push({ id, x, y, px: x * TS, py: y * TS, dir: 0, moving: 0, fr: 0, wander: n.wander || 0, home: [x, y], t: Math.random() * 3000, spr: SPR[id], big: !!n.big, bob: n.look.kind === 'ghost' });
  }
  // 데이지 옆에 돌아온 피발루
  if (MAP.id === 'town' && qDone('s_cat')) { const d = ACTORS.find(a => a.id === 'daisy'); if (d) { const [x, y] = nearestFree(d.x + 1, d.y); ACTORS.push({ id: 'pivalu', x, y, px: x * TS, py: y * TS, dir: 0, moving: 0, fr: 0, wander: 2, home: [x, y], t: 0, spr: SPR.pivalu }); } }
}
function warpTo(mapId, x, y, dir) {
  if (transitioning) return;
  transitioning = true;
  const ov = $('#fade'); ov.classList.add('on');
  AudioSys.sfx('door');
  setTimeout(() => {
    const prev = MAP ? MAP.id : null;
    loadMap(mapId);
    if (x == null) { const p = arrivalFor(mapId, prev); x = p[0]; y = p[1]; dir = p[2]; }
    PLAYER.x = x; PLAYER.y = y; PLAYER.px = x * TS; PLAYER.py = y * TS; PLAYER.dir = dir != null ? dir : PLAYER.dir; PLAYER.moving = 0;
    const tz = targetZoom(); cam.zoom = tz * (prev && MAPS[prev] && MAPS[prev].theme === 'town' && MAP.theme !== 'town' ? 1.45 : prev && MAP.theme === 'town' ? 0.7 : 1.2); cam.target = tz;
    snapCam();
    ov.classList.remove('on');
    banner(MAP.name);
    transitioning = false; save();
    setTimeout(() => checkCuts('enter'), 500);
  }, 260);
}
function arrivalFor(mapId, from) {
  const m = MAPS[mapId];
  const find = ch => { for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.g[y][x] === ch) return [x, y]; return null; };
  const adj = (p, prefer) => { const order = prefer === 'up' ? [[0, -1], [0, 1], [1, 0], [-1, 0]] : [[0, 1], [1, 0], [-1, 0], [0, -1]]; for (const [dx, dy] of order) { const nx = p[0] + dx, ny = p[1] + dy; if (nx >= 0 && ny >= 0 && nx < m.w && ny < m.h && !SOLID.has(m.g[ny][nx]) && !'D^v'.includes(m.g[ny][nx])) return [nx, ny, dy < 0 ? 3 : dy > 0 ? 0 : dx < 0 ? 1 : 2]; } return [p[0], p[1], 0]; };
  if (m.arrive && m.arrive[from]) return m.arrive[from].slice();
  if (mapId === 'town') {
    if (from === 'forest') return [m.w - 2, m.cy, 1];
    const b = BUILDINGS.find(b => b.map === from);
    if (b) return [b.door[0], b.door[1] + 1, 0];
    return [m.start[0], m.start[1], 3];
  }
  if (mapId === 'forest') { if (from === 'cave') return [34, 4, 0]; return [1, 16, 2]; }
  if (mapId === 'cave' && from === 'forest') { const p = find('D'); return adj(p, 'up'); }
  const link = LINKS.find(l => (l[0] === mapId && l[2] === from) || (l[2] === mapId && l[0] === from));
  if (link) { const ch = link[0] === mapId ? link[1] : link[3]; const p = find(ch); if (p) return adj(p); }
  if (mapId === 'temple') return [7, 9, 3];
  const d = find('D'); if (d) return adj(d, 'up');
  return [Math.floor(m.w / 2), Math.floor(m.h / 2), 0];
}
function onArrive() {
  const x = PLAYER.x, y = PLAYER.y, c = MAP.g[y][x];
  S.steps++;
  if (S.steps % 2 === 0) AudioSys.sfx('step');
  if (S.steps % 25 === 0) { tickStatus(1); syncHUD(); }
  if (S.status.출혈 && S.steps % 10 === 0) { S.hp = Math.max(1, S.hp - 1); syncHUD(); floatText('-1', '#ff5d7a'); }
  // 출입
  if (c === 'D') {
    if (MAP.id === 'town') { const b = BUILDINGS.find(b => b.door[0] === x && b.door[1] === y); if (b) return warpTo(b.map, null, null); }
    else if (MAP.id === 'forest') return warpTo('cave', null, null);
    else if (MAP.id === 'cave') return warpTo('forest', null, null);
    else return warpTo('town', null, null);
  }
  if (c === '^' || c === 'v') { const l = LINKS.find(l => (l[0] === MAP.id && l[1] === c) || (l[2] === MAP.id && l[3] === c)); if (l) return warpTo(l[0] === MAP.id ? l[2] : l[0], null, null); }
  { const e = edgeOn(x, y); if (e) return goEdge(e, true); }
  // 첫 방문 이벤트
  if (!flag('visit_' + MAP.id)) { setFlag('visit_' + MAP.id); }
  if (checkCuts('step')) return;
  if (typeof maybeBias === 'function' && maybeBias()) return;
  if (typeof maybeRandomEvent === 'function' && maybeRandomEvent()) return;
  if (typeof maybeQuizEncounter === 'function' && maybeQuizEncounter()) return;
  // 광장 무작위 이벤트: 소매치기
  if (MAP.id === 'town' && S.steps % 97 === 0 && !dlgOpen && Math.random() < .5 && S.gold > 10 && !flag('fin_event_' + Math.floor(S.time / DAY))) {
    setFlag('fin_event_' + Math.floor(S.time / DAY));
    openTurn({ who: 'fin', mood: 'sly', desc: '골목을 지나는데 누가 어깨를 툭 친다. 「아 죄송!」 주근깨 소년이 지나간다. 주머니가 이상하게 가볍다.', choices: [
      { t: '쫓아간다', tag: '민첩 13', run: () => { const r = check('민첩', 13); return Object.assign(npcTurn('fin', r.ok ? '모퉁이에서 핀의 옷깃을 잡았다. 「아 알았어! 돌려줄게!」' : '골목이 세 갈래다. 핀은 이미 없다.'), { roll: r.line, fx: applyFx(r.ok ? { aff: 1 } : { gold: -6 }, 'fin') }); } },
      { t: '「경비병!」 하고 외친다', tag: '설득 11', run: () => { const r = check('설득', 11); return Object.assign(npcTurn('fin', r.ok ? '핀이 얼어붙더니 동전을 바닥에 던지고 달아난다.' : '아무도 안 온다. 대분산 때문에 경비병들도 바쁘다.'), { roll: r.line, fx: applyFx(r.ok ? { aff: -1 } : { gold: -6 }, 'fin') }); } },
      { t: '그냥 둔다. 동전 몇 개쯤.', run: () => Object.assign(npcTurn('fin', '멀리서 핀이 뒤돌아본다. 잠깐 망설이더니 한 개를 던져 돌려준다. 「…착한 척하지 마.」'), { fx: applyFx({ gold: -4, aff: 2 }, 'fin') }) }] });
  }
}
function frontTile() { const d = [[0, 1], [-1, 0], [1, 0], [0, -1]][PLAYER.dir]; return [PLAYER.x + d[0], PLAYER.y + d[1], d]; }
function findTarget() {
  const [fx, fy, d] = frontTile();
  let a = ACTORS.find(a => a.x === fx && a.y === fy);
  if (a) return { npc: a };
  const c = MAP.g[fy] && MAP.g[fy][fx];
  if (c === 'Q' || c === 'i') { a = ACTORS.find(a => a.x === fx + d[0] && a.y === fy + d[1]); if (a) return { npc: a }; }
  if (c && (INTERACT.has(c) || MINOR.has(c))) return { tile: [fx, fy, c], minor: !INTERACT.has(c) || c === '~' };
  // 분수 (장식물)
  if (c === 'F') return { tile: [fx, fy, 'F'] };
  // 옆 칸 NPC
  a = ACTORS.find(a => Math.abs(a.x - PLAYER.x) + Math.abs(a.y - PLAYER.y) === 1);
  if (a) return { npc: a };
  return null;
}
function interact() {
  if (dlgOpen || panelOpen || transitioning || cutOpen || window._tutOpen) return;
  const t = findTarget(); if (!t) { const [fx, fy] = frontTile(); const c = MAP.g[fy] && MAP.g[fy][fx]; if (c === '~' || c === 'l') { openTurn(fishTurn()); } return; }
  if (t.npc) { const a = t.npc; a.dir = [3, 2, 1, 0][PLAYER.dir]; openTurn(npcTurn(a.id)); return; }
  const [x, y, c] = t.tile;
  const turn = objectTurn(c, x, y); if (turn) openTurn(turn);
}

// =========================================================================
// 카메라 / 줌
// =========================================================================
function targetZoom() {
  const vw = canvas.clientWidth, vh = canvas.clientHeight;
  let z;
  const room = !MAP.follow && (MAP.theme === 'interior' || ((MAP.theme === 'dungeon') && MAP.w <= 22));
  if (room) z = Math.min(vw / ((MAP.w + 1) * TS), vh / ((MAP.h + 2.5) * TS)) * 0.98;
  else z = Math.sqrt(vw * vh) / (MAP.fit * TS);
  z = Math.max(room ? 1.6 : 1.3, Math.min(6.5, z));
  return z * S.zoomMul;
}
function setZoomMul(m) { S.zoomMul = Math.max(0.55, Math.min(2.4, m)); cam.target = targetZoom(); }
// 컷씬 중 화면에서 가려지지 않는 세로 구간 [위, 아래] (px). 컷씬이 아니면 null
let _safeT = 0, _safeV = null;
function cineSafeArea() {
  if (typeof CINE === 'undefined' || !CINE.on || !cutOpen) return null;
  const now = performance.now(); if (now - _safeT < 250 && _safeV) return _safeV;
  _safeT = now;
  const rc = canvas.getBoundingClientRect(), box = document.querySelector('#cut .cut-box'), bar = document.querySelector('#cut .bar.top');
  if (!box || !rc.height) return (_safeV = null);
  const b = box.getBoundingClientRect(), t = bar ? bar.getBoundingClientRect().bottom : rc.top;
  const top = Math.max(0, t - rc.top) + 6, bot = Math.min(rc.height, b.top - rc.top - 34);
  return (_safeV = bot - top > rc.height * 0.25 ? [top, bot] : null);
}
function snapCam() { const p = camGoal(); cam.x = p[0]; cam.y = p[1]; }
function camGoal() {
  const vw = canvas.clientWidth / cam.zoom, vh = canvas.clientHeight / cam.zoom;
  const fp = (typeof CAM_FOCUS !== 'undefined' && CAM_FOCUS) ? CAM_FOCUS : null;
  let x = (fp ? fp[0] : PLAYER.px + 8) - vw / 2, y = (fp ? fp[1] + vh * (fp[2] || 0) : PLAYER.py + 4) - vh / 2;
  const W = MAP.w * TS, H = MAP.h * TS;
  x = W <= vw ? (W - vw) / 2 : Math.max(0, Math.min(W - vw, x));
  const safe = cineSafeArea();
  if (safe) {
    // 컷씬: 위 검은 띠와 아래 대사창 사이의 「보이는 영역」 한가운데에 초점을 둔다. 맵 끝을 넘어도 된다.
    const top = safe[0] / cam.zoom, bot = safe[1] / cam.zoom, vis = bot - top;
    const fy = fp ? fp[1] : PLAYER.py + 4;
    y = H <= vis ? (H - vis) / 2 - top : Math.max(-top - 8, Math.min(H - bot + 8, fy - top - vis / 2));
    return [x, y];
  }
  y = H <= vh ? (H - vh) / 2 : Math.max(-8, Math.min(H - vh + 8, y));
  return [x, y];
}
let shakeAmt = 0;
function shake(a) { shakeAmt = Math.max(shakeAmt, a); }

// =========================================================================
// 업데이트
// =========================================================================
const MOVE_MS = 150;
function update(dt) {
  S.playMs += dt; musicTick(dt);
  if (!dlgOpen && !panelOpen) S.time += dt / 1000;
  // 플레이어 이동 (8방향 · 칸 사이 끊김 없이 이어 걷기)
  if (PLAYER.moving > 0) {
    PLAYER.moving -= dt;
    if (PLAYER.moving <= 0) {
      const over = -PLAYER.moving;
      PLAYER.px = PLAYER.x * TS; PLAYER.py = PLAYER.y * TS; PLAYER.fr = PLAYER.fr === 1 ? 2 : 1; PLAYER.moving = 0;
      onArrive();
      const inp = canWalkNow() && PLAYER.moving <= 0 ? inputDir() : null;
      if (inp && tryStep(inp)) PLAYER.moving = Math.max(1, PLAYER.moving - Math.min(over, PLAYER.moveDur * .5));
    }
    if (PLAYER.moving > 0) { const t = PLAYER.moving / PLAYER.moveDur; PLAYER.px = (PLAYER.x - PLAYER.mdx * t) * TS; PLAYER.py = (PLAYER.y - PLAYER.mdy * t) * TS; }
  }
  if (PLAYER.moving <= 0 && canWalkNow()) { const inp = inputDir(); if (inp) tryStep(inp); }
  if (PLAYER.moving <= 0 && !inputDir()) PLAYER.fr = 0;
  if (typeof updateEvents === 'function') updateEvents(dt);
  if (typeof updateCinema === 'function') updateCinema(dt);
  if (typeof updateGuide === 'function') updateGuide(dt);
  // NPC 배회
  ACTORS.forEach(a => {
    if (a.moving > 0) { a.moving -= dt; const t = Math.max(0, a.moving) / 260; a.px = (a.x - a.mdx * t) * TS; a.py = (a.y - a.mdy * t) * TS; if (a.moving <= 0) { a.px = a.x * TS; a.py = a.y * TS; a.fr = 0; } else a.fr = (Math.floor(a.moving / 90) % 2) + 1; return; }
    a.t -= dt;
    if (a.wander && a.t <= 0 && !dlgOpen) {
      a.t = 1500 + Math.random() * 3000;
      const dirs = [[0, 1, 0], [-1, 0, 1], [1, 0, 2], [0, -1, 3]], [dx, dy, di] = dirs[Math.floor(Math.random() * 4)];
      const nx = a.x + dx, ny = a.y + dy;
      a.dir = di;
      if (Math.abs(nx - a.home[0]) + Math.abs(ny - a.home[1]) <= a.wander && walkable(nx, ny) && !(PLAYER.x === nx && PLAYER.y === ny) && !'D^v'.includes(MAP.g[ny][nx])) { a.x = nx; a.y = ny; a.mdx = dx; a.mdy = dy; a.moving = 260; }
    } else if (!a.wander && a.t <= 0) { a.t = 2500 + Math.random() * 4000; const dd = Math.abs(PLAYER.x - a.x) + Math.abs(PLAYER.y - a.y); if (dd < 4) a.dir = Math.abs(PLAYER.x - a.x) > Math.abs(PLAYER.y - a.y) ? (PLAYER.x < a.x ? 1 : 2) : (PLAYER.y < a.y ? 3 : 0); }
  });
  // 카메라
  const CS = (typeof CAM_SPEED !== 'undefined' && CAM_SPEED) || { pan: 120, zoom: 220 };
  cam.zoom += (cam.target - cam.zoom) * Math.min(1, dt / CS.zoom);
  const g = camGoal();
  cam.x += (g[0] - cam.x) * Math.min(1, dt / CS.pan); cam.y += (g[1] - cam.y) * Math.min(1, dt / CS.pan);
  shakeAmt *= 0.88;
  // 파티클
  spawnParticles(dt);
  for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.life -= dt; p.x += p.vx * dt / 16; p.y += p.vy * dt / 16; if (p.kind === 'leaf') p.vx = Math.sin(p.life / 300 + p.seed) * 0.35 + 0.2; if (p.life <= 0) particles.splice(i, 1); }
  floats.forEach(f => { f.life -= dt; f.y -= dt / 40; }); for (let i = floats.length - 1; i >= 0; i--) if (floats[i].life <= 0) floats.splice(i, 1);
  if (renderMapDirty) { LAYER = renderMapLayer(MAP); renderMapDirty = false; }
  saveTimer += dt; if (saveTimer > 30000) { saveTimer = 0; save(); }
}
// ---------- 입력 → 8방향 ----------
function canWalkNow() { return !dlgOpen && !panelOpen && !transitioning && !cutOpen && !window._tutOpen; }
function inputDir() {
  let ix = 0, iy = 0;
  if (held.joy) { ix = held.jx; iy = held.jy; }
  else { const k = held.keys; if (k.includes(2)) ix++; if (k.includes(1)) ix--; if (k.includes(0)) iy++; if (k.includes(3)) iy--; }
  const m = Math.hypot(ix, iy); if (m < 0.3) return null;
  const nx = ix / m, ny = iy / m;
  const dx = Math.abs(nx) > 0.383 ? Math.sign(nx) : 0, dy = Math.abs(ny) > 0.383 ? Math.sign(ny) : 0;
  return { dx, dy, ax: Math.abs(nx), ay: Math.abs(ny), m: Math.min(1, m) };
}
function faceFor(inp) {
  const { dx, dy } = inp, hx = dx < 0 ? 1 : 2, vy = dy > 0 ? 0 : 3;
  if (dx && dy) { if (PLAYER.dir === hx || PLAYER.dir === vy) return PLAYER.dir; return inp.ax >= inp.ay ? hx : vy; }
  return dx ? hx : vy;
}
function tryStep(inp) {
  const { dx, dy } = inp;
  PLAYER.dir = faceFor(inp);
  const x = PLAYER.x, y = PLAYER.y;
  const cand = [];
  if (dx && dy) {
    if (walkable(x + dx, y + dy) && walkable(x + dx, y) && walkable(x, y + dy)) cand.push([dx, dy]);
    if (inp.ax >= inp.ay) cand.push([dx, 0], [0, dy]); else cand.push([0, dy], [dx, 0]);
  } else cand.push([dx, dy]);
  for (const [mx, my] of cand) {
    const nx = x + mx, ny = y + my;
    const e = edgeAt(nx, ny); if (e) { goEdge(e, false); return true; }
    if (!(dx && dy) && tryPush(nx, ny, [mx, my])) return true;
    if (walkable(nx, ny)) {
      PLAYER.x = nx; PLAYER.y = ny; PLAYER.mdx = mx; PLAYER.mdy = my;
      let dur = held.run ? 95 : MOVE_MS;
      if (held.joy && inp.m < 0.62) dur *= 1.45;      // 살짝만 밀면 천천히
      if (mx && my) dur *= 1.38;                      // 대각선은 거리만큼 조금 더
      PLAYER.moveDur = dur; PLAYER.moving = dur;
      return true;
    }
  }
  return false;
}
// ---------- 맵 가장자리 이동 (동서남북) ----------
function edgeMatch(e, x, y, beyond) {
  const W = MAP.w, H = MAP.h, inY = y >= (e.y0 ?? 0) && y <= (e.y1 ?? H), inX = x >= (e.x0 ?? 0) && x <= (e.x1 ?? W);
  if (e.side === 'E') return inY && (beyond ? x >= W : x >= W - 1);
  if (e.side === 'W') return inY && (beyond ? x < 0 : x <= 0);
  if (e.side === 'N') return inX && (beyond ? y < 0 : y <= 0);
  if (e.side === 'S') return inX && (beyond ? y >= H : y >= H - 1);
  return false;
}
function edgeAt(x, y) { return (MAP.edgeWarps || []).find(e => edgeMatch(e, x, y, true)) || null; }
function edgeOn(x, y) { return (MAP.edgeWarps || []).find(e => edgeMatch(e, x, y, false)) || null; }
function signCount() { return Object.keys(S.read || {}).length; }
let _gateT = 0;
function goEdge(e, onCell) {
  if (e.need && signCount() < e.need) {
    if (onCell && PLAYER.mdx !== undefined) { PLAYER.x -= PLAYER.mdx; PLAYER.y -= PLAYER.mdy; PLAYER.mdx = -PLAYER.mdx; PLAYER.mdy = -PLAYER.mdy; PLAYER.moveDur = PLAYER.moving = 160; }
    clearHeld();
    if (performance.now() - _gateT < 900) return;
    _gateT = performance.now();
    openTurn(gateTurn(e));
    return;
  }
  warpTo(e.to, null, null);
}
function gateTurn(e) {
  const have = signCount(), need = e.need, d = DUNGEON_INFO[e.to] || { n: MAPS[e.to] ? MAPS[e.to].name : '?' };
  const bar = '■'.repeat(Math.min(need, have)) + '□'.repeat(Math.max(0, need - have));
  AudioSys.sfx('fail');
  return { title: '지식의 결계', sub: d.n, obj: 'gate',
    desc: `${d.n} 입구를 푸른 결계가 막고 있다. 돌기둥에 글씨가 떠오른다.\n\n「표지판의 지식을 <b>${need}개</b> 모은 자만 지나갈 수 있다.」\n\n📖 지금 읽은 표지판 <b>${have}/${need}</b>\n<span class="ex">${bar}</span>\n\n마을 곳곳의 표지판·석판을 읽으면 결계가 약해진다. (북쪽 왕성에도 몇 개 있다)`,
    choices: [{ t: '발길을 돌린다', run: () => null }, { t: '결계에 손을 대 본다', tag: '정신 14', run: () => { const r = check('정신', 14); return Object.assign(gateTurn(e), { roll: r.line, fx: applyFx(r.ok ? { focus: 1 } : { hp: -1 }) }); } }] };
}

// ---------- 가상 조이스틱 (좀비고처럼: 누른 자리에 생기고, 손가락을 따라감) ----------
function bindJoystick() {
  const zone = $('#joyzone'), base = $('#joy'), knob = $('#joy-knob');
  if (!zone) return;
  const R = 50;
  let pid = null, cx = 0, cy = 0;
  const place = (x, y) => { base.style.left = x + 'px'; base.style.top = y + 'px'; };
  const home = () => { const r = zone.getBoundingClientRect(); place(Math.min(110, r.width * .5), r.height - 110); };
  const reset = () => { pid = null; held.joy = false; held.jx = held.jy = 0; knob.style.transform = 'translate(-50%,-50%)'; base.classList.remove('on'); home(); };
  window._joyReset = () => { if (pid !== null) { held.joy = false; held.jx = held.jy = 0; knob.style.transform = 'translate(-50%,-50%)'; pid = null; base.classList.remove('on'); home(); } };
  zone.addEventListener('pointerdown', e => {
    if (pid !== null) return;
    e.preventDefault(); AudioSys.resume();
    pid = e.pointerId; try { zone.setPointerCapture(pid); } catch (er) {}
    const r = zone.getBoundingClientRect(); cx = e.clientX - r.left; cy = e.clientY - r.top;
    place(cx, cy); base.classList.add('on'); held.joy = true; held.jx = held.jy = 0;
  });
  zone.addEventListener('pointermove', e => {
    if (e.pointerId !== pid) return;
    e.preventDefault();
    const r = zone.getBoundingClientRect(); let ox = e.clientX - r.left - cx, oy = e.clientY - r.top - cy;
    const d = Math.hypot(ox, oy);
    if (d > R) { cx += ox * (1 - R / d); cy += oy * (1 - R / d); place(cx, cy); ox *= R / d; oy *= R / d; } // 손가락 따라 받침도 끌려옴
    knob.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
    held.joy = true; held.jx = ox / R; held.jy = oy / R;
  });
  const up = e => { if (e.pointerId === pid) reset(); };
  zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up); zone.addEventListener('lostpointercapture', up);
  window.addEventListener('resize', home);
  home();
}

function isNightMusic() { const p = dayPhase(); return p >= .6 && p < .93; }
let _musT = 0;
function musicTick(dt) { _musT += dt; if (_musT < 1000) return; _musT = 0; if (!MAP || titleMode || cutOpen || MAP.music === 'boss') return; if (window.BIAS_BGM) { if (dlgOpen || cutOpen || Date.now() < (window.BIAS_HOLD || 0)) return; window.BIAS_BGM = false; } AudioSys.play(MAP.music, isNightMusic()); }
function dayPhase() { const p = (S.time % DAY) / DAY; return p; }
function nightAmount() { if (MAP.theme !== 'town' && MAP.theme !== 'forest') return 0; const p = dayPhase(); if (p < .55) return 0; if (p < .65) return (p - .55) / .1 * .6; if (p < .9) return .6; return (1 - (p - .9) / .1) * .6; }
function duskAmount() { if (MAP.theme !== 'town' && MAP.theme !== 'forest') return 0; const p = dayPhase(); return p > .5 && p < .68 ? Math.sin((p - .5) / .18 * Math.PI) : 0; }

function spawnParticles(dt) {
  if (particles.length > 90) return;
  const vw = canvas.clientWidth / cam.zoom, vh = canvas.clientHeight / cam.zoom;
  const r = Math.random();
  const th = MAP.theme;
  if ((th === 'town' || th === 'forest') && r < dt / (th === 'forest' ? 180 : 420)) particles.push({ kind: 'leaf', x: cam.x + Math.random() * vw, y: cam.y - 5, vx: .2, vy: .25 + Math.random() * .2, life: 9000, seed: Math.random() * 9, c: th === 'forest' ? '#8bc34a' : ['#ff8fb3', '#ffd84d', '#9bd36a'][Math.floor(Math.random() * 3)] });
  if (nightAmount() > .3 && r < dt / 260) particles.push({ kind: 'fly', x: cam.x + Math.random() * vw, y: cam.y + Math.random() * vh, vx: (Math.random() - .5) * .15, vy: (Math.random() - .5) * .15, life: 4000, seed: Math.random() * 9, c: '#d9ff7a' });
  if (th === 'interior' && r < dt / 500) particles.push({ kind: 'dust', x: cam.x + Math.random() * vw, y: cam.y + Math.random() * vh, vx: .03, vy: -.02, life: 5000, seed: 0, c: 'rgba(255,240,200,.6)' });
  if ((th === 'cave' || th === 'dungeon') && r < dt / 300) particles.push({ kind: th === 'dungeon' ? 'ember' : 'dust', x: PLAYER.px + (Math.random() - .5) * 200, y: PLAYER.py + (Math.random() - .5) * 140, vx: (Math.random() - .5) * .1, vy: th === 'dungeon' ? -.12 : .04, life: 3500, seed: 0, c: th === 'dungeon' ? '#ff922b' : 'rgba(200,220,255,.5)' });
}
const floats = [];
function floatText(t, c) { floats.push({ t, c, x: PLAYER.px + 8, y: PLAYER.py - 10, life: 900 }); }

// =========================================================================
// 렌더
// =========================================================================
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(canvas.clientWidth * dpr); canvas.height = Math.floor(canvas.clientHeight * dpr);
  lightCv.width = Math.ceil(canvas.clientWidth / 2); lightCv.height = Math.ceil(canvas.clientHeight / 2);
  if (MAP) cam.target = targetZoom();
}
function render(t) {
  const W = canvas.width, H = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = { town: '#2f5d2a', forest: '#244a22', interior: '#140e0c', cave: '#0d0a0a', dungeon: '#07070c' }[MAP.theme] || '#000';
  ctx.fillRect(0, 0, W, H);
  const z = cam.zoom * dpr;
  const sx = shakeAmt > .3 ? (Math.random() - .5) * shakeAmt : 0, sy = shakeAmt > .3 ? (Math.random() - .5) * shakeAmt : 0;
  const cx = Math.round((cam.x + sx) * z) / z, cy = Math.round((cam.y + sy) * z) / z;
  ctx.setTransform(z, 0, 0, z, -cx * z, -cy * z);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(LAYER, 0, 0);
  // 보이는 범위
  const vx0 = Math.floor(cx / TS) - 1, vy0 = Math.floor(cy / TS) - 2, vx1 = vx0 + Math.ceil(canvas.clientWidth / cam.zoom / TS) + 3, vy1 = vy0 + Math.ceil(canvas.clientHeight / cam.zoom / TS) + 4;
  MAP.anim.forEach(([x, y, c]) => { if (x >= vx0 && x <= vx1 && y >= vy0 && y <= vy1) drawAnimTile(ctx, c, x * TS, y * TS, t, x, y); });
  (MAP.decor || []).forEach(d => { if (d.kind === 'fountain') drawFountainAnim(ctx, d, t); });
  // 열린 상자 / 개방된 문
  for (const k in S.opened) { const [mid, pos] = k.split(':'); if (mid !== MAP.id) continue; const [x, y] = pos.split(',').map(Number); drawChest(ctx, x * TS, y * TS, true); }
  if (typeof drawDecreeBoard === 'function') drawDecreeBoard(ctx, t);
  if (typeof drawGuideWorld === 'function') drawGuideWorld(ctx, t);
  // 개체 (y 정렬)
  const ents = ACTORS.concat([PLAYER]).sort((a, b) => a.py - b.py);
  ents.forEach(a => {
    const spr = a.spr; if (!spr) return;
    const frm = spr[a.dir][a.fr || 0];
    const bob = (a.bob ? Math.sin(t / 300) * 2 : 0) - (a.hop ? Math.sin(Math.min(1, a.hop) * Math.PI) * 4 : 0);
    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(a.px + 8, a.py + 15, a.big ? 12 : 6, a.big ? 4 : 2.5, 0, 0, 7); ctx.fill();
    const w = frm.width, h = frm.height;
    ctx.drawImage(frm, Math.round(a.px + 8 - w / 2), Math.round(a.py + 16 - h + bob));
  });
  // 파티클 (월드)
  particles.forEach(p => {
    if (p.kind === 'fly') { const a = .5 + .5 * Math.sin(t / 200 + p.seed * 10); ctx.fillStyle = `rgba(217,255,122,${a})`; ctx.fillRect(p.x, p.y, 1, 1); }
    else { ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.kind === 'leaf' ? 2 : 1, 1); }
  });
  // 조명 (밤 / 어두운 곳)
  const dark = MAP.dark ? (flag('konami') ? .7 : .86) : nightAmount();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (dark > 0) {
    const L = lightCtx, lw = lightCv.width, lh = lightCv.height, k = 0.5 * dpr; // light 캔버스 = 화면 절반 해상도
    L.globalCompositeOperation = 'source-over'; L.clearRect(0, 0, lw, lh);
    if (MAP.dark) { L.fillStyle = `rgba(4,3,12,${dark})`; } else { const k2 = dark / .6; L.fillStyle = mix('#ffffff', '#2c3672', k2); } L.fillRect(0, 0, lw, lh);
    L.globalCompositeOperation = 'destination-out';
    const toS = (wx, wy) => [(wx - cx) * cam.zoom / 2, (wy - cy) * cam.zoom / 2];
    const hole = (wx, wy, r, a) => { const [x, y] = toS(wx, wy); const rr = r * cam.zoom / 2; const g = L.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); L.fillStyle = g; L.fillRect(x - rr, y - rr, rr * 2, rr * 2); };
    const flick = 1 + Math.sin(t / 90) * .04;
    hole(PLAYER.px + 8, PLAYER.py + 4, (has('torch') ? 96 : MAP.dark ? 60 : 70) * flick, 1);
    MAP.lights.forEach(([x, y, c]) => { if (x < vx0 - 3 || x > vx1 + 3 || y < vy0 - 3 || y > vy1 + 3) return; hole(x * TS + 8, y * TS + (c === 'L' ? 0 : 6), (c === 'L' ? 56 : c === 'z' ? 40 : c === 'F' ? 50 : 46) * flick, .95); });
    if (!MAP.dark) ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(lightCv, 0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    // 따뜻한 불빛 (가산 합성)
    ctx.globalCompositeOperation = 'lighter';
    MAP.lights.forEach(([x, y, c]) => { if (x < vx0 || x > vx1 || y < vy0 || y > vy1) return; const sx2 = (x * TS + 8 - cx) * cam.zoom * dpr, sy2 = (y * TS + (c === 'L' ? 0 : 6) - cy) * cam.zoom * dpr, r = (c === 'y' ? 30 : 36) * cam.zoom * dpr * flick; const g = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, r); const col = c === 'y' ? '80,200,255' : c === 'F' ? '120,180,255' : '255,160,60'; g.addColorStop(0, `rgba(${col},${.18 * dark + .04})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(sx2 - r, sy2 - r, r * 2, r * 2); });
    ctx.globalCompositeOperation = 'source-over';
  }
  // 노을 색보정
  const dusk = duskAmount();
  if (dusk > 0) { ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(255,120,60,${dusk * .45})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
  if (flag('konami')) { ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `hsla(${(t / 20) % 360},90%,60%,.18)`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
  // 화면 좌표 UI: 이름표, 건물 이름, 상호작용 말풍선
  const toScreen = (wx, wy) => [(wx - cx) * cam.zoom * dpr, (wy - cy) * cam.zoom * dpr];
  const fs = Math.round(Math.max(10, Math.min(13, 4 * cam.zoom)) * dpr);
  ctx.font = `800 ${fs}px "Pretendard","Apple SD Gothic Neo","Noto Sans KR",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.lineJoin = 'round';
  const tag = (txt, x, y, col, plate) => { if (plate) { const w = ctx.measureText(txt).width + 12 * dpr; ctx.fillStyle = 'rgba(20,14,24,.72)'; roundRect(ctx, x - w / 2, y - fs - 6 * dpr, w, fs + 8 * dpr, 6 * dpr); ctx.fill(); ctx.fillStyle = col; ctx.fillText(txt, x, y - 1 * dpr); return; } ctx.lineWidth = 3.2 * dpr; ctx.strokeStyle = 'rgba(20,14,24,.9)'; ctx.strokeText(txt, x, y); ctx.fillStyle = col; ctx.fillText(txt, x, y); };
  if (MAP.labels) MAP.labels.forEach(l => { const [x, y] = toScreen(l.x * TS + 8, l.y * TS - 2); if (x > -200 && x < W + 200 && y > -40 && y < H + 40) tag(l.text, x, y, '#ffe9a8', true); });
  if (typeof drawGuideScreen === 'function' && !titleMode) { ctx.save(); drawGuideScreen(ctx, toScreen, W, H, t, dpr); ctx.restore(); }
  if (typeof drawCinemaScreen === 'function' && !titleMode) { ctx.save(); drawCinemaScreen(ctx, toScreen, W, H, t, dpr); ctx.restore(); ctx.font = `800 ${fs}px "Pretendard Variable","Pretendard","Apple SD Gothic Neo","Noto Sans KR",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; }
  const tgt = (!dlgOpen && !panelOpen && !titleMode) ? findTarget() : null;
  ACTORS.forEach(a => {
    const n = NPCS[a.id] || (typeof CUT_CAST !== 'undefined' && CUT_CAST[a.id] ? Object.assign({ acts: [] }, CUT_CAST[a.id]) : null); if (!n) return; const h = a.spr ? a.spr[0][0].height : 26;
    const [x, y] = toScreen(a.px + 8, a.py + 16 - h - 2 + (a.bob ? Math.sin(t / 300) * 2 : 0));
    if (x < -100 || x > W + 100 || y < -40 || y > H + 60) return;
    const close = Math.abs(a.x - PLAYER.x) + Math.abs(a.y - PLAYER.y) <= 6;
    if (close || MAP.theme !== 'town') { const quest = n.acts.some(ac => actAvailable(ac) && (ac.okFx && (ac.okFx.questDone || ac.okFx.quest))); tag(n.n, x, y, aff(a.id) <= -2 ? '#ff9a9a' : aff(a.id) >= 3 ? '#ffb3e0' : '#ffffff'); if (quest) { ctx.fillStyle = '#ffd84d'; ctx.font = `900 ${fs * 1.3}px sans-serif`; ctx.strokeText('!', x, y - fs - 2 * dpr); ctx.fillText('!', x, y - fs - 2 * dpr); ctx.font = `800 ${fs}px "Pretendard","Apple SD Gothic Neo","Noto Sans KR",sans-serif`; } }
  });
  if (!titleMode) { const [x, y] = toScreen(PLAYER.px + 8, PLAYER.py - 12); tag(S.name, x, y, '#ffd84d'); }
  if (tgt && !titleMode && !tgt.minor) {
    const [wx, wy] = tgt.npc ? [tgt.npc.px + 8, tgt.npc.py - (tgt.npc.spr ? tgt.npc.spr[0][0].height : 26) + 4] : [tgt.tile[0] * TS + 8, tgt.tile[1] * TS - 6];
    const [x, y] = toScreen(wx, wy);
    const b = Math.sin(t / 150) * 3 * dpr;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2a1d2b'; ctx.lineWidth = 2 * dpr;
    roundRect(ctx, x - 13 * dpr, y - 30 * dpr + b - (tgt.npc ? fs + 6 * dpr : 0), 26 * dpr, 18 * dpr, 6 * dpr); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a1d2b'; ctx.font = `900 ${11 * dpr}px sans-serif`; ctx.textBaseline = 'middle'; ctx.fillText(tgt.npc ? '💬' : '🔍', x, y - 21 * dpr + b - (tgt.npc ? fs + 6 * dpr : 0)); ctx.textBaseline = 'bottom';
    $('#btn-a').classList.add('pulse');
  } else $('#btn-a').classList.remove('pulse');
  if (tgt && tgt.minor && !titleMode) $('#btn-a').classList.remove('pulse');
  floats.forEach(f => { const [x, y] = toScreen(f.x, f.y); tag(f.t, x, y, f.c); });
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

function loopErr(err) { if (!loop._err || performance.now() - loop._err > 5000) { loop._err = performance.now(); console.error('[loop]', err); } }
function loop(t) {
  const dt = Math.min(50, t - lastT); lastT = t;
  // 한 프레임에서 오류가 나도 게임이 멈추지 않게 (업데이트·그리기 따로 보호)
  if (started) { try { update(dt); } catch (err) { loopErr(err); } try { render(t); } catch (err) { loopErr(err); } }
  else if (titleMode && MAP) { try { cam.x += dt * 0.012; if (cam.x > MAP.w * TS - canvas.clientWidth / cam.zoom) cam.x = 0; ACTORS.forEach(a => { a.t -= dt; }); render(t); } catch (err) { loopErr(err); } }
  requestAnimationFrame(loop);
}

// =========================================================================
// HUD / 패널
// =========================================================================
function syncHUD() {
  if (!S) return;
  $('#hud-gold').textContent = S.gold; const g2 = $('#hud-gold2'); if (g2) g2.textContent = S.gold;
  $('#hud-hp').style.width = Math.round(S.hp / S.maxHp * 100) + '%';
  $('#hud-hptxt').textContent = `${S.hp}/${S.maxHp}`;
  const p = dayPhase(), ph = p < .5 ? 'day' : p < .65 ? 'dusk' : p < .92 ? 'night' : 'dawn', te = $('#hud-time');
  if (te && te.dataset.ph !== ph) { te.dataset.ph = ph; te.className = ph; te.innerHTML = HUD_ICON[ph]; }
  const st = Object.keys(S.status); $('#hud-status').innerHTML = st.map(k => `<b class="${['고양', '축복'].includes(k) ? 'buff' : 'debuff'}">${k}</b>`).join('');
  const qn = Object.keys(S.quests).filter(k => !S.quests[k].done).length; $('#hud-qn').textContent = qn || '';
}
let toastT = null;
// 상단 시간 아이콘 (해 · 노을 · 달 · 새벽)
const _ic = b => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${b}</svg>`;
const HUD_ICON = {
  day: _ic('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'),
  dusk: _ic('<path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/>'),
  night: _ic('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'),
  dawn: _ic('<path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/>'),
  pin: _ic('<path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>')
};
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
function banner(name) { const b = $('#banner'); b.textContent = name; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); }

function openPanel(kind) {
  if (dlgOpen) return;
  panelOpen = true; clearHeld();
  const p = $('#panel'), body = $('#panel-body'), title = $('#panel-title');
  p.classList.add('open'); AudioSys.sfx('open');
  if (kind === 'quest') {
    title.textContent = '📜 퀘스트';
    const ids = Object.keys(QUESTS);
    const row = id => { const Q = QUESTS[id], s = S.quests[id]; const step = s ? Math.min(s.step, Q.steps.length - 1) : 0;
      let extra = '';
      if (id === 'main' && s && !s.done && s.step === 1) extra = `<div class="sub">${['seal_est', 'seal_test', 'seal_cat'].map(k => `${has(k) ? '✅' : '⬜'} ${ITEMS[k].n}`).join('<br>')}</div>`;
      if (id === 's_signs') extra = `<div class="sub">도감 ${Object.keys(S.read).length}/${Object.keys(LESSONS).length}</div>`;
      if (id === 's_fish') extra = `<div class="sub">낚은 수 ${S.fishCaught}/5</div>`;
      if (id === 'daily') extra = `<div class="sub">해결 ${S.daily || 0}/3</div>`;
      if (id === 's_dungeon' && typeof DUNGEON_INFO !== 'undefined') extra = `<div class="sub">${Object.keys(DUNGEON_INFO).map(d => `${flag('clear_' + d) ? '✅' : '⬜'} ${DUNGEON_INFO[d].n} (${DUNGEON_INFO[d].dir}, 표지판 ${DUNGEON_INFO[d].need})`).join('<br>')}</div>`;
      if (s && !s.done && typeof questGoal === 'function' && questGoal(id)) extra += `<button class="gbtn ${S.guide === id ? 'on' : ''}" data-guide="${id}">📍 ${S.guide === id ? '안내 중' : '길 안내'}</button>`;
      return `<div class="q ${s && s.done ? 'done' : ''}"><div class="qh"><span class="qt ${Q.type === '메인' ? 'main' : ''}">${Q.type}</span> <b>${Q.t}</b> <small>${Q.giver}</small></div>${s ? `<div class="qo">${s.done ? '완료' : '▶ ' + Q.steps[step]}</div>${extra}` : ''}</div>`; };
    const active = ids.filter(id => S.quests[id] && !S.quests[id].done), done = ids.filter(id => S.quests[id] && S.quests[id].done), none = ids.filter(id => !S.quests[id]);
    const sc = storyCount(), nx = nextStory();
    const storyBox = `<div class="story"><div class="story-h"><b>📖 메인 스토리</b><span>${sc}/${STORY.length}</span></div><div class="story-bar"><i style="width:${sc / STORY.length * 100}%"></i></div><div class="story-ch">${STORY.map(st => `<span class="${doneStory(st.id) ? 'on' : st === nx ? 'next' : ''}" title="${st.ch} ${st.t}">${doneStory(st.id) ? '★' : st === nx ? '▶' : '·'}</span>`).join('')}</div>${nx ? `<div class="story-n">다음 이야기 · <b>${nx.ch} ${nx.t}</b><br>📍 ${nx.where}${nx.cond && !nx.cond() ? ' <small>(아직 조건이 안 됐다)</small>' : ''}</div>` : '<div class="story-n">🎉 모든 이야기를 봤다!</div>'}</div>`;
    body.innerHTML = `<div class="grow"><button class="gbtn ${(S.guide || 'auto') === 'auto' ? 'on' : ''}" data-guide="auto">📍 자동 안내</button><button class="gbtn ${S.guide === 'story' ? 'on' : ''}" data-guide="story">📖 스토리 안내</button><button class="gbtn ${S.guide === 'off' ? 'on' : ''}" data-guide="off">안내 끄기</button></div>` + storyBox + `<h4>진행 중 ${active.length}</h4>${active.map(row).join('') || '<p class="muted">아직 없다. 광장의 사람들과 이야기해 보자.</p>'}<h4>완료 ${done.length}</h4>${done.map(row).join('') || '<p class="muted">-</p>'}<h4>아직 모르는 의뢰 ${none.length}</h4><p class="muted">도시 어딘가에 ${none.length}개의 이야기가 더 있다.</p>`;
    body.querySelectorAll('[data-guide]').forEach(b => b.onclick = () => { S.guide = b.dataset.guide; if (typeof GUIDE !== 'undefined') GUIDE.t = 0; save(); closePanel(); toast(S.guide === 'off' ? '길 안내를 껐다' : '📍 노란 발자국을 따라가자'); });
  }
  if (kind === 'bag') {
    title.textContent = '🎒 가방';
    const ids = Object.keys(S.items).filter(k => S.items[k] > 0);
    body.innerHTML = `<div class="gold">🪙 ${S.gold} · 🎯 집중력 ${S.focus}</div>` + (ids.map(id => { const it = ITEMS[id]; return `<div class="item"><span class="ie">${it.e}</span><div><b>${it.n}</b> ×${S.items[id]}<br><small>${it.d}</small></div>${it.use ? `<button data-use="${id}">사용</button>` : ''}</div>`; }).join('') || '<p class="muted">텅 비었다.</p>');
    body.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { useItem(b.dataset.use); openPanel('bag'); });
  }
  if (kind === 'info') {
    title.textContent = '🧭 내 정보';
    const read = Object.keys(S.read);
    body.innerHTML = `<div class="me"><div class="me-p">${portraitHTML('player', Object.assign(playerLook(), { bg: '#ffe9a8' }), 'smile')}</div><div><b class="big">${esc(S.name)}</b><br><small>${esc(S.originText || '')}</small><br>HP ${S.hp}/${S.maxHp}<div class="stats">${STATS.map(s => { const v = statVal(s); return `<span>${s} <b>${S.stats[s]}</b>${v !== S.stats[s] ? `<em>→${v}</em>` : ''}</span>`; }).join('')}</div></div></div>
      <h4>상태이상</h4>${Object.keys(S.status).map(k => `<div class="muted">${k}(${S.status[k]}) — ${STATUS_DESC[k]}</div>`).join('') || '<p class="muted">없음</p>'}
      <h4>판정 규칙</h4><p class="muted">d20 + (능력치 − 5) ≥ 난이도면 성공. 20은 무조건 성공, 1은 무조건 실패. 「집중 사용」을 켜면 다음 판정 +3 (집중력 1 소모).</p>
      <h4>📖 도감 · 표지판 ${read.length}/${Object.keys(LESSONS).length}</h4><div class="dex">${Object.keys(LESSONS).map(id => `<div class="${S.read[id] ? 'on' : ''}" ${S.read[id] ? `data-l="${id}"` : ''}>${S.read[id] ? LESSONS[id].t : '???'}</div>`).join('')}</div>
      <h4>🏆 업적 ${Object.keys(ACHS).filter(k => S.ach && S.ach[k]).length}/${Object.keys(ACHS).length}</h4><div class="achs">${Object.keys(ACHS).map(k => `<div class="${S.ach && S.ach[k] ? 'on' : ''}">${S.ach && S.ach[k] ? '🏆 ' + ACHS[k][0] + '<br><small>' + ACHS[k][1] + '</small>' : '???'}</div>`).join('')}</div>
      <h4>세계관</h4>${LORE.map(l => `<p><b>${l[0]}</b> — ${l[1]}</p>`).join('')}
      <h4>기록</h4><p class="muted">플레이 ${Math.floor(S.playMs / 60000)}분 · 걸음 ${S.steps} · 쓰러짐 ${S.deaths} · 낚시 ${S.fishCaught} · 푼 문제 ${Object.keys(S.solvedQ).length}/${QUIZ.length}</p>`;
    body.querySelectorAll('[data-l]').forEach(d => d.onclick = () => { closePanel(); openTurn(lessonTurn(d.dataset.l)); });
  }
  if (kind === 'map') {
    title.textContent = '🗺 지도 · ' + MAP.name;
    body.innerHTML = '<canvas id="minimap"></canvas><p class="muted" id="map-legend"></p>';
    const mm = $('#minimap'), m = MAP, sc = Math.max(2, Math.min(8, Math.floor(Math.min(520, window.innerWidth - 60) / m.w)));
    mm.width = m.w * sc; mm.height = m.h * sc; const c = mm.getContext('2d'); c.imageSmoothingEnabled = true;
    c.drawImage(LAYER, 0, 0, m.w * sc, m.h * sc);
    c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(0, 0, mm.width, mm.height);
    ACTORS.forEach(a => { c.fillStyle = '#fff'; c.fillRect(a.x * sc, a.y * sc, sc, sc); });
    c.fillStyle = '#ffd84d'; c.beginPath(); c.arc(PLAYER.x * sc + sc / 2, PLAYER.y * sc + sc / 2, sc * 1.3, 0, 7); c.fill(); c.strokeStyle = '#2a1d2b'; c.lineWidth = 2; c.stroke();
    if (m.id === 'town') { c.font = `800 ${Math.max(9, sc * 2.4)}px sans-serif`; c.textAlign = 'center'; BUILDINGS.forEach(b => { if (b.id === 'house') return; c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.8)'; c.strokeText(b.name, b.door[0] * sc, b.door[1] * sc - sc); c.fillStyle = '#fff'; c.fillText(b.name, b.door[0] * sc, b.door[1] * sc - sc); }); }
    $('#map-legend').textContent = '● 노란 점: 나 · 흰 점: 사람들 · 북쪽 문 → 왕성 · 서쪽 문 → 추정의 지하수로 · 남쪽 문 → 검정의 폐성채 · 동쪽 문 → 숲 (그 끝에 범주의 화염 미궁)';
  }
  if (kind === 'settings') {
    title.textContent = '⚙ 설정';
    body.innerHTML = `<label class="row"><span>소리</span><input type="checkbox" id="set-on" ${AudioSys.vol.on ? 'checked' : ''}></label>
      <label class="row"><span>배경음악</span><input type="range" id="set-mu" min="0" max="1" step="0.05" value="${AudioSys.vol.music}"></label>
      <label class="row"><span>효과음</span><input type="range" id="set-sf" min="0" max="1" step="0.05" value="${AudioSys.vol.sfx}"></label>
      <label class="row"><span>돌발 퀴즈 빈도</span><select id="set-qf"><option value="often">자주</option><option value="normal">보통</option><option value="off">끔</option></select></label>
      <label class="row"><span>돌발 이벤트 (투다다닷!)</span><input type="checkbox" id="set-ev" ${S.evOn === false ? '' : 'checked'}></label>
      <label class="row"><span>📍 길 안내 표시</span><input type="checkbox" id="set-gd" ${S.guide === 'off' ? '' : 'checked'}></label>
      <label class="row"><span>화면 확대</span><input type="range" id="set-zm" min="0.55" max="2.4" step="0.05" value="${S.zoomMul}"></label>
      <div class="row btns"><button id="set-tut">📘 튜토리얼</button><button id="set-save">저장</button><button id="set-hub">확통허브로</button><button id="set-reset" class="danger">처음부터</button></div>
      <p class="muted">자동 저장됨 (이 브라우저). 키보드: 방향키·WASD 이동, Shift 달리기, E·Space 상호작용, Q 퀘스트, I 내 정보, B 가방, M 지도, +/− 확대, Esc 닫기. 직접 입력은 키워드로 해석된다.</p>`;
    $('#set-on').onchange = e => AudioSys.setOn(e.target.checked);
    $('#set-mu').oninput = e => AudioSys.setMusic(+e.target.value);
    $('#set-sf').oninput = e => AudioSys.setSfx(+e.target.value);
    $('#set-zm').oninput = e => setZoomMul(+e.target.value);
    $('#set-qf').value = S.quizFreq || 'often'; $('#set-qf').onchange = e => { S.quizFreq = e.target.value; S.qzNext = undefined; save(); };
    $('#set-ev').onchange = e => { S.evOn = e.target.checked; save(); };
    $('#set-gd').onchange = e => { S.guide = e.target.checked ? 'auto' : 'off'; save(); };
    $('#set-tut').onclick = () => { closePanel(); showTutorial(0); };
    $('#set-save').onclick = () => { save(); toast('저장했다'); };
    $('#set-hub').onclick = () => { save(); location.href = '../index.html'; };
    $('#set-reset').onclick = () => { if (confirm('정말 처음부터 시작할까요? 저장이 지워집니다.')) { localStorage.removeItem(SAVE_KEY); location.reload(); } };
  }
}
function closePanel() { $('#panel').classList.remove('open'); panelOpen = false; AudioSys.sfx('close'); }
function useItem(id) {
  const it = ITEMS[id]; if (!it || !it.use || !has(id)) return;
  take(id);
  if (it.use === 'heal') applyFx({ heal: 12 });
  if (it.use === 'heal4') applyFx({ heal: 4 });
  if (it.use === 'cure') applyFx({ cure: ['출혈', '혼란', '피로'] });
  if (it.use === 'cookie') { S.hp = S.maxHp; applyFx({ status: { 고양: 5 } }); AudioSys.sfx('secret'); }
  if (it.use === 'apple') applyFx({ heal: 3 });
  if (it.use === 'mush') { const r = Math.random(); if (r < .4) { applyFx({ heal: 8 }); toast('🍄 맛있다! 기운이 난다'); } else if (r < .75) { applyFx({ status: { 혼란: 3 } }); toast('🍄 세상이 빙글빙글…'); } else { applyFx({ status: { 고양: 4 } }); toast('🍄 갑자기 수학이 이해된다!'); } }
  if (it.use === 'plant') { const [fx, fy] = frontTile(); if (MAP.g[fy] && MAP.g[fy][fx] === '.') { setTile(fx, fy, ','); toast('🌼 꽃을 심었다. 내일도 있을 것이다.'); } else { give('flower'); toast('여기엔 못 심는다. 풀밭을 바라봐야 한다.'); } syncHUD(); return; }
  toast(`${it.e} ${it.n} 사용`); AudioSys.sfx('ok'); syncHUD();
}
function showCredits() {
  const c = $('#credits'); c.classList.add('open');
  c.onclick = () => { c.classList.remove('open'); AudioSys.play(MAP.music === 'boss' ? 'dungeon' : MAP.music); };
}

// =========================================================================
// 입력
// =========================================================================
const KEYDIR = { ArrowDown: 0, s: 0, S: 0, ArrowLeft: 1, a: 1, A: 1, ArrowRight: 2, d: 2, D: 2, ArrowUp: 3, w: 3, W: 3 };
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiI = 0;
function onKey(e) {
  if (!started) return;
  const inInput = document.activeElement && document.activeElement.tagName === 'INPUT';
  // 코나미 커맨드
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === KONAMI[konamiI]) { konamiI++; if (konamiI === KONAMI.length) { konamiI = 0; if (!flag('konami')) { setFlag('konami'); ach('konami'); AudioSys.sfx('secret'); toast('🌈 정규분포의 축복! 운 +1 · 어둠이 옅어진다'); save(); } else toast('🌈 이미 축복받았다'); } } else konamiI = k === KONAMI[0] ? 1 : 0;
  if (cutOpen) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'e' || e.key === 'E') { cutNext(); e.preventDefault(); } if (e.key === 'Escape') cutEnd(); return; }
  if (dlgOpen) {
    if (inInput) { if (e.key === 'Enter') submitFree(); if (e.key === 'Escape') document.activeElement.blur(); return; }
    if (['1', '2', '3'].includes(e.key)) pick(+e.key - 1);
    if (e.key === 'Escape') closeDlg();
    if (e.key === 'Enter' || e.key === ' ') { const t = $('#dlg-desc .txt'); if (t && t.classList.contains('typing')) { t._finish(); e.preventDefault(); } }
    return;
  }
  if (panelOpen) { if (e.key === 'Escape' || ['q', 'Q', 'i', 'I', 'b', 'B', 'm', 'M'].includes(e.key)) closePanel(); return; }
  if (inInput) return;
  if (KEYDIR[e.key] !== undefined) { const kd = KEYDIR[e.key]; held.keys = held.keys.filter(k => k !== kd); held.keys.push(kd); held.run = e.shiftKey; e.preventDefault(); }
  if (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') { interact(); e.preventDefault(); }
  if (e.key === 'q' || e.key === 'Q') openPanel('quest');
  if (e.key === 'i' || e.key === 'I') openPanel('info');
  if (e.key === 'b' || e.key === 'B') openPanel('bag');
  if (e.key === 'm' || e.key === 'M') openPanel('map');
  if (e.key === '+' || e.key === '=') setZoomMul(S.zoomMul * 1.12);
  if (e.key === '-' || e.key === '_') setZoomMul(S.zoomMul / 1.12);
}
function onKeyUp(e) { if (KEYDIR[e.key] !== undefined) { const kd = KEYDIR[e.key]; held.keys = held.keys.filter(k => k !== kd); } if (e.key === 'Shift') held.run = false; }
function bindPad() {
  bindJoystick();
  $('#btn-a').onclick = () => interact();
  $('#btn-q').onclick = () => openPanel('quest');
  document.querySelectorAll('[data-panel]').forEach(b => b.onclick = () => openPanel(b.dataset.panel));
  $('#panel-close').onclick = closePanel;
  $('#dlg-close').onclick = closeDlg;
  $('#dlg-send').onclick = submitFree;
  $('#focus-btn').onclick = () => { if (S.focus <= 0) return; focusArmed = !focusArmed; syncFocusBtn(); AudioSys.sfx('select'); };
  $('#cut-skip').onclick = e => { e.stopPropagation(); cutEnd(); };
  $('#cut').onclick = () => cutNext();
  $('#zoom-in').onclick = () => setZoomMul(S.zoomMul * 1.15);
  $('#zoom-out').onclick = () => setZoomMul(S.zoomMul / 1.15);
  canvas.addEventListener('wheel', e => { e.preventDefault(); setZoomMul(S.zoomMul * (e.deltaY < 0 ? 1.08 : 1 / 1.08)); }, { passive: false });
  // 핀치 줌
  const pts = new Map(); let pinch0 = 0, zoom0 = 1;
  canvas.addEventListener('pointerdown', e => { pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = S.zoomMul; } });
  canvas.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2 && pinch0) { const [a, b] = [...pts.values()]; setZoomMul(zoom0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch0); } });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  // 탭한 방향으로 한 칸 (터치 보조): 캔버스 탭 → 플레이어 기준 방향으로 이동 시작
  canvas.addEventListener('click', e => {
    if (dlgOpen || panelOpen) return;
    const r = canvas.getBoundingClientRect(), wx = (e.clientX - r.left) / cam.zoom + cam.x, wy = (e.clientY - r.top) / cam.zoom + cam.y;
    const tx = Math.floor(wx / TS), ty = Math.floor(wy / TS);
    if (Math.abs(tx - PLAYER.x) + Math.abs(ty - PLAYER.y) === 1) { PLAYER.dir = tx < PLAYER.x ? 1 : tx > PLAYER.x ? 2 : ty < PLAYER.y ? 3 : 0; if (!walkable(tx, ty)) interact(); }
  });
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', clearHeld);
  window.addEventListener('resize', resize);
}

// =========================================================================
// 사용자 그림으로 교체 (assets/portraits/아이디.png, assets/sprites/아이디.png)
// =========================================================================
const PORT_OVR = {};
function probeImg(urls) {
  return new Promise(res => { let i = 0; const next = () => { if (i >= urls.length) return res(null); const u = urls[i++], im = new Image(); im.onload = () => res({ url: u, img: im }); im.onerror = next; im.src = u; }; next(); });
}
async function loadOverrides(ids, onProgress) {
  let done = 0;
  await Promise.all(ids.map(async id => {
    const pr = await probeImg(['webp', 'png', 'jpg'].map(e => `assets/portraits/${id}.${e}`));
    if (pr) PORT_OVR[id] = pr.url;
    const sp = await probeImg([`assets/sprites/${id}.png`]);
    if (sp && id === 'player') { const im = sp.img, cw = im.width / 3, chh = im.height / 4, k = cw / 16; PLAYER_OVR = [0, 1, 2, 3].map(d => [0, 1, 2].map(f => { const c = mkCanvas(Math.round(cw / k), Math.round(chh / k)); const x = c.getContext('2d'); x.imageSmoothingEnabled = k < 1; x.drawImage(im, f * cw, d * chh, cw, chh, 0, 0, c.width, c.height); return c; })); }
    if (sp && SPR[id]) {
      const im = sp.img, cw = im.width / 3, chh = im.height / 4, baseW = SPR[id][0][0].width, k = cw / baseW;
      SPR[id] = [0, 1, 2, 3].map(d => [0, 1, 2].map(f => { const c = mkCanvas(Math.round(cw / k), Math.round(chh / k)); const x = c.getContext('2d'); x.imageSmoothingEnabled = k < 1; x.drawImage(im, f * cw, d * chh, cw, chh, 0, 0, c.width, c.height); return c; }));
    }
    done++; if (onProgress) onProgress(done / ids.length);
  }));
}
function portraitHTML(id, look, mood) {
  // 인물 그림은 언제나 assets/portraits 의 일러스트를 쓴다 (새 인물은 pic으로 기존 일러스트를 빌림)
  const pid = PORT_OVR[id] ? id : (NPCS[id] && NPCS[id].pic) ? NPCS[id].pic : (typeof CUT_CAST !== 'undefined' && CUT_CAST[id] && CUT_CAST[id].pic) ? CUT_CAST[id].pic : id;
  if (PORT_OVR[pid]) return `<img class="ovr" alt="" src="${PORT_OVR[pid]}">`;
  if (typeof PORTRAIT_IDS !== 'undefined' && PORTRAIT_IDS.includes(pid)) return `<img class="ovr" alt="" src="assets/portraits/${pid}.webp">`;
  return portraitSVG(look, mood);
}

// =========================================================================
// 부팅 (로딩 화면 → 타이틀 → 게임)
// =========================================================================
const TIPS = ['95% 신뢰구간에서 움직이는 건 μ가 아니라 구간이다.', '자유도 n−1: 평균을 정하는 순간 값 하나가 자유를 잃는다.', '「채택」은 H₀가 옳다는 증명이 아니다. 뒤집을 증거가 부족할 뿐.', '카이제곱 검정의 기각역은 언제나 오른쪽 꼬리.', '분할표 기대도수 = 행 합 × 열 합 ÷ 전체.', '폭을 절반으로 줄이려면 표본은 4배.', '짝지은 자료는 차이 d 하나의 표본으로 본다.', '모비율 검정의 표준오차엔 p̂ 말고 p₀.', '이 게임의 직접 입력은 키워드로 해석된다. 「p < 0.05」라고 쳐 보면…?', '누룽지는 열 번 쓰다듬어야 마음을 연다.'];
async function boot() {
  canvas = $('#game'); ctx = canvas.getContext('2d'); lightCv = document.createElement('canvas'); lightCtx = lightCv.getContext('2d');
  const bar = $('#load-bar'), msg = $('#load-msg'), tip = $('#load-tip');
  let ti = Math.floor(Math.random() * TIPS.length); tip.textContent = '💡 ' + TIPS[ti];
  const tipTimer = setInterval(() => { ti = (ti + 1) % TIPS.length; tip.textContent = '💡 ' + TIPS[ti]; }, 2600);
  const step = (p, m) => new Promise(r => { bar.style.width = p + '%'; msg.textContent = m; setTimeout(r, 140 + Math.random() * 160); });
  await step(8, '주사위를 굴리는 중…');
  buildAllMaps(); placeExtraSigns();
  await step(28, '성벽을 쌓는 중… (둥글게)');
  await step(42, '붉은 지붕 올리는 중… ' + MAPS.town.houses + '채');
  const ids = Object.keys(NPCS);
  for (let i = 0; i < ids.length; i++) { SPR[ids[i]] = buildSprite(NPCS[ids[i]].look); if (i % 9 === 0) await step(42 + Math.round(i / ids.length * 38), `주민 ${ids.length}명 깨우는 중… (${NPCS[ids[i]].n})`); }
  SPR.__player = null;
  await step(82, '그림 바꿔 끼운 게 있나 확인 중…');
  await loadOverrides(ids.concat(['player']));
  await step(86, '분수에 물 채우는 중…');
  await step(96, '대분산을 적당히 퍼뜨리는 중…');
  await step(100, '준비 완료');
  clearInterval(tipTimer);
  // 타이틀 배경: 마을을 천천히 훑는다
  S = newState(); PLAYER = { x: -5, y: -5, px: -80, py: -80, dir: 0, moving: 0, fr: 0, spr: null };
  resize(); loadMap('town'); titleMode = true; cam.zoom = cam.target = Math.max(1.6, Math.min(3, canvas.clientWidth / 360)); cam.x = 0; cam.y = MAPS.town.cy * TS - canvas.clientHeight / cam.zoom / 2;
  $('#loading').classList.add('done');
  const saved = load();
  $('#btn-continue').style.display = saved ? '' : 'none';
  if (saved) $('#title-name').value = saved.name;
  $('#title').classList.add('open');
  bindPad();
  resize();
  $('#btn-new').onclick = () => { AudioSys.resume(); if (saved && !confirm('저장된 모험이 있습니다. 새로 시작할까요?')) return; startGame(newState($('#title-name').value), true); };
  $('#btn-continue').onclick = () => { AudioSys.resume(); startGame(saved, false); };
  $('#title').addEventListener('pointerdown', () => { AudioSys.resume(); AudioSys.play('title'); }, { once: true });
  requestAnimationFrame(loop);
}
function playerLook() { const base = Object.assign({ skin: SKIN[0] }, S.look || ORIGINS.free.look); if (!base.beast) Object.assign(base, { beast: 'fox', fur: base.hair || '#c8642a', tailTip: '#fff4e6' }); return base; }
function playerSprite() { return PLAYER_OVR || buildSprite(playerLook()); }
let PLAYER_OVR = null;
function startGame(state, fresh) {
  S = state; titleMode = false;
  $('#title').classList.remove('open');
  PLAYER = { x: 0, y: 0, px: 0, py: 0, dir: 3, moving: 0, fr: 0, spr: null };
  PLAYER.spr = playerSprite();
  loadMap(fresh ? 'inn2' : (MAPS[S.map] ? S.map : 'town'));
  if (fresh) { S.x = 7; S.y = 3; S.dir = 0; } // 여관 「신뢰구간 95%」 2층 객실, 침대 옆에서 눈을 뜬다
  PLAYER.x = S.x; PLAYER.y = S.y; PLAYER.dir = S.dir;
  if (!walkable(PLAYER.x, PLAYER.y, true)) { const p = nearestFree(PLAYER.x, PLAYER.y); PLAYER.x = p[0]; PLAYER.y = p[1]; }
  PLAYER.px = PLAYER.x * TS; PLAYER.py = PLAYER.y * TS;
  cam.target = targetZoom(); cam.zoom = cam.target * (fresh ? 1.6 : 1); snapCam();
  started = true; syncHUD();
  $('#hud').classList.add('on');
  banner(MAP.name);
  // 위치/방향 저장용 동기화
  setInterval(() => { if (S && PLAYER) { S.x = PLAYER.x; S.y = PLAYER.y; S.dir = PLAYER.dir; syncHUD(); } }, 1000);
  if (fresh) setTimeout(() => openTurn(openingTurn()), 900);
}
window.addEventListener('DOMContentLoaded', boot);

// =========================================================================
// 확장: 업적 · 퀴즈 도움 · 공식 표지판 배치 · 물건 상호작용 · 컷씬
// =========================================================================
let HALF_REWARD = false;
function ach(id) {
  if (!S || !ACHS[id]) return;
  S.ach = S.ach || {};
  if (S.ach[id]) return;
  S.ach[id] = true; AudioSys.sfx('level');
  setTimeout(() => toast(`🏆 업적 달성 · ${ACHS[id][0]}`), 400);
}
function formulaHTML(q) { const h = QUIZ_HELP[q.id]; return h ? `<div class="fhint">📐 공식: ${esc(h.f)}</div>` : ''; }
function solutionHTML(q, auto, picked) {
  const h = QUIZ_HELP[q.id];
  // 틀렸을 때는 원래 문제와 내가 고른 답도 같이 보여 준다
  const recap = auto ? `<div class="qrecap"><span class="qch">${q.ch}장 · 원래 문제</span> ${esc(q.q).replace(/\n/g, '<br>')}${picked ? `<div class="qpick">❌ 내 답: ${esc(picked)} → ⭕ 정답: <b>${esc(q.a)}</b></div>` : ''}</div>` : '';
  const cb = typeof conceptBoxHTML === 'function' ? conceptBoxHTML(q) : '';
  if (!h) return `<div class="sol">${recap}<b>📖 풀이</b><br>${esc(q.ex)}${auto ? `<br>정답: <b>${esc(q.a)}</b>` : ''}</div>${cb}`;
  return `<div class="sol">${recap}<b>📖 ${auto ? '틀렸으니 자세한 풀이' : '자세한 풀이'}</b><br>공식: ${esc(h.f)}<ol>${h.s.map(x => `<li>${esc(x)}</li>`).join('')}</ol>정답: <b>${esc(q.a)}</b></div>${cb}`;
}
function renderHelp(turn) {
  const box = $('#dlg-help'); box.innerHTML = '';
  const h = turn.help; if (!h || !h.q) return;
  const mk = (txt, cls, fn) => { const b = document.createElement('button'); b.textContent = txt; if (cls) b.className = cls; b.onclick = fn; box.appendChild(b); };
  if (h.after) { mk('📖 자세한 풀이 다시 보기', 'sol', () => { const d = $('#dlg-desc'); if (!d.querySelector('.sol')) d.insertAdjacentHTML('beforeend', solutionHTML(h.q, false)); d.scrollTop = d.scrollHeight; }); return; }
  if (!h.o) return;
  mk('📐 공식 힌트 (무료)', '', () => openTurn(quizTurn(Object.assign({}, h.o, { q: h.q, showF: true, peeked: h.o.peeked }))));
  mk('📖 자세한 풀이 보기 (보상 절반)', 'sol', () => openTurn(quizTurn(Object.assign({}, h.o, { q: h.q, showF: true, peeked: true }))));
}

// 공식 표지판 자동 배치 (근처 빈 땅을 찾아서)
function placeExtraSigns() {
  EXTRA_SIGNS.map(a => a.concat('S')).concat(EXTRA_CHESTS.map(a => a.concat('C'))).forEach(([mid, mode, x, y, id, kind]) => {
    const m = MAPS[mid]; if (!m) return;
    let tx = mode === 'rel' ? m.cx + x : x, ty = mode === 'rel' ? m.cy + y : y;
    const okTile = (a, b) => { if (!m.g[b] || m.g[b][a] === undefined) return false; const c = m.g[b][a]; if (!(m.theme === 'town' || m.theme === 'forest' ? '.,' : '_').includes(c)) return false; let open = 0; for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const n = m.g[b + dy] && m.g[b + dy][a + dx]; if (n && !SOLID.has(n)) open++; } return open >= 3 && !(m.g[b + 1] && 'DE'.includes(m.g[b + 1][a])) && !(m.g[b - 1] && 'D'.includes(m.g[b - 1][a])); };
    for (let r = 0; r < 8; r++) { let done = false; for (let dy = -r; dy <= r && !done; dy++) for (let dx = -r; dx <= r && !done; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; if (okTile(tx + dx, ty + dy)) { const k = (tx + dx) + ',' + (ty + dy); m.g[ty + dy][tx + dx] = kind; if (kind === 'S') { m.signs = m.signs || {}; m.signs[k] = id; } else { m.chests = m.chests || {}; m.chests[k] = id; } done = true; } } if (done) break; }
  });
}

// 작은 물건들 (말풍선 표시 안 함)
const MINOR = new Set(',mobHXTxnLwfh'.split(''));
Object.assign(ITEMS, {
  flower: { n: '꽃', e: '🌼', d: '[사용] 앞의 풀밭에 심는다. 누군가에게 주면 좋아할지도.', use: 'plant' },
  mush: { n: '수상한 버섯', e: '🍄', d: '[사용] 먹는다. 결과는 운에 맡긴다.', use: 'mush' },
  bone: { n: '뼈다귀', e: '🦴', d: '누구 뼈일까. 해골 스켈리가 찾고 있을지도.' },
  apple: { n: '사과', e: '🍎', d: '[사용] HP +3. 나무에서 떨어졌다. 뉴턴은 없다.', use: 'apple' },
  pebble: { n: 'π 조약돌', e: '🪨', d: '「3.14」라고 새겨진 조약돌. 파이엘이 보면 기절할 것.' }
});
function setTile(x, y, ch) {
  MAP.g[y][x] = ch;
  S.mods = S.mods || {}; S.mods[MAP.id] = S.mods[MAP.id] || {}; S.mods[MAP.id][x + ',' + y] = ch;
  renderMapDirty = true;
  if (MAP.anim) { MAP.anim = MAP.anim.filter(a => !(a[0] === x && a[1] === y)); MAP.lights = MAP.lights.filter(a => !(a[0] === x && a[1] === y)); }
}
function baseFloor() { return MAP.theme === 'town' || MAP.theme === 'forest' ? '.' : '_'; }
// 상자·통 밀기
function tryPush(nx, ny, d) {
  const c = MAP.g[ny] && MAP.g[ny][nx];
  if (c !== 'X' && c !== 'H') return false;
  const bx = nx + d[0], by = ny + d[1], b = MAP.g[by] && MAP.g[by][bx];
  if (!b || SOLID.has(b) || 'DE^v~l'.includes(b) || ACTORS.some(a => a.x === bx && a.y === by)) { if (!PLAYER._bump || performance.now() - PLAYER._bump > 600) { PLAYER._bump = performance.now(); AudioSys.sfx('hit'); floatText(c === 'X' ? '꿈쩍' : '덜컹', '#fff'); } return true; }
  S.under = S.under || {}; const key = MAP.id + ':';
  const restore = S.under[key + nx + ',' + ny] || baseFloor();
  S.under[key + bx + ',' + by] = b;
  delete S.under[key + nx + ',' + ny];
  setTile(nx, ny, restore); setTile(bx, by, c);
  AudioSys.sfx('door'); S.flags.pushes = (S.flags.pushes || 0) + 1;
  if (S.flags.pushes === 30) toast('📦 상자를 30번 밀었다. 소코반 장인.');
  return true;
}
function minorTurn(ch, x, y) {
  const key = MAP.id + ':' + x + ',' + y, day = Math.floor(S.time / DAY);
  const T = (title, obj, desc, choices) => ({ title, obj, desc, choices: choices || [] });
  const R = (t, roll, fx) => Object.assign(T(t.title, t.obj, t.desc, t.choices), { roll, fx });
  switch (ch) {
    case ',': return T('꽃', 'altar', '들꽃이 피어 있다. 벌 한 마리가 표본 조사 중이다.', [
      { t: '한 송이 꺾는다', run: () => { setTile(x, y, baseFloor()); return Object.assign(T('꽃', 'altar', '꽃을 꺾었다. 벌이 째려본다.'), { fx: applyFx({ item: 'flower' }) }); } },
      { t: '꽃잎 수를 센다', run: () => { const k = [5, 5, 5, 6, 5, 4, 5][(x + y) % 7]; return T('꽃', 'altar', `꽃잎 ${k}장. ${k === 5 ? '평균이다.' : '이상치다! 데이지가 비싸게 사 줄 것 같다.'}`); } },
      { t: '냄새를 맡는다', run: () => Object.assign(T('꽃', 'altar', '좋은 냄새. 콧구멍에 벌이 들어갈 뻔했다.'), { fx: applyFx({ status: { 고양: 1 } }) }) }]);
    case 'm': return T('버섯', 'cauldron', '알록달록한 버섯. 「먹으면 안 될 것 같은」 색이다.', [
      { t: '캔다', run: () => { setTile(x, y, baseFloor()); return Object.assign(T('버섯', 'cauldron', '버섯을 캤다. 손이 살짝 보랏빛이 됐다.'), { fx: applyFx({ item: 'mush' }) }); } },
      { t: '그 자리에서 먹는다', tag: '운 13', run: () => { const r = check('운', 13); setTile(x, y, baseFloor()); return R(T('버섯', 'cauldron', r.ok ? '맛있다. 의외로. 몸이 가벼워진다.' : '세상이 포아송 분포로 깜빡인다.'), r.line, applyFx(r.ok ? { heal: 6 } : { status: { 혼란: 3 }, hp: -2 })); } },
      { t: '버섯에게 말을 건다', run: () => T('버섯', 'cauldron', '버섯은 대답하지 않는다. 당연하다. …아마도.') }]);
    case 'o': return T('뼈', 'statue', '누군가의 뼈. 오래돼서 무섭지는 않다. 아니 좀 무섭다.', [
      { t: '줍는다', run: () => { setTile(x, y, baseFloor()); return Object.assign(T('뼈', 'statue', '뼈다귀를 주웠다. 어디선가 「그거 내 거야!」 하는 소리가 들린 것 같다.'), { fx: applyFx({ item: 'bone' }) }); } },
      { t: '묵념한다', run: () => Object.assign(T('뼈', 'statue', '잠시 고개를 숙였다. 바람이 지나간다.'), { fx: applyFx({ status: { 축복: 2 } }) }) }]);
    case 'b': return T('덤불', 'altar', '빽빽한 덤불. 안에서 뭔가 부스럭거린다.', [
      { t: '덤불을 뒤진다', tag: '운 11', run: () => { if (S.opened[key + '@' + day]) return T('덤불', 'altar', '오늘은 이미 다 뒤졌다. 덤불이 지쳐 보인다.'); S.opened[key + '@' + day] = 1; const r = check('운', 11); return R(T('덤불', 'altar', r.ok ? ['산딸기를 찾았다. 새콤하다.', '누가 숨겨 둔 동전 주머니!', '고양이가 튀어나와 당신을 보고 다시 들어갔다. 대신 동전 하나가 떨어졌다.'][(x + y) % 3] : '벌집이었다.'), r.line, applyFx(r.ok ? ((x + y) % 3 === 0 ? { heal: 3 } : { gold: 3 + (x % 4) }) : { hp: -2, status: { 출혈: 1 } })); } },
      { t: '덤불 속에 숨는다', run: () => T('덤불', 'altar', '덤불 속에 숨었다. 아무도 당신을 찾지 않는다. 원래 아무도 안 찾고 있었다.') }]);
    case 'H': case 'X': { const nm = ch === 'H' ? '나무통' : '나무 상자'; return T(nm, 'chest', `${nm}. 밀면 움직일 것 같다. (그 방향으로 걸어가면 민다)`, [
      { t: '안을 뒤진다', run: () => { if (S.opened[key]) return T(nm, 'chest', '이미 뒤졌다. 거미 한 마리가 「또?」 하는 표정이다.'); S.opened[key] = 1; const loot = [[{ gold: 4 }, '동전 몇 개.'], [{ item: 'apple' }, '사과! 상태 좋다.'], [{}, '텅 비었다. 바닥에 「꽝」이라고 쓰여 있다.'], [{ item: 'bread' }, '탄 빵. 대분산의 흔적.'], [{}, '안에 고양이가 있다. 고양이가 뚜껑을 다시 닫는다.'], [{ gold: 9 }, '누군가의 비상금. 미안.'], [{ item: 'pebble' }, '「3.14」라고 새겨진 조약돌.'], [{}, '쪽지: 「이 통을 연 당신은 표본 n=1입니다.」']][(x * 3 + y * 7) % 8]; return Object.assign(T(nm, 'chest', loot[1]), { fx: applyFx(loot[0]) }); } },
      { t: '두드려 본다', run: () => T(nm, 'chest', ch === 'H' ? '통통. 반쯤 비었다. 기대값은 반 통.' : '퉁퉁. 안에서 누가 「누구세요」 했다. 아니겠지.') },
      { t: '위에 올라가 본다', tag: '민첩 10', run: () => { const r = check('민첩', 10); return R(T(nm, 'chest', r.ok ? '올라섰다. 세상이 한 칸 높아 보인다. 별 차이 없다.' : '미끄러졌다. 엉덩이가 정규분포 모양으로 아프다.'), r.line, applyFx(r.ok ? { status: { 고양: 1 } } : { hp: -1 })); } }]); }
    case 'T': return T('나무', 'altar', '튼튼한 나무. 위에서 뭔가 열려 있다.', [
      { t: '나무를 흔든다', tag: '힘 10', run: () => { if (S.opened[key + '@' + day]) return T('나무', 'altar', '오늘은 더 떨어질 게 없다. 나무가 어지러워 보인다.'); S.opened[key + '@' + day] = 1; const r = check('힘', 10); const v = (x * 5 + y * 3 + day) % 4; return R(T('나무', 'altar', !r.ok ? '나무가 꿈쩍도 안 한다. 다람쥐가 비웃는다.' : ['사과가 떨어졌다. 머리 위로. 중력은 정규분포를 따르지 않는다.', '다람쥐가 떨어져서 당신 동전을 들고 달아났다.', '아무것도 안 떨어졌다. 나뭇잎 하나만.', '새 둥지에서 반짝이는 동전이 떨어졌다.'][v]), r.line, applyFx(!r.ok ? {} : [{ item: 'apple', hp: -1 }, { gold: -1 }, {}, { gold: 5 }][v])); } },
      { t: '나무에 기대어 쉰다', run: () => Object.assign(T('나무', 'altar', '그늘이 시원하다. 잠깐 졸았다.'), { fx: applyFx({ heal: 2, cure: ['피로'] }) }) },
      { t: '나무에 이름을 새긴다', run: () => T('나무', 'altar', `「${S.name} 왔다 감」. 옆에 이미 「무한대 씨 왔다 감 (무한히)」이 새겨져 있다.`) }]);
    case 'x': return T('바위', 'ore', '평범한 바위. 아마도.', [
      { t: '들어 올린다', tag: '힘 13', run: () => { const r = check('힘', 13); if (r.ok && !S.opened[key]) { S.opened[key] = 1; return R(T('바위', 'ore', '바위 밑에 「3.14」라고 새겨진 조약돌이 있다. 누가 숨겨 놨지?'), r.line, applyFx({ item: 'pebble' })); } return R(T('바위', 'ore', r.ok ? '밑에 공벌레 가족. 조용히 내려놨다.' : '허리가 먼저 비명을 질렀다.'), r.line, applyFx(r.ok ? {} : { hp: -2, status: { 피로: 1 } })); } },
      { t: '말을 걸어 본다', run: () => T('바위', 'ore', '「…」 이 바위는 말을 못 한다. 숲의 바위찬과는 다르다.') }]);
    case 'n': case 'h': return T(ch === 'n' ? '벤치' : '의자', 'sign', '앉을 수 있다.', [
      { t: '앉아서 쉰다', run: () => { S.time += 40; return Object.assign(T('휴식', 'sign', ['앉아서 지나가는 사람 수를 셌다. 1분에 평균 3명. 포아송 분포 같다.', '아무 생각도 안 했다. 좋았다.', '비둘기가 옆에 앉았다. 서로 모른 척했다.', '하늘을 봤다. 구름이 종 모양이다. 요즘 다 그렇다.'][(x + y + Math.floor(S.time)) % 4]), { fx: applyFx({ heal: 3, cure: ['피로'] }) }); } },
      { t: '누워 본다', run: () => T('벤치', 'sign', '벤치가 생각보다 짧다. 다리가 밖으로 나간다. 표본 크기 부족.') }]);
    case 'L': return T('가로등', 'crystal', '쇠기둥 위의 등불. 밤이면 켜진다. 누가 켜는지는 아무도 모른다.', [
      { t: '기둥을 타고 올라간다', tag: '민첩 13', run: () => { const r = check('민첩', 13); return R(T('가로등', 'crystal', r.ok ? '꼭대기에 올라갔다. 도시가 다 보인다. 붉은 지붕이 끝도 없다. 내려오는 게 더 어렵다.' : '반쯤 올라가다 미끄러졌다. 박형사가 쳐다본다.'), r.line, applyFx(r.ok ? { status: { 고양: 3 } } : { hp: -2 })); } },
      { t: '기둥을 발로 찬다', run: () => Object.assign(T('가로등', 'crystal', '땡~ 소리가 난다. 등불이 한 번 깜빡인다. 그게 다다.'), { fx: applyFx({ hp: -1 }) }) }]);
    case 'w': { const scenes = ['창문 너머로 가족이 저녁을 먹고 있다. 아이가 콩을 세고 있다. 평균 12알.', '창문 너머에서 누가 「p값!!! 0.049!!!」 하고 기뻐 날뛴다.', '커튼이 쳐져 있다. 커튼 틈으로 눈 하나가 당신을 본다. 무섭다.', '창문에 당신 얼굴이 비친다. 생각보다 피곤해 보인다.', '방 안에 고양이 다섯 마리가 둘러앉아 회의 중이다. 안건: 「누룽지 문제」.', '할아버지가 흔들의자에서 주사위를 굴린다. 계속 6만 나온다. 대분산이다.'];
      return T('창문', 'sign', scenes[(x * 7 + y * 13) % scenes.length], [{ t: '창문을 두드린다', tag: '운 12', run: () => { const r = check('운', 12); return R(T('창문', 'sign', r.ok ? '창문이 열리고 누가 쿠키 하나를 건넨다. 「…배고파 보여서.」' : '「누구야!」 물 한 바가지가 쏟아졌다.'), r.line, applyFx(r.ok ? { heal: 3 } : { status: { 피로: 1 } })); } }, { t: '모른 척 지나간다', run: () => null }]); }
    case 'f': {
      const [fx, fy] = [x * 2 - PLAYER.x, y * 2 - PLAYER.y];
      return T('울타리', 'sign', '나무 울타리. 넘어갈 수 있을 것 같기도.', [
        { t: '뛰어넘는다', tag: '민첩 12 · 실패 시 HP−2', run: () => { const r = check('민첩', 12); if (r.ok && walkable(fx, fy)) { PLAYER.x = fx; PLAYER.y = fy; PLAYER.px = fx * TS; PLAYER.py = fy * TS; return R(T('울타리', 'sign', '훌쩍! 넘었다. 레온이 보면 박수 쳤을 거다.'), r.line, []); } return R(T('울타리', 'sign', r.ok ? '넘으려 했는데 건너편이 막혀 있다.' : '바지가 걸렸다. 찢어지는 소리.'), r.line, applyFx(r.ok ? {} : { hp: -2 })); } },
        { t: '울타리에 기대어 선다', run: () => T('울타리', 'sign', '목장 주인 같은 기분이다. 목장은 없다.') }]);
    }
    default: return null;
  }
}

// ---------------- 컷씬 ----------------
let cutOpen = false, cutQ = null, cutI = 0, cutTimer = null;
function castOf(who) { if (!who) return null; if (NPCS[who]) return { id: who, n: NPCS[who].n, look: NPCS[who].look }; if (CUT_CAST[who]) return { id: who, n: CUT_CAST[who].n, look: CUT_CAST[who].look }; return null; }
function checkCuts(kind) {
  if (!MAP || cutOpen || dlgOpen || titleMode) return false;
  for (const c of CUTS) {
    if (c.map !== MAP.id || flag('cut_' + c.id)) continue;
    if (c.cond && !c.cond()) continue;
    if (kind === 'enter' && !c.enter) continue;
    if (kind === 'step') {
      if (!c.area) continue;
      const [x0, y0, x1, y1] = c.area, ox = c.rel ? MAP.cx : 0, oy = c.rel ? MAP.cy : 0;
      if (PLAYER.x < x0 + ox || PLAYER.x > x1 + ox || PLAYER.y < y0 + oy || PLAYER.y > y1 + oy) continue;
    }
    playCut(c); return true;
  }
  return false;
}
function playCut(c) {
  setFlag('cut_' + c.id); cutOpen = true; clearHeld(); cutQ = c; cutI = -1;
  $('#cut').classList.add('open'); $('#hud').style.opacity = '.25';
  AudioSys.sfx('secret');
  cutNext();
}
function cutNext() {
  if (!cutQ) return;
  const tEl = $('#cut-text');
  if (tEl.classList.contains('typing')) { tEl._finish && tEl._finish(); return; }
  cutI++;
  if (cutI >= cutQ.lines.length) return cutEnd();
  const [who, text, fx] = cutQ.lines[cutI];
  const cast = castOf(who);
  // 초상화: 왼쪽/오른쪽 번갈아
  const L = $('#cut-left'), Rr = $('#cut-right');
  if (cast) {
    const side = L.dataset.who === cast.id ? L : Rr.dataset.who === cast.id ? Rr : (L.dataset.who ? Rr : L);
    if (side.dataset.who !== cast.id) { side.dataset.who = cast.id; side.innerHTML = cast.look ? portraitHTML(cast.id, cast.look, /!|\?!/.test(text) ? 'surprise' : (NPCS[cast.id] ? NPCS[cast.id].mood : 'sly')) : ''; }
    side.classList.add('on'); side.classList.remove('dim'); (side === L ? Rr : L).classList.add('dim');
  } else { L.classList.add('dim'); Rr.classList.add('dim'); }
  $('#cut-name').textContent = cast ? cast.n : '';
  tEl.innerHTML = text.replace(/\n/g, '<br>');
  if (!/<code>/.test(text)) typewrite(tEl);
  if (fx) cutFx(fx);
  AudioSys.sfx('blip');
}
function cutFx(fx) {
  const cv = $('#game');
  if (fx === 'shake') shake(10);
  if (fx === 'flash') { const f = $('#flash'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 60); AudioSys.sfx('hit'); }
  if (fx === 'zoom') { cam.zoom = cam.target * 1.7; }
  if (fx === 'spin') { cv.classList.remove('spin'); void cv.offsetWidth; cv.classList.add('spin'); setTimeout(() => cv.classList.remove('spin'), 1500); }
  if (fx === 'invert') { cv.classList.add('invert'); setTimeout(() => cv.classList.remove('invert'), 2600); }
  if (fx === 'glitch') { cv.classList.remove('glitch'); void cv.offsetWidth; cv.classList.add('glitch'); setTimeout(() => cv.classList.remove('glitch'), 1600); AudioSys.sfx('dice'); }
}
function cutEnd() {
  const was = cutQ;
  cutOpen = false; cutQ = null;
  if (was && was.story) {
    if (was.after) try { was.after(); } catch (e) {}
    const n = storyCount(), nx = nextStory();
    setTimeout(() => { banner(`📖 메인 스토리 ${n}/${STORY.length}`); toast(nx ? `다음 이야기: ${nx.where}` : '메인 스토리 완료!'); syncHUD(); }, 300);
    $('#cut-left').innerHTML = ''; $('#cut-right').innerHTML = '';
    $('#cut').classList.remove('open'); $('#hud').style.opacity = ''; ['#cut-left', '#cut-right'].forEach(s => { const e = $(s); e.className = 'cut-por'; e.dataset.who = ''; });
    save(); return;
  }
  $('#cut').classList.remove('open'); $('#hud').style.opacity = '';
  ['#cut-left', '#cut-right'].forEach(s => { const e = $(s); e.className = 'cut-por'; e.innerHTML = ''; e.dataset.who = ''; });
  const seen = CUTS.filter(c => flag('cut_' + c.id)).length;
  toast(`🎬 컷씬 감상 ${Math.floor(seen / CUTS.length * 100)}%`);
  if (seen === CUTS.length) ach('cuts');
  save();
}

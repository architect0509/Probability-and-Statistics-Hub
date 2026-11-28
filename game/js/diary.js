/* =========================================================================
 * 벨레스타 연대기 — 📔 모험 일기 (diary.js)
 *  표지판 · 문제 · 카드 · 이지 쌤 · 칙령 · 용어 풀이를 「처음 알게 된 순서」대로
 *  손글씨 일기로 적어 둔다. 일기 줄을 누르면 그때 배운 내용을 다시 펼쳐 본다.
 *  저장 위치: S.diary = { seen: {키: 1}, log: [{ k, kind, at, map, old, snap }] }
 * ========================================================================= */
'use strict';

const DIARY_KIND = {
  L: { e: '📖', n: '개념', c: 'dk-l' },
  Q: { e: '✏️', n: '문제', c: 'dk-q' },
  C: { e: '🃏', n: '카드', c: 'dk-c' },
  E: { e: '💡', n: '이지 쌤', c: 'dk-e' },
  D: { e: '📜', n: '칙령', c: 'dk-d' },
  G: { e: '💬', n: '용어', c: 'dk-g' }
};
let DIARY_VIEW = { tab: 'all', open: null };

// ---------- 한국어 조사 ----------
function josa(word, a, b) {
  const s = String(word).replace(/[\s」』)\]]+$/, ''); const ch = s.charCodeAt(s.length - 1);
  if (ch >= 0xAC00 && ch <= 0xD7A3) return (ch - 0xAC00) % 28 ? a : b;
  if (/[0-9]$/.test(s)) return /[013678]$/.test(s) ? a : b;
  if (/[lmnrLMNR]$/.test(s)) return a;
  return b;
}
const 을를 = w => josa(w, '을', '를'), 이가 = w => josa(w, '이', '가'), 은는 = w => josa(w, '은', '는'), 이라는 = w => josa(w, '이라는', '라는');

function dyHash(s) { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
function dyEnsure() {
  if (!S) return null;
  if (!S.diary) S.diary = { seen: {}, log: [], unread: 0 };
  S.diary.seen = S.diary.seen || {}; S.diary.log = S.diary.log || [];
  return S.diary;
}
function dyAdd(k, kind, snap, old) {
  const D = dyEnsure(); if (!D || D.seen[k]) return false;
  D.seen[k] = 1;
  D.log.push({ k, kind, at: old ? (S.savedAt || Date.now()) : Date.now(), map: MAP ? MAP.name : '', old: !!old, snap: snap || null });
  if (!old) { D.unread = (D.unread || 0) + 1; dySyncBadge(); }
  return true;
}

// ---------- 저장 상태를 훑어 새로 알게 된 것 찾기 ----------
function diaryScan(old) {
  const D = dyEnsure(); if (!D) return;
  Object.keys(S.read || {}).forEach(id => { if (LESSONS[id]) dyAdd('L:' + id, 'L', null, old); });
  if (typeof CARDS !== 'undefined') Object.keys(S.cards || {}).forEach(id => { if (CARDS.find(c => c.id === id)) dyAdd('C:' + id, 'C', null, old); });
  if (typeof EASY !== 'undefined') Object.keys(S.easyDone || {}).forEach(t => { if (EASY.find(e => e.t === t)) dyAdd('E:' + t, 'E', null, old); });
  if (old) Object.keys(S.solvedQ || {}).forEach(id => { const q = QUIZ.find(x => x.id === id); if (q) dyAdd('Q:' + id, 'Q', dyQuizSnap(q), true); });
}
function dyQuizSnap(q) {
  const h = (typeof QUIZ_HELP !== 'undefined' && QUIZ_HELP[q.id]) || null;
  return { q: q.q, a: q.a, ex: q.ex, ch: q.ch, f: h ? h.f : '', s: h ? h.s : [] };
}
function diaryQuiz(q) { if (q && q.id) dyAdd('Q:' + q.id, 'Q', dyQuizSnap(q)); }
let dyGlossT = null;
function diaryGloss(id) {
  clearTimeout(dyGlossT);
  dyGlossT = setTimeout(() => {
    const tip = document.getElementById('gtip'); if (!tip || !tip.classList.contains('on') || !S || !started) return;
    const g = GLOSS_BY[id]; if (!g) return;
    if (dyAdd('G:' + id, 'G', { t: g.t, d: g.d, e: g.e })) save();
  }, 650);
}

// ---------- 문장 만들기 ----------
function dyTopic(e) {
  if (e.kind === 'L') { const L = LESSONS[e.k.slice(2)]; if (!L) return ['?', '']; const p = L.t.split(' · '); return p.length > 1 ? [p.slice(1).join(' · '), p[0]] : [L.t, '']; }
  if (e.kind === 'C') { const c = CARDS.find(x => x.id === e.k.slice(2)); return c ? [c.t, c.e] : ['?', '']; }
  if (e.kind === 'E') return [e.k.slice(2), ''];
  if (e.kind === 'D') return [e.snap ? e.snap.n : '?', ''];
  if (e.kind === 'G') return [e.snap ? e.snap.t.split(' (')[0] : '?', ''];
  if (e.kind === 'Q') { const t = e.snap ? e.snap.q.replace(/\s+/g, ' ') : '?'; return [t.length > 26 ? t.slice(0, 26) + '…' : t, '']; }
  return ['?', ''];
}
const DY_FEEL = {
  L: ['생각보다 어렵지 않잖아?', '시험에 나온다고 적혀 있었다…', '내일 한 번 더 읽어 봐야지.', '머리에 쏙 들어왔다!', '이거 공식 노트에 옮겨 적자.', '처음엔 외계어 같았는데 이제 좀 보인다.'],
  Q: ['맞혔다! 나 좀 천재일지도?', '공식에 숫자만 넣으면 되는 거였어.', '다음엔 힌트 없이 풀어야지.', '손이 기억할 때까지 한 번 더!'],
  C: ['예시가 너무 이상해서 오히려 안 잊힐 듯.', '카드 컬렉션이 늘어난다 히히.', '가방에 잘 넣어 뒀다.'],
  E: ['이지 쌤 설명 들으니까 바로 이해됨 ㅋㅋ', '비유가 좀 더럽지만 기억에 남는다…', '어디서 나타나시는 거지?'],
  D: ['왕실 서기는 매일 새벽에 일어나나 보다.', '주문처럼 외워 두자.'],
  G: ['모르는 말은 바로바로 찾아보기!', '밑줄 친 말 눌러 보길 잘했다.', '이제 이 말 나오면 안 쫄 듯.']
};
function dySentence(e) {
  const [t, x] = dyTopic(e);
  const at = e.map ? e.map : '';
  if (e.kind === 'L') {
    const L = LESSONS[e.k.slice(2)];
    if (!L || !L.ch) return `${x || t}${을를(x || t)} 읽었다. ${at ? `(${at})` : ''}`;
    return `${x ? x + '에서' : at ? at + '에서' : ''} 「${t}」${을를(t)} 알게 되었다.`;
  }
  if (e.kind === 'Q') return `「${t}」 문제를 풀었다! 답은 ${e.snap ? e.snap.a : '?'}.`;
  if (e.kind === 'C') return `${x} 「${t}」 카드를 주웠다.`;
  if (e.kind === 'E') return `이지 쌤이 갑자기 뛰어와서 「${t}」${을를(t)} 쉽게 설명해 줬다.`;
  if (e.kind === 'D') return `광장 벽보에 붙은 칙령 「${t}」${을를(t)} 읽었다.`;
  if (e.kind === 'G') return `「${t}」${이라는(t)} 말이 무슨 뜻인지 알게 되었다.`;
  return t;
}
const DY_WEATHER = ['☀️ 맑음', '⛅ 구름 조금', '☁️ 흐림', '🌧️ 비', '🌬️ 바람', '🌙 별 많음', '❄️ 쌀쌀함'];
function dyDayKey(ts) { const d = new Date(ts + 9 * 3600e3); return d.toISOString().slice(0, 10); }
function dyDayLabel(key) {
  const [y, m, d] = key.split('-').map(Number); const wd = '일월화수목금토'[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}년 ${m}월 ${d}일 ${wd}요일`;
}
function dyTime(ts) { const d = new Date(ts + 9 * 3600e3); const h = d.getUTCHours(), mi = d.getUTCMinutes(); return `${h < 6 ? '새벽' : h < 12 ? '오전' : h < 18 ? '오후' : '밤'} ${(h % 12) || 12}:${String(mi).padStart(2, '0')}`; }

// ---------- 일기장 그리기 ----------
function dyEsc(s) { return typeof esc === 'function' ? esc(s) : String(s); }
function renderDiaryPanel(title, body) {
  const D = dyEnsure(); D.unread = 0; dySyncBadge();
  title.textContent = '📔 모험 일기';
  const pbox = document.querySelector('#panel .pbox'); if (pbox) pbox.classList.add('diary');
  if (DIARY_VIEW.open) { renderDiaryDetail(body); return; }
  const tabs = [['all', '전체']].concat(Object.keys(DIARY_KIND).map(k => [k, DIARY_KIND[k].e + ' ' + DIARY_KIND[k].n]));
  const list = D.log.filter(e => DIARY_VIEW.tab === 'all' || e.kind === DIARY_VIEW.tab);
  const days = []; let cur = null;
  list.forEach((e, i) => {
    const key = e.old ? 'old' : dyDayKey(e.at);
    if (!cur || cur.key !== key) { cur = { key, items: [] }; days.push(cur); }
    cur.items.push(e);
  });
  const counts = {}; D.log.forEach(e => { counts[e.kind] = (counts[e.kind] || 0) + 1; });
  const nDays = new Set(D.log.filter(e => !e.old).map(e => dyDayKey(e.at))).size;
  const pageHTML = days.map(day => {
    const head = day.key === 'old'
      ? `<div class="dy-date">일기 쓰기 전에 알게 된 것들 <span class="dy-w">✎ 기억을 더듬어</span></div>`
      : `<div class="dy-date">${dyDayLabel(day.key)} <span class="dy-w">${DY_WEATHER[dyHash(day.key) % DY_WEATHER.length]}</span></div>`;
    const lines = day.items.map(e => {
      const K = DIARY_KIND[e.kind], idx = D.log.indexOf(e);
      const feel = DY_FEEL[e.kind] ? DY_FEEL[e.kind][dyHash(e.k) % DY_FEEL[e.kind].length] : '';
      const showFeel = dyHash(e.k + 'f') % 3 === 0;
      return `<button class="dy-line ${K.c}" data-dy="${idx}"><span class="dy-ic">${K.e}</span><span class="dy-tx">${e.old ? '' : `<em class="dy-tm">${dyTime(e.at)}</em> `}${dyEsc(dySentence(e))}${showFeel ? `<span class="dy-feel">— ${dyEsc(feel)}</span>` : ''}</span><span class="dy-go">펼치기 ›</span></button>`;
    }).join('');
    return `<section class="dy-day">${head}${lines}</section>`;
  }).join('');
  const empty = `<div class="dy-empty">아직 아무것도 안 적었다.<br>표지판을 읽거나, 문제를 풀거나, <u>밑줄 친 말</u>을 눌러 보면<br>여기에 하나씩 적힌다.</div>`;
  body.innerHTML = `<div class="dy-book">
    <div class="dy-cover"><b>${dyEsc(S.name)}의 확통 일기</b><span>알게 된 것 ${D.log.length}개${nDays ? ` · 일기 쓴 날 ${nDays}일` : ''}</span></div>
    <div class="dy-tabs">${tabs.map(([k, n]) => `<button class="dy-tab ${DIARY_VIEW.tab === k ? 'on' : ''}" data-tab="${k}">${n}${k !== 'all' && counts[k] ? ` <small>${counts[k]}</small>` : ''}</button>`).join('')}</div>
    <div class="dy-page">${pageHTML || empty}</div>
    <p class="dy-tip">💡 줄을 누르면 그때 배운 내용을 다시 볼 수 있어요. 단축키 J</p></div>`;
  body.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { DIARY_VIEW.tab = b.dataset.tab; AudioSys.sfx('select'); openPanel('diary'); });
  body.querySelectorAll('[data-dy]').forEach(b => b.onclick = () => { DIARY_VIEW.open = +b.dataset.dy; AudioSys.sfx('open'); openPanel('diary'); });
  body.scrollTop = 0;
}
function renderDiaryDetail(body) {
  const D = dyEnsure(), e = D.log[DIARY_VIEW.open];
  if (!e) { DIARY_VIEW.open = null; openPanel('diary'); return; }
  const K = DIARY_KIND[e.kind], [t] = dyTopic(e);
  let inner = '', act = '';
  if (e.kind === 'L') {
    const id = e.k.slice(2), L = LESSONS[id];
    inner = L ? `<div class="lesson">${lessonHTML(L.x)}</div>` : '';
    act = L ? `<button class="dy-act" data-lesson="${id}">🪧 표지판 앞에 선 것처럼 다시 읽기</button>` : '';
  }
  if (e.kind === 'Q' && e.snap) {
    const s = e.snap;
    inner = `<div class="quiz"><span class="qch">${s.ch}장</span> ${dyEsc(s.q).replace(/\n/g, '<br>')}</div>`
      + `<div class="sol"><b>📖 풀이</b><br>${s.f ? `공식: ${dyEsc(s.f)}` : ''}${s.s && s.s.length ? `<ol>${s.s.map(x => `<li>${dyEsc(x)}</li>`).join('')}</ol>` : `<br>${dyEsc(s.ex)}`}정답: <b>${dyEsc(s.a)}</b></div>`;
  }
  if (e.kind === 'C') { const c = CARDS.find(x => x.id === e.k.slice(2)); inner = c && typeof cardBodyHTML === 'function' ? cardBodyHTML(c) : ''; }
  if (e.kind === 'E') { const x = EASY.find(z => z.t === e.k.slice(2)); inner = x ? `<div class="dy-easy">${dyEsc(x.x).replace(/\n/g, '<br>')}</div>` : ''; }
  if (e.kind === 'D' && e.snap) inner = `<div class="lesson decree-f"><b>✦ ${dyEsc(e.snap.n)}</b> <small>(${e.snap.ch}장)</small><br><span class="big-f">${dyEsc(e.snap.f)}</span></div><div class="dy-easy">📜 ${dyEsc(e.snap.lore)}</div>`;
  if (e.kind === 'G' && e.snap) inner = `<div class="dy-gloss"><b>📘 ${e.snap.t}</b><div class="gt-d">${e.snap.d}</div><div class="gt-e"><b>예시</b> ${e.snap.e}</div></div>`;
  const prev = D.log.indexOf(e) - 1, next = D.log.indexOf(e) + 1;
  body.innerHTML = `<div class="dy-book dy-detail">
    <div class="dy-nav"><button class="dy-back" data-back="1">‹ 일기장으로</button><span>${prev >= 0 ? `<button class="dy-pn" data-dy="${prev}">‹ 이전</button>` : ''}${next < D.log.length ? `<button class="dy-pn" data-dy="${next}">다음 ›</button>` : ''}</span></div>
    <div class="dy-page">
      <div class="dy-date">${e.old ? '일기 쓰기 전' : dyDayLabel(dyDayKey(e.at)) + ' · ' + dyTime(e.at)}${e.map ? ` <span class="dy-w">📍 ${dyEsc(e.map)}</span>` : ''}</div>
      <div class="dy-line static ${K.c}"><span class="dy-ic">${K.e}</span><span class="dy-tx">${dyEsc(dySentence(e))}</span></div>
      <div class="dy-content">${inner || '<p class="muted">내용을 찾을 수 없다.</p>'}</div>
      ${act}
    </div></div>`;
  const ct = body.querySelector('.dy-content'); if (ct) { mathify(ct); if (typeof symbolize === 'function') symbolize(ct); if (typeof glossify === 'function') glossify(ct); }
  body.querySelector('[data-back]').onclick = () => { DIARY_VIEW.open = null; AudioSys.sfx('close'); openPanel('diary'); };
  body.querySelectorAll('[data-dy]').forEach(b => b.onclick = () => { DIARY_VIEW.open = +b.dataset.dy; AudioSys.sfx('select'); openPanel('diary'); });
  const la = body.querySelector('[data-lesson]'); if (la) la.onclick = () => { closePanel(); openTurn(lessonTurn(la.dataset.lesson)); };
  body.scrollTop = 0;
}
function dySyncBadge() {
  const b = document.getElementById('hud-dyn'); if (!b || !S || !S.diary) return;
  const n = S.diary.unread || 0; b.textContent = n ? (n > 9 ? '9+' : n) : ''; b.style.display = n ? '' : 'none';
}

// ---------- 기존 함수에 살짝 끼워 넣기 ----------
(function patchDiary() {
  const baseSave = save;
  save = function () { if (S && started) { try { if (!S.diary) diaryScan(true); else diaryScan(false); } catch (err) { console.warn('diary', err); } } return baseSave.apply(this, arguments); };
  const baseQuiz = quizTurn;
  quizTurn = function (o) {
    if (o && typeof o.after === 'function' && !o.__dy) { const a = o.after; o = Object.assign({}, o, { __dy: true, after: (ok, q) => { if (ok) diaryQuiz(q); return a(ok, q); } }); }
    return baseQuiz.call(this, o);
  };
  if (typeof decreeTurn === 'function') {
    const baseDec = decreeTurn;
    decreeTurn = function () {
      const r = baseDec.apply(this, arguments);
      try { const td = typeof todayDecree === 'function' ? todayDecree() : null, d = td && td.d; if (d) dyAdd('D:' + d.n, 'D', { n: d.n, f: d.f, ch: d.ch, lore: d.lore }); else if (r && r.desc) { const m = r.desc.match(/✦ ([^<]+)<\/b>/); const D2 = m && DECREES.find(x => esc(x.n) === m[1]); if (D2) dyAdd('D:' + D2.n, 'D', { n: D2.n, f: D2.f, ch: D2.ch, lore: D2.lore }); } } catch (err) {}
      return r;
    };
  }
  const baseOpen = openPanel;
  openPanel = function (kind) {
    const pbox = document.querySelector('#panel .pbox'); if (pbox) pbox.classList.remove('diary');
    if (kind !== 'diary') DIARY_VIEW.open = null;
    if (kind === 'diary') { if (dlgOpen) return; baseOpen.call(this, '__diary'); renderDiaryPanel(document.getElementById('panel-title'), document.getElementById('panel-body')); return; }
    const r = baseOpen.apply(this, arguments);
    try { mathify(document.getElementById('panel-body')); } catch (err) {}
    return r;
  };
  window.addEventListener('keydown', e => {
    if (!started || dlgOpen || cutOpen) return;
    const a = document.activeElement; if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return;
    if (e.key === 'j' || e.key === 'J' || e.key === 'ㅓ') { if (panelOpen) closePanel(); else openPanel('diary'); e.preventDefault(); }
  });
  // 일기 버튼 배지
  const iv = setInterval(() => { if (started) { dySyncBadge(); clearInterval(iv); } }, 500);
})();

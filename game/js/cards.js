// =========================================================================
// 🃏 마법카드 — 곳곳에 떨어진 카드를 주워 모은다. 개념 · 설명 · 이상하지만 확실한 예시
//    가방 → 카드 컬렉션에서 다시 보기. 20장을 다 모으면 특별 이벤트.
// =========================================================================
const CARDS = [
  // ---- 7장 추정 ----
  { id: 'c_point', ch: 7, map: 'town', e: '🎯', t: '점추정과 구간추정',
    d: '모르는 모수를 값 하나로 찍으면 점추정, 「이 범위 안」이라고 구간으로 말하면 구간추정이다.',
    ex: '친구 몸무게를 「62kg!」이라고 외치면 점추정. 「58~66kg 사이」라고 하면 구간추정.\n점추정은 거의 항상 틀리고(정확히 62.000kg일 리 없다), 구간은 맞을 「자신감」을 숫자로 붙일 수 있다.',
    f: '구간 = 점추정값 ± 오차한계' },
  { id: 'c_ci95', ch: 7, map: 'tower1', e: '🎣', t: '신뢰도 95%의 진짜 뜻',
    d: '같은 방법으로 구간을 100번 만들면 그중 약 95개가 진짜 μ를 품는다. 「이번 구간에 μ가 있을 확률이 95%」가 아니다.',
    ex: '그물을 100번 던지면 95번은 물고기(μ)를 건지는 어부.\n이미 던진 그물 안에 물고기는 있거나 없거나 둘 중 하나다. 95%는 「어부의 실력」이지 「이번 그물」의 확률이 아니다.',
    f: 'P(구간이 μ를 포함) = 1 − α  (만들기 전 기준)' },
  { id: 'c_sqrtn', ch: 7, map: 'inn1', e: '🍜', t: '표본 크기와 √n',
    d: '오차한계는 1/√n에 비례한다. 구간 폭을 절반으로 줄이려면 n을 4배로 늘려야 한다.',
    ex: '라면 국물 간을 볼 때 한 숟갈보다 네 숟갈 먹어야 두 배 확실해진다.\n두 배 확실해지려고 네 배를 먹어야 하니, 정확함은 비싸다. 배가 부르다.',
    f: 'E = z(α/2) · σ/√n' },
  { id: 'c_tdist', ch: 7, map: 'tower2', e: '🫣', t: 't분포',
    d: 'σ를 모르고 s로 대신할 때 쓴다. 정규분포보다 꼬리가 두꺼워 구간이 더 넓다. 자유도가 커지면 정규분포에 가까워진다.',
    ex: '처음 가 보는 식당, 리뷰가 3개뿐이면 「맛집일 수도, 지뢰일 수도」 넓게 각오한다(두꺼운 꼬리).\n리뷰가 3000개면 거의 확신한다(정규분포).',
    f: 'x̄ ± t(α/2, n−1) · s/√n' },
  { id: 'c_phat', ch: 7, map: 'lib1', e: '🍫', t: '모비율 추정',
    d: '표본비율 p̂ = X/n으로 모비율 p를 추정한다. 표준오차는 √(p̂(1−p̂)/n).',
    ex: '반 친구 30명 중 민트초코파가 9명이면 p̂ = 0.3.\n「전교생의 30% 근처가 치약 맛을 디저트로 먹는다」고 조심스럽게 말할 수 있다.',
    f: 'p̂ ± z(α/2) · √(p̂(1−p̂)/n)' },
  { id: 'c_level', ch: 7, map: 'dunW', e: '🌡️', t: '신뢰수준과 폭의 줄다리기',
    d: '신뢰수준을 높이면 임계값이 커져서 구간이 넓어진다. 확실함과 쓸모는 서로 줄다리기를 한다.',
    ex: '일기예보: 「내일 기온은 영하 50도에서 영상 50도 사이입니다.」\n신뢰도 100%, 쓸모 0%.',
    f: '90% → 1.645,  95% → 1.96,  99% → 2.576' },
  // ---- 8장 검정 ----
  { id: 'c_h0', ch: 8, map: 'court1', e: '⚖️', t: '귀무가설과 대립가설',
    d: 'H₀는 「차이 없다·효과 없다」는 기본 주장, H₁은 보이고 싶은 주장이다. 증거가 충분할 때만 H₀를 기각한다.',
    ex: 'H₀: 「우리 집 고양이는 평범하다.」 H₁: 「우리 집 고양이는 천재다.」\n고양이가 피아노로 쇼팽을 칠 때까지는 평범한 고양이로 본다.',
    f: 'H₀: μ = μ₀   vs   H₁: μ ≠ μ₀ (또는 >, <)' },
  { id: 'c_err', ch: 8, map: 'courtB', e: '🚨', t: '제1종 오류와 제2종 오류',
    d: '제1종 오류: 참인 H₀를 기각한다(확률 α). 제2종 오류: 거짓인 H₀를 기각하지 못한다(확률 β).',
    ex: '제1종: 토스트만 구웠는데 화재경보기가 울린다(헛경보).\n제2종: 진짜 불이 났는데 경보기가 조용하다(놓침). 둘 다 줄이려면 더 좋은 경보기(큰 n)가 필요하다.',
    f: 'P(제1종) = α,  P(제2종) = β,  검정력 = 1 − β' },
  { id: 'c_alpha', ch: 8, map: 'castle', e: '👑', t: '유의수준 α',
    d: '참인 H₀를 잘못 기각해도 봐줄 최대 확률. 데이터를 보기 전에 미리 정한다(보통 0.05).',
    ex: '왕이 선포한다: 「억울한 판결은 100건 중 5건까지만 참는다!」\n재판이 끝나고 나서 기준을 바꾸면 그건 반칙이다.',
    f: 'α = P(H₀ 기각 | H₀ 참)' },
  { id: 'c_tail', ch: 8, map: 'dunS', e: '↔️', t: '양측검정과 단측검정',
    d: 'H₁이 ≠ 이면 양쪽 꼬리에 α/2씩, > 나 < 이면 한쪽 꼬리에 α 전부를 둔다.',
    ex: '「과자 무게가 표시와 다르다」(많든 적든 문제) → 양측.\n「다이어트 약을 먹으면 살이 빠진다」(찌는 건 관심 없음) → 단측.',
    f: '양측: |Z₀| > z(α/2),  단측: Z₀ > z(α) 또는 Z₀ < −z(α)' },
  { id: 'c_pval', ch: 8, map: 'temple', e: '🪙', t: 'p값',
    d: 'H₀가 참이라고 칠 때, 지금만큼 또는 더 극단적인 결과가 나올 확률. p값 < α 이면 H₀를 기각한다.',
    ex: '동전을 10번 던졌더니 10번 다 앞면.\n「정상 동전이라면 이럴 확률 0.1%」 → 동전을 의심하는 게 합리적이다. p값은 「이 정도면 수상한가?」를 재는 수상함 측정기다.',
    f: 'p값 < α  →  H₀ 기각' },
  { id: 'c_z0', ch: 8, map: 'advguild', e: '📏', t: '검정통계량',
    d: '관측한 차이가 표준오차 몇 개만큼인지로 바꾼 값. 단위가 달라도 같은 자로 잴 수 있게 해 준다.',
    ex: '키가 5cm 차이 난다. 개미에게는 에베레스트, 기린에게는 먼지.\n「표준오차 몇 개 차이?」로 바꾸면 개미든 기린이든 똑같이 비교할 수 있다.',
    f: 'Z₀ = (x̄ − μ₀) / (σ/√n)' },
  // ---- 9장 범주형 ----
  { id: 'c_chi', ch: 9, map: 'alch1', e: '😤', t: '카이제곱 통계량',
    d: '각 칸마다 (관측 − 기대)²/기대를 구해 모두 더한다. 클수록 「기대와 현실이 다르다」.',
    ex: '생일 파티에 20명 올 줄 알았는데(E) 3명 왔다(O).\n칸마다 서운함을 제곱해 모은 「서운함 지수」가 χ²다. 제곱이라 서운함은 절대 음수가 되지 않는다.',
    f: 'χ²₀ = Σ (O − E)² / E' },
  { id: 'c_gof', ch: 9, map: 'guild', e: '🎲', t: '적합도 검정',
    d: '한 변수의 관측도수가 가설 분포(비율)와 맞는지 본다. 자유도는 범주 수 − 1.',
    ex: '수상한 주사위를 600번 던진다. 공정하다면 눈마다 100번씩 나와야 한다(E).\n6이 250번 나왔다면… 주인 표정부터 살피자.',
    f: 'E = n·p₀,  df = k − 1' },
  { id: 'c_indep', ch: 9, map: 'forest', e: '🥢', t: '독립성 검정',
    d: '한 집단에서 두 범주형 변수가 서로 관계있는지 본다. 분할표의 기대도수와 비교한다.',
    ex: '「탕수육 부먹/찍먹」과 「아침형/저녁형 인간」은 관계가 있을까?\n관계가 없다면 어느 쪽이든 부먹 비율이 비슷해야 한다.',
    f: 'df = (r − 1)(c − 1)' },
  { id: 'c_homo', ch: 9, map: 'town', e: '🍱', t: '동질성 검정',
    d: '여러 집단에서 한 변수의 비율이 같은지 본다. 계산법은 독립성 검정과 같지만 질문이 다르다.',
    ex: '1반, 2반, 3반의 급식 만족 비율은 같을까?\n「반」이라는 집단을 미리 나눠 놓고 뽑았다면 동질성, 한 무리에서 뽑아 두 성질을 물었다면 독립성.',
    f: 'E = (행 합 × 열 합) / 전체' },
  { id: 'c_expect', ch: 9, map: 'alchB', e: '🔮', t: '기대도수',
    d: '「관계가 없다면 이 칸에 몇 명이 있어야 하나」를 계산한 값. 5보다 작은 칸이 많으면 범주를 합친다.',
    ex: '전체의 40%가 부먹이라면, 저녁형 인간 50명 중에서도 20명쯤은 부먹이어야 「관계없음」이다.\n그 20이 기대도수다.',
    f: 'E = (행 합 × 열 합) / N' },
  { id: 'c_df', ch: 9, map: 'smithy', e: '🍕', t: '자유도',
    d: '자유롭게 정할 수 있는 값의 개수. 합계가 정해져 있으면 마지막 하나는 저절로 정해진다.',
    ex: '피자 8조각을 8명이 고른다. 7명이 고르고 나면 마지막 사람은 선택권이 없다.\n자유도 7. 마지막 사람은 늘 테두리만 남은 조각을 먹는다.',
    f: '평균: n − 1,  적합도: k − 1,  분할표: (r−1)(c−1)' },
  // ---- 보너스 ----
  { id: 'c_outlier', ch: 7, map: 'cave', e: '🦒', t: '이상치',
    d: '다른 값들과 동떨어진 값. 평균과 표준편차를 크게 흔든다. 함부로 지우면 안 되고 이유를 확인해야 한다.',
    ex: '우리 반 평균 키를 쟀는데 견학 온 기린이 줄에 섞여 있었다.\n평균이 갑자기 2m. 기린을 빼기 전에 「왜 기린이 줄을 섰는지」부터 알아보자.',
    f: '평균은 이상치에 약하고, 중앙값은 강하다' },
  { id: 'c_bias', ch: 8, map: 'haunt', e: '🕯️', t: '편향된 표본',
    d: '표본이 모집단을 고르게 대표하지 못하면, n을 아무리 늘려도 결론이 틀어진다.',
    ex: '「우리 마을 사람들은 밤을 좋아한다」 — 조사는 밤 12시에 창밖에 줄 선 사람들에게만 했다.\n열두 명이든 천 명이든, 줄 선 사람만 세면 답은 늘 같다. (에드거는 끝내 이걸 몰랐다)',
    f: '큰 n이 편향을 고쳐 주지는 않는다' }
];
const CARD_BY = {}; CARDS.forEach((c, i) => { c.no = i + 1; CARD_BY[c.id] = c; });
if (typeof ACHS !== 'undefined') { ACHS.card1 = ['첫 마법카드', '마법카드를 처음 주웠다']; ACHS.cards = ['대마법 요약서', '마법카드 20장을 전부 모았다']; }
function cardCount() { return CARDS.filter(c => S.cards && S.cards[c.id]).length; }

// ---- 맵 위 위치: 맵에서 가장 큰 연결 바닥 영역 안, 문·NPC 자리를 피해 카드마다 고정된 칸 ----
const CARD_POS = {};
function cardHash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function cardSpot(c) {
  if (CARD_POS[c.id]) return CARD_POS[c.id];
  const m = MAPS[c.map]; if (!m) return null;
  const ok = (x, y) => x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1 && !SOLID.has(m.g[y][x]) && !'D^v~'.includes(m.g[y][x]);
  const seen = new Uint8Array(m.w * m.h); let best = [];
  for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
    if (seen[y * m.w + x] || !ok(x, y)) continue;
    const comp = [], q = [[x, y]]; seen[y * m.w + x] = 1;
    while (q.length) { const [cx, cy] = q.pop(); comp.push([cx, cy]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (ok(nx, ny) && !seen[ny * m.w + nx]) { seen[ny * m.w + nx] = 1; q.push([nx, ny]); } } }
    if (comp.length > best.length) best = comp;
  }
  const npcAt = new Set(Object.keys(NPCS).filter(id => NPCS[id].map === c.map && NPCS[id].pos).map(id => NPCS[id].pos.join(',')));
  const doorNear = (x, y) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const t = (m.g[y + j] || '')[x + i]; if (t && 'D^v'.includes(t)) return true; } return false; };
  let cand = best.filter(([x, y]) => !doorNear(x, y) && !npcAt.has(x + ',' + y) && !(m.signs && m.signs[x + ',' + y]));
  // 같은 맵의 다른 카드와 겹치지 않게
  const taken = new Set(CARDS.filter(o => o !== c && CARD_POS[o.id] && o.map === c.map).map(o => CARD_POS[o.id].join(',')));
  cand = cand.filter(p => !taken.has(p.join(','))); if (!cand.length) cand = best;
  if (!cand.length) return null;
  return (CARD_POS[c.id] = cand[cardHash(c.id) % cand.length]);
}

// ---- 그리기: 반짝이며 떠 있는 카드 ----
function drawCards(ctx, t, vx0, vy0, vx1, vy1) {
  if (!S || !MAP) return;
  for (const c of CARDS) {
    if (c.map !== MAP.id || (S.cards && S.cards[c.id])) continue;
    const p = cardSpot(c); if (!p) continue;
    const [x, y] = p; if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
    const bob = Math.round(Math.sin(t / 380 + x) * 1.5), px = x * TS + 4, py = y * TS + 1 + bob;
    const glow = 0.35 + 0.25 * Math.sin(t / 260 + y);
    ctx.fillStyle = `rgba(255,220,120,${glow})`; ctx.fillRect(px - 2, py - 2, 12, 15);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(px + 1, y * TS + 14, 7, 2);
    ctx.fillStyle = '#3a2350'; ctx.fillRect(px, py, 8, 11);
    ctx.fillStyle = { 7: '#6a4ad0', 8: '#c0405a', 9: '#2f9a7a' }[c.ch] || '#6a4ad0'; ctx.fillRect(px + 1, py + 1, 6, 9);
    ctx.fillStyle = '#ffd86a'; ctx.fillRect(px + 3, py + 3, 2, 5); ctx.fillRect(px + 2, py + 4, 4, 3);
    ctx.fillStyle = '#fff6d0'; ctx.fillRect(px + 1, py + 1, 2, 1);
    const sp = (t / 90 + x * 7) % 40 | 0; if (sp < 6) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px + 9, py - 1 + (sp >> 1), 1, 1); ctx.fillRect(px - 2, py + 8 - (sp >> 1), 1, 1); }
  }
}

// ---- 줍기 ----
function cardSVG(c) {
  const col = { 7: ['#6a4ad0', '#3a2380'], 8: ['#c0405a', '#6a1a30'], 9: ['#2f9a7a', '#145a48'] }[c.ch] || ['#6a4ad0', '#3a2380'];
  return `<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%"><defs><linearGradient id="cg${c.no}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${col[0]}"/><stop offset="1" stop-color="${col[1]}"/></linearGradient></defs>
  <rect x="8" y="6" width="104" height="148" rx="10" fill="url(#cg${c.no})" stroke="#ffd86a" stroke-width="4"/><rect x="16" y="14" width="88" height="132" rx="6" fill="none" stroke="#ffe9a8" stroke-opacity=".5" stroke-width="1.5" stroke-dasharray="3 3"/>
  <text x="60" y="34" text-anchor="middle" font-size="12" font-weight="800" fill="#ffe9a8" font-family="Pretendard,sans-serif">No.${String(c.no).padStart(2, '0')} · ${c.ch}장</text>
  <text x="60" y="96" text-anchor="middle" font-size="44">${c.e}</text>
  <text x="60" y="134" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="Pretendard,sans-serif">${esc(c.t.length > 10 ? c.t.slice(0, 10) + '…' : c.t)}</text></svg>`;
}
function cardBodyHTML(c) {
  return `<div class="mcard mc${c.ch}"><div class="mc-h">✦ 핵심</div><div class="mc-d">${esc(c.d)}</div><div class="mc-h">🤪 이상하지만 확실한 예시</div><div class="mc-x">${esc(c.ex).replace(/\n/g, '<br>')}</div><div class="mc-f">📐 ${esc(c.f)}</div></div>`;
}
function cardTurn(c, fresh) {
  const n = cardCount();
  return { title: `${c.e} ${c.t}`, sub: `마법카드 No.${String(c.no).padStart(2, '0')} · ${c.ch}장`, svg: cardSVG(c),
    desc: (fresh ? `<b>✨ 마법카드를 주웠다!</b>  (${n}/${CARDS.length})\n` : '') + cardBodyHTML(c),
    choices: [{ t: fresh ? '가방에 넣는다' : '닫는다', run: () => { if (fresh && n === CARDS.length && !S.flags.cards_all) setTimeout(cardsComplete, 500); return null; } },
      { t: '🃏 카드 컬렉션 보기', run: () => { setTimeout(() => openPanel('cards'), 50); return null; } }] };
}
function cardCheck() {
  if (!S || !MAP) return;
  for (const c of CARDS) {
    if (c.map !== MAP.id || (S.cards && S.cards[c.id])) continue;
    const p = cardSpot(c); if (!p || p[0] !== PLAYER.x || p[1] !== PLAYER.y) continue;
    S.cards = S.cards || {}; S.cards[c.id] = true; save();
    AudioSys.sfx('level'); ach('card1');
    try { const [px, py] = playerScreenPct(); onoma('✨ 반짝!', { x: px, y: py - 14, size: 30, color: '#ffe066' }); } catch (e) {}
    setTimeout(() => openTurn(cardTurn(c, true)), 350);
    return;
  }
}

// ---- 20장 완성: 특별 이벤트 ----
function cardsComplete() {
  if (S.flags.cards_all) return;
  setFlag('cards_all');
  const lines = [
    [null, '가방 속 카드 스무 장이 동시에 떨리기 시작한다.', 'shake'],
    [null, '촤르르르르— 카드들이 저절로 튀어나와 당신 주위를 빙글빙글 돈다.', 'flash'],
    ['easy', '「오오오?! 다 모았어?! 스무 장 전부?!」'],
    ['easy', '「점추정부터 자유도까지… 이거 그냥 시험 범위 전체잖아.」'],
    ['easy', '「카드가 그리는 원 좀 봐. 정규분포처럼 가운데가 불룩… 아니 그냥 원이네.」'],
    [null, '카드들이 한 장씩 겹쳐지며 두툼한 책 한 권이 된다.\n표지에 금박으로 새겨진 글자: 「대마법 요약서」', 'flash'],
    ['easy', '「그거 시험 전날 밤에 읽으면 효과 두 배다. 진짜야. 아마도. 표본은 나 하나지만.」']
  ];
  playCut({ id: 'cards_all_' + Date.now(), map: MAP.id, music: 'epic', lines, onEnd: () => {
    const fx = applyFx({ gold: 300, focus: 3, ach: 'cards' });
    openTurn({ title: '📜 대마법 요약서', sub: '마법카드 20장 완성', obj: 'sign',
      desc: '스무 장의 핵심과 공식이 한 권에 담겼다. 가방의 카드 컬렉션에서 언제든 펼쳐 볼 수 있다.\n\n이지 쌤이 엄지를 든다. 「이제 넌 걸어 다니는 개념사전이야.」', fx,
      choices: [{ t: '📜 요약서를 펼친다', run: () => summaryTurn() }, { t: '가방에 넣는다', run: () => null }] });
  } });
}
function summaryTurn() {
  const rows = [7, 8, 9].map(ch => `<div class="mc-sum-h">${ch}장 ${({ 7: '추정', 8: '검정', 9: '범주형 자료' })[ch]}</div>` + CARDS.filter(c => c.ch === ch).map(c => `<div class="mc-sum"><b>${c.e} ${esc(c.t)}</b><span>${esc(c.f)}</span></div>`).join('')).join('');
  return { title: '📜 대마법 요약서', sub: '카드 20장의 공식 모음', obj: 'sign', desc: `<div class="mcard">${rows}</div>`, choices: [{ t: '닫는다', run: () => null }] };
}

// ---- 가방 → 카드 컬렉션 패널 ----
function renderCardsPanel(title, body) {
  const n = cardCount();
  title.textContent = `🃏 카드 컬렉션 · ${n}/${CARDS.length}`;
  body.innerHTML = `<div class="cc-top"><div class="cc-bar"><i style="width:${n / CARDS.length * 100}%"></i></div>${S.flags.cards_all ? '<button class="cc-sum" data-sum="1">📜 대마법 요약서</button>' : `<small>다 모으면 특별한 일이 일어난다…</small>`}</div>
    <div class="cc-grid">${CARDS.map(c => S.cards && S.cards[c.id]
      ? `<button class="cc-card mc${c.ch}" data-card="${c.id}"><span class="cc-no">No.${String(c.no).padStart(2, '0')}</span><span class="cc-e">${c.e}</span><span class="cc-t">${esc(c.t)}</span></button>`
      : `<div class="cc-card cc-lock"><span class="cc-no">No.${String(c.no).padStart(2, '0')}</span><span class="cc-e">?</span><span class="cc-t">${esc((MAPS[c.map] || {}).name || '어딘가')}</span></div>`).join('')}</div>
    <button class="cc-back" data-back="1">← 가방으로</button>`;
  body.querySelectorAll('[data-card]').forEach(b => b.onclick = () => { closePanel(); openTurn(cardTurn(CARD_BY[b.dataset.card], false)); });
  const s = body.querySelector('[data-sum]'); if (s) s.onclick = () => { closePanel(); openTurn(summaryTurn()); };
  body.querySelector('[data-back]').onclick = () => openPanel('bag');
}

// =========================================================================
// 🎭 돌발 이벤트 추가 — 장난꾸러기와 개성 넘치는 사람들
// =========================================================================
function evEnd(who, desc, fx, mood) { return Object.assign(who && NPCS[who] ? { who, mood: mood || 'happy' } : { title: who || '', obj: 'sign' }, { desc, fx: fx ? applyFx(fx, who) : undefined, choices: [{ t: '계속 간다', run: () => null }] }); }
// 라이라의 컵 놀이 (몬티 홀)
function shellGame() {
  const prize = Math.random() * 3 | 0;
  const pickTurn = pick => {
    const others = [0, 1, 2].filter(i => i !== pick && i !== prize);
    const open = others[Math.random() * others.length | 0], other = [0, 1, 2].find(i => i !== pick && i !== open);
    const res = final => final === prize
      ? evEnd('lyra', `컵을 들어 올리자 반짝이는 구슬! 「와아, 맞혔다!」\n\n${final === pick ? '처음 고른 걸 지켰다. 이번엔 운이 좋았다. (지키면 이길 확률 1/3)' : '바꿨다! 라이라가 입을 삐죽인다. 「…바꾸면 이길 확률이 2/3인 거 알고 있었지?」'}`, { gold: 15 })
      : evEnd('lyra', `텅 빈 컵. 구슬은 ${prize + 1}번 컵에 있었다. 「히히, 아쉽다~」\n\n${final === pick ? '💡 처음 고른 컵이 맞을 확률은 처음부터 1/3. 라이라가 빈 컵을 열어 준 뒤에는 「바꾸는 쪽」이 2/3로 유리했다.' : '바꾸는 게 맞는 전략이었지만, 2/3라도 질 때는 진다. 확률은 한 판이 아니라 많이 했을 때의 이야기다.'}`, { gold: -3 }, 'happy');
    return { who: 'lyra', mood: 'happy', desc: `라이라가 ${open + 1}번 컵을 들어 보인다. 텅 비었다.\n「자, 마지막 기회! ${pick + 1}번을 지킬래, ${other + 1}번으로 바꿀래?」`,
      choices: [{ t: `${pick + 1}번을 지킨다`, run: () => res(pick) }, { t: `${other + 1}번으로 바꾼다`, run: () => res(other) }] };
  };
  return { who: 'lyra', mood: 'happy', desc: '「짜잔~ 거리 공연 시간!」 분홍 머리 소녀가 컵 세 개를 휙휙 섞는다.\n「구슬은 어디 있을까요? 맞히면 15골드, 틀리면 3골드!」',
    choices: [0, 1, 2].map(i => ({ t: `${i + 1}번 컵`, tag: '🎲 1/3', run: () => pickTurn(i) })) };
}
const EVENTS_FUN = [
  // 장난꾸러기 요정 — 신발끈 묶기
  { w: 2, where: m => m.theme === 'forest' || m.theme === 'town', run: () => popEvent(['킥킥킥—', '휘릭!', '(철퍼덕)'], () => ({ who: 'fairy', mood: 'happy',
    desc: '한 걸음 내딛는 순간 넘어졌다. 양쪽 신발끈이 서로 묶여 있다.\n나뭇잎 사이에서 요정이 배를 잡고 웃는다. 「히히히! 오늘 벌써 열두 번째야!」',
    choices: [
      { t: '「열두 번 중 몇 번 성공했는데?」라고 묻는다', run: () => evEnd('fairy', '「…열두 번 다?」\n「그럼 성공률 100%네. 표본 12개면 신뢰구간이 꽤 넓을 텐데.」\n요정이 멍해지더니 갑자기 진지해진다. 「…더 모아야겠다.」 그리고 네잎클로버를 떨어뜨리고 사라졌다.', { item: 'clover', aff: 1 }) },
      { t: '같이 웃어 준다', run: () => evEnd('fairy', '당신이 웃자 요정이 더 크게 웃는다. 둘이 한참을 웃었다.\n「너 재밌다! 이거 줄게!」 반짝이는 가루가 머리에 쏟아진다. 기분이 좋아졌다.', { hp: 3, aff: 2 }) },
      { t: '잡으려고 손을 뻗는다', tag: '민첩', run: () => Math.random() < .4 ? evEnd('fairy', '잡았다! 요정이 손 안에서 버둥거린다. 「알았어 알았어! 놓아주면 이거 줄게!」', { gold: 12 }) : evEnd('fairy', '헛손질. 그리고 또 넘어졌다. 신발끈이 아직 묶여 있었으니까.\n「킥킥킥킥!」', { hp: -1 }, 'happy') }] })) },
  // 슬라임 카이 — 얼굴에 철썩
  { w: 2, where: m => m.theme !== 'interior', run: () => popEvent(['뿌잉—', '뿌잉뿌잉!', '(철썩)'], () => ({ who: 'kai', mood: 'happy',
    desc: '말랑한 무언가가 얼굴에 철썩 달라붙었다. 앞이 초록색이다.\n「뿌잉! (안녕!)」 슬라임이 반갑다는 듯 출렁인다.',
    choices: [
      { t: '조심스럽게 떼어 낸다', run: () => evEnd('kai', '쫀득— 하고 떨어진다. 슬라임이 서운한 듯 출렁이다가 젤리 한 덩이를 남기고 통통 튀어 간다.', { item: 'jelly', aff: 1 }) },
      { t: '「너 무게가 몇이야?」라고 묻는다', run: () => evEnd('kai', '슬라임이 고민하더니 몸을 반으로 나눈다. 두 덩이가 다시 합쳐진다.\n「뿌잉. (평균이 같아. 그냥 퍼짐만 달라.)」\n…분산 얘기인가? 슬라임에게서 통계를 배웠다.', { focus: 1 }) },
      { t: '얼굴에 붙인 채로 걷는다', run: () => evEnd('kai', '얼굴에 슬라임을 붙인 채 걸어간다. 지나가던 사람들이 길을 비켜 준다.\n시원하고 촉촉하다. 의외로 피부가 좋아진 것 같다.', { hp: 2 }) }] })) },
  // 미믹 — 길 한복판의 수상한 상자
  { w: 1, where: m => m.theme === 'dungeon' || m.theme === 'cave' || m.theme === 'forest', run: () => popEvent(['덜컹…', '덜컹덜컹!', '…?'], () => ({ who: 'mimic', mood: 'neutral',
    desc: '길 한복판에 보물상자가 있다. 방금 분명히 혼자 움직였다.\n뚜껑 틈으로 혀가 살짝 보였다가 쏙 들어간다.',
    choices: [
      { t: '열어 본다', run: () => evEnd('mimic', '콱! 손을 물렸다. 그런데 상자가 퉤 하고 동전을 뱉는다.\n「…맛없어. 너 오늘 손 안 씻었지.」', { hp: -2, gold: 18 }, 'angry') },
      { t: '「너 미믹이지?」라고 묻는다', run: () => evEnd('mimic', '「…아닌데? 그냥 상자인데?」\n「상자는 말을 안 해.」\n「……」 미믹이 슬그머니 옆으로 기어간다. 「제1종 오류일 수도 있잖아…」 남긴 말이 그거였다.', { aff: 1 }) },
      { t: '살금살금 지나간다', run: () => evEnd('mimic', '지나가는데 뒤에서 「…쳇」 하는 소리가 들렸다.', null) }] })) },
  // 토비의 실패한 마법
  { w: 2, where: m => m.theme === 'town' || m.theme === 'interior', run: () => popEvent(['수리수리—', '펑!!', '(콜록콜록)'], () => ({ who: 'toby', mood: 'surprise',
    desc: '보라색 연기가 걷히자 파란 모자 소년이 새파랗게 질려 있다.\n「으아, 미, 미안! 「표본 복제」 주문이었는데…」\n발밑을 보니 당신의 그림자가 세 개다. 셋 다 동작이 조금씩 늦다.',
    choices: [
      { t: '「복원추출이었으면 괜찮았을 텐데」', run: () => evEnd('toby', '토비가 눈을 반짝인다. 「아! 같은 걸 다시 뽑을 수 있게 하면…!」\n다시 주문을 외우자 그림자가 하나로 돌아왔다. 토비가 사과의 뜻으로 물약을 건넨다.', { item: 'potion', aff: 2 }) },
      { t: '그림자들과 같이 춤을 춘다', run: () => evEnd('toby', '셋이서, 아니 넷이서 춤을 췄다. 구경꾼들이 동전을 던진다.\n토비: 「…이거 공연으로 팔아도 되겠는데?」', { gold: 10 }) },
      { t: '화를 낸다', run: () => evEnd('toby', '토비가 울먹이며 주문을 거꾸로 외운다. 그림자는 돌아왔는데, 이번엔 머리카락이 잠깐 초록색이 됐다가 돌아왔다.\n…아무도 못 봤겠지?', { aff: -1 }, 'sad') }] })) },
  // 허풍쟁이 고드릭
  { w: 2, where: m => m.theme === 'town', run: () => popEvent(['와하하하하!', '쿵! (어깨동무)'], () => ({ who: 'godric', mood: 'happy',
    desc: '금발 남자가 다짜고짜 어깨동무를 한다.\n「내가 말이야, 지난주에 드래곤을 천 마리 잡았어! 진짜야! 이 비늘 봐! 단돈 20골드!」\n손에 든 건 아무리 봐도 그냥 조약돌이다.',
    choices: [
      { t: '「표본이 몇 마리였는데요?」', run: () => evEnd('godric', '「…한 마리? 아니, 그 한 마리를 천 번… 아니 그게…」\n고드릭이 땀을 흘린다. 「한 번 본 걸로 천 마리라고 하면 안 되는구나…」\n민망했는지 조약돌을 공짜로 주고 도망갔다.', { item: 'pebble' }) },
      { t: '20골드에 산다', run: () => evEnd('godric', '「탁월한 안목이야!」 고드릭이 신나서 사라진다.\n손바닥 위의 「드래곤 비늘」을 본다. 뒷면에 「강가 조약돌」이라고 적혀 있다.', { gold: -20, item: 'pebble' }, 'happy') },
      { t: '「저는 드래곤을 만 마리 잡았는데요」', run: () => evEnd('godric', '고드릭이 눈을 크게 뜬다. 「…형님!」\n그날 이후 고드릭은 당신을 형님이라 부른다. 빵도 하나 얻었다.', { item: 'bread', aff: 2 }) }] })) },
  // 비둘기 왕의 행차
  { w: 1, where: m => m.theme === 'town' || m.theme === 'forest', run: () => popEvent(['구구구구—', '구구구구구구!!', '(파닥파닥)'], () => ({ who: 'pigeon', mood: 'neutral',
    desc: '비둘기 수십 마리가 줄지어 행진한다. 맨 앞에는 작은 왕관을 쓴 비둘기.\n행렬이 당신 앞에 멈춘다. 왕관 비둘기가 날개로 당신 가방을 가리킨다. 통행세를 내라는 것 같다.',
    choices: [
      { t: '빵 부스러기를 바친다', run: () => S.items.bread > 0 ? evEnd('pigeon', '「구우~」 비둘기 왕이 만족스럽게 고개를 끄덕인다. 신하 비둘기들이 반짝이는 동전을 하나씩 물어다 준다.', { take: 'bread', gold: 14, aff: 2 }) : evEnd('pigeon', '가방을 뒤졌지만 빵이 없다. 비둘기 왕이 실망한 눈으로 보더니, 당신 머리 위를 의미심장하게 날아 지나갔다.\n…어깨가 축축하다.', { hp: -1 }) },
      { t: '「비둘기 수를 세어 봐도 될까요?」', run: () => evEnd('pigeon', '하나, 둘, 셋… 세는 동안 비둘기들이 계속 자리를 바꾼다. 47마리? 52마리? 49마리?\n「평균 49.3마리, 표준편차 약 2.5」라고 중얼거리자 비둘기 왕이 감탄한 듯 왕관을 고쳐 쓴다.', { focus: 1 }) },
      { t: '「구구!」라고 대답한다', run: () => evEnd('pigeon', '비둘기 왕이 고개를 갸웃한다. 「…구구?」\n「구구구!」\n대화가 성립했다. 무슨 말을 했는지는 둘 다 모른다. 행렬이 길을 비켜 준다.', { aff: 1 }) }] })) },
  // 라이라의 컵 놀이 (몬티 홀)
  { w: 2, where: m => m.theme === 'town' || m.id === 'inn1' || m.id === 'advguild', run: () => popEvent(['짜잔~!', '빙글빙글빙글—'], () => shellGame()) },
  // 길 잃은 로스트
  { w: 1, where: m => m.theme === 'forest' || m.theme === 'town' || m.theme === 'cave', run: () => runnerEvent('lost', ['여긴 어디야아아—!', '쿵!', '(빙글빙글)'], () => ({ who: 'lost', mood: 'surprise',
    desc: '고글을 쓴 청년이 지도를 거꾸로 든 채 달려와 부딪혔다.\n「혹시 여기가 어디예요? 사흘째 같은 나무를 지나고 있어요. 세 번 지나쳤으니까 이 나무가 숲의 평균 나무인 것 같아요.」',
    choices: [
      { t: '지도를 똑바로 돌려 준다', run: () => evEnd('lost', '「…아.」\n청년이 한참 지도를 보더니 얼굴이 빨개진다. 「사흘이…」\n고맙다며 고글 속에 숨겨 둔 동전을 꺼내 준다.', { gold: 10, aff: 2 }) },
      { t: '「같은 나무만 세면 그건 편향된 표본이에요」', run: () => evEnd('lost', '「편향… 그러니까 다른 나무도 봐야 한다는 거죠?」\n청년이 눈을 반짝이며 전혀 다른 방향으로 뛰어간다. 「고마워요! 표본을 넓히러 갑니다!」\n…방향은 또 틀렸다.', { focus: 1 }) },
      { t: '같이 길을 잃어 본다', run: () => evEnd('lost', '둘이 한참 헤매다 보니 처음 자리로 돌아왔다. 청년: 「역시 이 나무가 평균 나무였어!」\n그래도 오는 길에 버섯을 주웠다.', { item: 'mush' }) }] })) },
  // 춤추는 해골
  { w: 2, where: m => m.theme === 'dungeon' || m.theme === 'cave', run: () => popEvent(['딸깍딸깍—', '딸깍딸깍딸깍!!', '♪'], () => ({ who: 'skelly', mood: 'happy',
    desc: '어둠 속에서 해골, 아니 창백한 대머리 청년이 리듬에 맞춰 춤을 추며 다가온다.\n「야야야, 댄스 배틀 한 판! 지면 뼈 하나 내놓기!」',
    choices: [
      { t: '정규분포 춤을 춘다 (양팔로 종 모양)', run: () => evEnd('skelly', '양팔로 우아한 종 모양을 그린다. 가운데가 볼록, 양 끝은 부드럽게.\n「…대칭이 완벽해. 졌다.」 해골 청년이 뼈 모양 과자를 건넨다.', { item: 'cookie', aff: 2 }) },
      { t: '카이제곱 춤을 춘다 (한쪽으로 쏠림)', run: () => evEnd('skelly', '왼쪽으로 확 쏠렸다가 오른쪽으로 길게 꼬리를 끄는 춤.\n「오른쪽 꼬리가… 길어… 아름다워…」 해골 청년이 감동해 박수를 친다. 딸깍딸깍.', { gold: 12 }) },
      { t: '도망친다', run: () => evEnd('skelly', '「배틀에서 도망치면 자동 패배야~!」 뒤에서 뼈 하나를 던진다. 받았다. …왜 받았지.', { item: 'bone' }, 'happy') }] })) },
  // 고양이 피발루의 낮잠
  { w: 1, where: m => m.theme === 'interior' || m.theme === 'town', run: () => popEvent(['냐아—', '털썩.', '(골골골골)'], () => ({ who: 'pivalu', mood: 'happy',
    desc: '주황 고양이가 당신 가방 위에 털썩 눕는다. 골골골골. 비킬 생각이 전혀 없다.\n가방에서 생선 냄새가 나는 게 문제였던 것 같다.',
    choices: [
      { t: '쓰다듬는다', run: () => evEnd('pivalu', '골골 소리가 두 배가 된다. 3분 뒤 고양이가 일어나 기지개를 켜고 떠난다.\n가방 위에 털이 잔뜩 남았다. 그리고 이상하게 마음이 편해졌다.', { hp: 4, aff: 2 }) },
      { t: '생선을 내어 준다', run: () => S.items.fish > 0 ? evEnd('pivalu', '고양이가 생선을 물고 우아하게 떠난다. 떠난 자리에 반짝이는 무언가. 네잎클로버다. 고양이식 거래인가 보다.', { take: 'fish', item: 'clover', aff: 3 }) : evEnd('pivalu', '가방을 뒤졌지만 생선이 없다. 고양이가 「거짓말쟁이」라는 눈으로 노려보더니 손등을 살짝 문다. 아프진 않다. 자존심이 아프다.', null, 'angry') },
      { t: '「고양이가 가방에 올라탈 확률은?」 계산해 본다', run: () => evEnd('pivalu', '생선 냄새가 날 때 올라탈 확률, 안 날 때 올라탈 확률… 조건부확률을 세우는 동안 고양이는 잠들었다.\n결론: 고양이 앞에서 확률은 무력하다.', { focus: 1 }) }] })) }
];
EVENTS.push(...EVENTS_FUN);

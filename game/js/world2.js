/* =========================================================================
 * 벨레스타 연대기 — 확장: 동서남북 지역 · 던전 · 길 안내 · 돌발 이벤트
 *                    · 오늘의 칙령 벽보 · 돌발 퀴즈 · 수식 기호 풀이
 * ========================================================================= */
'use strict';
// assets/portraits 폴더에 있는 일러스트 목록 (모든 인물 그림은 여기서만 가져온다)
const PORTRAIT_IDS = 'alpha bayes bellman beta bruno categoria confi daisy elena elise estima fairy fin gamli godric gregory grim hans hassan hypo infinity kai kiara leon log lost lyra marta mimic miner2 minji moa monte neil nobody null nurungji outlier owen pair park pebble pielle pigeon pivalu prime repair saira serena silva skelly thaniya toby troll veil volkan woodcutter'.split(' ');

// -------------------------------------------------------------------------
// 던전 정보 (표지판 몇 개를 읽어야 결계가 열리는지)
// -------------------------------------------------------------------------
const DUNGEON_INFO = {
  dunW: { n: '추정의 지하수로', need: 5, ch: 7, dir: '서쪽', boss: 'g_wb' },
  dunS: { n: '검정의 폐성채', need: 12, ch: 8, dir: '남쪽', boss: 'g_sb' },
  dunE: { n: '범주의 화염 미궁', need: 20, ch: 9, dir: '동쪽 (숲 너머)', boss: 'g_eb' }
};

// -------------------------------------------------------------------------
// 맵 (ASCII) — 숫자는 NPC 자리, S 표지판, C 상자
// -------------------------------------------------------------------------
const EXTRA_ROOMS = {
  castle: { name: '왕성 벨레스타 · 알현실', theme: 'interior', music: 'court', npcs: ['stokas', 'aegis', 'sigma', 'vivian'], signs: ['sym_1', 'sym_2', 'sym_3', 'sym_4'], chests: ['ch_castle'],
    extra: { follow: true, fit: 17, edgeWarps: [{ side: 'S', x0: 12, x1: 14, to: 'town' }], arrive: { town: [13, 18, 3] } }, rows: [
    '###########################',
    '###########################',
    '#_y_P____a__rAr__a____P_y_#',
    '#___________r0r___________#',
    '#__P________rrr________P__#',
    '#__n__n_____rrr_____n__n__#',
    '#__P________rrr___1____P__#',
    '#_S_________rrr_________S_#',
    '#__P________rrr________P__#',
    '##########__rrr__##########',
    '#_B_B_B_____rrr_____t_2___#',
    '#___________rrr___________#',
    '#_S_____P___rrr___P_____S_#',
    '#___________rrr___________#',
    '#_X_H_______rrr_______C___#',
    '#___________rrr___________#',
    '#_n___n_P___rrr___P_n___n_#',
    '#___________rrr_______3___#',
    '#_y_________rrr_________y_#',
    '############___############'] },
  dunW: { name: '추정의 지하수로', theme: 'cave', music: 'cave', dark: true, npcs: ['g_w1', 'g_w2', 'g_wb'], signs: ['d_w1', 'd_w2'], chests: ['ch_dunW'],
    extra: { fit: 15, edgeWarps: [{ side: 'E', y0: 10, y1: 12, to: 'town' }], arrive: { town: [32, 11, 1] } }, rows: [
    '##################################',
    '##################################',
    '##################################',
    '#####C############################',
    '#####2############################',
    '##______y#y________###############',
    '##_______#_______m_###############',
    '##_m_____#_________#####_______y##',
    '##_______#_________#####_S______##',
    '##_______#___~~~___#####_____o__##',
    '##_____o_#___~~~___#####__________',
    '##y______#___~~~_____0____________',
    '####_#####_________#####__________',
    '####_#####______o__#####________##',
    '####_#####_m_______#####___m____##',
    '####_#####________y#####y_______##',
    '####_#########_###################',
    '####_#########1###################',
    '####_#y________________###########',
    '####________o________S_###########',
    '######___m_____________###########',
    '##################################'] },
  dunS: { name: '검정의 폐성채', theme: 'dungeon', music: 'prison', dark: true, npcs: ['g_s1', 'g_s2', 'g_sb'], signs: ['d_s1', 'd_s2'], chests: ['ch_dunS'],
    extra: { fit: 15, edgeWarps: [{ side: 'N', x0: 14, x1: 16, to: 'town' }], arrive: { town: [15, 1, 0] } }, rows: [
    '##############___##############',
    '##############___##############',
    '##########___________##########',
    '##########_S_________##########',
    '##########___________##########',
    '##########___________##########',
    '##########__o________##########',
    '##########y_________y##########',
    '###############_###############',
    '###############0###############',
    '####j____________________o_####',
    '####_____zzz_______________####',
    '####_o_____________zzz_____####',
    '####______________________j####',
    '######_########################',
    '######1########################',
    '######_###########_________j###',
    '###y_________y####________C_###',
    '###___________####__________###',
    '###___________####__________###',
    '###_____________2___________###',
    '###___________####______o___###',
    '###_____o____j####_S________###',
    '###___________####y________y###',
    '###############################',
    '###############################'] },
  dunE: { name: '범주의 화염 미궁', theme: 'dungeon', music: 'dungeon', dark: true, npcs: ['g_e1', 'g_e2', 'g_eb'], signs: ['d_e1', 'd_e2'], chests: ['ch_dunE'],
    extra: { fit: 15, edgeWarps: [{ side: 'W', y0: 10, y1: 12, to: 'forest' }], arrive: { forest: [1, 11, 2] } }, rows: [
    '##################################',
    '##################################',
    '##################################',
    '############################____y#',
    '###############y_________###_____#',
    '###############_____o____###_____#',
    '###############___________1______#',
    '####y_______###__________###_____#',
    '####_S______###__zz______###_o___#',
    '####________###__zz______###_____#',
    '____________###__zz____o_#####_###',
    '_____________0___________#####_###',
    '____________###__________#####2###',
    '####_____o__###______zz__#####_###',
    '####________###______zz__#_______#',
    '####_______y###__zz__zz__#_______#',
    '###############__zz__zz__#_______#',
    '###############__________#__S____#',
    '###############_________y#_____C_#',
    '##########################y______#',
    '##################################',
    '##################################'] }
};

function buildExtraMaps() {
  for (const id in EXTRA_ROOMS) {
    const def = EXTRA_ROOMS[id];
    const m = roomFromRows(id, def);
    Object.assign(m, JSON.parse(JSON.stringify(def.extra)));
    MAPS[id] = m;
  }
  // 왕 자리는 융단 위
  const C = MAPS.castle; C.g[3][13] = 'r';

  // ---- 마을: 북문 · 서문 · 남문 열기 ----
  const T = MAPS.town, cx = T.cx, cy = T.cy, W = T.w, H = T.h;
  const road = (x, y) => { if (T.g[y] && T.g[y][x] !== undefined) T.g[y][x] = T.g[y][x] === '~' || T.g[y][x] === 'l' ? 'l' : '='; };
  for (let y = 0; y <= 2; y++) for (let x = cx - 1; x <= cx + 1; x++) road(x, y);
  for (let y = H - 3; y < H; y++) for (let x = cx - 1; x <= cx + 1; x++) road(x, y);
  for (let x = 0; x <= 2; x++) for (let y = cy - 1; y <= cy + 1; y++) road(x, y);
  T.edgeWarps = (T.edgeWarps || []).concat([
    { side: 'N', x0: cx - 1, x1: cx + 1, to: 'castle' },
    { side: 'W', y0: cy - 1, y1: cy + 1, to: 'dunW', need: DUNGEON_INFO.dunW.need },
    { side: 'S', x0: cx - 1, x1: cx + 1, to: 'dunS', need: DUNGEON_INFO.dunS.need }]);
  T.arrive = { castle: [cx, 1, 0], dunW: [1, cy, 2], dunS: [cx, H - 2, 3] };
  T.labels.push({ x: cx, y: 4, text: '▲ 왕성' }, { x: 4, y: cy - 2, text: `◀ ${DUNGEON_INFO.dunW.n}` }, { x: cx + 4, y: H - 3, text: `▼ ${DUNGEON_INFO.dunS.n}` }, { x: W - 7, y: cy - 2, text: '숲 · 화염 미궁 ▶' });
  // ---- 광장 큰 벽보 (3×2) ----
  T.decree = { x: cx - 7, y: cy - 2 };
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) T.g[cy - 2 + j][cx - 7 + i] = 'N';
  T.labels.push({ x: cx - 6, y: cy - 3, text: '📜 오늘의 칙령' });

  // ---- 숲: 동쪽 끝 → 화염 미궁 ----
  const F = MAPS.forest;
  for (let x = 1; x < F.w; x++) for (let y = 16; y <= 17; y++) if ('T.,b'.includes(F.g[y][x])) F.g[y][x] = 's';
  F.edgeWarps = (F.edgeWarps || []).concat([{ side: 'E', y0: 16, y1: 17, to: 'dunE', need: DUNGEON_INFO.dunE.need }]);
  F.arrive = Object.assign(F.arrive || {}, { dunE: [F.w - 2, 16, 1] });
  F.labels = (F.labels || []).concat([{ x: F.w - 5, y: 15, text: `${DUNGEON_INFO.dunE.n} ▶` }]);
}

// -------------------------------------------------------------------------
// 표지판 (기호 석판 · 던전 석판)
// -------------------------------------------------------------------------
Object.assign(LESSONS, {
  sym_1: { t: '기호 석판 Ⅰ · 평균과 퍼짐', ch: 7, x: 'μ (뮤) : 모평균 — 모집단 전체의 평균 (보통 모름)\nx̄ (엑스바) : 표본평균 — 뽑은 표본의 평균\nσ (시그마) : 모표준편차,  σ² : 모분산\ns : 표본표준편차,  s² : 표본분산\nn : 표본 크기 (뽑은 개수)' },
  sym_2: { t: '기호 석판 Ⅱ · 비율과 가설', ch: 8, x: 'p : 모비율,  p̂ (피햇) : 표본비율 = X/n\nμ₀, p₀ : 귀무가설이 주장하는 값 (아래첨자 0)\nH₀ : 귀무가설,  H₁ : 대립가설\nα (알파) : 유의수준 = 제1종 오류 확률\nβ (베타) : 제2종 오류 확률,  1 − β : 검정력' },
  sym_3: { t: '기호 석판 Ⅲ · 분포와 임계값', ch: 8, x: 'Z : 표준정규분포 값 (표준화 점수)\nz(α/2) : 오른쪽 꼬리 넓이가 α/2인 Z값 (95% → 1.96)\nt(α/2, n−1) : 자유도 n−1 t분포의 임계값\nχ² (카이제곱) : 카이제곱 통계량,  df : 자유도\nZ₀, t₀, χ²₀ : 표본으로 계산한 검정통계량' },
  sym_4: { t: '기호 석판 Ⅳ · 계산 기호', ch: 9, x: 'Σ : 모두 더한다,  √ : 제곱근,  ± : 더한 값과 뺀 값\nO : 관측도수,  E : 기대도수 (9장) / 오차한계 (7장)\nr, c : 분할표의 행 수와 열 수,  k : 범주 수\nd̄, s_d : 짝지은 차이의 평균과 표준편차\nsₚ² : 합동분산,  p̄ : 합동비율,  ₁ ₂ : 첫째·둘째 집단' },
  d_w1: { t: '수로 석판 · 추정 3단계', ch: 7, x: '① 무엇을 추정? 평균 μ / 비율 p / 분산 σ²\n② 어떤 분포? σ 앎·대표본 → Z,  σ 모름·소표본 → t(n−1),  분산 → χ²(n−1)\n③ 점추정 ± 임계값 × 표준오차' },
  d_w2: { t: '수로 석판 · 구간을 좁히는 법', ch: 7, x: '구간 폭 = 2 × z(α/2) × σ/√n\nn을 4배 → 폭은 1/2\n신뢰수준을 낮추면 → 임계값이 작아져 폭도 줄어든다\nσ는 우리가 고를 수 없는 값' },
  d_s1: { t: '성채 석판 · 검정 5단계', ch: 8, x: '① H₀, H₁ 세우기\n② 유의수준 α 정하기\n③ 검정통계량 계산 (Z₀, t₀, χ²₀)\n④ 기각역 또는 p값과 비교\n⑤ 결론: 「H₀ 기각」 또는 「기각할 수 없다」' },
  d_s2: { t: '성채 석판 · 기각역의 방향', ch: 8, x: 'H₁: μ ≠ μ₀ → 양측: |Z₀| > z(α/2)\nH₁: μ > μ₀ → 우측: Z₀ > z(α)\nH₁: μ < μ₀ → 좌측: Z₀ < −z(α)\n5% 기준 → 1.96 / 1.645 / −1.645' },
  d_e1: { t: '화염 석판 · 카이제곱 삼형제', ch: 9, x: '적합도: 한 변수 vs 가설 분포 → df = k − 1\n독립성: 한 집단, 두 변수의 관계 → df = (r−1)(c−1)\n동질성: 여러 집단, 한 변수 비율 → df = (r−1)(c−1)' },
  d_e2: { t: '화염 석판 · 기대도수', ch: 9, x: '적합도: E = n × p₀\n분할표: E = (행 합 × 열 합) / 전체\nχ²₀ = Σ (O − E)² / E\nE가 5보다 작은 칸이 많으면 범주를 합친다' }
});

Object.assign(CHESTS, {
  ch_castle: { gold: 25, item: 'potion', note: '왕실 금고의 「잔돈 상자」. 왕은 1골드 단위를 세지 않는다.' },
  ch_dunW: { gold: 45, item: 'clover', note: '물에 젖은 쪽지: 「n을 4배로 하면 폭은 반」.' },
  ch_dunS: { gold: 60, item: 'badge', note: '기사의 유품. 「1 − β」라고 새겨져 있다.' },
  ch_dunE: { gold: 80, item: 'cookie', note: '불에 그을린 상자. 안은 이상하게 시원하다.' }
});

QUESTS.s_dungeon = { t: '세 던전의 수호자', type: '서브', giver: '국왕 스토카스 3세', steps: ['북쪽 왕성의 국왕을 알현한다', '서·남·동 던전의 수호자를 모두 쓰러뜨린다', '국왕에게 보고한다'] };
ACHS.dungeon = ['세 방위의 정복자', '서·남·동 던전을 모두 돌파했다'];
ACHS.decree = ['칙령 애독자', '광장 벽보의 칙령 시험을 통과했다'];
ACHS.bonk = ['철푸덕', '골목에서 누군가와 정면으로 부딪혔다'];

function dunCleared() { return ['dunW', 'dunS', 'dunE'].filter(d => flag('clear_' + d)); }

// -------------------------------------------------------------------------
// 왕성 사람들
// -------------------------------------------------------------------------
Object.assign(NPCS, {
  stokas: { n: '스토카스 3세', title: '벨레스타 국왕', map: 'castle', look: L({ hair: '#e8e2d2', cloth: '#7a2a3a', type: 'robe', hat: 'crown', beard: '#e8e2d2', skin: SKIN[1], eye: '#3b2a1a', accent: '#ffd84d' }), mood: 'smile', aff: 0,
    intro: '금빛 융단 끝, 왕좌 앞에 선 젊은 왕이 주사위 모양 홀을 짚고 있다. 「오오, 이방인인가. 그대에게서 표본의 냄새가 나는군.」',
    again: ['「왕국의 동서남, 세 던전에 결계가 걸려 있다. 지식이 곧 열쇠지.」', '국왕이 홀을 굴린다. 6이 나왔다. 「짐은 매일 아침 이걸로 정사를 정하네. 농담일세. 반쯤은.」'],
    topic: '왕은 평균을 다스리지 않네. 분산을 다스리지. 백성들이 너무 멀리 흩어지지 않도록.',
    acts: [
      { t: '세 던전 정복을 보고한다', req: S => dunCleared().length === 3 && !flag('once_king_report'), once: 'king_report', ok: '세 수호자의 증표를 내밀자 국왕이 왕좌에서 일어난다. 「서쪽의 추정, 남쪽의 검정, 동쪽의 범주… 그대가 모두 정리했군!」 궁정 악사들이 1.96박자로 팡파르를 분다.', okFx: { gold: 150, focus: 3, item: 'cookie', questDone: 's_dungeon', ach: 'dungeon', aff: 3 } },
      { t: '세 던전에 대해 묻는다', ok: S => { const c = Object.keys(S.read).length; return `「잘 듣게. 서쪽 성문 밖은 「${DUNGEON_INFO.dunW.n}」, 표지판 ${DUNGEON_INFO.dunW.need}개. 남쪽 성문 밖은 「${DUNGEON_INFO.dunS.n}」, ${DUNGEON_INFO.dunS.need}개. 동쪽 숲 끝은 「${DUNGEON_INFO.dunE.n}」, ${DUNGEON_INFO.dunE.need}개. 결계는 읽은 표지판의 수만 센다네.」\n\n📖 지금까지 읽은 표지판: <b>${c}개</b>\n\n「각 던전 끝의 수호자를 쓰러뜨리고 오게. 상을 내리지.」`; }, okFx: { quest: ['s_dungeon', 0] } },
      { t: '왕의 시험을 청한다 (3문제 중 2개)', tag: '📝 시험 · 보상 50G', once: 'king_trial', go: n => bossTrial('stokas', 0, 3, 2, { gold: 50, item: 'potion', aff: 2, flag: 'once_king_trial' }, '「훌륭하다! 짐의 왕국에 그대 같은 표본이 n명만 더 있으면…」', '「흠. 아직 자유도가 부족하군. 다시 오게.」') },
      LEAVE] },
  aegis: { n: '아이기스', title: '근위대장', map: 'castle', look: L({ hair: '#c08a3a', cloth: '#2f4a7a', type: 'armor', hat: 'helmet', accent: '#2f7ae0', hairStyle: 'long', skin: SKIN[0], eye: '#2a4a8a' }), mood: 'neutral', aff: 0,
    intro: '푸른 갑옷의 기사가 창을 세우고 서 있다. 「멈춰라. …아, 표본이었나. 지나가도 좋다.」',
    again: ['「던전 수호자들은 칼로는 안 쓰러진다. 문제로 쓰러뜨려야 해.」', '아이기스가 투구를 벗고 땀을 닦는다. 「오늘 근무는 신뢰구간 95%로 무사하다.」'],
    topic: '방패는 분산을 줄이는 도구다. 맞을 확률은 같아도, 크게 다칠 확률이 줄지.',
    acts: [
      { t: '던전 공략법을 묻는다', ok: '「통로를 막은 수호자에게 말을 걸어 문제를 풀어라. 맞히면 길을 비킨다. 틀리면 한 대 맞는다. 끝방의 우두머리는 세 문제 중 두 개를 맞혀야 해. 막히면 「공식」이라고 입력해 보고.」', okFx: { aff: 1 } },
      { t: '목검으로 대련한다', s: '힘', dc: 12, ok: '팽팽한 접전 끝에 아이기스의 목검이 날아갔다. 「…훌륭하군.」 근위대 비상 물약을 하나 건넨다.', fail: '세 합 만에 엉덩방아. 「다리에 힘이 없다. 표본이 작아.」', okFx: { item: 'potion', aff: 1 }, failFx: { hp: -2 } },
      { t: '검정 문제로 대련한다', quiz: { ch: 8, okFx: { gold: 12, aff: 1 }, failFx: { hp: -1 }, okText: '「정확하다. 기사단에 들어올 생각 없나?」', failText: '「유의수준을 다시 생각해 봐라.」' } },
      LEAVE] },
  sigma: { n: '시그마', title: '왕실 서기 · 기호 담당', map: 'castle', look: L({ hair: '#4a2f55', cloth: '#3d6a5a', type: 'robe', glasses: true, hairStyle: 'bob', eye: '#2a5a4a' }), mood: 'smile', aff: 0,
    intro: '잉크 묻은 손가락의 서기가 두루마리 더미 사이에서 고개를 든다. 「기호가 헷갈리세요? 그게 제 일이에요. 기호 정리.」',
    again: ['「x̄는 엑스바, p̂는 피햇. 모자 쓴 건 다 표본에서 나온 값이에요.」', '「아래첨자 0이 붙으면 「가설이 주장하는 값」이에요. μ₀, p₀, σ₀.」'],
    topic: '그리스 문자는 모집단, 로마 문자는 표본. 이것만 알아도 반은 읽혀요.',
    acts: [
      { t: '헷갈리는 기호를 물어본다', ok: () => { const pick = SYM_LIST.slice().sort(() => Math.random() - .5).slice(0, 4); return '「오늘은 이것들을 정리해 드릴게요.」\n\n' + pick.map(s => `<b>${esc(s[0])}</b> — ${esc(s[1])}: ${esc(s[2])}`).join('\n') + '\n\n「알현실 벽의 기호 석판 네 개에 전부 적어 뒀어요. 그리고 수식 속 기호는 눌러 보면 뜻이 나와요!」'; }, okFx: { aff: 1 } },
      { t: '추정 문제를 받는다', quiz: { ch: 7, okFx: { gold: 10, aff: 1 }, failFx: {}, okText: '「완벽해요. 기호를 정확히 읽으셨네요.」', failText: '「σ랑 s를 바꿔 쓰셨나 봐요. 흔한 실수예요.」' } },
      LEAVE] },
  vivian: { n: '비비안', title: '셋째 왕녀', map: 'castle', wander: 2, look: L({ hair: '#ffcf6a', cloth: '#ff8fb3', type: 'dress', hairStyle: 'long', hat: 'crown', eye: '#7a3ab3' }), mood: 'happy', aff: 0,
    intro: '작은 왕관이 비뚤어진 왕녀가 뛰어온다. 「모험가다! 수수께끼 낼게! 맞히면 사탕!」',
    again: ['「아바마마는 맨날 분산 얘기만 해. 지루해.」', '「나 어제 주사위 100번 던졌다? 6이 17번! 기대도수랑 거의 같지?」'],
    topic: '공주는 확률 1/3로 장난, 1/3로 공부, 1/3로 낮잠이야.',
    acts: [
      { t: '공주의 수수께끼를 푼다', quiz: { ch: 0, okFx: { gold: 8, aff: 2, status: { 고양: 3 } }, failFx: { aff: -1 }, okText: '「우와 맞혔어! 사탕 대신 금화! 사탕은 내가 먹었어!」', failText: '「땡! 메롱!」' } },
      { t: '숨바꼭질을 해 준다', s: '민첩', dc: 11, ok: '커튼 뒤, 갑옷 속, 왕좌 밑. 세 번째에 찾았다. 왕녀가 깔깔 웃는다.', fail: '한 시간을 찾았는데 왕녀는 처음부터 당신 뒤에 서 있었다.', okFx: { aff: 2 }, failFx: { status: { 피로: 2 } } },
      LEAVE] }
});

// -------------------------------------------------------------------------
// 던전 수호자 (문제를 맞혀야 길을 비킨다)
// -------------------------------------------------------------------------
function guardian(id, dun, o) {
  NPCS[id] = { n: o.n, title: o.title, map: dun, look: o.look, mood: 'angry', aff: 0, big: !!o.big, guard: { dun, ch: DUNGEON_INFO[dun].ch, boss: !!o.boss, okText: o.okText, failText: o.failText, reward: o.reward, dmg: o.dmg || 2 },
    intro: o.intro, again: o.again || [o.intro], topic: o.topic || '…문제를 풀어라. 그것이 이 던전의 법이다.',
    acts: o.boss ? [
      { t: '결투를 신청한다 (3문제 중 2개)', tag: `📝 ${DUNGEON_INFO[dun].ch}장 · 오답마다 HP−${o.dmg || 3}`, go: () => bossTrial(id, DUNGEON_INFO[dun].ch, 3, 2, Object.assign({ flag: 'g_' + id }, o.reward), o.okText, { hp: -(o.dmg || 3) }, o.failText, true) },
      { t: '약점을 살핀다', s: '지능', dc: 13, ok: o.weak, fail: '눈이 마주쳤다. 등골이 서늘하다.', okFx: { focus: 1 }, failFx: { status: { 혼란: 1 } } },
      LEAVE] : [
      { t: '문제에 도전한다', tag: `📝 ${DUNGEON_INFO[dun].ch}장 · 오답 시 HP−${o.dmg || 2}`, go: () => guardQuiz(id) },
      { t: '말로 구슬린다', tag: '설득 15 · 성공 시 통과', go: () => guardTalk(id) },
      LEAVE] };
  NPCS[id].id = id;
}
function removeActor(id) { const i = ACTORS.findIndex(a => a.id === id); if (i >= 0) ACTORS.splice(i, 1); }
function dungeonProgressFx() {
  const out = [], c = dunCleared().length;
  if (c >= 1) { const l = setQ('s_dungeon', 1); if (l) out.push(l); }
  if (c === 3) { const l = setQ('s_dungeon', 2); if (l) out.push(l); out.push('👑 세 던전 돌파! 북쪽 왕성의 국왕에게 보고하자.'); }
  return out;
}
function guardPass(id, txt, extraFx) {
  const n = NPCS[id], gd = n.guard;
  setFlag('g_' + id); removeActor(id);
  const fx = applyFx(Object.assign({ gold: 10 }, extraFx || {}), null);
  AudioSys.sfx('ok');
  const t = npcTurn(id, txt); t.fx = fx; t.mood = 'happy';
  t.choices = [{ t: '지나간다', run: () => null }];
  floatText('통과!', '#7dff9b');
  return t;
}
function guardQuiz(id) {
  const n = NPCS[id], gd = n.guard;
  return quizTurn({ who: id, ch: gd.ch, head: `${n.n}이(가) 길을 막고 문제를 낸다.`, after: (ok, q) => {
    if (ok) return guardPass(id, `⭕ 정답. ${gd.okText}\n<span class="ex">해설: ${esc(q.ex)}</span>`);
    const t = npcTurn(id, `❌ 오답. ${gd.failText}`); t.fx = applyFx({ hp: -gd.dmg }); t.mood = 'angry'; return t;
  } });
}
function guardTalk(id) {
  const n = NPCS[id], r = check('설득', 15);
  if (r.ok) return Object.assign(guardPass(id, `${n.n}이(가) 잠시 머뭇거리더니 길을 비킨다. 「…이번만이다.」`, { gold: 4 }), { roll: r.line });
  const t = npcTurn(id, `${n.n}이(가) 코웃음 친다. 「말 말고 답을 내놔라.」`); t.roll = r.line; t.fx = applyFx({ hp: -1 }); return t;
}
// 보스·왕의 시험: n문제 중 need개
function bossTrial(id, ch, n, need, okFx, okText, failFx, failText, isBoss, onDone) {
  const npc = NPCS[id];
  let i = 0, right = 0;
  const next = () => quizTurn({ who: id, ch, head: `⚔ ${npc.n}의 시험 · ${i + 1}/${n} (필요 정답 ${need}) · 지금 ${right}개`, after: (ok, q) => {
    i++; if (ok) right++;
    const fb = `<span class="ex">${ok ? '⭕ 정답' : '❌ 오답'} · 해설: ${esc(q.ex)}</span>`;
    let hurt = [];
    if (!ok && isBoss) { hurt = applyFx(failFx); shake(6); }
    if (S.hp <= 0) return null;
    if (i < n && right + (n - i) >= need && right < need) { const t = next(); t.desc = fb + '\n\n' + t.desc; if (hurt.length) t.fx = hurt; return t; }
    const pass = right >= need;
    if (onDone) onDone(pass);
    let fx = hurt;
    if (pass) {
      fx = fx.concat(applyFx(okFx, id));
      if (isBoss) { setFlag('clear_' + npc.guard.dun); removeActor(id); fx = fx.concat(dungeonProgressFx()); AudioSys.sfx('level'); banner(`${DUNGEON_INFO[npc.guard.dun].n} 돌파!`); }
    } else if (!isBoss) fx = fx.concat(applyFx(failFx, id));
    const t = npcTurn(id, `${fb}\n\n${pass ? okText : failText}`); t.fx = fx; t.mood = pass ? 'happy' : 'angry';
    if (pass && isBoss) t.choices = [{ t: '안쪽 보물방으로 간다', run: () => null }];
    return t;
  } });
  return next();
}
const SK = SKIN;
guardian('g_w1', 'dunW', { n: '드롭', title: '물방울 슬라임 · 1번 수문', look: { kind: 'slime', cloth: '#5ab8ff' }, intro: '통로 한가운데 푸른 슬라임이 출렁인다. 「뽀글. 표본평균을 대라. 뽀글.」', okText: '「뽀글… 정확해.」 슬라임이 물웅덩이로 스며든다.', failText: '슬라임이 물을 뿜는다. 차갑다.' });
guardian('g_w2', 'dunW', { n: '에스트', title: '수로 골렘 · 2번 수문', look: { kind: 'golem' }, intro: '이끼 낀 골렘이 좁은 통로를 꽉 채우고 있다. 「추.정.하.라.」', okText: '골렘이 무릎을 꿇고 돌무더기가 된다. 「구.간.확.인.」', failText: '골렘의 돌주먹이 바닥을 친다. 쿵!', dmg: 3 });
guardian('g_wb', 'dunW', { n: '엔', title: '표본의 망령 · 수로의 주인', boss: true, look: { kind: 'ghost' }, intro: '보물 굴 앞, 반투명한 망령이 떠 있다. 「나는 너무 작은 표본으로 결론을 낸 자들의 원한… n이 작으면 구간이 넓어진다는 걸 왜 몰랐을까…」', weak: '망령의 몸에 「n = 3」이라고 쓰여 있다. 표본이 작을수록 t분포를 써야 한다는 걸 떠올렸다.', okText: '「…그래, n을 키웠어야 했어.」 망령이 물안개처럼 흩어지고 보물 굴이 열린다.', failText: '「너도 나처럼 성급하구나…」', reward: { gold: 40, item: 'potion', focus: 1 } });
guardian('g_s1', 'dunS', { n: '널', title: '해골 보초', look: L({ hair: '#efe6cf', cloth: '#5a5a6a', type: 'armor', hat: 'helmet', hairStyle: 'bald', skin: '#efe6cf', eye: '#ff3b3b', blush: false, mouth: '#2a2a2a' }), intro: '녹슨 갑옷의 해골이 창을 엇갈려 세운다. 「귀무가설에 따르면 너는 통과할 수 없다. 반박해 봐라.」', okText: '「…기각되었다.」 해골이 와르르 무너진다.', failText: '창대가 정강이를 때린다.' });
guardian('g_s2', 'dunS', { n: '피발류', title: 'p값 슬라임', look: { kind: 'slime', cloth: '#b07cff' }, intro: '보라색 슬라임이 숫자를 흘린다. 「0.049… 0.051… 나는 어느 쪽일까?」', okText: '「유의했구나!」 슬라임이 기뻐서 터진다. 퐁!', failText: '슬라임이 끈적하게 달라붙는다.', dmg: 3 });
guardian('g_sb', 'dunS', { n: '리젝트 경', title: '기각의 기사 · 폐성채의 주인', boss: true, big: false, look: L({ hair: '#222', cloth: '#3a3a4a', type: 'armor', hat: 'helmet', accent: '#d6283c', skin: SK[2], eye: '#d6283c', scar: true }), intro: '붉은 깃털의 흑기사가 대검을 바닥에 꽂는다. 「나는 백 개의 가설을 기각했다. 너의 실력도 기각해 주마.」', weak: '방패에 「α = 0.05」가 새겨져 있다. 양측이면 1.96, 단측이면 1.645.', okText: '「…H₀ 기각. 내가 졌다.」 흑기사가 무릎을 꿇고 보물방의 문을 연다.', failText: '「증거가 부족하다!」', reward: { gold: 55, item: 'potion', focus: 1 } });
guardian('g_e1', 'dunE', { n: '이그니', title: '불꽃 슬라임', look: { kind: 'slime', cloth: '#ff7a2a' }, intro: '이글거리는 슬라임이 통로를 막는다. 「관측도수와 기대도수가 다르면 나는 더 뜨거워진다!」', okText: '슬라임이 피식 꺼진다. 연기만 남았다.', failText: '앗 뜨거! 소매가 그을렸다.', dmg: 3 });
guardian('g_e2', 'dunE', { n: '분할표 미믹', title: '수상한 상자 · 3×3칸', look: { kind: 'mimic' }, intro: '격자 무늬 상자가 입을 쩍 벌린다. 「내 칸을 채워 봐! 행 합 × 열 합 ÷ 전체!」', okText: '미믹이 입을 다물고 얌전히 옆으로 비킨다. 「…잘 세네.」', failText: '미믹이 손가락을 깨문다!', dmg: 3 });
guardian('g_eb', 'dunE', { n: '카이 드레이크', title: '범주의 화염룡 · 미궁의 주인', boss: true, big: true, look: { kind: 'boss' }, intro: '용암 위로 거대한 그림자가 몸을 일으킨다. 「Σ (O − E)² / E… 너의 오차를 모두 더해 불태워 주마!」', weak: '비늘 사이에 「df = (r−1)(c−1)」이 빛난다. 자유도를 먼저 세는 게 열쇠다.', okText: '「크르르… 관측이 기대와 맞는구나…」 드레이크가 잿더미 속으로 잠든다.', failText: '불길이 덮친다!', reward: { gold: 70, item: 'potion', focus: 2 }, dmg: 4 });

// -------------------------------------------------------------------------
// 퀴즈 추가 (각 장 5문제)
// -------------------------------------------------------------------------
QUIZ.push(
  { id: 'q7m', ch: 7, q: 'n = 25, x̄ = 80, s = 10 (σ 모름). 모평균 95% 신뢰구간의 오차한계는? (t(0.025, 24) = 2.064)', a: '약 4.13', w: ['약 3.92', '약 2.06'], num: 4.128, tol: 0.02, ex: '2.064 × 10/√25 = 2.064 × 2 = 4.128' },
  { id: 'q7n', ch: 7, q: 'σ = 6일 때 95% 신뢰구간의 오차한계를 1 이하로 만들려면 표본은 최소 몇 개?', a: '139', w: ['138', '118'], num: 139, tol: 0.5, ex: 'n ≥ (1.96 × 6 / 1)² = 11.76² = 138.3 → 올림해서 139' },
  { id: 'q7o', ch: 7, q: '표본평균 x̄는 모평균 μ의 어떤 추정량인가?', a: '불편추정량', w: ['편향된 추정량', '구간추정량'], ex: 'E(x̄) = μ 이므로 평균적으로 정확히 맞힌다 → 불편추정량' },
  { id: 'q7p', ch: 7, q: 'x̄ = 172, σ = 5, n = 100. 모평균 90% 신뢰구간의 하한은? (z = 1.645)', a: '약 171.18', w: ['약 171.02', '약 170.36'], num: 171.18, tol: 0.02, ex: 'σ/√n = 0.5 → 172 − 1.645 × 0.5 = 171.1775' },
  { id: 'q7q', ch: 7, q: '표본분산 s²를 구할 때 n이 아니라 n − 1로 나누는 이유는?', a: 's²가 σ²의 불편추정량이 되도록', w: ['계산을 쉽게 하려고', '표본이 작을 때만 쓰는 관례라서'], ex: 'n으로 나누면 σ²를 평균적으로 작게 추정한다. n − 1로 나눠야 E(s²) = σ²' },
  { id: 'q8m', ch: 8, q: 'H₀: μ = 50, H₁: μ ≠ 50, 검정통계량 Z₀ = 2.3, α = 0.05. 결론은?', a: 'H₀ 기각', w: ['H₀ 채택', '판단할 수 없다'], ex: '양측 5% 기각역 |Z₀| > 1.96. 2.3 > 1.96 → 기각' },
  { id: 'q8n', ch: 8, q: 'n = 16, x̄ = 52, s = 4, H₀: μ = 50 일 때 t 검정통계량은?', a: '2', w: ['0.5', '8'], num: 2, tol: 0.01, ex: 't₀ = (52 − 50) / (4/√16) = 2 / 1 = 2' },
  { id: 'q8o', ch: 8, q: '표본 크기는 그대로 두고 유의수준 α를 0.05에서 0.01로 낮추면 제2종 오류 β는?', a: '커진다', w: ['작아진다', '변하지 않는다'], ex: '기각을 더 어렵게 만드니 H₀가 거짓이어도 놓치기 쉬워진다 → β 증가' },
  { id: 'q8p', ch: 8, q: '우측검정, α = 0.05, Z₀ = 1.7 이면?', a: 'H₀ 기각 (1.7 > 1.645)', w: ['H₀ 채택 (1.7 < 1.96)', '양측검정으로 바꿔야 한다'], ex: '우측 5% 임계값은 1.645. 1.7 > 1.645 → 기각' },
  { id: 'q8q', ch: 8, q: 'p값이 0.003이다. α = 0.01에서 결론은?', a: 'H₀ 기각', w: ['H₀ 채택', 'α를 0.001로 바꿔야 한다'], ex: 'p값 0.003 < α 0.01 → 기각' },
  { id: 'q9l', ch: 9, q: '주사위가 공정한지 적합도 검정. 범주(눈) 6개일 때 자유도는?', a: '5', w: ['6', '36'], num: 5, tol: 0.01, ex: '적합도 자유도 = k − 1 = 6 − 1 = 5' },
  { id: 'q9m', ch: 9, q: '2 × 4 분할표의 독립성 검정 자유도는?', a: '3', w: ['8', '6'], num: 3, tol: 0.01, ex: '(2 − 1)(4 − 1) = 1 × 3 = 3' },
  { id: 'q9n', ch: 9, q: '관측도수 O = 30, 기대도수 E = 25인 칸의 (O − E)²/E 값은?', a: '1', w: ['0.2', '5'], num: 1, tol: 0.01, ex: '(30 − 25)²/25 = 25/25 = 1' },
  { id: 'q9o', ch: 9, q: 'χ²₀ = 3.2, 자유도 2의 χ²(0.05) = 5.99. 결론은?', a: 'H₀ 채택 (기각 못함)', w: ['H₀ 기각', '자유도를 늘려야 한다'], ex: '3.2 < 5.99 → 기각역에 못 들어감 → 기각할 수 없다' },
  { id: 'q9p', ch: 9, q: '행 합 50, 열 합 40, 전체 200인 칸의 기대도수는?', a: '10', w: ['20', '2000'], num: 10, tol: 0.01, ex: 'E = 50 × 40 / 200 = 10' }
);
Object.assign(QUIZ_HELP, {
  q7m: { f: 'E = t(α/2, n−1) × s/√n', s: ['σ를 모르고 n = 25 → t분포, 자유도 24', 's/√n = 10/5 = 2', 'E = 2.064 × 2 = 4.128'] },
  q7n: { f: 'n ≥ ( z(α/2) × σ / E )²', s: ['z = 1.96, σ = 6, E = 1', '1.96 × 6 = 11.76', '11.76² = 138.3 → 사람 수는 올림 → 139'] },
  q7o: { f: 'E(x̄) = μ  → 불편', s: ['추정량의 기댓값이 모수와 같으면 불편추정량', '표본평균의 기댓값은 모평균'] },
  q7p: { f: '하한 = x̄ − z(α/2) × σ/√n', s: ['90% → z = 1.645', 'σ/√n = 5/10 = 0.5', '172 − 0.8225 = 171.18'] },
  q7q: { f: 's² = Σ(x − x̄)² / (n − 1)', s: ['x̄가 표본에 맞춰져 있어 편차 제곱합이 조금 작게 나온다', 'n − 1로 나눠 보정하면 E(s²) = σ²'] },
  q8m: { f: '양측: |Z₀| > z(α/2) 이면 기각', s: ['α = 0.05 양측 → 1.96', '|2.3| = 2.3 > 1.96', 'H₀ 기각'] },
  q8n: { f: 't₀ = (x̄ − μ₀) / (s/√n)', s: ['x̄ − μ₀ = 2', 's/√n = 4/4 = 1', 't₀ = 2'] },
  q8o: { f: 'α ↓ ⇒ β ↑ (n 고정)', s: ['α를 줄이면 기각역이 좁아진다', '그만큼 틀린 H₀를 놓칠 확률 β가 커진다'] },
  q8p: { f: '우측: Z₀ > z(α) 이면 기각', s: ['α = 0.05 우측 → z = 1.645', '1.7 > 1.645 → 기각'] },
  q8q: { f: 'p값 < α ⇒ 기각', s: ['0.003 < 0.01', 'H₀ 기각'] },
  q9l: { f: '적합도 df = k − 1', s: ['범주 k = 6', '6 − 1 = 5'] },
  q9m: { f: '분할표 df = (r − 1)(c − 1)', s: ['r = 2, c = 4', '1 × 3 = 3'] },
  q9n: { f: '(O − E)² / E', s: ['O − E = 5', '5² = 25', '25 / 25 = 1'] },
  q9o: { f: 'χ²₀ > χ²(α, df) 이면 기각', s: ['3.2와 5.99 비교', '3.2 < 5.99 → 기각 못함'] },
  q9p: { f: 'E = 행 합 × 열 합 / 전체', s: ['50 × 40 = 2000', '2000 / 200 = 10'] }
});

// -------------------------------------------------------------------------
// 수식 기호 풀이 (공식 상자 안의 기호를 누르면 뜻이 나오고, 아래에 기호표가 붙음)
// -------------------------------------------------------------------------
const SYM_LIST = [
  ['x̄₁', '엑스바 원', '첫째 집단의 표본평균'], ['x̄₂', '엑스바 투', '둘째 집단의 표본평균'], ['x̄', '엑스바', '표본평균 — 뽑은 표본의 평균'],
  ['p̂₁', '피햇 원', '첫째 집단의 표본비율'], ['p̂₂', '피햇 투', '둘째 집단의 표본비율'], ['p̂', '피햇', '표본비율 = 성공 수 X ÷ 표본 크기 n'], ['p̄', '피바', '합동비율 — 두 표본을 합쳐 구한 비율'],
  ['p₀', '피 제로', '귀무가설이 주장하는 모비율 값'], ['μ₀', '뮤 제로', '귀무가설이 주장하는 모평균 값'], ['μ', '뮤', '모평균 — 모집단 전체의 진짜 평균'],
  ['σ₀²', '시그마 제로 제곱', '귀무가설이 주장하는 모분산'], ['σ₁²', '시그마 원 제곱', '첫째 모집단의 분산'], ['σ₂²', '시그마 투 제곱', '둘째 모집단의 분산'], ['σ²', '시그마 제곱', '모분산'], ['σ', '시그마', '모표준편차 — 모집단의 퍼짐'],
  ['sₚ²', '에스피 제곱', '합동분산 — 두 표본 분산을 합쳐 낸 값'], ['s_d', '에스디', '짝지은 차이 d의 표준편차'], ['s²', '에스 제곱', '표본분산'], ['s', '에스', '표본표준편차'],
  ['d̄', '디바', '짝지은 차이(전 − 후)의 평균'], ['χ²₀', '카이제곱 제로', '표본으로 계산한 카이제곱 검정통계량'], ['χ²', '카이제곱', '카이제곱 값 — 관측과 기대의 어긋남'],
  ['Z₀', '제트 제로', '표본으로 계산한 Z 검정통계량'], ['t₀', '티 제로', '표본으로 계산한 t 검정통계량'], ['z(α/2)', '제트 알파 반', '오른쪽 꼬리 넓이가 α/2인 Z값 (95% → 1.96)'],
  ['H₀', '에이치 제로', '귀무가설 — 「차이 없다」는 기본 주장'], ['H₁', '에이치 원', '대립가설 — 보이고 싶은 주장'],
  ['α/2', '알파 반', '양쪽 꼬리에 나눠 둔 유의수준의 절반'], ['α', '알파', '유의수준 = 제1종 오류 확률'], ['β', '베타', '제2종 오류 확률 (1 − β = 검정력)'],
  ['n₁', '엔 원', '첫째 표본의 크기'], ['n₂', '엔 투', '둘째 표본의 크기'], ['df', '디에프', '자유도'], ['Σ', '시그마(합)', '뒤에 오는 것을 모두 더한다'],
  ['√', '루트', '제곱근'], ['±', '플러스마이너스', '더한 값과 뺀 값 두 개 → 구간의 양 끝'],
  ['n', '엔', '표본 크기 (뽑은 개수)'], ['Z', '제트', '표준정규분포를 따르는 값'], ['t', '티', 't분포 값 (σ 모를 때)'], ['E', '이', '9장: 기대도수 / 7장: 오차한계'], ['O', '오', '관측도수 — 실제로 센 수'],
  ['k', '케이', '범주의 개수'], ['r', '알', '분할표의 행 수'], ['c', '씨', '분할표의 열 수'], ['X', '엑스', '성공 횟수 (또는 확률변수)'], ['p', '피', '모비율']
];
const SYM_BY = {};
SYM_LIST.forEach((s, i) => { const id = 'sym' + i; SYM_BY[s[0]] = id; GLOSS_BY[id] = { t: `${s[0]}  (${s[1]})`, d: s[2], e: '수식 속에서 이 기호가 나오면 이 뜻이에요.' }; });
const SYM_RE = (() => {
  const esc2 = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keys = SYM_LIST.map(s => s[0]).sort((a, b) => b.length - a.length).map(esc2);
  return new RegExp('(?<![A-Za-z가-힣])(' + keys.join('|') + ')(?![A-Za-z])', 'g');
})();
function symbolize(root) {
  if (!root) return;
  root.querySelectorAll('.lesson, .fhint, .quiz, .sol, .decree-f').forEach(box => {
    if (box.dataset.sym) return; box.dataset.sym = '1';
    const found = [];
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) { const nd = walker.currentNode; if (nd.parentElement && nd.parentElement.closest('.term, .qch, .symleg')) continue; nodes.push(nd); }
    nodes.forEach(node => {
      const txt = node.nodeValue; SYM_RE.lastIndex = 0;
      let m, last = 0, frag = null;
      while ((m = SYM_RE.exec(txt))) {
        // 한 글자 로마자(n, t, E, O, k, r, c, X, p, s, Z)는 수식 기호처럼 보일 때만
        if (m[1].length === 1 && /[A-Za-z]/.test(m[1])) {
          const prev = txt[m.index - 1] || ' ', nxt = txt[m.index + 1] || ' ';
          if (!/[\s(=±×/√−+,·|<>²]/.test(prev) && m.index > 0) continue;
          if (!/[\s)=±×/−+,·²₀₁₂(|<>:]/.test(nxt)) continue;
        }
        frag = frag || document.createDocumentFragment();
        frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
        const sp = document.createElement('span'); sp.className = 'term sym'; sp.dataset.g = SYM_BY[m[1]]; sp.textContent = m[1]; frag.appendChild(sp);
        if (!found.includes(m[1])) found.push(m[1]);
        last = m.index + m[1].length;
      }
      if (frag) { frag.appendChild(document.createTextNode(txt.slice(last))); node.parentNode.replaceChild(frag, node); }
    });
    if (found.length && !box.classList.contains('quiz')) {
      const leg = document.createElement('div'); leg.className = 'symleg';
      leg.innerHTML = '<b>🔣 기호 풀이</b> ' + found.map(k => { const s = SYM_LIST.find(x => x[0] === k); return `<span><i>${esc(k)}</i> ${esc(s[2].split(' — ')[0].split(' (')[0])}</span>`; }).join('');
      box.after(leg);
    }
  });
}

// -------------------------------------------------------------------------
// 📜 광장의 큰 벽보 — 오늘의 칙령 (현실 날짜 기준으로 매일 바뀜)
// -------------------------------------------------------------------------
const DECREES = [
  { n: '성배의 구간 주문', ch: 7, f: 'x̄ ± z(α/2) · σ/√n', lore: '성배 기사단이 진짜 평균 μ를 포위할 때 외는 주문. 그물(구간)을 넓게 던질수록 놓치지 않으나, 너무 넓으면 아무것도 말하지 못한다.' },
  { n: '그림자 기사의 t 맹세', ch: 7, f: 'x̄ ± t(α/2, n−1) · s/√n', lore: 'σ를 모르는 기사는 s를 방패 삼고, 꼬리가 두꺼운 t의 검을 든다. 동료(n)가 적을수록 검은 더 무겁다.' },
  { n: '민심 측정의 비술', ch: 7, f: 'p̂ ± z(α/2) · √( p̂(1 − p̂) / n )', lore: '왕실 점성술사가 백성 n명에게 물어 민심 p를 가늠하는 비술. 「오차범위 ±3%p」는 이 주문의 끝자락이다.' },
  { n: '징병관의 산법', ch: 7, f: 'n ≥ ( z(α/2) · σ / E )²', lore: '원하는 오차 E 안에 들기 위해 몇 명을 불러야 하는가. 소수점이 나오면 반드시 올림하라. 반 명의 병사는 없다.' },
  { n: '쌍둥이 왕국 비교술', ch: 7, f: '(x̄₁ − x̄₂) ± z · √( σ₁²/n₁ + σ₂²/n₂ )', lore: '두 왕국의 평균을 비교할 때는 차를 빼되, 흔들림(분산)은 더한다. 차이는 줄어도 불확실함은 쌓인다.' },
  { n: '분산 봉인진', ch: 7, f: '(n−1)s²/χ²(α/2) ≤ σ² ≤ (n−1)s²/χ²(1−α/2)', lore: '대분산을 가두는 봉인진. 카이제곱의 좌우 기둥 사이에 σ²를 가둔다. 좌우가 대칭이 아님에 주의.' },
  { n: '왕립 재판의 Z 판결문', ch: 8, f: 'Z₀ = (x̄ − μ₀) / (σ/√n)', lore: '피고 μ₀는 무죄로 추정된다. 증거 x̄가 표준오차 몇 개만큼 떨어졌는지가 판결을 가른다.' },
  { n: '소수 배심원의 t 판결문', ch: 8, f: 't₀ = (x̄ − μ₀) / (s/√n),  df = n − 1', lore: '배심원이 30명이 안 되면 t의 법정에서 재판한다. 자유도는 배심원 수에서 하나를 뺀다.' },
  { n: '세금 비율 감찰령', ch: 8, f: 'Z₀ = (p̂ − p₀) / √( p₀(1 − p₀) / n )', lore: '감찰관은 가설의 비율 p₀를 분모에 쓴다. 「H₀가 참이라면?」에서 모든 재판이 시작되기 때문이다.' },
  { n: '두 길드 분쟁 조정법', ch: 8, f: 'p̄ = (X₁ + X₂) / (n₁ + n₂)', lore: '두 길드의 비율이 같다고 가정하면 장부를 합쳐 하나의 비율 p̄를 쓴다. 이것을 합동비율이라 한다.' },
  { n: '대장간의 합동 담금질', ch: 8, f: 'sₚ² = [ (n₁−1)s₁² + (n₂−1)s₂² ] / (n₁ + n₂ − 2)', lore: '두 쇳물의 퍼짐이 같다고 보면 섞어서 한 번에 담금질한다. 자유도는 둘을 합치고 둘을 뺀다.' },
  { n: '짝지은 결투의 규칙', ch: 8, f: 't₀ = d̄ / (s_d / √n)', lore: '같은 기사를 두 번 재면 그 차이 d만 본다. 전과 후, 둘이 아니라 하나의 표본이다.' },
  { n: '오판의 두 저주', ch: 8, f: 'α = P(기각 | H₀ 참),  β = P(채택 | H₀ 거짓),  검정력 = 1 − β', lore: '무고한 자를 벌하는 저주 α, 죄인을 놓치는 저주 β. 하나를 줄이면 다른 하나가 자란다. 둘 다 줄이려면 n을 늘려라.' },
  { n: '기각역 방위표', ch: 8, f: '양측 |Z₀| > 1.96  ·  우측 Z₀ > 1.645  ·  좌측 Z₀ < −1.645', lore: '성문의 방향은 대립가설 H₁의 부등호가 정한다. ≠이면 양쪽 성문을 모두 지킨다.' },
  { n: '화룡의 숨결 공식', ch: 9, f: 'χ²₀ = Σ (O − E)² / E', lore: '관측(O)이 기대(E)에서 벗어날수록 화룡의 숨결이 뜨거워진다. 숨결은 언제나 오른쪽으로만 분다.' },
  { n: '점술사의 기대도수', ch: 9, f: 'E = n × p₀', lore: '공정한 주사위 60번이면 각 눈은 10번 나와야 한다. 점술사는 이 숫자를 「기대도수」라 부른다.' },
  { n: '상회 장부 대조법', ch: 9, f: 'Eᵢⱼ = (행 합 × 열 합) / 전체', lore: '두 범주가 서로 무관하다면, 각 칸은 행과 열의 몫만큼 채워져야 한다.' },
  { n: '자유도의 계율', ch: 9, f: '적합도 df = k − 1  ·  분할표 df = (r − 1)(c − 1)', lore: '마지막 칸은 언제나 나머지가 정해 준다. 그래서 하나씩 빼는 것이 계율이다.' },
  { n: '표준화의 거울', ch: 7, f: 'Z = (X − μ) / σ', lore: '어떤 괴물도 이 거울에 비추면 평균 0, 표준편차 1의 모습이 된다. 이세계 모험가의 기본 주문.' },
  { n: '중심극한의 예언', ch: 7, f: 'x̄ ~ N( μ, σ²/n )   (n ≥ 30)', lore: '어떤 분포의 땅에서 왔든, 30명 이상 모이면 그들의 평균은 종 모양으로 선다. 고대 예언서의 첫 줄.' },
  { n: '표준오차의 저울', ch: 7, f: 'SE(x̄) = σ / √n', lore: '한 명은 크게 흔들려도, n명의 평균은 √n분의 1만큼만 흔들린다. 무리가 클수록 저울은 고요하다.' }
];
function todayKey() { const d = new Date(Date.now() + 9 * 3600e3); return Math.floor(d.getTime() / 86400e3); }
function todayDecree() { const k = todayKey(); return { no: 1000 + (k % 9000), d: DECREES[((k * 7) % DECREES.length + DECREES.length) % DECREES.length], k }; }
function decreeTurn(oldBoard) {
  const { no, d, k } = todayDecree();
  const done = S.flags['decree_' + k];
  const dt = new Date(Date.now() + 9 * 3600e3);
  const date = `${dt.getUTCMonth() + 1}월 ${dt.getUTCDate()}일`;
  return { title: `벨레스타 왕국 칙령 제${no}호`, sub: `${date} · 광장 벽보`, obj: 'sign',
    desc: `양피지에 왕실 인장이 찍혀 있다. 매일 새벽, 왕실 서기 시그마가 새 칙령을 붙이고 간다.\n\n<b>「짐, 스토카스 3세는 오늘의 주문식을 반포하노라.」</b>\n<div class="lesson decree-f"><b>✦ ${esc(d.n)}</b> <small>(${d.ch}장)</small><br><span class="big-f">${esc(d.f)}</span></div><span class="ex">📜 ${esc(d.lore)}</span>\n\n<small>칙령은 날짜가 바뀌면 새로 붙는다. ${done ? '✅ 오늘의 칙령 시험 통과함' : '오늘의 칙령 시험에 통과하면 왕실 포상금이 나온다.'}</small>`,
    choices: [
      done ? { t: '게시판의 다른 의뢰서를 본다', run: () => oldBoard() } : { t: '칙령 시험에 응한다', tag: `📝 ${d.ch}장 · 포상 25G`, run: () => quizTurn({ title: '칙령 시험', obj: 'sign', ch: d.ch, head: `「${d.n}」을(를) 아는 자는 답하라.`, after: (ok, q) => ({ title: '칙령 시험', obj: 'sign', fx: applyFx(ok ? { gold: 25, focus: 1 } : { status: { 혼란: 1 } }), desc: (ok ? (S.flags['decree_' + k] = true, ach('decree'), '⭕ 왕실 서기가 어디선가 나타나 포상금을 건넨다. 「내일 칙령도 기대하세요!」') : '❌ 칙령 아래에 누군가 낙서를 했다. 「나도 틀림 ㅋ」') + `\n<span class="ex">해설: ${esc(q.ex)}</span>`, choices: [{ t: '다시 칙령을 본다', run: () => decreeTurn(oldBoard) }, { t: '떠난다', run: () => null }] }) }) },
      { t: done ? '칙령을 소리 내어 낭독한다' : '게시판의 다른 의뢰서를 본다', run: () => done ? Object.assign(simple('낭독', 'sign', `「${d.f}」\n지나가던 주민들이 박수를 친다. 누군가 동전을 던진다.`), { fx: applyFx({ gold: 1 + (Math.random() * 3 | 0) }) }) : oldBoard() },
      { t: '떠난다', run: () => null }] };
}

// -------------------------------------------------------------------------
// 📍 길 안내 — 퀘스트 목표까지 발자국으로 경로 표시
// -------------------------------------------------------------------------
const GUIDE = { path: [], target: null, label: '', key: '', t: 0 };
function npcHome(id) {
  const n = NPCS[id], m = MAPS[n.map]; if (!m) return null;
  if (n.at) return n.at;
  if (n.rel) return [m.cx + n.rel[0], m.cy + n.rel[1]];
  if (m.slots && m.npcSlots) { const i = m.npcSlots.indexOf(id); if (i >= 0 && m.slots[i]) return m.slots[i]; }
  return null;
}
function npcByName(str) { for (const id in NPCS) { const n = NPCS[id]; if (n.n && n.n.length >= 2 && str.includes(n.n)) return id; } return null; }
// 퀘스트 → 목표 {map, x, y, npc, label}
function questGoal(qid) {
  const Q = QUESTS[qid], s = S.quests[qid]; if (!Q || !s || s.done) return null;
  const step = s.step;
  const npc = id => { const p = npcHome(id); return p ? { map: NPCS[id].map, x: p[0], y: p[1], npc: id, label: `${NPCS[id].n} (${MAPS[NPCS[id].map].name})` } : null; };
  const tile = (map, ch, label) => { const m = MAPS[map]; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.g[y][x] === ch) return { map, x, y, label }; return null; };
  if (qid === 'main') {
    if (step === 0) return npc('owen');
    if (step === 1) { const need = [['seal_est', 'estima'], ['seal_test', 'hypo'], ['seal_cat', 'categoria']].find(([s2]) => !has(s2)); return need ? npc(need[1]) : npc('owen'); }
    if (step === 2) return flag('gate_open') ? tile('dun1', 'v', '분산의 미궁 아래층 계단') : tile('cave', 'g', '이상치 동굴의 봉인문');
    return npc('outlier');
  }
  if (qid === 's_dungeon') {
    if (step === 0) return npc('stokas');
    if (step >= 2 || dunCleared().length === 3) return npc('stokas');
    const d = ['dunW', 'dunS', 'dunE'].find(d2 => !flag('clear_' + d2));
    const b = DUNGEON_INFO[d].boss, p = npcHome(b);
    return { map: d, x: p[0], y: p[1], npc: b, label: `${DUNGEON_INFO[d].n}의 수호자` };
  }
  if (qid === 's_signs') { const g = nearestUnreadSign(); if (g) return g; }
  const id = npcByName(Q.giver); return id ? npc(id) : null;
}
function nearestUnreadSign() {
  const order = [MAP.id, 'town', 'castle'].concat(Object.keys(MAPS));
  for (const mid of order) { const m = MAPS[mid]; if (!m || !m.signs) continue; let best = null, bd = 1e9; for (const k in m.signs) { const id = m.signs[k]; if (S.read[id] || !LESSONS[id]) continue; const [x, y] = k.split(',').map(Number); const d = mid === MAP.id ? Math.abs(x - PLAYER.x) + Math.abs(y - PLAYER.y) : 0; if (d < bd) { bd = d; best = { map: mid, x, y, label: `안 읽은 표지판 · ${LESSONS[id].t}` }; } } if (best) return best; }
  return null;
}
function storyGoal() {
  const st = typeof nextStory === 'function' ? nextStory() : null; if (!st || (st.cond && !st.cond())) return null;
  const m = MAPS[st.map]; if (!m) return null;
  if (st.area) { const ox = st.rel ? m.cx : 0, oy = st.rel ? m.cy : 0; return { map: st.map, x: ox + Math.round((st.area[0] + st.area[2]) / 2), y: oy + Math.round((st.area[1] + st.area[3]) / 2), label: `📖 ${st.ch} · ${st.where}`, story: true }; }
  return { map: st.map, enter: true, label: `📖 ${st.ch} · ${st.where}`, story: true };
}
function currentGoal() {
  const tr = S.guide || 'auto';
  if (tr === 'off') return null;
  if (tr === 'story') return storyGoal();
  if (tr !== 'auto') { const g = questGoal(tr); if (g) return g; }
  const sg = storyGoal(); if (sg) return sg;
  for (const q of ['main', 's_dungeon'].concat(Object.keys(QUESTS))) { const g = questGoal(q); if (g) return g; }
  return null;
}
// 맵 사이 연결
function mapExits(m) {
  const out = [];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const c = m.g[y][x];
    if (c === 'D') {
      if (m.id === 'town') { const b = BUILDINGS.find(b2 => b2.door[0] === x && b2.door[1] === y); if (b) out.push({ to: b.map, x, y }); }
      else if (m.id === 'forest') out.push({ to: 'cave', x, y }); else if (m.id === 'cave') out.push({ to: 'forest', x, y }); else out.push({ to: 'town', x, y });
    }
    if (c === '^' || c === 'v') { const l = LINKS.find(l2 => (l2[0] === m.id && l2[1] === c) || (l2[2] === m.id && l2[3] === c)); if (l) out.push({ to: l[0] === m.id ? l[2] : l[0], x, y }); }
    if (c === 'g' && m.id === 'cave') out.push({ to: 'dun1', x, y, locked: true });
  }
  (m.edgeWarps || []).forEach(e => {
    const pts = [];
    if (e.side === 'E') for (let y = e.y0; y <= e.y1; y++) pts.push([m.w - 1, y]);
    if (e.side === 'W') for (let y = e.y0; y <= e.y1; y++) pts.push([0, y]);
    if (e.side === 'N') for (let x = e.x0; x <= e.x1; x++) pts.push([x, 0]);
    if (e.side === 'S') for (let x = e.x0; x <= e.x1; x++) pts.push([x, m.h - 1]);
    pts.forEach(([x, y]) => out.push({ to: e.to, x, y }));
  });
  return out;
}
const _exitCache = {};
function exitsOf(id) { if (!_exitCache[id] || id === MAP.id) _exitCache[id] = mapExits(MAPS[id]); return _exitCache[id]; }
function mapRoute(from, to) {
  if (from === to) return [from];
  const prev = { [from]: null }, q = [from];
  while (q.length) { const c = q.shift(); for (const e of exitsOf(c)) { if (prev[e.to] !== undefined || !MAPS[e.to]) continue; prev[e.to] = c; if (e.to === to) { const r = [to]; let k = c; while (k) { r.unshift(k); k = prev[k]; } return r; } q.push(e.to); } }
  return null;
}
function tilePath(goals) {
  const W = MAP.w, H = MAP.h, key = (x, y) => y * W + x, gset = new Set(goals.map(([x, y]) => key(x, y)));
  const sx = PLAYER.x, sy = PLAYER.y; if (gset.has(key(sx, sy))) return [];
  const prev = new Int32Array(W * H).fill(-2); prev[key(sx, sy)] = -1;
  const q = [[sx, sy]]; let hit = -1, n = 0;
  const pass = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return false; const c = MAP.g[y][x]; if (gset.has(key(x, y))) return true; return !SOLID.has(c) && c !== 'D' && c !== '^' && c !== 'v'; };
  while (q.length && n++ < 20000) {
    const [x, y] = q.shift();
    if (gset.has(key(x, y))) { hit = key(x, y); break; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!pass(nx, ny)) continue; const k = key(nx, ny); if (prev[k] !== -2) continue; prev[k] = key(x, y); q.push([nx, ny]); }
  }
  if (hit < 0) return null;
  const path = []; let k = hit; while (k >= 0 && k !== key(sx, sy)) { path.unshift([k % W, Math.floor(k / W)]); k = prev[k]; }
  return path;
}
function updateGuide(dt) {
  if (!S || !MAP || titleMode) return;
  GUIDE.t -= dt; if (GUIDE.t > 0) return; GUIDE.t = 350;
  const g = currentGoal(); GUIDE.target = g; GUIDE.path = []; GUIDE.label = g ? g.label : '';
  const el = document.getElementById('hud-guide');
  if (!g) { if (el) el.textContent = ''; return; }
  let goals = null, note = '';
  if (g.map === MAP.id) {
    if (g.enter) { if (el) el.innerHTML = `${HUD_ICON.pin}${esc(g.label.replace(/^📖\s*/, ''))} <em>도착!</em>`; return; }
    let tx = g.x, ty = g.y;
    if (g.npc) { const a = ACTORS.find(a2 => a2.id === g.npc); if (a) { tx = a.x; ty = a.y; } }
    GUIDE.dest = [tx, ty];
    goals = [[tx, ty], [tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]].filter(([x, y]) => x >= 0 && y >= 0 && x < MAP.w && y < MAP.h);
  } else {
    const route = mapRoute(MAP.id, g.map);
    if (!route || route.length < 2) { if (el) el.innerHTML = `${HUD_ICON.pin}${esc(g.label.replace(/^📖\s*/, ''))}`; return; }
    const nxt = route[1], ex = exitsOf(MAP.id).filter(e => e.to === nxt);
    goals = ex.map(e => [e.x, e.y]); GUIDE.dest = goals[0];
    note = ` · ${MAPS[nxt].name} 쪽으로`;
    const gate = (MAP.edgeWarps || []).find(e => e.to === nxt && e.need && signCount() < e.need); if (gate) note += ` <b style="color:#ff9ab0">(표지판 ${signCount()}/${gate.need})</b>`;
  }
  const p = goals.length ? tilePath(goals) : null;
  GUIDE.path = p || [];
  if (el) el.innerHTML = `${HUD_ICON.pin}${esc(g.label.replace(/^📖\s*/, ''))}${note}${p ? ` <em>${p.length}칸</em>` : ''}`;
}
function drawGuideWorld(ctx, t) {
  if (S.guide === 'off' || !GUIDE.path || !GUIDE.path.length || dlgOpen || cutOpen) return;
  const p = GUIDE.path, n = Math.min(p.length, 60);
  for (let i = 0; i < n; i++) {
    const [x, y] = p[i];
    const ph = ((t / 90) - i) % 12; const a = ph > 0 && ph < 3 ? 1 : .55;
    ctx.fillStyle = `rgba(255,216,77,${a * (1 - i / (n + 8))})`;
    const off = (i % 2 ? 3 : -3);
    ctx.fillRect(x * 16 + 7 + off, y * 16 + 6, 3, 4);
    ctx.fillStyle = `rgba(42,29,43,${.5 * a})`; ctx.fillRect(x * 16 + 7 + off, y * 16 + 10, 3, 1);
  }
}
// 화면 가장자리 화살표 (목표가 화면 밖일 때)
function drawGuideScreen(ctx, toScreen, W, H, t, dpr) {
  return; // 화살표 없이 발자국만 보여 준다
  if (S.guide === 'off' || !GUIDE.dest || dlgOpen || cutOpen || !GUIDE.target) return;
  const [dx, dy] = GUIDE.dest; const [x, y] = toScreen(dx * 16 + 8, dy * 16 + 8);
  const m = 40 * dpr; if (x > m && x < W - m && y > m && y < H - m) return;
  const cx = W / 2, cy = H / 2, ang = Math.atan2(y - cy, x - cx);
  const r = Math.min(W / 2 - m, H / 2 - m) / Math.max(Math.abs(Math.cos(ang)) * (Math.min(W, H) / W), Math.abs(Math.sin(ang)) * (Math.min(W, H) / H));
  const ax = cx + Math.cos(ang) * Math.min(r, W / 2 - m), ay = cy + Math.sin(ang) * Math.min(r, H / 2 - m);
  const px = Math.max(m, Math.min(W - m, ax)), py = Math.max(m, Math.min(H - m, ay));
  ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
  const s = (1 + Math.sin(t / 200) * .1) * dpr;
  ctx.fillStyle = '#ffd84d'; ctx.strokeStyle = '#2a1d2b'; ctx.lineWidth = 3 * dpr;
  ctx.beginPath(); ctx.moveTo(16 * s, 0); ctx.lineTo(-10 * s, -12 * s); ctx.lineTo(-4 * s, 0); ctx.lineTo(-10 * s, 12 * s); ctx.closePath(); ctx.stroke(); ctx.fill();
  ctx.restore();
}

// 큰 벽보 그리기 (월드 좌표)
function drawDecreeBoard(ctx, t) {
  if (!MAP || MAP.id !== 'town' || !MAP.decree) return;
  const { x, y } = MAP.decree, px = x * 16, py = y * 16 - 10, w = 48, h = 42;
  ctx.fillStyle = '#4a2f1e'; ctx.fillRect(px + 3, py + 8, 3, h - 6); ctx.fillRect(px + w - 6, py + 8, 3, h - 6);
  ctx.fillStyle = '#6b4226'; ctx.fillRect(px, py + 2, w, 28); ctx.fillStyle = '#3b2a20'; ctx.fillRect(px, py + 2, w, 2); ctx.fillRect(px, py + 28, w, 2);
  ctx.fillStyle = '#8a5a34'; ctx.fillRect(px - 2, py, w + 4, 4);
  ctx.fillStyle = '#f4e7c9'; ctx.fillRect(px + 4, py + 6, w - 8, 21);
  ctx.fillStyle = '#e2cfa2'; ctx.fillRect(px + 4, py + 25, w - 8, 2);
  ctx.fillStyle = '#7a2a3a'; ctx.fillRect(px + 4, py + 6, w - 8, 5);
  ctx.fillStyle = '#ffd84d'; ctx.font = '900 4px "Pretendard Variable",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const { no, d } = todayDecree();
  ctx.fillText(`왕국 칙령 제${no}호`, px + w / 2, py + 8.7);
  ctx.fillStyle = '#2a1d2b'; ctx.font = '800 3.6px "Pretendard Variable",sans-serif';
  ctx.fillText(d.n, px + w / 2, py + 14);
  ctx.fillStyle = '#23509e'; ctx.font = '800 3.2px "Pretendard Variable",sans-serif';
  const f = d.f.length > 26 ? d.f.slice(0, 25) + '…' : d.f; ctx.fillText(f, px + w / 2, py + 19.5);
  ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(px + w - 9, py + 23, 2.2 + Math.sin(t / 400) * .2, 0, 7); ctx.fill();
  ctx.fillStyle = '#9a6a3a'; ctx.fillRect(px + 6, py + 22, 14, 1); ctx.fillRect(px + 6, py + 24, 10, 1);
}

// -------------------------------------------------------------------------
// ⚡ 돌발 이벤트 — 「투다다다닷!」 「어이쿠!」 (철푸덕)
// -------------------------------------------------------------------------
(function injectCss() {
  const st = document.createElement('style');
  st.textContent = `
  #onoma { position: fixed; inset: 0; pointer-events: none; z-index: 35; overflow: hidden; }
  .ono { position: absolute; font-weight: 900; color: #fff; white-space: nowrap; letter-spacing: -1px; transform: translate(-50%, -50%) rotate(var(--r)) scale(.3); opacity: 0;
    -webkit-text-stroke: 2px #2a1d2b; paint-order: stroke fill; text-shadow: 4px 4px 0 #2a1d2b; animation: ono 1.25s cubic-bezier(.2,1.6,.4,1) forwards; font-family: "Pretendard Variable", sans-serif; }
  @keyframes ono { 0% { opacity: 0; transform: translate(-50%,-50%) rotate(var(--r)) scale(.3); } 15% { opacity: 1; transform: translate(-50%,-50%) rotate(var(--r)) scale(1.15); } 30% { transform: translate(-50%,-50%) rotate(var(--r)) scale(1); } 80% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%,-80%) rotate(var(--r)) scale(1); } }
  #hud-guide { font-size: 11px; font-weight: 800; color: #ffe9a8; line-height: 1.35; max-width: 260px; }
  #hud-guide:empty { display: none; }
  #hud-guide em { font-style: normal; color: #9fe8ff; margin-left: 4px; }
  .symleg { margin-top: 6px; font-size: 12.5px; line-height: 1.7; background: rgba(61,123,217,.08); border: 1.5px dashed #3d7bd9; border-radius: 10px; padding: 6px 9px; color: #23345e; font-weight: 600; }
  .symleg b { color: #23509e; margin-right: 4px; } .symleg span { display: inline-block; margin-right: 10px; white-space: nowrap; } .symleg i { font-style: normal; font-weight: 900; color: #7a2a3a; margin-right: 2px; }
  .term.sym { border-bottom-style: solid; border-bottom-width: 2px; border-color: rgba(61,123,217,.55); color: inherit; padding: 0 1px; }
  #dlg-desc .decree-f { text-align: center; background: linear-gradient(180deg, #fff6de, #f4e2b4); border: 3px double #7a2a3a; }
  #dlg-desc .decree-f .big-f { display: inline-block; margin-top: 4px; font-size: 17px; font-weight: 900; color: #23243e; }
  @media (max-width: 640px) { #hud-guide { max-width: 46vw; font-size: 10px; } }`;
  document.head.appendChild(st);
  const d = document.createElement('div'); d.id = 'onoma'; document.body.appendChild(d);
})();
function onoma(txt, opt = {}) {
  const box = document.getElementById('onoma'); if (!box) return;
  const el = document.createElement('div'); el.className = 'ono'; el.textContent = txt;
  el.style.left = (opt.x ?? (35 + Math.random() * 30)) + '%'; el.style.top = (opt.y ?? (30 + Math.random() * 20)) + '%';
  el.style.fontSize = (opt.size || 38) + 'px'; el.style.color = opt.color || '#fff'; el.style.setProperty('--r', (opt.rot ?? (Math.random() * 16 - 8)) + 'deg');
  box.appendChild(el); setTimeout(() => el.remove(), 1400);
}
let EVT = null; // 진행 중인 돌발 이벤트
function playerScreenPct() { const r = canvas.getBoundingClientRect(); return [((PLAYER.px + 8 - cam.x) * cam.zoom) / r.width * 100, ((PLAYER.py - cam.y) * cam.zoom) / r.height * 100]; }
// 달려와서 부딪히는 이벤트
function runnerEvent(npcId, words, turnFn) {
  // 플레이어 기준 일직선으로 6칸 비어 있는 방향 찾기
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => Math.random() - .5);
  for (const [dx, dy] of dirs) {
    let ok = true; for (let k = 1; k <= 6; k++) { const x = PLAYER.x + dx * k, y = PLAYER.y + dy * k; if (!walkable(x, y) || '^vD'.includes(MAP.g[y][x])) { ok = false; break; } }
    if (!ok) continue;
    const sx = PLAYER.x + dx * 6, sy = PLAYER.y + dy * 6;
    const a = { id: npcId, x: sx, y: sy, px: sx * TS, py: sy * TS, dir: dx > 0 ? 1 : dx < 0 ? 2 : dy > 0 ? 3 : 0, moving: 0, fr: 1, wander: 0, home: [sx, sy], t: 1e12, spr: SPR[npcId], temp: true };
    ACTORS.push(a);
    EVT = { a, dx: -dx, dy: -dy, left: 5, step: 0, words, turnFn, phase: 'run' };
    clearHeld();
    const [px, py] = playerScreenPct();
    onoma(words[0], { x: px + dx * 18, y: py + dy * 14 - 6, size: 34, color: '#ffe066', rot: -6 });
    AudioSys.sfx('step');
    return true;
  }
  return false;
}
function updateEvents(dt) {
  if (!EVT) return;
  const e = EVT, a = e.a;
  if (e.phase === 'run') {
    e.step += dt;
    const DUR = 70;
    const t = Math.min(1, e.step / DUR);
    a.px = (a.x + e.dx * t) * TS; a.py = (a.y + e.dy * t) * TS; a.fr = (Math.floor(e.step / 35) % 2) + 1;
    if (t >= 1) {
      a.x += e.dx; a.y += e.dy; e.step = 0; e.left--;
      if (e.left % 2 === 0) AudioSys.sfx('step');
      if (e.left <= 0) {
        e.phase = 'bonk';
        a.px = a.x * TS; a.py = a.y * TS; a.fr = 0;
        shake(10); AudioSys.sfx('hit');
        const [px, py] = playerScreenPct();
        onoma(e.words[1] || '어이쿠!', { x: px, y: py - 10, size: 40, color: '#ff8fa3', rot: 8 });
        setTimeout(() => onoma(e.words[2] || '(철푸덕)', { x: px + 6, y: py + 6, size: 26, color: '#e8dcf5', rot: -4 }), 380);
        // 넘어져서 한 칸 밀림
        const bx = PLAYER.x + e.dx, by = PLAYER.y + e.dy;
        if (walkable(bx, by) && !edgeOn(bx, by)) { PLAYER.x = bx; PLAYER.y = by; PLAYER.mdx = e.dx; PLAYER.mdy = e.dy; PLAYER.moveDur = PLAYER.moving = 180; }
        PLAYER.dir = e.dx > 0 ? 1 : e.dx < 0 ? 2 : e.dy > 0 ? 3 : 0;
        const go = () => { if (!EVT) return; if (cutOpen || dlgOpen || transitioning) return setTimeout(go, 400); const turn = e.turnFn(); EVT.phase = 'talk'; openTurn(turn); };
        setTimeout(go, 900);
      }
    }
  }
  if (e.phase === 'talk' && !dlgOpen) { removeActor(a.id); const i = ACTORS.indexOf(a); if (i >= 0) ACTORS.splice(i, 1); EVT = null; }
}
// 그 자리에서 벌어지는 이벤트 (달려오는 사람 없이)
function popEvent(words, turnFn, fxShake) {
  clearHeld();
  const [px, py] = playerScreenPct();
  words.forEach((w, i) => setTimeout(() => onoma(w, { x: px + (i % 2 ? 8 : -8), y: py - 12 + i * 8, size: i === 0 ? 38 : 28, color: ['#ffe066', '#ff8fa3', '#e8dcf5'][i % 3] }), i * 420));
  if (fxShake) setTimeout(() => shake(fxShake), 400);
  const go = () => { if (dlgOpen || panelOpen || cutOpen || transitioning) return setTimeout(go, 400); openTurn(turnFn()); };
  setTimeout(go, words.length * 420 + 450);
  return true;
}
const EVENTS = [
  // 소매치기 소년이 전력질주
  { w: 3, where: m => m.theme === 'town', run: () => runnerEvent('fin', ['투다다다닷—!', '어이쿠!', '(철푸덕)'], () => { ach('bonk'); return { who: 'fin', mood: 'surprise', desc: '모퉁이에서 튀어나온 주근깨 소년과 정면으로 부딪혔다. 둘 다 바닥에 철푸덕 엎어졌다.\n「아야야… 미, 미안! 쫓기는 중이라!」 멀리서 「거기 서!」 하는 목소리.', choices: [
    { t: '손을 내밀어 일으켜 준다', run: () => Object.assign(npcTurn('fin', '핀이 머쓱하게 손을 잡는다. 「…고마워. 이거, 아까 주운 건데 너 줄게.」'), { fx: applyFx({ gold: 3 + (Math.random() * 5 | 0), aff: 1 }, 'fin') }) },
    { t: '주머니부터 확인한다', tag: '민첩 12', run: () => { const r = check('민첩', 12); return Object.assign(npcTurn('fin', r.ok ? '핀의 손이 당신 주머니로 들어오던 참이었다. 손목을 잡자 「에헤헤…」 하고 동전을 토해 낸다.' : '주머니가 가볍다. 핀은 이미 골목 끝에서 손을 흔든다.'), { roll: r.line, fx: applyFx(r.ok ? { gold: 6 } : { gold: -5 }, 'fin') }); } },
    { t: '「앞 좀 보고 다녀!」', run: () => Object.assign(npcTurn('fin', '「너나!」 핀이 혀를 내밀고 달아난다.'), { fx: applyFx({ aff: -1 }, 'fin') }) }] }; }) },
  // 견습 기사가 훈련하다 돌진
  { w: 2, where: m => m.theme === 'town', run: () => runnerEvent('leon', ['우오오오오—!!', '쾅!', '(데굴데굴)'], () => ({ who: 'leon', mood: 'surprise', desc: '목검을 든 견습 기사가 돌격 훈련을 하다 당신을 들이받았다. 둘이 엉켜 두 바퀴를 굴렀다.\n「죄, 죄송합니다! 돌격 각도를 1.96도 틀렸어요!」', choices: [
    { t: '괜찮다며 웃는다', run: () => Object.assign(npcTurn('leon', '「역시 모험가는 다르시네요!」 레온이 비상용 물약을 건넨다.'), { fx: applyFx({ item: 'potion', aff: 1 }, 'leon') }) },
    { t: '돌격 자세를 고쳐 준다', tag: '힘 11', run: () => { const r = check('힘', 11); return Object.assign(npcTurn('leon', r.ok ? '「무게중심을 낮추라… 오! 진짜 덜 넘어져요!」' : '시범을 보이다 당신이 또 넘어졌다. 철푸덕.'), { roll: r.line, fx: applyFx(r.ok ? { aff: 2, status: { 고양: 2 } } : { hp: -1 }, 'leon') }); } },
    { t: '엉덩이를 문지르며 자리를 뜬다', run: () => null }] })) },
  // 비둘기 공습
  { w: 2, where: m => m.theme === 'town' || m.theme === 'forest', run: () => popEvent(['푸드드드득!', '철퍽!!', '…?'], () => ({ who: 'pigeon', mood: 'neutral', desc: '하늘에서 비둘기 떼가 지나갔다. 그리고 무언가가 어깨에 철퍽 떨어졌다.\n…동전이다. 피존 2세가 위에서 내려다본다. 「구구. 세금 환급.」', choices: [
    { t: '고맙다고 인사한다', run: () => Object.assign(npcTurn('pigeon', '「구구. 기대도수만큼만 준 거요.」'), { fx: applyFx({ gold: 4 }) }) },
    { t: '하늘을 다시 올려다본다', tag: '운 12', run: () => { const r = check('운', 12); return Object.assign(simple('하늘', 'sign', r.ok ? '두 번째 동전이 떨어진다. 짤랑!' : '두 번째로 떨어진 건… 동전이 아니었다.'), { roll: r.line, fx: applyFx(r.ok ? { gold: 6 } : { status: { 피로: 2 } }) }); } },
    { t: '못 본 척 걷는다', run: () => null }] }), 4) },
  // 미끄덩
  { w: 2, where: m => m.theme !== 'interior', run: () => popEvent(['미끄덩—', '쿠당탕!', '(아야…)'], () => ({ title: '바나나 껍질', sub: '누가 버렸지', obj: 'sign', desc: '무언가를 밟고 미끄러져 엉덩방아를 찧었다. 바나나 껍질이다. 껍질 안쪽에 누가 써 놓았다: 「P(미끄러짐) = 1」.', choices: [
    { t: '털고 일어난다', run: () => Object.assign(simple('바나나 껍질', 'sign', '먼지를 털었다. 일어나 보니 바닥에 동전이 하나.'), { fx: applyFx({ hp: -1, gold: 2 }) }) },
    { t: '껍질을 주워 휴지통에 버린다', tag: '정신 10', run: () => { const r = check('정신', 10); return Object.assign(simple('바나나 껍질', 'sign', r.ok ? '착한 일을 했다. 마음이 맑아진다.' : '버리러 가다 또 밟았다. 철푸덕.'), { roll: r.line, fx: applyFx(r.ok ? { focus: 1 } : { hp: -1 }) }); } },
    { t: '「누구야!」 하고 외친다', run: () => simple('외침', 'sign', '골목에서 원숭이 같은 웃음소리가 났다가 사라진다.') }] }), 7) },
  // 굴러오는 술통
  { w: 2, where: m => m.theme === 'town' || m.theme === 'interior', run: () => popEvent(['데구르르르르—', '쿵!!', '(으악)'], () => ({ title: '굴러온 술통', sub: '여관 배달 중', obj: 'sign', desc: '언덕 위에서 술통 하나가 당신을 향해 굴러왔다!', choices: [
    { t: '옆으로 뛰어 피한다', tag: '민첩 12', run: () => { const r = check('민첩', 12); return Object.assign(simple('술통', 'sign', r.ok ? '휙! 술통이 아슬아슬하게 비껴가 벽에 부딪혀 멈춘다. 배달부가 고맙다며 동전을 준다.' : '정강이에 정통으로. 술통은 멀쩡하다.'), { roll: r.line, fx: applyFx(r.ok ? { gold: 5 } : { hp: -2 }) }); } },
    { t: '온몸으로 받아낸다', tag: '힘 13', run: () => { const r = check('힘', 13); return Object.assign(simple('술통', 'sign', r.ok ? '쿵! 술통을 멈춰 세웠다. 마르타가 달려와 공짜 식사권을 준다.' : '술통과 함께 세 바퀴를 굴렀다.'), { roll: r.line, fx: applyFx(r.ok ? { heal: 5, affs: { marta: 1 } } : { hp: -3 }) }); } },
    { t: '눈을 감는다', run: () => Object.assign(simple('술통', 'sign', '…아무 일도 없었다. 술통이 바로 앞에서 멈췄다. 운이 좋다.'), { fx: applyFx({ status: { 축복: 2 } }) }) }] }), 9) },
  // 고양이 습격
  { w: 1, where: m => m.theme === 'town' || m.theme === 'interior', run: () => runnerEvent('nurungji', ['냐아아아앙—!', '휙!', '(가방이 가볍다)'], () => ({ who: 'nurungji', mood: 'neutral', desc: '여관 고양이 누룽지가 쏜살같이 달려와 다리 사이를 빠져나갔다. 입에 뭔가 물고 있다… 당신 빵이다!', choices: [
    { t: '쫓아간다', tag: '민첩 13', run: () => { const r = check('민첩', 13); return Object.assign(npcTurn('nurungji', r.ok ? '모퉁이에서 붙잡았다. 누룽지가 빵 대신 반짝이는 단추를 내려놓는다. 거래 성립.' : '고양이는 이미 지붕 위다. 꼬리만 보인다.'), { roll: r.line, fx: applyFx(r.ok ? { gold: 5, aff: 1 } : {}, 'nurungji') }); } },
    { t: '「그냥 먹어라」', run: () => Object.assign(npcTurn('nurungji', '누룽지가 멈춰서 당신을 본다. 천천히 눈을 깜빡인다. 고양이식 「고마워」다.'), { fx: applyFx({ aff: 2, status: { 고양: 2 } }, 'nurungji') }) },
    { t: '멍하니 본다', run: () => null }] })) },
  // 소나기
  { w: 1, where: m => m.theme === 'town' || m.theme === 'forest', run: () => popEvent(['후두두두둑!', '쏴아아아—'], () => ({ title: '갑작스러운 소나기', sub: '강수확률 30%였는데', obj: 'sign', desc: '맑던 하늘에서 갑자기 비가 쏟아진다. 강수확률 30%라더니. 30%도 일어난다.', choices: [
    { t: '처마 밑으로 뛰어든다', tag: '민첩 10', run: () => { const r = check('민첩', 10); return Object.assign(simple('소나기', 'sign', r.ok ? '뽀송하게 피했다. 옆에 선 상인이 우산 장사를 시작한다.' : '처마까지 세 걸음. 이미 다 젖었다.'), { roll: r.line, fx: applyFx(r.ok ? {} : { status: { 피로: 2 } }) }); } },
    { t: '비를 맞으며 춤춘다', run: () => Object.assign(simple('소나기', 'sign', '주민들이 창문을 열고 박수를 친다. 기분이 좋아졌다.'), { fx: applyFx({ status: { 고양: 4 }, gold: 2 }) }) },
    { t: '「확률은 확률일 뿐…」 하고 중얼거린다', run: () => Object.assign(simple('소나기', 'sign', '젖었지만 깨달음을 얻었다. 사건이 일어날 확률과 일어난 결과는 다르다.'), { fx: applyFx({ focus: 1 }) }) }] }), 0) },
  // 던전: 천장 붕괴
  { w: 3, where: m => m.theme === 'dungeon' || m.theme === 'cave', run: () => popEvent(['쿠구구구궁…', '와르르르!', '(콜록콜록)'], () => ({ title: '무너지는 천장', sub: MAP.name, obj: 'sign', desc: '머리 위에서 돌이 쏟아진다!', choices: [
    { t: '앞으로 몸을 날린다', tag: '민첩 12 · 실패 시 HP−3', run: () => { const r = check('민첩', 12); return Object.assign(simple('붕괴', 'sign', r.ok ? '데굴! 아슬아슬하게 빠져나왔다. 무너진 돌 틈에 반짝이는 게 있다.' : '어깨에 돌을 맞았다. 아프다.'), { roll: r.line, fx: applyFx(r.ok ? { gold: 6 } : { hp: -3 }) }); } },
    { t: '가방으로 머리를 감싼다', tag: '운 11', run: () => { const r = check('운', 11); return Object.assign(simple('붕괴', 'sign', r.ok ? '돌이 가방에 맞고 튕겨 나갔다. 물약은 무사하다.' : '가방이 찌그러졌다. 머리도 조금.'), { roll: r.line, fx: applyFx(r.ok ? {} : { hp: -2 }) }); } },
    { t: '먼지를 털고 숨을 고른다', run: () => Object.assign(simple('붕괴', 'sign', '먼지가 가라앉는다. 무너진 돌에 「표본오차」라고 새겨져 있다.'), { fx: applyFx({ hp: -1 }) }) }] }), 9) },
  // 던전: 박쥐 떼
  { w: 2, where: m => m.theme === 'dungeon' || m.theme === 'cave', run: () => popEvent(['푸드드드드득!!', '끼에엑!', '(머리가 엉망)'], () => ({ title: '박쥐 떼', sub: MAP.name, obj: 'sign', desc: '어둠 속에서 박쥐 수백 마리가 한꺼번에 날아올랐다! 머리카락 사이로 날갯짓이 스친다.', choices: [
    { t: '바닥에 엎드린다', run: () => Object.assign(simple('박쥐 떼', 'sign', '철푸덕 엎드렸다. 박쥐들이 지나간 자리에 누군가 떨어뜨린 동전이.'), { fx: applyFx({ gold: 3 }) }) },
    { t: '박쥐 수를 세어 본다', tag: '지능 13', run: () => { const r = check('지능', 13); return Object.assign(simple('박쥐 떼', 'sign', r.ok ? '구간 [180, 220] 마리, 신뢰수준 95%. 완벽한 추정이다.' : '셋까지 세다가 박쥐가 코를 쳤다.'), { roll: r.line, fx: applyFx(r.ok ? { focus: 1 } : { status: { 혼란: 1 } }) }); } },
    { t: '횃불을 휘두른다', run: () => Object.assign(simple('박쥐 떼', 'sign', '박쥐들이 흩어진다. 대신 횃불 불똥이 소매에 튀었다.'), { fx: applyFx({ hp: -1, status: { 고양: 2 } }) }) }] }), 5) },
  // 행상인
  { w: 1, where: () => true, run: () => popEvent(['딸랑딸랑~', '「손님~!」'], () => ({ title: '떠돌이 행상인', sub: '어디서 나타났지?', obj: 'sign', desc: '커다란 짐을 진 행상인이 갑자기 앞을 막아선다. 「이세계 특산품! 오늘만 이 가격!」', choices: [
    { t: '수상한 물약을 산다 (8골드)', run: () => { if (S.gold < 8) return simple('행상인', 'sign', '「돈이 없으면 꿈이라도 사 가시던가~」'); const v = Math.random(); return Object.assign(simple('행상인', 'sign', v < .6 ? '마셔 보니 진짜 물약이다. 상쾌하다!' : v < .85 ? '맛이… 탄산수다. 그냥 탄산수.' : '갑자기 수식이 술술 이해된다!'), { fx: applyFx(v < .6 ? { gold: -8, heal: 10 } : v < .85 ? { gold: -8 } : { gold: -8, focus: 3 }) }); } },
    { t: '값을 깎는다', tag: '설득 13', run: () => { const r = check('설득', 13); return Object.assign(simple('행상인', 'sign', r.ok ? '「에잇, 손님 눈빛에 졌다!」 공짜로 물약 하나를 준다.' : '「깎으면 품질도 깎여요~」 행상인이 휙 사라진다.'), { roll: r.line, fx: applyFx(r.ok ? { item: 'potion' } : {}) }); } },
    { t: '괜찮다고 한다', run: () => simple('행상인', 'sign', '「다음에 또 만나요~」 눈을 깜빡이니 행상인이 없다.') }] }), 0) }
];
// ---- 돌발 이벤트 추가분 ----
const TOWNISH = m => m.theme === 'town';
const OUTSIDE = m => m.theme === 'town' || m.theme === 'forest';
const DUNG = m => m.theme === 'dungeon' || m.theme === 'cave';
const R = (t, obj, desc, ch) => ({ title: t, sub: MAP.name, obj: obj || 'sign', desc, choices: ch });
const chk = (stat, dc, okTxt, ngTxt, okFx, ngFx, title) => () => { const r = check(stat, dc); return Object.assign(simple(title || '결과', 'sign', r.ok ? okTxt : ngTxt), { roll: r.line, fx: applyFx(r.ok ? okFx : ngFx) }); };
EVENTS.push(
  { w: 2, where: TOWNISH, run: () => popEvent(['다그닥다그닥—!!', '히이잉!', '(먼지 펄펄)'], () => R('폭주 마차', 'sign', '골목 끝에서 말 두 마리가 끄는 마차가 전속력으로 달려온다! 마부는 졸고 있다.', [
    { t: '옆 골목으로 몸을 날린다', tag: '민첩 12', run: chk('민첩', 12, '휙! 아슬아슬하게 피했다. 마차에서 사과 상자가 떨어져 하나를 챙겼다.', '피하긴 했는데 진흙탕에 철푸덕.', { item: 'bread', heal: 2 }, { hp: -1, status: { 피로: 1 } }, '폭주 마차') },
    { t: '「일어나세요!!」 하고 외친다', tag: '설득 11', run: chk('설득', 11, '마부가 화들짝 깨어 고삐를 당긴다. 「아이고 감사합니다!」 사례금을 던져 준다.', '마부는 계속 잔다. 마차는 분수를 한 바퀴 돌고 사라졌다.', { gold: 8 }, {}, '폭주 마차') },
    { t: '말의 걸음 수로 속도를 추정해 본다', tag: '지능 13', run: chk('지능', 13, '1초에 네 걸음, 보폭 1.5m… 시속 약 21.6km. 정확한 추정에 지나가던 학자가 박수를 친다.', '계산하다가 마차가 지나갔다. 머리카락이 바람에 휘날린다.', { focus: 1 }, {}, '폭주 마차') }]), 6) },
  { w: 2, where: TOWNISH, run: () => runnerEvent('lyra', ['♪ 띠리리리~', '♬ 랄라~', '(박수 짝짝)'], () => ({ who: 'lyra', mood: 'happy', desc: '음유시인 리라가 류트를 튕기며 다가와 당신 주위를 빙글빙글 돈다.\n「♪ 표본은 모여 종이 되고~ 평균은 웃으며 가운데 서네~ ♪」\n지나가던 사람들이 모여든다.', choices: [
    { t: '동전을 던져 준다 (3골드)', run: () => { if (S.gold < 3) return npcTurn('lyra', '「괜찮아, 박수도 돈이야!」'); return Object.assign(npcTurn('lyra', '「고마워! 너를 위한 소절을 하나 더~」 마음이 가벼워진다.'), { fx: applyFx({ gold: -3, aff: 2, status: { 고양: 4 } }, 'lyra') }); } },
    { t: '같이 노래한다', tag: '설득 12', run: () => { const r = check('설득', 12); return Object.assign(npcTurn('lyra', r.ok ? '화음이 딱 맞았다! 관객들이 동전을 던진다. 리라가 절반을 나눠 준다.' : '음이 반음 나갔다. 리라가 웃음을 참는다.'), { roll: r.line, fx: applyFx(r.ok ? { gold: 10, aff: 1 } : { aff: 0 }, 'lyra') }); } },
    { t: '가사 속 통계가 맞는지 따진다', run: () => Object.assign(npcTurn('lyra', '「…평균이 꼭 가운데 있는 건 아니라고? 치우친 분포면? 으으, 가사 고쳐야겠다.」'), { fx: applyFx({ focus: 1 }, 'lyra') }) }] })) },
  { w: 2, where: TOWNISH, run: () => popEvent(['휘이이익—', '쨍그랑!!', '(아슬아슬…)'], () => R('떨어진 화분', 'sign', '바로 발 앞에 화분이 떨어져 산산조각 났다. 2층 창문에서 할머니가 내려다본다. 「어머머! 괜찮아요?」', [
    { t: '「괜찮아요!」 하고 손을 흔든다', run: () => Object.assign(simple('떨어진 화분', 'sign', '할머니가 미안하다며 쿠키 바구니를 내려 준다. 줄에 매달아서.'), { fx: applyFx({ heal: 4, status: { 고양: 2 } }) }) },
    { t: '꽃을 살려서 다시 심는다', run: () => Object.assign(simple('떨어진 화분', 'sign', '흙을 모아 꽃을 다시 세웠다. 할머니가 감동해서 동전 꾸러미를 던진다. 머리에 맞았다.'), { fx: applyFx({ gold: 7, hp: -1 }) }) },
    { t: '떨어질 확률을 계산해 본다', tag: '지능 12', run: chk('지능', 12, '하루 1번 떨어지는 화분이 지금 내 앞에 떨어질 확률… 이건 그냥 운이 나빴던 거다. 깨달음을 얻었다.', '확률이 0이 아니니까 일어났다. 그게 전부다.', { focus: 1 }, {}, '떨어진 화분') }]), 5) },
  { w: 2, where: TOWNISH, run: () => runnerEvent('prime', ['흐에에엥—!', '(훌쩍훌쩍)', '…엄마아…'], () => ({ who: 'prime', mood: 'sad', desc: '울면서 달려오던 아이가 당신 다리에 부딪혔다. 「엄마를 잃어버렸어요… 엄마는 2, 3, 5, 7번째 골목 중 하나에 있대요…」', choices: [
    { t: '손을 잡고 같이 찾아 준다', tag: '설득 10', run: () => { const r = check('설득', 10); return Object.assign(npcTurn('prime', r.ok ? '세 번째 골목에서 엄마를 찾았다! 아이 엄마가 몇 번이고 고개를 숙이며 사례금을 쥐여 준다.' : '한참 헤맸지만 결국 경비병이 데려다줬다. 아이가 손을 흔든다.'), { roll: r.line, fx: applyFx(r.ok ? { gold: 12, aff: 2 } : { aff: 1, status: { 피로: 1 } }, 'prime') }); } },
    { t: '「골목이 4개면 한 곳일 확률은 1/4이야」', run: () => Object.assign(npcTurn('prime', '아이가 울음을 멈춘다. 「…4는 소수가 아닌데요.」 그리고 혼자 엄마를 찾으러 간다. 강하다.'), { fx: applyFx({ aff: -1 }, 'prime') }) },
    { t: '사탕을 준다', run: () => Object.assign(npcTurn('prime', '아이가 사탕을 물고 웃는다. 마침 엄마가 달려온다. 다행이다.'), { fx: applyFx({ aff: 1, status: { 고양: 2 } }, 'prime') }) }] })) },
  { w: 2, where: OUTSIDE, run: () => popEvent(['팔랑팔랑~', '(얼굴에 철썩)'], () => ({ title: '날아온 쪽지', sub: '바람에 날아왔다', obj: 'sign', desc: '바람에 날아온 쪽지가 얼굴에 철썩 붙었다. 「시험 족보 — 이거 맞히면 너도 천재」라고 적혀 있다.', choices: [
    { t: '쪽지의 문제를 푼다', tag: '📝 정답 시 🪙+8', run: () => quizTurn({ title: '날아온 쪽지', obj: 'sign', ch: 0, head: '구겨진 쪽지를 펼친다.', after: (ok, q) => ({ title: '날아온 쪽지', obj: 'sign', fx: applyFx(ok ? { gold: 8 } : {}), desc: (ok ? '⭕ 정답! 쪽지 뒷면에 동전이 테이프로 붙어 있다.' : '❌ 족보가 틀렸던 걸로 하자.') + `\n<span class="ex">해설: ${esc(q.ex)}</span>`, choices: [{ t: '쪽지를 접어 둔다', run: () => null }] }) }) },
    { t: '종이비행기로 접어 날린다', run: () => Object.assign(simple('날아온 쪽지', 'sign', '비행기가 멀리멀리 날아가 분수에 착지했다. 모아 할멈이 엄지를 든다.'), { fx: applyFx({ status: { 고양: 2 } }) }) }] })) },
  { w: 2, where: TOWNISH, run: () => popEvent(['꼬꼬꼬꼬꼬꼬!!', '푸드드득!', '(깃털이 날린다)'], () => R('닭 대탈출', 'sign', '시장 닭장 문이 열렸다! 닭 열두 마리가 사방으로 흩어진다. 주인 아저씨가 비명을 지른다.', [
    { t: '닭을 잡는다', tag: '민첩 13', run: chk('민첩', 13, '여덟 마리를 잡았다! 주인이 감격해서 달걀과 동전을 준다.', '닭 한 마리가 머리 위에 앉았다. 내려오지 않는다.', { gold: 10, heal: 3 }, { status: { 혼란: 1 } }, '닭 대탈출') },
    { t: '닭들이 어디로 갈지 예측한다', tag: '지능 12', run: chk('지능', 12, '닭들은 모이통 근처로 모인다 — 최빈값이다! 모이통을 들고 서 있으니 닭들이 알아서 돌아왔다.', '예측은 완벽했는데 닭들이 통계를 모른다.', { gold: 8, focus: 1 }, {}, '닭 대탈출') },
    { t: '구경한다', run: () => simple('닭 대탈출', 'sign', '열두 마리 중 열한 마리가 결국 잡혔다. 한 마리는 지금도 자유롭다고 한다.') }]), 4) },
  { w: 2, where: m => m.theme === 'forest', run: () => popEvent(['부스럭…', '크아앙!!', '(흙먼지)'], () => R('멧돼지 돌진', 'sign', '덤불을 뚫고 멧돼지가 돌진해 온다! 엄니가 번쩍인다.', [
    { t: '옆으로 굴러 피한다', tag: '민첩 13 · 실패 시 HP−3', run: chk('민첩', 13, '데굴! 멧돼지가 나무에 머리를 박고 비틀비틀 도망간다. 떨어진 도토리 사이에서 동전을 주웠다.', '엄니에 스쳤다. 아프다.', { gold: 6 }, { hp: -3 }, '멧돼지 돌진') },
    { t: '정면으로 맞선다', tag: '힘 15', run: chk('힘', 15, '쿵! 멧돼지를 맨손으로 멈춰 세웠다. 멧돼지가 존경의 눈빛을 보내고 떠난다.', '튕겨 나가 철푸덕.', { status: { 고양: 4 } }, { hp: -4 }, '멧돼지 돌진') },
    { t: '나무 위로 올라간다', run: () => Object.assign(simple('멧돼지 돌진', 'sign', '나무 위에서 멧돼지가 지나가길 기다렸다. 둥지 속에 누가 숨겨 둔 반짝이는 게 있다.'), { fx: applyFx({ gold: 4 }) }) }]), 8) },
  { w: 1, where: m => m.theme === 'forest', run: () => popEvent(['까르르르~', '✨ 반짝반짝 ✨'], () => R('요정의 장난', 'sign', '보이지 않는 누군가가 귓가에서 킥킥 웃는다. 머리 위로 반짝이 가루가 쏟아진다.', [
    { t: '반짝이를 털지 않고 그대로 둔다', tag: '운 11', run: chk('운', 11, '반짝이가 몸에 스며든다. 운이 좋아진 기분!', '반짝이가 코에 들어갔다. 에취! 에취!', { status: { 축복: 4 } }, { status: { 혼란: 2 } }, '요정의 장난') },
    { t: '「피오, 너지?」', run: () => Object.assign(simple('요정의 장난', 'sign', '「들켰다!」 버섯 뒤에서 요정이 튀어나와 꽃잎 하나를 주고 사라진다.'), { fx: applyFx({ heal: 5, affs: { fairy: 1 } }) }) }]), 0) },
  { w: 2, where: DUNG, run: () => popEvent(['딸깍…', '슈슉슉!!', '(화살 세 발)'], () => R('함정 발판', 'sign', '발밑에서 딸깍 소리가 났다. 벽에서 화살이 날아온다!', [
    { t: '납작 엎드린다', tag: '민첩 12 · 실패 시 HP−3', run: chk('민첩', 12, '화살이 머리 위로 지나갔다. 벽에 박힌 화살에 「n=3」이라고 쓰여 있다.', '한 발이 어깨를 스쳤다.', { focus: 1 }, { hp: -3, status: { 출혈: 1 } }, '함정 발판') },
    { t: '발을 떼지 않고 버틴다', tag: '정신 13', run: chk('정신', 13, '발을 떼지 않으니 화살이 멈췄다. 함정 설계자가 「떼는 순간 발사」로 만든 모양이다. 발판 밑에 보물이 있다.', '버티다가 다리가 저려서 떼 버렸다. 슈슉!', { gold: 12 }, { hp: -2 }, '함정 발판') }]), 6) },
  { w: 2, where: DUNG, run: () => popEvent(['…거기…', '…누구… 있어…?', '(메아리)'], () => R('어둠 속의 목소리', 'sign', '어둠 저편에서 목소리가 메아리친다. 「…표본이… 너무 작아… 너무…」', [
    { t: '「n을 키워!」 하고 외친다', run: () => Object.assign(simple('메아리', 'sign', '…잠시 정적. 그리고 멀리서 「…고마워…」. 발밑에 빛나는 조각이 굴러온다.'), { fx: applyFx({ focus: 2 }) }) },
    { t: '귀를 막고 지나간다', tag: '정신 11', run: chk('정신', 11, '흔들리지 않고 지나왔다. 마음이 단단해진다.', '목소리가 머릿속에서 계속 맴돈다… 표본이… 작아…', { status: { 고양: 3 } }, { status: { 저주: 1 } }, '메아리') }]), 0) },
  { w: 1, where: m => OUTSIDE(m) && typeof nightAmount === 'function' && nightAmount() > .3, run: () => popEvent(['슈우우우웅—', '☆ 반짝!'], () => R('별똥별', 'sign', '밤하늘을 가르며 별똥별이 떨어진다. 사람들이 일제히 하늘을 올려다본다.', [
    { t: '소원을 빈다', tag: '운 10', run: chk('운', 10, '소원이 이루어질 것 같은 기분. 주머니가 묵직해졌다…?', '소원을 다 말하기 전에 사라졌다.', { gold: 15, status: { 축복: 3 } }, {}, '별똥별') },
    { t: '「유성우의 시간당 개수는 포아송 분포!」', run: () => Object.assign(simple('별똥별', 'sign', '옆에 있던 천문학도가 눈을 반짝인다. 「λ는 얼마로 보세요?」 둘이서 밤새 토론했다.'), { fx: applyFx({ focus: 2, status: { 피로: 1 } }) }) }]), 0) },
  { w: 1, where: TOWNISH, run: () => popEvent(['펑!', '펑펑!!', '✨ 와아아— ✨'], () => R('깜짝 축제', 'sign', '광장 쪽 하늘에 불꽃이 터진다! 오늘이 「중심극한정리의 날」이란다. 사람들이 종 모양으로 줄을 서서 춤춘다.', [
    { t: '춤추는 줄에 끼어든다', run: () => Object.assign(simple('깜짝 축제', 'sign', '가운데 자리에 섰다. 가장 높이 뛰어야 하는 자리다. 신난다!'), { fx: applyFx({ status: { 고양: 5 }, heal: 4 }) }) },
    { t: '축제 노점에서 군것질한다 (4골드)', run: () => { if (S.gold < 4) return simple('깜짝 축제', 'sign', '구경만 해도 배부르다. 아니다, 배고프다.'); return Object.assign(simple('깜짝 축제', 'sign', '종 모양 솜사탕! 가운데가 제일 두껍다.'), { fx: applyFx({ gold: -4, heal: 10 }) }); } }]), 3) },
  { w: 1, where: m => m.id === 'lib1' || m.id === 'libB' || m.id === 'tower1', run: () => popEvent(['우르르르—', '와르르!!', '(책 산사태)'], () => R('책 산사태', 'sign', '책장 꼭대기에서 책 수십 권이 쏟아졌다! 맨 위에 펼쳐진 책: 「통계로 거짓말하는 법」.', [
    { t: '책을 다시 꽂아 둔다', tag: '지능 11', run: chk('지능', 11, '분류 번호대로 정확히 꽂았다. 사서가 감탄하며 열람 쿠폰(동전)을 준다.', '순서가 엉망이 됐다. 「쉿…」 하는 소리가 사방에서.', { gold: 6, focus: 1 }, { status: { 혼란: 1 } }, '책 산사태') },
    { t: '펼쳐진 책을 읽는다', run: () => Object.assign(simple('책 산사태', 'sign', '「축을 0에서 시작하지 않으면 작은 차이도 크게 보인다.」 …나쁜 지식을 얻었다. 아니, 막는 법을 배웠다.'), { fx: applyFx({ focus: 1 }) }) }]), 5) }
);
function maybeRandomEvent() {
  if (!S || dlgOpen || panelOpen || cutOpen || EVT || transitioning || window._tutOpen) return false;
  if (S.evOn === false) return false;
  S.evSteps = (S.evSteps || 0) + 1;
  if (S.evNext === undefined) S.evNext = 55 + (Math.random() * 45 | 0);
  if (S.evSteps < S.evNext) return false;
  const pool = EVENTS.filter(e => e.where(MAP));
  if (!pool.length) return false;
  let r = Math.random() * pool.reduce((s, e) => s + e.w, 0), ev = pool[0];
  for (const e of pool) { r -= e.w; if (r <= 0) { ev = e; break; } }
  S.evSteps = 0; S.evNext = 60 + (Math.random() * 70 | 0); // 돌발 이벤트: 대략 60~130걸음마다
  return ev.run();
}

// -------------------------------------------------------------------------
// ❓ 돌발 퀴즈 — 걷다 보면 출제자가 나타난다
// -------------------------------------------------------------------------
const QUIZ_FREQ = { off: 0, normal: [70, 120], often: [30, 60] };
function maybeQuizEncounter() {
  if (!S || dlgOpen || panelOpen || cutOpen || EVT || transitioning || window._tutOpen) return false;
  const f = QUIZ_FREQ[S.quizFreq || 'often']; if (!f) return false;
  S.qzSteps = (S.qzSteps || 0) + 1;
  if (S.qzNext === undefined) S.qzNext = f[0] + (Math.random() * (f[1] - f[0]) | 0);
  const dun = MAP.theme === 'dungeon' || MAP.theme === 'cave';
  if (S.qzSteps < S.qzNext * (dun ? .7 : 1)) return false;
  S.qzSteps = 0; S.qzNext = f[0] + (Math.random() * (f[1] - f[0]) | 0);
  const dinfo = DUNGEON_INFO[MAP.id];
  const who = dun ? 'skelly' : MAP.theme === 'interior' ? 'toby' : 'pigeon';
  const intro = who === 'pigeon' ? '푸드덕! 피존 2세가 머리 위로 날아와 쪽지를 떨어뜨린다. 「구구. 돌발 퀴즈. 맞히면 사례하겠소.」' : who === 'skelly' ? '덜그럭덜그럭! 어둠 속에서 스켈리가 튀어나온다. 「깜짝 퀴즈! 300년 동안 이것만 기다렸어!」' : '「저, 저기요!」 견습생 토비가 숨을 헐떡이며 달려온다. 「스승님 숙제인데요, 같이 풀어 주실래요?」';
  onoma(who === 'pigeon' ? '푸드덕!' : who === 'skelly' ? '덜그럭!' : '헉헉!', { size: 30, color: '#9fe8ff' });
  S.qStreak = S.qStreak || 0;
  openTurn(quizTurn({ who, ch: dinfo ? dinfo.ch : 0, head: `<b>❓ 돌발 퀴즈</b> · 연속 정답 ${S.qStreak}\n${intro}`, after: (ok, q) => {
    let fx;
    if (ok) { S.qStreak++; fx = applyFx({ gold: 4 + (Math.random() * 6 | 0), focus: S.qStreak % 3 === 0 ? 1 : 0 }); if (S.qStreak % 5 === 0) fx = fx.concat(applyFx({ item: 'potion' })); }
    else { S.qStreak = 0; fx = applyFx(dun ? { hp: -1 } : {}); }
    const t = npcTurn(who, (ok ? `⭕ 정답! ${S.qStreak % 5 === 0 ? '🔥 5연속 보너스!' : ''}` : '❌ 아깝다! 다음엔 맞힐 거야.') + `\n<span class="ex">해설: ${esc(q.ex)}</span>`);
    t.fx = fx; t.choices = [{ t: '계속 걷는다', run: () => null }, { t: '한 문제 더!', tag: '📝', run: () => { S.qzSteps = S.qzNext; maybeQuizEncounter(); return curTurn; } }];
    return t;
  } }));
  return true;
}

// -------------------------------------------------------------------------
// 🍺 모험가 길드 「표본의 잔」
// -------------------------------------------------------------------------
EXTRA_ROOMS.advguild = { name: '모험가 길드 「표본의 잔」', theme: 'interior', music: 'inn', npcs: ['barg', 'luna', 'rookie'], signs: ['g_rule'], extra: {}, rows: [
  '###################',
  '###################',
  '#k_B_B__1__B_B_q_H#',
  '#____QQQQQQQ______#',
  '#_________________#',
  '#_th__th____th__t_#',
  '#__________2______#',
  '#_th__th____th__th#',
  '#S______0________X#',
  '#n_______________n#',
  '########D##########'] };
LESSONS.g_rule = { t: '길드 수칙 액자', ch: 7, x: '하나. 표본 하나로 던전을 판단하지 말 것 (n ≥ 30 권장)\n둘. 귀무가설은 무죄다. 증거 없이 몬스터를 의심하지 말 것\n셋. 신뢰구간 95%는 「100번 중 95번」이지 「이번엔 95%」가 아니다\n넷. 길드비 연체 시 자유도 −1' };
const RANKS = [['F', 0], ['E', 4], ['D', 10], ['C', 18], ['B', 28], ['A', 42], ['S', 60]];
function guildPts() { return (S.guildPts || 0) + Object.keys(S.solvedQ || {}).length + dunCleared().length * 6; }
function guildRank() { const p = guildPts(); let r = RANKS[0]; RANKS.forEach(x => { if (p >= x[1]) r = x; }); const nx = RANKS[RANKS.indexOf(r) + 1]; return { r: r[0], p, next: nx }; }
function bountyTurn() {
  const today = todayKey(); if (!S.bounty || S.bounty.k !== today) S.bounty = { k: today, n: 0 };
  if (S.bounty.n >= 5) return npcTurn('luna', '「오늘 의뢰는 다 끝났어요! 내일 새 의뢰가 들어와요~」');
  const ch = [7, 8, 9][Math.random() * 3 | 0];
  const kinds = { 7: ['약초 무게 추정 의뢰', '우물 깊이 측량 의뢰', '여론조사 의뢰'], 8: ['가짜 금화 감별 의뢰', '저울 사기 고발 의뢰', '물약 효능 검증 의뢰'], 9: ['주사위 공정성 조사', '길드원 취향 분할표 작성', '몬스터 출몰 분포 조사'] }[ch];
  const nm = kinds[Math.random() * 3 | 0];
  return bossTrial('luna', ch, 2, 2, { gold: 18 }, `「${nm} 완료! 보수 받으세요~」`, {}, '「아쉽네요. 의뢰인이 다시 해 달래요…」', false, ok => { if (ok) { S.bounty.n++; S.guildPts = (S.guildPts || 0) + 2; } });
}
Object.assign(NPCS, {
  barg: { n: '바르그', title: '길드마스터', map: 'advguild', pic: 'gamli', mood: 'smile', aff: 0,
    intro: '맥주잔을 든 드워프가 테이블을 쾅 친다. 「어서 와라! 「표본의 잔」에 온 걸 환영한다. 여기선 칼보다 계산이 빠른 놈이 살아남지!」',
    again: ['「랭크는 접수원 루나한테 물어봐. 의뢰를 풀수록 오른다.」', '바르그가 수염에 묻은 거품을 닦는다. 「내 젊을 땐 n = 1로 드래곤 잡았어. 운이었지.」'],
    topic: '모험이란 결국 불확실성과의 싸움이지. 그러니 구간으로 말하는 버릇을 들여라.',
    acts: [
      { t: '무용담을 들려준다', req: S => dunCleared().length > 0, ok: S => `「${dunCleared().map(d => DUNGEON_INFO[d].n).join(', ')}을(를) 돌파했다고?!」 길드원들이 환호한다. 바르그가 한 잔 산다.`, okFx: S => flag('once_barg_tale_' + dunCleared().length) ? { heal: 3 } : { gold: 20 * dunCleared().length, heal: 6, flag: 'once_barg_tale_' + dunCleared().length } },
      { t: '팔씨름을 한다', s: '힘', dc: 14, ok: '쾅! 드워프의 팔이 넘어갔다. 길드가 뒤집어진다. 「크하하! 좋아, 오늘 술은 내가 산다!」', fail: '바르그의 팔은 강철 같다. 손등이 테이블에 붙었다.', okFx: { gold: 10, aff: 2, status: { 고양: 3 } }, failFx: { hp: -1 } },
      { t: '길드마스터의 시험 (3문제 중 2개)', tag: '📝 랭크 포인트 +5', once: 'barg_trial', go: () => bossTrial('barg', 0, 3, 2, { gold: 35, flag: 'once_barg_trial' }, '「합격이다! 넌 이제 진짜 모험가야.」', '「아직 멀었다. 표지판부터 더 읽고 와.」', false, ok => { if (ok) S.guildPts = (S.guildPts || 0) + 5; }) },
      LEAVE] },
  luna: { n: '루나', title: '길드 접수원', map: 'advguild', pic: 'daisy', mood: 'happy', aff: 0,
    intro: '카운터 너머 접수원이 방긋 웃는다. 「모험가 길드에 오신 걸 환영해요! 등록하시겠어요?」',
    again: ['「오늘도 의뢰가 가득해요!」', '「랭크가 오르면 칭호가 바뀌어요. S랭크는 아직 아무도 없어요!」'],
    topic: '의뢰서는 매일 아침 갱신돼요. 하루 5건까지!',
    acts: [
      { t: '모험가 카드를 확인한다', ok: () => { const g = guildRank(); return `<div class="lesson" style="text-align:center"><b>🪪 모험가 카드</b><br>${esc(S.name)} · 랭크 <b style="font-size:22px;color:#7a2a3a">${g.r}</b><br>포인트 ${g.p}${g.next ? ` / 다음 ${g.next[0]}랭크 ${g.next[1]}` : ' (최고 랭크!)'}<br>읽은 표지판 ${signCount()} · 푼 문제 ${Object.keys(S.solvedQ).length} · 던전 ${dunCleared().length}/3</div>「문제를 풀고, 의뢰를 하고, 던전을 깨면 포인트가 쌓여요!」`; }, okFx: { aff: 0 } },
      { t: '오늘의 의뢰를 받는다 (2문제)', tag: '📝 보수 18G · 하루 5건', go: () => bountyTurn() },
      { t: '던전 정보를 묻는다', ok: () => `「현상수배 게시판이에요!」\n${Object.keys(DUNGEON_INFO).map(d => { const i = DUNGEON_INFO[d]; return `${flag('clear_' + d) ? '✅' : signCount() >= i.need ? '🔓' : '🔒'} <b>${i.n}</b> (${i.dir}) · 표지판 ${i.need}개 · ${i.ch}장`; }).join('\n')}\n\n「지금 읽은 표지판은 ${signCount()}개예요.」` },
      LEAVE] },
  rookie: { n: '피트', title: '신입 모험가', map: 'advguild', pic: 'neil', wander: 2, mood: 'surprise', aff: 0,
    intro: '헐렁한 갑옷의 신입이 다가온다. 「서, 선배님! 저 내일 첫 던전인데요, 이거 하나만 알려 주세요!」',
    again: ['「선배님! 또 질문 있어요!」', '「표준편차랑 표준오차 차이를 오늘 처음 알았어요. 인생이 바뀌었어요.」'],
    topic: '저는 아직 F랭크예요. 근데 F검정은 2학기에 안 나온대요!',
    acts: [
      { t: '신입의 질문에 답해 준다', quiz: { ch: 0, okFx: { gold: 6, aff: 1 }, failFx: { aff: -1 }, okText: '「우와! 메모할게요!」 피트가 감사의 표시로 동전을 내민다.', failText: '「…어? 그거 아닌 것 같은데요?」 신입에게 지적당했다.' } },
      { t: '선배답게 조언한다', s: '설득', dc: 10, ok: '「표본은 크게, 결론은 겸손하게.」 피트가 눈물을 글썽인다.', fail: '말이 꼬였다. 「n이 크면… 음… 아무튼 좋아.」', okFx: { aff: 2 }, failFx: {} },
      LEAVE] }
});

// -------------------------------------------------------------------------
// 💡 이지 쌤 — 표지판을 일정 개수 모으면 갑자기 뛰어와서 쉽게(살짝 저렴하게) 설명해 줌
// -------------------------------------------------------------------------
NPCS.easy = { n: '이지 쌤', title: '갑자기 나타나는 설명충', map: null, pic: 'nobody', mood: 'happy', aff: 0, intro: '', again: [''], topic: '어려운 건 쉽게, 쉬운 건 웃기게!', acts: [LEAVE] };
const EASY = [
  { k: ['신뢰구간', '구간'], t: '신뢰구간', x: '친구가 「나 7시에 도착」 하면 믿냐? 안 믿지. 근데 「6시 50분 ~ 7시 30분 사이」라고 하면? 그건 좀 믿을 만하지. 그게 신뢰구간이야.\n\n95%는 「이런 식으로 약속 시간 잡으면 100번 중 95번은 그 사이에 온다」는 뜻. 나머지 5번? 걔가 화장실에서 못 나온 거야.' },
  { k: ['표본', '모집단'], t: '표본과 모집단', x: '라면 간 볼 때 냄비 통째로 들이키냐? 한 숟갈만 떠먹지. 냄비 = 모집단, 숟갈 = 표본.\n\n근데 안 젓고 위에서만 뜨면 기름만 먹고 「느끼하네」 하잖아? 그게 편향이야. 그래서 무작위로, 잘 저어서 떠야 한다.' },
  { k: ['표준오차', 'σ/√n', 's/√n'], t: '표준오차 σ/√n', x: '한 사람 방귀 소리는 크기가 들쭉날쭉하잖아. 근데 100명 방귀 소리 평균 내면? 꽤 일정해. 사람이 많을수록 평균은 덜 흔들린다.\n\n단, √n이라서 흔들림 반으로 줄이려면 사람을 4배 모아야 해. 방귀 모으는 거 생각보다 힘들다.' },
  { k: ['t분포', 't(', '소표본', 't₀'], t: 't분포', x: '친구 세 명한테 물어보고 「여기 맛집 국룰」이라고 확신하면 안 되지? 표본이 적으면 쫄아서 넉넉하게 잡아야 해.\n\nt분포는 그 쫄보 버전 정규분포야. 꼬리가 두꺼워서 「혹시 모르니까~」 하고 구간을 넓게 잡아. 사람이 많아지면(자유도↑) 쫄보 탈출, 정규분포랑 똑같아져.' },
  { k: ['자유도', 'df', 'n − 1', 'n−1'], t: '자유도', x: '치킨 세 조각 남았는데 세 명이 하나씩 먹어. 첫째가 다리, 둘째가 날개 집어 가면 셋째는? 선택권 없음. 남은 퍽퍽살 먹어야 돼.\n\n자유롭게 고른 놈은 두 명 → 자유도 2. 평균 같은 「총합 규칙」이 하나 있으면 하나가 저절로 정해져서 n − 1이 되는 거야.' },
  { k: ['귀무가설', 'H₀', '대립가설'], t: '귀무가설 vs 대립가설', x: '엘리베이터에서 냄새가 나. 귀무가설: 「옆 사람은 방귀 안 뀌었다」 (무죄 추정). 대립가설: 「너지?」\n\n냄새(증거)가 충분히 심해야 귀무가설을 기각하고 「너지」라고 할 수 있어. 애매하면? 그냥 참는 거야. 그게 「기각할 수 없다」.' },
  { k: ['유의수준', 'α'], t: '유의수준 α', x: '냄새가 얼마나 나야 범인 지목할 건지 미리 정하는 기준이 α야.\n\nα = 5%면 「진짜 억울한 사람을 범인으로 몰 확률, 5%까지는 감수한다」는 뜻. 1%로 하면 더 신중해지는 대신 진짜 범인도 놓치기 쉬워져.' },
  { k: ['p값'], t: 'p값', x: 'p값 = 「저 사람이 진짜 무고하다면, 지금만큼 냄새가 날 확률」.\n\n그 확률이 0.001이면? …너야. 그냥 너야. p값이 α보다 작으면 기각, 「너 맞지」 확정.' },
  { k: ['제1종', '제2종', '오류', 'β'], t: '제1종 · 제2종 오류', x: '1종 오류: 안 뀐 사람한테 「너 뀌었지!」 → 억울함 폭발.\n2종 오류: 뀐 놈을 그냥 보내 줌 → 범인은 웃고 있다.\n\n하나 줄이면 다른 하나가 커져. 둘 다 줄이고 싶으면? 코를 늘려(표본 크기 n↑).' },
  { k: ['검정력', '1 − β'], t: '검정력', x: '냄새 잘 맡는 개코일수록 범인을 잘 잡지? 그게 검정력(1 − β).\n\n개코가 되려면? 사람을 많이 모아서(n↑) 냄새를 확실히 맡으면 된다.' },
  { k: ['양측', '단측', '우측', '좌측', '기각역'], t: '양측 vs 단측', x: '「라면 양이 표시랑 다르다」 → 많아도 문제, 적어도 문제 → 양측검정.\n「라면 양이 적다 (사기다!)」 → 적을 때만 문제 → 단측검정.\n\n화날 방향이 한쪽이면 단측, 양쪽이면 양측. 기각역은 화나는 쪽에 둔다.' },
  { k: ['카이제곱', 'χ²', '(O − E)'], t: '카이제곱', x: '편의점 삼각김밥 4종이 똑같이 팔릴 줄 알았는데(기대), 참치마요만 동났어(관측).\n\n기대랑 실제가 얼마나 어긋났는지 제곱해서 다 더한 게 카이제곱. 클수록 「어? 이거 뭔가 있는데?」. 제곱했으니 마이너스는 없어서 항상 오른쪽만 본다.' },
  { k: ['기대도수', '관측도수', 'E = n'], t: '기대도수', x: '공정한 주사위 60번 굴리면 각 눈이 10번씩 나와야지? 그게 기대도수.\n\n근데 6이 25번 나왔다? 주사위 주인 집 냉장고 뒤져 봐. 자석 나온다.' },
  { k: ['독립성', '동질성', '분할표'], t: '독립성 vs 동질성', x: '독립성: 우리 반 애들한테 「게임 시간」이랑 「성적」을 같이 물어봐서 관계 있나 보기. (한 집단, 두 변수)\n동질성: 1반, 2반, 3반에서 따로 뽑아서 「민트초코 좋아하는 비율」이 반마다 같은지 보기. (여러 집단, 한 변수)\n\n계산은 똑같아. 질문만 달라.' },
  { k: ['표본 크기', '필요한', 'n ≥'], t: '필요한 표본 크기', x: '오차를 반으로 줄이고 싶어? 사람을 4배로 불러야 해.\n\n그리고 계산하다 138.3명 나오면 무조건 올림해서 139명. 0.3명 부르면 다리만 오냐?' },
  { k: ['중심극한', 'n ≥ 30'], t: '중심극한정리', x: '단톡방 하나하나 보면 다 미친놈들이야. 근데 30개 방의 평균을 내면? 놀랍게도 평범한 종 모양이 돼.\n\n원래 분포가 어떻게 생겼든 표본이 크면 평균은 정규분포를 따른다. 이게 통계의 치트키.' },
  { k: ['Z =', 'Z₀', '표준정규', '정규분포', '1.96'], t: 'Z 점수', x: 'Z는 「평균에서 표준편차 몇 칸 떨어졌냐」야.\n\nZ = 0이면 평범, Z = 2면 「오 좀 특이한데?」, Z = 3이면 우리 반에 혼자 2m인 애. 1.96은 「상위·하위 2.5%씩 잘라내는 선」이라 자주 나와.' },
  { k: ['짝지은', '쌍체', 'd̄'], t: '쌍체비교', x: '다이어트 전후 몸무게 비교할 때, 내 전 몸무게랑 남의 후 몸무게 비교하면 싸움 나지?\n\n같은 사람 「전 − 후」 차이만 뽑아서 그 차이의 평균이 0인지 보는 게 쌍체비교. 짝꿍끼리만 비교한다!' },
  { k: ['합동', 'sₚ', 'p̄'], t: '합동분산 · 합동비율', x: '두 반 점수 퍼짐이 비슷하다고 치면, 따로 계산하지 말고 두 반 자료를 한 솥에 넣고 끓여서 분산 하나를 뽑아. 그게 합동분산.\n\n재료가 많을수록 국물이 진하다(추정이 정확하다).' }
];
const EASY_AT = [3, 6, 10, 15, 20, 26, 32, 38, 44, 50];
function easyCandidates() {
  S.easyDone = S.easyDone || {};
  const readTxt = Object.keys(S.read).map(id => LESSONS[id] ? LESSONS[id].t + ' ' + LESSONS[id].x : '').join('\n');
  return EASY.filter(e => !S.easyDone[e.t] && e.k.some(k => readTxt.includes(k)));
}
function easyTurn(extra) {
  const c = easyCandidates();
  if (!c.length) return { who: 'easy', mood: 'happy', desc: '「…어? 벌써 다 설명했네? 너 천재냐? 다음에 또 올게!」 이지 쌤이 왔던 속도 그대로 사라진다.', choices: [{ t: '…누구세요?', run: () => null }] };
  const e = c[0]; S.easyDone[e.t] = true;
  return { who: 'easy', mood: 'happy', desc: `${extra ? '' : '헉헉… 「잠깐만! 너 방금 표지판 읽었지? 딱 보니까 이해 하나도 안 됐지? 내가 쉽게 알려 줄게!」\n\n'}<b>💡 ${e.t}, 쉽게 말하면</b>\n${e.x}`,
    fx: applyFx({ focus: 1 }),
    choices: [
      c.length > 1 ? { t: '하나 더 알려 줘요!', run: () => easyTurn(true) } : { t: '오… 이해됐다', run: () => null },
      { t: '방금 거 문제로 확인하기', tag: '📝 정답 시 🪙+8', run: () => quizTurn({ who: 'easy', ch: 0, head: '「자, 이해했는지 볼까?」', after: (ok, q) => ({ who: 'easy', mood: ok ? 'happy' : 'surprise', desc: (ok ? '「봐! 쉽지? 내가 이렇게 유능하다니까.」' : '「…괜찮아. 나도 처음엔 틀렸어. 사실 지금도 가끔 틀려.」') + `\n<span class="ex">해설: ${esc(q.ex)}</span>`, fx: applyFx(ok ? { gold: 8 } : {}), choices: [{ t: '고마워요, 이지 쌤', run: () => null }] }) }) },
      { t: '근데… 누구세요?', run: () => ({ who: 'easy', mood: 'sly', desc: '「나? 원래는 광장에서 「아무 의미 없는 남자」로 살았지. 근데 표지판을 읽는 너를 보고 깨달았어. 내 인생의 의미는… 설명이었어!」\n\n그는 바람처럼 사라졌다. 표지판을 더 읽으면 또 나타날 것 같다.', choices: [{ t: '…', run: () => null }] }) }] };
}
function checkEasy() {
  const n = signCount();
  S.easySeen = S.easySeen || 0;
  const hit = EASY_AT.filter(a => a <= n && a > S.easySeen);
  if (!hit.length || !easyCandidates().length) return false;
  S.easySeen = n;
  return runnerEvent('easy', ['잠깐마아아안—!!', '끼이익!', '(급정거)'], () => easyTurn(false)) || (openTurn(easyTurn(false)), true);
}
// 대화창이 닫힌 직후
function afterDlgHook() {
  if (!S || dlgOpen || panelOpen || cutOpen || EVT || transitioning) return;
  checkEasy();
}

// -------------------------------------------------------------------------
// 🖼 새 인물은 모두 assets/portraits 의 기존 초상화를 쓴다 (pic) + 도트도 그 인물 모습으로
// -------------------------------------------------------------------------
const PIC = { stokas: 'infinity', aegis: 'beta', sigma: 'elena', vivian: 'prime', g_w1: 'kai', g_w2: 'confi', g_wb: 'null', g_s1: 'skelly', g_s2: 'kai', g_sb: 'outlier', g_e1: 'kai', g_e2: 'mimic', g_eb: 'troll' };
for (const id in PIC) NPCS[id].pic = PIC[id];
const LOOK_FROM = { stokas: { cloth: '#7a2a3a', type: 'robe', accent: '#ffd84d' }, aegis: { type: 'armor', hat: 'helmet', accent: '#2f7ae0' }, sigma: {}, vivian: { hat: 'crown' }, barg: {}, luna: {}, rookie: { type: 'armor' }, easy: {}, g_s1: null, g_sb: null };
for (const id in LOOK_FROM) { const n = NPCS[id]; if (!n || !LOOK_FROM[id]) continue; const src = NPCS[n.pic]; if (src && src.look) n.look = Object.assign({}, src.look, LOOK_FROM[id]); }
NPCS.g_sb.look = NPCS.outlier.look; NPCS.g_sb.big = true;
NPCS.g_s1.look = NPCS.skelly.look;
NPCS.g_eb.look = { kind: 'boss' };
for (const id of ['barg', 'luna', 'rookie', 'easy']) NPCS[id].id = id;
for (const id in NPCS) { const n = NPCS[id]; n.id = id; if (!n.again) n.again = [n.intro]; }

// -------------------------------------------------------------------------
// 😈 편향단 — 끈질기게 따라다니는 3인조 (바이아 · 스큐 · 피냥)
// -------------------------------------------------------------------------
Object.assign(NPCS, {
  bia: { n: '바이아', title: '편향단 간부', map: null, pic: 'kiara', mood: 'sly', aff: 0, intro: '', again: [''], topic: '편향은 아름다워!', acts: [LEAVE] },
  skew: { n: '스큐', title: '편향단 간부', map: null, pic: 'alpha', mood: 'sly', aff: 0, intro: '', again: [''], topic: '분포는 한쪽으로 기울어야 제맛이지!', acts: [LEAVE] },
  pinyang: { n: '피냥', title: '편향단 마스코트 · 말하는 고양이', map: null, pic: 'pivalu', mood: 'sly', aff: 0, intro: '', again: [''], topic: '냐옹. p값은 0.049가 될 때까지 다시 돌리는 거다옹.', acts: [LEAVE] }
});
['bia', 'skew', 'pinyang'].forEach(id => { const n = NPCS[id]; n.id = id; n.look = Object.assign({}, NPCS[n.pic].look, id === 'bia' ? { cloth: '#2a1a33', accent: '#ff5d7a' } : id === 'skew' ? { cloth: '#2a1a33', accent: '#ff5d7a', type: 'tunic' } : {}); });
ACHS.bias3 = ['편향 퇴치 전문가', '편향단을 세 번 날려 보냈다'];
const BIAS_MOTTO = [
  ['bia', '「표본을 비틀어라! 세상을 한쪽으로!」', null, { hop: 'bia' }],
  ['skew', '「평균을 끌어당겨라! 꼬리를 길게!」', null, { hop: 'skew' }],
  ['bia', '「우리는 아름다운 편향의 사도, 바이아!」', 'zoom'],
  ['skew', '「그리고 오른쪽으로 치우친 남자, 스큐!」'],
  ['pinyang', '「…그리고 p값 0.049의 고양이, 피냥이다옹!」', 'shake', { hop: 'pinyang' }],
  ['bia', '「편향단! 귀무가설은 우리가 정한다!」'] ];
const BIAS_PLOTS = [
  { k: '표본 조작', intro: [[null, '갑자기 사방에서 보라색 연기가 피어오른다. 「크크크…」 하는 웃음소리.', 'flash']], scheme: [
    ['skew', '「이 도시 사람들 평균 키를 쟀는데 말이야… 농구부만 골라서 쟀지! 평균 195cm!」'],
    ['bia', '「이걸로 「벨레스타인은 거인족」이라는 논문을 쓸 거야! 왕국 연구비는 우리 거야!」'],
    ['pinyang', '「방해되는 건 너뿐이다옹. 네 지갑도 표본으로 가져가겠다옹!」'] ] },
  { k: 'p-해킹', intro: [[null, '「거기 서라!」 뒤에서 누군가 소리친다. 익숙한 목소리다…', 'shake']], scheme: [
    ['bia', '「동전이 공정하지 않다는 걸 증명하려고 검정을 스무 번 돌렸어!」'],
    ['skew', '「열아홉 번은 망했지만… 한 번 p = 0.04가 나왔다고! 그것만 발표하면 되지!」'],
    ['pinyang', '「α = 0.05로 스무 번이면 한 번쯤 걸리는 게 당연하다는 건… 비밀이다옹.」'] ] },
  { k: '체리피킹', intro: [[null, '과일 바구니를 든 수상한 3인조가 길을 막는다.', 'flash']], scheme: [
    ['skew', '「이 물약, 효과가 대단해! 나은 사람 후기만 모아 왔거든!」'],
    ['bia', '「안 나은 사람 후기? 그런 건 버렸지. 표본은 고르는 맛이야!」'],
    ['pinyang', '「물약 한 병에 50골드다옹. 너한테는 특별히 60골드다옹.」'] ] },
  { k: '생존 편향', intro: [[null, '쿵! 쿵! 북소리와 함께 깃발을 든 3인조가 나타난다.', 'shake']], scheme: [
    ['bia', '「던전에서 살아 돌아온 모험가들은 다 우리 부적을 갖고 있었어!」'],
    ['skew', '「돌아오지 못한 사람들이 뭘 가졌는지는… 물어볼 수가 없잖아? 크크.」'],
    ['pinyang', '「그러니까 부적 사라다옹. 안 사면 저주한다옹.」'] ] },
  { k: '평균의 함정', intro: [[null, '「모험가아아아!」 지붕 위에서 3인조가 뛰어내린다. 착지에 실패한다.', 'shake']], scheme: [
    ['skew', '「우리 편향단 평균 연봉은 1억 골드다! 대단하지?」'],
    ['bia', '「…보스 연봉이 3억이고 우린 둘 다 0이지만. 평균은 평균이잖아!」'],
    ['pinyang', '「중앙값을 물어보면 울 거다옹.」'] ] }
];
function biasEncounter() {
  if (!S || !flag('met_bruno')) return false;
  S.biasN = S.biasN || 0;
  const plot = BIAS_PLOTS[S.biasN % BIAS_PLOTS.length];
  const first = S.biasN === 0;
  const lines = plot.intro.concat(first ? [['bia', '「거기 너! 요즘 표지판 읽고 다닌다는 모험가!」', null, { walk: ['bia', 2, 0] }]] : [['skew', '「또 만났구나! 이번엔 다르다!」', null, { walk: ['skew', 2, 0] }]])
    .concat(BIAS_MOTTO).concat(plot.scheme)
    .concat([[null, `😈 편향단의 「${plot.k}」 작전! 문제로 그들의 논리를 무너뜨리자.`]]);
  playCut({ id: 'bias_' + S.biasN + '_' + Date.now(), map: MAP.id, lines, onEnd: () => openTurn(biasDuelTurn(plot)) });
  return true;
}
function biasDuelTurn(plot) {
  return { who: 'bia', mood: 'sly', desc: `<b>😈 편향단 — 「${plot.k}」</b>\n「자, 우리의 완벽한 통계를 반박할 수 있으면 해 봐!」\n\n<span class="ex">문제 3개 중 2개를 맞히면 편향단을 날려 보낸다. 지면 골드를 뺏긴다.</span>`,
    choices: [
      { t: '논리로 반박한다 (3문제 중 2개)', tag: '📝 승리 시 🪙+25', run: () => bossTrial('bia', 0, 3, 2, { gold: 25 }, '「이, 이럴 수가! 우리 통계가 기각당했어!」', {}, '「크하하! 편향의 승리다! 지갑은 접수!」', false, ok => biasResult(ok)) },
      { t: '「그거 표본이 편향됐잖아!」 하고 외친다', tag: '설득 14', run: () => { const r = check('설득', 14); biasResult(r.ok); return Object.assign(npcTurn('skew', r.ok ? '「…헉. 반박할 수가 없어.」 주변 시민들이 웅성거린다. 「맞아, 농구부만 쟀잖아!」' : '「무슨 소리야~ 우리 n은 엄청 커!」 (편향된 표본은 n이 커도 편향되어 있다.)'), { roll: r.line, fx: applyFx(r.ok ? { gold: 15 } : {}) }); } },
      { t: '도망친다', tag: '민첩 12', run: () => { const r = check('민첩', 12); if (!r.ok) biasResult(false); else { S.biasN++; S.biasNext = undefined; } return Object.assign(npcTurn('pinyang', r.ok ? '골목으로 휙! 뒤에서 「야! 비겁하다옹!」 소리가 멀어진다.' : '피냥이 발을 건다. 철푸덕. 「어딜 가냐옹~」'), { roll: r.line }); } }] };
}
function biasResult(win) {
  S.biasN = (S.biasN || 0) + 1; S.biasNext = undefined;
  if (win) {
    S.biasWin = (S.biasWin || 0) + 1; if (S.biasWin >= 3) ach('bias3');
    setTimeout(() => { if (typeof onoma !== 'function') return; onoma('또 기각당했다아아아—!!', { x: 50, y: 22, size: 30, color: '#ff9ec0', rot: -8 }); setTimeout(() => onoma('★ 반짝', { x: 72, y: 10, size: 26, color: '#ffe066', rot: 12 }), 500); shake(5); }, 600);
  } else {
    const lost = Math.min(S.gold, 8 + Math.floor(S.gold * .15));
    S.gold -= lost; syncHUD();
    setTimeout(() => { onoma(`💸 −${lost}G`, { size: 30, color: '#ff8fa3' }); onoma('크하하하하!', { x: 60, y: 26, size: 28, color: '#d8b0ff' }); }, 600);
  }
}
// 걷다 보면 가끔 나타남 (마을·숲·던전, 120~200걸음마다)
function maybeBias() {
  if (!S || S.evOn === false || !flag('met_bruno') || dlgOpen || panelOpen || cutOpen || EVT || transitioning || window._tutOpen) return false;
  if (MAP.theme === 'interior') return false;
  S.biasSteps = (S.biasSteps || 0) + 1;
  if (S.biasNext === undefined) S.biasNext = (S.biasN ? 130 : 60) + (Math.random() * 80 | 0);
  if (S.biasSteps < S.biasNext) return false;
  S.biasSteps = 0; S.biasNext = 130 + (Math.random() * 80 | 0);
  return biasEncounter();
}

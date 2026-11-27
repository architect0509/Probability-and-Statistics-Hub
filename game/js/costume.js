// =========================================================================
// 👗 캐릭터 디자인 · 의상 상자 · 옷장
//   · 새 모험을 시작하면 수인 주인공의 외모를 직접 꾸민다 (나중에 옷장에서 다시 꾸밀 수 있음)
//   · 곳곳의 「의상 상자」(한산한 곳 위주)를 열면 의상을 얻고, 가방 → 옷장에서 갈아입는다
// =========================================================================
const DESIGN = {
  gender: [['m', '남자'], ['f', '여자']],
  beast: [['fox', '여우'], ['wolf', '늑대'], ['cat', '고양이']],
  fur: ['#c8642a', '#e09040', '#f2cf8a', '#8a5a3a', '#4a3a3a', '#9a9aa8', '#f4f1ea', '#2a2a30', '#e8a0b8', '#6a8ad0'],
  tip: ['#fff4e6', '#2a2a30', '#f2cf8a', '#ffb3c6'],
  hair: ['#5a3a2a', '#2a2020', '#f2cf5a', '#d8322c', '#f07a2a', '#f58ab0', '#8a6ae0', '#3a62d8', '#3a9a5a', '#e8e8f0', '#9a9aa8', '#4fd0d0'],
  style: [['short', '짧은 머리'], ['buzz', '스포츠머리'], ['twoblock', '투블럭'], ['spiky', '삐죽 머리'], ['messy', '부스스'], ['ahoge', '바보털'], ['mohawk', '닭벼슬'], ['afro', '뽀글 파마'], ['mekakure', '한쪽 눈 가림'],
    ['shortbob', '짧은 단발'], ['bob', '단발'], ['hime', '히메컷'], ['long', '긴 머리'], ['wavy', '웨이브'], ['pony', '포니테일'], ['hipony', '하이 포니테일'], ['sidetail', '사이드 테일'], ['twin', '양갈래'], ['braid', '땋은 머리'], ['bun', '똥머리'], ['dbun', '양 똥머리']],
  eyeShape: [['round', '동그란 눈'], ['big', '왕눈'], ['sparkle', '반짝이는 눈'], ['star', '별빛 눈'], ['droopy', '처진 눈'], ['sharp', '날카로운 눈'], ['angry', '화난 눈'], ['focus', '집중한 눈'], ['cat', '고양이 눈'],
    ['sleepy', '졸린 눈'], ['tired', '피곤한 눈'], ['smile', '웃는 눈'], ['wink', '윙크'], ['closed', '실눈'], ['teary', '글썽 눈'], ['dot', '점 눈'], ['heart', '하트 눈'], ['dizzy', '어질어질'], ['blank', '멍한 눈']],
  eye: ['#c98a2a', '#3a7ad0', '#3a9a4a', '#c03030', '#8a4ac0', '#2a2a3a', '#e0b020'],
  skin: SKIN.slice(0, 5),
  cloth: ['#4f7fd6', '#c0405a', '#3f8a4a', '#8a5ad0', '#e0a030', '#3a3a46', '#f4f1ea', '#e87aa0', '#2a9a9a', '#8a5a3a']
};
function defaultDesign() { return { gender: 'm', beast: 'fox', fur: '#c8642a', tailTip: '#fff4e6', hair: '#5a3a2a', hairStyle: 'short', eyeShape: 'round', eye: '#c98a2a', skin: SKIN[0], cloth: '#4f7fd6' }; }
function randomDesign() {
  const r = a => a[Math.random() * a.length | 0];
  return { gender: r(DESIGN.gender)[0], beast: r(DESIGN.beast)[0], fur: r(DESIGN.fur), tailTip: r(DESIGN.tip), hair: r(DESIGN.hair), hairStyle: r(DESIGN.style)[0], eyeShape: r(DESIGN.eyeShape)[0], eye: r(DESIGN.eye), skin: r(DESIGN.skin), cloth: r(DESIGN.cloth) };
}

// ---- 의상 (look 덮어쓰기). 병맛 의상 다수 ----
const COSTUMES = [
  { id: 'travel', n: '기본 여행복', e: '🧳', d: '처음부터 입고 있던 옷. 무난함 그 자체. 표준편차 0.', look: {} },
  { id: 'knight', n: '은빛 기사 갑옷', e: '🛡️', d: '반짝반짝. 걸을 때마다 철컹철컹 소리가 난다. 몰래 다니기는 포기하자.', look: { type: 'armor', cloth: '#8a96b0', accent: '#d9a84a' } },
  { id: 'wizard', n: '대마법사 로브', e: '🧙', d: '별무늬 로브와 뾰족 모자. 주문은 아직 하나도 모른다.', look: { type: 'robe', cloth: '#3a3a8a', accent: '#e1b13d', hat: 'wizard', hatColor: '#2a2a6a', hatBand: '#e1b13d' } },
  { id: 'hunter', n: '숲 사냥꾼 복장', e: '🏹', d: '깃털 모자가 포인트. 사냥 실력은 깃털 길이와 무관하다.', look: { type: 'tunic', cloth: '#3f6a3a', accent: '#a07a4a', hat: 'hunter', hatColor: '#3f6a3a' } },
  { id: 'royal', n: '왕족의 예복', e: '👑', d: '빨간 망토, 털 칼라, 금관. 입으면 왠지 말끝이 「~하노라」가 된다.', look: { type: 'robe', cloth: '#b8282a', accent: '#e1b13d', collar: '#f4f4f8', hat: 'crown' } },
  { id: 'priest', n: '신전 사제복', e: '😇', d: '머리 위에 후광이 떠 있다. 어떻게 붙어 있는지는 신전도 모른다.', look: { type: 'robe', cloth: '#f4f1ea', accent: '#d9a84a', hat: 'halo' } },
  { id: 'ninja', n: '그림자 닌자복', e: '🥷', d: '얼굴을 가렸다. 그런데 꼬리가 다 보인다.', look: { type: 'tunic', cloth: '#25222c', accent: '#c03040', mask: '#25222c', hat: 'band', hatBand: '#c03040' } },
  { id: 'pirate', n: '해적 선장 코트', e: '🏴‍☠️', d: '빨간 두건과 코트. 「표본은 바다처럼 넓게 뽑아라!」', look: { type: 'tunic', cloth: '#2a2a46', accent: '#e1b13d', hat: 'bandana', hatColor: '#c8282a' } },
  { id: 'scholar', n: '대도서관 연구복', e: '🤓', d: '동그란 안경과 갈색 조끼. 착용 시 아는 척 지수 +30%.', look: { type: 'tunic', cloth: '#7a5a3a', accent: '#efe3c8', glasses: true } },
  { id: 'engineer', n: '발명가 작업복', e: '🔧', d: '이마에 고글. 기름때가 묻어 있어야 진짜다.', look: { type: 'tunic', cloth: '#6a5a3a', accent: '#c9963a', goggles: true } },
  // ---- 병맛 ----
  { id: 'banana', n: '바나나 전신 타이츠', e: '🍌', d: '머리부터 발끝까지 노랗다. 원숭이들의 시선이 느껴진다. 미끄러지지 않게 조심.', silly: true, look: { type: 'dress', cloth: '#f6d84a', cloth2: '#f6d84a', accent: '#8a6a2a', hat: 'hood', hatColor: '#f6d84a' } },
  { id: 'cardboard', n: '골판지 갑옷', e: '📦', d: '택배 상자로 만든 갑옷. 방어력 0. 측면에 「취급주의」라고 적혀 있다.', silly: true, look: { type: 'armor', cloth: '#c89a5a', accent: '#8a6a3a' } },
  { id: 'chicken', n: '치킨 인형탈', e: '🐔', d: '양념 아니고 후라이드. 입으면 가끔 「꼬끼오」가 튀어나온다.', silly: true, look: { type: 'dress', cloth: '#f4f1ea', cloth2: '#f4f1ea', accent: '#f0a030', hat: 'hood', hatColor: '#f4f1ea', collar: '#e03a3a' } },
  { id: 'pot', n: '냄비 투구 세트', e: '🍲', d: '여관 주방에서 실종된 냄비. 마르타가 찾고 있다는 소문이 있다.', silly: true, look: { type: 'tunic', cloth: '#8a8a92', accent: '#f4f1ea', hat: 'helmet', hatColor: '#9aa0a8' } },
  { id: 'normal_pj', n: '정규분포 잠옷', e: '🔔', d: '하늘색 잠옷에 종 모양 곡선이 잔뜩. 입으면 평균적으로 졸리다.', silly: true, look: { type: 'robe', cloth: '#9ac8f0', accent: '#f4f1ea', hat: 'cap', hatColor: '#9ac8f0' } },
  { id: 'outlier', n: '이상치 선글라스 세트', e: '😎', d: '금목걸이와 선글라스. 어디서든 혼자 튄다. 평균을 망치는 주범.', silly: true, look: { type: 'tunic', cloth: '#f4f1ea', accent: '#e1b13d', glasses: true, collar: '#e1b13d', eye: '#111111' } },
  { id: 'unicorn', n: '유니콘 머리띠', e: '🦄', d: '뿔이 달린 파스텔 드레스. 확률이 0.0001%인 일이 일어날 것만 같다.', silly: true, look: { type: 'dress', cloth: '#f8d0e8', cloth2: '#d8c8f8', hat: 'horns', hatColor: '#fff4c0' } },
  { id: 'watermelon', n: '수박 헬멧', e: '🍉', d: '초록 줄무늬 헬멧에 빨간 옷. 여름 한정 아님. 씨는 직접 뱉으세요.', silly: true, look: { type: 'tunic', cloth: '#e03a4a', accent: '#2a2a2a', hat: 'helmet', hatColor: '#3a9a3a' } },
  { id: 'xbar_tee', n: '「x̄」 프린트 티셔츠', e: '👕', d: '가슴에 커다랗게 x̄. 「나는 표본평균이다」라는 자기소개 겸용.', silly: true, look: { type: 'tunic', cloth: '#f4f1ea', accent: '#3a3a8a' } },
  { id: 'pigeon_king', n: '비둘기 왕 코스튬', e: '🐦', d: '회색 깃털 망토와 작은 왕관. 비둘기들이 줄을 서서 따라온다. 구구.', silly: true, look: { type: 'robe', cloth: '#8a8fa8', accent: '#5fb34a', collar: '#5fb34a', hat: 'crown' } },
  { id: 'ghost_sheet', n: '유령 이불', e: '👻', d: '흰 이불을 뒤집어썼다. 앞이 잘 안 보인다. 버려진 저택에서 주웠다는 게 마음에 걸린다.', silly: true, look: { type: 'robe', cloth: '#f4f4f8', accent: '#d8d8e8', hat: 'hood', hatColor: '#f4f4f8' } }
];
const COSTUME_BY = {}; COSTUMES.forEach(c => COSTUME_BY[c.id] = c);
// 상자 → 의상 (맵마다 한산한 곳에 자동 배치)
const COSTUME_BOXES = [
  ['town', 'banana'], ['town', 'xbar_tee'], ['town', 'pigeon_king'], ['town', 'pirate'], ['town', 'royal'],
  ['forest', 'hunter'], ['forest', 'unicorn'], ['forest', 'watermelon'],
  ['cave', 'engineer'], ['cave', 'outlier'], ['dun1', 'knight'], ['dun2', 'ninja'],
  ['dunW', 'normal_pj'], ['dunS', 'cardboard'], ['dunE', 'chicken'],
  ['castle', 'priest'], ['lib1', 'scholar'], ['tower2', 'wizard'], ['inn1', 'pot'], ['haunt', 'ghost_sheet']
].map(([map, costume], i) => ({ id: 'cbox_' + costume, map, costume, i }));
if (typeof ACHS !== 'undefined') { ACHS.dress1 = ['패션의 시작', '의상 상자를 처음 열었다']; ACHS.dressAll = ['벨레스타 패셔니스타', '의상을 전부 모았다']; ACHS.silly = ['부끄러움은 표본 밖에', '병맛 의상을 입고 돌아다녔다']; }

function wardrobe() { S.wardrobe = S.wardrobe || { travel: true }; return S.wardrobe; }

// ---- 상자 위치: 주변에 물건·벽·사람이 적은 「한산한」 바닥, 서로 떨어지게 ----
const BOX_POS = {};
function boxSpots(mapId) {
  if (BOX_POS[mapId]) return BOX_POS[mapId];
  const m = MAPS[mapId], boxes = COSTUME_BOXES.filter(b => b.map === mapId); if (!m || !boxes.length) return (BOX_POS[mapId] = {});
  const free = (x, y) => x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1 && !SOLID.has(m.g[y][x]) && !'D^v~'.includes(m.g[y][x]);
  // 가장 큰 연결 영역
  const seen = new Uint8Array(m.w * m.h); let best = [];
  for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
    if (seen[y * m.w + x] || !free(x, y)) continue;
    const comp = [], q = [[x, y]]; seen[y * m.w + x] = 1;
    while (q.length) { const [cx, cy] = q.pop(); comp.push([cx, cy]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (free(nx, ny) && !seen[ny * m.w + nx]) { seen[ny * m.w + nx] = 1; q.push([nx, ny]); } } }
    if (comp.length > best.length) best = comp;
  }
  const busy = new Set();
  Object.keys(NPCS).forEach(id => { const n = NPCS[id]; if (n.map === mapId && n.pos) busy.add(n.pos.join(',')); });
  if (m.signs) Object.keys(m.signs).forEach(k => busy.add(k));
  if (typeof CARDS !== 'undefined') CARDS.filter(c => c.map === mapId).forEach(c => { const p = cardSpot(c); if (p) busy.add(p.join(',')); });
  const R = m.w > 30 ? 3 : 2;
  const density = (x, y) => { let d = 0; for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) { const t = (m.g[y + j] || '')[x + i]; if (t === undefined || SOLID.has(t) || 'D^vS'.includes(t)) d++; if (busy.has((x + i) + ',' + (y + j))) d += 3; } return d; };
  const scored = best.filter(([x, y]) => !busy.has(x + ',' + y)).map(p => [density(p[0], p[1]) + (cardHash(mapId + p) % 100) / 1000, p]).sort((a, b) => a[0] - b[0]);
  const minD = m.w > 30 ? 9 : 4, picked = [];
  for (const [, p] of scored) { if (picked.every(q => Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) >= minD)) picked.push(p); if (picked.length >= boxes.length) break; }
  const out = {}; boxes.forEach((b, i) => { if (picked[i]) out[b.id] = picked[i]; });
  return (BOX_POS[mapId] = out);
}

// ---- 그리기: 리본 달린 의상 상자 ----
function drawCostumeBoxes(ctx, t, vx0, vy0, vx1, vy1) {
  if (!S || !MAP) return;
  const spots = boxSpots(MAP.id), w = wardrobe();
  for (const b of COSTUME_BOXES) {
    if (b.map !== MAP.id || (S.boxes && S.boxes[b.id])) continue;
    const p = spots[b.id]; if (!p) continue;
    const [x, y] = p; if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
    const px = x * TS + 2, py = y * TS + 4, wig = (Math.sin(t / 200 + x) > 0.92) ? 1 : 0;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(px, py + 10, 12, 2);
    ctx.fillStyle = '#2a1d2b'; ctx.fillRect(px, py + 1 - wig, 12, 10);
    ctx.fillStyle = '#e87aa0'; ctx.fillRect(px + 1, py + 4 - wig, 10, 6);
    ctx.fillStyle = '#f5a8c4'; ctx.fillRect(px + 1, py + 2 - wig, 10, 2);
    ctx.fillStyle = '#ffd86a'; ctx.fillRect(px + 5, py + 2 - wig, 2, 8); ctx.fillRect(px + 1, py + 5 - wig, 10, 1);
    ctx.fillRect(px + 3, py - wig, 2, 2); ctx.fillRect(px + 7, py - wig, 2, 2);
    ctx.fillStyle = '#fff6d0'; ctx.fillRect(px + 2, py + 2 - wig, 1, 1);
    if (((t / 120 + x * 3) | 0) % 30 < 3) { ctx.fillStyle = '#fff'; ctx.fillRect(px + 12, py - 2, 1, 1); }
  }
}

// ---- 스프라이트 미리보기 (그림 파일로 만들어 <img>에 넣는다) ----
const _sprCache = new Map();
function spriteURL(look, dir, fr, scale) {
  const key = JSON.stringify(look); let sp = _sprCache.get(key); if (!sp) { sp = buildSprite(look); if (_sprCache.size > 60) _sprCache.clear(); _sprCache.set(key, sp); }
  const f = sp[dir || 0][fr || 0], c = document.createElement('canvas');
  const s = scale || 6; c.width = f.width * s; c.height = f.height * s;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(f, 0, 0, c.width, c.height);
  return c.toDataURL();
}
function costumeLook(id, design) {
  const base = Object.assign({ skin: SKIN[0] }, (S && S.look) || ORIGINS.free.look, design || (S && S.design) || {});
  if (!base.beast) Object.assign(base, { beast: 'fox', fur: base.hair || '#c8642a', tailTip: '#fff4e6' });
  const c = COSTUME_BY[id];
  if (c && c.id !== 'travel') { ['hat', 'hatColor', 'hatBand', 'glasses', 'mask', 'goggles', 'collar', 'cloth2'].forEach(k => delete base[k]); Object.assign(base, c.look); }
  return base;
}
function previewHTML(look) { return `<div class="cos-prev"><img src="${spriteURL(look, 0, 0, 8)}" alt=""></div>`; }

// ---- 상자 열기 ----
function costumeCheck() {
  if (!S || !MAP) return;
  const spots = boxSpots(MAP.id);
  for (const b of COSTUME_BOXES) {
    if (b.map !== MAP.id || (S.boxes && S.boxes[b.id])) continue;
    const p = spots[b.id]; if (!p || p[0] !== PLAYER.x || p[1] !== PLAYER.y) continue;
    S.boxes = S.boxes || {}; S.boxes[b.id] = true; wardrobe()[b.costume] = true; save();
    const c = COSTUME_BY[b.costume]; AudioSys.sfx('coin'); ach('dress1');
    if (COSTUMES.every(k => wardrobe()[k.id])) ach('dressAll');
    try { const [px, py] = playerScreenPct(); onoma('펑!', { x: px, y: py - 14, size: 30, color: '#ff9ac0' }); } catch (e) {}
    const owned = COSTUMES.filter(k => wardrobe()[k.id]).length;
    setTimeout(() => openTurn({ title: c.n, sub: `의상 상자 · ${owned}/${COSTUMES.length}벌`, svg: previewHTML(costumeLook(c.id)),
      desc: `리본을 풀자 상자 안에서 옷이 튀어나왔다!\n\n<b>${esc(c.n)}</b>${c.silly ? '  <span class="cos-tag">병맛</span>' : ''}\n${esc(c.d)}`,
      choices: [{ t: '지금 입어 본다', run: () => { wearCostume(c.id); return null; } }, { t: '옷장에 넣어 둔다', run: () => null }] }), 300);
    return;
  }
}
function wearCostume(id) {
  S.costume = id; PLAYER.spr = playerSprite(); save();
  const c = COSTUME_BY[id];
  if (c && c.silly) { S.sillySteps = 0; }
  toast(`${c ? c.n : '의상'} 착용!`);
}
// 병맛 의상으로 오래 걸으면 업적
function costumeStep() { if (S.costume && COSTUME_BY[S.costume] && COSTUME_BY[S.costume].silly) { S.sillySteps = (S.sillySteps || 0) + 1; if (S.sillySteps === 150) ach('silly'); } }

// ---- 가방 → 옷장 ----
function renderWardrobePanel(title, body) {
  const w = wardrobe(), owned = COSTUMES.filter(c => w[c.id]).length;
  title.textContent = `옷장 · ${owned}/${COSTUMES.length}벌`;
  body.innerHTML = `<div class="wd-top">${previewHTML(costumeLook(S.costume || 'travel'))}<div><b>${esc((COSTUME_BY[S.costume || 'travel'] || COSTUMES[0]).n)}</b><small>지금 입은 옷</small><button class="wd-design" data-design="1">외모 다시 꾸미기</button></div></div>
    <div class="wd-grid">${COSTUMES.map(c => w[c.id]
      ? `<button class="wd-item ${S.costume === c.id || (!S.costume && c.id === 'travel') ? 'on' : ''}" data-wear="${c.id}"><img src="${spriteURL(costumeLook(c.id), 0, 0, 3)}" alt=""><span>${esc(c.n)}</span>${c.silly ? '<i>병맛</i>' : ''}</button>`
      : `<div class="wd-item lock"><span class="wd-q">?</span><span>${esc((MAPS[(COSTUME_BOXES.find(b => b.costume === c.id) || {}).map] || {}).name || '어딘가')}의 상자</span></div>`).join('')}</div>
    <button class="cc-back" data-back="1">← 가방으로</button>`;
  body.querySelectorAll('[data-wear]').forEach(b => b.onclick = () => { wearCostume(b.dataset.wear); openPanel('wardrobe'); });
  body.querySelector('[data-design]').onclick = () => { closePanel(); openDesigner(null, true); };
  body.querySelector('[data-back]').onclick = () => openPanel('bag');
}

// ---- 캐릭터 디자인 화면 ----
function openDesigner(onDone, again) {
  let d = Object.assign(defaultDesign(), S.design || {});
  let el = document.getElementById('designer');
  if (!el) { el = document.createElement('div'); el.id = 'designer'; document.body.appendChild(el); }
  panelOpen = true; clearHeld();
  const sw = (key, arr) => `<div class="dz-sw">${arr.map(c => `<button class="dz-c ${d[key] === c ? 'on' : ''}" data-k="${key}" data-v="${c}" style="background:${c}"></button>`).join('')}</div>`;
  const ch = (key, arr) => `<div class="dz-ch">${arr.map(([v, n]) => `<button class="dz-b ${d[key] === v ? 'on' : ''}" data-k="${key}" data-v="${v}">${n}</button>`).join('')}</div>`;
  let dir = 0, fr = 0;
  const render = () => {
    el.innerHTML = `<div class="dz-box"><div class="dz-h"><b>${again ? '외모 다시 꾸미기' : '나의 수인 모험가 만들기'}</b><small>${again ? '입고 있는 의상은 그대로예요' : '나중에 가방 → 옷장에서 다시 바꿀 수 있어요'}</small></div>
      <div class="dz-body"><div class="dz-left"><div class="dz-stage"><img id="dz-img" alt=""><img class="dz-port" alt="" src="assets/portraits/player_${d.gender || 'm'}.webp"></div><div class="dz-rot"><button data-rot="-1">‹</button><span>돌려 보기</span><button data-rot="1">›</button></div></div>
      <div class="dz-right">
        <label>성별</label>${ch('gender', DESIGN.gender)}
        <label>종족</label>${ch('beast', DESIGN.beast)}
        <label>털 색</label>${sw('fur', DESIGN.fur)}
        <label>꼬리 끝</label>${sw('tailTip', DESIGN.tip)}
        <label>머리 모양</label>${ch('hairStyle', DESIGN.style)}
        <label>머리 색</label>${sw('hair', DESIGN.hair)}
        <label>눈 모양</label>${ch('eyeShape', DESIGN.eyeShape)}
        <label>눈 색</label>${sw('eye', DESIGN.eye)}
        <label>피부</label>${sw('skin', DESIGN.skin)}
        <label>옷 색</label>${sw('cloth', DESIGN.cloth)}
      </div></div>
      <div class="dz-foot"><button class="dz-rand">랜덤</button>${again ? '<button class="dz-cancel">취소</button>' : ''}<button class="dz-ok">${again ? '이대로 저장' : '이 모습으로 시작'}</button></div></div>`;
    el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
      const k = b.dataset.k, v = b.dataset.v;
      // 성별을 바꾸면 기본 머리 모양도 일러스트에 맞춰 준다
      if (k === 'gender' && v !== d.gender) { if (v === 'f' && d.hairStyle === 'short') d.hairStyle = 'long'; if (v === 'm' && d.hairStyle === 'long') d.hairStyle = 'short'; }
      d[k] = v; AudioSys.sfx('select'); render();
    });
    el.querySelectorAll('[data-rot]').forEach(b => b.onclick = () => { dir = (dir + (+b.dataset.rot) + 4) % 4; paint(); });
    el.querySelector('.dz-rand').onclick = () => { d = randomDesign(); AudioSys.sfx('select'); render(); };
    const cc = el.querySelector('.dz-cancel'); if (cc) cc.onclick = () => close(false);
    el.querySelector('.dz-ok').onclick = () => close(true);
    paint();
  };
  const ORDER = [0, 1, 3, 2]; // 앞 → 왼 → 뒤 → 오
  const paint = () => { const img = el.querySelector('#dz-img'); if (img) img.src = spriteURL(costumeLook(S.costume || 'travel', d), ORDER[dir], fr, 10); };
  const anim = setInterval(() => { fr = (fr + 1) % 3; paint(); }, 260);
  const close = ok => {
    clearInterval(anim); el.classList.remove('open'); panelOpen = false;
    if (ok) { S.design = d; PLAYER.spr = playerSprite(); save(); AudioSys.sfx('level'); toast('새 모습을 저장했다'); }
    if (onDone) setTimeout(onDone, 250);
  };
  render(); el.classList.add('open');
}

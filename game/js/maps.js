/* =========================================================================
 * 벨레스타 연대기 — 맵
 * 마을은 시드 고정 절차 생성(둥근 성벽 + 강 + 빽빽한 붉은 지붕),
 * 건물 내부는 손으로 찍은 ASCII. 숫자(0~9)는 NPC 자리.
 * ========================================================================= */
'use strict';

const MAPS = {};
const BUILDINGS = [];   // 마을의 출입 가능한 건물 {id, map, name, door:[x,y], icon}

function G(w, h, ch) { return Array.from({ length: h }, () => Array(w).fill(ch)); }

// -------------------------------------------------------------------------
// 마을: 벨레스타 (성벽 도시)
// -------------------------------------------------------------------------
function buildTown() {
  const W = 86, H = 70, cx = 43, cy = 35, RX = 38, RY = 30;
  const g = G(W, H, '.');
  const r = rng(20261127);
  const d = (x, y) => Math.sqrt(((x - cx) / RX) ** 2 + ((y - cy) / RY) ** 2);
  const inside = (x, y) => d(x, y) < 1;
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  const get = (x, y) => (x >= 0 && y >= 0 && x < W && y < H) ? g[y][x] : '#';

  // 성 밖: 들판과 숲
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const D = d(x, y);
    if (D > 1.09) {
      const edge = x < 2 || y < 2 || x > W - 3 || y > H - 3;
      g[y][x] = edge ? 'T' : (r() < (D > 1.25 ? .22 : .07) ? 'T' : r() < .06 ? ',' : r() < .02 ? 'b' : '.');
    }
  }
  // 강
  const riverX = y => 12 + y * 0.38 + 4 * Math.sin(y / 6);
  for (let y = 0; y < H; y++) { const x0 = Math.round(riverX(y)); for (let k = -1; k <= 2; k++) set(x0 + k, y, '~'); }
  // 성벽 (두께 약 2칸)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const D = d(x, y); if (D >= 1 && D < 1.07 && g[y][x] !== '~') g[y][x] = '#'; }
  // 성탑
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + .3; const tx = Math.round(cx + Math.cos(a) * RX * 1.035), ty = Math.round(cy + Math.sin(a) * RY * 1.035); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (get(tx + i, ty + j) !== '~') set(tx + i, ty + j, '#'); }
  // 주요 건물 (사각형: x,y,w,h, 지붕, 문 x)
  const bld = [
    { id: 'tower1', name: '추정의 탑', x: 27, y: 9, w: 8, h: 9, roof: 'U', dx: 4, icon: 'star' },
    { id: 'lib1', name: '대도서관', x: 31, y: 21, w: 9, h: 6, roof: 'V', dx: 4, icon: 'book' },
    { id: 'court1', name: '검정 재판소', x: 48, y: 11, w: 13, h: 8, roof: 'I', dx: 6, icon: 'scale' },
    { id: 'guild', name: '범주 상회', x: 61, y: 16, w: 10, h: 7, roof: 'V', dx: 5, icon: 'coin' },
    { id: 'inn1', name: '여관 「신뢰구간 95%」', x: 16, y: 38, w: 10, h: 7, roof: 'R', dx: 5, icon: 'bed' },
    { id: 'smithy', name: '자유도 대장간', x: 21, y: 50, w: 8, h: 6, roof: 'I', dx: 3, icon: 'sword' },
    { id: 'temple', name: '스토카 신전', x: 49, y: 46, w: 10, h: 7, roof: 'G', dx: 5, icon: 'star' },
    { id: 'alch1', name: '카이제곱 공방', x: 63, y: 39, w: 8, h: 6, roof: 'J', dx: 4, icon: 'potion' },
    { id: 'house', name: '수상한 민가', x: 54, y: 56, w: 6, h: 5, roof: 'R', dx: 2, icon: null },
    { id: 'advguild', name: '모험가 길드', x: 23, y: 24, w: 7, h: 6, roof: 'G', dx: 3, icon: 'sword' }
  ];
  const placeBuilding = (b, doorCh) => {
    for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) {
      const x = b.x + i, y = b.y + j;
      let c = j < b.h - 2 ? b.roof : (j === b.h - 2 ? ((i % 3 === 1 && i > 0 && i < b.w - 1) ? 'w' : 'W') : ((i % 3 === 1 && i !== b.dx) ? 'w' : 'W'));
      if (j === b.h - 1 && i === b.dx) c = doorCh;
      set(x, y, c);
    }
  };
  const conflicts = [];
  bld.forEach(b => {
    for (let j = -1; j <= b.h; j++) for (let i = -1; i <= b.w; i++) { const c = get(b.x + i, b.y + j); if (!'.,'.includes(c) && !(j === -1 || i === -1 || i === b.w || j === b.h)) conflicts.push(b.id + '@' + (b.x + i) + ',' + (b.y + j) + ':' + c); }
    placeBuilding(b, 'D');
    b.door = [b.x + b.dx, b.y + b.h - 1];
    BUILDINGS.push({ id: b.id, map: b.id, name: b.name, door: b.door, icon: b.icon });
  });
  // 큰길 (십자) + 성문
  const road = (x, y, force) => { const c = get(x, y); if ('RUVJIGWwDE'.includes(c) || (c === '#' && !force)) return; if (c === '~' || c === 'l') set(x, y, 'l'); else set(x, y, '='); };
  for (let y = 2; y < H - 1; y++) for (let x = cx - 1; x <= cx + 1; x++) road(x, y, true);
  for (let x = 2; x < W; x++) for (let y = cy - 1; y <= cy + 1; y++) road(x, y, true);
  // 성벽 안쪽 순환로
  // (순환로는 없앰: 성벽 안을 집으로 빽빽하게)
  // 대각선 골목
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sy]) => { for (let t = 9; t < 40; t++) { const x = Math.round(cx + sx * t * .78), y = Math.round(cy + sy * t * .6); if (d(x, y) > .9) break; road(x, y); road(x + sx, y); } });
  // 광장
  for (let y = cy - 9; y <= cy + 9; y++) for (let x = cx - 10; x <= cx + 10; x++) if (((x - cx) / 10.5) ** 2 + ((y - cy) / 8.5) ** 2 < 1) set(x, y, 'p');
  for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) set(x, y, 'F');

  // 문 앞에서 가장 가까운 길까지 골목 깔기 (BFS)
  const carvePath = (sx, sy) => {
    const prev = new Map(), q = [[sx, sy]], key = (x, y) => x + ',' + y; prev.set(key(sx, sy), null);
    let found = null;
    while (q.length) {
      const [x, y] = q.shift(); const c = get(x, y);
      if ((c === '=' || c === 'p' || c === 'l') && !(x === sx && y === sy)) { found = [x, y]; break; }
      for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
        const nx = x + dx, ny = y + dy, nc = get(nx, ny), k = key(nx, ny);
        if (prev.has(k) || !inside(nx, ny)) continue;
        if ('.,=pl'.includes(nc)) { prev.set(k, [x, y]); q.push([nx, ny]); }
      }
    }
    let cur = found ? prev.get(key(found[0], found[1])) : null;
    while (cur) { if ('.,'.includes(get(cur[0], cur[1]))) set(cur[0], cur[1], '='); cur = prev.get(key(cur[0], cur[1])); }
  };
  bld.forEach(b => { if ('.,'.includes(get(b.door[0], b.door[1] + 1))) set(b.door[0], b.door[1] + 1, '='); carvePath(b.door[0], b.door[1] + 1); });

  // 빽빽한 민가 채우기 (잠긴 문 'E')
  const roofPick = () => { const v = r(); return v < .62 ? 'R' : v < .76 ? 'I' : v < .85 ? 'U' : v < .92 ? 'V' : v < .96 ? 'J' : 'G'; };
  let houses = 0;
  const fits = (x, y, w, h) => {
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
      const c = get(x + i, y + j), edge = j === -1 || i === -1 || i === w, bottom = j === h;
      if (!inside(x + i, y + j) || d(x + i, y + j) > .95) return false;
      if (!((bottom ? '.,=p' : edge ? '.,=pRUVJIGWw' : '.,').includes(c))) return false;
    }
    return true;
  };
  const cells = [];
  for (let y = 3; y < H - 8; y++) for (let x = 3; x < W - 8; x++) cells.push([x, y]);
  for (let i = cells.length - 1; i > 0; i--) { const j = r() * (i + 1) | 0; [cells[i], cells[j]] = [cells[j], cells[i]]; }
  const sizes = [[7, 6], [6, 6], [6, 5], [5, 5], [5, 4], [4, 5], [4, 4], [3, 4]];
  for (const [w, h] of sizes) for (const [x, y] of cells) {
    if (r() < .18) continue;          // 군데군데 빈터(정원) 남기기
    if (!fits(x, y, w, h)) continue;
    const dx = 1 + (r() * (w - 2) | 0);
    placeBuilding({ x, y, w, h, roof: roofPick(), dx }, 'E');
    houses++;
  }
  // 소품: 가로등, 나무, 꽃, 통, 상자
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = g[y][x];
    if (c === '.' && inside(x, y)) {
      const v = r();
      const nearRoad = ['=', 'p'].includes(get(x + 1, y)) || ['=', 'p'].includes(get(x - 1, y)) || ['=', 'p'].includes(get(x, y + 1)) || ['=', 'p'].includes(get(x, y - 1));
      if (nearRoad && v < .05) g[y][x] = 'L';
      else if (v < .05) g[y][x] = 'T';
      else if (v < .11) g[y][x] = ',';
      else if (v < .125) g[y][x] = 'b';
      else if (v < .135) g[y][x] = 'H';
      else if (v < .14) g[y][x] = 'X';
    }
  }
  // 광장 꾸미기
  const P = (x, y, c) => set(cx + x, cy + y, c);
  [[-6, -5], [6, -5], [-6, 5], [6, 5], [-9, 0], [9, 0]].forEach(([x, y]) => P(x, y, 'L'));
  [[-4, -7], [-3, -7], [3, -7], [4, -7], [-4, 7], [-3, 7], [3, 7], [4, 7]].forEach(([x, y]) => P(x, y, 'n'));
  [[-8, -3], [-8, 3], [8, -3]].forEach(([x, y]) => { P(x, y, ','); P(x, y + 1, ','); });
  P(-3, -3, 'S'); P(3, -3, 'S'); P(-3, 3, 'S'); P(0, -8, 'a');
  P(-5, -1, 'N'); // 게시판
  // 점술 천막 (3x2, 광장 동쪽)
  for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) P(5 + i, 2 + j, 'K');
  // 훈련장 (남동쪽 울타리)
  const tx = 66, ty = 50;
  for (let i = 0; i < 9; i++) { if (get(tx + i, ty) === '.') set(tx + i, ty, 'f'); if (get(tx + i, ty + 6) === '.') set(tx + i, ty + 6, 'f'); }
  for (let j = 0; j < 7; j++) { if (get(tx, ty + j) === '.') set(tx, ty + j, 'f'); if (get(tx + 8, ty + j) === '.' && j !== 3) set(tx + 8, ty + j, 'f'); }
  for (let j = 1; j < 6; j++) for (let i = 1; i < 8; i++) if (!'=p'.includes(get(tx + i, ty + j))) set(tx + i, ty + j, 's');
  set(tx + 2, ty + 2, 'd'); set(tx + 5, ty + 2, 'd'); set(tx + 3, ty + 4, 'd');
  set(tx + 8, ty + 3, 's'); set(tx + 9, ty + 3, 's');
  // 성 밖: 남문 앞 표지판, 동쪽 길 끝 표지판, 강가 낚시터
  set(cx + 3, H - 6, 'S'); set(W - 5, cy - 3, 'S');

  const signs = {};
  const sx = (x, y) => (cx + x) + ',' + (cy + y);
  signs[sx(-3, -3)] = 'sign_plaza1'; signs[sx(3, -3)] = 'sign_plaza2'; signs[sx(-3, 3)] = 'sign_plaza3';
  signs[(cx + 3) + ',' + (H - 6)] = 'sign_gate'; signs[(W - 5) + ',' + (cy - 3)] = 'sign_east';

  const m = {
    id: 'town', name: '벨레스타 성내', theme: 'town', w: W, h: H, g, seed: 7,
    signs, decor: [{ kind: 'fountain', x: cx - 1, y: cy - 1 }, { kind: 'tent', x: cx + 5, y: cy + 2 }],
    labels: BUILDINGS.filter(b => b.id !== 'house').map(b => ({ x: b.door[0], y: b.door[1] - 1, text: b.name })).concat([{ x: cx + 6, y: cy + 1, text: '사이라의 점집' }, { x: tx + 4, y: ty - 1, text: '기사단 훈련장' }]),
    music: 'town', fit: 22, start: [cx, H - 8], cx, cy, houses, conflicts
  };
  BUILDINGS.filter(b => b.icon).forEach(b => m.decor.push({ kind: 'shopsign', x: b.door[0] + 1, y: b.door[1] - 1, icon: b.icon }));
  // 동쪽 끝 → 숲
  m.edgeWarps = [{ side: 'E', y0: cy - 1, y1: cy + 1, to: 'forest' }];
  return m;
}

// -------------------------------------------------------------------------
// 손으로 찍은 실내 맵
// -------------------------------------------------------------------------
const ROOMS = {
  tower1: { name: '추정의 탑 1층', theme: 'interior', music: 'tower', slotFloor: '_', npcs: ['elise', 'confi'], signs: ['sign_t1a', 'sign_t1b'], rows: [
    '###############',
    '###############',
    '#BBB_BB_B_BB^_#',
    '#_____________#',
    '#_y_rrrrrrr_y_#',
    '#__0rrrrrrr___#',
    '#___rrrrrrr_1_#',
    '#S__rrrrrrr__t#',
    '#_________S___#',
    '#k___________k#',
    '#######D#######'] },
  tower2: { name: '추정의 탑 2층 · 천문대', theme: 'interior', music: 'observatory', npcs: ['estima', 'toby'], signs: ['sign_t2'], rows: [
    '#############',
    '#############',
    '#e_B_y_y_B_v#',
    '#___________#',
    '#__rrrrrrr__#',
    '#__rr_0_rr__#',
    '#__rrrrrrr_1#',
    '#S__________#',
    '#y____t____y#',
    '#############'] },
  court1: { name: '검정 재판소', theme: 'interior', music: 'court', slotFloor: 'M', npcs: ['hypo', 'alpha', 'beta'], signs: ['sign_c1', 'sign_c2'], under: { n: 'M', P: 'M', Q: 'M', S: 'M' }, rows: [
    '###################',
    '###################',
    '#P______0______v_P#',
    '#QQQQQQQ_QQQQQQQ__#',
    '#MMMMMMMMMMMMMMMMM#',
    '#M1MMMMMrrrMMMMM2M#',
    '#MnnnnMMrrrMMnnnnM#',
    '#MMMMMMMrrrMMMMMMM#',
    '#MnnnnMMrrrMMnnnnM#',
    '#SMMMMMMrrrMMMMMMS#',
    '#PMMMMMMrrrMMMMMMP#',
    '#########D#########'] },
  courtB: { name: '재판소 지하 · 기각된 자들의 감옥', theme: 'dungeon', music: 'prison', dark: true, npcs: ['grim', 'null'], signs: [], chests: ['ch_cell'], rows: [
    '###############',
    '###############',
    '#^______0_____#',
    '#_____________#',
    '#iii_iii#iii_i#',
    '#__1___#______#',
    '#______#__C___#',
    '#o_____#____o_#',
    '###############'] },
  guild: { name: '범주 상회', theme: 'interior', music: 'shop', npcs: ['categoria', 'pair', 'repair', 'hassan'], signs: ['sign_g1'], rows: [
    '#################',
    '#################',
    '#XX_k__0___k_HHX#',
    '#____QQQQQQQ____#',
    '#_______________#',
    '#_1_rrrrrrr___2_#',
    '#___rrrrrrr_____#',
    '#t__rrrrrrr__3_t#',
    '#S__rrrrrrr____X#',
    '#_______________#',
    '########D########'] },
  inn1: { name: '여관 「신뢰구간 95%」 1층', theme: 'interior', music: 'inn', npcs: ['marta', 'godric'], signs: ['sign_inn'], rows: [
    '#################',
    '#################',
    '#q_H_HH_0___B_^_#',
    '#___QQQQQQQQ____#',
    '#_______________#',
    '#_th__th__th__t_#',
    '#_____1_________#',
    '#_th__th__th__th#',
    '#S______________#',
    '#n_____________n#',
    '########D########'] },
  inn2: { name: '여관 2층 · 객실', theme: 'interior', music: 'innroom', npcs: ['veil', 'nurungji'], signs: ['sign_inn2'], rows: [
    '###############',
    '###############',
    '#Y_Y_#Y_Y_#_v_#',
    '#__0_#____#___#',
    '#____#__1_#___#',
    '##_###_####___#',
    '#_____________#',
    '#t__________B_#',
    '#S____________#',
    '###############'] },
  smithy: { name: '자유도 대장간', theme: 'interior', music: 'smithy', npcs: ['volkan'], signs: ['sign_smith'], rows: [
    '#############',
    '#############',
    '#q_Z__HX_X__#',
    '#___0_______#',
    '#_____Z_____#',
    '#H_________H#',
    '#S___t______#',
    '#X_________X#',
    '######D######'] },
  alch1: { name: '카이제곱 공방', theme: 'interior', music: 'alchemy', npcs: ['kiara'], signs: ['sign_alch'], rows: [
    '#############',
    '#############',
    '#kkk_O__k_v_#',
    '#____0______#',
    '#__t___O____#',
    '#y_________y#',
    '#S__________#',
    '#H_________k#',
    '######D######'] },
  alchB: { name: '공방 지하 실험실', theme: 'dungeon', music: 'lab', dark: true, npcs: ['kai'], signs: [], chests: ['ch_alch'], rows: [
    '#############',
    '#############',
    '#^_X_HH_O_XX#',
    '#___________#',
    '#_X___0____y#',
    '#______m____#',
    '#C__O_____X_#',
    '#j_____o___j#',
    '#############'] },
  temple: { name: '스토카 신전', theme: 'interior', music: 'temple', slotFloor: 'M', npcs: ['serena', 'bellman'], signs: ['sign_tem1', 'sign_tem2'], under: { P: 'M', a: 'M', A: 'M', n: 'M', S: 'M' }, rows: [
    '###############',
    '###############',
    '#P____aAa____P#',
    '#MMMMMM0MMMMMM#',
    '#PMMMMMMMMMMMP#',
    '#MnnnMrrrMnnnM#',
    '#MnnnMrrrMnnnM#',
    '#PMMMMrrrMMMMP#',
    '#MnnnMrrrMnnnM#',
    '#SMMMMrrrMM1MS#',
    '#PMMMMrrrMMMMP#',
    '#######D#######'] },
  lib1: { name: '대도서관', theme: 'interior', music: 'library', npcs: ['monte', 'minji'], signs: ['sign_lib1'], rows: [
    '#################',
    '#################',
    '#BBBBB_BBBBB_BBB#',
    '#_______________#',
    '#_BB_BB___BB_BB_#',
    '#_______0_______#',
    '#_BB_BB___BB_BB_#',
    '#_t___________t_#',
    '#S__rrrrrrrrr__v#',
    '#___rrrrrrrrr___#',
    '#y______1______y#',
    '########D########'] },
  libB: { name: '도서관 지하 서고', theme: 'interior', music: 'archive', dark: true, npcs: ['thaniya'], signs: ['sign_libB'], chests: ['ch_book', 'ch_secret'], secret: [12, 5], rows: [
    '###################',
    '###################',
    '#^__B_B_B_B_#_____#',
    '#___________#__0__#',
    '#_B_B_B_B___#_t___#',
    '#___________B_____#',
    '#_B_B_B_B___#__y__#',
    '#C__________#_____#',
    '#___________#C____#',
    '#S__________#_____#',
    '#o_________j#_____#',
    '###################'] },
  house: { name: '수상한 민가', theme: 'interior', music: 'house', npcs: ['log'], signs: ['sign_house'], rows: [
    '###########',
    '###########',
    '#Y_B_q__H_#',
    '#____0____#',
    '#_t_____h_#',
    '#S________#',
    '#X_______k#',
    '#####D#####'] },
  dun2: { name: '분산의 미궁 · 최하층', theme: 'dungeon', music: 'boss', dark: true, npcs: ['outlier'], signs: [], rows: [
    '###############',
    '##!#########!##',
    '#z____A_A____z#',
    '#z___________z#',
    '#_____0_______#',
    '#_____________#',
    '#y___________y#',
    '#__o_______j__#',
    '#_____________#',
    '#z___________z#',
    '#zz____^____zz#',
    '###############'] }
};

function roomFromRows(id, def) {
  const rows = def.rows, h = rows.length, w = rows[0].length;
  const g = rows.map(row => row.split(''));
  const slots = {};
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = g[y][x]; if (c >= '0' && c <= '9') { slots[+c] = [x, y]; g[y][x] = def.slotFloor || '_'; } }
  const signs = {}, chests = {};
  let si = 0, ci = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (g[y][x] === 'S' && def.signs[si]) signs[x + ',' + y] = def.signs[si++];
    if (g[y][x] === 'C' && def.chests && def.chests[ci]) chests[x + ',' + y] = def.chests[ci++];
  }
  return { id, name: def.name, theme: def.theme, w, h, g, signs, chests, slots, npcSlots: def.npcs, dark: !!def.dark, music: def.music, secret: def.secret, under: def.under || null, seed: id.length * 31 };
}

// -------------------------------------------------------------------------
// 방 + 통로 방식 절차 생성 (동굴/던전)
// -------------------------------------------------------------------------
function buildRooms(id, opt) {
  const { w, h, seed, theme, rooms } = opt;
  const g = G(w, h, '#'), r = rng(seed);
  const set = (x, y, c) => { if (x > 0 && y > 1 && x < w - 1 && y < h - 1) g[y][x] = c; };
  const carveRoom = ([x, y, rw, rh]) => {
    for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) {
      if (theme === 'cave') { const e = ((i - rw / 2 + .5) / (rw / 2)) ** 2 + ((j - rh / 2 + .5) / (rh / 2)) ** 2; if (e > 1.08 + r() * .25) continue; }
      set(x + i, y + j, '_');
    }
  };
  rooms.forEach(carveRoom);
  const cen = ([x, y, rw, rh]) => [x + (rw >> 1), y + (rh >> 1)];
  for (let i = 1; i < rooms.length; i++) {
    const [ax, ay] = cen(rooms[i - 1]), [bx, by] = cen(rooms[i]);
    const wid = theme === 'cave' ? 2 : 1;
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) for (let k = 0; k < wid; k++) set(x, ay + k, '_');
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) for (let k = 0; k < wid; k++) set(bx + k, y, '_');
  }
  // 장식
  const floor = (x, y) => g[y] && g[y][x] === '_';
  for (let y = 2; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (!floor(x, y)) continue;
    const v = r();
    const wallUp = g[y - 1][x] === '#';
    if (theme === 'cave') {
      if (v < .035) g[y][x] = 'm'; else if (v < .05) g[y][x] = 'o'; else if (v < .058 && wallUp) g[y][x] = 'y'; else if (v < .066) g[y][x] = 'x';
    } else {
      if (v < .02) g[y][x] = 'o'; else if (v < .035) g[y][x] = 'j';
      if (wallUp && v > .93 && g[y - 1][x] === '#') g[y - 1][x] = '!';
    }
  }
  return g;
}

function buildCave() {
  const rooms = [[16, 20, 9, 5], [8, 14, 10, 7], [3, 6, 9, 7], [15, 4, 10, 7], [27, 8, 9, 8], [28, 18, 8, 5]];
  const g = buildRooms('cave', { w: 40, h: 28, seed: 4242, theme: 'cave', rooms });
  const s = (x, y, c) => g[y][x] = c;
  s(20, 25, '_'); s(20, 26, 'D');   // 입구 (아래)
  s(20, 24, '_'); s(21, 24, '_');
  // 광맥, 수정, 표지판, 봉인문
  [[9, 13], [4, 12], [33, 7], [18, 3]].forEach(([x, y]) => { if (g[y][x] === '#') s(x, y, 'u'); });
  s(31, 7, 'g');     // 봉인된 문 (위쪽 벽)
  s(31, 8, '_');
  s(5, 7, 'S'); s(34, 21, 'S'); s(19, 21, 'S');
  s(29, 19, 'C');
  const signs = { '5,7': 'sign_cave_end', '34,21': 'sign_cave2', '19,21': 'sign_cave1' };
  return { id: 'cave', name: '이상치 동굴', theme: 'cave', w: 40, h: 28, g, signs, chests: { '29,19': 'ch_cave' }, slots: { 0: [12, 17], 1: [6, 9], 2: [32, 11] }, npcSlots: ['gamli', 'pivalu', 'miner2'], dark: true, music: 'cave', seed: 99 };
}

function buildDun1() {
  const rooms = [[2, 3, 7, 6], [12, 2, 9, 7], [24, 3, 8, 7], [24, 14, 9, 8], [12, 15, 9, 7], [2, 15, 7, 7]];
  const g = buildRooms('dun1', { w: 36, h: 25, seed: 777, theme: 'dungeon', rooms });
  const s = (x, y, c) => g[y][x] = c;
  s(3, 4, '^'); s(4, 18, 'v');
  for (let i = 0; i < 3; i++) { s(15 + i, 4, 'z'); s(15 + i, 5, 'z'); }
  for (let i = 0; i < 2; i++) { s(27, 17 + i, 'z'); s(28, 17 + i, 'z'); }
  s(30, 4, 'C'); s(14, 20, 'C'); s(6, 4, 'S'); s(18, 18, 'S');
  for (const [x, y] of [[13, 3], [22, 3], [26, 15], [30, 15]]) if (g[y - 1] && g[y - 1][x] === '#') g[y - 1][x] = '!';
  return { id: 'dun1', name: '분산의 미궁 · 지하 1층', theme: 'dungeon', w: 36, h: 25, g, signs: { '6,4': 'sign_dun1', '18,18': 'sign_dun2' }, chests: { '30,4': 'ch_dun1', '14,20': 'ch_dun2' }, slots: { 0: [30, 18], 1: [16, 17], 2: [29, 6] }, npcSlots: ['mimic', 'lost', 'skelly'], dark: true, music: 'dungeon', seed: 55 };
}

function buildForest() {
  const W = 46, H = 32, g = G(W, H, '.'), r = rng(31337);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = Math.sin(x * .35) * Math.cos(y * .41) + Math.sin((x + y) * .17);
    g[y][x] = (x < 1 || y < 1 || x > W - 2 || y > H - 2) ? 'T' : n > .55 || r() < .1 ? 'T' : r() < .07 ? ',' : r() < .03 ? 'b' : '.';
  }
  // 절벽 (위쪽) + 동굴 입구
  for (let x = 0; x < W; x++) for (let y = 0; y < 4; y++) g[y][x] = '#';
  // 길: 서쪽 입구(가운데 높이)에서 동굴까지 구불구불
  const path = [];
  let x = 0, y = 16;
  while (x < 34) { path.push([x, y]); x++; if (r() < .25) { y += r() < .5 ? -1 : 1; y = Math.max(8, Math.min(24, y)); path.push([x, y]); } }
  while (y > 4) { path.push([x, y]); y--; }
  path.forEach(([px, py]) => { for (let k = 0; k <= 1; k++) if (g[py + k] && g[py + k][px] !== '#') g[py + k][px] = 's'; });
  g[3][34] = 'D'; g[4][34] = 's'; g[4][35] = 's';
  // 연못
  for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) { const e = ((i - 2.5) / 3) ** 2 + ((j - 1.5) / 2) ** 2; if (e < 1) g[22 + j][8 + i] = '~'; }
  // 엘프 야영지 (공터) + 요정의 고리
  for (let j = -3; j <= 3; j++) for (let i = -4; i <= 4; i++) if (g[11 + j] && g[11 + j][20 + i] === 'T') g[11 + j][20 + i] = '.';
  g[11][20] = 'q';
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; const mx = Math.round(38 + Math.cos(a) * 3), my = Math.round(24 + Math.sin(a) * 2.4); g[my][mx] = 'm'; }
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (g[24 + j][38 + i] === 'T') g[24 + j][38 + i] = '.';
  g[15][3] = 'S'; g[9][33] = 'S';
  // 입구 주변 정리
  for (let j = 14; j <= 18; j++) { g[j][0] = j >= 15 && j <= 17 ? 's' : 'T'; g[j][1] = g[j][1] === 'T' ? '.' : g[j][1]; }
  return { id: 'forest', name: '속삭이는 숲', theme: 'forest', w: W, h: H, g, signs: { '3,15': 'sign_forest', '33,9': 'sign_forest2' }, chests: {}, slots: { 0: [22, 12], 1: [12, 19], 2: [38, 24] }, npcSlots: ['silva', 'woodcutter', 'fairy'], music: 'forest', seed: 3, edgeWarps: [{ side: 'W', y0: 15, y1: 17, to: 'town' }], under: { q: '.' } };
}

// -------------------------------------------------------------------------
// 맵 사이 연결
// -------------------------------------------------------------------------
const LINKS = [
  ['tower1', '^', 'tower2', 'v'], ['court1', 'v', 'courtB', '^'], ['inn1', '^', 'inn2', 'v'],
  ['alch1', 'v', 'alchB', '^'], ['lib1', 'v', 'libB', '^'], ['cave', 'v', 'dun1', '^'], ['dun1', 'v', 'dun2', '^']
];

function buildAllMaps() {
  BUILDINGS.length = 0;
  MAPS.town = buildTown();
  for (const id in ROOMS) MAPS[id] = roomFromRows(id, ROOMS[id]);
  MAPS.cave = buildCave();
  MAPS.dun1 = buildDun1();
  MAPS.forest = buildForest();
  if (typeof buildExtraMaps === 'function') buildExtraMaps();
  // 방 크기에 따라 기본 줌 (작은 방일수록 크게)
  for (const id in MAPS) { const m = MAPS[id]; if (!m.fit) m.fit = m.id === 'forest' ? 20 : m.id === 'cave' || m.id === 'dun1' ? 15 : Math.max(m.w, m.h * 1.4) + 1; }
  return MAPS;
}

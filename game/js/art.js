/* =========================================================================
 * 벨레스타 연대기 — 아트 생성기
 * 외부 이미지 파일 없이 코드로 도트 타일·캐릭터 스프라이트·애니풍 초상화를 그린다.
 * (전부 직접 찍은 픽셀 규칙. 저작권 걱정 없는 오리지널 에셋)
 * ========================================================================= */
'use strict';
const TS = 16;

// ---------- 색 도구 ----------
function hexToRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function shade(h, amt) { const [r, g, b] = hexToRgb(h); return amt >= 0 ? rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt) : rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt)); }
function mix(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
function rng(seed) { let s = seed >>> 0 || 1; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return c; }

const OUT = '#2a1d2b';

// =========================================================================
// 타일
// =========================================================================
const ROOF = {
  R: ['#d9573e', '#b9412c', '#ef7f5e', '#7c2a1f'],   // 빨강
  U: ['#4f7fd6', '#3a62ad', '#79a3ee', '#24396b'],   // 파랑
  V: ['#4fa564', '#3a834c', '#77c98a', '#22512e'],   // 초록
  J: ['#8d5fd3', '#6f45ad', '#b08af0', '#3e2766'],   // 보라
  I: ['#6f7787', '#565d6b', '#929bab', '#2f343e'],   // 슬레이트
  G: ['#e8e2d2', '#c9c0aa', '#fffbee', '#8a7f66']    // 신전 흰 지붕
};
const ROOFCH = Object.keys(ROOF);
// 이동 불가 타일
const SOLID = new Set('#RUVJIGWwk~TbxfLSHXCBtYQqPZOAayzFKieguNcdE!'.split(''));
// 상호작용 가능한 타일
const INTERACT = new Set('SCBYZOAayueNcFKdE~'.split(''));

const THEMES = {
  town:     { floor: '#6fbf4f' },
  forest:   { floor: '#5aa845' },
  interior: { floor: '#c18a55' },
  cave:     { floor: '#7a6655' },
  dungeon:  { floor: '#454a5f' }
};

function P(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

function drawGrass(ctx, px, py, r, base = '#6fbf4f') {
  P(ctx, px, py, 16, 16, base);
  const lt = shade(base, 0.14), dk = shade(base, -0.14);
  for (let i = 0; i < 9; i++) P(ctx, px + (r() * 16 | 0), py + (r() * 16 | 0), 1, 1, r() < .5 ? lt : dk);
  if (r() < .55) { const x = px + 2 + (r() * 11 | 0), y = py + 3 + (r() * 10 | 0); P(ctx, x, y, 1, 2, dk); P(ctx, x + 2, y, 1, 2, dk); P(ctx, x + 1, y + 1, 1, 2, shade(base, -0.22)); }
}
function drawFlowers(ctx, px, py, r, base) {
  drawGrass(ctx, px, py, r, base);
  const cols = ['#ff7aa8', '#ffd84d', '#ffffff', '#b794ff', '#ff9d5c'];
  for (let i = 0; i < 3; i++) {
    const x = px + 2 + (r() * 11 | 0), y = py + 2 + (r() * 11 | 0), c = cols[r() * cols.length | 0];
    P(ctx, x, y + 1, 1, 2, '#3d8a33'); P(ctx, x - 1, y, 3, 1, c); P(ctx, x, y - 1, 1, 3, c); P(ctx, x, y, 1, 1, '#ffe9a8');
  }
}
function drawCobble(ctx, px, py, r, base = '#a9a497') {
  P(ctx, px, py, 16, 16, shade(base, -0.22));
  const tones = [base, shade(base, 0.08), shade(base, -0.05), shade(base, 0.14)];
  for (let row = 0; row < 2; row++) {
    const off = ((py / 16 + row) % 2) ? 4 : 0;
    for (let col = -1; col < 3; col++) {
      const x = px + col * 8 + off, y = py + row * 8;
      const x0 = Math.max(px, x + 1), x1 = Math.min(px + 16, x + 7);
      if (x1 <= x0) continue;
      const t = tones[r() * tones.length | 0];
      P(ctx, x0, y + 1, x1 - x0, 6, t);
      P(ctx, x0, y + 1, x1 - x0, 1, shade(t, 0.2));
      P(ctx, x0, y + 6, x1 - x0, 1, shade(t, -0.18));
    }
  }
}
function drawSlab(ctx, px, py, r, base = '#e0d3b8') {
  P(ctx, px, py, 16, 16, shade(base, -0.16));
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    const t = shade(base, (r() - .5) * .08);
    P(ctx, px + i * 8 + 1, py + j * 8 + 1, 7, 7, t);
    P(ctx, px + i * 8 + 1, py + j * 8 + 1, 7, 1, shade(t, .15));
  }
  if (r() < .12) { const x = px + 3 + (r() * 9 | 0), y = py + 3 + (r() * 9 | 0); P(ctx, x, y, 2, 1, shade(base, -0.3)); P(ctx, x + 2, y + 1, 1, 1, shade(base, -0.3)); }
}
function drawMarble(ctx, px, py, x, y) {
  const a = (x + y) % 2 ? '#e9e6ef' : '#cfc9dc';
  P(ctx, px, py, 16, 16, a); P(ctx, px, py, 16, 1, shade(a, .3)); P(ctx, px + 3, py + 5, 6, 1, shade(a, -0.08)); P(ctx, px + 8, py + 6, 4, 1, shade(a, -0.08));
}
function drawDirt(ctx, px, py, r, base = '#c9a46d') {
  P(ctx, px, py, 16, 16, base);
  for (let i = 0; i < 7; i++) P(ctx, px + (r() * 15 | 0), py + (r() * 15 | 0), 1 + (r() * 2 | 0), 1, r() < .5 ? shade(base, -0.18) : shade(base, 0.15));
}
function drawWood(ctx, px, py, r, base = '#c18a55') {
  P(ctx, px, py, 16, 16, base);
  for (let j = 0; j < 4; j++) {
    const t = shade(base, (r() - .5) * .1);
    P(ctx, px, py + j * 4, 16, 3, t); P(ctx, px, py + j * 4 + 3, 16, 1, shade(base, -0.28));
    const s = (r() * 14 | 0); P(ctx, px + s, py + j * 4, 1, 3, shade(base, -0.28));
    if (r() < .4) P(ctx, px + (r() * 14 | 0), py + j * 4 + 1, 2, 1, shade(t, -0.12));
  }
}
function drawCaveFloor(ctx, px, py, r) {
  const b = '#7a6655'; P(ctx, px, py, 16, 16, b);
  for (let i = 0; i < 10; i++) P(ctx, px + (r() * 15 | 0), py + (r() * 15 | 0), 1 + (r() * 2 | 0), 1, r() < .6 ? '#68564a' : '#8d7a68');
  if (r() < .2) { const x = px + 3 + (r() * 9 | 0), y = py + 4 + (r() * 8 | 0); P(ctx, x, y, 3, 2, '#958473'); P(ctx, x, y + 2, 3, 1, '#4e4038'); }
}
function drawDungeonFloor(ctx, px, py, r) {
  P(ctx, px, py, 16, 16, '#2f3345');
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    const t = shade('#4a5068', (r() - .5) * .14);
    P(ctx, px + i * 8 + 1, py + j * 8 + 1, 7, 7, t); P(ctx, px + i * 8 + 1, py + j * 8 + 1, 7, 1, shade(t, .14));
  }
  if (r() < .18) P(ctx, px + (r() * 12 | 0) + 2, py + (r() * 12 | 0) + 2, 2, 1, '#5d8a5a');
}
function drawWater(ctx, px, py, r, N) {
  P(ctx, px, py, 16, 16, '#3f8fdc');
  for (let i = 0; i < 3; i++) { const x = px + (r() * 12 | 0), y = py + 2 + (r() * 12 | 0); P(ctx, x, y, 3, 1, '#78b8f0'); }
  if (N(0, -1) !== '~') { P(ctx, px, py, 16, 3, '#2c6aa8'); P(ctx, px, py, 16, 1, '#d7cfbf'); }
  if (N(-1, 0) !== '~') P(ctx, px, py, 1, 16, '#d7cfbf');
  if (N(1, 0) !== '~') P(ctx, px + 15, py, 1, 16, '#d7cfbf');
  if (N(0, 1) !== '~') P(ctx, px, py + 15, 16, 1, '#d7cfbf');
}
function drawTree(ctx, px, py, r, pine) {
  P(ctx, px + 4, py + 13, 8, 3, 'rgba(0,0,0,.22)');
  P(ctx, px + 6, py + 9, 4, 6, '#7a4b2a'); P(ctx, px + 6, py + 9, 1, 6, '#5a361d');
  if (pine) {
    const g = ['#2f7a45', '#3f9658', '#246139'];
    for (let k = 0; k < 4; k++) { const w = 4 + k * 3, y = py - 6 + k * 4; P(ctx, px + 8 - w / 2 - 1, y + 3, w + 2, 1, OUT); P(ctx, px + 8 - w / 2, y, w, 4, g[0]); P(ctx, px + 8 - w / 2, y, 2, 2, g[1]); P(ctx, px + 8 + w / 2 - 2, y + 2, 2, 2, g[2]); }
    return;
  }
  const cx = px + 8, cy = py + 4;
  const blob = (x, y, rad, c) => { for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) if (i * i + j * j <= rad * rad + 1) P(ctx, x + i, y + j, 1, 1, c); };
  blob(cx, cy, 8, '#1f4d26'); blob(cx, cy, 7, '#3a8f3c'); blob(cx - 2, cy - 2, 5, '#4daa48'); blob(cx - 3, cy - 3, 2, '#6cc95e'); blob(cx + 3, cy + 3, 3, '#2f7a33');
  if (r() < .3) { P(ctx, cx + 2, cy - 1, 2, 2, '#ff6b6b'); P(ctx, cx - 4, cy + 2, 2, 2, '#ff6b6b'); }
}
function drawBush(ctx, px, py, r) {
  const blob = (x, y, rad, c) => { for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) if (i * i + j * j <= rad * rad) P(ctx, x + i, y + j, 1, 1, c); };
  P(ctx, px + 2, py + 13, 12, 2, 'rgba(0,0,0,.2)');
  blob(px + 8, py + 9, 6, '#24572b'); blob(px + 8, py + 9, 5, '#3d9443'); blob(px + 6, py + 7, 3, '#55b04f');
  if (r() < .5) { P(ctx, px + 10, py + 9, 1, 1, '#ff5d7a'); P(ctx, px + 5, py + 11, 1, 1, '#ff5d7a'); }
}
function drawRock(ctx, px, py) {
  P(ctx, px + 2, py + 13, 12, 2, 'rgba(0,0,0,.25)');
  P(ctx, px + 3, py + 5, 10, 9, OUT); P(ctx, px + 4, py + 4, 8, 1, OUT);
  P(ctx, px + 4, py + 5, 8, 8, '#8e8a86'); P(ctx, px + 4, py + 5, 5, 3, '#b5b0aa'); P(ctx, px + 9, py + 10, 3, 3, '#6c6864');
}
function drawFence(ctx, px, py, N) {
  const w = '#a0703f', d = '#6e4826';
  P(ctx, px, py + 6, 16, 2, w); P(ctx, px, py + 10, 16, 2, w); P(ctx, px, py + 8, 16, 1, d); P(ctx, px, py + 12, 16, 1, d);
  P(ctx, px + 6, py + 3, 4, 11, w); P(ctx, px + 6, py + 3, 4, 1, shade(w, .2)); P(ctx, px + 9, py + 4, 1, 10, d);
}
function drawLamp(ctx, px, py) {
  P(ctx, px + 7, py + 3, 2, 12, '#2d2d38'); P(ctx, px + 5, py + 14, 6, 2, '#2d2d38');
  P(ctx, px + 4, py - 3, 8, 7, '#2d2d38'); P(ctx, px + 5, py - 2, 6, 5, '#ffd36b'); P(ctx, px + 6, py - 1, 2, 2, '#fff5c4');
  P(ctx, px + 3, py - 4, 10, 1, '#2d2d38');
}
function drawSign(ctx, px, py) {
  P(ctx, px + 7, py + 8, 2, 8, '#6e4826');
  P(ctx, px + 1, py + 1, 14, 9, OUT); P(ctx, px + 2, py + 2, 12, 7, '#c99a5b'); P(ctx, px + 2, py + 2, 12, 1, '#e0b878');
  P(ctx, px + 4, py + 4, 8, 1, '#6e4826'); P(ctx, px + 4, py + 6, 6, 1, '#6e4826');
}
function drawNotice(ctx, px, py) {
  P(ctx, px + 1, py + 10, 2, 6, '#6e4826'); P(ctx, px + 13, py + 10, 2, 6, '#6e4826');
  P(ctx, px, py, 16, 12, OUT); P(ctx, px + 1, py + 1, 14, 10, '#9a6a3c');
  P(ctx, px + 2, py + 2, 5, 6, '#fff8e0'); P(ctx, px + 8, py + 3, 5, 5, '#ffe2e2'); P(ctx, px + 4, py + 2, 1, 1, '#e04040'); P(ctx, px + 10, py + 3, 1, 1, '#e04040');
  P(ctx, px + 3, py + 4, 3, 1, '#888'); P(ctx, px + 9, py + 5, 3, 1, '#888');
}
function drawBarrel(ctx, px, py) {
  P(ctx, px + 3, py + 14, 10, 2, 'rgba(0,0,0,.25)');
  P(ctx, px + 3, py + 2, 10, 13, OUT); P(ctx, px + 4, py + 3, 8, 11, '#a5673a'); P(ctx, px + 4, py + 3, 3, 11, '#c07e4a');
  P(ctx, px + 4, py + 5, 8, 1, '#4a4a52'); P(ctx, px + 4, py + 11, 8, 1, '#4a4a52'); P(ctx, px + 5, py + 3, 6, 2, '#7a4a28');
}
function drawCrate(ctx, px, py) {
  P(ctx, px + 2, py + 3, 12, 12, OUT); P(ctx, px + 3, py + 4, 10, 10, '#c89458');
  P(ctx, px + 3, py + 4, 10, 1, '#e0b070'); P(ctx, px + 3, py + 8, 10, 1, '#8e6334');
  for (let i = 0; i < 6; i++) { P(ctx, px + 4 + i, py + 5 + i, 2, 1, '#8e6334'); }
}
function drawChest(ctx, px, py, open) {
  P(ctx, px + 2, py + 14, 12, 2, 'rgba(0,0,0,.25)');
  P(ctx, px + 1, py + 5, 14, 10, OUT);
  if (open) { P(ctx, px + 2, py + 2, 12, 4, OUT); P(ctx, px + 3, py + 3, 10, 2, '#6b3f1d'); P(ctx, px + 2, py + 6, 12, 3, '#2b1a10'); P(ctx, px + 5, py + 6, 6, 2, '#ffd75e'); }
  else { P(ctx, px + 2, py + 6, 12, 4, '#a5612f'); P(ctx, px + 2, py + 6, 12, 1, '#c98048'); }
  P(ctx, px + 2, py + 10, 12, 4, '#8a4f24'); P(ctx, px + 2, py + 9, 12, 1, '#e8b83a');
  P(ctx, px + 7, py + 8, 2, 3, '#e8b83a'); P(ctx, px + 2, py + 6, 1, 8, '#e8b83a'); P(ctx, px + 13, py + 6, 1, 8, '#e8b83a');
}
function drawRoof(ctx, px, py, ch, N, r) {
  const [b, d, l, dd] = ROOF[ch];
  P(ctx, px, py, 16, 16, b);
  for (let row = 0; row < 4; row++) {
    const y = py + row * 4, off = ((py / 16 * 4 + row) % 2) ? 4 : 0;
    P(ctx, px, y + 3, 16, 1, d);
    for (let x = px - 8 + off; x < px + 16; x += 8) { if (x + 7 >= px && x + 7 < px + 16) P(ctx, x + 7, y, 1, 3, d); if (x + 1 >= px && x + 1 < px + 16) P(ctx, x + 1, y, 3, 1, l); }
  }
  const up = N(0, -1), dn = N(0, 1);
  if (up !== ch) { P(ctx, px, py, 16, 1, dd); P(ctx, px, py + 1, 16, 2, l); }
  if (dn !== ch) { P(ctx, px, py + 13, 16, 3, dd); P(ctx, px, py + 12, 16, 1, d); }
  if (N(-1, 0) !== ch) P(ctx, px, py, 1, 16, dd);
  if (N(1, 0) !== ch) P(ctx, px + 15, py, 1, 16, dd);
}
function drawFacade(ctx, px, py, kind, N, theme) {
  const plaster = '#efe3c8', beam = '#7a5236', stone = '#a59c8c';
  P(ctx, px, py, 16, 16, plaster);
  P(ctx, px, py, 16, 2, beam);
  const isW = c => c === 'W' || c === 'w' || c === 'D' || c === 'E';
  if (!isW(N(-1, 0))) P(ctx, px, py, 2, 16, beam);
  if (!isW(N(1, 0))) P(ctx, px + 14, py, 2, 16, beam);
  if (!isW(N(0, 1))) { P(ctx, px, py + 12, 16, 4, stone); P(ctx, px, py + 12, 16, 1, '#c2bbad'); P(ctx, px + 5, py + 13, 1, 3, '#857c6e'); P(ctx, px + 11, py + 13, 1, 3, '#857c6e'); }
  if (kind === 'w') {
    P(ctx, px + 3, py + 3, 10, 9, '#5a3b26'); P(ctx, px + 4, py + 4, 8, 7, '#8fcaf7'); P(ctx, px + 4, py + 4, 3, 3, '#d4ecff');
    P(ctx, px + 7, py + 4, 1, 7, '#5a3b26'); P(ctx, px + 4, py + 7, 8, 1, '#5a3b26');
    P(ctx, px + 3, py + 11, 10, 2, '#7a4a28'); P(ctx, px + 4, py + 10, 1, 1, '#ff6b8f'); P(ctx, px + 7, py + 10, 1, 1, '#ffd84d'); P(ctx, px + 10, py + 10, 1, 1, '#ff6b8f');
  }
  if (kind === 'D') drawDoor(ctx, px, py, N);
}
// 2칸 높이 아치형 문 (캐릭터 키에 맞춤)
function drawDoor(ctx, px, py, N, locked) {
  const top = py - 10, stone = '#b9b0a0', stoneD = '#857c6e', wood = '#8a5a33', woodD = '#5e3a1f', woodL = '#b07a48';
  // 돌 문틀 (아치)
  P(ctx, px + 1, top + 3, 14, 23, OUT); P(ctx, px + 3, top + 1, 10, 2, OUT); P(ctx, px + 2, top + 2, 12, 1, OUT);
  P(ctx, px + 2, top + 3, 12, 23, stone); P(ctx, px + 4, top + 2, 8, 1, stone); P(ctx, px + 3, top + 3, 1, 1, stone);
  P(ctx, px + 2, top + 3, 1, 23, '#d8d0c0'); P(ctx, px + 13, top + 4, 1, 22, stoneD);
  for (let j = top + 7; j < py + 16; j += 5) { P(ctx, px + 2, j, 2, 1, stoneD); P(ctx, px + 12, j + 2, 2, 1, stoneD); }
  P(ctx, px + 7, top + 2, 2, 2, '#e1b13d');
  // 문짝
  P(ctx, px + 4, top + 5, 8, 21, woodD); P(ctx, px + 5, top + 4, 6, 1, woodD);
  P(ctx, px + 5, top + 5, 6, 21, wood); P(ctx, px + 6, top + 4, 4, 1, wood);
  for (let i = px + 6; i < px + 11; i += 2) P(ctx, i, top + 6, 1, 19, woodD);
  P(ctx, px + 5, top + 5, 1, 21, woodL);
  P(ctx, px + 4, top + 10, 8, 1, '#3b3b44'); P(ctx, px + 4, py + 10, 8, 1, '#3b3b44');
  P(ctx, px + 9, py + 3, 2, 2, '#ffd75e'); P(ctx, px + 9, py + 3, 1, 1, '#fff2b0');
  P(ctx, px + 1, py + 14, 14, 2, '#6f675b'); P(ctx, px + 1, py + 14, 14, 1, '#9a9283');
  if (locked) { P(ctx, px + 4, top + 13, 8, 2, '#7a6a5a'); P(ctx, px + 4, top + 13, 8, 1, '#9a8a7a'); P(ctx, px + 7, top + 15, 2, 3, '#4a4a52'); }
}
function drawStoneWall(ctx, px, py, N, r, theme) {
  const below = N(0, 1), face = theme === 'interior' || theme === 'cave' || theme === 'dungeon' ? (below !== '#' && below !== '!' && below !== 'g' && below !== 'u') : (below && !SOLID.has(below) || below === 'D');
  const pal = {
    town: ['#8f8a86', '#a8a39e', '#6f6a66', '#4a4643'],
    interior: ['#7b5a43', '#93704f', '#5c4231', '#3a2a20'],
    cave: ['#5d4c43', '#77655a', '#45372f', '#2c221d'],
    dungeon: ['#3c4058', '#545a78', '#2c2f42', '#191b27'],
    forest: ['#7d7468', '#9a9184', '#5c554c', '#3b362f']
  }[theme] || ['#8f8a86', '#a8a39e', '#6f6a66', '#4a4643'];
  if (theme === 'interior' && face) {
    P(ctx, px, py, 16, 16, '#e7d9bd'); P(ctx, px, py, 16, 3, '#6d4a33'); P(ctx, px, py + 9, 16, 7, '#8d6142');
    P(ctx, px, py + 9, 16, 1, '#b07e55'); P(ctx, px + 7, py + 10, 1, 6, '#6d4a33'); P(ctx, px + 15, py + 10, 1, 6, '#6d4a33');
    return;
  }
  if (theme === 'interior') { P(ctx, px, py, 16, 16, '#3a2a20'); P(ctx, px + 1, py + 1, 14, 14, '#4d382b'); return; }
  if (!face && (theme === 'cave' || theme === 'dungeon')) {
    P(ctx, px, py, 16, 16, pal[3]);
    for (let i = 0; i < 4; i++) P(ctx, px + (r() * 14 | 0), py + (r() * 14 | 0), 2, 2, pal[2]);
    return;
  }
  if (theme === 'cave') {
    P(ctx, px, py, 16, 16, pal[0]);
    for (let i = 0; i < 7; i++) { const x = px + (r() * 13 | 0), y = py + (r() * 12 | 0), w = 3 + (r() * 4 | 0), h = 2 + (r() * 3 | 0); P(ctx, x, y, w, h, r() < .5 ? pal[1] : pal[2]); P(ctx, x, y, w, 1, shade(pal[1], .15)); }
    P(ctx, px, py + 13, 16, 3, pal[3]); P(ctx, px, py, 16, 1, shade(pal[1], .1));
    return;
  }
  if (theme === 'town' || theme === 'forest') return drawOutdoorWall(ctx, px, py, N, r, pal);
  P(ctx, px, py, 16, 16, pal[0]);
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 4 : 0, y = py + row * 4;
    P(ctx, px, y + 3, 16, 1, pal[2]);
    for (let x = px - 8 + off; x < px + 16; x += 8) { if (x + 7 >= px && x + 7 < px + 16) P(ctx, x + 7, y, 1, 3, pal[2]); if (x + 1 >= px) P(ctx, Math.max(px, x + 1), y, 3, 1, pal[1]); }
  }
  if (theme === 'cave') for (let i = 0; i < 3; i++) P(ctx, px + (r() * 14 | 0), py + (r() * 12 | 0), 1, 3, pal[3]);
  if (theme === 'dungeon' && r() < .3) { P(ctx, px + (r() * 12 | 0), py + 12, 4, 2, '#3f6b45'); }
  if (!face) P(ctx, px, py, 16, 2, pal[3]);
  else P(ctx, px, py + 14, 16, 2, pal[3]);
}
// 성벽 룰타일: 위에서 보이는 윗면(통로) / 앞면(벽돌) / 바깥 테두리를 이웃으로 결정
function drawOutdoorWall(ctx, px, py, N, r, pal) {
  const isW = c => c === '#' || c === '!' || c === 'g' || c === undefined;
  const up = isW(N(0, -1)), dn = isW(N(0, 1)), lf = isW(N(-1, 0)), rt = isW(N(1, 0));
  const top = '#b3ada2', topL = '#cbc5b9', topD = '#8d877c', edge = '#4a4643', face = pal[0], mort = pal[2];
  if (dn) {
    // 윗면: 판석 통로
    P(ctx, px, py, 16, 16, top);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const t = shade(top, (r() - .5) * .08); P(ctx, px + i * 8 + 1, py + j * 8 + 1, 7, 7, t); P(ctx, px + i * 8 + 1, py + j * 8 + 1, 7, 1, topL); P(ctx, px + i * 8 + 1, py + j * 8 + 7, 7, 1, topD); }
    if (r() < .25) P(ctx, px + 3 + (r() * 9 | 0), py + 4 + (r() * 8 | 0), 2, 1, '#6fa04a');
    // 바깥쪽 난간(총안)
    if (!up) { P(ctx, px, py, 16, 4, topD); for (let i = 0; i < 16; i += 6) { P(ctx, px + i, py - 3, 4, 5, topL); P(ctx, px + i, py - 3, 4, 1, '#e2ddd2'); P(ctx, px + i + 3, py - 2, 1, 4, topD); } P(ctx, px, py + 4, 16, 1, edge); }
    if (!lf) { P(ctx, px, py, 3, 16, topD); P(ctx, px, py, 1, 16, edge); }
    if (!rt) { P(ctx, px + 13, py, 3, 16, topD); P(ctx, px + 15, py, 1, 16, edge); }
    if (!up && !lf) P(ctx, px, py - 3, 3, 4, topD);
    if (!up && !rt) P(ctx, px + 13, py - 3, 3, 4, topD);
    // 안쪽 모서리 (대각선 계단 이음새)
    if (up && lf && !isW(N(-1, -1))) { P(ctx, px, py, 3, 3, topD); P(ctx, px, py, 1, 1, edge); }
    if (up && rt && !isW(N(1, -1))) { P(ctx, px + 13, py, 3, 3, topD); P(ctx, px + 15, py, 1, 1, edge); }
    return;
  }
  // 앞면: 벽돌
  P(ctx, px, py, 16, 16, face);
  for (let row = 0; row < 4; row++) {
    const off = ((py / 16 * 4 + row) % 2) ? 4 : 0, y = py + row * 4;
    P(ctx, px, y + 3, 16, 1, mort);
    for (let x = px - 8 + off; x < px + 16; x += 8) { if (x + 7 >= px && x + 7 < px + 16) P(ctx, x + 7, y, 1, 3, mort); if (x + 1 >= px) P(ctx, Math.max(px, x + 1), y, 3, 1, pal[1]); }
  }
  if (r() < .3) P(ctx, px + 2 + (r() * 10 | 0), py + 9 + (r() * 4 | 0), 3, 1, '#5f8a3e');
  if (up) { P(ctx, px, py, 16, 2, topL); P(ctx, px, py + 2, 16, 1, edge); }
  else { P(ctx, px, py, 16, 3, topD); for (let i = 0; i < 16; i += 6) { P(ctx, px + i, py - 3, 4, 4, topL); P(ctx, px + i + 3, py - 2, 1, 3, topD); } P(ctx, px, py + 3, 16, 1, edge); }
  P(ctx, px, py + 13, 16, 3, shade(face, -0.3)); P(ctx, px, py + 15, 16, 1, edge);
  if (!lf) { P(ctx, px, py, 2, 16, shade(face, .12)); P(ctx, px, py, 1, 16, edge); }
  if (!rt) { P(ctx, px + 14, py, 2, 16, shade(face, -0.25)); P(ctx, px + 15, py, 1, 16, edge); }
}
// 길 룰타일: 풀밭과 닿는 쪽을 둥글게 깎고 풀이 살짝 덮이게
const ROADISH = new Set('=ps'.split(''));
// 물체 밑바닥: 주변 4칸 중 2칸 이상이 같은 길이면 그 길 위에 놓인 것으로 본다
function roadUnder(at, x, y) { const cnt = {}; for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const c = at(x + dx, y + dy); if (ROADISH.has(c)) cnt[c] = (cnt[c] || 0) + 1; } let best = null; for (const k in cnt) if (cnt[k] >= 2 && (!best || cnt[k] > cnt[best])) best = k; return best; }
function roadEdges(ctx, map, at, theme) {
  if (theme !== 'town' && theme !== 'forest') return;
  const STRUCT = new Set((ROOFCH.join('') + 'WwDE#!~lgiFKz').split(''));
  const grassy = c => c !== undefined && !ROADISH.has(c) && !STRUCT.has(c);
  const isRoadAt = (x, y) => { const c = at(x, y); return ROADISH.has(c) || (!STRUCT.has(c) && c !== '.' && c !== ',' && !!roadUnder(at, x, y)); };
  const gBase = theme === 'forest' ? '#5aa845' : '#6fbf4f', gL = shade(gBase, .16), gD = shade(gBase, -0.16);
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const ch = at(x, y); if (!ROADISH.has(ch)) continue;
    const G = (dx, dy) => { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= map.w || Y >= map.h) return false; const c = map.g[Y][X]; return grassy(c) && !isRoadAt(X, Y); };
    const n = G(0, -1), s = G(0, 1), w = G(-1, 0), e = G(1, 0);
    const nw = G(-1, -1), ne = G(1, -1), sw = G(-1, 1), se = G(1, 1);
    if (!(n || s || w || e || nw || ne || sw || se)) continue;
    const r = rng(x * 92821 ^ y * 68917 ^ 5), px = x * TS, py = y * TS;
    const nz = () => Array.from({ length: 16 }, () => (r() < .35 ? 1 : 0) + (r() < .12 ? 1 : 0));
    const nN = nz(), nS = nz(), nW = nz(), nE = nz();
    const dirt = ch === 's';
    const mask = [];
    for (let ly = 0; ly < 16; ly++) { mask.push([]); for (let lx = 0; lx < 16; lx++) {
      let g = false;
      if (n && ly < 2 + nN[lx]) g = true;
      if (s && ly > 13 - nS[lx]) g = true;
      if (w && lx < 2 + nW[ly]) g = true;
      if (e && lx > 13 - nE[ly]) g = true;
      const R = 6;
      if (n && w && lx < R && ly < R && (lx - R) ** 2 + (ly - R) ** 2 > (R - 1.5) ** 2) g = true;
      if (n && e && lx > 15 - R && ly < R && (lx - (15 - R)) ** 2 + (ly - R) ** 2 > (R - 1.5) ** 2) g = true;
      if (s && w && lx < R && ly > 15 - R && (lx - R) ** 2 + (ly - (15 - R)) ** 2 > (R - 1.5) ** 2) g = true;
      if (s && e && lx > 15 - R && ly > 15 - R && (lx - (15 - R)) ** 2 + (ly - (15 - R)) ** 2 > (R - 1.5) ** 2) g = true;
      if (!n && !w && nw && lx * lx + ly * ly < 8) g = true;
      if (!n && !e && ne && (15 - lx) ** 2 + ly * ly < 8) g = true;
      if (!s && !w && sw && lx * lx + (15 - ly) ** 2 < 8) g = true;
      if (!s && !e && se && (15 - lx) ** 2 + (15 - ly) ** 2 < 8) g = true;
      mask[ly].push(g);
    } }
    const M = (lx, ly) => lx < 0 || ly < 0 || lx > 15 || ly > 15 ? null : mask[ly][lx];
    for (let ly = 0; ly < 16; ly++) for (let lx = 0; lx < 16; lx++) {
      if (mask[ly][lx]) {
        const edgeP = M(lx, ly + 1) === false || M(lx + 1, ly) === false || M(lx - 1, ly) === false || M(lx, ly - 1) === false;
        P(ctx, px + lx, py + ly, 1, 1, edgeP ? (M(lx, ly + 1) === false ? gD : gL) : (r() < .12 ? gL : r() < .08 ? gD : gBase));
      } else if (!dirt && (M(lx, ly - 1) || M(lx - 1, ly) || M(lx + 1, ly))) { ctx.fillStyle = 'rgba(40,30,20,.28)'; ctx.fillRect(px + lx, py + ly, 1, 1); }
    }
  }
}
function drawBridge(ctx, px, py, N) {
  P(ctx, px, py, 16, 16, '#3f8fdc');
  const vert = N(0, -1) === 'l' || N(0, 1) === 'l' || N(0, -1) === '=' || N(0, 1) === '=';
  if (vert) { P(ctx, px + 1, py, 14, 16, '#a0703f'); for (let j = 0; j < 16; j += 4) { P(ctx, px + 1, py + j + 3, 14, 1, '#6e4826'); P(ctx, px + 1, py + j, 14, 1, '#c08a55'); } P(ctx, px, py, 2, 16, '#5a361d'); P(ctx, px + 14, py, 2, 16, '#5a361d'); }
  else { P(ctx, px, py + 1, 16, 14, '#a0703f'); for (let i = 0; i < 16; i += 4) { P(ctx, px + i + 3, py + 1, 1, 14, '#6e4826'); P(ctx, px + i, py + 1, 1, 14, '#c08a55'); } P(ctx, px, py, 16, 2, '#5a361d'); P(ctx, px, py + 14, 16, 2, '#5a361d'); }
}
function drawCarpet(ctx, px, py, N) {
  P(ctx, px, py, 16, 16, '#a8323c');
  for (let i = 0; i < 16; i += 4) P(ctx, px + i, py + 7, 2, 2, '#c2454f');
  if (N(0, -1) !== 'r') P(ctx, px, py, 16, 2, '#e1b13d');
  if (N(0, 1) !== 'r') P(ctx, px, py + 14, 16, 2, '#e1b13d');
  if (N(-1, 0) !== 'r') P(ctx, px, py, 2, 16, '#e1b13d');
  if (N(1, 0) !== 'r') P(ctx, px + 14, py, 2, 16, '#e1b13d');
}
function drawShelf(ctx, px, py, r) {
  P(ctx, px, py - 4, 16, 20, OUT); P(ctx, px + 1, py - 3, 14, 18, '#7a4a28');
  for (let s = 0; s < 3; s++) {
    const y = py - 2 + s * 6;
    P(ctx, px + 2, y, 12, 5, '#3a2416');
    for (let x = px + 2; x < px + 14;) { const w = 1 + (r() * 2 | 0); const h = 3 + (r() * 2 | 0); P(ctx, x, y + 5 - h, w, h, ['#c94a4a', '#3d7bd9', '#e8b83a', '#4aa36a', '#9b59d0', '#e0e0e0'][r() * 6 | 0]); x += w + (r() < .2 ? 1 : 0); }
    P(ctx, px + 1, y + 5, 14, 1, '#a0703f');
  }
}
function drawTable(ctx, px, py, r) {
  P(ctx, px + 1, py + 13, 14, 2, 'rgba(0,0,0,.25)');
  P(ctx, px + 1, py + 3, 14, 10, OUT); P(ctx, px + 2, py + 4, 12, 7, '#b5773f'); P(ctx, px + 2, py + 4, 12, 1, '#d39556'); P(ctx, px + 2, py + 11, 12, 2, '#7a4a28');
  const k = r() * 4 | 0;
  if (k === 0) { P(ctx, px + 5, py + 5, 3, 3, '#e0e0e0'); P(ctx, px + 6, py + 6, 1, 1, '#8a5a33'); }
  if (k === 1) { P(ctx, px + 8, py + 5, 4, 3, '#3d7bd9'); P(ctx, px + 8, py + 5, 4, 1, '#fff'); }
  if (k === 2) { P(ctx, px + 7, py + 3, 1, 3, '#fff3c4'); P(ctx, px + 7, py + 2, 1, 1, '#ffb84d'); }
}
function drawChair(ctx, px, py) { P(ctx, px + 4, py + 6, 8, 7, OUT); P(ctx, px + 5, py + 7, 6, 4, '#a0703f'); P(ctx, px + 5, py + 7, 6, 1, '#c08a55'); P(ctx, px + 5, py + 11, 1, 2, '#6e4826'); P(ctx, px + 10, py + 11, 1, 2, '#6e4826'); }
function drawBed(ctx, px, py) {
  P(ctx, px + 1, py - 2, 14, 18, OUT); P(ctx, px + 2, py - 1, 12, 16, '#8a5a33');
  P(ctx, px + 3, py, 10, 4, '#f4f1ea'); P(ctx, px + 3, py + 4, 10, 10, '#4f7fd6'); P(ctx, px + 3, py + 4, 10, 1, '#79a3ee'); P(ctx, px + 3, py + 8, 10, 1, '#3a62ad');
}
function drawCounter(ctx, px, py, N) {
  P(ctx, px, py + 2, 16, 13, OUT); P(ctx, px, py + 3, 16, 5, '#b5773f'); P(ctx, px, py + 3, 16, 1, '#d39556'); P(ctx, px, py + 8, 16, 6, '#7a4a28');
  P(ctx, px + 3, py + 9, 1, 5, '#5a361d'); P(ctx, px + 11, py + 9, 1, 5, '#5a361d');
  if (N(-1, 0) !== 'Q') P(ctx, px, py + 2, 1, 13, OUT); if (N(1, 0) !== 'Q') P(ctx, px + 15, py + 2, 1, 13, OUT);
}
function drawFireplace(ctx, px, py) { P(ctx, px, py - 4, 16, 20, '#5c5550'); P(ctx, px + 1, py - 3, 14, 3, '#7b736d'); P(ctx, px + 3, py + 3, 10, 12, '#1a1210'); P(ctx, px + 2, py + 14, 12, 2, '#3a3330'); }
function drawPillar(ctx, px, py) { P(ctx, px + 3, py - 8, 10, 24, OUT); P(ctx, px + 4, py - 7, 8, 22, '#ece8f2'); P(ctx, px + 4, py - 7, 2, 22, '#ffffff'); P(ctx, px + 10, py - 7, 2, 22, '#c4bfd0'); P(ctx, px + 3, py - 8, 10, 2, '#d8d3e0'); P(ctx, px + 3, py + 13, 10, 3, '#d8d3e0'); }
function drawAnvil(ctx, px, py) { P(ctx, px + 5, py + 9, 6, 6, '#6e4826'); P(ctx, px + 2, py + 4, 12, 5, OUT); P(ctx, px + 3, py + 5, 10, 3, '#6a6f7c'); P(ctx, px + 3, py + 5, 10, 1, '#9aa1b0'); P(ctx, px + 1, py + 5, 2, 2, '#6a6f7c'); }
function drawCauldron(ctx, px, py) { P(ctx, px + 2, py + 5, 12, 10, OUT); P(ctx, px + 3, py + 6, 10, 8, '#2f2f3a'); P(ctx, px + 3, py + 6, 10, 2, '#5fd36a'); P(ctx, px + 4, py + 9, 2, 3, '#474757'); P(ctx, px + 3, py + 14, 2, 2, '#2f2f3a'); P(ctx, px + 11, py + 14, 2, 2, '#2f2f3a'); }
function drawAltar(ctx, px, py) { P(ctx, px + 1, py + 4, 14, 11, OUT); P(ctx, px + 2, py + 5, 12, 9, '#c9c3d8'); P(ctx, px + 2, py + 5, 12, 2, '#ffffff'); P(ctx, px + 4, py + 2, 1, 3, '#fff3c4'); P(ctx, px + 11, py + 2, 1, 3, '#fff3c4'); P(ctx, px + 4, py + 1, 1, 1, '#ffb84d'); P(ctx, px + 11, py + 1, 1, 1, '#ffb84d'); P(ctx, px + 6, py + 8, 4, 4, '#e1b13d'); }
function drawStatue(ctx, px, py) {
  P(ctx, px + 3, py + 11, 10, 5, '#8e8a96'); P(ctx, px + 2, py + 10, 12, 2, '#b8b4c2');
  P(ctx, px + 5, py - 6, 6, 16, OUT); P(ctx, px + 6, py - 5, 4, 15, '#dcd8e6'); P(ctx, px + 6, py - 9, 4, 4, OUT); P(ctx, px + 7, py - 8, 2, 3, '#dcd8e6');
  P(ctx, px + 3, py - 2, 3, 1, '#dcd8e6'); P(ctx, px + 10, py - 4, 3, 1, '#dcd8e6'); P(ctx, px + 12, py - 6, 1, 3, '#e1b13d');
}
function drawPotionShelf(ctx, px, py, r) {
  P(ctx, px, py - 4, 16, 20, OUT); P(ctx, px + 1, py - 3, 14, 18, '#5c3a22');
  for (let s = 0; s < 3; s++) { const y = py - 2 + s * 6; P(ctx, px + 1, y + 5, 14, 1, '#a0703f'); for (let i = 0; i < 3; i++) { const c = ['#ff5d7a', '#5fd36a', '#5aa9ff', '#c88bff', '#ffd84d'][r() * 5 | 0]; P(ctx, px + 2 + i * 4, y + 1, 3, 4, c); P(ctx, px + 3 + i * 4, y, 1, 1, '#ddd'); P(ctx, px + 2 + i * 4, y + 1, 1, 1, '#fff'); } }
}
function drawCrystal(ctx, px, py) { P(ctx, px + 6, py + 1, 4, 13, OUT); P(ctx, px + 7, py + 2, 2, 11, '#7ef0ff'); P(ctx, px + 7, py + 2, 1, 6, '#e8fdff'); P(ctx, px + 3, py + 7, 3, 7, OUT); P(ctx, px + 4, py + 8, 1, 5, '#4fd0e6'); P(ctx, px + 10, py + 6, 3, 8, OUT); P(ctx, px + 11, py + 7, 1, 6, '#4fd0e6'); }
function drawLava(ctx, px, py, r) { P(ctx, px, py, 16, 16, '#d9480f'); for (let i = 0; i < 5; i++) P(ctx, px + (r() * 13 | 0), py + (r() * 13 | 0), 3, 2, '#ff922b'); P(ctx, px + (r() * 12 | 0), py + (r() * 12 | 0), 2, 2, '#ffe066'); }
function drawStairs(ctx, px, py, up, theme) {
  const b = theme === 'dungeon' || theme === 'cave' ? '#6b6f80' : '#a0703f';
  if (up) { for (let i = 0; i < 4; i++) { P(ctx, px + 1, py + i * 4, 14, 4, shade(b, .25 - i * .1)); P(ctx, px + 1, py + i * 4 + 3, 14, 1, shade(b, -0.35)); } P(ctx, px, py, 1, 16, OUT); P(ctx, px + 15, py, 1, 16, OUT); }
  else { P(ctx, px, py, 16, 16, '#141018'); for (let i = 0; i < 3; i++) P(ctx, px + 2 + i, py + 3 + i * 4, 12 - i * 2, 3, shade(b, -0.1 - i * .15)); }
}
function drawBench(ctx, px, py) { P(ctx, px + 1, py + 5, 14, 7, OUT); P(ctx, px + 2, py + 6, 12, 2, '#b5773f'); P(ctx, px + 2, py + 9, 12, 2, '#a0703f'); P(ctx, px + 3, py + 12, 1, 3, '#5a361d'); P(ctx, px + 12, py + 12, 1, 3, '#5a361d'); }
function drawOre(ctx, px, py) { drawRock(ctx, px, py); P(ctx, px + 6, py + 7, 2, 2, '#6ee7ff'); P(ctx, px + 9, py + 9, 1, 1, '#ffe066'); P(ctx, px + 5, py + 10, 1, 1, '#6ee7ff'); }
function drawTelescope(ctx, px, py) { P(ctx, px + 7, py + 8, 2, 7, '#5a361d'); P(ctx, px + 4, py + 14, 8, 1, '#5a361d'); P(ctx, px + 2, py + 2, 12, 5, OUT); P(ctx, px + 3, py + 3, 10, 3, '#d4a23a'); P(ctx, px + 3, py + 3, 10, 1, '#ffe08a'); P(ctx, px + 12, py + 2, 2, 5, '#3a3a48'); }
function drawGate(ctx, px, py, open) {
  if (open) { P(ctx, px, py, 16, 16, '#0d0a12'); P(ctx, px, py, 16, 2, '#3c4058'); return; }
  P(ctx, px, py, 16, 16, '#2c2f42'); P(ctx, px + 1, py + 1, 14, 15, '#454a66'); P(ctx, px + 7, py + 1, 2, 15, '#2c2f42');
  P(ctx, px + 3, py + 5, 2, 2, '#b794ff'); P(ctx, px + 11, py + 5, 2, 2, '#b794ff'); P(ctx, px + 4, py + 10, 1, 3, '#b794ff'); P(ctx, px + 11, py + 10, 1, 3, '#b794ff');
}
function drawBars(ctx, px, py) { for (let i = 1; i < 16; i += 3) { P(ctx, px + i, py - 2, 2, 18, '#5b6070'); P(ctx, px + i, py - 2, 1, 18, '#8a90a2'); } P(ctx, px, py - 2, 16, 2, '#3d4150'); P(ctx, px, py + 6, 16, 1, '#3d4150'); }
function drawMushroom(ctx, px, py, r, base) { drawFloorFor(ctx, px, py, r, base); for (let i = 0; i < 2; i++) { const x = px + 3 + (r() * 9 | 0), y = py + 4 + (r() * 8 | 0); P(ctx, x + 1, y + 2, 1, 2, '#f0e6d2'); P(ctx, x, y, 3, 2, i ? '#ff6b6b' : '#b794ff'); P(ctx, x + 1, y, 1, 1, '#fff'); } }
function drawBones(ctx, px, py, r, base) { drawFloorFor(ctx, px, py, r, base); P(ctx, px + 4, py + 8, 7, 1, '#e8e2d2'); P(ctx, px + 3, py + 7, 2, 3, '#e8e2d2'); P(ctx, px + 10, py + 7, 2, 3, '#e8e2d2'); P(ctx, px + 8, py + 3, 4, 3, '#e8e2d2'); P(ctx, px + 9, py + 4, 1, 1, '#333'); }
function drawWeb(ctx, px, py, r, base) { drawFloorFor(ctx, px, py, r, base); ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 16; i++) { ctx.fillRect(px + i, py + i, 1, 1); ctx.fillRect(px + 15 - i, py + i, 1, 1); } ctx.fillRect(px, py + 8, 16, 1); ctx.fillRect(px + 8, py, 1, 16); }
function drawDummy(ctx, px, py) { P(ctx, px + 7, py + 4, 2, 12, '#6e4826'); P(ctx, px + 3, py + 6, 10, 2, '#6e4826'); P(ctx, px + 5, py - 2, 6, 6, OUT); P(ctx, px + 6, py - 1, 4, 4, '#e6c58a'); P(ctx, px + 5, py + 4, 6, 7, OUT); P(ctx, px + 6, py + 5, 4, 5, '#e6c58a'); P(ctx, px + 7, py + 6, 2, 2, '#e04040'); }

let MAPREF = null;
function drawFloorFor(ctx, px, py, r, theme) {
  if (theme === 'cave') drawCaveFloor(ctx, px, py, r);
  else if (theme === 'dungeon') drawDungeonFloor(ctx, px, py, r);
  else if (theme === 'interior') drawWood(ctx, px, py, r);
  else if (theme === 'forest') drawGrass(ctx, px, py, r, '#5aa845');
  else drawGrass(ctx, px, py, r);
}

// 맵 전체를 한 장의 캔버스로 미리 그림 (움직이는 것만 매 프레임 덧그림)
function renderMapLayer(map) {
  const W = map.w, H = map.h, cv = mkCanvas(W * TS, H * TS), ctx = cv.getContext('2d');
  const theme = map.theme;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? '#' : map.g[y][x];
  // 1차: 바닥
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = at(x, y), r = rng(x * 7349 ^ y * 9157 ^ (map.seed || 1)), px = x * TS, py = y * TS;
    const N = (dx, dy) => at(x + dx, y + dy);
    switch (ch) {
      case '.': drawFloorFor(ctx, px, py, r, theme === 'interior' ? 'town' : theme); break;
      case ',': drawFlowers(ctx, px, py, r, theme === 'forest' ? '#5aa845' : '#6fbf4f'); break;
      case '=': drawCobble(ctx, px, py, r); break;
      case 'p': drawSlab(ctx, px, py, r); break;
      case 's': drawDirt(ctx, px, py, r); break;
      case '_': drawFloorFor(ctx, px, py, r, theme); break;
      case 'M': drawMarble(ctx, px, py, x, y); break;
      case 'r': drawCarpet(ctx, px, py, N); break;
      case '~': drawWater(ctx, px, py, r, N); break;
      case 'z': drawLava(ctx, px, py, r); break;
      case '^': drawStairs(ctx, px, py, true, theme); break;
      case 'v': drawStairs(ctx, px, py, false, theme); break;
      case 'm': drawMushroom(ctx, px, py, r, theme); break;
      case 'o': drawBones(ctx, px, py, r, theme); break;
      case 'j': drawWeb(ctx, px, py, r, theme); break;
      case 'l': drawBridge(ctx, px, py, N); break;
      default: {
        // 물체 타일은 아래 바닥부터
        let under = map.under && map.under[ch] || (theme === 'town' ? (ch === 'D' ? null : '.') : theme === 'forest' ? '.' : '_');
        if (under === '.' && (theme === 'town' || theme === 'forest')) { const ru = roadUnder(at, x, y); if (ru) { under = ru; if (ru === 's') { drawDirt(ctx, px, py, r); under = null; } } }
        if (under === '=') drawCobble(ctx, px, py, r); else if (under === 'p') drawSlab(ctx, px, py, r); else if (under === 'M') drawMarble(ctx, px, py, x, y); else if (under) drawFloorFor(ctx, px, py, r, theme === 'interior' && under === '.' ? 'town' : theme);
      }
    }
    if (ch === 'D' && theme !== 'town' && theme !== 'forest') { drawFloorFor(ctx, px, py, r, theme); if (theme === 'interior') { P(ctx, px + 2, py + 4, 12, 9, '#8a3a2a'); P(ctx, px + 3, py + 5, 10, 7, '#b0503a'); } }
  }
  roadEdges(ctx, map, at, theme);
  // 그림자: 높은 물체가 오른쪽 아래로 드리움 (한 장에 모아 겹침 없이 한 번에)
  const sh = mkCanvas(W * TS, H * TS), sx = sh.getContext('2d');
  sx.fillStyle = '#000';
  const TALL = new Set('RUVJIGWwDE#TPBkaLSbxHXCQqZOAy!efNd'.split(''));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = at(x, y); if (!TALL.has(ch)) continue;
    const big = ROOFCH.includes(ch) || 'WwDE#'.includes(ch);
    if (theme !== 'town' && theme !== 'forest' && ch === '#') { sx.fillRect(x * TS, y * TS + 10, TS, 10); continue; }
    if (big) sx.fillRect(x * TS + 7, y * TS + 6, TS, TS); else sx.fillRect(x * TS + 4, y * TS + 9, 11, 8);
  }
  ctx.globalAlpha = theme === 'town' || theme === 'forest' ? .2 : .16; ctx.drawImage(sh, 0, 0); ctx.globalAlpha = 1;
  // 2차: 건물과 물체 (위로 튀어나오는 것들이 있어서 줄 순서대로)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = at(x, y), r = rng(x * 3121 ^ y * 5113 ^ 77), px = x * TS, py = y * TS, N = (dx, dy) => at(x + dx, y + dy);
    if (ROOFCH.includes(ch)) drawRoof(ctx, px, py, ch, N, r);
    else if (ch === 'W' || ch === 'w') drawFacade(ctx, px, py, ch === 'w' && 'DE'.includes(N(0, 1)) ? 'W' : ch, N, theme);
    else if (ch === 'E') { drawFacade(ctx, px, py, 'W', N, theme); drawDoor(ctx, px, py, N, true); }
    else if (ch === 'D' && theme === 'town') { drawFacade(ctx, px, py, 'W', N, theme); drawDoor(ctx, px, py, N); }
    else if (ch === 'D' && theme === 'forest') { P(ctx, px, py, 16, 16, '#7d7468'); P(ctx, px + 2, py + 2, 12, 14, '#120d10'); P(ctx, px + 4, py, 8, 2, '#120d10'); }
    switch (ch) {
      case '#': drawStoneWall(ctx, px, py, N, r, theme); break;
      case '!': drawStoneWall(ctx, px, py, N, r, theme); P(ctx, px + 7, py + 7, 2, 7, '#6e4826'); P(ctx, px + 6, py + 6, 4, 2, '#4a4a52'); break;
      case 'T': drawTree(ctx, px, py, r, theme === 'forest' && r() < .45); break;
      case 'b': drawBush(ctx, px, py, r); break;
      case 'x': drawRock(ctx, px, py); break;
      case 'f': drawFence(ctx, px, py, N); break;
      case 'L': drawLamp(ctx, px, py); break;
      case 'S': drawSign(ctx, px, py); break;
      case 'N': drawNotice(ctx, px, py); break;
      case 'H': drawBarrel(ctx, px, py); break;
      case 'X': drawCrate(ctx, px, py); break;
      case 'C': drawChest(ctx, px, py, false); break;
      case 'B': drawShelf(ctx, px, py, r); break;
      case 't': drawTable(ctx, px, py, r); break;
      case 'h': drawChair(ctx, px, py); break;
      case 'Y': drawBed(ctx, px, py); break;
      case 'Q': drawCounter(ctx, px, py, N); break;
      case 'q': if (theme === 'forest') { P(ctx, px + 2, py + 10, 12, 4, '#6e4826'); P(ctx, px + 4, py + 8, 8, 3, '#8a5a33'); for (let i = 0; i < 6; i++) P(ctx, px + 1 + i * 2.5, py + 13 + (i % 2), 2, 2, '#8e8a86'); } else drawFireplace(ctx, px, py); break;
      case 'P': drawPillar(ctx, px, py); break;
      case 'Z': drawAnvil(ctx, px, py); break;
      case 'O': drawCauldron(ctx, px, py); break;
      case 'A': drawAltar(ctx, px, py); break;
      case 'a': drawStatue(ctx, px, py); break;
      case 'k': drawPotionShelf(ctx, px, py, r); break;
      case 'y': drawCrystal(ctx, px, py); break;
      case 'n': drawBench(ctx, px, py); break;
      case 'u': drawOre(ctx, px, py); break;
      case 'e': drawTelescope(ctx, px, py); break;
      case 'i': drawBars(ctx, px, py); break;
      case 'g': drawGate(ctx, px, py, false); break;
      case 'K': break;
      case 'F': break;
      case 'd': drawDummy(ctx, px, py); break;
      case 'c': drawCrate(ctx, px, py); P(ctx, px + 5, py + 6, 6, 5, '#e8e2d2'); P(ctx, px + 6, py + 7, 4, 1, '#888'); break;
    }
  }
  // 큰 장식물
  (map.decor || []).forEach(d => drawDecor(ctx, d));
  return cv;
}

function drawDecor(ctx, d) {
  const px = d.x * TS, py = d.y * TS;
  if (d.kind === 'fountain') {
    const cx = px + 24, cy = py + 26;
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(cx, cy + 14, 26, 8, 0, 0, 7); ctx.fill();
    const oct = (rad, c) => { ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; ctx.lineTo(Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad * .78)); } ctx.fill(); };
    oct(25, OUT); oct(24, '#cfc6b4'); oct(21, '#a99e88'); oct(19, '#3f8fdc'); oct(15, '#5aa2e6');
    P(ctx, cx - 4, cy - 22, 8, 22, OUT); P(ctx, cx - 3, cy - 21, 6, 20, '#d8d0c0'); P(ctx, cx - 3, cy - 21, 2, 20, '#f2ece0');
    P(ctx, cx - 8, cy - 24, 16, 4, OUT); P(ctx, cx - 7, cy - 23, 14, 2, '#d8d0c0');
    // 꼭대기의 작은 종 모양 (정규분포 조각)
    ctx.fillStyle = '#e1b13d'; for (let i = -6; i <= 6; i++) { const h = Math.round(7 * Math.exp(-i * i / 8)); ctx.fillRect(cx + i, cy - 25 - h, 1, h); }
  }
  if (d.kind === 'tent') {
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(px - 1, py + 33); ctx.lineTo(px + 24, py - 6); ctx.lineTo(px + 49, py + 33); ctx.fill();
    ctx.fillStyle = '#7d3fb8'; ctx.beginPath(); ctx.moveTo(px + 1, py + 32); ctx.lineTo(px + 24, py - 4); ctx.lineTo(px + 47, py + 32); ctx.fill();
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#a066e0' : '#7d3fb8'; ctx.beginPath(); ctx.moveTo(px + 24, py - 4); ctx.lineTo(px + 1 + i * 11.5, py + 32); ctx.lineTo(px + 1 + (i + 1) * 11.5, py + 32); ctx.fill(); }
    P(ctx, px + 18, py + 16, 12, 16, '#2b1636'); P(ctx, px + 23, py - 8, 2, 4, '#e1b13d'); P(ctx, px + 21, py - 10, 6, 2, '#e1b13d');
    P(ctx, px + 20, py + 20, 1, 1, '#ffe066'); P(ctx, px + 27, py + 24, 1, 1, '#ffe066');
  }
  if (d.kind === 'shopsign') {
    P(ctx, px + 2, py + 2, 12, 1, '#2d2d38'); P(ctx, px + 3, py + 3, 1, 2, '#2d2d38'); P(ctx, px + 12, py + 3, 1, 2, '#2d2d38');
    P(ctx, px + 1, py + 5, 14, 11, OUT); P(ctx, px + 2, py + 6, 12, 9, '#f3e2b8');
    drawIcon(ctx, d.icon, px + 4, py + 7);
  }
  if (d.kind === 'chimney') { P(ctx, px + 4, py + 2, 8, 12, OUT); P(ctx, px + 5, py + 3, 6, 11, '#8a5a4a'); P(ctx, px + 4, py + 2, 8, 2, '#5a3a2a'); }
  if (d.kind === 'rug') { }
}
function drawIcon(ctx, icon, x, y) {
  const I = (dx, dy, w, h, c) => P(ctx, x + dx, y + dy, w, h, c);
  if (icon === 'sword') { I(3, 0, 2, 5, '#b8c0d0'); I(3, 0, 1, 5, '#fff'); I(1, 5, 6, 1, '#e1b13d'); I(3, 6, 2, 2, '#7a4a28'); }
  if (icon === 'potion') { I(3, 0, 2, 2, '#ddd'); I(1, 2, 6, 5, '#5fd36a'); I(2, 3, 1, 2, '#c8ffd0'); }
  if (icon === 'bed') { I(0, 2, 8, 4, '#4f7fd6'); I(0, 1, 3, 2, '#fff'); I(0, 6, 1, 2, '#7a4a28'); I(7, 6, 1, 2, '#7a4a28'); }
  if (icon === 'book') { I(1, 0, 6, 7, '#3d7bd9'); I(2, 1, 4, 1, '#fff'); I(1, 6, 6, 1, '#fff'); }
  if (icon === 'scale') { I(3, 0, 2, 7, '#7a4a28'); I(0, 2, 8, 1, '#e1b13d'); I(0, 3, 2, 2, '#e1b13d'); I(6, 3, 2, 2, '#e1b13d'); }
  if (icon === 'coin') { I(1, 1, 6, 6, '#e1b13d'); I(2, 2, 4, 4, '#ffd75e'); I(3, 3, 2, 2, '#e1b13d'); }
  if (icon === 'star') { I(3, 0, 2, 7, '#e1b13d'); I(0, 3, 8, 2, '#e1b13d'); I(1, 1, 6, 5, '#ffd75e'); }
  if (icon === 'sigma') { I(1, 0, 6, 1, '#7d3fb8'); I(2, 1, 2, 2, '#7d3fb8'); I(3, 3, 2, 1, '#7d3fb8'); I(2, 4, 2, 2, '#7d3fb8'); I(1, 6, 6, 1, '#7d3fb8'); }
}

// 매 프레임 움직이는 타일들
function drawAnimTile(ctx, ch, px, py, t, x, y) {
  const k = Math.floor(t / 250 + x * 3 + y * 5) % 4;
  if (ch === '~') { if (k === 0) P(ctx, px + 4, py + 6, 3, 1, '#b8dcff'); if (k === 2) P(ctx, px + 9, py + 11, 3, 1, '#b8dcff'); }
  if (ch === '!') { const f = ['#ff922b', '#ffd43b', '#ff6b6b']; P(ctx, px + 6, py + 2 + (k % 2), 4, 4, f[k % 3]); P(ctx, px + 7, py + 1 + (k % 2), 2, 2, '#fff3c4'); }
  if (ch === 'q') { const f = ['#ff922b', '#ffd43b', '#ff6b6b']; for (let i = 0; i < 4; i++) P(ctx, px + 4 + i * 2, py + 8 + ((k + i) % 3), 2, 6 - ((k + i) % 3), f[(k + i) % 3]); }
  if (ch === 'O') { P(ctx, px + 4 + (k % 3) * 3, py + 5 - (k % 2), 2, 2, '#9cff9c'); }
  if (ch === 'z') { if (k % 2) P(ctx, px + 3 + k * 2, py + 6, 3, 2, '#ffe066'); }
  if (ch === 'y') { ctx.fillStyle = `rgba(126,240,255,${.12 + .08 * Math.sin(t / 300 + x)})`; ctx.fillRect(px - 4, py - 4, 24, 24); }
  if (ch === 'L') { ctx.fillStyle = `rgba(255,214,107,${.10 + .04 * Math.sin(t / 200 + x)})`; ctx.beginPath(); ctx.arc(px + 8, py, 13, 0, 7); ctx.fill(); }
}
function drawFountainAnim(ctx, d, t) {
  const cx = d.x * TS + 24, cy = d.y * TS + 26;
  for (let i = 0; i < 10; i++) {
    const ph = ((t / 900) + i / 10) % 1, a = (i / 10) * Math.PI * 2;
    const x = cx + Math.cos(a) * ph * 15, y = cy - 26 + ph * 26 - Math.sin(ph * Math.PI) * 8 + Math.sin(a) * ph * 4;
    P(ctx, Math.round(x), Math.round(y), 2, 2, ph < .5 ? '#d4ecff' : '#8fc6f5');
  }
}

// =========================================================================
// 캐릭터 스프라이트 (16x26, 발이 타일 바닥에 닿음)
// =========================================================================
const SPW = 16, SPH = 26;
function gridNew(w = SPW, h = SPH) { return Array.from({ length: h }, () => Array(w).fill(null)); }
const OUTC = {};
function gridToCanvas(g, outline = true, flip = false) {
  const h = g.length, w = g[0].length, cv = mkCanvas(w, h), ctx = cv.getContext('2d');
  const get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? null : g[y][x];
  if (outline) {
    ctx.fillStyle = OUT;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!get(x, y)) { const nb = get(x, y + 1) || get(x - 1, y) || get(x + 1, y) || get(x, y - 1); if (!nb || String(nb).startsWith('rgba')) continue; ctx.fillStyle = OUTC[nb] || (OUTC[nb] = mix(shade(nb, -0.62), OUT, .55)); ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1); }
  }
  // 입체감: 위쪽 가장자리 하이라이트 + 오른쪽/아래 가장자리 그늘 + 아래로 갈수록 살짝 어둡게 (빛은 왼쪽 위)
  const SHC = gridToCanvas._c || (gridToCanvas._c = {});
  const tone = (c, k) => { const key = c + k; return SHC[key] || (SHC[key] = shade(c, k)); };
  const hex = c => typeof c === 'string' && c[0] === '#' && c.length === 7;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c = g[y][x]; if (!c) continue;
    if (outline && hex(c)) {
      const sx = flip ? -1 : 1; // 화면 기준 오른쪽
      const up = get(x, y - 1), dn = get(x, y + 1), rt = get(x + sx, y), lf = get(x - sx, y);
      let k = 0;
      if (!up) k += .16; else if (!lf) k += .08;
      if (!rt) k -= .13; if (!dn) k -= .1;
      if (y > h * .62) k -= .05;
      if (k) c = tone(c, Math.max(-.3, Math.min(.25, k)));
    }
    ctx.fillStyle = c; ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
  }
  return cv;
}

// ---- 사람형 도트 (손으로 찍은 템플릿 + 팔레트) 16×24 ----
const HUM_H = 24;
const TPL = {
  headF: { 4: '.....SSSSSS.....', 5: '....SSSSSSSS....', 6: '...SSSSSSSSSS...', 7: '...SSSSSSSSSS...', 8: '...SSSSSSSSSS...', 9: '...SSSSSSSSSS...', 10: '...SSEESSEESS...', 11: '...SSweSSewSS...', 12: '...SkffSSffkS...', 13: '....SSSmmSSS....', 14: '.....ssssss.....' },
  headS: { 4: '.....SSSSSS.....', 5: '....SSSSSSSS....', 6: '...SSSSSSSSSS...', 7: '...SSSSSSSSSS...', 8: '...SSSSSSSSSS...', 9: '...SSSSSSSSSS...', 10: '...SEESSSSSSS...', 11: '...SweSSSSSSS...', 12: '..SkffSSSSSSS...', 13: '...SmSSSSSSS....', 14: '....sssssss.....' },
  headB: { 4: '.....SSSSSS.....', 5: '....SSSSSSSS....', 6: '...SSSSSSSSSS...', 7: '...SSSSSSSSSS...', 8: '...SSSSSSSSSS...', 9: '...SSSSSSSSSS...', 10: '...SSSSSSSSSS...', 11: '...SSSSSSSSSS...', 12: '...SSSSSSSSSS...', 13: '....SSSSSSSS....', 14: '.....ssssss.....' },
  bodyF: { 15: '....LCCAACCc....', 16: '...cLCCAACCcc...', 17: '...cLCCCCCCcc...', 18: '...cLCCCCCCcc...', 19: '...SAAAAAAAAS...', 20: '....PPPPPPPP....' },
  bodyB: { 15: '....cCCCCCCc....', 16: '...cCCCCCCCCc...', 17: '...cLCCCCCCcc...', 18: '...cLCCCCCCcc...', 19: '...SAAAAAAAAS...', 20: '....PPPPPPPP....' },
  bodyS: { 15: '.....LCCCCc.....', 16: '.....LCCCCc.....', 17: '.....LCCCCc.....', 18: '.....LCCCCc.....', 19: '.....AAAAAA.....', 20: '.....PPPPPP.....' }
};
// 머리카락 (F 앞, B 뒤, S 옆=왼쪽 보기)
const HAIR_T = {
  base: {
    F: { 3: '.....HHHHHH.....', 4: '....HHHllHHH....', 5: '...HHHlHHHHHH...', 6: '..HHHHHHHHHHhH..', 7: '..HHHHHHHHHHhH..', 8: '..HHhHHHHhHHhH..', 9: '..HH.hHH.hH.hH..', 10: '..H..........H..', 11: '..h..........h..' },
    B: { 3: '.....HHHHHH.....', 4: '....HHHllHHH....', 5: '...HHHlHHHHHH...', 6: '..HHHHHHHHHHHH..', 7: '..HHHHHHHHHHHH..', 8: '..HHHHHHHHHHHH..', 9: '..HHHHHHHHHHHH..', 10: '..HHHHHHHHHHHH..', 11: '..HhHHHHHHHHhH..', 12: '...hHHHHHHHHh...', 13: '....hhhhhhhh....' },
    S: { 3: '.....HHHHHH.....', 4: '....HHHllHHH....', 5: '...HHlHHHHHHH...', 6: '...HHHHHHHHHHH..', 7: '...HHHHHHHHHHH..', 8: '...H.HHHHHHHHH..', 9: '...h..H.HHHHHH..', 10: '........HHHHHh..', 11: '........sHHHHh..', 12: '.........HHHh...', 13: '..........hh....' }
  },
  long: { F: { 10: '.HH..........HH.', 11: '.HH..........HH.', 12: '.Hh..........hH.', 13: '.Hh..........hH.', 14: '.hh..........hh.', 15: '.hh..........hh.', 16: '.hh..........hh.', 17: '..h..........h..' },
    B: { 13: '..HHHHHHHHHHHH..', 14: '..HHHHHHHHHHHH..', 15: '..HHHhHHHHhHHH..', 16: '..HHHHHHHHHHHH..', 17: '..hHHHHHHHHHHh..', 18: '...hhHHHHHHhh...' },
    S: { 12: '.........HHHHH..', 13: '.........HHHHH..', 14: '.........HHHhH..', 15: '..........HHhH..', 16: '..........HHhh..', 17: '...........hh...' } },
  twin: { F: { 7: '.r............r.', 8: 'HH............HH', 9: 'HH............HH', 10: 'HH............HH', 11: 'Hh............hH', 12: 'Hh............hH', 13: 'hh............hh', 14: 'hh............hh', 15: '.h............h.' },
    B: { 7: '.r............r.', 8: 'HH............HH', 9: 'HH............HH', 10: 'HH............HH', 11: 'Hh............hH', 12: 'Hh............hH', 13: 'hh............hh', 14: 'hh............hh', 15: '.h............h.' },
    S: { 8: '.............r..', 9: '............HHH.', 10: '............HHH.', 11: '............HhH.', 12: '............Hhh.', 13: '............hh..', 14: '............h...' } },
  pony: { F: { 7: '..............HH', 8: '..............Hh' },
    B: { 12: '......rrrr......', 13: '.......HH.......', 14: '.......HH.......', 15: '.......Hh.......', 16: '.......hh.......', 17: '........h.......' },
    S: { 7: '.............rr.', 8: '.............HHH', 9: '.............HHH', 10: '.............HhH', 11: '.............Hh.', 12: '.............hh.', 13: '..............h.' } },
  bob: { F: { 10: '.HH..........HH.', 11: '.HH..........HH.', 12: '.Hh..........hH.', 13: '.hh..........hh.' },
    B: { 13: '..HHHHHHHHHHHH..', 14: '..hhhhhhhhhhhh..' },
    S: { 12: '........HHHHHh..', 13: '........HHHHhh..', 14: '.........hhhh...' } },
  spiky: { F: { 1: '....H..H...H....', 2: '....HH.HH.HHH...' }, B: { 1: '....H..H...H....', 2: '....HH.HH.HHH...' }, S: { 1: '......H..H..H...', 2: '.....HH.HH.HH...' } }
};
const HAT_T = {
  wizard: { all: { 0: '.........hh.....', 1: '........HHH.....', 2: '.......HHHH.....', 3: '......HlHHH.....', 4: '.....HlHHHHH....', 5: '.....AAAAAAA....', 6: '..HHHHHHHHHHHH..', 7: '.hHHHHHHHHHHHHh.' } },
  crown: { all: { 1: '.....Y.YY.Y.....', 2: '.....YYRYYY.....', 3: '.....yyyyyy.....' } },
  helmet: { all: { 0: '.......RR.......', 1: '.......RR.......', 2: '.....MMMMMM.....', 3: '....MMlMMMMM....', 4: '...MMlMMMMMMM...', 5: '..MMMMMMMMMMMM..', 6: '..MMMMMMMMMMMM..', 7: '..mmmmmmmmmmmm..', 8: '..M..........M..', 9: '..M..........M..', 10: '..m..........m..' },
    S: { 0: '........RRR.....', 1: '........RR......', 2: '.....MMMMMM.....', 3: '....MMlMMMMM....', 4: '...MMlMMMMMMM...', 5: '...MMMMMMMMMMM..', 6: '...MMMMMMMMMMM..', 7: '...mmmmmmmmmmm..', 8: '........MMMMM...', 9: '.........MMMM...', 10: '.........mmm....' } },
  hood: { F: { 2: '.....HHHHHH.....', 3: '....HHHHHHHH....', 4: '...HHlHHHHHHH...', 5: '..HHlHHHHHHHHH..', 6: '..HHHHHHHHHHHH..', 7: '..HHHhhhhhhHHH..', 8: '..HHh......hHH..', 9: '..HH........HH..', 10: '..HH........HH..', 11: '..HH........HH..', 12: '..HH........HH..', 13: '..HHh......hHH..', 14: '..HHHh....hHHH..', 15: '...hhh....hhh...' },
    B: { 2: '.....HHHHHH.....', 3: '....HHHHHHHH....', 4: '...HHlHHHHHHH...', 5: '..HHlHHHHHHHHH..', 6: '..HHHHHHHHHHHH..', 7: '..HHHHHHHHHHHH..', 8: '..HHHHHHHHHHHH..', 9: '..HHHHHHHHHHHH..', 10: '..HHHHHHHHHHHH..', 11: '..HHHHHHHHHHHH..', 12: '..HHHHHHHHHHHH..', 13: '..HHHHHHHHHHHH..', 14: '..hHHHHHHHHHHh..', 15: '...hhhhhhhhhh...' },
    S: { 2: '.....HHHHHH.....', 3: '....HHHHHHHH....', 4: '...HHlHHHHHHH...', 5: '..HHlHHHHHHHHH..', 6: '..HHHHHHHHHHHH..', 7: '..HhhhHHHHHHHH..', 8: '..h....HHHHHHH..', 9: '.......HHHHHHH..', 10: '.......HHHHHHH..', 11: '.......HHHHHHH..', 12: '.......HHHHHHH..', 13: '......hHHHHHHH..', 14: '....hhHHHHHHHh..', 15: '.....hhhhhhhh...' } },
  cap: { F: { 2: '.....HHHHHH.....', 3: '....HHlHHHHH....', 4: '...HHHHHHHHHH...', 5: '..hhhhhhhhhhhh..' }, B: { 2: '.....HHHHHH.....', 3: '....HHlHHHHH....', 4: '...HHHHHHHHHH...', 5: '...HHHHHHHHHH...' },
    S: { 2: '.....HHHHHH.....', 3: '....HHlHHHHH....', 4: '...HHHHHHHHHH...', 5: 'hhhhhhhHHHHHH...' } },
  catears: { all: { 0: '...H........H...', 1: '...HH......HH...', 2: '...Hp......pH...' }, S: { 0: '........H.......', 1: '........HH......', 2: '........Hp......' } },
  horns: { all: { 0: '..W..........W..', 1: '..WW........WW..', 2: '...Ww......wW...' }, S: { 0: '..........W.....', 1: '.........WW.....', 2: '.........wW.....' } },
  bandana: { F: { 6: '..HHHHHHHHHHHH..', 7: '..hlhhhhhhhhhh..', 8: '.............HH.', 9: '..............h.' }, B: { 6: '..HHHHHHHHHHHH..', 7: '..hhhhhhhhhhhh..', 8: '.......HH.......', 9: '......H..h......' }, S: { 6: '...HHHHHHHHHHH..', 7: '...hlhhhhhhhhhH.', 8: '..............Hh', 9: '...............h' } },
  flower: { F: { 3: '............p...', 4: '...........pyp..', 5: '............p...' }, B: { 3: '...p............', 4: '..pyp...........', 5: '...p............' }, S: { 3: '...........p....', 4: '..........pyp...', 5: '...........p....' } },
  halo: { all: { 0: '.....YYYYYY.....', 1: '....Y......Y....' } }
};
function stamp(g, rows, pal, dx = 0, dy = 0) {
  if (!rows) return;
  for (const k in rows) { const y = +k + dy, row = rows[k]; if (y < 0 || y >= g.length) continue; for (let x = 0; x < 16; x++) { const ch = row[x]; if (ch === '.' || ch === undefined) continue; const c = pal[ch]; if (c === undefined) continue; const X = x + dx; if (X >= 0 && X < 16) g[y][X] = c; } }
}
function humanoid(p, dir, fr) {
  const g = gridNew(16, HUM_H);
  const side = dir === 1 || dir === 2, up = dir === 3, V = side ? 'S' : up ? 'B' : 'F';
  const sk = p.skin || '#ffe0c4', hr = p.hair || '#5a3a2a', eye = p.eye || '#3b2a4a';
  const type = p.type || 'tunic', hs = p.hairStyle || 'short', hat = p.hat;
  let cl = p.cloth || '#4f7fd6', ac = p.accent || '#e1b13d';
  const armor = type === 'armor';
  const pal = {
    S: sk, s: shade(sk, -0.16), k: mix(sk, '#ff7f8f', .45), m: mix(shade(sk, -0.45), '#b0404a', .4),
    E: '#2a1d2b', w: '#ffffff', e: eye, f: shade(eye, -0.38),
    C: armor ? '#a7aebd' : cl, c: armor ? '#6c7384' : shade(cl, -0.26), L: armor ? '#dde2ec' : shade(cl, 0.2),
    A: armor ? cl : ac, P: p.pants || shade(cl, -0.5), B: p.boots || '#5a3a2a', b: shade(p.boots || '#5a3a2a', -0.3)
  };
  const hpal = { H: hr, h: shade(hr, -0.3), l: shade(hr, 0.32), s: shade(sk, -0.16), r: ac };
  const bob = fr === 0 ? 0 : -1; // 걸을 때 살짝 들썩
  const swing = fr === 1 ? 1 : fr === 2 ? -1 : 0;
  // 뒷머리(긴 머리)는 몸보다 뒤 — 앞모습일 때
  // 다리
  const legRows = 3, hip = 20 + bob;
  const leg = (x0, w, lift, darker) => { const end = 23 - lift; for (let y = hip + 1; y <= end; y++) { const c = y === end ? pal.b : y === end - 1 ? pal.B : (darker ? shade(pal.P, -0.2) : pal.P); for (let i = 0; i < w; i++) g[y][x0 + i] = c; } };
  const longSkirt = type === 'robe', dress = type === 'dress';
  if (side) {
    const f = fr === 1 ? -1 : fr === 2 ? 1 : 0;
    leg(8 - f, 2, fr ? 0 : 0, true); leg(6 + f, 2, fr === 1 ? 1 : 0, false);
    if (!longSkirt) g[23][5 + f] = g[23][5 + f] || pal.b;
  } else {
    leg(5, 2, fr === 1 ? 1 : 0, false); leg(9, 2, fr === 2 ? 1 : 0, false);
  }
  // 머리 + 몸
  stamp(g, TPL[side ? 'headS' : up ? 'headB' : 'headF'], pal, 0, bob);
  stamp(g, TPL[side ? 'bodyS' : up ? 'bodyB' : 'bodyF'], pal, 0, bob);
  if (armor && !side) { stamp(g, { 15: '..MMM......MMM..', 16: '..mMm......mMm..' }, { M: '#dde2ec', m: '#8a91a2' }, 0, bob); }
  if (armor && side) stamp(g, { 15: '.....MMMM.......', 16: '.....mMMm.......' }, { M: '#dde2ec', m: '#8a91a2' }, 0, bob);
  if (type === 'robe' && !side && !up) stamp(g, { 15: '.......AA.......', 16: '.......AA.......', 17: '.......AA.......', 18: '.......AA.......' }, pal, 0, bob);
  if (longSkirt) {
    const rob = { 20: side ? '.....LCCCCc.....' : '....LCCCCCCc....', 21: side ? '....LCCCCCCc....' : '...LCCCCCCCCc...', 22: side ? '....cccccccc....' : '...cccccccccc...' };
    stamp(g, rob, pal, 0, 0);
    if (side) { g[23][5 + swing] = pal.b; g[23][9 - swing] = pal.b; } else { g[23][5] = pal.b; g[23][6] = pal.b; g[23][9] = pal.b; g[23][10] = pal.b; }
  }
  if (dress) {
    const s2 = p.cloth2 || cl, dp = { D: s2, d: shade(s2, -0.25), l: shade(s2, 0.25) };
    stamp(g, side ? { 19: '.....lDDDDd.....', 20: '....lDDDDDDd....', 21: '....dddddddd....' } : { 19: '....lDDDDDDd....', 20: '...lDDDDDDDDd...', 21: '...dddddddddd...' }, dp, 0, bob);
  }
  // 팔 흔들기 (옆모습은 팔을 앞에)
  if (side) { const ax = 7 + swing; for (let y = 16; y <= 18; y++) { g[y + bob][ax] = pal.c; g[y + bob][ax + 1] = pal.c; } g[19 + bob][ax] = pal.S; g[19 + bob][ax + 1] = pal.s; if (armor) { g[16 + bob][ax] = '#8a91a2'; } }
  else if (fr) { // 앞/뒤: 한쪽 팔 앞으로(짧게)
    const lx = 3, rx = 12, a = fr === 1 ? lx : rx, b2 = fr === 1 ? rx : lx;
    g[19 + bob][a] = null; g[18 + bob][a] = pal.S;
    g[20 + bob][b2] = pal.S; g[19 + bob][b2] = pal.c;
  }
  // 머리카락
  if (hs !== 'bald' && hat !== 'hood' && hat !== 'helmet') {
    stamp(g, HAIR_T.base[V], hpal, 0, bob);
    if (HAIR_T[hs] && HAIR_T[hs][V]) stamp(g, HAIR_T[hs][V], hpal, 0, bob);
  } else if (hs === 'bald' && !hat) {
    stamp(g, { 5: '....SlS.........', 6: '...Sl...........' }, { S: shade(sk, .2), l: shade(sk, .4) }, 0, bob);
  } else if (hat === 'helmet' && (hs === 'long' || hs === 'twin' || hs === 'pony')) {
    if (HAIR_T[hs][V]) stamp(g, HAIR_T[hs][V], hpal, 0, bob);
  }
  // 얼굴 부속
  if (!up) {
    if (p.ears === 'elf') stamp(g, side ? { 10: '..........SS....', 11: '.........Ss.....', 9: '...........S....' } : { 9: 'S..............S', 10: '.SS..........SS.', 11: '..s..........s..' }, pal, 0, bob);
    if (p.glasses) stamp(g, side ? { 10: '..GGG...........', 11: '..G.G...........', 12: '..GGG...........' } : { 10: '....GGG..GGG....', 11: '....G..GG..G....', 12: '....GGG..GGG....' }, { G: '#2d2d38' }, 0, bob);
    if (p.beard) { const bp = { b: p.beard, d: shade(p.beard, -0.25), m: pal.m }; stamp(g, side ? { 12: '..bb............', 13: '..bmbb..........', 14: '...bbbbb........', 15: '....dbb.........' } : { 12: '...b........b...', 13: '...bbbbmmbbbb...', 14: '....bbbbbbbb....', 15: '.....dbbbbd.....', 16: '......dbbd......' }, bp, 0, bob); }
    if (p.scar && !side) stamp(g, { 9: '..........x.....', 10: '...........x....', 11: '..........x.....' }, { x: '#c9877a' }, 0, bob);
    if (p.mouth && !side) stamp(g, { 13: '.......mm.......' }, { m: p.mouth }, 0, bob);
  }
  // 모자
  if (hat && HAT_T[hat]) {
    const hc = p.hatColor || '#5b3fa0';
    const tp = { H: hc, h: shade(hc, -0.3), l: shade(hc, 0.25), A: p.hatBand || ac, Y: '#f0c040', y: '#a87b1f', R: hat === 'helmet' ? (p.accent || '#e04040') : '#ff5d7a', M: '#a7aebd', m: '#6c7384', p: hat === 'catears' ? '#ffb3c6' : '#ff7aa8', W: '#efe6cf', w: '#c9bfa5' };
    if (hat === 'catears') { tp.H = hr; }
    if (hat === 'flower') { tp.y = '#ffe066'; }
    const t = HAT_T[hat]; stamp(g, t[V] || t.all, tp, 0, bob);
  }
  if (p.beast) beastParts(g, p, side, up, fr, bob, hr);
  return g;
}
// 수인: 머리 위 뾰족한 귀 + 엉덩이 뒤 복슬 꼬리 (털색 = 머리색, 꼬리 끝은 밝게)
function beastParts(g, p, side, up, fr, bob, hr) {
  const fur = p.fur || hr, pal = { H: fur, h: shade(fur, -0.32), p: '#ffb3c6', W: p.tailTip || '#fff4e6', l: shade(fur, 0.25) };
  const hatTall = p.hat === 'wizard' || p.hat === 'helmet' || p.hat === 'hood';
  const oy = hatTall ? 2 : 0; // 큰 모자는 귀가 모자 옆으로 삐져나옴
  const ears = side ? { 0: '.......H........', 1: '.......HH.......', 2: '......HpH.......', 3: '......HpHh......' }
    : up ? { 0: '..h..........h..', 1: '..Hh........hH..', 2: '..HHh......hHH..', 3: '...HH......HH...' }
    : { 0: '..H..........H..', 1: '..HH........HH..', 2: '..HpH......HpH..', 3: '..HppH....HppH..' };
  stamp(g, ears, pal, 0, bob + oy + (p.earDrop || 0));
  const sway = fr === 1 ? -1 : fr === 2 ? 1 : 0, thin = p.beast === 'cat';
  const put = (rows, under) => { for (const k in rows) { const y = +k + bob; if (y < 0 || y >= g.length) continue; const row = rows[k]; for (let x = 0; x < 16; x++) { const ch = row[x]; if (!ch || ch === '.') continue; const xx = x; if (xx < 0 || xx > 15) continue; if (under && g[y][xx]) continue; g[y][xx] = pal[ch]; } } };
  const sh = (row, d) => d > 0 ? '.'.repeat(d) + row.slice(0, 16 - d) : d < 0 ? row.slice(-d) + '.'.repeat(-d) : row;
  if (up) { // 뒷모습: 꼬리가 몸 앞에 보인다
    const t = thin ? { 17: '.......HH.......', 18: '.......Hh.......', 19: '......Hh........', 20: '......WW........' }
      : { 16: '.......Hh.......', 17: '......HHHh......', 18: '......HlHHh.....', 19: '.......HHHh.....', 20: '.......WWW......', 21: '........W.......' };
    const tt = {}; for (const k in t) tt[k] = sh(t[k], sway); put(tt, false);
  } else if (side) { // 옆모습(왼쪽 보기): 꼬리는 오른쪽 뒤로
    const t = thin ? { 15: '............HH..', 16: '...........HH...', 17: '..........HH....', 18: '...........W....' }
      : { 14: '.............HH.', 15: '............HHHh', 16: '...........HlHHh', 17: '..........HHHHh.', 18: '...........HHW..', 19: '.............WW.' };
    const tt = {}; for (const k in t) tt[+k + (fr ? (fr === 1 ? -1 : 0) : 0)] = t[k]; put(tt, true);
  } else { // 앞모습: 다리 옆으로 꼬리 끝이 살짝
    const t = thin ? { 17: '.............HH.', 18: '..............W.' } : { 16: '.............HH.', 17: '............HHHh', 18: '.............HWW', 19: '..............W.' };
    const tt = {}; for (const k in t) tt[k] = sh(t[k], sway < 0 ? 0 : 0); put(tt, true);
  }
}

function creature(kind, p, dir, fr) {
  const W = kind === 'boss' ? 32 : SPW, H = kind === 'boss' ? 44 : SPH;
  const g = gridNew(W, H);
  const S = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H && c) g[y][x] = c; };
  const R = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) S(x + i, y + j, c); };
  const b = fr ? 1 : 0;
  if (kind === 'cat') {
    const c = p.cloth || '#f2a65a', d = shade(c, -0.25);
    R(4, 18 + b, 8, 5, c); R(4, 18 + b, 8, 1, shade(c, .2)); R(3, 14, 6, 5, c); S(3, 13, c); S(8, 13, c); S(4, 14, '#ffb3c6'); S(7, 14, '#ffb3c6');
    S(4, 16, OUT); S(7, 16, OUT); S(5, 17, '#f59aa0'); S(6, 17, '#f59aa0');
    R(4, 23, 2, 2, c); R(10, 23, 2, 2, c); R(12, 15 - b, 2, 5, d); S(13, 14 - b, d);
    if (p.pattern) { S(6, 19 + b, d); S(8, 20 + b, d); S(10, 19 + b, d); }
  }
  if (kind === 'slime') {
    const c = p.cloth || '#5fd36a';
    const top = 13 + b;
    for (let y = top; y < 25; y++) { const t = (y - top) / (25 - top); const w = Math.round(4 + 10 * Math.sqrt(Math.min(1, t * 1.6))); R(8 - (w >> 1), y, w, 1, c); }
    R(5, top + 3, 3, 2, shade(c, .5)); R(5, 18, 2, 3, OUT); R(10, 18, 2, 3, OUT); S(5, 18, '#fff'); S(10, 18, '#fff'); R(7, 22, 3, 1, shade(c, -0.4));
  }
  if (kind === 'ghost') {
    const c = 'rgba(220,230,255,0.85)', d = 'rgba(160,175,220,0.85)';
    const o = fr % 2;
    R(4, 6 + o, 8, 14, c); R(5, 5 + o, 6, 1, c); R(3, 9 + o, 1, 9, c); R(12, 9 + o, 1, 9, c);
    for (let x = 3; x < 13; x++) if (x % 3 !== (fr % 3)) S(x, 20 + o, c);
    R(5, 10 + o, 2, 3, '#2a2a4a'); R(9, 10 + o, 2, 3, '#2a2a4a'); R(7, 15 + o, 2, 2, '#2a2a4a'); R(4, 7 + o, 2, 2, 'rgba(255,255,255,.95)'); S(12, 12 + o, d);
  }
  if (kind === 'golem') {
    const c = '#8a8682', l = '#b3aea8', d = '#5c5855';
    R(2, 8, 12, 12, c); R(2, 8, 12, 2, l); R(1, 11, 3, 8, d); R(12, 11, 3, 8, d); R(4, 2, 8, 7, c); R(4, 2, 8, 2, l);
    R(5, 5, 2, 1, '#6ee7ff'); R(9, 5, 2, 1, '#6ee7ff'); R(6, 12, 4, 4, d); R(7, 13, 2, 2, '#6ee7ff');
    R(4, 20, 3, 5 - b, d); R(9, 20, 3, 5 - (fr === 2 ? 1 : 0), d); R(3, 9, 1, 2, '#5fae4a'); S(12, 3, '#5fae4a');
  }
  if (kind === 'mimic') {
    R(1, 12, 14, 12, '#8a4f24'); R(1, 12, 14, 4, '#a5612f'); R(1, 16, 14, 1, '#e8b83a'); R(1, 12, 1, 12, '#e8b83a'); R(14, 12, 1, 12, '#e8b83a');
    if (fr) { R(2, 16, 12, 3, '#3a0d14'); for (let x = 2; x < 14; x += 2) { S(x, 16, '#fff'); S(x + 1, 18, '#fff'); } R(4, 13, 2, 2, '#ff3b3b'); R(10, 13, 2, 2, '#ff3b3b'); R(6, 19, 4, 1, '#ff6b8f'); }
    else { R(7, 15, 2, 3, '#e8b83a'); }
  }
  if (kind === 'pigeon') {
    const c = '#8a8fa8', d = '#5c6078', o = fr === 1 ? 1 : 0;
    R(5, 16 + o, 7, 6, c); R(5, 16 + o, 7, 1, shade(c, .2)); R(4, 13 + o, 4, 4, c); S(4, 14 + o, OUT); R(2, 15 + o, 2, 1, '#e8a23a'); R(6, 17 + o, 4, 2, '#5fb38a'); S(7, 18 + o, '#b26ad0');
    R(10, 18 + o, 3, 3, d); R(6, 22, 1, 3, '#e8a23a'); R(9, 22, 1, 3, '#e8a23a');
  }
  if (kind === 'rock') {
    R(2, 14, 12, 11, '#8e8a86'); R(3, 13, 10, 1, '#8e8a86'); R(3, 14, 6, 3, '#b5b0aa'); R(10, 20, 3, 4, '#6c6864');
    S(5, 18, OUT); S(10, 18, OUT); R(7, 21, 2, 1, OUT); R(2, 24, 12, 1, '#5fae4a');
  }
  if (kind === 'boss') {
    const a = '#2d2a3a', l = '#4a4560', red = '#ff3b3b';
    R(6, 14, 20, 22, '#5b1830'); R(4, 18, 4, 18, '#5b1830'); R(24, 18, 4, 18, '#5b1830'); // 망토
    R(9, 14, 14, 18, a); R(9, 14, 14, 2, l); R(11, 20, 10, 2, '#7d3fb8'); R(15, 16, 2, 14, l);
    R(10, 4, 12, 11, a); R(11, 3, 10, 1, a); R(10, 4, 12, 2, l); R(12, 8, 3, 2, red); R(17, 8, 3, 2, red); R(12, 12, 8, 1, '#111');
    R(8, 1, 2, 5, '#c9c3d8'); R(22, 1, 2, 5, '#c9c3d8'); S(7, 0, '#c9c3d8'); S(24, 0, '#c9c3d8');
    R(11, 32, 4, 8 - b, a); R(17, 32, 4, 8, a); R(10, 40 - b, 6, 2, '#111'); R(17, 40, 6, 2, '#111');
    R(26, 10, 2, 26, '#9aa1b0'); R(25, 8, 4, 3, '#e1b13d'); R(26, 6, 2, 2, '#b794ff');
    R(5, 20, 4, 6, a); R(23, 20, 4, 6, a);
  }
  return g;
}

// npc.look → {dirs:[[canvas x3] x4]} (아래, 왼, 오, 위)
function buildSprite(look) {
  const out = [];
  for (let dir = 0; dir < 4; dir++) {
    const frames = [];
    for (let fr = 0; fr < 3; fr++) {
      const realDir = dir === 2 ? 1 : dir;
      const g = look.kind ? creature(look.kind, look, realDir, fr) : humanoid(look, realDir, fr);
      frames.push(gridToCanvas(g, !look.kind || look.kind !== 'ghost', dir === 2));
    }
    out.push(frames);
  }
  return out;
}

// =========================================================================
// 초상화 (SVG, 2D 애니메이션풍)
// =========================================================================
function portraitSVG(p, mood = 'neutral') {
  const uid = 'pt' + Math.random().toString(36).slice(2, 8);
  if (p.kind) return creaturePortrait(p, mood, uid);
  const LN = '#3a2430', lw = 1.8;
  const sk = p.skin || '#ffe0c4', skS = mix(sk, '#d98a8a', 0.28), skL = shade(sk, 0.35);
  const hr = p.hair || '#5a3a2a', hrD = shade(hr, -0.42), hrL = shade(hr, 0.4), hrM = shade(hr, -0.15);
  const cl = p.cloth || '#4f7fd6', clD = shade(cl, -0.35), clL = shade(cl, 0.25), ac = p.accent || '#e1b13d', ey = p.eye || '#5a3a8a';
  const bg1 = p.bg || mix(shade(cl, 0.6), '#ffffff', .25), bg2 = mix(shade(cl, -0.1), '#2a2040', .35);
  const hs = p.hairStyle || 'short';
  const happy = mood === 'happy', angry = mood === 'angry', sad = mood === 'sad', sly = mood === 'sly', surprise = mood === 'surprise';
  const o = [];
  o.push(`<defs>
    <linearGradient id="${uid}bg" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
    <filter id="${uid}blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="${uid}soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
    <linearGradient id="${uid}hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hrL}"/><stop offset=".28" stop-color="${hr}"/><stop offset=".75" stop-color="${hrM}"/><stop offset="1" stop-color="${hrD}"/></linearGradient>
    <linearGradient id="${uid}hairB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hrM}"/><stop offset="1" stop-color="${hrD}"/></linearGradient>
    <radialGradient id="${uid}skin" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="${skL}"/><stop offset=".6" stop-color="${sk}"/><stop offset="1" stop-color="${skS}"/></radialGradient>
    <linearGradient id="${uid}iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(ey, -0.65)}"/><stop offset=".45" stop-color="${shade(ey, -0.2)}"/><stop offset=".8" stop-color="${ey}"/><stop offset="1" stop-color="${shade(ey, 0.55)}"/></linearGradient>
    <radialGradient id="${uid}blush" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff7d96" stop-opacity=".55"/><stop offset="1" stop-color="#ff7d96" stop-opacity="0"/></radialGradient>
    <linearGradient id="${uid}cloth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${clL}"/><stop offset="1" stop-color="${clD}"/></linearGradient>
    <clipPath id="${uid}clip"><rect width="200" height="240" rx="16"/></clipPath>
  </defs><g clip-path="url(#${uid}clip)">`);
  // 배경: 부드러운 그라데이션 + 흐린 보케 + 눈송이
  o.push(`<rect width="200" height="240" fill="url(#${uid}bg)"/>`);
  const bok = rng((hr + cl).split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  for (let i = 0; i < 7; i++) o.push(`<circle cx="${(bok() * 200) | 0}" cy="${(bok() * 160) | 0}" r="${8 + bok() * 20}" fill="${bok() < .5 ? '#ffffff' : shade(bg1, .3)}" opacity="${.18 + bok() * .25}" filter="url(#${uid}blur)"/>`);
  for (let i = 0; i < 10; i++) o.push(`<circle cx="${(bok() * 200) | 0}" cy="${(bok() * 200) | 0}" r="${1 + bok() * 1.6}" fill="#fff" opacity="${.5 + bok() * .4}"/>`);
  if (p.beast) { // 꼬리 (몸 뒤, 오른쪽 아래에서 솟아오름)
    const fur = p.fur || hr, tip = p.tailTip || '#fff4e6';
    o.push(p.beast === 'cat'
      ? `<path d="M150,240 C178,214 196,186 184,150 C178,134 168,138 172,152 C180,184 164,210 140,236 Z" fill="${fur}" stroke="${LN}" stroke-width="${lw}" stroke-linejoin="round"/>`
      : `<path d="M128,240 C150,206 196,206 198,160 C200,128 182,112 170,124 C186,150 162,176 136,200 C122,214 116,230 116,240 Z" fill="${fur}" stroke="${LN}" stroke-width="${lw}" stroke-linejoin="round"/><path d="M198,160 C200,128 182,112 170,124 C176,140 178,152 190,166 Z" fill="${tip}" stroke="${LN}" stroke-width="${lw * .8}" stroke-linejoin="round"/>`);
  }
  const H = `fill="url(#${uid}hair)" stroke="${LN}" stroke-width="${lw}" stroke-linejoin="round"`;
  const HB = `fill="url(#${uid}hairB)" stroke="${LN}" stroke-width="${lw}" stroke-linejoin="round"`;
  // 뒷머리
  if (hs === 'long') o.push(`<path d="M40,96 C26,150 30,200 22,240 L178,240 C170,200 174,150 160,96 C150,60 50,60 40,96 Z" ${HB}/>`);
  if (hs === 'twin') o.push(`<path d="M52,74 C14,96 8,170 22,240 L44,240 C40,190 46,140 64,104 Z" ${HB}/><path d="M148,74 C186,96 192,170 178,240 L156,240 C160,190 154,140 136,104 Z" ${HB}/>`);
  if (hs === 'pony') o.push(`<path d="M132,58 C192,62 196,150 168,214 C162,166 150,118 130,92 Z" ${HB}/>`);
  if (hs === 'bob') o.push(`<path d="M44,100 C38,140 44,170 56,182 L144,182 C156,170 162,140 156,100 C148,58 52,58 44,100 Z" ${HB}/>`);
  if (hs !== 'bald') o.push(`<path d="M46,110 C40,58 70,32 100,32 C130,32 160,58 154,110 Z" ${HB}/>`);
  // 몸·옷
  const T = p.type || 'tunic';
  o.push(`<path d="M14,240 C18,206 40,190 72,184 L128,184 C160,190 182,206 186,240 Z" fill="url(#${uid}cloth)" stroke="${LN}" stroke-width="${lw}"/>`);
  o.push(`<path d="M30,232 C40,210 56,200 72,196" stroke="${shade(cl, .4)}" stroke-width="3" fill="none" opacity=".5"/>`);
  if (T === 'robe') o.push(`<path d="M74,184 C80,200 92,214 100,240 C108,214 120,200 126,184" fill="${clD}" stroke="${LN}" stroke-width="${lw}"/><path d="M70,186 Q100,206 130,186" fill="none" stroke="${ac}" stroke-width="5"/>`);
  else if (T === 'armor') o.push(`<path d="M16,236 C20,206 40,192 66,188 L72,210 C52,214 38,224 34,240 Z" fill="#c3cad8" stroke="${LN}" stroke-width="${lw}"/><path d="M184,236 C180,206 160,192 134,188 L128,210 C148,214 162,224 166,240 Z" fill="#c3cad8" stroke="${LN}" stroke-width="${lw}"/><path d="M80,186 L100,204 L120,186" fill="none" stroke="${ac}" stroke-width="4"/>`);
  else if (T === 'dress') o.push(`<path d="M66,186 Q100,214 134,186 L128,196 Q100,222 72,196 Z" fill="#fff" stroke="${LN}" stroke-width="1.4"/><circle cx="100" cy="204" r="5" fill="${ac}" stroke="${LN}" stroke-width="1.4"/>`);
  else o.push(`<path d="M72,184 C78,206 90,212 100,212 C110,212 122,206 128,184" fill="none" stroke="${LN}" stroke-width="${lw}"/><path d="M60,188 C70,214 86,222 100,222 C114,222 130,214 140,188 C130,196 118,200 100,200 C82,200 70,196 60,188 Z" fill="${ac}" opacity=".85" stroke="${LN}" stroke-width="1.4"/>`);
  // 목 + 턱 그림자
  o.push(`<path d="M86,150 L85,188 Q100,196 115,188 L114,150 Z" fill="${sk}" stroke="${LN}" stroke-width="${lw}"/><path d="M86,160 Q100,176 114,160 L114,170 Q100,182 86,170 Z" fill="${skS}" opacity=".75"/>`);
  // 귀
  if (p.ears === 'elf') o.push(`<path d="M58,108 L16,74 C24,96 38,118 56,130 Z" fill="${sk}" stroke="${LN}" stroke-width="${lw}" stroke-linejoin="round"/><path d="M142,108 L184,74 C176,96 162,118 144,130 Z" fill="${sk}" stroke="${LN}" stroke-width="${lw}" stroke-linejoin="round"/><path d="M50,108 L28,86" stroke="${skS}" stroke-width="3"/><path d="M150,108 L172,86" stroke="${skS}" stroke-width="3"/>`);
  else o.push(`<path d="M56,108 C46,104 44,124 56,130" fill="${sk}" stroke="${LN}" stroke-width="${lw}"/><path d="M144,108 C154,104 156,124 144,130" fill="${sk}" stroke="${LN}" stroke-width="${lw}"/>`);
  // 얼굴 (둥근 볼, 작은 턱)
  o.push(`<path d="M55,98 C54,62 76,48 100,48 C124,48 146,62 145,98 C145,126 134,148 116,161 Q100,170 84,161 C66,148 55,126 55,98 Z" fill="url(#${uid}skin)" stroke="${LN}" stroke-width="${lw}"/>`);
  // 앞머리 그림자 (이마)
  o.push(`<path d="M58,96 Q100,110 142,96 L142,104 Q100,120 58,104 Z" fill="${skS}" opacity=".55" filter="url(#${uid}soft)"/>`);
  // 볼터치
  if (p.blush !== false) o.push(`<ellipse cx="70" cy="138" rx="15" ry="8" fill="url(#${uid}blush)"/><ellipse cx="130" cy="138" rx="15" ry="8" fill="url(#${uid}blush)"/><path d="M64,136 l3,-3 M69,137 l3,-3 M74,137 l3,-3 M126,137 l3,-3 M131,137 l3,-3 M136,136 l3,-3" stroke="#ff7d96" stroke-width="1.2" opacity=".7"/>`);
  // 눈
  const eyeY = 121;
  const eye = (cx, side) => {
    if (happy) return `<path d="M${cx - 15},${eyeY + 3} Q${cx},${eyeY - 14} ${cx + 15},${eyeY + 3}" fill="none" stroke="${LN}" stroke-width="3.8" stroke-linecap="round"/><path d="M${cx + side * 15},${eyeY + 2} l${side * 5},-3" stroke="${LN}" stroke-width="2.4" stroke-linecap="round"/>`;
    const rx = 15, ry = surprise ? 21 : sly ? 12 : 19.5, top = eyeY - ry;
    const ix = cx + (sly ? side * 3 : 0) + side * 1;
    // 눈 모양: 위는 넓고 아래는 둥근 애니 눈. 흰자는 바깥쪽 끝에만 살짝
    const shapeD = `M${cx - rx - 2},${eyeY - ry * .35} C${cx - rx + 2},${top - 2} ${cx + rx - 2},${top - 3} ${cx + rx + 2},${eyeY - ry * .45} C${cx + rx + 3},${eyeY + ry * .5} ${cx + rx * .55},${eyeY + ry} ${cx},${eyeY + ry} C${cx - rx * .6},${eyeY + ry} ${cx - rx - 3},${eyeY + ry * .5} ${cx - rx - 2},${eyeY - ry * .35} Z`;
    return `
      <clipPath id="${uid}e${side}"><path d="${shapeD}"/></clipPath>
      <path d="${shapeD}" fill="#fdfbff"/>
      <g clip-path="url(#${uid}e${side})">
        <ellipse cx="${ix}" cy="${eyeY + 1}" rx="${rx + 1.5}" ry="${ry + 2}" fill="url(#${uid}iris)"/>
        <ellipse cx="${ix}" cy="${eyeY + 4}" rx="${rx - 6.5}" ry="${ry - 6}" fill="${shade(ey, -0.78)}" opacity=".9"/>
        <path d="M${ix - rx + 3},${eyeY + ry - 7} Q${ix},${eyeY + ry + 2} ${ix + rx - 3},${eyeY + ry - 7}" stroke="${shade(ey, .75)}" stroke-width="3" fill="none" opacity=".85"/>
        <path d="M${cx - rx - 4},${top + 2} Q${cx},${top + 10} ${cx + rx + 4},${top + 2} L${cx + rx + 4},${top - 6} L${cx - rx - 4},${top - 6} Z" fill="${LN}" opacity=".35"/>
      </g>
      <ellipse cx="${ix - 6}" cy="${eyeY - 6}" rx="5.6" ry="7" fill="#fff"/>
      <circle cx="${ix + 6}" cy="${eyeY + 8}" r="2.6" fill="#fff" opacity=".95"/>
      <circle cx="${ix + 7}" cy="${eyeY - 8}" r="1.5" fill="#fff" opacity=".85"/>
      <path d="M${cx - rx - 4},${eyeY - ry * .2} C${cx - rx},${top - 6} ${cx + rx},${top - 8} ${cx + rx + 6},${eyeY - ry * .45}" fill="none" stroke="${LN}" stroke-width="4.6" stroke-linecap="round"/>
      <path d="M${cx + side * (rx + 4)},${eyeY - ry * .42} l${side * 6},-3 M${cx + side * (rx + 1)},${eyeY - ry * .7} l${side * 6},-5" stroke="${LN}" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M${cx - rx + 3},${top - 8} Q${cx},${top - 14} ${cx + rx - 1},${top - 8}" fill="none" stroke="${LN}" stroke-width="1.2" opacity=".6"/>
      <path d="M${cx - rx * .5},${eyeY + ry + 1.5} Q${cx},${eyeY + ry + 3} ${cx + rx * .5},${eyeY + ry + 1}" fill="none" stroke="${LN}" stroke-width="1.2" opacity=".55"/>`;
  };
  o.push(eye(77, -1), eye(123, 1));
  // 눈썹 (얇게)
  const by = 90;
  const brow = (cx, s) => angry ? `<path d="M${cx - 13 * s},${by - 3} L${cx + 12 * s},${by + 4}" stroke="${hrD}" stroke-width="2.6" stroke-linecap="round"/>` : sad ? `<path d="M${cx - 13 * s},${by + 3} Q${cx},${by - 4} ${cx + 12 * s},${by - 3}" stroke="${hrD}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` : `<path d="M${cx - 12},${by + 1} Q${cx},${by - 4} ${cx + 12},${by}" stroke="${hrD}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  o.push(brow(78, -1), brow(122, 1));
  // 코·입
  o.push(`<path d="M100,134 L98.5,138" stroke="${mix(sk, '#8a4a4a', .5)}" stroke-width="1.6" stroke-linecap="round"/>`);
  const mouth = {
    happy: `<path d="M90,148 Q100,158 110,148 Q100,152 90,148 Z" fill="#d9566c" stroke="${LN}" stroke-width="1.4"/><path d="M95,153 Q100,156 105,153" fill="#ff9aa8"/>`,
    smile: `<path d="M92,149 Q100,154 108,149" fill="none" stroke="${LN}" stroke-width="1.8" stroke-linecap="round"/>`,
    angry: `<path d="M91,153 Q100,147 109,153" fill="none" stroke="${LN}" stroke-width="1.8" stroke-linecap="round"/>`,
    sad: `<path d="M93,153 Q100,149 107,153" fill="none" stroke="${LN}" stroke-width="1.8" stroke-linecap="round"/>`,
    sly: `<path d="M92,150 Q103,154 110,146" fill="none" stroke="${LN}" stroke-width="1.8" stroke-linecap="round"/>`,
    surprise: `<ellipse cx="100" cy="151" rx="4" ry="5" fill="#d9566c" stroke="${LN}" stroke-width="1.4"/>`,
    neutral: `<path d="M95,150 Q100,151 105,150" fill="none" stroke="${LN}" stroke-width="1.8" stroke-linecap="round"/>`
  }[mood] || '';
  o.push(mouth);
  if (p.scar) o.push(`<path d="M128,98 L138,124" stroke="#c0475a" stroke-width="2" stroke-linecap="round" opacity=".8"/>`);
  if (p.beard) o.push(`<path d="M58,122 C62,170 80,198 100,202 C120,198 138,170 142,122 C132,150 118,160 100,158 C82,160 68,150 58,122 Z" fill="${p.beard}" stroke="${LN}" stroke-width="${lw}"/><path d="M84,147 Q100,139 116,147 Q100,153 84,147 Z" fill="${shade(p.beard, -0.15)}" stroke="${LN}" stroke-width="1.4"/><path d="M80,170 Q100,184 120,170" stroke="${shade(p.beard, .3)}" stroke-width="2" fill="none" opacity=".6"/>`);
  // 앞머리: 여러 갈래 + 하이라이트(천사 고리)
  if (hs !== 'bald') {
    const len = { short: 0, long: 8, twin: 4, pony: -2, bob: 10, spiky: -6 }[hs] || 0;
    const r2 = rng((hr + (p.eye || '')).split('').reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7));
    // 끝이 휘어진 앞머리 갈래들 (왼→오)
    const tips = [];
    const n = hs === 'pony' ? 5 : 6;
    for (let i = 0; i <= n; i++) { const t = i / n; tips.push([44 + t * 112 + (r2() - .5) * 6, (i === 0 || i === n ? 118 + len * 1.4 : 100 + len + (i % 2 ? 6 : -2) + r2() * 8) + (hs === 'spiky' ? -4 : 0)]); }
    let d = `M${tips[0][0]},${tips[0][1]} C${36},70 ${62},30 100,30 C${138},30 ${164},70 ${tips[n][0]},${tips[n][1]}`;
    for (let i = n; i > 0; i--) {
      const [tx, ty] = tips[i], [nx, ny] = tips[i - 1];
      const vx = (tx + nx) / 2 + (r2() - .5) * 4, vy = Math.min(ty, ny) - 20 - r2() * 8 - (hs === 'spiky' ? 10 : 0);
      const lean = i > n / 2 ? -1 : 1;
      d += ` Q${tx + lean * 3},${(ty + vy) / 2} ${vx},${vy} Q${nx - lean * 6},${(ny + vy) / 2 + 2} ${nx},${ny}`;
    }
    o.push(`<path d="${d} Z" ${H}/>`);
    // 머리카락 결 (정수리에서 끝으로)
    tips.slice(1, -1).forEach(([tx, ty]) => o.push(`<path d="M${100 + (tx - 100) * .25},${38} Q${100 + (tx - 100) * .7},${60} ${tx},${ty - 6}" stroke="${hrD}" stroke-width="1.3" fill="none" opacity=".5"/>`));
    if (hs === 'spiky') o.push(`<path d="M64,48 L50,20 L80,38 M94,34 L100,6 L110,32 M124,38 L150,18 L138,48" stroke="${LN}" stroke-width="${lw}" fill="${hr}" stroke-linejoin="round"/>`);
    // 옆머리 (긴 머리 계열)
    if (['long', 'twin', 'bob'].includes(hs)) o.push(`<path d="M50,96 C42,140 46,176 58,${hs === 'bob' ? 170 : 200} C60,168 62,140 64,112 Z" ${H}/><path d="M150,96 C158,140 154,176 142,${hs === 'bob' ? 170 : 200} C140,168 138,140 136,112 Z" ${H}/>`);
    // 천사 고리 하이라이트
    o.push(`<path d="M62,62 Q100,44 138,62" stroke="#ffffff" stroke-width="6" fill="none" opacity=".45" stroke-linecap="round"/><path d="M70,58 l6,4 M88,52 l5,5 M110,52 l5,5 M126,57 l5,5" stroke="#ffffff" stroke-width="2.4" opacity=".7" stroke-linecap="round"/>`);
  } else {
    o.push(`<path d="M58,90 C58,62 78,50 100,50 C122,50 142,62 142,90 C134,70 118,62 100,62 C82,62 66,70 58,90 Z" fill="${skL}" opacity=".7"/>`);
  }
  // 소품
  const hc = p.hatColor || '#5b3fa0', hcD = shade(hc, -0.3), hcL = shade(hc, 0.3);
  if (p.glasses) o.push(`<rect x="60" y="104" width="36" height="30" rx="10" fill="#cfe8ff" fill-opacity=".14" stroke="#4a3a4a" stroke-width="2.4"/><rect x="104" y="104" width="36" height="30" rx="10" fill="#cfe8ff" fill-opacity=".14" stroke="#4a3a4a" stroke-width="2.4"/><path d="M96,116 L104,116" stroke="#4a3a4a" stroke-width="2.4"/><path d="M66,110 l8,-4" stroke="#fff" stroke-width="2" opacity=".8"/>`);
  if (p.beast) { // 귀 (모자보다 먼저 그려서 큰 모자 밑으로 귀 끝만 보이게)
    const fur = p.fur || hr, fx = p.hat === 'wizard' ? 22 : 0;
    o.push(`<path d="M${60 - fx},70 L${38 - fx},${p.beast === 'cat' ? 14 : 2} L${90 - fx * .4},44 Z" fill="${fur}" stroke="${LN}" stroke-width="${lw}" stroke-linejoin="round"/><path d="M${63 - fx},62 L${46 - fx},${p.beast === 'cat' ? 26 : 16} L${80 - fx * .4},46 Z" fill="#ffc2d1"/>`);
    o.push(`<path d="M${140 + fx},70 L${162 + fx},${p.beast === 'cat' ? 14 : 2} L${110 + fx * .4},44 Z" fill="${fur}" stroke="${LN}" stroke-width="${lw}" stroke-linejoin="round"/><path d="M${137 + fx},62 L${154 + fx},${p.beast === 'cat' ? 26 : 16} L${120 + fx * .4},46 Z" fill="#ffc2d1"/>`);
  }
  if (p.hat === 'wizard') o.push(`<path d="M22,74 Q100,50 178,74 Q100,96 22,74 Z" fill="${hc}" stroke="${LN}" stroke-width="${lw}"/><path d="M54,68 C70,40 92,10 112,-2 C116,14 124,20 132,22 C136,40 140,54 146,68 Q100,78 54,68 Z" fill="${hc}" stroke="${LN}" stroke-width="${lw}" stroke-linejoin="round"/><path d="M56,64 Q100,74 144,64 L142,54 Q100,64 58,54 Z" fill="${p.hatBand || ac}" stroke="${LN}" stroke-width="1.4"/><path d="M70,48 Q86,28 104,10" stroke="${hcL}" stroke-width="4" fill="none" opacity=".6"/><path d="M128,22 l4,8 l8,1 l-6,5 l2,8 l-7,-4 l-7,4 l2,-8 l-6,-5 l8,-1 Z" fill="#ffe066" stroke="${LN}" stroke-width="1.2"/>`);
  if (p.hat === 'crown') o.push(`<path d="M68,42 L70,18 L84,32 L100,12 L116,32 L130,18 L132,42 Z" fill="#f0c33c" stroke="${LN}" stroke-width="${lw}" stroke-linejoin="round"/><circle cx="100" cy="32" r="5" fill="#ff5d7a" stroke="${LN}" stroke-width="1.4"/><path d="M74,38 L126,38" stroke="#fff3c4" stroke-width="2" opacity=".7"/>`);
  if (p.hat === 'helmet') o.push(`<path d="M40,106 C36,46 70,24 100,24 C130,24 164,46 160,106 L146,106 C146,72 128,56 100,56 C72,56 54,72 54,106 Z" fill="#b7bfcf" stroke="${LN}" stroke-width="${lw}"/><path d="M100,24 L100,56" stroke="${p.accent || '#e04040'}" stroke-width="8"/><path d="M58,52 Q78,34 100,32" stroke="#fff" stroke-width="4" opacity=".6" fill="none"/>`);
  if (p.hat === 'hood') o.push(`<path d="M28,156 C16,60 58,18 100,18 C142,18 184,60 172,156 L150,150 C154,94 134,62 100,62 C66,62 46,94 50,150 Z" fill="${hc}" stroke="${LN}" stroke-width="${lw}"/><path d="M40,92 Q58,40 100,30" stroke="${hcL}" stroke-width="5" opacity=".35" fill="none"/><path d="M50,150 C46,110 58,80 76,68" stroke="${hcD}" stroke-width="4" fill="none" opacity=".6"/>`);
  if (p.hat === 'cap') o.push(`<path d="M46,76 C48,40 76,28 100,28 C124,28 152,40 154,76 Z" fill="${hc}" stroke="${LN}" stroke-width="${lw}"/><path d="M38,76 Q100,64 162,76 Q100,88 38,76 Z" fill="${hcD}" stroke="${LN}" stroke-width="${lw}"/><path d="M64,46 Q84,34 104,34" stroke="${hcL}" stroke-width="4" fill="none" opacity=".6"/>`);
  if (p.hat === 'catears') o.push(`<path d="M52,62 L46,16 L86,42 Z" fill="${hr}" stroke="${LN}" stroke-width="${lw}" stroke-linejoin="round"/><path d="M56,54 L54,28 L74,42 Z" fill="#ffb3c6"/><path d="M148,62 L154,16 L114,42 Z" fill="${hr}" stroke="${LN}" stroke-width="${lw}" stroke-linejoin="round"/><path d="M144,54 L146,28 L126,42 Z" fill="#ffb3c6"/>`);
  if (p.hat === 'horns') o.push(`<path d="M62,50 C44,40 40,16 52,4 C54,22 62,32 76,38 Z" fill="#efe6cf" stroke="${LN}" stroke-width="${lw}"/><path d="M138,50 C156,40 160,16 148,4 C146,22 138,32 124,38 Z" fill="#efe6cf" stroke="${LN}" stroke-width="${lw}"/>`);
  if (p.hat === 'bandana') o.push(`<path d="M44,78 Q100,56 156,78 L154,92 Q100,72 46,92 Z" fill="${hc}" stroke="${LN}" stroke-width="${lw}"/><path d="M154,84 L182,100 L170,72 Z" fill="${hc}" stroke="${LN}" stroke-width="${lw}"/>`);
  if (p.hat === 'flower') o.push(`<g transform="translate(142,64)">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-9" rx="6" ry="9" transform="rotate(${a})" fill="#ffa3c2" stroke="${LN}" stroke-width="1.4"/>`).join('')}<circle r="5" fill="#ffe066" stroke="${LN}" stroke-width="1.4"/></g>`);
  if (p.hat === 'halo') o.push(`<ellipse cx="100" cy="20" rx="36" ry="9" fill="none" stroke="#ffe680" stroke-width="5"/><ellipse cx="100" cy="20" rx="36" ry="9" fill="none" stroke="#fff" stroke-width="1.5" opacity=".8"/>`);
  // 전체에 살짝 빛 (림 라이트)
  o.push(`<rect width="200" height="240" fill="url(#${uid}bg)" opacity=".08"/></g>`);
  return `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">${o.join('')}</svg>`;
}

function creaturePortrait(p, mood, uid) {
  const bg = p.bg || '#cfe3ff';
  let body = '';
  if (p.kind === 'cat') {
    const c = p.cloth || '#f2a65a';
    body = `<path d="M40,240 C40,170 60,150 100,150 C140,150 160,170 160,240 Z" fill="${c}" stroke="${OUT}" stroke-width="3"/>
    <ellipse cx="100" cy="116" rx="62" ry="54" fill="${c}" stroke="${OUT}" stroke-width="3"/>
    <path d="M46,90 L44,30 L86,66 Z" fill="${c}" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/><path d="M154,90 L156,30 L114,66 Z" fill="${c}" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M52,78 L52,46 L74,66 Z" fill="#ffb3c6"/><path d="M148,78 L148,46 L126,66 Z" fill="#ffb3c6"/>
    ${mood === 'happy' ? `<path d="M64,116 Q76,104 88,116 M112,116 Q124,104 136,116" stroke="${OUT}" stroke-width="4" fill="none" stroke-linecap="round"/>` : `<ellipse cx="76" cy="114" rx="11" ry="14" fill="#9be15d" stroke="${OUT}" stroke-width="2.5"/><ellipse cx="124" cy="114" rx="11" ry="14" fill="#9be15d" stroke="${OUT}" stroke-width="2.5"/><ellipse cx="76" cy="116" rx="3" ry="10" fill="${OUT}"/><ellipse cx="124" cy="116" rx="3" ry="10" fill="${OUT}"/><circle cx="72" cy="108" r="3" fill="#fff"/><circle cx="120" cy="108" r="3" fill="#fff"/>`}
    <path d="M94,134 L106,134 L100,140 Z" fill="#ff8fa3" stroke="${OUT}" stroke-width="2"/><path d="M100,140 Q92,150 84,144 M100,140 Q108,150 116,144" stroke="${OUT}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M40,130 L10,124 M40,138 L12,144 M160,130 L190,124 M160,138 L188,144" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>
    ${p.pattern ? `<path d="M80,70 Q100,62 120,70 M86,82 Q100,76 114,82" stroke="${shade(c, -0.3)}" stroke-width="6" fill="none" stroke-linecap="round"/>` : ''}`;
  }
  if (p.kind === 'slime') {
    const c = p.cloth || '#5fd36a';
    body = `<path d="M26,220 C20,150 60,70 100,70 C140,70 180,150 174,220 Q100,240 26,220 Z" fill="${c}" fill-opacity=".9" stroke="${OUT}" stroke-width="3"/>
    <ellipse cx="70" cy="110" rx="18" ry="10" fill="#fff" opacity=".55" transform="rotate(-25 70 110)"/>
    <ellipse cx="78" cy="150" rx="9" ry="15" fill="${OUT}"/><ellipse cx="122" cy="150" rx="9" ry="15" fill="${OUT}"/><circle cx="75" cy="144" r="4" fill="#fff"/><circle cx="119" cy="144" r="4" fill="#fff"/>
    ${mood === 'angry' ? `<path d="M64,128 L90,138 M136,128 L110,138" stroke="${OUT}" stroke-width="4"/>` : ''}
    <path d="M88,180 Q100,${mood === 'sad' ? 172 : 190} 112,180" stroke="${OUT}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <circle cx="140" cy="200" r="6" fill="#fff" opacity=".4"/><circle cx="60" cy="196" r="4" fill="#fff" opacity=".4"/>`;
  }
  if (p.kind === 'ghost') {
    body = `<path d="M40,240 L40,110 C40,60 70,36 100,36 C130,36 160,60 160,110 L160,240 L140,220 L120,240 L100,220 L80,240 L60,220 Z" fill="#e6ecff" fill-opacity=".92" stroke="${OUT}" stroke-width="3"/>
    <ellipse cx="78" cy="118" rx="11" ry="${mood === 'sad' ? 10 : 16}" fill="#2a2a4a"/><ellipse cx="122" cy="118" rx="11" ry="${mood === 'sad' ? 10 : 16}" fill="#2a2a4a"/><circle cx="74" cy="110" r="4" fill="#fff"/><circle cx="118" cy="110" r="4" fill="#fff"/>
    <ellipse cx="100" cy="160" rx="10" ry="${mood === 'surprise' ? 12 : 7}" fill="#2a2a4a"/>
    <text x="100" y="78" text-anchor="middle" font-size="22" font-weight="900" fill="#8a90b0" font-family="sans-serif">H₀</text>
    <path d="M26,60 Q16,40 30,30 M174,60 Q184,40 170,30" stroke="#b8c2ff" stroke-width="3" fill="none" opacity=".6"/>`;
  }
  if (p.kind === 'golem') {
    body = `<rect x="30" y="150" width="140" height="100" rx="14" fill="#8a8682" stroke="${OUT}" stroke-width="3"/>
    <rect x="44" y="44" width="112" height="110" rx="16" fill="#9d9893" stroke="${OUT}" stroke-width="3"/>
    <path d="M52,60 L80,56 L76,80 Z M130,140 L148,120 L150,146 Z" fill="#7a7672"/><path d="M44,80 Q30,70 36,54" stroke="#5fae4a" stroke-width="6" fill="none"/>
    <rect x="64" y="90" width="26" height="10" rx="3" fill="#6ee7ff"/><rect x="110" y="90" width="26" height="10" rx="3" fill="#6ee7ff"/>
    <rect x="80" y="124" width="40" height="8" rx="2" fill="#5c5855"/>
    <text x="100" y="210" text-anchor="middle" font-size="30" font-weight="900" fill="#6ee7ff" font-family="serif">95%</text>`;
  }
  if (p.kind === 'mimic') {
    body = `<rect x="24" y="96" width="152" height="130" rx="10" fill="#8a4f24" stroke="${OUT}" stroke-width="3"/>
    <path d="M24,96 L176,96 L166,50 L34,50 Z" fill="#a5612f" stroke="${OUT}" stroke-width="3"/>
    <rect x="24" y="96" width="152" height="40" fill="#3a0d14"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<path d="M${30 + i * 21},96 l10,18 l10,-18 Z" fill="#fff" stroke="${OUT}" stroke-width="1.5"/><path d="M${40 + i * 21},136 l10,-16 l10,16 Z" fill="#fff" stroke="${OUT}" stroke-width="1.5"/>`).join('')}
    <circle cx="70" cy="74" r="10" fill="#ff3b3b"/><circle cx="130" cy="74" r="10" fill="#ff3b3b"/><circle cx="67" cy="71" r="3" fill="#fff"/><circle cx="127" cy="71" r="3" fill="#fff"/>
    <path d="M90,136 Q100,170 112,136" fill="#ff6b8f" stroke="${OUT}" stroke-width="2"/>
    <rect x="24" y="170" width="152" height="8" fill="#e8b83a"/>`;
  }
  if (p.kind === 'pigeon') {
    body = `<ellipse cx="100" cy="170" rx="70" ry="60" fill="#8a8fa8" stroke="${OUT}" stroke-width="3"/><circle cx="100" cy="92" r="46" fill="#9ca1b8" stroke="${OUT}" stroke-width="3"/>
    <path d="M60,120 Q100,150 140,120 L140,140 Q100,170 60,140 Z" fill="#5fb38a"/><path d="M64,140 Q100,165 136,140" stroke="#b26ad0" stroke-width="8" fill="none"/>
    <path d="M40,96 L12,104 L40,110 Z" fill="#e8a23a" stroke="${OUT}" stroke-width="3"/><circle cx="76" cy="84" r="11" fill="#ff8a3a" stroke="${OUT}" stroke-width="3"/><circle cx="76" cy="84" r="5" fill="${OUT}"/>
    <rect x="90" y="40" width="40" height="10" fill="#2a2a2a"/><rect x="98" y="14" width="24" height="28" fill="#2a2a2a"/>`;
  }
  if (p.kind === 'rock') {
    body = `<path d="M24,226 L40,120 Q60,70 110,66 Q160,70 176,130 L180,226 Z" fill="#8e8a86" stroke="${OUT}" stroke-width="3"/>
    <path d="M60,110 Q90,84 120,92" stroke="#b5b0aa" stroke-width="10" fill="none" stroke-linecap="round"/>
    <circle cx="80" cy="150" r="6" fill="${OUT}"/><circle cx="128" cy="150" r="6" fill="${OUT}"/><path d="M92,184 L118,184" stroke="${OUT}" stroke-width="4" stroke-linecap="round"/>
    <path d="M24,226 Q100,212 180,226" stroke="#5fae4a" stroke-width="10" fill="none"/>`;
  }
  if (p.kind === 'boss') {
    body = `<path d="M10,240 C20,170 50,140 100,140 C150,140 180,170 190,240 Z" fill="#5b1830" stroke="${OUT}" stroke-width="3"/>
    <path d="M50,240 C56,180 76,160 100,160 C124,160 144,180 150,240 Z" fill="#2d2a3a" stroke="${OUT}" stroke-width="3"/>
    <path d="M50,110 C50,50 74,30 100,30 C126,30 150,50 150,110 L140,150 L60,150 Z" fill="#2d2a3a" stroke="${OUT}" stroke-width="3"/>
    <path d="M56,46 C36,30 30,6 40,-2 C46,20 58,30 70,34 Z M144,46 C164,30 170,6 160,-2 C154,20 142,30 130,34 Z" fill="#c9c3d8" stroke="${OUT}" stroke-width="3"/>
    <path d="M64,96 L92,104 L90,112 L64,106 Z M136,96 L108,104 L110,112 L136,106 Z" fill="#ff3b3b"/>
    <path d="M70,128 L130,128" stroke="#111" stroke-width="5"/><path d="M100,30 L100,70" stroke="#7d3fb8" stroke-width="6"/>
    <text x="100" y="214" text-anchor="middle" font-size="22" font-weight="900" fill="#ff6b8f" font-family="sans-serif">σ²→∞</text>`;
  }
  return `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="${uid}bg" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${shade(bg, -0.3)}"/></radialGradient></defs><rect width="200" height="240" rx="18" fill="url(#${uid}bg)"/>${body}</svg>`;
}

// 표지판·물체용 작은 그림 (대화창 왼쪽)
function objectSVG(kind) {
  const bg = '<rect width="200" height="240" rx="18" fill="#efe2c4"/>';
  const items = {
    sign: `<rect x="92" y="120" width="16" height="110" fill="#6e4826" stroke="${OUT}" stroke-width="3"/><rect x="30" y="50" width="140" height="90" rx="8" fill="#c99a5b" stroke="${OUT}" stroke-width="4"/><path d="M50,80 H150 M50,100 H130 M50,120 H110" stroke="#6e4826" stroke-width="6" stroke-linecap="round"/>`,
    chest: `<rect x="30" y="110" width="140" height="90" rx="8" fill="#8a4f24" stroke="${OUT}" stroke-width="4"/><path d="M30,110 L40,60 L160,60 L170,110 Z" fill="#a5612f" stroke="${OUT}" stroke-width="4"/><rect x="88" y="98" width="24" height="34" rx="4" fill="#e8b83a" stroke="${OUT}" stroke-width="3"/>`,
    fountain: `<ellipse cx="100" cy="190" rx="80" ry="28" fill="#cfc6b4" stroke="${OUT}" stroke-width="4"/><ellipse cx="100" cy="186" rx="66" ry="20" fill="#5aa2e6"/><rect x="88" y="80" width="24" height="110" fill="#d8d0c0" stroke="${OUT}" stroke-width="4"/><path d="M60,74 Q100,30 140,74" fill="none" stroke="#8fc6f5" stroke-width="6"/><path d="M70,70 C82,30 118,30 130,70" fill="none" stroke="#e1b13d" stroke-width="5"/>`,
    book: `<rect x="40" y="60" width="120" height="150" rx="8" fill="#3d7bd9" stroke="${OUT}" stroke-width="4"/><rect x="54" y="78" width="92" height="40" fill="#fff" opacity=".85"/><path d="M60,92 H140 M60,104 H120" stroke="#3d7bd9" stroke-width="5"/>`,
    bed: `<rect x="24" y="110" width="152" height="80" rx="10" fill="#4f7fd6" stroke="${OUT}" stroke-width="4"/><rect x="30" y="90" width="50" height="34" rx="10" fill="#fff" stroke="${OUT}" stroke-width="3"/>`,
    anvil: `<path d="M30,100 H170 L150,130 H50 Z" fill="#6a6f7c" stroke="${OUT}" stroke-width="4"/><rect x="80" y="130" width="40" height="70" fill="#4a4f5c" stroke="${OUT}" stroke-width="4"/>`,
    cauldron: `<ellipse cx="100" cy="150" rx="70" ry="60" fill="#2f2f3a" stroke="${OUT}" stroke-width="4"/><ellipse cx="100" cy="100" rx="64" ry="16" fill="#5fd36a" stroke="${OUT}" stroke-width="3"/><circle cx="80" cy="80" r="8" fill="#9cff9c"/><circle cx="120" cy="70" r="5" fill="#9cff9c"/>`,
    altar: `<rect x="30" y="110" width="140" height="90" fill="#c9c3d8" stroke="${OUT}" stroke-width="4"/><rect x="60" y="70" width="10" height="40" fill="#fff3c4"/><rect x="130" y="70" width="10" height="40" fill="#fff3c4"/><circle cx="65" cy="64" r="6" fill="#ffb84d"/><circle cx="135" cy="64" r="6" fill="#ffb84d"/><circle cx="100" cy="150" r="22" fill="#e1b13d" stroke="${OUT}" stroke-width="3"/>`,
    crystal: `<path d="M100,30 L130,120 L100,210 L70,120 Z" fill="#7ef0ff" stroke="${OUT}" stroke-width="4"/><path d="M100,30 L100,210" stroke="#e8fdff" stroke-width="4"/>`,
    gate: `<rect x="30" y="30" width="140" height="190" rx="8" fill="#454a66" stroke="${OUT}" stroke-width="4"/><path d="M100,30 V220" stroke="${OUT}" stroke-width="4"/><circle cx="65" cy="100" r="12" fill="#b794ff"/><circle cx="135" cy="100" r="12" fill="#b794ff"/><circle cx="100" cy="160" r="12" fill="#b794ff"/>`,
    ore: `<path d="M30,200 L50,110 L100,70 L160,100 L176,200 Z" fill="#8e8a86" stroke="${OUT}" stroke-width="4"/><path d="M80,140 l12,-12 l12,12 l-12,12z M130,160 l8,-8 l8,8 l-8,8z" fill="#6ee7ff"/>`,
    statue: `<rect x="60" y="180" width="80" height="40" fill="#8e8a96" stroke="${OUT}" stroke-width="4"/><path d="M80,180 L84,80 Q100,60 116,80 L120,180 Z" fill="#dcd8e6" stroke="${OUT}" stroke-width="4"/><circle cx="100" cy="60" r="18" fill="#dcd8e6" stroke="${OUT}" stroke-width="4"/>`,
    dummy: `<rect x="94" y="80" width="12" height="140" fill="#6e4826"/><rect x="60" y="100" width="80" height="12" fill="#6e4826"/><circle cx="100" cy="66" r="26" fill="#e6c58a" stroke="${OUT}" stroke-width="4"/><circle cx="100" cy="150" r="14" fill="#e04040"/>`
  };
  return `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">${bg}${items[kind] || items.sign}</svg>`;
}

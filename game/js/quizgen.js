// =========================================================================
// 퀴즈 개선
//  1) 풀이에 필요한 임계값(z, t, χ²)은 문제에 미리 적어 준다
//  2) 읽은 표지판의 개념과 이어지는 문제를 우선 출제
//  3) 계산 문제 일부는 숫자를 바꿔 새로 만든다 (필요한 수치는 전부 제공)
// =========================================================================
(function giveNeededValues() {
  const Z = { '1.96': 'z(0.025) = 1.96', '1.645': 'z(0.05) = 1.645', '2.576': 'z(0.005) = 2.576', '2.58': 'z(0.005) = 2.576', '2.33': 'z(0.01) = 2.33', '1.282': 'z(0.10) = 1.282' };
  const SKIP = new Set(['q7g', 'q8b']); // 임계값 자체를 묻는 문제
  QUIZ.forEach(q => {
    if (SKIP.has(q.id) || /^cq_/.test(q.id) || q.gen) return;
    const h = (typeof QUIZ_HELP !== 'undefined' && QUIZ_HELP[q.id]) || {};
    const txt = [q.ex, h.f || '', (h.s || []).join(' ')].join(' ');
    const need = [];
    const re = /(t|χ²|z)\s*\(([^)]*)\)\s*=\s*([\d.]+)/g; let m;
    while ((m = re.exec(txt))) if (!q.q.includes(m[3]) && !String(q.a).includes(m[3]) && !need.includes(m[0])) need.push(m[0]);
    for (const v in Z) if (txt.includes(v) && !q.q.includes(v) && !String(q.a).includes(v) && !need.some(n => n.includes(v)) && !need.includes(Z[v])) need.push(Z[v]);
    if (need.length) q.q += `\n📎 주어진 값: ${need.join(',  ')}`;
  });
})();

// ---------- 숫자를 바꿔 내는 계산 문제 ----------
const R2 = v => Math.round(v * 100) / 100, R3 = v => Math.round(v * 1000) / 1000;
const pickOf = a => a[Math.random() * a.length | 0];
const fmt = v => (Math.round(v * 100) / 100).toString();
function distinct(a, ws) { const out = []; ws.forEach(w => { let x = w; let k = 0; while ((String(x) === String(a) || out.map(String).includes(String(x))) && k < 5) { x = typeof x === 'number' ? R2(x * 1.13 + 0.07) : x + ' '; k++; } out.push(x); }); return out.slice(0, 2); }
const ZTAB = { 90: 1.645, 95: 1.96, 99: 2.576 };
const QUIZ_GEN = [
  { id: 'gen_ci_z', ch: 7, lessons: ['f_ci_z', 'sign_t1a', 'sign_plaza1', 'sign_t1b', 'd_w1'], make() {
    const n = pickOf([16, 25, 36, 49, 64, 81, 100]), sg = pickOf([4, 5, 6, 8, 10, 12, 15]), cl = pickOf([90, 95, 95, 99]), z = ZTAB[cl], xb = pickOf([48, 52, 60, 75, 80, 120]);
    const E = z * sg / Math.sqrt(n), up = Math.random() < .5;
    const a = up ? R2(xb + E) : R2(E);
    return { q: `σ = ${sg}, n = ${n}, x̄ = ${xb} 일 때 모평균의 ${cl}% 신뢰구간의 ${up ? '상한은' : '오차한계는'}?\n📎 주어진 값: z(${((100 - cl) / 200).toFixed(3).replace(/0+$/, '')}) = ${z}`,
      a, w: distinct(a, [up ? R2(xb + z * sg / n) : R2(z * sg / n), up ? R2(xb + (cl === 95 ? 1.645 : 1.96) * sg / Math.sqrt(n)) : R2((cl === 95 ? 1.645 : 1.96) * sg / Math.sqrt(n))]),
      ex: `오차한계 = z × σ/√n = ${z} × ${sg}/√${n} = ${z} × ${R3(sg / Math.sqrt(n))} = ${R2(E)}${up ? ` → 상한 = ${xb} + ${R2(E)} = ${a}` : ''}`,
      f: 'x̄ ± z(α/2) · σ/√n' };
  } },
  { id: 'gen_ci_t', ch: 7, lessons: ['f_ci_t', 'sign_t2', 'd_w2'], make() {
    const [n, t] = pickOf([[9, 2.306], [16, 2.131], [25, 2.064], [10, 2.262]]), s = pickOf([3, 4, 5, 6, 9]), xb = pickOf([20, 35, 50, 64]);
    const E = t * s / Math.sqrt(n), a = R2(E);
    return { q: `표본 n = ${n}개, x̄ = ${xb}, s = ${s} (σ는 모름). 모평균의 95% 신뢰구간 오차한계는?\n📎 주어진 값: t(0.025, ${n - 1}) = ${t},  z(0.025) = 1.96`,
      a, w: distinct(a, [R2(1.96 * s / Math.sqrt(n)), R2(t * s / n)]),
      ex: `σ를 모르고 표본이 작으니 t분포, 자유도 n − 1 = ${n - 1}. 오차한계 = ${t} × ${s}/√${n} = ${a} (z = 1.96을 쓰면 틀림)`,
      f: 'x̄ ± t(α/2, n−1) · s/√n' };
  } },
  { id: 'gen_ci_p', ch: 7, lessons: ['f_ci_p', 'sign_plaza1', 'sign_t1a'], make() {
    const n = pickOf([100, 200, 400, 500, 900]), ph = pickOf([0.2, 0.3, 0.4, 0.5, 0.6]), X = Math.round(n * ph);
    const E = 1.96 * Math.sqrt(ph * (1 - ph) / n), a = R3(E);
    return { q: `${n}명 중 ${X}명이 찬성했다. 모비율의 95% 신뢰구간 오차한계는? (소수 셋째 자리)\n📎 주어진 값: z(0.025) = 1.96`,
      a, w: distinct(a, [R3(1.96 * Math.sqrt(ph / n)), R3(1.645 * Math.sqrt(ph * (1 - ph) / n))]),
      ex: `p̂ = ${X}/${n} = ${ph}. 오차한계 = 1.96 × √(${ph} × ${R2(1 - ph)} / ${n}) = 1.96 × ${R3(Math.sqrt(ph * (1 - ph) / n))} = ${a}`,
      f: 'p̂ ± z(α/2) · √(p̂(1−p̂)/n)' };
  } },
  { id: 'gen_n', ch: 7, lessons: ['f_n', 'sign_lib1'], make() {
    const sg = pickOf([3, 4, 5, 6, 8, 10]), E = pickOf([1, 1.5, 2]), raw = (1.96 * sg / E) ** 2, a = Math.ceil(raw);
    return { q: `σ = ${sg}일 때, 95% 신뢰구간의 오차한계를 ${E} 이하로 만들려면 표본은 최소 몇 개?\n📎 주어진 값: z(0.025) = 1.96`,
      a, w: distinct(a, [Math.floor(raw), Math.ceil(1.96 * sg / E)]),
      ex: `n ≥ (z·σ/E)² = (1.96 × ${sg} / ${E})² = ${R2(1.96 * sg / E)}² = ${R2(raw)} → 반올림이 아니라 올림해서 ${a}`,
      f: 'n ≥ (z(α/2) · σ / E)²' };
  } },
  { id: 'gen_z_test', ch: 8, lessons: ['f_z_test', 'sign_plaza2', 'd_s1', 'sign_c2'], make() {
    const n = pickOf([16, 25, 36, 64, 100]), sg = pickOf([4, 5, 6, 8, 10]), m0 = pickOf([50, 60, 100, 200]), dx = pickOf([-3, -2, -1.5, 1.5, 2, 3]), xb = m0 + dx;
    const Z = dx / (sg / Math.sqrt(n)), a = R2(Z);
    return { q: `H₀: μ = ${m0}, σ = ${sg}. 표본 ${n}개의 평균이 ${xb}일 때 검정통계량 Z₀는?\n📎 주어진 값: √${n} = ${Math.sqrt(n)}`,
      a, w: distinct(a, [R2(dx / sg), R2(dx / (sg / n))]),
      ex: `Z₀ = (x̄ − μ₀) / (σ/√n) = (${xb} − ${m0}) / (${sg}/${Math.sqrt(n)}) = ${dx} / ${R3(sg / Math.sqrt(n))} = ${a}`,
      f: 'Z₀ = (x̄ − μ₀) / (σ/√n)' };
  } },
  { id: 'gen_decide', ch: 8, lessons: ['sign_c2', 'd_s2', 'f_err', 'sign_plaza2', 'sym_3'], make() {
    const kind = pickOf(['양측', '우측', '좌측']), al = pickOf([0.05, 0.01]);
    const cv = kind === '양측' ? (al === 0.05 ? 1.96 : 2.576) : (al === 0.05 ? 1.645 : 2.33);
    const z0 = R2((kind === '좌측' ? -1 : 1) * pickOf([cv - 0.4, cv - 0.15, cv + 0.12, cv + 0.5]) * (kind === '양측' && Math.random() < .5 ? -1 : 1));
    const rej = kind === '양측' ? Math.abs(z0) > cv : kind === '우측' ? z0 > cv : z0 < -cv;
    const h1 = kind === '양측' ? 'μ ≠ μ₀' : kind === '우측' ? 'μ > μ₀' : 'μ < μ₀';
    const a = rej ? 'H₀를 기각한다' : 'H₀를 기각하지 못한다';
    return { q: `H₁: ${h1} (${kind}검정), 유의수준 α = ${al}. 검정통계량 Z₀ = ${z0}. 결론은?\n📎 주어진 값: z(0.05) = 1.645,  z(0.025) = 1.96,  z(0.01) = 2.33,  z(0.005) = 2.576`,
      a, w: [rej ? 'H₀를 기각하지 못한다' : 'H₀를 기각한다', 'H₀를 채택해 참으로 확정한다'],
      ex: `${kind}검정 α = ${al} → 기각역 ${kind === '양측' ? `|Z₀| > ${cv}` : kind === '우측' ? `Z₀ > ${cv}` : `Z₀ < −${cv}`}. Z₀ = ${z0} 는 기각역 ${rej ? '안' : '밖'} → ${a}. (기각 못 해도 H₀가 참이라고 「확정」하지는 않는다)`,
      f: kind === '양측' ? '|Z₀| > z(α/2) 이면 기각' : kind === '우측' ? 'Z₀ > z(α) 이면 기각' : 'Z₀ < −z(α) 이면 기각' };
  } },
  { id: 'gen_p_test', ch: 8, lessons: ['f_p_test', 'sym_2'], make() {
    const p0 = pickOf([0.5, 0.4, 0.2]), n = pickOf([100, 400]), ph = R2(p0 + pickOf([-0.06, -0.04, 0.04, 0.05, 0.08])), se = Math.sqrt(p0 * (1 - p0) / n);
    const a = R2((ph - p0) / se);
    return { q: `H₀: p = ${p0}. 표본 ${n}명 중 ${Math.round(ph * n)}명이 「예」라고 답했다. 검정통계량 Z₀는?`,
      a, w: distinct(a, [R2((ph - p0) / Math.sqrt(p0 * (1 - p0))), R2((ph - p0) / Math.sqrt(p0 / n))]),
      ex: `p̂ = ${ph}. 분모에는 귀무가설의 p₀를 쓴다: √(${p0} × ${R2(1 - p0)} / ${n}) = ${R3(se)}. Z₀ = (${ph} − ${p0}) / ${R3(se)} = ${a}`,
      f: 'Z₀ = (p̂ − p₀) / √(p₀(1−p₀)/n)' };
  } },
  { id: 'gen_expected', ch: 9, lessons: ['sign_g1', 'd_e2', 'f_indep', 'sign_cave1'], make() {
    const N = pickOf([100, 200, 400]), R = Math.round(N * pickOf([0.3, 0.4, 0.45, 0.6])), C = Math.round(N * pickOf([0.25, 0.35, 0.5, 0.55]));
    const a = R2(R * C / N);
    return { q: `분할표 전체 ${N}명. 어떤 칸의 행 합계가 ${R}, 열 합계가 ${C}일 때, 독립이라면 그 칸의 기대도수는?`,
      a, w: distinct(a, [R2((R + C) / 2), R2(R * C / (R + C))]),
      ex: `기대도수 = (행 합 × 열 합) ÷ 전체 = ${R} × ${C} ÷ ${N} = ${a}`,
      f: 'E = (행 합 × 열 합) / N' };
  } },
  { id: 'gen_gof', ch: 9, lessons: ['sign_alch', 'f_chi', 'd_e1', 'sign_plaza3'], make() {
    const E = pickOf([20, 30, 40]), d1 = pickOf([2, 4, 5, 6]), d2 = pickOf([1, 2, 3]), O = [E + d1, E - d1 + d2, E - d2];
    const chi = O.reduce((s, o) => s + (o - E) ** 2 / E, 0), a = R2(chi);
    return { q: `세 가지 색 물약이 같은 비율이라는 가설을 검정한다. 관측도수 ${O.join(', ')} (합 ${3 * E}). χ²₀ 값은?\n📎 주어진 값: 기대도수 = ${E} (각 색),  χ²(0.05, 2) = 5.991`,
      a, w: distinct(a, [R2(O.reduce((s, o) => s + Math.abs(o - E), 0) / E), R2(O.reduce((s, o) => s + (o - E) ** 2, 0))]),
      ex: `χ²₀ = Σ(O − E)²/E = ${O.map(o => `(${o}−${E})²/${E}`).join(' + ')} = ${a}. ${chi > 5.991 ? '5.991보다 크므로 기각' : '5.991보다 작으므로 기각 못 함'}`,
      f: 'χ²₀ = Σ (O − E)² / E,  자유도 = 범주 수 − 1' };
  } }
];
function makeGenQuiz(g) {
  const o = g.make();
  const q = { id: g.id, ch: g.ch, gen: true, q: o.q, a: String(o.a), w: o.w.map(String), ex: o.ex };
  if (typeof o.a === 'number') { q.num = o.a; q.tol = Math.max(0.011, Math.abs(o.a) * 0.01); }
  if (typeof QUIZ_HELP !== 'undefined') QUIZ_HELP[g.id] = { f: o.f, s: [o.ex] };
  return q;
}

// ---------- 읽은 표지판과 이어지는 문제 ----------
let _lessonCon = {};
function lessonConcepts(id) {
  if (_lessonCon[id]) return _lessonCon[id];
  const L = LESSONS[id]; if (!L) return [];
  return (_lessonCon[id] = (typeof conceptsFor === 'function' ? conceptsFor({ id: '_l_' + id, q: L.t + ' ' + L.x, a: '', ex: '', ch: L.ch }) : []).map(c => c.t));
}
function readConceptSet() { const s = new Set(); Object.keys(S.read || {}).forEach(id => lessonConcepts(id).forEach(t => s.add(t))); return s; }
const _quizCon = {};
function quizConcepts(q) { if (!_quizCon[q.id]) _quizCon[q.id] = (typeof conceptsFor === 'function' ? conceptsFor(q) : []).map(c => c.t); return _quizCon[q.id]; }

pickQuiz = function (ch) {
  const read = Object.keys(S.read || {});
  // 숫자 바꾼 계산 문제 (그 장의 표지판을 읽었을 때, 약 35%)
  const gens = QUIZ_GEN.filter(g => (!ch || g.ch === ch) && (!read.length || g.lessons.some(l => S.read[l])));
  if (gens.length && Math.random() < 0.35) return makeGenQuiz(pickOf(gens));
  let pool = QUIZ.filter(q => !ch || q.ch === ch);
  // 읽은 표지판의 개념과 겹치는 문제를 우선 (75%)
  if (read.length && Math.random() < 0.75) {
    const rs = readConceptSet();
    const rel = pool.filter(q => quizConcepts(q).some(t => rs.has(t)));
    if (rel.length) pool = rel;
  }
  const fresh = pool.filter(q => !S.solvedQ[q.id]);
  if (fresh.length) pool = fresh;
  return pool[Math.floor(Math.random() * pool.length)];
};

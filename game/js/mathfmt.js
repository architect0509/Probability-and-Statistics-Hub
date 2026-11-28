/* =========================================================================
 * 벨레스타 연대기 — 수식 보기 좋게 (mathfmt.js)
 *  · a/b, a ÷ b  →  가로 막대 위아래로 분자·분모를 쌓은 진짜 분수
 *  · √n, √(…)    →  덮개(─)가 씌워진 루트
 *  · 괄호        →  깊이마다 다른 색 (수식) / 옅은 「곁말」 색 (문장 속 괄호)
 *  · 기호 색     →  모수(그리스 문자)·통계량(햇/바)·기준값·검정통계량·개수를 색으로 구분
 *  · =, ±, × 같은 연산자는 살짝 띄우고 색을 넣는다
 *  타자기 효과 중에는 data-plain(원래 글자)로 보여 주고, 다 쳐지면 예쁜 모양으로 바뀐다.
 * ========================================================================= */
'use strict';

const MF = (() => {
  const HANGUL = /[가-힣ㄱ-ㆎ]/;
  // 수식 글자(이름·숫자·첨자·결합 기호)
  const IDCH = /[A-Za-z0-9.%_'Ͱ-Ͽ̀-ͯ₀-ₜ⁰-ⁿ²³¹̂̄̅ᵢ-ᵪ∞]/;
  const SUP = /[²³¹⁰-ⁿ]/;
  const OPS = new Set(['=', '±', '×', '·', '+', '−', '-', '<', '>', '≤', '≥', '≈', '≠', '→', '~', ',', ':', ';', '|', '∣', '「', '」', '“', '”', '"', '!', '?', '…', '≡', '⇒', '∴']);
  const SHOW_OPS = new Set(['=', '±', '×', '·', '≈', '≤', '≥', '≠', '<', '>', '→', '−']);
  const PROTECT = ['z(α/2)'];
  const PAIRS = { '(': ')', '[': ']' };

  // ---------- 토큰화 ----------
  function tokenize(s) {
    const cs = Array.from(s), out = [];
    for (let i = 0; i < cs.length; i++) {
      let hit = null;
      for (const p of PROTECT) { const pc = Array.from(p); if (pc.every((c, j) => cs[i + j] === c)) { hit = p; i += pc.length - 1; break; } }
      out.push(hit ? { k: 'raw', v: hit } : { k: 'c', v: cs[i] });
    }
    return out;
  }
  // 괄호 짝 맞춰 묶기 (짝 없는 괄호는 그냥 글자)
  function group(toks) {
    const root = [], stack = [{ kids: root }];
    toks.forEach(t => {
      if (t.k === 'c' && PAIRS[t.v]) { const g = { k: 'g', o: t.v, c: PAIRS[t.v], kids: [] }; stack[stack.length - 1].kids.push(g); stack.push(g); return; }
      if (t.k === 'c' && (t.v === ')' || t.v === ']') && stack.length > 1 && stack[stack.length - 1].c === t.v) { stack.pop().closed = true; return; }
      stack[stack.length - 1].kids.push(t);
    });
    // 안 닫힌 괄호 풀기
    const unwrap = list => { const r = []; list.forEach(n => { if (n.k === 'g') { n.kids = unwrap(n.kids); if (n.closed) r.push(n); else { r.push({ k: 'c', v: n.o }); r.push(...n.kids); } } else r.push(n); }); return r; };
    return unwrap(root);
  }
  const plain = n => n.k === 'c' || n.k === 'raw' ? n.v : n.k === 'g' ? n.o + n.kids.map(plain).join('') + n.c : n.k === 'frac' ? n.src : n.k === 'rad' ? n.src : '';
  const isSpace = n => n && n.k === 'c' && /\s/.test(n.v);
  const isOp = n => n && n.k === 'c' && (OPS.has(n.v) || n.v === '/' || n.v === '÷');
  const isAtomTok = n => n && !isSpace(n) && !isOp(n);
  const isHan = n => n && n.k === 'c' && HANGUL.test(n.v);
  const isIdLike = n => n && (n.k === 'raw' || n.k === 'g' || n.k === 'frac' || n.k === 'rad' || (n.k === 'c' && (IDCH.test(n.v) || n.v === '√' || n.v === 'Σ')));

  // 분자: 슬래시 왼쪽으로 붙어 있는 덩어리 / 분모: 오른쪽 덩어리
  function grabLeft(nodes, end) {
    let i = end; if (i < 0 || !isAtomTok(nodes[i])) return -1;
    const firstHan = isHan(nodes[i]);
    while (i >= 0 && isAtomTok(nodes[i])) {
      const n = nodes[i];
      if (n.k === 'c' && n.v === 'Σ') break;                 // Σ 는 분자에 안 넣는다
      if (!firstHan && isHan(n)) break;                      // 「행합/n으로」 같은 조사 끊기
      if (firstHan && !isHan(n) && !(n.k === 'g')) break;
      i--;
    }
    return i + 1;
  }
  function grabRight(nodes, start) {
    let i = start; if (i >= nodes.length || !isAtomTok(nodes[i])) return -1;
    const firstHan = isHan(nodes[i]);
    while (i < nodes.length && isAtomTok(nodes[i])) {
      const n = nodes[i];
      if (!firstHan && isHan(n)) break;
      if (firstHan && !isHan(n)) break;
      i++;
    }
    // 문장 끝 마침표 · 쉼표 떼기
    while (i - 1 > start && nodes[i - 1].k === 'c' && /[.]/.test(nodes[i - 1].v) && !(nodes[i] && nodes[i].k === 'c' && /\d/.test(nodes[i].v))) i--;
    return i;
  }
  const pureHan = seg => seg.length > 0 && seg.every(isHan);
  const hasGroup = seg => seg.some(n => n.k === 'g' || n.k === 'frac' || n.k === 'rad');
  const pureLatinWord = seg => /^[A-Za-z]+$/.test(seg.map(plain).join(''));
  const pureInt = seg => /^\d+$/.test(seg.map(plain).join(''));

  function shouldFold(L, R, spaced, ctx, nodes, a, b) {
    if (!L.length || !R.length) return false;
    const ls = L.map(plain).join(''), rs = R.map(plain).join('');
    if (ls === 'α' && rs === '2') return false;               // α/2 는 그대로 (꼬리 표시)
    if (pureHan(L) && pureHan(R)) return false;               // 부먹/찍먹
    if ((pureHan(L) || pureHan(R)) && !hasGroup(L) && !hasGroup(R) && (spaced || !(/[A-Za-z0-9Ͱ-Ͽ]/.test(ls + rs)))) return false;
    if (spaced && (pureHan(L) || pureHan(R)) && !hasGroup(L.concat(R))) return false;
    if (pureLatinWord(L) && pureLatinWord(R) && ((ls.length > 1 && rs.length > 1) || (/^[A-Z]$/.test(ls) && /^[A-Z]$/.test(rs)))) return false; // and/or, A/B
    if (/[:/]$/.test(ls) || /^\//.test(rs)) return false;
    if (!ctx.box && pureInt(L) && pureInt(R)) {
      // 문장 속 「3/15」 같은 개수 표시는 그대로. 계산식 근처일 때만 분수로
      const around = nodes.slice(Math.max(0, a - 4), a).concat(nodes.slice(b, b + 4)).map(plain).join('');
      if (!/[=≈×]/.test(around)) return false;
    }
    return true;
  }
  const unwrapOne = seg => (seg.length === 1 && seg[0].k === 'g') ? seg[0].kids : seg;

  // 같은 높이에서 분수 · 루트 접기
  function fold(nodes, ctx) {
    nodes.forEach(n => { if (n.k === 'g') n.kids = fold(n.kids, ctx); });
    // 루트: √ 다음 괄호 → 덮개 / √ 다음 이름·숫자 → 덮개
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.k === 'c' && n.v === '√' && nodes[i + 1]) {
        let j = i + 1, body;
        if (nodes[j].k === 'g' && nodes[j].o === '(') { body = nodes[j].kids; j++; }
        else { const s = j; while (j < nodes.length && nodes[j].k === 'c' && IDCH.test(nodes[j].v) && !SUP.test(nodes[j].v) && !isHan(nodes[j])) j++; if (j === s) continue; while (j - 1 > s && nodes[j - 1].v === '.') j--; body = nodes.slice(s, j); }
        const src = nodes.slice(i, j).map(plain).join('');
        nodes.splice(i, j - i, { k: 'rad', body, src });
      }
    }
    // 분수
    for (let guard = 0; guard < 40; guard++) {
      let done = true;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!(n.k === 'c' && (n.v === '/' || n.v === '÷'))) continue;
        const spL = isSpace(nodes[i - 1]), spR = isSpace(nodes[i + 1]);
        if (n.v === '/' && spL !== spR) continue;
        const le = spL ? i - 2 : i - 1, rs0 = spR ? i + 2 : i + 1;
        if (spL && isSpace(nodes[i - 2])) continue;
        const a = grabLeft(nodes, le), b = grabRight(nodes, rs0);
        if (a < 0 || b < 0 || b <= rs0 || a > le) continue;
        const L = nodes.slice(a, le + 1), R = nodes.slice(rs0, b);
        if (!shouldFold(L, R, spL || spR, ctx, nodes, a, b)) { n.skip = true; continue; }
        const src = nodes.slice(a, b).map(plain).join('');
        nodes.splice(a, b - a, { k: 'frac', n: unwrapOne(L), d: unwrapOne(R), src });
        done = false; break;
      }
      if (done) break;
    }
    return nodes;
  }

  const escH = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function render(nodes, depth, ctx) {
    let out = '';
    nodes.forEach((n, i) => {
      if (n.k === 'raw') { out += escH(n.v); return; }
      if (n.k === 'c') {
        if (ctx.math && SHOW_OPS.has(n.v) && (isSpace(nodes[i - 1]) || isSpace(nodes[i + 1]) || n.v === '±' || n.v === '=')) { out += `<span class="mf-op">${escH(n.v)}</span>`; return; }
        out += escH(n.v); return;
      }
      if (n.k === 'frac') { out += `<span class="mf-frac" data-plain="${escH(n.src)}"><span class="mf-n">${render(n.n, depth, ctx)}</span><span class="mf-d">${render(n.d, depth, ctx)}</span></span>`; return; }
      if (n.k === 'rad') { out += `<span class="mf-rad" data-plain="${escH(n.src)}"><span class="mf-rs">√</span><span class="mf-rb">${render(n.body, depth + 1, ctx)}</span></span>`; return; }
      if (n.k === 'g') {
        const txt = plain(n);
        const inner = n.kids.map(plain).join('');
        const mathy = /[=±×·÷\/√²−+<>≤≥|]|[μσχαβΣ]|[A-Za-z]/.test(inner);
        const prose = HANGUL.test(inner) && !mathy && (!ctx.box || /\s/.test(inner) || inner.length > 6);
        if (prose) { out += `<span class="paren-aside">${escH(n.o)}${render(n.kids, depth + 1, ctx)}${escH(n.c)}</span>`; return; }
        const d = depth % 4;
        out += `<span class="mf-pg mf-g${d}"><span class="mf-pb">${escH(n.o)}</span>${render(n.kids, depth + 1, ctx)}<span class="mf-pb">${escH(n.c)}</span></span>`;
      }
    });
    return out;
  }

  function formatString(s, ctx) {
    if (!/[\/÷√()\[\]=±×·]/.test(s)) return null;
    const nodes = fold(group(tokenize(s)), ctx);
    const hasStruct = nodes.some(function walk(n) { return n.k === 'frac' || n.k === 'rad' || n.k === 'g' || (n.kids && n.kids.some(walk)); });
    if (!hasStruct && !ctx.math) return null;
    return render(nodes, 0, ctx);
  }

  // 공식 상자 안의 「라벨:」 앞부분 강조 (예: 「σ 를 알 때:  x̄ ± …」)
  function labelize(html) {
    return html.replace(/^(\s*)([^<>:：]{1,18}?)([:：])(\s)/, (m, sp, lbl, col, s2) => HANGUL.test(lbl) && !/[=]/.test(lbl) ? `${sp}<span class="mf-lbl">${lbl}${col}</span>${s2}` : m);
  }

  const BOX_SEL = '.lesson, .fhint, .quiz, .sol, .decree-f, .big-f, .mc-f, .mc-sum span, .dy-formula, .gt-e, .gt-d';
  const SKIP_SEL = '.term, code, button, input, textarea, .mf-frac, .mf-rad, .mf-pg, .paren-aside, .symleg, .qch, script, style, svg';

  function mathify(root) {
    if (!root || root.nodeType !== 1) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [];
    while (walker.nextNode()) {
      const nd = walker.currentNode, pe = nd.parentElement;
      if (!pe || pe.closest(SKIP_SEL) || pe.closest('[data-mf]')) continue;
      list.push(nd);
    }
    list.forEach(node => {
      const pe = node.parentElement;
      const box = !!(pe.closest(BOX_SEL) || root.matches && root.matches(BOX_SEL));
      const ctx = { box, math: box };
      const html = formatString(node.nodeValue, ctx);
      if (html == null) return;
      const tpl = document.createElement('template');
      const first = !node.previousSibling || node.previousSibling.nodeName === 'BR';
      tpl.innerHTML = box && first ? labelize(html) : html;
      node.parentNode.replaceChild(tpl.content, node);
    });
  }
  return { mathify, formatString };
})();
function mathify(root) { try { MF.mathify(root); } catch (e) { console.warn('mathify', e); } }

// -------------------------------------------------------------------------
// 기호 색 분류 — 모수 / 통계량 / 기준·분포 / 검정통계량 / 가설 / 개수
// -------------------------------------------------------------------------
const SYM_KIND = {
  par: ['μ', 'μ₀', 'σ', 'σ²', 'σ₀²', 'σ₁²', 'σ₂²', 'p', 'p₀'],
  stat: ['x̄', 'x̄₁', 'x̄₂', 'p̂', 'p̂₁', 'p̂₂', 'p̄', 's', 's²', 'sₚ²', 's_d', 'd̄'],
  crit: ['z(α/2)', 'α', 'α/2', 'β', 'df', 'Z', 't', 'χ²'],
  test: ['Z₀', 't₀', 'χ²₀'],
  hyp: ['H₀', 'H₁'],
  cnt: ['n', 'n₁', 'n₂', 'k', 'r', 'c', 'X', 'O', 'E'],
  op: ['Σ', '√', '±']
};
const SYM_KIND_NAME = { par: '모수 (진짜 값 · 그리스 문자)', stat: '통계량 (표본에서 계산 · 모자/막대)', crit: '분포 · 기준값', test: '검정통계량 (내가 계산한 값)', hyp: '가설', cnt: '개수 · 도수', op: '계산 기호' };
const SYM_KIND_OF = {}; Object.keys(SYM_KIND).forEach(k => SYM_KIND[k].forEach(s => { SYM_KIND_OF[s] = k; }));

(function patchSymbolize() {
  if (typeof symbolize !== 'function') return;
  const base = symbolize;
  symbolize = function (root) {
    if (!root) return;
    mathify(root);
    base(root);
    root.querySelectorAll('.term.sym').forEach(sp => { const k = SYM_KIND_OF[sp.textContent]; if (k) sp.classList.add('k-' + k); });
    root.querySelectorAll('.symleg').forEach(leg => {
      if (leg.dataset.kc) return; leg.dataset.kc = '1';
      const kinds = new Set();
      leg.querySelectorAll('i').forEach(i => { const k = SYM_KIND_OF[i.textContent]; if (k) { i.classList.add('k-' + k); kinds.add(k); } });
      if (kinds.size) { const d = document.createElement('div'); d.className = 'kleg'; d.innerHTML = [...kinds].filter(k => k !== 'op').map(k => `<span class="k-${k}">● ${SYM_KIND_NAME[k]}</span>`).join(''); leg.appendChild(d); }
    });
  };
})();

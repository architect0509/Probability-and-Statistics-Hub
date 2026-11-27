// =========================================================================
// 🕯 괴담 서브퀘스트 「열세 번째 표본」 — 숲 남서쪽 끝의 버려진 저택
// =========================================================================
QUESTS.s_haunt = { t: '열세 번째 표본', type: '괴담', giver: '사이라', steps: [
  '숲 남서쪽 끝의 버려진 저택을 찾아간다',
  '저택에 흩어진 일기장 세 장을 읽는다',
  '장부를 든 그림자와 마주한다',
  '리나와 작별하고, 여관 2층의 베일에게 이야기를 전한다'] };
if (typeof ACHS !== 'undefined') ACHS.haunt = ['열세 번째 표본', '저택의 장부에서 이름을 되찾았다'];

const HAUNT_DIARY = ['haunt_d1', 'haunt_d2', 'haunt_d3'];
function hauntDiariesRead() { return HAUNT_DIARY.filter(id => S.read[id]).length; }

// ---- 저택 내부 ----
EXTRA_ROOMS.haunt = { name: '버려진 저택 · 그레이가(家)', theme: 'interior', music: 'haunt', dark: true, npcs: ['lina', '', 'edgar'], signs: ['haunt_d1', 'haunt_d2', 'haunt_d3'], chests: ['ch_haunt'],
  extra: { exitTo: 'forest' }, rows: [
  '###################',
  '###################',
  '#B_j__a___S____j_B#',
  '#B______rrr______B#',
  '#_t_h___rrr___C__S#',
  '#_______rrr_______#',
  '#__1____rrr___0___#',
  '#hth____rrr____o__#',
  '#_______rrr___j___#',
  '#S______rrr___2___#',
  '#___j___rrr_______#',
  '########D##########'] };

// ---- 숲: 남서쪽 끝에 저택 세우기 (buildExtraMaps 끝에서 호출) ----
function buildHauntExtras() {
  const F = MAPS.forest; if (!F) return;
  const b = { x: 1, y: 24, w: 7, h: 6, roof: 'I', dx: 3 };
  for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) {
    let c = j < b.h - 2 ? b.roof : (j === b.h - 2 ? ((i % 3 === 1 && i > 0 && i < b.w - 1) ? 'w' : 'W') : ((i % 3 === 1 && i !== b.dx) ? 'w' : 'W'));
    if (j === b.h - 1 && i === b.dx) c = 'D';
    F.g[b.y + j][b.x + i] = c;
  }
  const door = [b.x + b.dx, b.y + b.h - 1];
  // 문 앞에서 숲길까지 오솔길 (나무는 베어 낸다)
  const key = (x, y) => x + ',' + y, prev = new Map([[key(door[0], door[1] + 1), null]]), q = [[door[0], door[1] + 1]];
  let found = null;
  while (q.length) {
    const [x, y] = q.shift();
    if (F.g[y][x] === 's' && !(x === door[0] && y === door[1] + 1)) { found = [x, y]; break; }
    for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 1 || ny < 4 || nx > F.w - 2 || ny > F.h - 2 || prev.has(key(nx, ny))) continue;
      if ('.,bTs'.includes(F.g[ny][nx])) { prev.set(key(nx, ny), [x, y]); q.push([nx, ny]); }
    }
  }
  F.g[door[1] + 1][door[0]] = 's';
  let cur = found ? prev.get(key(found[0], found[1])) : null;
  while (cur) { if (F.g[cur[1]][cur[0]] !== 's') F.g[cur[1]][cur[0]] = 's'; cur = prev.get(key(cur[0], cur[1])); }
  F.doors = Object.assign(F.doors || {}, { [key(door[0], door[1])]: 'haunt' });
  F.arrive = Object.assign(F.arrive || {}, { haunt: [door[0], door[1] + 1, 0] });
  F.labels = (F.labels || []).concat([{ x: door[0], y: b.y - 1, text: '🕯 버려진 저택' }]);
}

// ---- 일기장 (장소에 고정된 표지판) ----
Object.assign(LESSONS, {
  haunt_d1: { t: '찢어진 일기 · 11월 3일', ch: 0, x: '오늘도 열두 명. 평균 맥박 72, 표준편차 8. 아름답다.\n\n리나가 묻는다. 「아빠, 왜 꼭 열두 명이야?」\n열둘이면 충분하다. 표본은 거짓말을 하지 않는다.\n\n…창밖에 누가 줄을 서 있다. 밤 열두 시인데.' },
  haunt_d2: { t: '찢어진 일기 · 11월 19일', ch: 0, x: '표본평균이 자꾸 어긋난다. 신뢰구간 밖이다. 이럴 리 없다.\n누군가 내 장부에 몰래 숫자를 적는다.\n맥박 0. 맥박 0. 맥박 0.\n\n리나는 요즘 거울 앞에서 혼자 숫자를 센다.\n열하나, 열둘, 열…\n나는 그다음을 듣지 않으려고 귀를 막았다.' }
});
LESSONS.haunt_d3 = { t: '마지막 일기 · 12월 24일', ch: 0, get x() {
  const nm = (typeof S !== 'undefined' && S && S.name) || '모험가';
  return `알았다. 이상치를 빼면 된다. 맞지 않는 값은 지우면 된다.\n오늘 밤, 열세 번째 값을 지웠다.\n\n리나가 보이지 않는다.\n\n장부의 열세 번째 줄은 아무리 지워도 다시 적혀 있다. 잉크가 아직 젖어 있다.\n이름 칸에는 이렇게 쓰여 있다.\n\n「${nm}」`;
} };
CHESTS.ch_haunt = { item: 'potion', note: '먼지 쌓인 오르골. 태엽을 감자 음이 열세 개 흘러나오고 멈춘다. 그 아래 숨겨진 물약 한 병.' };

// ---- 등장인물 ----
Object.assign(NPCS, {
  lina: { n: '리나', title: '창가의 소녀', map: 'haunt', pic: 'veil', mood: 'sad', aff: 0,
    when: () => qStep('s_haunt') >= 1 && !flag('lina_bye'),
    intro: '창가에 은발의 소녀가 서 있다. 발이 바닥에 닿아 있지 않다. 「…쉿. 아빠가 세고 있어.」',
    again: ['「아빠는 매일 밤 열두 명을 세. 그런데 자꾸 열셋이 돼.」', '소녀가 창에 입김을 분다. 유리에 「13」이 떠올랐다 사라진다.'],
    topic: '표본에서 마음에 안 드는 값을 지우면… 남는 건 거짓말이야.',
    acts: [
      { t: '무슨 일이 있었는지 묻는다', req: () => !flag('haunt_edgar'), ok: () => `「일기장을 찾아. 세 장. 아빠가 어디서 틀렸는지 거기 다 있어.」\n\n📖 찾은 일기: <b>${hauntDiariesRead()}/3</b>`, okFx: {} },
      { t: '리나에게 작별 인사를 한다', req: () => flag('haunt_clear') && !flag('lina_bye'),
        ok: '리나가 처음으로 웃는다. 「고마워. 이제 나도 셀 수 있어. 하나… 둘… 셋…」\n\n숫자를 세는 목소리가 점점 멀어진다. 열둘에서 잠깐 멈췄다가, 아주 작게 「…열셋」.\n창가에 촛불 하나만 남는다. 그 촛불도 이내 꺼진다.',
        okFx: { flag: 'lina_bye', quest: ['s_haunt', 3] } },
      LEAVE] },
  edgar: { n: '에드거 그레이', title: '장부를 든 그림자', map: 'haunt', pic: 'nobody', look: { kind: 'ghost' }, keepLook: true, mood: 'angry', aff: 0,
    when: () => flag('haunt_edgar') && !flag('haunt_clear'),
    intro: '책상 앞에 반투명한 남자가 앉아 장부에 무언가를 적고 있다. 사각. 사각. 사각. 「…열둘. 열둘이면 충분해.」',
    again: ['「넌 몇 번째지? 아니… 이미 적혀 있군.」', '그림자가 펜을 멈추지 않는다. 장부의 잉크가 바닥으로 뚝뚝 떨어진다.'],
    topic: '이상치는 지우면 된다. 지우면… 평균이 예뻐지거든.',
    acts: [
      { t: '장부의 숫자를 바로잡는다 (3문제 중 2개)', tag: '📝 실패 시 HP−3', go: () => bossTrial('edgar', 7, 3, 2,
        { gold: 60, item: 'potion', focus: 1, flag: 'haunt_clear' },
        '그림자의 펜이 멈춘다. 「…열셋. 열셋이 맞았어.」\n「리나는 이상치가 아니었어. 그냥… 표본이었어. 내가 세기 싫었던 값이었을 뿐.」\n\n장부가 스르르 덮인다. 열세 번째 줄에서 당신의 이름이 천천히 지워진다. 그림자도 함께 흐려진다.',
        { hp: -3, status: { 혼란: 2 } }, '「틀렸어. 틀렸어. 틀렸어.」 장부가 펄럭이며 당신의 손등을 긋는다. 이름 칸의 잉크가 더 짙어졌다.', false,
        ok => { if (ok) { removeActor('edgar'); setFlag('haunt_clear'); AudioSys.sfx('level'); } }) },
      { t: '뒷걸음질 친다', leave: true }] }
});
// 점술가 사이라가 괴담을 들려준다
NPCS.saira.acts.splice(NPCS.saira.acts.length - 1, 0,
  { t: '숲속 폐가 이야기를 청한다', req: () => !QUESTS.s_haunt || !S.quests.s_haunt,
    ok: '사이라가 천막 입구를 닫는다. 주사위 굴리는 소리가 멈춘다.\n\n「…숲 남서쪽 끝에 집이 하나 있어. 30년 전, 통계학자 에드거 그레이가 딸 리나와 살던 집.」\n「에드거는 매일 밤 마을 사람을 열두 명씩 조사했대. 키, 몸무게, 맥박. 표본은 거짓말을 하지 않는다면서.」\n「그러던 어느 겨울밤, 리나가 사라졌어. 그날 장부엔 열세 번째 줄이 적혀 있었대. 이름 없이.」\n\n사이라가 주사위를 하나 굴린다. 13이 나온다. 육면체 주사위인데.\n\n「요즘도 밤마다 그 집 창문에 촛불이 켜진대. …가 보려면, 이름을 소리 내서 말하지 마.」',
    okFx: { quest: ['s_haunt', 0] } });
// 베일 — 마지막 이야기
NPCS.veil.acts.splice(0, 0,
  { t: '숲속 저택 이야기를 꺼낸다', req: () => qStep('s_haunt') === 3 && !qDone('s_haunt'),
    ok: '「…리나가 웃었다고?」\n\n베일이 오래 창밖을 본다. 숲 쪽. 촛불이 꺼진 쪽.\n「그 아이는 사라진 게 아니야. 길을 잃었을 뿐. 숲에서, 미궁으로. 아주 오래.」\n\n베일이 처음으로 후드를 벗는다. 은발. 그리고 일기장 속 소녀와 똑같은 눈.\n「……이름을 되찾아 줘서 고마워.」\n\n방 안 촛불이 한 번 깜빡인다. 열세 번째로.',
    okFx: { questDone: 's_haunt', gold: 50, aff: 3, ach: 'haunt' } });

// ---- 컷씬 ----
CUTS.push(
  { id: 'haunt_in', map: 'haunt', enter: true, music: 'haunt', lines: [
    [null, '끼이이이익……\n문이 저절로 닫힌다.', 'shake'],
    [null, '먼지 냄새. 그리고 아주 희미한 촛농 냄새. 누군가 방금 전까지 여기 있었다.'],
    [null, '벽에 걸린 초상화 열두 점. 전부 얼굴 부분만 칼로 도려내져 있다.'],
    [null, '……열셋.', 'flash'],
    [null, '방금, 누가 숫자를 셌다.']],
    onEnd: () => { if (qStep('s_haunt') < 1 || !S.quests.s_haunt) { S.quests.s_haunt || setQ('s_haunt', 0); setQ('s_haunt', 1); } spawnActors(); toast('📜 괴담 · 열세 번째 표본'); } },
  { id: 'haunt_edgar', map: 'haunt', area: [0, 0, 99, 99], music: 'haunt', cond: () => hauntDiariesRead() >= 3,
    get lines() {
      const nm = (S && S.name) || '모험가';
      return [
        [null, '훅—\n촛불이 한꺼번에 꺼진다.', 'flash'],
        [null, '어둠 속에서 펜이 종이를 긁는 소리. 사각. 사각. 사각.'],
        ['edgar', '「……열둘. 표본은 열둘이면 충분해.」'],
        ['edgar', '「그런데 왜… 왜 자꾸 열셋이 되지?」', 'shake'],
        [null, `책상 위 장부가 저절로 펼쳐진다. 열세 번째 줄, 아직 젖은 잉크. 「${nm}」.`],
        ['lina', '「……아빠는 틀렸어. 지운다고 없어지는 게 아니야.」'],
        ['lina', '「도와줘. 아빠가 숫자를 끝까지 셀 수 있게.」']];
    },
    onEnd: () => { setFlag('haunt_edgar'); setQ('s_haunt', 2); spawnActors(); } }
);

// ---- 저택 안을 걸을 때 들리는 것들 ----
let _hauntSteps = 0, _hauntNext = 9;
const HAUNT_WHISPERS = ['……열하나', '사각. 사각.', '(뒤에서 누가 숨을 쉰다)', '……열둘', '(초상화가 이쪽을 본다)', '똑. 똑. 똑.', '(인형의 고개가 돌아가 있다)', '……세지 마', '끼익—'];
function hauntStep() {
  if (!MAP || MAP.id !== 'haunt' || cutOpen || dlgOpen || flag('haunt_clear')) return;
  if (++_hauntSteps < _hauntNext) return;
  _hauntSteps = 0; _hauntNext = 7 + (Math.random() * 9 | 0);
  const w = HAUNT_WHISPERS[Math.random() * HAUNT_WHISPERS.length | 0];
  try { const [px, py] = playerScreenPct(); onoma(w, { x: px + (Math.random() < .5 ? -14 : 14), y: py - 10, size: 22, color: '#c9d4ff', rot: (Math.random() - .5) * 10 }); } catch (e) {}
  if (Math.random() < .35) shake(2);
}

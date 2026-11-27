/* =========================================================================
 * 벨레스타 연대기 — 사운드 (WebAudio로 직접 합성하는 칩튠 배경음 + 효과음)
 * ========================================================================= */
'use strict';

const AudioSys = (() => {
  let ctx = null, master, musicBus, sfxBus, delay, delayFb, cur = null, timer = null, step = 0, nextT = 0;
  const vol = { music: 0.5, sfx: 0.7, on: true };
  try { Object.assign(vol, JSON.parse(localStorage.getItem('belesta_audio') || '{}')); } catch (e) {}

  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const freq = n => { const m = /^([A-G]#?)(\d)$/.exec(n); if (!m) return 0; return 440 * Math.pow(2, (NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12); };
  const seq = s => s.replace(/\|/g, ' ').trim().split(/\s+/);

  // 곡: 8분음표 한 칸 = 1 step. '.' 쉼표, '-' 앞 음 유지
  const SONGS = {
    title: { bpm: 92, wave: 'triangle', lead: seq('A4 C5 E5 A5 G5 E5 C5 E5 | F4 A4 C5 F5 E5 C5 A4 C5 | G4 B4 D5 G5 F5 D5 B4 D5 | E4 G#4 B4 E5 D5 B4 G#4 B4'), bass: seq('A2 - - - . . . . | F2 - - - . . . . | G2 - - - . . . . | E2 - - - . . . .'), perc: '' },
    town: { bpm: 118, wave: 'square', lead: seq('D5 . A4 . D5 E5 F5 . E5 D5 C5 . A4 . . . | C5 . G4 . C5 D5 E5 . D5 C5 A4 . G4 . . . | D5 . F5 . A5 . G5 F5 E5 . C5 . D5 E5 F5 . | E5 D5 C5 A4 G4 . A4 . D5 . . . . . . .'),
      bass: seq('D3 . A2 . D3 . A2 . | C3 . G2 . C3 . G2 . | D3 . A2 . F3 . C3 . | C3 . G2 . D3 . . .'), perc: 'k.h.s.h.k.h.s.hh' },
    calm: { bpm: 84, wave: 'triangle', lead: seq('E5 . . G5 . . A5 . | G5 . . E5 . . D5 . | C5 . . D5 . . E5 . | D5 . . . . . . . | E5 . . G5 . . B5 . | A5 . . G5 . . E5 . | D5 . . C5 . . D5 . | C5 . . . . . . .'),
      bass: seq('C3 - - - G2 - - - | A2 - - - E2 - - - | F2 - - - G2 - - - | C3 - - - G2 - - -'), perc: '' },
    inn: { bpm: 132, wave: 'square', lead: seq('G4 . B4 D5 . B4 | C5 . E5 G5 . E5 | D5 . C5 B4 . A4 | G4 . . . . . | E5 . D5 C5 . B4 | A4 . C5 E5 . C5 | D5 . B4 G4 . A4 | G4 . . . . .'),
      bass: seq('G2 . D3 . D3 . | C3 . G3 . G3 . | D3 . A3 . A3 . | G2 . D3 . D3 .'), perc: 'k.hs.h' },
    forest: { bpm: 100, wave: 'triangle', lead: seq('A5 . E5 . C5 . E5 . | G5 . D5 . B4 . D5 . | F5 . C5 . A4 . C5 . | E5 . . . . . . . | A5 . B5 . C6 . B5 . | A5 . G5 . E5 . D5 . | C5 . D5 . E5 . G5 . | A5 . . . . . . .'),
      bass: seq('A2 - - - E3 - - - | G2 - - - D3 - - - | F2 - - - C3 - - - | E2 - - - B2 - - -'), perc: '..h...h.' },
    cave: { bpm: 70, wave: 'sine', lead: seq('A4 . . . . . E5 . | . . . . D5 . . . | C5 . . . . . B4 . | . . . . . . . . | A4 . . . . . F5 . | . . . . E5 . . . | D5 . . . C5 . . . | B4 . . . . . . .'),
      bass: seq('A1 - - - - - - - | F1 - - - - - - - | D2 - - - - - - - | E1 - - - - - - -'), perc: '', echo: true },
    dungeon: { bpm: 108, wave: 'square', lead: seq('E5 . G5 . F#5 . E5 . | D#5 . . . B4 . . . | E5 . G5 . A5 . B5 . | C6 . B5 . A5 . G5 . | F#5 . E5 . D#5 . E5 . | F#5 . . . B4 . . .'),
      bass: seq('E2 E2 . E2 E2 . E2 . | B1 B1 . B1 B1 . B1 . | C2 C2 . C2 C2 . C2 . | A1 A1 . A1 B1 . B1 .'), perc: 'k..hk.s.', echo: true },
    boss: { bpm: 150, wave: 'sawtooth', lead: seq('E5 E5 G5 E5 A5 E5 B5 A5 | G5 E5 D5 E5 . . B4 . | C5 C5 E5 C5 F5 C5 G5 F5 | E5 C5 B4 C5 . . A4 . | E5 . F5 . G5 . A5 . | B5 . C6 . D6 . E6 . | D6 C6 B5 A5 G5 F5 E5 D5 | E5 . . . . . . .'),
      bass: seq('E2 E3 E2 E3 E2 E3 E2 E3 | C2 C3 C2 C3 C2 C3 C2 C3 | A1 A2 A1 A2 A1 A2 A1 A2 | B1 B2 B1 B2 B1 B2 B1 B2'), perc: 'kshskshs' },
    ending: { bpm: 80, wave: 'triangle', lead: seq('C5 . E5 . G5 . C6 . | B5 . G5 . E5 . D5 . | A4 . C5 . E5 . A5 . | G5 . . . . . . . | F5 . A5 . C6 . F6 . | E6 . C6 . G5 . E5 . | D5 . F5 . A5 . B5 . | C6 . . . . . . .'),
      bass: seq('C3 - - - G2 - - - | A2 - - - E2 - - - | F2 - - - C3 - - - | G2 - - - C3 - - -'), perc: '' },

    // ---- 컷씬 전용 ----
    cinema: { bpm: 72, wave: 'triangle', lead: seq('E5 - - - G5 - - - | A5 - - - B5 - A5 - | G5 - - - E5 - - - | D5 - - - - - - - | C5 - - - E5 - - - | G5 - - - A5 - G5 - | F#5 - - - D5 - - - | E5 - - - - - - - | B4 - - - E5 - - - | G5 - - - F#5 - E5 - | D5 - - - C5 - B4 - | A4 - - - - - - - | C5 - - - E5 - - - | A5 - - - G5 - F#5 - | G5 - - - F#5 - D#5 - | E5 - - - - - - -'),
      bass: seq('E2 - - - B2 - - - | C2 - - - G2 - - - | A1 - - - E2 - - - | B1 - - - F#2 - - - | E2 - - - B2 - - - | C2 - - - G2 - - - | D2 - - - A2 - - - | E2 - - - B2 - - - | G2 - - - D3 - - - | E2 - - - B2 - - - | F2 - - - C3 - - - | A1 - - - E2 - - - | C2 - - - G2 - - - | F2 - - - C3 - - - | B1 - - - F#2 - - - | E2 - - - - - - -'), perc: '', echo: true },
    epic: { bpm: 92, wave: 'square', lead: seq('C5 . . C5 G5 - - - | F5 . E5 . D5 . C5 . | A5 - - - G5 . E5 . | G5 - - - - - - - | C5 . . C5 A5 - - - | G5 . F5 . E5 . D5 . | E5 - F5 - G5 - B5 - | C6 - - - - - - -'),
      bass: seq('C3 . C3 . C3 . C3 . | F2 . F2 . F2 . F2 . | A2 . A2 . E2 . E2 . | G2 . G2 . G2 . G2 . | C3 . C3 . A2 . A2 . | F2 . F2 . G2 . G2 . | C3 . C3 . G2 . G2 . | C3 - - - - - - -'), perc: 'k...s...k.k.s...', echo: true },
    // ---- 편향단 테마: 빠르고 까부는 악당 행진곡 ----
    bias: { bpm: 172, wave: 'sawtooth', lead: seq('E5 . E5 G5 . E5 D5 . | C5 . C5 D5 E5 . B4 . | E5 . E5 G5 . A5 B5 . | A5 G5 E5 D5 E5 . . . | A5 . A5 C6 . A5 G5 . | F5 . F5 G5 A5 . E5 . | D#5 E5 F#5 G5 A5 B5 C6 D#6 | E6 . B5 . E5 . . .'),
      bass: seq('E2 E3 . E2 G2 . A2 A#2 | C2 C3 . C2 D2 . B1 . | E2 E3 . E2 G2 . A2 B2 | A1 A2 . A1 B1 . B1 . | A1 A2 . A1 C2 . A1 . | F1 F2 . F1 F2 . E2 . | B1 B2 . B1 B2 . B1 B2 | E2 . E2 . E2 . . .'), perc: 'k.hsk.hskkhs.khs' },
    // ---- 장소별 곡 ----
    town_night: { bpm: 76, wave: 'triangle', lead: seq('A4 . . C5 . . E5 . | D5 . . C5 . . A4 . | G4 . . A4 . . C5 . | B4 . . . . . . . | A4 . . C5 . . E5 . | G5 . . E5 . . D5 . | C5 . . B4 . . G4 . | A4 . . . . . . .'),
      bass: seq('A2 - - - E2 - - - | F2 - - - C3 - - - | G2 - - - E2 - - - | A2 - - - E2 - - -'), perc: '.......h........', echo: true },
    forest_night: { bpm: 68, wave: 'sine', lead: seq('E5 . . . B4 . . . | D5 . . . A4 . . . | C5 . . . G4 . . . | B4 . . . . . . . | E5 . G5 . F#5 . E5 . | D5 . . . B4 . . . | C5 . B4 . A4 . G4 . | F#4 . . . . . . .'),
      bass: seq('E2 - - - - - - - | D2 - - - - - - - | C2 - - - - - - - | B1 - - - - - - -'), perc: '', echo: true },
    tower: { bpm: 90, wave: 'triangle', lead: seq('D5 . F5 . A5 . G5 . | F5 . E5 . D5 . C5 . | B4 . D5 . F5 . E5 . | D5 . . . . . . . | D5 . F5 . A5 . C6 . | B5 . A5 . G5 . F5 . | E5 . G5 . F5 . E5 . | D5 . . . . . . .'),
      bass: seq('D3 - A2 - D3 - A2 - | G2 - D3 - G2 - D3 - | B2 - F3 - B2 - F3 - | A2 - E3 - A2 - - -'), perc: '', echo: true },
    observatory: { bpm: 104, wave: 'sine', lead: seq('C6 G5 E5 G5 C6 G5 E5 G5 | B5 G5 D5 G5 B5 G5 D5 G5 | A5 E5 C5 E5 A5 E5 C5 E5 | G5 D5 B4 D5 G5 . . . | F5 C5 A4 C5 F5 C5 A4 C5 | E5 C5 G4 C5 E5 C5 G4 C5 | D5 A4 F4 A4 D5 A4 F4 A4 | G4 B4 D5 G5 . . . .'),
      bass: seq('C3 - - - G2 - - - | A2 - - - E2 - - - | F2 - - - C3 - - - | D3 - - - G2 - - -'), perc: '', echo: true },
    court: { bpm: 96, wave: 'square', lead: seq('A4 . . A4 C5 . E5 . | D5 . . C5 B4 . . . | G#4 . . B4 E5 . D5 . | C5 . B4 . A4 . . . | A4 . . C5 E5 . A5 . | G5 . F5 . E5 . . . | D5 . C5 . B4 . G#4 . | A4 . . . . . . .'),
      bass: seq('A2 . A2 . A2 . A2 . | F2 . F2 . F2 . F2 . | E2 . E2 . E2 . E2 . | A2 . A2 . E2 . E2 .'), perc: 'k...s...k.k.s...' },
    prison: { bpm: 62, wave: 'sine', lead: seq('E4 . . . . . F4 . | . . . . E4 . . . | . . . . . . . . | B3 . . . . . . . | E4 . . . . . G4 . | . . . . F4 . . . | E4 . . . D#4 . . . | E4 . . . . . . .'),
      bass: seq('E1 - - - - - - - | E1 - - - - - - - | C2 - - - - - - - | B1 - - - - - - -'), perc: '......h.........', echo: true },
    shop: { bpm: 126, wave: 'square', lead: seq('C5 E5 G5 . E5 . C5 . | D5 F5 A5 . F5 . D5 . | E5 G5 C6 . B5 . A5 . | G5 . . . E5 . . . | F5 . A5 . G5 . E5 . | D5 . F5 . E5 . C5 . | D5 . G4 . B4 . D5 . | C5 . . . . . . .'),
      bass: seq('C3 . G2 . C3 . G2 . | D3 . A2 . D3 . A2 . | C3 . G2 . A2 . E2 . | F2 . G2 . C3 . . .'), perc: 'k.h.s.h.' },
    innroom: { bpm: 72, wave: 'triangle', lead: seq('G5 . E5 . C5 . E5 . | F5 . D5 . B4 . D5 . | E5 . C5 . A4 . C5 . | D5 . . . . . . . | G5 . E5 . C5 . E5 . | A5 . F5 . D5 . F5 . | E5 . D5 . C5 . B4 . | C5 . . . . . . .'),
      bass: seq('C3 - - - G2 - - - | G2 - - - D3 - - - | A2 - - - E2 - - - | F2 - - - C3 - - -'), perc: '' },
    smithy: { bpm: 112, wave: 'square', lead: seq('E4 . G4 . A4 . . A4 | B4 . A4 . G4 . E4 . | D4 . E4 . G4 . . G4 | A4 . G4 . E4 . . . | E4 . G4 . A4 . C5 . | B4 . A4 . G4 . A4 . | B4 . . . D5 . . . | E5 . . . . . . .'),
      bass: seq('E2 . E2 E2 . E2 . E2 | D2 . D2 D2 . D2 . D2 | C2 . C2 C2 . C2 . C2 | B1 . B1 B1 . B1 . B1'), perc: 'k.s.k.sk' },
    alchemy: { bpm: 138, wave: 'square', lead: seq('C5 . C#5 D5 . F5 . E5 | . D#5 . D5 C5 . . . | G4 . G#4 A4 . C5 . B4 | . A#4 . A4 G4 . . . | C5 . E5 . G5 . A#5 . | A5 . F5 . D5 . F#5 . | G5 F5 E5 D5 C5 B4 A4 G4 | C5 . G4 . C5 . . .'),
      bass: seq('C3 . C3 . A#2 . A#2 . | A2 . A2 . G#2 . G#2 . | G2 . G2 . F2 . F2 . | G2 . G2 . C3 . . .'), perc: 'k.hhs.h.' },
    lab: { bpm: 96, wave: 'sine', lead: seq('C5 . . E5 . G5 . . | F#5 . . . . . . . | A4 . . C5 . E5 . . | D#5 . . . . . . . | C5 . E5 . G5 . B5 . | A#5 . . . G5 . . . | F#5 . E5 . D#5 . . . | C5 . . . . . . .'),
      bass: seq('C2 - - - F#2 - - - | A1 - - - D#2 - - - | C2 - - - A#1 - - - | F#1 - - - C2 - - -'), perc: '..h...h.h.......', echo: true },
    temple: { bpm: 66, wave: 'triangle', lead: seq('C5 - - - E5 - - - | G5 - - - F5 - E5 - | D5 - - - F5 - - - | E5 - - - - - - - | A5 - - - G5 - - - | F5 - - - E5 - D5 - | C5 - - - D5 - B4 - | C5 - - - - - - -'),
      bass: seq('C3 - - - - - - - | G2 - - - - - - - | F2 - - - - - - - | C3 - - - G2 - - -'), perc: '', echo: true },
    library: { bpm: 88, wave: 'sine', lead: seq('E6 . C6 . G5 . C6 . | D6 . B5 . G5 . B5 . | C6 . A5 . E5 . A5 . | B5 . . . G5 . . . | E6 . C6 . G5 . E6 . | F6 . D6 . A5 . F6 . | E6 . D6 . C6 . B5 . | C6 . . . . . . .'),
      bass: seq('C3 - - - E3 - - - | G2 - - - D3 - - - | A2 - - - E3 - - - | G2 - - - C3 - - -'), perc: '' },
    archive: { bpm: 74, wave: 'sine', lead: seq('A4 . . . C5 . . . | B4 . . . G4 . . . | F4 . . . A4 . . . | E4 . . . . . . . | A4 . . . E5 . . . | D5 . . . C5 . . . | B4 . . . G#4 . . . | A4 . . . . . . .'),
      bass: seq('A1 - - - - - - - | G1 - - - - - - - | F1 - - - - - - - | E1 - - - - - - -'), perc: '', echo: true },
    house: { bpm: 100, wave: 'triangle', lead: seq('E5 . . B4 . C5 | D5 . . C5 . B4 | A4 . . A4 . C5 | E5 . . . . . | D5 . . C5 . B4 | A4 . . G#4 . A4 | B4 . . E4 . G#4 | B4 . . . . .'),
      bass: seq('A2 . . E3 . E3 | A2 . . E3 . E3 | F2 . . C3 . C3 | E2 . . B2 . B2'), perc: 'k....h' },
  };
  const ALIAS = {};
  // 밤 버전이 따로 없으면: 느리고 부드럽게, 타악기 빼고, 메아리 넣어서 자동 편곡
  function nightOf(name) { const k = name + '_night'; if (SONGS[k]) return k; const b = SONGS[name]; if (!b) return name; SONGS[k] = Object.assign({}, b, { bpm: Math.round(b.bpm * .8), wave: b.wave === 'sine' ? 'sine' : 'triangle', perc: b.perc ? b.perc.replace(/[ks]/g, '.') : '', echo: true }); return k; }

  // ---------------- 오디오 그래프 (홀 잔향 + 컴프레서) ----------------
  let dry = null, verbIn = null;
  const MUSIC_GAIN = 0.8; // 피아노/현악은 칩튠보다 조용해서 음악 버스를 키움
  function impulse(c, sec, decay) {
    const len = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) { const x = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - x, decay) * (i < c.sampleRate * .012 ? i / (c.sampleRate * .012) : 1); } }
    return b;
  }
  function makeGraph(c) {
    ctx = c;
    master = c.createGain(); master.gain.value = vol.on ? 1 : 0; master.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3.5; comp.attack.value = 0.006; comp.release.value = 0.25;
    musicBus = c.createGain(); musicBus.gain.value = vol.music * MUSIC_GAIN; musicBus.connect(comp); comp.connect(master);
    sfxBus = c.createGain(); sfxBus.gain.value = vol.sfx * 0.35; sfxBus.connect(master);
    dry = c.createGain(); dry.gain.value = 1; dry.connect(musicBus);
    const verb = c.createConvolver(); verb.buffer = impulse(c, 3.4, 2.8);
    verbIn = c.createGain(); verbIn.gain.value = 1;
    const vHp = c.createBiquadFilter(); vHp.type = 'highpass'; vHp.frequency.value = 220; verbIn.connect(vHp); vHp.connect(verb); // 저음은 잔향에서 빼서 먹먹하지 않게
    const vOut = c.createGain(); vOut.gain.value = 0.6; verb.connect(vOut); vOut.connect(musicBus);
    delay = c.createDelay(1); delay.delayTime.value = 0.36; delayFb = c.createGain(); delayFb.gain.value = 0.3;
    delay.connect(delayFb); delayFb.connect(delay); const dOut = c.createGain(); dOut.gain.value = 0.35; delay.connect(dOut); dOut.connect(verbIn);
  }
  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    makeGraph(new AC());
  }
  function resume() { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); }

  // ---------------- 악기 ----------------
  // 피아노: 배음 6개 + 해머 소리 + 음높이에 따라 다른 울림 길이
  const PH = [1, 2, 3, 4, 5, 6], PA = [1, .45, .24, .14, .08, .045];
  function piano(f, t, dur, vel, wet, echo) {
    if (!ctx || !f) return;
    const out = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 0.4;
    lp.frequency.setValueAtTime(Math.min(11000, f * 9 + 1800), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(500, f * 2.6), t + 1.4);
    const ring = Math.max(0.7, 3.6 - Math.log2(f / 110) * 0.62);      // 낮은 음일수록 길게
    const end = Math.min(ring, Math.max(dur + 0.45, 0.6));             // 건반을 떼면 0.45초 안에 사라짐
    out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(vel, t + 0.004);
    out.gain.exponentialRampToValueAtTime(vel * 0.42, t + 0.28);
    out.gain.setTargetAtTime(vel * 0.0001, t + Math.max(0.3, end - 0.4), 0.12);
    PH.forEach((h, i) => {
      const fh = f * h * (1 + 0.00035 * h * h); if (fh > 15000) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = fh; o.detune.value = i % 2 ? 2.5 : -2.5;
      g.gain.setValueAtTime(PA[i], t); g.gain.exponentialRampToValueAtTime(PA[i] * 0.04 + 1e-4, t + Math.max(0.18, ring / (1 + i * 0.9)));
      o.connect(g); g.connect(lp); o.start(t); o.stop(t + end + 0.1);
    });
    // 해머 타격음
    if (noiseBuf) { const s = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain(); s.buffer = noiseBuf; nf.type = 'bandpass'; nf.frequency.value = Math.min(6000, f * 4); nf.Q.value = 0.8; ng.gain.setValueAtTime(vel * 0.25, t); ng.gain.exponentialRampToValueAtTime(1e-4, t + 0.03); s.connect(nf); nf.connect(ng); ng.connect(lp); s.start(t); s.stop(t + 0.05); }
    lp.connect(out); out.connect(dry);
    const sd = ctx.createGain(); sd.gain.value = wet; out.connect(sd); sd.connect(verbIn);
    if (echo) { const e = ctx.createGain(); e.gain.value = 0.5; out.connect(e); e.connect(delay); }
  }
  // 현악 패드: 근음 · 5도 · 옥타브, 톱니파 두 겹을 살짝 어긋나게 + 천천히 차오름
  function strings(root, t, dur, vel, bright) {
    if (!ctx || !root) return;
    const lp = ctx.createBiquadFilter(), out = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = bright || 1100; lp.Q.value = 0.6;
    const att = Math.min(0.9, dur * 0.35), rel = 0.9;
    out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(vel, t + att); out.gain.setValueAtTime(vel, t + Math.max(att, dur - 0.1)); out.gain.linearRampToValueAtTime(0, t + dur + rel);
    [root, root * 1.5, root * 2].forEach(f => [-7, 7].forEach(dt => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt;
      o.connect(lp); o.start(t); o.stop(t + dur + rel + 0.05);
    }));
    lp.connect(out); const d = ctx.createGain(); d.gain.value = 0.55; out.connect(d); d.connect(dry);
    const w = ctx.createGain(); w.gain.value = 0.9; out.connect(w); w.connect(verbIn);
  }
  // 낮은 금관 (보스곡 등 힘찬 곡)
  function brass(f, t, dur, vel) {
    if (!ctx || !f) return;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o2.type = 'sawtooth'; o.frequency.value = f; o2.frequency.value = f; o2.detune.value = 9;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(1500, t + 0.08); lp.frequency.linearRampToValueAtTime(900, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.05); g.gain.setValueAtTime(vel, t + dur * 0.8); g.gain.linearRampToValueAtTime(0, t + dur + 0.15);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(dry); const w = ctx.createGain(); w.gain.value = 0.5; g.connect(w); w.connect(verbIn);
    o.start(t); o2.start(t); o.stop(t + dur + 0.2); o2.stop(t + dur + 0.2);
  }
  // 반짝이는 벨 (빠른 곡의 멜로디 위에 살짝)
  function bell(f, t, vel) {
    if (!ctx || !f) return;
    [[2, 1], [5.4, .35]].forEach(([m, a]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * m; g.gain.setValueAtTime(vel * a, t); g.gain.exponentialRampToValueAtTime(1e-4, t + 1.1); o.connect(g); g.connect(verbIn); const d = ctx.createGain(); d.gain.value = .4; g.connect(d); d.connect(dry); o.start(t); o.stop(t + 1.2); });
  }
  // 팀파니
  function timpani(t, vel) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(98, t); o.frequency.exponentialRampToValueAtTime(58, t + 0.35);
    g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(1e-4, t + 0.9);
    o.connect(g); g.connect(dry); const w = ctx.createGain(); w.gain.value = 0.6; g.connect(w); w.connect(verbIn); o.start(t); o.stop(t + 1);
    if (noiseBuf) { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), ng = ctx.createGain(); s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = 500; ng.gain.setValueAtTime(vel * 0.5, t); ng.gain.exponentialRampToValueAtTime(1e-4, t + 0.25); s.connect(f); f.connect(ng); ng.connect(dry); s.start(t); s.stop(t + 0.3); }
  }
  function brushNoise(t, dur, gain, freq, q, wet) {
    if (!ctx || !noiseBuf) return;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    s.connect(f); f.connect(g); g.connect(dry); const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(verbIn); s.start(t); s.stop(t + dur + 0.02);
  }
  function ensureNoise() { if (!noiseBuf && ctx) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } }

  function tone(f, t, dur, wave, gain, bus, echo) {
    if (!ctx || !f) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = wave; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(bus); if (echo) g.connect(delay);
    o.start(t); o.stop(t + dur + 0.02);
  }
  let noiseBuf = null;
  function noise(t, dur, gain, hp, bus) {
    if (!ctx) return;
    ensureNoise();
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp; g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.02);
  }
  function kick(t) { if (!ctx) return; const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.16); }

  // 곡 성격: 빠르고 힘찬 곡(사각파·톱니파) / 잔잔한 곡(삼각파·사인파)
  function styleOf(song) {
    const energetic = song.wave === 'square' || song.wave === 'sawtooth';
    return { energetic, epic: song.wave === 'sawtooth', wet: song.echo ? 0.55 : energetic ? 0.3 : 0.45, padVel: energetic ? 0.016 : 0.022 };
  }
  function schedule(horizon) {
    if (!ctx || !cur) return;
    ensureNoise();
    const song = SONGS[cur], spb = 60 / song.bpm / 2, st = styleOf(song);
    const until = horizon !== undefined ? horizon : ctx.currentTime + 0.3;
    while (nextT < until) {
      const L = song.lead, B = song.bass, Pp = song.perc;
      const li = step % L.length, bi = step % B.length;
      const bar = step % 8 === 0, hum = 0.9 + Math.random() * 0.2;
      // 멜로디: 피아노 (마디 첫 박은 살짝 세게)
      const n = L[li];
      if (n !== '.' && n !== '-') {
        let len = 1; while (L[(li + len) % L.length] === '-' && len < 8) len++;
        const f = freq(n), v = (st.energetic ? 0.13 : 0.15) * hum * (bar ? 1.15 : 1);
        piano(f, nextT, spb * len, v, st.wet, song.echo);
        if (st.energetic && bar) bell(f, nextT, 0.018);
        if (st.epic) brass(f / 2, nextT, spb * len * 0.95, 0.022);
      }
      // 베이스: 낮은 피아노 + 부드러운 저음
      const b = B[bi];
      if (b !== '.' && b !== '-') {
        let len = 1; while (B[(bi + len) % B.length] === '-' && len < 8) len++;
        const f = freq(b);
        piano(f, nextT, spb * len, 0.12 * hum, st.wet * 0.7, false);
        tone(f, nextT, Math.max(0.25, spb * len * 0.95), 'sine', 0.045, dry, false);
      }
      // 현악 패드: 마디마다 그 마디의 베이스 음으로 화음을 깐다
      if (bar) {
        let root = 0; for (let k = 0; k < 8 && !root; k++) { const x = B[(bi + k) % B.length]; if (x !== '.' && x !== '-') root = freq(x); }
        while (root > 140) root /= 2; while (root && root < 65) root *= 2;
        if (root) strings(root * 2, nextT, spb * 8, st.padVel, st.energetic ? 1500 : 1000);
      }
      // 타악기: 팀파니 · 오케스트라 스네어 · 셰이커
      if (Pp) { const c = Pp[step % Pp.length]; if (c === 'k') timpani(nextT, 0.45); if (c === 's') brushNoise(nextT, 0.16, 0.13, 1700, 0.7, 0.5); if (c === 'h') brushNoise(nextT, 0.05, 0.035, 7500, 1.2, 0.2); }
      step++; nextT += spb;
    }
  }
  // 미리 듣기 · 점검용: 곡을 오프라인으로 렌더링
  async function renderOffline(name, sec) {
    const live = { ctx, master, musicBus, sfxBus, delay, delayFb, dry, verbIn, noiseBuf, cur, step, nextT };
    const off = new OfflineAudioContext(2, Math.floor(44100 * sec), 44100);
    noiseBuf = null; makeGraph(off); cur = name; step = 0; nextT = 0.05;
    schedule(sec - 0.5);
    const buf = await off.startRendering();
    ({ ctx, master, musicBus, sfxBus, delay, delayFb, dry, verbIn, noiseBuf, cur, step, nextT } = live);
    return buf;
  }
  function play(name, night) {
    name = ALIAS[name] || name;
    if (night && SONGS[name] && name !== 'title' && name !== 'boss' && name !== 'ending') name = nightOf(name);
    if (!SONGS[name] || name === cur) return;
    resume(); if (!ctx) return;
    // 부드러운 전환
    const g = musicBus.gain; const now = ctx.currentTime;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0.0001, now + 0.25); // 곡 사이 부드럽게
    setTimeout(() => { cur = name; step = 0; nextT = ctx.currentTime + 0.05; g.cancelScheduledValues(ctx.currentTime); g.linearRampToValueAtTime(vol.music * MUSIC_GAIN, ctx.currentTime + 0.9); }, 260);
    if (!timer) timer = setInterval(() => schedule(), 60);
  }

  const SFX = {
    step: () => noise(ctx.currentTime, 0.025, 0.05, 2500, sfxBus),
    blip: () => tone(520 + Math.random() * 120, ctx.currentTime, 0.04, 'square', 0.05, sfxBus),
    select: () => { const t = ctx.currentTime; tone(660, t, 0.06, 'square', 0.12, sfxBus); tone(990, t + 0.05, 0.08, 'square', 0.1, sfxBus); },
    open: () => { const t = ctx.currentTime; tone(440, t, 0.08, 'triangle', 0.2, sfxBus); tone(660, t + 0.06, 0.1, 'triangle', 0.2, sfxBus); },
    close: () => tone(330, ctx.currentTime, 0.08, 'triangle', 0.15, sfxBus),
    ok: () => { const t = ctx.currentTime; [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.07, 0.15, 'square', 0.11, sfxBus)); },
    fail: () => { const t = ctx.currentTime; [392, 330, 262, 196].forEach((f, i) => tone(f, t + i * 0.08, 0.16, 'sawtooth', 0.08, sfxBus)); },
    coin: () => { const t = ctx.currentTime; tone(988, t, 0.06, 'square', 0.1, sfxBus); tone(1319, t + 0.06, 0.18, 'square', 0.1, sfxBus); },
    door: () => { const t = ctx.currentTime; noise(t, 0.3, 0.18, 400, sfxBus); tone(180, t, 0.25, 'triangle', 0.2, sfxBus); },
    hit: () => { const t = ctx.currentTime; noise(t, 0.15, 0.4, 200, sfxBus); tone(110, t, 0.2, 'sawtooth', 0.15, sfxBus); },
    dice: () => { const t = ctx.currentTime; for (let i = 0; i < 5; i++) noise(t + i * 0.05, 0.03, 0.15, 3000, sfxBus); },
    level: () => { const t = ctx.currentTime; [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, t + i * 0.06, 0.2, 'triangle', 0.15, sfxBus)); },
    splash: () => { const t = ctx.currentTime; noise(t, 0.35, 0.25, 900, sfxBus); },
    meow: () => { const t = ctx.currentTime; if (!ctx) return; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(700, t); o.frequency.linearRampToValueAtTime(1100, t + 0.12); o.frequency.linearRampToValueAtTime(600, t + 0.35); g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.42); },
    secret: () => { const t = ctx.currentTime; [784, 740, 622, 440, 415, 659, 831, 1046].forEach((f, i) => tone(f, t + i * 0.09, 0.15, 'square', 0.1, sfxBus)); }
  };
  function sfx(name) { if (!ctx || !vol.on) return; try { SFX[name] && SFX[name](); } catch (e) {} }

  function save() { try { localStorage.setItem('belesta_audio', JSON.stringify(vol)); } catch (e) {} }
  function setOn(on) { vol.on = on; if (master) master.gain.value = on ? 1 : 0; save(); }
  function setMusic(v) { vol.music = v; if (musicBus) musicBus.gain.value = v * MUSIC_GAIN; save(); }
  function setSfx(v) { vol.sfx = v; if (sfxBus) sfxBus.gain.value = v * 0.35; save(); }
  return { play, sfx, resume, vol, setOn, setMusic, setSfx, current: () => cur, renderOffline, songs: () => Object.keys(SONGS) };
})();

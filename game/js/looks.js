// 도트 캐릭터 외형을 portraits 일러스트에 맞춘다.
// 일러스트 id(= NPC id 또는 pic 별칭) → 도트 look. 모든 NPC·컷씬 배역에 적용된다.
const PORTRAIT_LOOKS = {
  alpha: L({ hair: '#d8322c', hairStyle: 'pony', cloth: '#a32430', type: 'tunic', accent: '#e1b13d', eye: '#e08a2a' }),
  bayes: L({ hairStyle: 'bald', glasses: true, beard: '#f4f1ea', cloth: '#2e2a30', type: 'robe', collar: '#e4cfa4', skin: SKIN[1], eye: '#2a2a3a' }),
  bellman: L({ hairStyle: 'bald', glasses: true, hat: 'band', hatBand: '#d9a84a', cloth: '#5a5a3a', type: 'robe', collar: '#efe3c8', skin: SKIN[1], eye: '#2a2a3a' }),
  beta: L({ hair: '#3a62d8', hairStyle: 'long', type: 'armor', cloth: '#2a4a9a', eye: '#3a7ad0' }),
  bruno: L({ hair: '#6a3a22', hairStyle: 'spiky', type: 'armor', cloth: '#b8282a', collar: '#b8282a', eye: '#3a7ad0' }),
  categoria: L({ hair: '#2a9a5a', hairStyle: 'long', glasses: true, cloth: '#5a3a2a', type: 'robe', accent: '#e1b13d', eye: '#3a9a4a' }),
  daisy: L({ hair: '#f2cf5a', hairStyle: 'long', hat: 'flower', cloth: '#f8d8e4', type: 'dress', cloth2: '#fbe6ee', accent: '#3a8a4a', eye: '#3a9a4a' }),
  elena: L({ hair: '#22203a', hairStyle: 'long', glasses: true, cloth: '#2a3456', type: 'tunic', eye: '#4a5a8a' }),
  elise: L({ hair: '#3a62d8', hairStyle: 'long', ears: 'elf', type: 'armor', cloth: '#3a4a8a', eye: '#3a7ad0' }),
  estima: L({ hair: '#c8dcff', hairStyle: 'long', hat: 'wizard', hatColor: '#2a2c4a', hatBand: '#d9a84a', ears: 'elf', cloth: '#2a2c4a', type: 'robe', accent: '#d9a84a', eye: '#3a7ad0' }),
  fairy: L({ hair: '#f59ab0', hairStyle: 'twin', hat: 'flower', ears: 'elf', cloth: '#f6e4ea', type: 'dress', cloth2: '#f8d0dc', accent: '#e1b13d', eye: '#3a9a4a' }),
  fin: L({ hair: '#7a5230', hairStyle: 'short', hat: 'hunter', hatColor: '#3f6a3a', cloth: '#3f6a3a', type: 'tunic', accent: '#a07a4a', eye: '#3a9a4a' }),
  gamli: L({ hairStyle: 'bald', glasses: true, mask: '#c0283a', cloth: '#3a3434', type: 'tunic', eye: '#2a2a3a' }),
  godric: L({ hair: '#f0cf6a', hairStyle: 'spiky', cloth: '#3f6a3a', type: 'tunic', accent: '#e8e2d2', eye: '#6a4a2a' }),
  gregory: L({ hair: '#b08a50', hairStyle: 'short', hat: 'hunter', hatColor: '#4a6a3a', cloth: '#7a6a3a', type: 'tunic', accent: '#6a4a2a', eye: '#3a9a4a' }),
  grim: L({ hair: '#b89a7a', hairStyle: 'pony', mask: '#3a3e48', cloth: '#4a4c56', type: 'tunic', collar: '#5a5c66', eye: '#c03030' }),
  hans: L({ hat: 'hood', hatColor: '#d8b47a', mask: '#2a2a2a', cloth: '#c8a46a', type: 'tunic', skin: SKIN[1], eye: '#7a4a2a' }),
  hassan: L({ hair: '#1a1a1a', hairStyle: 'short', hat: 'bandana', hatColor: '#c8282a', collar: '#c8282a', cloth: '#2a2a30', type: 'tunic', skin: SKIN[2], eye: '#5a3a1a' }),
  hypo: L({ hairStyle: 'bald', beard: '#1e1e1e', collar: '#f4f1ea', cloth: '#4a4a3a', type: 'robe', accent: '#e1b13d', eye: '#2a2a2a' }),
  infinity: L({ hair: '#4a3ab0', hairStyle: 'short', hat: 'crown', collar: '#f4f4f8', cloth: '#4a3a8a', type: 'tunic', accent: '#e1b13d', eye: '#6a5ab0' }),
  kiara: L({ hair: '#8a6ae0', hairStyle: 'long', hat: 'wizard', hatColor: '#5a3a9a', hatBand: '#e1b13d', cloth: '#6a4aa0', type: 'robe', accent: '#e8e2f2', eye: '#3a7ad0' }),
  leon: L({ hair: '#f2cf5a', hairStyle: 'short', type: 'armor', cloth: '#3a62d8', eye: '#3a7ad0' }),
  log: L({ hair: '#1e1e2a', hat: 'hood', hatColor: '#2a2a38', cloth: '#2a2a38', type: 'robe', accent: '#c9a84a', eye: '#3aa04a' }),
  lost: L({ hair: '#4a8a3a', hairStyle: 'spiky', goggles: true, cloth: '#6a5a3a', type: 'tunic', eye: '#7a4a2a' }),
  lyra: L({ hair: '#f58ab0', hairStyle: 'twin', hat: 'flower', cloth: '#8a6ac0', type: 'tunic', accent: '#e1b13d', eye: '#e05a8a' }),
  marta: L({ hair: '#9a4a2a', hairStyle: 'long', hat: 'band', hatBand: '#c8282a', cloth: '#8a5a2a', type: 'dress', cloth2: '#c89a4a', eye: '#7a3a2a' }),
  miner2: L({ hair: '#2a2020', hairStyle: 'long', hat: 'tiara', cloth: '#6a4a2a', type: 'tunic', accent: '#e1b13d', skin: SKIN[3], eye: '#7a3a2a' }),
  minji: L({ hair: '#1e1e2a', hairStyle: 'pony', glasses: true, cloth: '#2a3a6a', type: 'tunic', accent: '#e8e2d2', eye: '#3a6ad0' }),
  moa: L({ hair: '#e4e4ee', hairStyle: 'long', hat: 'tiara', ears: 'elf', cloth: '#2a3a6a', type: 'robe', accent: '#e1b13d', eye: '#3a7ad0' }),
  monte: L({ hair: '#c8c8c8', hairStyle: 'short', glasses: true, cloth: '#3a6a3a', type: 'robe', accent: '#e1b13d', eye: '#3a9a4a' }),
  neil: L({ hair: '#f0662a', hairStyle: 'spiky', type: 'armor', cloth: '#6a6a7a', eye: '#c03030' }),
  nobody: L({ hair: '#8a8a92', hairStyle: 'short', type: 'armor', cloth: '#5a6a4a', eye: '#4a4a5a', blush: false }),
  owen: L({ hair: '#1e1e2a', hairStyle: 'short', glasses: true, cloth: '#2a3a7a', type: 'tunic', accent: '#e8e2d2', eye: '#3a7ad0' }),
  pair: L({ hair: '#f07a2a', hairStyle: 'spiky', hat: 'crown', collar: '#f4f4f8', cloth: '#b8282a', type: 'tunic', accent: '#e1b13d', eye: '#a0502a' }),
  park: L({ hair: '#1a1a2a', hairStyle: 'short', cloth: '#2a2a34', type: 'tunic', accent: '#3a3a46', eye: '#4a4a5a' }),
  pielle: L({ hair: '#f0f0f4', hairStyle: 'long', hat: 'brim', hatColor: '#f4f1ea', hatBand: '#b8282a', cloth: '#f4f1ea', type: 'robe', accent: '#e1b13d', eye: '#5a5a7a' }),
  prime: L({ hair: '#f0507a', hairStyle: 'pony', hat: 'flower', cloth: '#f0c060', type: 'dress', cloth2: '#f8d88a', eye: '#e05a8a' }),
  repair: L({ hair: '#3a9a3a', hairStyle: 'short', hat: 'crown', type: 'armor', cloth: '#2a4a9a', eye: '#2a2a3a' }),
  saira: L({ hair: '#6a3aa0', hairStyle: 'long', hat: 'wizard', hatColor: '#4a2a7a', hatBand: '#e1b13d', cloth: '#9a7ac0', type: 'robe', accent: '#e1b13d', eye: '#8a4ac0' }),
  serena: L({ hair: '#f4e0a0', hairStyle: 'long', hat: 'tiara', ears: 'elf', cloth: '#f4f1ea', type: 'robe', accent: '#5a9a5a', eye: '#a07a3a' }),
  silva: L({ hair: '#c8e8a0', hairStyle: 'long', ears: 'elf', cloth: '#3a7a3a', type: 'tunic', accent: '#c9a46d', eye: '#3a9a4a' }),
  skelly: L({ hairStyle: 'bald', cloth: '#9aa0a8', type: 'tunic', accent: '#c9a84a', skin: SKIN[4], eye: '#4a4a5a' }),
  thaniya: L({ hair: '#f2cf5a', hairStyle: 'long', hat: 'catears', cloth: '#25222c', type: 'tunic', accent: '#c03040', eye: '#3a9a4a', skin: SKIN[0] }),
  toby: L({ hair: '#1e1e2a', hairStyle: 'short', hat: 'wizard', hatColor: '#3a4aa0', hatBand: '#e1b13d', cloth: '#3a4aa0', type: 'robe', accent: '#e8e2d2', eye: '#6a5ab0' }),
  troll: L({ hair: '#5a7a3a', hairStyle: 'spiky', hat: 'horns', ears: 'elf', collar: '#c8a878', cloth: '#6a5a3a', type: 'tunic', skin: '#7aa860', eye: '#e8b83a', blush: false }),
  veil: L({ hair: '#e8e8f0', hat: 'hood', hatColor: '#2a2a38', cloth: '#2a2a38', type: 'robe', accent: '#c9a84a', eye: '#d03a4a' }),
  volkan: L({ hairStyle: 'bald', mask: '#c8282a', cloth: '#3a3434', type: 'tunic', collar: '#c8282a', eye: '#6a3a1a' }),
  woodcutter: L({ hair: '#7a4a2a', hairStyle: 'short', hat: 'cap', hatColor: '#3f6a3a', cloth: '#6a4a30', type: 'tunic', accent: '#8a6a4a', eye: '#6a3a1a' }),
  // 동물·괴물
  confi: { kind: 'golem' },
  kai: { kind: 'slime', cloth: '#5fd36a' },
  mimic: { kind: 'mimic' },
  null: { kind: 'ghost' },
  nurungji: { kind: 'cat', cloth: '#f2a040', scarf: '#c8282a' },
  pivalu: { kind: 'cat', cloth: '#f6b060' },
  pigeon: { kind: 'pigeon', cloth: '#6a7ac8', scarf: '#5fb34a', crown: true },
  pebble: { kind: 'rock' },
  outlier: { kind: 'boss' }
};

(function applyPortraitLooks() {
  const fit = (id, o) => {
    if (!o || o.keepLook) return;
    const pid = o.pic || id, pl = PORTRAIT_LOOKS[pid];
    if (!pl) return;
    // 같은 종류의 괴물이면 기존 색(보라 슬라임 등)을 살린다
    if (o.pic && o.pic !== id && o.look && o.look.kind && pl.kind === o.look.kind) return;
    o.look = Object.assign({}, pl);
  };
  for (const id in NPCS) fit(id, NPCS[id]);
  if (typeof CUT_CAST !== 'undefined') for (const id in CUT_CAST) fit(id, CUT_CAST[id]);
})();

// 모바일: 전체화면 + 가로 고정 시도 (안드로이드 크롬 등에서 동작, 아이폰은 「가로로 돌려 주세요」 안내만)
(function () {
  const touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  async function lockLandscape() {
    if (!touch) return;
    try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch (e) {}
    try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (e) {}
  }
  window.lockLandscape = lockLandscape;
  document.getElementById('rotate-btn').addEventListener('click', lockLandscape);
  ['btn-new', 'btn-continue'].forEach(id => { const b = document.getElementById(id); if (b) b.addEventListener('click', lockLandscape); });
  // 모바일은 항상 전체화면: 화면을 처음 누를 때, 그리고 전체화면이 풀린 뒤 다시 누를 때마다 전체화면으로
  if (touch) document.addEventListener('pointerdown', () => { if (!document.fullscreenElement) lockLandscape(); }, true);
  // 방향이 바뀌면 캔버스 크기 다시 맞추기
  const re = () => setTimeout(() => window.dispatchEvent(new Event('resize')), 250);
  if (screen.orientation) screen.orientation.addEventListener('change', re); window.addEventListener('orientationchange', re);
})();

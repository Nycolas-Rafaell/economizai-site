(() => {
  if (!/\/admin\.html$/i.test(location.pathname) || !new URLSearchParams(location.search).has('captura')) return;
  let retryTimer;
  let attempts = 0;
  let capture;

  function deliverCapture() {
    if (!capture || attempts >= 12) {
      if (retryTimer) clearInterval(retryTimer);
      return;
    }
    attempts += 1;
    // O painel pode levar alguns instantes para carregar bibliotecas locais.
    // Reenviar até receber a confirmação evita perder uma captura por timing.
    window.postMessage({ source: 'economizai-capturador', type: 'captura-produto', capture }, location.origin);
  }

  chrome.storage.local.get('economizaiPendingCapture', ({ economizaiPendingCapture }) => {
    if (!economizaiPendingCapture) return;
    capture = economizaiPendingCapture;
    deliverCapture();
    retryTimer = setInterval(deliverCapture, 700);
  });
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.source !== 'economizai-site' || event.data?.type !== 'captura-aplicada') return;
    if (retryTimer) clearInterval(retryTimer);
    chrome.storage.local.remove('economizaiPendingCapture');
  });
})();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'economizai-open-admin') return;
  const capture = message.capture || {};
  const rawDestination = String(message.destination || 'http://localhost:3000').trim();
  try {
    const destination = new URL(rawDestination);
    if (!['http:', 'https:'].includes(destination.protocol)) throw new Error('Endereço inválido.');
    chrome.storage.local.set({ economizaiPendingCapture: { ...capture, autoCreate: true, capturedAt: new Date().toISOString() } }, () => {
      // "cadastro=1" evita o redirecionamento normal do painel para a tela de análises.
      chrome.tabs.create({ url: `${destination.origin}/admin.html?cadastro=1&captura=1#cadastro` });
      sendResponse({ ok: true });
    });
  } catch (error) {
    sendResponse({ ok: false, message: error.message || 'Não foi possível abrir o painel.' });
  }
  return true;
});

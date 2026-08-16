chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'economizai-open-admin') return;
  const capture = message.capture || {};
  const rawDestination = String(message.destination || 'http://localhost:3000').trim();
  try {
    const destination = new URL(rawDestination);
    if (!['http:', 'https:'].includes(destination.protocol)) throw new Error('Endereço inválido.');
    const openAdmin = () => chrome.storage.local.set({ economizaiPendingCapture: { ...capture, autoCreate: true, capturedAt: new Date().toISOString() } }, () => {
      // "cadastro=1" evita o redirecionamento normal do painel para a tela de análises.
      chrome.tabs.create({ url: `${destination.origin}/admin.html?cadastro=1&captura=1#cadastro` });
      sendResponse({ ok: true });
    });
    if (!message.automatic) {
      openAdmin();
      return true;
    }
    const key = String(capture.publicUrl || '').replace(/[?#].*$/, '');
    chrome.storage.local.get('economizaiAutomaticCaptures', ({ economizaiAutomaticCaptures = {} }) => {
      if (key && economizaiAutomaticCaptures[key]) {
        sendResponse({ ok: false, message: 'Este produto já foi enviado automaticamente ao Economizaí.' });
        return;
      }
      const updated = { ...economizaiAutomaticCaptures, ...(key ? { [key]: new Date().toISOString() } : {}) };
      const recentKeys = Object.keys(updated).sort((a, b) => String(updated[b]).localeCompare(String(updated[a]))).slice(0, 300);
      const recent = Object.fromEntries(recentKeys.map((recentKey) => [recentKey, updated[recentKey]]));
      chrome.storage.local.set({ economizaiAutomaticCaptures: recent }, openAdmin);
    });
  } catch (error) {
    sendResponse({ ok: false, message: error.message || 'Não foi possível abrir o painel.' });
  }
  return true;
});

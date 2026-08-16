const destination = document.getElementById('destination');
const affiliateUrl = document.getElementById('affiliateUrl');
const autoCapture = document.getElementById('autoCapture');
const captureButton = document.getElementById('capture');
const status = document.getElementById('status');

chrome.storage.local.get(['economizaiDestination', 'economizaiAutoCapture'], (stored) => {
  destination.value = stored.economizaiDestination || 'http://localhost:3000';
  autoCapture.checked = Boolean(stored.economizaiAutoCapture);
});

autoCapture.addEventListener('change', async () => {
  await chrome.storage.local.set({ economizaiAutoCapture: autoCapture.checked });
  setStatus(autoCapture.checked
    ? 'Captura automática ativada. Ela continuará ligada até você desativá-la aqui.'
    : 'Captura automática desativada.', autoCapture.checked ? 'success' : '');
});

function setStatus(message, type = '') {
  status.textContent = message;
  status.className = type;
}

async function getMercadoLivreTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/mercadolivre|mercadolibre/i.test(tab.url || '')) {
    throw new Error('Abra uma página de produto do Mercado Livre antes de continuar.');
  }
  return tab;
}

async function generateAffiliateLink(tab) {
  const response = await chrome.tabs.sendMessage(tab.id, { type: 'economizai-generate-affiliate-link' });
  if (!response?.affiliateUrl) {
    throw new Error(response?.message || 'Não consegui localizar o link de afiliado na página.');
  }
  affiliateUrl.value = response.affiliateUrl;
  return response.affiliateUrl;
}

captureButton.addEventListener('click', async () => {
  captureButton.disabled = true;
  setStatus('Lendo dados visíveis da oferta…');

  try {
    const tab = await getMercadoLivreTab();

    let affiliateLink = affiliateUrl.value.trim();
    if (!affiliateLink) {
      setStatus('Gerando o link de afiliado e lendo a oferta…');
      affiliateLink = await generateAffiliateLink(tab);
    }

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'economizai-capture-product' });
    if (!response?.ok) {
      throw new Error(response?.message || 'Não foi possível capturar esta oferta.');
    }

    const siteUrl = destination.value.trim() || 'http://localhost:3000';
    if (affiliateLink) {
      try { new URL(affiliateLink); } catch { throw new Error('Informe um link de afiliado válido ou deixe o campo em branco.'); }
    }
    await chrome.storage.local.set({ economizaiDestination: siteUrl });
    const result = await chrome.runtime.sendMessage({
      type: 'economizai-open-admin',
      destination: siteUrl,
      capture: { ...response.capture, affiliateUrl: affiliateLink }
    });
    if (!result?.ok) {
      throw new Error(result?.message || 'Não foi possível abrir o painel.');
    }

    setStatus('Rascunho aberto no painel.', 'success');
    window.close();
  } catch (error) {
    setStatus(error.message, 'error');
    captureButton.disabled = false;
  }
});

const destination = document.getElementById('destination');
const affiliateUrl = document.getElementById('affiliateUrl');
const generateAffiliateButton = document.getElementById('generateAffiliate');
const captureButton = document.getElementById('capture');
const status = document.getElementById('status');

chrome.storage.local.get(['economizaiDestination', 'economizaiAffiliateUrl'], (stored) => {
  destination.value = stored.economizaiDestination || 'http://localhost:3000';
  affiliateUrl.value = stored.economizaiAffiliateUrl || '';
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

generateAffiliateButton.addEventListener('click', async () => {
  generateAffiliateButton.disabled = true;
  setStatus('Abrindo o compartilhamento oficial da Barra de Afiliados…');

  try {
    const tab = await getMercadoLivreTab();
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'economizai-generate-affiliate-link' });
    if (response?.affiliateUrl) {
      affiliateUrl.value = response.affiliateUrl;
      await chrome.storage.local.set({ economizaiAffiliateUrl: response.affiliateUrl });
      setStatus('Link de afiliado encontrado. Revise-o e depois capture o produto.', 'success');
      return;
    }
    throw new Error(response?.message || 'Não consegui localizar o link de afiliado na página.');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    generateAffiliateButton.disabled = false;
  }
});

captureButton.addEventListener('click', async () => {
  captureButton.disabled = true;
  setStatus('Lendo dados visíveis da oferta…');

  try {
    const tab = await getMercadoLivreTab();

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'economizai-capture-product' });
    if (!response?.ok) {
      throw new Error(response?.message || 'Não foi possível capturar esta oferta.');
    }

    const siteUrl = destination.value.trim() || 'http://localhost:3000';
    const affiliateLink = affiliateUrl.value.trim();
    if (affiliateLink) {
      try { new URL(affiliateLink); } catch { throw new Error('Informe um link de afiliado válido ou deixe o campo em branco.'); }
    }
    await chrome.storage.local.set({ economizaiDestination: siteUrl, economizaiAffiliateUrl: affiliateLink });
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

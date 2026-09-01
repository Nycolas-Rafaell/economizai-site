const content = document.getElementById('content');
const toolbar = document.getElementById('toolbar');
const selectedCount = document.getElementById('selectedCount');
const selectedTotal = document.getElementById('selectedTotal');
const openSelected = document.getElementById('openSelected');
const selectAll = document.getElementById('selectAll');
const blockedList = document.getElementById('blockedList');
const blockedLinks = document.getElementById('blockedLinks');
const quantityKey = 'economizai:list-quantities:v1';
const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
const escapeHtml = (value) => String(value || '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
let listItems = [];
let quantities = JSON.parse(localStorage.getItem(quantityKey) || '{}');

async function load() {
  const session = await fetch('/api/auth/session', { cache: 'no-store' });
  if (!session.ok) {
    location.replace('/login.html');
    return [];
  }
  const [alertsResponse, offersResponse] = await Promise.all([fetch('/api/alerts', { cache: 'no-store' }), fetch('/api/ofertas', { cache: 'no-store' })]);
  if (!alertsResponse.ok || !offersResponse.ok) throw new Error('Não foi possível carregar a lista.');
  const { alerts } = await alertsResponse.json();
  const offersPayload = await offersResponse.json();
  const offers = Array.isArray(offersPayload) ? offersPayload : (offersPayload.items || []);
  const byId = new Map(offers.map((offer) => [String(offer.id), offer]));
  return alerts.map((alert) => ({ ...alert, offer: byId.get(String(alert.externalProductId)) })).filter((item) => item.offer);
}

function persistQuantities() { localStorage.setItem(quantityKey, JSON.stringify(quantities)); }
function getQuantity(id) { return Math.max(1, Math.min(99, Number(quantities[id]) || 1)); }
function selectedItems() { return listItems.filter((item) => item.selected); }
function updateSummary() {
  const selected = selectedItems();
  selectedCount.textContent = selected.length;
  selectedTotal.textContent = money(selected.reduce((sum, item) => sum + Number(item.offer.currentPrice) * getQuantity(item.offer.id), 0));
  openSelected.disabled = selected.length === 0;
  selectAll.textContent = selected.length === listItems.length && listItems.length ? 'Limpar seleção' : 'Selecionar todos';
}

function render() {
  if (!listItems.length) {
    toolbar.hidden = true; content.className = 'empty';
    window.dispatchEvent(new CustomEvent('economizai:list-changed', { detail: { count: 0 } }));
    content.innerHTML = 'Sua lista ainda está vazia.<br><br><a href="index.html">Encontrar ofertas</a>';
    return;
  }
  toolbar.hidden = false; content.className = 'grid';
  window.dispatchEvent(new CustomEvent('economizai:list-changed', { detail: { count: listItems.length } }));
  content.replaceChildren(...listItems.map((item) => {
    const offer = item.offer;
    const card = document.createElement('article'); card.className = 'card';
    const image = offer.image ? `<img src="${escapeHtml(offer.image)}" alt="${escapeHtml(offer.title)}">` : '';
    const discount = offer.discountPct ? `<span class="discount-flag">-${escapeHtml(offer.discountPct)}% OFF</span>` : '';
    const old = offer.originalPrice ? `<span class="price-old">De ${money(offer.originalPrice)}</span>` : '';
    const store = offer.marketplace === 'shopee' ? 'Shopee' : offer.marketplace === 'amazon' ? 'Amazon' : 'Mercado Livre';
    const alertState = item.triggered_at
      ? '<div class="alert-meta triggered"><strong>Preço atingido!</strong> Confira a oferta.</div>'
      : item.is_active ? `<div class="alert-meta">Alerta ativo em <strong>${money(item.target_price)}</strong></div>` : '<div class="alert-meta">Salvo para comprar · alerta desativado</div>';
    card.innerHTML = `<input class="select-offer" type="checkbox" aria-label="Selecionar ${escapeHtml(offer.title)}"><div class="card-media">${image}${discount}<span class="store-badge">${store}</span></div><div class="card-body"><div class="card-title">${escapeHtml(offer.title)}</div><div class="price-block">${old}<span class="price-new">${money(offer.currentPrice)}</span></div><div class="list-options"><label>Quantidade<input class="quantity" type="number" min="1" max="99" value="${getQuantity(offer.id)}"></label><label>Preço-alvo<input class="target" type="text" inputmode="decimal" value="${Number(item.target_price).toFixed(2).replace('.', ',')}"></label></div>${alertState}<div class="card-actions"><a class="card-cta" href="produto-dinamico.html?id=${encodeURIComponent(offer.id)}">Ver detalhes</a><button class="remove" type="button">Remover</button></div></div>`;
    const checkbox = card.querySelector('.select-offer');
    checkbox.checked = Boolean(item.selected);
    checkbox.addEventListener('change', () => { item.selected = checkbox.checked; card.classList.toggle('is-selected', item.selected); updateSummary(); });
    card.querySelector('.quantity').addEventListener('change', (event) => { quantities[offer.id] = Math.max(1, Math.min(99, Number(event.target.value) || 1)); event.target.value = quantities[offer.id]; persistQuantities(); updateSummary(); });
    card.querySelector('.target').addEventListener('change', async (event) => {
      const targetPrice = String(event.target.value).replace(',', '.');
      const response = await fetch(`/api/alerts/${encodeURIComponent(offer.id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetPrice, isActive: true }) });
      if (response.ok) { window.EconomizaiUI?.toast('Alerta de preço ativado.', 'success'); listItems = await load(); render(); }
      else window.EconomizaiUI?.toast('Informe um preço-alvo válido.', 'error');
    });
    card.querySelector('.remove').addEventListener('click', async () => {
      const response = await fetch(`/api/alerts/${encodeURIComponent(offer.id)}`, { method: 'DELETE' });
      if (response.ok) { delete quantities[offer.id]; persistQuantities(); listItems = listItems.filter((saved) => saved !== item); render(); updateSummary(); }
      else window.EconomizaiUI?.toast('Não foi possível remover agora.', 'error');
    });
    return card;
  }));
  updateSummary();
}

selectAll.addEventListener('click', () => { const enable = selectedItems().length !== listItems.length; listItems.forEach((item) => { item.selected = enable; }); render(); });

openSelected.addEventListener('click', () => {
  const selected = selectedItems();
  blockedLinks.replaceChildren(); blockedList.hidden = true;
  const blocked = [];
  // Todas as janelas são criadas imediatamente durante o clique confiável.
  // Depois preenchemos cada uma com sua oferta; isso evita que o carregamento
  // da primeira página consuma a permissão das abas seguintes.
  const tabs = selected.map(() => window.open('about:blank', '_blank'));
  selected.forEach((item, index) => {
    const url = item.offer.affiliateUrl || item.offer.publicUrl;
    const opened = tabs[index];
    if (opened) { opened.opener = null; opened.location.replace(url); }
    if (!opened) blocked.push(item);
    window.EconomizaiAnalytics?.track('affiliate_click', { offerId: item.offer.id, category: item.offer.category });
  });
  if (blocked.length) {
    blockedList.hidden = false;
    window.EconomizaiUI?.toast(`O navegador bloqueou ${blocked.length} aba(s). Libere pop-ups para abrir todas de uma vez.`, 'error');
    blockedLinks.replaceChildren(...blocked.map((item) => { const link = document.createElement('a'); link.href = item.offer.affiliateUrl || item.offer.publicUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = item.offer.title; return link; }));
  }
});

load().then((items) => { listItems = items; render(); }).catch(() => { content.className = 'empty'; content.textContent = 'Não foi possível carregar sua lista agora.'; });

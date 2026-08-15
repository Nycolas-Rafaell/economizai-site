const stores = [
  { id: 'all', label: 'Todas', mark: '★' },
  { id: 'mercado_livre', label: 'Mercado Livre', mark: 'ML' },
  { id: 'shopee', label: 'Shopee', mark: 'S' },
  { id: 'amazon', label: 'Amazon', mark: 'A' },
  { id: 'aliexpress', label: 'AliExpress', mark: 'AE' },
];
const storeNames = Object.fromEntries(stores.map((store) => [store.id, store.label]));
const params = new URLSearchParams(location.search);
let selectedStore = stores.some((store) => store.id === params.get('loja')) ? params.get('loja') : 'all';
let offers = []; let favoriteIds = new Set(); let favoritesEnabled = false;
const escapeHtml = (value) => String(value || '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
const storeLabel = (value) => storeNames[value] || String(value || 'Outra loja').replace(/_/g, ' ');

function renderTabs() {
  const countFor = (id) => id === 'all' ? offers.length : offers.filter((offer) => offer.marketplace === id).length;
  document.getElementById('storeTabs').innerHTML = stores.map((store) => `<button class="store-tab${store.id === selectedStore ? ' active' : ''}" type="button" data-store="${store.id}"><span class="store-mark">${store.mark}</span><span>${store.label}</span><span class="store-count">${countFor(store.id)}</span></button>`).join('');
  document.querySelectorAll('.store-tab').forEach((button) => button.addEventListener('click', () => {
    selectedStore = button.dataset.store;
    const next = new URL(location.href); if (selectedStore === 'all') next.searchParams.delete('loja'); else next.searchParams.set('loja', selectedStore);
    history.replaceState({}, '', next); render();
  }));
}

function toggleFavorite(button, offerId) {
  button.addEventListener('click', async (event) => {
    event.preventDefault(); event.stopPropagation();
    if (!favoritesEnabled) return location.assign('login.html');
    const active = favoriteIds.has(offerId); button.disabled = true;
    try { const response = await fetch(`/api/favorites/${encodeURIComponent(offerId)}`, { method: active ? 'DELETE' : 'POST' }); if (!response.ok) throw new Error(); if (active) favoriteIds.delete(offerId); else favoriteIds.add(offerId); button.classList.toggle('active', !active); button.textContent = active ? '☆' : '★'; }
    finally { button.disabled = false; }
  });
}

function makeCard(offer) {
  const card = document.createElement('article'); card.className = `offer-card${offer.available === false ? ' unavailable' : ''}`;
  const old = offer.originalPrice ? `<div class="old-price">De ${money(offer.originalPrice)}</div>` : '<div class="old-price"></div>';
  const rating = offer.rating ? `<strong>★ ${escapeHtml(offer.rating)}</strong>${offer.reviewCount ? ` (${escapeHtml(offer.reviewCount)} avaliações)` : ''}` : 'Avaliação não informada';
  const discount = offer.discountPct ? `<span class="discount">-${escapeHtml(offer.discountPct)}% OFF</span>` : '';
  card.innerHTML = `<div class="offer-media">${offer.image ? `<img src="${escapeHtml(offer.image)}" alt="${escapeHtml(offer.title)}">` : ''}<span class="store-badge">${escapeHtml(storeLabel(offer.marketplace))}</span><button class="favorite${favoriteIds.has(offer.id) ? ' active' : ''}" type="button" aria-label="Favoritar ${escapeHtml(offer.title)}">${favoriteIds.has(offer.id) ? '★' : '☆'}</button></div><div class="offer-body"><h3 class="offer-title">${escapeHtml(offer.title)}</h3><div class="rating">${rating}</div>${old}<div class="price-line"><span class="current-price">${money(offer.currentPrice)}</span>${discount}</div><a class="offer-link" href="produto-dinamico.html?id=${encodeURIComponent(offer.id)}">Ver oferta</a></div>`;
  toggleFavorite(card.querySelector('.favorite'), offer.id); return card;
}

function render() {
  const filtered = selectedStore === 'all' ? offers : offers.filter((offer) => offer.marketplace === selectedStore);
  const selectedLabel = selectedStore === 'all' ? 'todas as lojas' : storeLabel(selectedStore);
  document.title = selectedStore === 'all' ? 'Lojas parceiras | Economizaí' : `Ofertas ${storeLabel(selectedStore)} | Economizaí`;
  document.getElementById('pageTitle').textContent = selectedStore === 'all' ? 'Lojas no Economizaí' : `Ofertas ${storeLabel(selectedStore)}`;
  document.getElementById('pageLead').textContent = selectedStore === 'all' ? 'Navegue pelas ofertas separadas por loja e encontre onde cada oportunidade está disponível.' : `Confira as ofertas cadastradas atualmente no ${storeLabel(selectedStore)}.`;
  document.getElementById('offersTitle').textContent = selectedStore === 'all' ? 'Todas as ofertas por loja' : `Ofertas do ${storeLabel(selectedStore)}`;
  document.getElementById('offersCounter').textContent = `${filtered.length} ${filtered.length === 1 ? 'oferta disponível' : 'ofertas disponíveis'} em ${selectedLabel}.`;
  const grid = document.getElementById('offers'); grid.replaceChildren(...filtered.map(makeCard)); document.getElementById('empty').hidden = Boolean(filtered.length); renderTabs();
}

async function load() {
  const [offersResponse, favoritesResponse] = await Promise.all([fetch('/api/ofertas', { cache: 'no-store' }), fetch('/api/favorites', { cache: 'no-store' }).catch(() => null)]);
  offers = offersResponse.ok ? await offersResponse.json() : [];
  if (favoritesResponse?.ok) { const data = await favoritesResponse.json(); favoriteIds = new Set(data.ids || []); favoritesEnabled = true; }
  render();
}
load().catch(() => { document.getElementById('offersCounter').textContent = 'Não foi possível carregar as ofertas agora.'; renderTabs(); });

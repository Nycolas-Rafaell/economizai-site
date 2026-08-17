const cards = document.getElementById('cards');
const hint = document.getElementById('hint');
const search = document.getElementById('search');
const bulkActions = document.getElementById('bulkActions');
const scanInvalidPrices = document.getElementById('scanInvalidPrices');
let offers = [];
let selectedStatus = null;

const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const escapeHtml = (value) => String(value || '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
const statusOf = (offer) => offer.availabilityStatus || (offer.available === false ? 'unavailable' : 'available');
const labels = { available: 'Disponível no site', unavailable: 'Oferta não disponível', pending: 'Aguardando publicação' };
const bulkOptions = {
  available: [{ status: 'pending', label: '⏸ Aguardar publicação' }, { status: 'unavailable', label: '⊘ Marcar indisponíveis' }],
  pending: [{ status: 'available', label: '✓ Disponibilizar' }, { status: 'unavailable', label: '⊘ Marcar indisponíveis' }],
  unavailable: [{ status: 'available', label: '✓ Disponibilizar' }, { status: 'pending', label: '⏸ Aguardar publicação' }],
};

function numberValue(value) {
  const raw = String(value ?? '').replace(/[^0-9,.-]/g, '');
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  return Number(normalized) || 0;
}

function marketplaceLabel(offer) {
  return offer.marketplace === 'shopee' ? 'Shopee' : 'Mercado Livre';
}

function discountOf(offer) {
  const current = numberValue(offer.currentPrice);
  const original = numberValue(offer.originalPrice);
  return original > current && current > 0 ? Math.round((1 - current / original) * 100) : 0;
}

function updateMetrics() {
  document.getElementById('metricAvailable').textContent = offers.filter((offer) => statusOf(offer) === 'available').length;
  document.getElementById('metricPending').textContent = offers.filter((offer) => statusOf(offer) === 'pending').length;
  document.getElementById('metricUnavailable').textContent = offers.filter((offer) => statusOf(offer) === 'unavailable').length;
}

async function removeOffer(offer, button) {
  const confirmation = window.EconomizaiUI?.ask
    ? await window.EconomizaiUI.ask({ title: 'Excluir card?', text: `Esta ação remove “${offer.title}” permanentemente.`, label: 'Digite EXCLUIR para confirmar.' })
    : window.prompt('Digite EXCLUIR para confirmar a remoção permanente deste card.');
  if (confirmation !== 'EXCLUIR') return;
  button.disabled = true;
  try {
    const response = await fetch(`/api/admin/ofertas/${encodeURIComponent(offer.id)}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Não foi possível excluir o card.');
    window.EconomizaiUI?.toast('Card excluído.', 'success');
    await load();
  } catch (error) { window.EconomizaiUI?.toast(error.message, 'error'); }
  finally { button.disabled = false; }
}

async function changeOfferStatus(offer, nextStatus, row) {
  if (statusOf(offer) === nextStatus) return;
  const buttons = [...row.querySelectorAll('[data-quick-status]')];
  buttons.forEach((button) => { button.disabled = true; });
  try {
    const response = await fetch(`/api/admin/ofertas/${encodeURIComponent(offer.id)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Não foi possível atualizar o status do card.');
    window.EconomizaiUI?.toast(`Card definido como “${labels[nextStatus]}”.`, 'success');
    await load();
  } catch (error) {
    window.EconomizaiUI?.toast(error.message, 'error');
    buttons.forEach((button) => { button.disabled = false; });
  }
}

function renderBulkActions() {
  if (!selectedStatus) {
    bulkActions.hidden = true;
    bulkActions.replaceChildren();
    return;
  }
  const total = offers.filter((offer) => statusOf(offer) === selectedStatus).length;
  const label = document.createElement('span');
  label.className = 'bulk-status-actions__label';
  label.textContent = `${total} ${total === 1 ? 'card neste filtro' : 'cards neste filtro'}: alterar até`;
  const quantityLabel = document.createElement('label');
  quantityLabel.className = 'bulk-status-actions__quantity';
  quantityLabel.textContent = 'Quantidade';
  const quantity = document.createElement('input');
  quantity.id = 'bulkQuantity';
  quantity.type = 'number';
  quantity.min = '1';
  quantity.max = String(Math.min(total, 250));
  quantity.step = '1';
  quantity.value = String(Math.min(total, 25));
  quantity.title = `Escolha entre 1 e ${Math.min(total, 250)} cards por operação`;
  quantityLabel.append(quantity);
  bulkActions.replaceChildren(label);
  bulkActions.append(quantityLabel);
  (bulkOptions[selectedStatus] || []).forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.bulkStatus = option.status;
    button.textContent = option.label;
    button.addEventListener('click', () => changeAllFilteredCards(option.status));
    bulkActions.append(button);
  });
  bulkActions.hidden = false;
}

async function changeAllFilteredCards(nextStatus) {
  if (!selectedStatus || selectedStatus === nextStatus) return;
  const total = offers.filter((offer) => statusOf(offer) === selectedStatus).length;
  if (!total) return;
  const requested = Number.parseInt(document.getElementById('bulkQuantity')?.value, 10);
  const limit = Number.isInteger(requested) ? requested : 0;
  const maximum = Math.min(total, 250);
  if (limit < 1 || limit > maximum) {
    window.EconomizaiUI?.toast(`Informe uma quantidade entre 1 e ${maximum} cards.`, 'error');
    return;
  }
  const confirmation = window.EconomizaiUI?.ask
    ? await window.EconomizaiUI.ask({ title: 'Alterar cards em lote?', text: `${limit} de ${total} cards em “${labels[selectedStatus]}” serão definidos como “${labels[nextStatus]}”.`, label: 'Digite ALTERAR para confirmar.' })
    : window.prompt(`Digite ALTERAR para mudar ${limit} cards para “${labels[nextStatus]}”.`);
  if (confirmation !== 'ALTERAR') return;
  const buttons = [...bulkActions.querySelectorAll('button')];
  buttons.forEach((button) => { button.disabled = true; });
  try {
    const response = await fetch('/api/admin/ofertas/status-em-lote', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromStatus: selectedStatus, status: nextStatus, limit }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Não foi possível atualizar os cards.');
    window.EconomizaiUI?.toast(`${payload.updated || limit} card(s) atualizado(s) para “${labels[nextStatus]}”.`, 'success');
    await load();
  } catch (error) {
    window.EconomizaiUI?.toast(error.message, 'error');
    buttons.forEach((button) => { button.disabled = false; });
  }
}

async function scanAndRemoveInvertedPrices() {
  scanInvalidPrices.disabled = true;
  try {
    const response = await fetch('/api/admin/ofertas/precos-invertidos', { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Não foi possível verificar os preços.');
    if (!payload.count) {
      window.EconomizaiUI?.toast('Nenhum card importado com preço invertido foi encontrado.', 'success');
      return;
    }
    const confirmation = window.EconomizaiUI?.ask
      ? await window.EconomizaiUI.ask({ title: 'Remover cards com preços invertidos?', text: `${payload.count} card(s) importado(s) têm preço atual maior que o preço antigo e serão excluídos do banco e do site.`, label: 'Digite REMOVER para confirmar.' })
      : window.prompt(`Digite REMOVER para excluir ${payload.count} card(s) importado(s) com preço invertido.`);
    if (confirmation !== 'REMOVER') return;
    const deletion = await fetch('/api/admin/ofertas/remover-precos-invertidos', { method: 'POST' });
    const result = await deletion.json().catch(() => ({}));
    if (!deletion.ok) throw new Error(result.message || 'Não foi possível remover os cards.');
    window.EconomizaiUI?.toast(`${result.deleted || 0} card(s) com preço invertido foram removidos.`, 'success');
    await load();
  } catch (error) {
    window.EconomizaiUI?.toast(error.message || 'Não foi possível concluir a varredura.', 'error');
  } finally {
    scanInvalidPrices.disabled = false;
  }
}

function render() {
  const term = search.value.trim().toLocaleLowerCase('pt-BR');
  const visible = offers.filter((offer) => {
    const matchesSearch = !term || `${offer.title || ''} ${offer.category || ''} ${offer.subcategory || ''}`.toLocaleLowerCase('pt-BR').includes(term);
    return matchesSearch && (!selectedStatus || statusOf(offer) === selectedStatus);
  });
  const selectedLabel = selectedStatus ? labels[selectedStatus] : 'Todos os status';
  document.getElementById('cardsCounter').textContent = `${visible.length} ${visible.length === 1 ? 'card encontrado' : 'cards encontrados'} · ${selectedLabel}`;
  cards.replaceChildren(...visible.map((offer) => {
    const state = statusOf(offer);
    const row = document.createElement('article');
    row.className = `admin-offer-card status-${state}`;
    const discount = discountOf(offer);
    const rating = numberValue(offer.rating);
    const category = `${offer.category || 'Outros'}${offer.subcategory ? ` · ${offer.subcategory}` : ''}`;
    const image = offer.image
      ? `<img src="${escapeHtml(offer.image)}" alt="${escapeHtml(offer.title)}">`
      : '<span class="no-image">Imagem não informada</span>';
    const oldPrice = numberValue(offer.originalPrice) > numberValue(offer.currentPrice)
      ? `<div class="admin-price-old">De ${money(offer.originalPrice)}</div>`
      : '<div class="admin-price-old">&nbsp;</div>';
    const ratingText = rating > 0
      ? `<span class="star">★</span> <strong>${String(offer.rating).replace('.', ',')}</strong>${offer.quantitySold ? ` <span>👍 ${escapeHtml(String(offer.quantitySold).replace(/^\s*\|\s*/, '').trim())}</span>` : (offer.reviewCount ? ` <span>(${escapeHtml(offer.reviewCount)} avaliações)</span>` : '')}`
      : 'Avaliação não informada';
    row.innerHTML = `<div class="admin-card-media">${image}<span class="store-badge">${marketplaceLabel(offer)}</span><span class="offer-status">${labels[state]}</span></div><div class="admin-card-body"><p class="admin-card-category">${escapeHtml(category)}</p><div class="admin-card-title">${escapeHtml(offer.title)}</div><div class="admin-card-rating">${ratingText}</div><div class="admin-price-block">${oldPrice}<div class="admin-price-current"><small>Por</small><strong>${money(offer.currentPrice)}</strong>${discount ? `<span class="admin-discount">-${discount}% OFF</span>` : ''}</div></div><div class="quick-status" aria-label="Alterar status do card"><button class="quick-publish${state === 'available' ? ' is-active' : ''}" type="button" data-quick-status="available"${state === 'available' ? ' disabled' : ''}>Publicar</button><button class="quick-pending${state === 'pending' ? ' is-active' : ''}" type="button" data-quick-status="pending"${state === 'pending' ? ' disabled' : ''}>Aguardar</button><button class="quick-unavailable${state === 'unavailable' ? ' is-active' : ''}" type="button" data-quick-status="unavailable"${state === 'unavailable' ? ' disabled' : ''}>Indisponível</button></div><div class="card-actions"><a href="admin.html?cadastro=1&editar=${encodeURIComponent(offer.id)}">Editar</a><button class="delete" type="button">Excluir</button></div></div>`;
    row.querySelectorAll('[data-quick-status]').forEach((button) => button.addEventListener('click', () => changeOfferStatus(offer, button.dataset.quickStatus, row)));
    row.querySelector('.delete').addEventListener('click', () => removeOffer(offer, row.querySelector('.delete')));
    return row;
  }));
  hint.textContent = visible.length ? '' : (term ? 'Nenhum card encontrado para essa busca.' : selectedStatus ? `Nenhum card em “${labels[selectedStatus]}”.` : 'Nenhum card cadastrado ainda.');
  renderBulkActions();
}

async function load() {
  hint.textContent = 'Carregando cards…';
  try {
    const response = await fetch('/api/admin/ofertas', { cache: 'no-store' });
    const payload = await response.json().catch(() => []);
    if (!response.ok) throw new Error();
    offers = Array.isArray(payload) ? payload : [];
    updateMetrics(); render();
  } catch {
    hint.textContent = 'Não foi possível carregar os cards. Entre novamente como administrador e tente de novo.';
  }
}

search.addEventListener('input', render);
scanInvalidPrices.addEventListener('click', scanAndRemoveInvertedPrices);
document.querySelectorAll('[data-status-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    const nextStatus = button.dataset.statusFilter;
    selectedStatus = selectedStatus === nextStatus ? null : nextStatus;
    document.querySelectorAll('[data-status-filter]').forEach((metric) => {
      const active = metric.dataset.statusFilter === selectedStatus;
      metric.classList.toggle('is-selected', active);
      metric.setAttribute('aria-pressed', String(active));
      metric.querySelector('span').textContent = active ? 'Filtro ativo · clique para limpar' : 'Ver cards';
    });
    render();
  });
});
load();

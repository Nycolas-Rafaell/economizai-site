const content = document.getElementById('content');
const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const escapeHtml = (value) => String(value || '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

async function load() {
  const session = await fetch('/api/auth/session', { cache: 'no-store' });
  if (!session.ok) return location.replace('/login.html');
  const [alertsResponse, offersResponse] = await Promise.all([fetch('/api/alerts', { cache: 'no-store' }), fetch('/api/ofertas', { cache: 'no-store' })]);
  if (!alertsResponse.ok) throw new Error();
  const { alerts } = await alertsResponse.json();
  const offers = await offersResponse.json();
  const byId = new Map(offers.map((item) => [item.id, item]));
  return alerts.map((alert) => ({ ...alert, offer: byId.get(alert.externalProductId) })).filter((item) => item.offer);
}

async function render() {
  try {
    const alerts = await load();
    if (!alerts.length) {
      content.className = 'empty';
      content.innerHTML = 'Você ainda não criou alertas de preço.<br><br><a href="index.html">Ver ofertas</a>';
      return;
    }
    content.className = 'grid';
    content.replaceChildren(...alerts.map((item) => {
      const offer = item.offer;
      const card = document.createElement('article');
      card.className = 'card';
      const image = offer.image ? `<img src="${escapeHtml(offer.image)}" alt="${escapeHtml(offer.title)}">` : '';
      const discount = offer.discountPct ? `<span class="discount-flag">-${escapeHtml(offer.discountPct)}%</span>` : '';
      const old = offer.originalPrice ? `<div class="price-old-row"><span class="price-old-label">De</span><span class="price-old">${money(offer.originalPrice)}</span></div>` : '';
      const store = offer.marketplace === 'shopee' ? 'Shopee' : 'Mercado Livre';
      const state = item.triggered_at ? '<strong>Preço atingido!</strong> Confira a oferta.' : `Meta: <strong>${money(item.target_price)}</strong>`;
      card.innerHTML = `<div class="card-media">${image}${discount}<span class="store-badge">${store}</span></div><div class="card-body"><div class="card-title">${escapeHtml(offer.title)}</div><div class="price-block">${old}<div class="price-new-row"><span class="price-new-label">Por</span><span class="price-new">${money(offer.currentPrice)}</span></div></div><div class="alert-meta">${state}</div><div class="card-actions"><a class="card-cta" href="produto-dinamico.html?id=${encodeURIComponent(offer.id)}">Ver oferta</a><button class="remove" type="button">Remover</button></div></div>`;
      card.querySelector('.remove').addEventListener('click', async () => {
        const response = await fetch(`/api/alerts/${encodeURIComponent(offer.id)}`, { method: 'DELETE' });
        if (response.ok) render(); else window.EconomizaiUI?.toast('Não foi possível remover o alerta agora.', 'error');
      });
      return card;
    }));
  } catch {
    content.className = 'empty';
    content.textContent = 'Não foi possível carregar seus alertas agora.';
  }
}

render();

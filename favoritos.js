const content = document.getElementById('content');
const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const escapeHtml = (value) => String(value || '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

async function loadFavorites() {
  const session = await fetch('/api/auth/session', { cache: 'no-store' });
  if (!session.ok) return window.location.replace('/login.html');
  const favoriteResponse = await fetch('/api/favorites', { cache: 'no-store' });
  if (!favoriteResponse.ok) throw new Error('Não foi possível carregar seus favoritos.');
  const { ids } = await favoriteResponse.json();
  const offers = await (await fetch('/api/ofertas', { cache: 'no-store' })).json();
  return offers.filter((offer) => ids.includes(offer.id));
}

function empty() { content.className = 'empty'; content.innerHTML = 'Você ainda não favoritou nenhum produto.<br><br><a href="index.html">Ver ofertas</a>'; }
async function render() {
  try {
    const offers = await loadFavorites();
    if (!offers.length) return empty();
    content.className = 'grid'; content.replaceChildren();
    offers.forEach((offer) => {
      const card = document.createElement('article'); card.className = 'card';
      const image = offer.image ? `<img src="${escapeHtml(offer.image)}" alt="${escapeHtml(offer.title)}">` : '';
      card.innerHTML = `<div class="media">${image}<button class="star" title="Remover dos favoritos" aria-label="Remover ${escapeHtml(offer.title)} dos favoritos">★</button></div><div class="body"><div class="title">${escapeHtml(offer.title)}</div><div class="price">${money(offer.currentPrice)}</div><a class="open" href="produto-dinamico.html?id=${encodeURIComponent(offer.id)}">Ver oferta</a></div>`;
      card.querySelector('.star').addEventListener('click', async () => { const response = await fetch(`/api/favorites/${encodeURIComponent(offer.id)}`, { method: 'DELETE' }); if (response.ok) render(); });
      content.append(card);
    });
  } catch { content.className = 'empty'; content.textContent = 'Não foi possível carregar os favoritos agora.'; }
}
render();

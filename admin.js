const status = document.getElementById('status');
const manualForm = document.getElementById('manualForm');
const savedOffers = document.getElementById('savedOffers');
const savedEmpty = document.getElementById('savedEmpty');
let editingId = null;
let offers = [];

const field = (id) => document.getElementById(id);
const formatPrice = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function selectMode(mode) {
  document.querySelectorAll('[data-mode]').forEach((item) => item.classList.toggle('active', item.dataset.mode === mode));
  document.querySelectorAll('[data-panel]').forEach((panel) => { panel.hidden = panel.dataset.panel !== mode; });
}

document.querySelectorAll('[data-mode]').forEach((tab) => tab.addEventListener('click', () => { selectMode(tab.dataset.mode); status.hidden = true; }));

async function submitOffer(form, endpoint, data, loadingMessage, method = 'POST') {
  const button = form.querySelector('.submit');
  button.disabled = true; status.hidden = false; status.className = 'status'; status.textContent = loadingMessage;
  try {
    const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const offer = await response.json();
    if (!response.ok) throw new Error(offer.message || 'Não foi possível salvar o card.');
    status.className = 'status success'; status.innerHTML = `Card salvo: <strong>${offer.title}</strong>. <a href="index.html" style="color:inherit">Ver no site</a>`;
    cancelEdit(); await loadOffers();
  } catch (error) { status.className = 'status error'; status.textContent = error.message; }
  finally { button.disabled = false; }
}

field('checkConnection').addEventListener('click', async (event) => { const button = event.currentTarget; button.disabled = true; status.hidden = false; status.className = 'status'; status.textContent = 'Verificando o token…'; try { const response = await fetch('/api/admin/status', { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Não foi possível verificar o token.'); status.className = 'status success'; status.textContent = `Conexão válida para a conta ${data.conta}. ${data.aviso}`; } catch (error) { status.className = 'status error'; status.textContent = error.message; } finally { button.disabled = false; } });
field('reauthorize').addEventListener('click', () => { window.location.href = '/api/admin/connect'; });

field('automaticForm').addEventListener('submit', (event) => { event.preventDefault(); submitOffer(event.currentTarget, '/api/admin/ofertas', { publicUrl: field('autoPublicUrl').value.trim(), affiliateUrl: field('autoAffiliateUrl').value.trim(), category: field('autoCategory').value }, 'Consultando o Mercado Livre e criando o card…'); });

function manualData() { return { marketplace: field('manualMarketplace').value, title: field('manualTitle').value.trim(), image: field('manualImage').value.trim(), description: field('manualDescription').value.trim(), reviewSummary: field('manualReviewSummary').value.trim(), rating: field('manualRating').value.trim(), reviewCount: field('manualReviewCount').value.trim(), commentCount: field('manualCommentCount').value.trim(), currentPrice: field('manualCurrentPrice').value.trim(), originalPrice: field('manualOriginalPrice').value.trim(), publicUrl: field('manualPublicUrl').value.trim(), affiliateUrl: field('manualAffiliateUrl').value.trim(), category: field('manualCategory').value, freeShipping: field('manualFreeShipping').checked }; }
manualForm.addEventListener('submit', (event) => { event.preventDefault(); submitOffer(manualForm, editingId ? `/api/admin/ofertas/${encodeURIComponent(editingId)}` : '/api/admin/ofertas/manual', manualData(), editingId ? 'Salvando alterações…' : 'Criando o card manualmente…', editingId ? 'PUT' : 'POST'); });

function cancelEdit() { editingId = null; manualForm.reset(); field('manualHeading').textContent = 'Modo manual'; field('manualSubmit').textContent = 'Criar card manualmente'; field('cancelEdit').hidden = true; }
field('cancelEdit').addEventListener('click', cancelEdit);

function editOffer(offer) { editingId = offer.id; selectMode('manual'); field('manualHeading').textContent = 'Editar card'; field('manualSubmit').textContent = 'Salvar alterações'; field('cancelEdit').hidden = false; field('manualMarketplace').value = offer.marketplace === 'shopee' ? 'shopee' : 'mercado_livre'; field('manualTitle').value = offer.title || ''; field('manualImage').value = offer.image || ''; field('manualDescription').value = offer.description || ''; field('manualReviewSummary').value = offer.reviewSummary || ''; field('manualRating').value = offer.rating || ''; field('manualReviewCount').value = offer.reviewCount || ''; field('manualCommentCount').value = offer.commentCount || ''; field('manualCurrentPrice').value = offer.currentPrice ?? ''; field('manualOriginalPrice').value = offer.originalPrice ?? ''; field('manualPublicUrl').value = offer.publicUrl || ''; field('manualAffiliateUrl').value = offer.affiliateUrl || ''; field('manualCategory').value = offer.category || 'outros'; field('manualFreeShipping').checked = Boolean(offer.freeShipping); window.scrollTo({ top: 0, behavior: 'smooth' }); }

async function loadOffers() { try { const response = await fetch('/api/admin/ofertas', { cache: 'no-store' }); offers = await response.json(); savedOffers.innerHTML = ''; savedEmpty.textContent = offers.length ? '' : 'Nenhum card cadastrado ainda.'; offers.forEach((offer) => { const row = document.createElement('article'); row.className = 'saved-card'; const text = document.createElement('div'); const title = document.createElement('strong'); title.textContent = offer.title; const info = document.createElement('small'); info.textContent = `${formatPrice(offer.currentPrice)} · ${offer.category || 'outros'}`; text.append(title, info); const button = document.createElement('button'); button.className = 'edit'; button.type = 'button'; button.textContent = 'Editar'; button.addEventListener('click', () => editOffer(offer)); row.append(text, button); savedOffers.append(row); }); } catch { savedEmpty.textContent = 'Não foi possível carregar os cards cadastrados.'; } }

loadOffers();

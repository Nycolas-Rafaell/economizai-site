const byId = (id) => document.getElementById(id);
const number = new Intl.NumberFormat('pt-BR');

function rankList(target, items, emptyText) {
  target.innerHTML = '';
  if (!items.length) { target.innerHTML = `<p class="empty-data">${emptyText}</p>`; return; }
  items.forEach((item, index) => {
    const row = document.createElement('li');
    row.innerHTML = `<span class="rank-position">${index + 1}</span><span class="rank-name" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span><span class="rank-value">${number.format(item.value)}</span>`;
    target.append(row);
  });
}

function escapeHtml(value) { return String(value || '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[c]); }

function renderDaily(days) {
  const chart = byId('dailyChart'); chart.innerHTML = '';
  const highest = Math.max(1, ...days.map((day) => day.value));
  if (!days.some((day) => day.value)) { chart.innerHTML = '<p class="chart-empty">Ainda não há acessos registrados neste período.</p>'; return; }
  days.forEach((day, index) => {
    const column = document.createElement('div'); column.className = 'chart-column';
    column.title = `${day.label}: ${number.format(day.value)} acessos`;
    column.innerHTML = `<i style="height:${Math.max(3, (day.value / highest) * 100)}%"></i>${(days.length <= 14 || index % Math.ceil(days.length / 8) === 0 || index === days.length - 1) ? `<span>${day.shortLabel}</span>` : ''}`;
    chart.append(column);
  });
}

function renderBars(target, items, emptyText) {
  target.innerHTML = '';
  if (!items.length) { target.innerHTML = `<p class="empty-data">${emptyText}</p>`; return; }
  const highest = Math.max(...items.map((item) => item.value), 1);
  items.forEach((item) => {
    const row = document.createElement('div'); row.innerHTML = `<div class="bar-item-head"><span>${escapeHtml(item.label)}</span><span>${number.format(item.value)}</span></div><div class="bar-track"><i style="width:${(item.value / highest) * 100}%"></i></div>`;
    target.append(row);
  });
}

function renderCatalog(catalog) {
  byId('catalogSummary').innerHTML = [
    ['available', 'Disponíveis', catalog.available], ['pending', 'Em pausa', catalog.pending], ['unavailable', 'Indisponíveis', catalog.unavailable],
  ].map(([state, label, value]) => `<div class="${state}"><b>${number.format(value || 0)}</b><span>${label}</span></div>`).join('');
}

async function loadAnalytics() {
  const days = byId('period').value; const status = byId('status');
  status.className = 'analytics-status'; status.textContent = 'Atualizando dados…';
  try {
    const response = await fetch(`/api/admin/analytics?days=${encodeURIComponent(days)}`, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Não foi possível carregar as análises.');
    byId('pageViews').textContent = number.format(data.metrics.pageViews);
    byId('visitors').textContent = number.format(data.metrics.visitors);
    byId('offerViews').textContent = number.format(data.metrics.offerViews);
    byId('affiliateClicks').textContent = number.format(data.metrics.affiliateClicks);
    byId('interestRate').textContent = `${data.metrics.interestRate}% de interesse`;
    renderDaily(data.daily);
    rankList(byId('topOffers'), data.topOffers, 'Nenhuma oferta foi aberta neste período.');
    rankList(byId('topCategories'), data.topCategories, 'Nenhuma categoria foi acessada neste período.');
    renderBars(byId('marketplaces'), data.marketplaces, 'Nenhum clique em loja foi registrado neste período.');
    renderCatalog(data.catalog);
    status.textContent = `Dados dos últimos ${data.periodDays} dias · atualização em tempo real.`;
  } catch (error) { status.className = 'analytics-status error'; status.textContent = error.message; }
}

byId('period').addEventListener('change', loadAnalytics);
loadAnalytics();

// Métricas anônimas do Economizaí. Não envia nome, e-mail, telefone ou IP.
(() => {
  const excludedPages = new Set(['/admin.html', '/admin-cards.html', '/reportes.html', '/analytics.html', '/login.html', '/conta.html']);
  if (excludedPages.has(location.pathname)) return;

  const storageKey = 'economizai-analytics-session';
  let sessionId = sessionStorage.getItem(storageKey);
  if (!sessionId) {
    sessionId = typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
    sessionStorage.setItem(storageKey, sessionId);
  }

  const clean = (value, max = 120) => String(value || '').trim().slice(0, max);
  const slug = (value) => clean(value, 70).toLowerCase().replace(/[^a-z0-9-]/g, '');
  const track = (eventType, details = {}) => {
    const body = JSON.stringify({
      eventType: clean(eventType, 30),
      sessionId,
      pagePath: clean(location.pathname, 180) || '/',
      offerId: clean(details.offerId, 120) || null,
      category: slug(details.category) || null,
    });
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  };

  window.EconomizaiAnalytics = { track };
  track('page_view');

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href*="categoria="]');
    if (!link) return;
    try { track('category_view', { category: new URL(link.href, location.href).searchParams.get('categoria') }); } catch {}
  });
})();

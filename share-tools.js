// Compartilhamento gratuito: usa os links oficiais das redes e a URL pública do Economizaí.
(() => {
  const cleanUrl = () => `${location.origin}${location.pathname}${location.search}`;
  const escapeHtml = (value) => String(value || '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

  function shareText(title) { return `Encontrei esta oferta no Economizaí: ${title}`; }
  function open(url) { window.open(url, '_blank', 'noopener,noreferrer'); }

  async function copy(url, feedback) {
    try {
      await navigator.clipboard.writeText(url);
      feedback.textContent = 'Link da página do Economizaí copiado.';
    } catch {
      const input = document.createElement('input'); input.value = url; document.body.append(input); input.select(); document.execCommand('copy'); input.remove();
      feedback.textContent = 'Link da página do Economizaí copiado.';
    }
  }

  function mount(options = {}) {
    const host = options.host || document.querySelector('[data-share-tools]') || document.querySelector('.action-row') || document.querySelector('.product .panel, .price-panel');
    if (!host) return;
    host.querySelector('.economizai-share-tools')?.remove();
    const url = cleanUrl();
    const title = String(options.title || document.querySelector('h1')?.textContent || document.title || 'Oferta').trim();
    const text = shareText(title);
    const encodedUrl = encodeURIComponent(url); const encodedText = encodeURIComponent(text);
    const section = document.createElement('section'); section.className = 'economizai-share-tools'; section.setAttribute('aria-label', 'Compartilhar esta oferta');
    section.innerHTML = `<button class="share-trigger" type="button" title="Compartilhar oferta" aria-label="Compartilhar oferta" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l4 4-4 4M19 9H9a5 5 0 0 0-5 5v1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 14v4a2 2 0 0 1-2 2H7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="share-visually-hidden">Compartilhar oferta</span></button><div class="share-menu" hidden><h2>Compartilhar oferta</h2><p>Você compartilhará a página do Economizaí.</p><div class="economizai-share-actions"><button class="share-copy" type="button">⧉ Copiar link</button><button class="share-whatsapp" type="button">WhatsApp</button><button class="share-facebook" type="button">Facebook</button><button class="share-x" type="button">X</button><button class="share-telegram" type="button">Telegram</button>${navigator.share ? '<button class="share-native" type="button">Mais opções</button>' : ''}</div><p class="economizai-share-feedback" aria-live="polite"></p></div>`;
    host.append(section);
    const trigger = section.querySelector('.share-trigger'); const menu = section.querySelector('.share-menu');
    const feedback = section.querySelector('.economizai-share-feedback');
    const close = () => { menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); };
    trigger.addEventListener('click', () => { menu.hidden = !menu.hidden; trigger.setAttribute('aria-expanded', String(!menu.hidden)); });
    section.querySelector('.share-copy').addEventListener('click', () => copy(url, feedback));
    section.querySelector('.share-whatsapp').addEventListener('click', () => open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`));
    section.querySelector('.share-facebook').addEventListener('click', () => open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`));
    section.querySelector('.share-x').addEventListener('click', () => open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`));
    section.querySelector('.share-telegram').addEventListener('click', () => open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`));
    section.querySelector('.share-native')?.addEventListener('click', async () => {
      try { await navigator.share({ title, text, url }); } catch {}
    });
    document.addEventListener('click', (event) => { if (!section.contains(event.target)) close(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  }

  window.EconomizaiShareTools = { mount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mount()); else mount();
})();

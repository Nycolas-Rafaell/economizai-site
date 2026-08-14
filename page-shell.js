// Cabeçalho e rodapé comuns. Novas páginas devem usar <header data-site-header></header>
// e <footer data-site-footer></footer> para receber a navegação automaticamente.
const socialLinks = { YouTube: 'https://www.youtube.com/@reiwo', Instagram: 'https://www.instagram.com/reiwooficial/', Twitch: 'https://www.twitch.tv/reiwooficial', TikTok: 'https://www.tiktok.com/@reiwooficial_' };
const categoryGroups = [
  { id: 'games', label: 'Games', subs: [['Console', 'Consoles'], ['Jogo', 'Jogos'], ['Controle', 'Controles']] },
  { id: 'hardware', label: 'Hardware', subs: [['SSD', 'SSD e armazenamento'], ['Placa de vídeo', 'Placas de vídeo']] },
  { id: 'informatica', label: 'Informática', subs: [['Notebook', 'Notebooks'], ['Impressora', 'Impressoras']] },
  { id: 'perifericos', label: 'Periféricos', subs: [['Headset', 'Headsets'], ['Microfone', 'Microfones'], ['Teclado', 'Teclados'], ['Mouse', 'Mouses']] },
  { id: 'smartphones', label: 'Celulares e Tablets', subs: [['Smartphone', 'Celulares'], ['Tablet', 'Tablets']] },
  { id: 'tvs-audio', label: 'TVs e Áudio', subs: [['TV', 'TVs'], ['Fone de ouvido', 'Fones de ouvido']] },
  { id: 'casa-cozinha', label: 'Casa e Cozinha' }, { id: 'bebes', label: 'Bebês e Crianças' },
  { id: 'saude-beleza', label: 'Saúde e Beleza' }, { id: 'ferramentas-auto', label: 'Ferramentas e Auto' },
  { id: 'moda-acessorios', label: 'Moda e Acessórios' }, { id: 'outros', label: 'Outros' },
];

function links(items) { return Object.entries(items).map(([label, url]) => `<a href="${url}"${url.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`).join(''); }
function toggleMenu() { document.getElementById('siteMenu')?.classList.toggle('open'); }
function toggleCategoryGroup(button) { const group = button.closest('.category-group'); const open = !group.classList.contains('open'); group.classList.toggle('open', open); button.setAttribute('aria-expanded', String(open)); }
function categoryMenu() {
  return `<a class="category-all" href="index.html#ofertas">Todas as ofertas</a>${categoryGroups.map(({ id, label, subs }) => {
    const categoryUrl = `index.html?categoria=${encodeURIComponent(id)}#ofertas`;
    if (!subs) return `<a class="category-primary" href="${categoryUrl}">${label}</a>`;
    return `<div class="category-group"><button class="category-toggle" type="button" aria-expanded="false" onclick="toggleCategoryGroup(this)">${label}</button><div class="subcategory-list"><a class="category-all" href="${categoryUrl}">Ver tudo em ${label}</a>${subs.map(([key, name]) => `<a class="subcategory-link" href="${categoryUrl.replace('#ofertas', `&subcategoria=${encodeURIComponent(key)}#ofertas`)}">${name}</a>`).join('')}</div></div>`;
  }).join('')}`;
}
window.toggleMenu = toggleMenu;
window.toggleCategoryGroup = toggleCategoryGroup;

const footer = document.querySelector('[data-site-footer]') || document.querySelector('.site-footer');
if (footer) footer.innerHTML = `<div class="footer-grid"><div><div class="footer-brand">ECONOMIZAÍ<small>Um projeto ReiWO.</small></div></div><div class="footer-col"><h2>NAVEGAÇÃO</h2>${links({'Início e ofertas':'index.html','Sobre o Economizaí':'sobre.html',Contato:'contato.html'})}</div><div class="footer-col"><h2>INSTITUCIONAL</h2>${links({'Como encontramos as ofertas':'como-encontramos-ofertas.html',Transparência:'transparencia.html','Política de Privacidade':'privacidade.html','Termos de Uso':'termos.html','Política de Cookies':'cookies.html'})}</div><div class="footer-col"><h2>REIWO</h2>${links(socialLinks)}</div></div><p class="affiliate-note">O Economizaí pode receber comissão por meio de determinados links de afiliados. Isso não gera custo adicional para você. Preços e condições podem ser alterados pelas lojas sem aviso prévio.</p><p class="copyright">© 2026 Economizaí. Todos os direitos reservados.</p>`;

let header = document.querySelector('[data-site-header]');
if (!header) {
  const legacyNav = document.querySelector('.top-nav');
  if (legacyNav) {
    header = document.createElement('header');
    const legacyTicker = legacyNav.previousElementSibling?.classList.contains('ticker') ? legacyNav.previousElementSibling : null;
    if (legacyTicker) legacyTicker.replaceWith(header); else legacyNav.before(header);
    legacyNav.remove();
  }
}

if (header) {
  header.innerHTML = `<div class="ticker">ECONOMIZE MAIS • COMPRE MELHOR • AS MELHORES OFERTAS, SEMPRE!</div><nav class="top-nav common-nav"><a class="nav-link nav-back" href="index.html">← Ofertas</a><button class="nav-btn" type="button" onclick="toggleMenu()">☰ Categorias</button><a class="nav-link" href="contato.html">Contato</a><div class="common-nav-right"><a class="nav-link account-login" href="login.html">Entrar</a><a class="nav-link admin-link" href="admin.html" hidden>Painel admin</a><div class="common-profile" hidden><button class="common-profile-trigger" type="button" aria-expanded="false"><img alt=""><span></span>⌄</button><div class="common-profile-dropdown" hidden><a href="conta.html">Minha conta</a><a href="favoritos.html">Meus favoritos</a><a href="alertas.html">Meus Alertas</a><button type="button">Sair</button></div></div></div></nav><aside class="drawer category-drawer" id="siteMenu"><button class="drawer-close" onclick="toggleMenu()" aria-label="Fechar">×</button><h2>Categorias</h2>${categoryMenu()}<h3>Links</h3><a href="contato.html">Contato</a>${links(socialLinks)}</aside>`;
  fetch('/api/auth/session', { cache: 'no-store' }).then(async (response) => {
    if (!response.ok) return;
    const session = await response.json();
    header.querySelector('.account-login').hidden = true;
    const profile = header.querySelector('.common-profile');
    const trigger = header.querySelector('.common-profile-trigger');
    const dropdown = header.querySelector('.common-profile-dropdown');
    profile.hidden = false;
    trigger.querySelector('img').src = session.avatarUrl || `assets/avatars/${session.avatarId || 'avatar-1'}.png`;
    trigger.querySelector('span').textContent = session.displayName || session.name || session.email.split('@')[0];
    if (session.isAdmin) header.querySelector('.admin-link').hidden = false;
    trigger.addEventListener('click', () => { dropdown.hidden = !dropdown.hidden; trigger.setAttribute('aria-expanded', String(!dropdown.hidden)); });
    document.addEventListener('click', (event) => { if (!profile.contains(event.target)) { dropdown.hidden = true; trigger.setAttribute('aria-expanded', 'false'); } });
    dropdown.querySelector('button').addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.assign('index.html'); });
  }).catch(() => {});
}

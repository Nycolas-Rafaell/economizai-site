// Cabeçalho e rodapé comuns. Novas páginas devem usar <header data-site-header></header>
// e <footer data-site-footer></footer> para receber a navegação automaticamente.
const socialLinks = { YouTube: 'https://www.youtube.com/@reiwo', Instagram: 'https://www.instagram.com/reiwooficial/', Twitch: 'https://www.twitch.tv/reiwooficial', TikTok: 'https://www.tiktok.com/@reiwooficial_' };
let categoryGroups = window.ECONOMIZAI_CATEGORIES || [
  { id: 'games', label: 'Games', subs: [['Console', 'Consoles'], ['Jogo', 'Jogos'], ['Controle', 'Controles'], ['Cadeira gamer', 'Cadeiras gamer'], ['Acessório gamer', 'Acessórios gamer']] },
  { id: 'hardware', label: 'Hardware', subs: [['SSD', 'SSD e armazenamento'], ['Memória RAM', 'Memórias RAM'], ['Placa de vídeo', 'Placas de vídeo'], ['Processador', 'Processadores'], ['Placa-mãe', 'Placas-mãe'], ['Fonte', 'Fontes']] },
  { id: 'informatica', label: 'Informática', subs: [['Notebook', 'Notebooks'], ['Computador', 'Computadores'], ['Impressora', 'Impressoras'], ['Câmera', 'Câmeras'], ['Rede', 'Redes e conectividade']] },
  { id: 'perifericos', label: 'Periféricos', subs: [['Headset', 'Headsets'], ['Microfone', 'Microfones'], ['Teclado', 'Teclados'], ['Mouse', 'Mouses'], ['Monitor', 'Monitores'], ['Webcam', 'Webcams']] },
  { id: 'smartphones', label: 'Celulares e Tablets', subs: [['Smartphone', 'Celulares'], ['Tablet', 'Tablets'], ['Smartwatch', 'Smartwatches'], ['Acessório', 'Capas e acessórios'], ['Carregador', 'Carregadores']] },
  { id: 'tvs-audio', label: 'TVs e Áudio', subs: [['TV', 'TVs'], ['Fone de ouvido', 'Fones de ouvido'], ['Caixa de som', 'Caixas de som'], ['Soundbar', 'Soundbars'], ['Projetor', 'Projetores']] },
  { id: 'casa-cozinha', label: 'Casa e Cozinha', subs: [['Eletrodoméstico', 'Eletrodomésticos'], ['Cozinha', 'Utensílios de cozinha'], ['Limpeza', 'Limpeza'], ['Organização', 'Organização'], ['Móveis', 'Móveis e decoração']] },
  { id: 'bebes', label: 'Bebês e Crianças', subs: [['Higiene', 'Higiene'], ['Fraldas', 'Fraldas'], ['Alimentação', 'Alimentação'], ['Brinquedo infantil', 'Brinquedos'], ['Passeio', 'Passeio e segurança']] },
  { id: 'saude-beleza', label: 'Saúde e Beleza', subs: [['Cuidados pessoais', 'Cuidados pessoais'], ['Skincare', 'Skincare'], ['Maquiagem', 'Maquiagem'], ['Perfume', 'Perfumes'], ['Suplemento', 'Suplementos']] },
  { id: 'ferramentas-auto', label: 'Ferramentas e Auto', subs: [['Ferramenta', 'Ferramentas'], ['Acessório automotivo', 'Acessórios automotivos'], ['Pneu', 'Pneus'], ['Manutenção', 'Manutenção'], ['Moto', 'Peças para moto']] },
  { id: 'moda-acessorios', label: 'Moda e Acessórios', subs: [['Roupa', 'Roupas'], ['Calçado', 'Calçados'], ['Bolsa', 'Bolsas'], ['Relógio', 'Relógios'], ['Joia', 'Joias e acessórios']] },
  { id: 'esporte-lazer', label: 'Esporte e Lazer', subs: [['Academia', 'Academia e musculação'], ['Ciclismo', 'Ciclismo'], ['Camping', 'Camping e aventura'], ['Esporte', 'Esportes'], ['Lazer', 'Lazer ao ar livre']] },
  { id: 'pet-shop', label: 'Pet Shop', subs: [['Ração', 'Rações'], ['Higiene pet', 'Higiene'], ['Brinquedo pet', 'Brinquedos'], ['Acessório pet', 'Acessórios'], ['Saúde pet', 'Saúde e cuidados']] },
  { id: 'supermercado', label: 'Supermercado', subs: [['Alimento', 'Alimentos'], ['Bebida', 'Bebidas'], ['Limpeza doméstica', 'Limpeza'], ['Papelaria doméstica', 'Papel e descartáveis'], ['Pet food', 'Produtos para pets']] },
  { id: 'livros-papelaria', label: 'Livros e Papelaria', subs: [['Livro', 'Livros'], ['Papelaria', 'Papelaria'], ['Arte', 'Arte e artesanato'], ['Instrumento musical', 'Instrumentos musicais'], ['Colecionável', 'Colecionáveis']] },
  { id: 'outros', label: 'Outros', subs: [['Outro', 'Outros produtos']] },
];

function links(items) { return Object.entries(items).map(([label, url]) => `<a href="${url}"${url.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`).join(''); }
function toggleMenu() { document.getElementById('siteMenu')?.classList.toggle('open'); }
function goToPreviousPage(event) {
  event?.preventDefault();
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.assign('index.html');
}
function toggleCategoryGroup(button) { const group = button.closest('.category-group'); const open = !group.classList.contains('open'); group.classList.toggle('open', open); button.setAttribute('aria-expanded', String(open)); }
function categoryMenu() {
  return `<a class="category-all" href="index.html">Todas as ofertas</a>${categoryGroups.map(({ id, label, subs }) => {
    const categoryUrl = `index.html?categoria=${encodeURIComponent(id)}`;
    if (!subs) return `<a class="category-primary" href="${categoryUrl}">${label}</a>`;
    return `<div class="category-group"><button class="category-toggle" type="button" aria-expanded="false" onclick="toggleCategoryGroup(this)">${label}</button><div class="subcategory-list"><a class="category-all" href="${categoryUrl}">Ver tudo em ${label}</a>${subs.map(([key, name]) => `<a class="subcategory-link" href="${categoryUrl}&subcategoria=${encodeURIComponent(key)}">${name}</a>`).join('')}</div></div>`;
  }).join('')}`;
}
window.toggleMenu = toggleMenu;
window.goToPreviousPage = goToPreviousPage;
window.toggleCategoryGroup = toggleCategoryGroup;

const footer = document.querySelector('[data-site-footer]') || document.querySelector('.site-footer');
if (footer) footer.innerHTML = `<div class="footer-grid"><div><div class="footer-brand">ECONOMIZAÍ<small>Um projeto ReiWO.</small></div></div><div class="footer-col"><h2>NAVEGAÇÃO</h2>${links({'Início e ofertas':'index.html',Lojas:'lojas.html','Sobre o Economizaí':'sobre.html',Contato:'contato.html'})}</div><div class="footer-col"><h2>INSTITUCIONAL</h2>${links({'Como encontramos as ofertas':'como-encontramos-ofertas.html',Transparência:'transparencia.html','Política de Privacidade':'privacidade.html','Termos de Uso':'termos.html','Política de Cookies':'cookies.html'})}</div><div class="footer-col"><h2>REIWO</h2>${links(socialLinks)}</div></div><p class="affiliate-note">O Economizaí pode receber comissão por meio de determinados links de afiliados. Isso não gera custo adicional para você. Preços e condições podem ser alterados pelas lojas sem aviso prévio.</p><p class="copyright">© 2026 Economizaí. Todos os direitos reservados.</p>`;
if (footer) {
  const footerBrand = footer.querySelector('.footer-brand');
  if (footerBrand) footerBrand.innerHTML = '<a class="footer-logo" href="index.html" aria-label="Economizaí — início"><img src="assets/logo-economizai-completo.png" alt="Economizaí"></a><small>Um projeto ReiWO.</small><span class="footer-contact-label">Dúvidas ou divulgações?</span><a class="footer-contact" href="contato.html">Contato</a>';
  footer.querySelector('.footer-col a[href="contato.html"]')?.remove();
}

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
  header.innerHTML = `<div class="ticker">ECONOMIZE MAIS • COMPRE MELHOR • AS MELHORES OFERTAS, SEMPRE!</div><nav class="top-nav common-nav"><a class="nav-link nav-back nav-previous" href="index.html" aria-label="Voltar para a página anterior">← Página anterior</a><a class="nav-link nav-back nav-offers" href="index.html">⌂ Ofertas</a><button class="nav-btn" type="button" onclick="toggleMenu()">☰ Categorias</button><a class="nav-link" href="contato.html">Contato</a><div class="common-nav-right"><a class="nav-link account-login" href="login.html">Entrar</a><a class="nav-link admin-link" href="analytics.html" hidden>Painel admin</a><div class="common-profile" hidden><button class="common-profile-trigger" type="button" aria-expanded="false"><img alt=""><span></span>⌄</button><div class="common-profile-dropdown" hidden><a href="conta.html">Minha conta</a><a href="favoritos.html">Meus favoritos</a><a href="alertas.html">Meus Alertas</a><button type="button">Sair</button></div></div></div></nav><aside class="drawer category-drawer" id="siteMenu"><button class="drawer-close" onclick="toggleMenu()" aria-label="Fechar">×</button><h2>Categorias</h2>${categoryMenu()}<h3>Links</h3><a href="lojas.html">Ofertas por loja</a><a href="contato.html">Contato</a>${links(socialLinks)}</aside>`;
  header.querySelector('.nav-previous')?.addEventListener('click', goToPreviousPage);
  header.querySelector('.common-nav > a[href="contato.html"]')?.remove();
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
    trigger.addEventListener('click', () => {
      dropdown.hidden = !dropdown.hidden;
      trigger.setAttribute('aria-expanded', String(!dropdown.hidden));
    });
    document.addEventListener('click', (event) => { if (!profile.contains(event.target)) { dropdown.hidden = true; trigger.setAttribute('aria-expanded', 'false'); } });
    dropdown.querySelector('button').addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.assign('index.html'); });
  }).catch(() => {});
}

// Compatibilidade para páginas antigas: carrega o catálogo central mesmo quando
// a página só incluía page-shell.js. Assim toda a navegação permanece unificada.
if (!window.ECONOMIZAI_CATEGORIES) {
  const catalogScript = document.createElement('script');
  catalogScript.src = 'category-catalog.js';
  catalogScript.onload = () => {
    categoryGroups = window.ECONOMIZAI_CATEGORIES || categoryGroups;
    const drawer = document.getElementById('siteMenu');
    if (drawer) {
      drawer.innerHTML = `<button class="drawer-close" onclick="toggleMenu()" aria-label="Fechar">×</button><h2>Categorias</h2>${categoryMenu()}<h3>Links</h3><a href="lojas.html">Ofertas por loja</a><a href="contato.html">Contato</a>${links(socialLinks)}`;
    }
  };
  document.head.append(catalogScript);
}

const status = document.getElementById('status');
const manualForm = document.getElementById('manualForm');
const savedOffers = document.getElementById('savedOffers');
const savedEmpty = document.getElementById('savedEmpty');
const publishedHeading = document.createElement('h3');
publishedHeading.className = 'offer-list-heading'; publishedHeading.textContent = 'Cards publicados';
savedOffers.before(publishedHeading);
publishedHeading.after(savedEmpty);
const pendingHeading = document.createElement('h3');
pendingHeading.className = 'offer-list-heading pending-heading'; pendingHeading.textContent = 'Aguardando publicação';
const pendingEmpty = document.createElement('p');
pendingEmpty.className = 'hint'; pendingEmpty.textContent = 'Nenhum card aguardando publicação.';
const pendingOffers = document.createElement('div');
pendingOffers.id = 'pendingOffers';
savedOffers.after(pendingHeading, pendingEmpty, pendingOffers);
let editingId = null;
let preservedSpecifications = {};
let offers = [];

const field = (id) => document.getElementById(id);
const formatPrice = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

field('logout')?.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.replace('/login.html');
});

async function readServerJson(response) {
  const body = await response.text();
  try { return JSON.parse(body); }
  catch { throw new Error('O servidor respondeu com uma página inesperada. Reinicie com npm run dev e confirme que você abriu http://localhost:3000/admin.html.'); }
}

const screenshotImport = document.createElement('div');
screenshotImport.className = 'screenshot-import';
screenshotImport.innerHTML = '<label for="productScreenshot">Preencher por print ou PDF</label><p class="hint">Leitura gratuita no seu navegador. PDFs escaneados também passam por OCR, o que pode levar alguns instantes. Revise tudo antes de salvar.</p><input id="productScreenshot" type="file" accept="image/png,image/jpeg,image/webp,application/pdf"><button class="check" type="button" id="analyzeScreenshot">Ler arquivo e preencher campos</button><details id="extractedText" hidden><summary>Ver texto extraído</summary><pre></pre></details>';
manualForm.insertBefore(screenshotImport, manualForm.firstChild);

const refreshOffersButton = document.createElement('button');
refreshOffersButton.className = 'check';
refreshOffersButton.type = 'button';
refreshOffersButton.id = 'refreshOffers';
refreshOffersButton.textContent = 'Testar atualização de preços agora';
const refreshHint = document.createElement('p');
refreshHint.className = 'hint';
refreshHint.textContent = 'O servidor também tenta atualizar cards do Mercado Livre a cada 3 horas. Itens bloqueados pela API são ignorados e não sofrem alteração.';
manualForm.parentElement.insertBefore(refreshHint, manualForm);
manualForm.parentElement.insertBefore(refreshOffersButton, refreshHint);

const siteCategories = [
  ['perifericos', 'Periféricos'], ['hardware', 'Hardware'], ['informatica', 'Informática'],
  ['smartphones', 'Celulares e Tablets'], ['tvs-audio', 'TVs e Áudio'], ['games', 'Games'],
  ['casa-cozinha', 'Casa e Cozinha'], ['bebes', 'Bebês e Crianças'], ['saude-beleza', 'Saúde e Beleza'],
  ['ferramentas-auto', 'Ferramentas e Auto'], ['moda-acessorios', 'Moda e Acessórios'], ['outros', 'Outros'],
];
['manualCategory', 'searchCategory', 'autoCategory'].forEach((id) => {
  const select = field(id); if (!select) return;
  const selected = select.value;
  select.replaceChildren(...siteCategories.map(([value, label]) => {
    const option = document.createElement('option'); option.value = value; option.textContent = label; return option;
  }));
  select.value = siteCategories.some(([value]) => value === selected) ? selected : 'outros';
});

const productTypes = {
  perifericos: ['Headset', 'Microfone', 'Teclado', 'Mouse', 'Monitor', 'Webcam', 'Outro periférico'],
  hardware: ['SSD', 'Memória RAM', 'Placa de vídeo', 'Processador', 'Placa-mãe', 'Fonte', 'Outro hardware'],
  smartphones: ['Smartphone', 'Tablet', 'Smartwatch', 'Acessório'],
  'tvs-audio': ['TV', 'Caixa de som', 'Fone de ouvido', 'Soundbar', 'Outro áudio'],
  games: ['Console', 'Jogo', 'Controle', 'Acessório gamer'],
  informatica: ['Notebook', 'Impressora', 'Câmera', 'Acessório'],
  'casa-cozinha': ['Eletrodoméstico', 'Cozinha', 'Limpeza', 'Organização', 'Outro item para casa'],
  bebes: ['Higiene', 'Fraldas', 'Alimentação', 'Brinquedo infantil', 'Outro item infantil'],
  'saude-beleza': ['Cuidados pessoais', 'Skincare', 'Maquiagem', 'Suplemento', 'Outro item de beleza'],
  'ferramentas-auto': ['Ferramenta', 'Acessório automotivo', 'Pneu', 'Manutenção', 'Outro item'],
  'moda-acessorios': ['Roupa', 'Calçado', 'Relógio', 'Bolsa', 'Acessório'],
  outros: ['Outro'],
};
const technicalPanel = document.createElement('section');
technicalPanel.className = 'technical-panel';
technicalPanel.innerHTML = '<label for="manualSubcategory">Tipo do produto</label><select id="manualSubcategory"></select>';
field('manualCategory').parentElement.insertBefore(technicalPanel, field('manualCategory'));

const availabilityPanel = document.createElement('section');
availabilityPanel.className = 'technical-panel';
availabilityPanel.innerHTML = '<label for="manualAvailable">Status da oferta</label><select id="manualAvailable"><option value="available">Disponível no site</option><option value="unavailable">Oferta não disponível</option><option value="pending">Aguardando publicação</option></select>';
technicalPanel.after(availabilityPanel);

const availabilityStyles = document.createElement('style');
availabilityStyles.textContent = '.offer-list-heading{margin:26px 0 10px;font:800 15px Sora,system-ui;color:#f5f5f5}.offer-list-heading.pending-heading{color:#ffc42d}.saved-card{align-items:center}.saved-card>div:first-child{min-width:0;flex:1}.saved-card.status-available{border-color:#34c778}.saved-card.status-unavailable{border-color:#ef5a50}.saved-card.status-pending{border-color:#ffc42d}.saved-card .offer-status{display:inline-block;margin-top:5px;font-size:11px;font-weight:800}.saved-card.status-available .offer-status{color:#76e5a8}.saved-card.status-unavailable .offer-status{color:#ff8981}.saved-card.status-pending .offer-status{color:#ffc42d}.saved-card-actions{display:grid;grid-template-columns:repeat(2,112px);gap:8px;flex:0 0 auto}.saved-card .edit,.saved-card .delete{width:112px;min-height:42px;margin:0;padding:10px 12px;border-radius:9px;font:800 13px Inter,system-ui;cursor:pointer}.saved-card .delete{background:#241717;border:1px solid #8e3d39;color:#ff9c96}.saved-card .delete:hover{background:#3a1e1c;border-color:#ef5a50}@media(max-width:580px){.saved-card-actions{width:100%;grid-template-columns:repeat(2,minmax(0,1fr))}.saved-card .edit,.saved-card .delete{width:100%}}';
document.head.append(availabilityStyles);

function renderProductTypes() {
  const types = productTypes[field('manualCategory').value] || productTypes.outros;
  const subcategory = field('manualSubcategory');
  const selected = subcategory.value;
  subcategory.replaceChildren(...types.map((name) => { const option = document.createElement('option'); option.value = name; option.textContent = name; return option; }));
  subcategory.value = types.includes(selected) ? selected : types[0];
}

field('manualCategory').addEventListener('change', renderProductTypes);
renderProductTypes();

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
    const offer = await readServerJson(response);
    if (!response.ok) throw new Error(offer.message || 'Não foi possível salvar o card.');
    status.className = 'status success'; status.innerHTML = `Card salvo: <strong>${offer.title}</strong>. <a href="index.html" style="color:inherit">Ver no site</a>`;
    cancelEdit(); await loadOffers();
  } catch (error) { status.className = 'status error'; status.textContent = error.message; }
  finally { button.disabled = false; }
}

field('checkConnection')?.addEventListener('click', async (event) => { const button = event.currentTarget; button.disabled = true; status.hidden = false; status.className = 'status'; status.textContent = 'Verificando o token…'; try { const response = await fetch('/api/admin/status', { cache: 'no-store' }); const data = await readServerJson(response); if (!response.ok) throw new Error(data.message || 'Não foi possível verificar o token.'); status.className = 'status success'; status.textContent = `Conexão válida para a conta ${data.conta}. ${data.aviso}`; } catch (error) { status.className = 'status error'; status.textContent = error.message; } finally { button.disabled = false; } });
field('reauthorize')?.addEventListener('click', () => { window.location.href = '/api/admin/connect'; });

refreshOffersButton.addEventListener('click', async () => {
  refreshOffersButton.disabled = true; status.hidden = false; status.className = 'status'; status.textContent = 'Verificando preços dos cards já cadastrados…';
  try {
    const response = await fetch('/api/admin/atualizar-ofertas', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const report = await readServerJson(response);
    if (!response.ok) throw new Error(report.message || 'Não foi possível atualizar as ofertas.');
    status.className = report.updated ? 'status success' : 'status';
    status.textContent = `Teste concluído: ${report.checked} verificados, ${report.updated} atualizados, ${report.unchanged} sem alteração e ${report.skipped} ignorados pela API.`;
    if (report.errors?.length) status.textContent += ` Detalhe: ${report.errors[0]}`;
    await loadOffers();
  } catch (error) { status.className = 'status error'; status.textContent = error.message; }
  finally { refreshOffersButton.disabled = false; }
});

function transferToManual(data, message) {
  cancelEdit();
  field('manualMarketplace').value = 'mercado_livre';
  field('manualPublicUrl').value = data.publicUrl;
  field('manualAffiliateUrl').value = data.affiliateUrl;
  field('manualCategory').value = data.category;
  selectMode('manual');
  status.hidden = false;
  status.className = 'status';
  status.textContent = `${message} Os links e a categoria foram transferidos. Complete os dados visíveis na página do produto e salve o card.`;
  field('manualTitle').focus();
}

field('automaticForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('.submit');
  const data = { publicUrl: field('autoPublicUrl').value.trim(), affiliateUrl: field('autoAffiliateUrl').value.trim(), category: field('autoCategory').value };
  button.disabled = true; status.hidden = false; status.className = 'status'; status.textContent = 'Consultando o Mercado Livre e criando o card…';
  try {
    const response = await fetch('/api/admin/ofertas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const offer = await readServerJson(response);
    if (!response.ok) { transferToManual(data, offer.message || 'Não foi possível obter todos os dados automaticamente.'); return; }
    status.className = 'status success'; status.innerHTML = `Card criado automaticamente: <strong>${offer.title}</strong>. <a href="index.html" style="color:inherit">Ver no site</a>`;
    form.reset(); await loadOffers();
  } catch { transferToManual(data, 'A conexão com o Mercado Livre não respondeu.'); }
  finally { button.disabled = false; }
});

function importSearchResult(result, category) {
  cancelEdit();
  field('manualMarketplace').value = 'mercado_livre';
  field('manualTitle').value = result.title || '';
  field('manualImage').value = result.image || '';
  field('manualCurrentPrice').value = priceForInput(result.currentPrice);
  field('manualOriginalPrice').value = priceForInput(result.originalPrice);
  field('manualPublicUrl').value = result.publicUrl || '';
  field('manualAffiliateUrl').value = '';
  field('manualCategory').value = category;
  field('manualFreeShipping').checked = Boolean(result.freeShipping);
  selectMode('manual');
  status.hidden = false; status.className = 'status';
  status.textContent = 'Produto transferido para o modo manual. Informe o seu link de afiliado e complete os dados opcionais antes de salvar.';
  field('manualAffiliateUrl').focus();
}

function renderSearchResults(results, category) {
  const container = field('searchResults');
  container.replaceChildren();
  if (!results.length) {
    const empty = document.createElement('p'); empty.className = 'search-empty'; empty.textContent = 'Nenhum item com preço disponível foi encontrado. Tente outro termo.';
    container.append(empty); return;
  }
  results.forEach((result) => {
    const card = document.createElement('article'); card.className = 'search-result';
    if (result.image) { const image = document.createElement('img'); image.src = result.image; image.alt = ''; card.append(image); }
    else { const placeholder = document.createElement('div'); placeholder.className = 'search-image-empty'; placeholder.textContent = 'Sem imagem'; card.append(placeholder); }
    const copy = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = result.title;
    const details = document.createElement('small');
    details.textContent = `${formatPrice(result.currentPrice)}${result.originalPrice ? ` · de ${formatPrice(result.originalPrice)}` : ''}${result.discountPct ? ` · ${result.discountPct}% OFF` : ''}`;
    copy.append(title, details);
    const button = document.createElement('button'); button.type = 'button'; button.className = 'check import'; button.textContent = 'Usar produto';
    button.addEventListener('click', () => importSearchResult(result, category));
    card.append(copy, button); container.append(card);
  });
}

field('searchForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('.submit');
  const category = field('searchCategory').value;
  const query = field('searchQuery').value.trim();
  button.disabled = true; status.hidden = false; status.className = 'status'; status.textContent = 'Buscando itens pela API oficial do Mercado Livre…';
  try {
    const response = await fetch(`/api/admin/buscar-mercadolivre?category=${encodeURIComponent(category)}&q=${encodeURIComponent(query)}`, { cache: 'no-store' });
    const data = await readServerJson(response);
    if (!response.ok) throw new Error(data.message || 'Não foi possível buscar produtos.');
    renderSearchResults(data.results || [], category);
    status.className = 'status success'; status.textContent = `${data.results?.length || 0} produtos encontrados para “${data.term}”. Escolha um para revisar.`;
  } catch (error) { status.className = 'status error'; status.textContent = error.message; }
  finally { button.disabled = false; }
});

function applyScreenshotData(data) {
  const fields = { title: 'manualTitle', currentPrice: 'manualCurrentPrice', originalPrice: 'manualOriginalPrice', rating: 'manualRating', reviewCount: 'manualReviewCount', commentCount: 'manualCommentCount', description: 'manualDescription', reviewSummary: 'manualReviewSummary' };
  Object.entries(fields).forEach(([key, id]) => { if (data[key]) field(id).value = data[key]; });
  if (data.freeShipping) field('manualFreeShipping').checked = true;
}

function normalizePrice(value) { return value ? value.replace('.', '').replace(',', '.') : ''; }

// Prices are stored numerically by the server, but the admin fields must keep the
// conventional Brazilian two decimal places: 44 becomes 44,00 (never just 44).
function priceForInput(value) {
  if (value === '' || value === null || value === undefined) return '';
  if (typeof value === 'number') return value.toFixed(2).replace('.', ',');
  const input = String(value).trim().replace(/^R\$\s*/i, '');
  const raw = input.includes(',') ? input.replace(/\./g, '').replace(',', '.') : input;
  const amount = Number(raw);
  return Number.isFinite(amount) ? amount.toFixed(2).replace('.', ',') : String(value);
}

['manualCurrentPrice', 'manualOriginalPrice'].forEach((id) => {
  field(id).addEventListener('blur', (event) => {
    const formatted = priceForInput(event.currentTarget.value);
    if (formatted) event.currentTarget.value = formatted;
  });
});

function extractDataFromText(source) {
  const rawText = String(source || '').replace(/\r/g, '');
  const text = rawText.replace(/\s+/g, ' ').trim();
  const prices = [...text.matchAll(/R\$\s*(\d{1,6})(?:[,.]\s*(\d{2}))?/gi)].map((match) => { const digits = match[1].replace(/\D/g, ''); return match[2] ? `${digits},${match[2]}` : (digits.length >= 3 ? `${digits.slice(0, -2)},${digits.slice(-2)}` : digits); });
  const rating = text.match(/\b([0-5][,.]\d)\s*(?:★|estrelas|\()/i)?.[1] || '';
  const reviewCount = text.match(/[★☆]\s*\(?([\d.]+)\)?|\(([\d.]+)\)\s*(?:avaliações|opiniões)?/i);
  const commentCount = text.match(/([\d.]+)\s*comentários/i)?.[1] || '';
  const candidates = rawText.split(/\n+/).map((line) => line.trim()).filter((line) => line.length >= 12 && line.length <= 180 && /[a-záéíóúãõç]/i.test(line) && !/R\$|frete|avaliações|comentários|mercado livre|shopee|comprar|voltar/i.test(line));
  const title = candidates.find((line) => !/\.pdf$/i.test(line)) || '';
  return { title, currentPrice: prices.at(-1) || '', originalPrice: prices.length > 1 ? prices[0] : '', rating, reviewCount: reviewCount?.[1] || reviewCount?.[2] || '', commentCount, freeShipping: /frete grátis/i.test(text) };
}

async function extractPdfText(file, reportProgress) {
  const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pageCount = Math.min(pdf.numPages, 12);
  const pages = [];
  for (let index = 0; index < pageCount; index += 1) {
    const content = await (await pdf.getPage(index + 1)).getTextContent();
    const rows = new Map();
    content.items.forEach((item) => {
      const y = Math.round(item.transform[5]);
      rows.set(y, [...(rows.get(y) || []), { x: item.transform[4], text: item.str }]);
    });
    pages.push([...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, row]) => row.sort((a, b) => a.x - b.x).map((item) => item.text).join(' ')).join('\n'));
  }
  const nativeText = pages.join('\n');
  if (nativeText.replace(/\s/g, '').length >= 100) return { text: nativeText, method: 'texto do PDF' };

  const ocrPages = [];
  const ocrCount = Math.min(pdf.numPages, 5);
  for (let index = 0; index < ocrCount; index += 1) {
    reportProgress(`PDF sem texto selecionável. Lendo visualmente a página ${index + 1} de ${ocrCount}…`);
    const page = await pdf.getPage(index + 1);
    const viewport = page.getViewport({ scale: 1.7 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    ocrPages.push((await Tesseract.recognize(canvas, 'por+eng')).data.text);
  }
  return { text: ocrPages.join('\n'), method: 'OCR das páginas do PDF' };
}

function improveExtractedTitle(data, source) {
  const lines = String(source || '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const first = lines.findIndex((line) => /camera|câmera|headset|microfone|teclado|notebook|celular|smartphone|impressora/i.test(line) && !/mais op|produtos do vendedor|caracter/i.test(line));
  if (first < 0) return data;
  const title = [lines[first], lines[first + 1]].filter((line) => line && !/chegar|estoque|r\$|frete|vendido por|comprar/i.test(line)).join(' ').trim();
  return title.length >= 8 ? { ...data, title: title.slice(0, 180) } : data;
}

function extractMarketplaceFields(source) {
  const lines = String(source || '').split(/\n+/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const mainStart = Math.max(0, lines.findIndex((line) => /MAIS VENDIDO|Novo\s*\|/i.test(line)));
  const stockIndex = lines.findIndex((line, index) => index >= mainStart && /Estoque dispon/i.test(line));
  const mainEnd = stockIndex > mainStart ? stockIndex : Math.min(lines.length, mainStart + 35);
  const block = lines.slice(mainStart, mainEnd + 12);

  const titleParts = block.filter((line) => /camera|câmera|impressora|infantil|foto|jogo|headset|microfone|teclado|notebook|smartphone|celular/i.test(line)
    && !/MAIS VENDIDO|mais op|caracter|chegar|comprar|vendido por|produtos do vendedor|câmeras digitais/i.test(line));
  const title = [...new Set(titleParts)].join(' ').slice(0, 180);

  const ratingIndex = block.findIndex((line) => /^[0-5][,.]\d$/.test(line));
  const rating = ratingIndex >= 0 ? block[ratingIndex].replace('.', ',') : '';
  const reviewCount = ratingIndex >= 0 ? (block.slice(ratingIndex, ratingIndex + 3).join(' ').match(/\(([\d.]+)\)/)?.[1] || '') : '';

  const stockOffset = block.findIndex((line) => /Estoque dispon/i.test(line));
  const priceArea = stockOffset >= 0 ? block.slice(stockOffset, stockOffset + 8) : block;
  const currencyIndex = priceArea.findIndex((line) => /R\$\s*\d+/i.test(line));
  const integer = currencyIndex >= 0 ? priceArea[currencyIndex].match(/R\$\s*(\d+)/i)?.[1] : '';
  const cents = currencyIndex > 0 ? priceArea[currencyIndex - 1].match(/^\d{2}$/)?.[0] : '';
  const currentPrice = integer ? `${integer},${cents || '00'}` : '';

  const featureIndex = lines.findIndex((line) => /O que você precisa saber|O que voce precisa saber/i.test(line));
  const description = featureIndex >= 0 ? lines.slice(featureIndex + 1, featureIndex + 6).filter((line) => /•|display|zoom|qualidade|bateria|tela|câmera|camera/i.test(line)).join(' ') : '';
  return { title, currentPrice, originalPrice: '', rating, reviewCount, commentCount: '', description, reviewSummary: '', freeShipping: /frete gr/i.test(block.join(' ')) };
}

// Parser focused on product pages. It deliberately ignores navigation and recommendation
// blocks, so an imported PDF or screenshot fills fields instead of using its file name.
function documentLines(source) {
  return String(source || '').replace(/\r/g, '').split(/\n+/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function fold(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function ignoredProductLine(line) {
  return /mercado\s*livre|shopee|buscar produtos|enviar para|mais opcoes|vendido por|comprar agora|meios de pagamento|detalhes e formas|produtos do vendedor|chegara entre|ofertas cupons|supermercado|categorias/i.test(line);
}

function currencyValues(lines, from = 0, to = lines.length) {
  const prices = [];
  lines.slice(from, to).forEach((line, localIndex) => {
    // "Frete grátis acima de R$ 19" and installments are not product prices.
    if (/\b\d{1,2}x\b|parcelas?|frete|acima de/i.test(line)) return;
    const re = /R\$\s*(\d{1,3}(?:[.\s]\d{3})+|\d{1,6})(?:\s*,\s*|\s+)(\d{2})(?!\d)|R\$\s*(\d{1,3}(?:[.\s]\d{3})+|\d{1,6})(?![\d,.])/gi;
    let match;
    while ((match = re.exec(line))) {
      const rawInteger = (match[1] || match[3]).replace(/\D/g, '');
      // Some PDF generators put the cents in the line immediately above "R$ 99".
      const previousLine = lines[from + localIndex - 1] || '';
      const joinedDigits = Boolean(match[3]) && rawInteger.length >= 3;
      const integer = joinedDigits ? rawInteger.slice(0, -2) : rawInteger;
      const cents = match[2] || (match[3] && /^\d{2}$/.test(previousLine) ? previousLine : (joinedDigits ? rawInteger.slice(-2) : '00'));
      prices.push({ value: `${integer},${cents}`, index: from + localIndex, line });
    }
  });
  return prices;
}

function extractOfferFromDocument(source) {
  const lines = documentLines(source);
  const joined = lines.join(' ');
  const folded = lines.map(fold);
  const listingStart = folded.findIndex((line) => /\bnovo\b.*\bvendid|\busado\b.*\bvendid|mais vendido/.test(line));
  const safeStart = listingStart >= 0 ? listingStart : 0;
  const ratingIndex = folded.findIndex((line, index) => index >= safeStart && /\b[0-5][,.]\d\b/.test(line));
  const stockIndex = folded.findIndex((line, index) => index >= safeStart && /estoque disponivel|ultimas unidades/.test(line));
  const productEnd = [ratingIndex, stockIndex].filter((index) => index > safeStart).sort((a, b) => a - b)[0] ?? Math.min(lines.length, safeStart + 16);
  const titleParts = lines.slice(safeStart, productEnd).map((line) => line
    .replace(/\s+(?:mais detalhes.*|chegar[aá].*)$/i, '').trim()).filter((line) => {
    const plain = fold(line);
    return line.length >= 4 && line.length <= 140 && /[a-z]/i.test(plain) && !ignoredProductLine(plain)
      && !/\bnovo\b|\busado\b|mais vendido|frete gratis|r\$|\boff\b|\bvendidos\b/.test(plain);
  });
  const title = [...new Set(titleParts)].join(' ').replace(/\s{2,}/g, ' ').slice(0, 180);

  const ratingArea = ratingIndex >= 0 ? lines.slice(ratingIndex, ratingIndex + 3).join(' ') : joined;
  const ratingMatch = ratingArea.match(/\b([0-5][,.]\d)\b(?:\s*\(?\s*([\d.]{1,10})\s*\)?)?/);
  const reviewMatch = ratingArea.match(/\(([\d.]{1,10})\)/);

  // The offer price is normally next to stock / the rating. Older crossed-out prices
  // appear before it, hence the closest value after that anchor wins.
  const priceAnchor = stockIndex >= 0 ? stockIndex : (ratingIndex >= 0 ? ratingIndex : safeStart);
  const localPrices = currencyValues(lines, Math.max(safeStart, priceAnchor - 2), Math.min(lines.length, priceAnchor + 12));
  const allPrices = currencyValues(lines, safeStart, Math.min(lines.length, safeStart + 42));
  const current = localPrices.at(-1) || allPrices.at(-1);
  const earlier = allPrices.filter((price) => current && price.index < current.index).at(-1);
  const featureStart = folded.findIndex((line) => /o que voce precisa saber|principais caracteristicas|sobre este item/.test(line));
  const description = featureStart >= 0
    ? lines.slice(featureStart + 1, featureStart + 8).filter((line) => line.length > 8 && !ignoredProductLine(fold(line)) && !/r\$|comprar|chegara/i.test(line)).join(' ').slice(0, 900)
    : '';

  return {
    title,
    currentPrice: current?.value || '',
    originalPrice: earlier?.value && earlier.value !== current?.value ? earlier.value : '',
    rating: ratingMatch?.[1]?.replace('.', ',') || '',
    reviewCount: reviewMatch?.[1] || ratingMatch?.[2] || '',
    commentCount: joined.match(/([\d.]+)\s*coment[aá]rios/i)?.[1] || '',
    description,
    reviewSummary: '',
    freeShipping: /frete\s+gr[aá]tis/i.test(joined)
  };
}

async function ocrProductImage(file) {
  const bitmap = await createImageBitmap(file);
  const maxWidth = 2200;
  const scale = Math.min(2, maxWidth / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  // A light contrast boost makes small prices and star counts substantially clearer
  // without destroying coloured Mercado Livre labels.
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    for (let channel = 0; channel < 3; channel += 1) pixels.data[index + channel] = Math.max(0, Math.min(255, (pixels.data[index + channel] - 128) * 1.15 + 128));
  }
  context.putImageData(pixels, 0, 0);
  return (await Tesseract.recognize(canvas, 'por+eng', { logger: () => {} })).data.text;
}

field('analyzeScreenshot').addEventListener('click', async (event) => {
  const image = field('productScreenshot').files?.[0];
  if (!image) { status.hidden = false; status.className = 'status error'; status.textContent = 'Escolha um print ou PDF antes de continuar.'; return; }
  if (image.size > 20 * 1024 * 1024) { status.hidden = false; status.className = 'status error'; status.textContent = 'O arquivo deve ter no máximo 20 MB.'; return; }
  const button = event.currentTarget;
  button.disabled = true; status.hidden = false; status.className = 'status'; status.textContent = 'Lendo o arquivo neste navegador…';
  try {
    const result = image.type === 'application/pdf'
      ? await extractPdfText(image, (message) => { status.textContent = message; })
      : { text: await ocrProductImage(image), method: 'OCR da imagem' };
    const data = extractOfferFromDocument(result.text);
    const preview = field('extractedText'); preview.hidden = false; preview.querySelector('pre').textContent = result.text.slice(0, 6000) || 'Nenhum texto pôde ser extraído.';
    if (!data.currentPrice && !data.title && !data.rating) throw new Error('Não encontrei dados legíveis. Veja o texto extraído abaixo; tente outro PDF ou um print nítido da seção de preço.');
    applyScreenshotData(data); status.className = 'status success'; status.textContent = `Leitura concluída por ${result.method}. Revise os campos e o texto extraído antes de salvar.`;
  } catch (error) { status.className = 'status error'; status.textContent = error.message; }
  finally { button.disabled = false; }
});

function manualData() { return { marketplace: field('manualMarketplace').value, title: field('manualTitle').value.trim(), image: field('manualImage').value.trim(), description: field('manualDescription').value.trim(), reviewSummary: field('manualReviewSummary').value.trim(), rating: field('manualRating').value.trim(), reviewCount: field('manualReviewCount').value.trim(), commentCount: field('manualCommentCount').value.trim(), currentPrice: field('manualCurrentPrice').value.trim(), originalPrice: field('manualOriginalPrice').value.trim(), publicUrl: field('manualPublicUrl').value.trim(), affiliateUrl: field('manualAffiliateUrl').value.trim(), category: field('manualCategory').value, subcategory: field('manualSubcategory').value, specifications: preservedSpecifications, available: field('manualAvailable').value === 'available', availabilityStatus: field('manualAvailable').value, freeShipping: false }; }
manualForm.addEventListener('submit', (event) => { event.preventDefault(); submitOffer(manualForm, editingId ? `/api/admin/ofertas/${encodeURIComponent(editingId)}` : '/api/admin/ofertas/manual', manualData(), editingId ? 'Salvando alterações…' : 'Criando o card manualmente…', editingId ? 'PUT' : 'POST'); });

function cancelEdit() { editingId = null; preservedSpecifications = {}; manualForm.reset(); field('manualAvailable').value = 'available'; renderProductTypes(); field('manualHeading').textContent = 'Modo manual'; field('manualSubmit').textContent = 'Criar card manualmente'; field('cancelEdit').hidden = true; }
field('cancelEdit').addEventListener('click', cancelEdit);

function editOffer(offer) { editingId = offer.id; selectMode('manual'); field('manualHeading').textContent = 'Editar card'; field('manualSubmit').textContent = 'Salvar alterações'; field('cancelEdit').hidden = false; field('manualMarketplace').value = offer.marketplace === 'shopee' ? 'shopee' : 'mercado_livre'; field('manualTitle').value = offer.title || ''; field('manualImage').value = offer.image || ''; field('manualDescription').value = offer.description || ''; field('manualReviewSummary').value = offer.reviewSummary || ''; field('manualRating').value = offer.rating || ''; field('manualReviewCount').value = offer.reviewCount || ''; field('manualCommentCount').value = offer.commentCount || ''; field('manualCurrentPrice').value = priceForInput(offer.currentPrice); field('manualOriginalPrice').value = priceForInput(offer.originalPrice); field('manualPublicUrl').value = offer.publicUrl || ''; field('manualAffiliateUrl').value = offer.affiliateUrl || ''; field('manualCategory').value = offer.category || 'outros'; renderProductTypes(); field('manualSubcategory').value = offer.subcategory || field('manualSubcategory').value; field('manualAvailable').value = offer.availabilityStatus || (offer.available === false ? 'unavailable' : 'available'); preservedSpecifications = offer.specifications || {}; field('manualFreeShipping').checked = Boolean(offer.freeShipping); window.scrollTo({ top: 0, behavior: 'smooth' }); }

async function excluirOferta(offer, button) { const promptText = 'Digite EXCLUIR para confirmar a remoção permanente deste card.'; const confirmation = window.EconomizaiUI?.ask ? await window.EconomizaiUI.ask({ title: 'Excluir card?', text: `Esta ação remove “${offer.title}” do site e não pode ser desfeita.`, label: promptText }) : window.prompt(promptText); if (confirmation !== 'EXCLUIR') { if (confirmation !== null) { status.hidden = false; status.className = 'status error'; status.textContent = 'Exclusão cancelada: digite EXCLUIR em letras maiúsculas para confirmar.'; } return; } button.disabled = true; status.hidden = false; status.className = 'status'; status.textContent = 'Excluindo card…'; try { const response = await fetch(`/api/admin/ofertas/${encodeURIComponent(offer.id)}`, { method: 'DELETE' }); const result = await readServerJson(response); if (!response.ok) throw new Error(result.message || 'Não foi possível excluir o card.'); status.className = 'status success'; status.textContent = 'Card excluído.'; await loadOffers(); } catch (error) { status.className = 'status error'; status.textContent = error.message; } finally { button.disabled = false; } }
async function loadOffers() { try { const response = await fetch('/api/admin/ofertas', { cache: 'no-store' }); offers = await response.json(); savedOffers.innerHTML = ''; pendingOffers.innerHTML = ''; const published = offers.filter((offer) => (offer.availabilityStatus || (offer.available === false ? 'unavailable' : 'available')) !== 'pending'); const pending = offers.filter((offer) => (offer.availabilityStatus || (offer.available === false ? 'unavailable' : 'available')) === 'pending'); savedEmpty.textContent = published.length ? '' : 'Nenhum card publicado ou indisponível.'; pendingEmpty.textContent = pending.length ? '' : 'Nenhum card aguardando publicação.'; offers.forEach((offer) => { const offerStatus = offer.availabilityStatus || (offer.available === false ? 'unavailable' : 'available'); const labels = { available: 'Disponível no site', unavailable: 'Oferta não disponível', pending: 'Aguardando publicação' }; const row = document.createElement('article'); row.className = `saved-card status-${offerStatus}`; const text = document.createElement('div'); const title = document.createElement('strong'); title.textContent = offer.title; const info = document.createElement('small'); info.textContent = `${formatPrice(offer.currentPrice)} · ${offer.category || 'outros'}`; const statusLabel = document.createElement('span'); statusLabel.className = 'offer-status'; statusLabel.textContent = labels[offerStatus] || labels.available; text.append(title, info, statusLabel); const actions = document.createElement('div'); actions.className = 'saved-card-actions'; const editButton = document.createElement('button'); editButton.className = 'edit'; editButton.type = 'button'; editButton.textContent = 'Editar'; editButton.addEventListener('click', () => editOffer(offer)); const deleteButton = document.createElement('button'); deleteButton.className = 'delete'; deleteButton.type = 'button'; deleteButton.textContent = 'Excluir'; deleteButton.addEventListener('click', () => excluirOferta(offer, deleteButton)); actions.append(editButton, deleteButton); row.append(text, actions); (offerStatus === 'pending' ? pendingOffers : savedOffers).append(row); }); } catch { savedEmpty.textContent = 'Não foi possível carregar os cards cadastrados.'; pendingEmpty.textContent = ''; } }

selectMode('manual');
loadOffers();

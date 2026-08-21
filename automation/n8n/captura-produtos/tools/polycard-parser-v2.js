const decodeHtml = (value) => String(value || '')
  .replace(/&amp;/gi, '&')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>');

const clean = (value) => decodeHtml(value)
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Impede que o Google Sheets interprete conteúdo capturado como fórmula.
const sheetSafe = (value) => {
  if (value === null || value === undefined) return null;
  const safe = String(value).replace(/^[=+\-@]+\s*/, '').trim();
  return safe || null;
};

const attr = (tag, name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(tag || '').match(new RegExp(`\\b${escaped}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? decodeHtml(match[1]) : null;
};

const hasClass = (tag, className) => String(attr(tag, 'class') || '')
  .split(/\s+/)
  .includes(className);

const extractElement = (html, startIndex) => {
  const source = String(html || '');
  const openEnd = source.indexOf('>', startIndex);
  if (openEnd < 0) return '';
  const openTag = source.slice(startIndex, openEnd + 1);
  const tagName = (openTag.match(/^<\s*([a-z0-9-]+)/i) || [])[1];
  if (!tagName) return '';
  const matcher = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi');
  matcher.lastIndex = startIndex;
  let depth = 0;
  let match;
  while ((match = matcher.exec(source))) {
    if (/^<\//.test(match[0])) depth -= 1;
    else if (!/\/>$/.test(match[0])) depth += 1;
    if (depth === 0) return source.slice(startIndex, matcher.lastIndex);
  }
  return source.slice(startIndex);
};

const findElementByClass = (html, tagName, className) => {
  const matcher = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  let match;
  while ((match = matcher.exec(String(html || '')))) {
    if (hasClass(match[0], className)) return extractElement(html, match.index);
  }
  return '';
};

const parseAriaMoney = (label) => {
  const match = String(label || '').match(/(\d[\d.]*)\s*reais?(?:\s+com\s+(\d{1,2})\s*centavos?)?/i);
  if (!match) return null;
  const whole = match[1].replace(/\./g, '');
  const cents = match[2] ? match[2].padStart(2, '0') : '00';
  const value = Number(`${whole}.${cents}`);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const extractMoney = (block) => {
  if (!block) return { texto: null, valor: null };
  const moneyTag = (String(block).match(/<(?:span|s)\b[^>]*data-andes-money-amount=["']true["'][^>]*>/i) || [])[0] || '';
  const ariaValue = parseAriaMoney(attr(moneyTag, 'aria-label'));
  const fraction = String(block).match(/data-andes-money-amount-fraction=["']true["'][^>]*>([^<]+)/i);
  const cents = String(block).match(/data-andes-money-amount-cents=["']true["'][^>]*>([^<]+)/i);
  const wholeDigits = fraction ? fraction[1].replace(/\D/g, '') : '';
  const centDigits = cents ? cents[1].replace(/\D/g, '').padEnd(2, '0').slice(0, 2) : '00';
  const spanValue = wholeDigits ? Number(`${wholeDigits}.${centDigits}`) : null;
  const value = ariaValue || (Number.isFinite(spanValue) && spanValue > 0 ? spanValue : null);
  return {
    texto: value === null ? null : value.toFixed(2),
    valor: value,
  };
};

const getProductId = (url) => {
  const text = decodeHtml(url);
  try {
    const parsed = new URL(text);
    const searchable = `${parsed.search}&${parsed.hash.replace(/^#/, '')}`;
    const wid = searchable.match(/(?:^|[?&#])wid=(MLB\d+)/i)?.[1];
    if (wid) return wid.toUpperCase();
    const itemId = searchable.match(/(?:^|[?&#])item_id=(MLB\d+)/i)?.[1];
    if (itemId) return itemId.toUpperCase();
    const directItemId = parsed.pathname.match(/MLB-?(\d{6,})/i)?.[1];
    if (/produto\.mercadolivre\.com\.br/i.test(parsed.hostname) && directItemId) return `MLB${directItemId}`;
    const upId = parsed.pathname.match(/\/up\/(MLBU\d+)/i)?.[1];
    if (upId) return upId.toUpperCase();
    const catalogId = parsed.pathname.match(/\/p\/(MLB\d+)/i)?.[1];
    if (catalogId) return catalogId.toUpperCase();
  } catch (error) {}
  const upFallback = text.match(/MLBU\d+/i)?.[0];
  if (upFallback) return upFallback.toUpperCase();
  return text.match(/MLB-?(\d{6,})/i)?.[1] ? `MLB${text.match(/MLB-?(\d{6,})/i)[1]}` : '';
};

const normalizeProductUrl = (url, productId) => {
  const text = decodeHtml(url);
  try {
    const parsed = new URL(text);
    const isCatalog = /\/p\/MLB\d+/i.test(parsed.pathname);
    const cleanUrl = `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '');
    const searchable = `${parsed.search}&${parsed.hash.replace(/^#/, '')}`;
    const actualWid = searchable.match(/(?:^|[?&#])wid=(MLB\d+)/i)?.[1]?.toUpperCase();
    return isCatalog && actualWid ? `${cleanUrl}?wid=${actualWid}` : cleanUrl;
  } catch (error) {
    return text.split('#')[0].split('?')[0];
  }
};

const parseSold = (cardText) => {
  const match = String(cardText).match(/(?:mais\s+de\s+|\+\s*)?([\d.,]+)\s*(milh(?:ão|ões)|mil)?(?:\s+produtos?)?\s+vendidos/i);
  if (!match) return { texto: null, numero: null };
  let number = Number.parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(number)) return { texto: null, numero: null };
  const unit = (match[2] || '').toLowerCase();
  if (unit === 'mil') number *= 1000;
  if (unit.startsWith('milh')) number *= 1000000;
  return { texto: sheetSafe(clean(match[0])), numero: Math.round(number) };
};

const parseCoupon = (cardHtml) => {
  const candidates = [];
  const componentPattern = /<(?:div|span)\b[^>]*class=["'][^"']*(?:poly-component__rebates|poly-rebates__pill|coupon)[^"']*["'][^>]*>/gi;
  let match;
  while ((match = componentPattern.exec(String(cardHtml || '')))) {
    candidates.push(clean(extractElement(cardHtml, match.index)));
  }
  const text = candidates.join(' · ');
  if (!/cupom/i.test(text)) return { cupom: null, cupomTipo: null, cupomValor: null };

  let found = text.match(/compre\s*R\$\s*([\d.,]+)\s*e\s*ganhe\s*R\$\s*([\d.,]+)\s*(?:OFF|de desconto)/i);
  if (found) return { cupom: sheetSafe(clean(found[0])), cupomTipo: 'valor_minimo_valor_off', cupomValor: Number(found[2].replace(/\./g, '').replace(',', '.')) };
  found = text.match(/compre\s*R\$\s*([\d.,]+)\s*e\s*ganhe\s*(\d+(?:[.,]\d+)?)\s*%\s*(?:OFF|de desconto)/i);
  if (found) return { cupom: sheetSafe(clean(found[0])), cupomTipo: 'valor_minimo_percentual_off', cupomValor: Number(found[2].replace(',', '.')) };
  found = text.match(/R\$\s*([\d.,]+)\s+com\s+cupom(?:\s+por\s+seguir\s+(?:a\s+)?loja)?/i);
  if (found) return { cupom: sheetSafe(clean(found[0])), cupomTipo: /seguir/i.test(found[0]) ? 'preco_por_seguir_loja' : 'preco_com_cupom', cupomValor: Number(found[1].replace(/\./g, '').replace(',', '.')) };
  found = text.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:OFF|de desconto)\s+(?:com\s+)?cupom/i);
  if (found) return { cupom: sheetSafe(clean(found[0])), cupomTipo: 'percentual_off', cupomValor: Number(found[1].replace(',', '.')) };
  found = text.match(/R\$\s*([\d.,]+)\s*(?:OFF|de desconto)\s+(?:com\s+)?cupom/i);
  if (found) return { cupom: sheetSafe(clean(found[0])), cupomTipo: 'valor_off', cupomValor: Number(found[1].replace(/\./g, '').replace(',', '.')) };
  return { cupom: null, cupomTipo: null, cupomValor: null };
};

const extractImage = (cardHtml) => {
  const tags = String(cardHtml || '').match(/<img\b[^>]*>/gi) || [];
  const picture = tags.find((tag) => hasClass(tag, 'poly-component__picture')) || tags[0] || '';
  const src = attr(picture, 'src');
  if (src && /^https?:\/\//i.test(src)) return src;
  const dataSrc = attr(picture, 'data-src');
  if (dataSrc && /^https?:\/\//i.test(dataSrc)) return dataSrc;
  const srcset = attr(picture, 'srcset');
  if (!srcset) return null;
  const choices = srcset.split(',').map((part) => {
    const parsed = part.trim().match(/^(\S+)\s+(\d+)w$/);
    return parsed ? { url: parsed[1], width: Number(parsed[2]) } : null;
  }).filter(Boolean).sort((a, b) => b.width - a.width);
  return choices[0]?.url || null;
};

const extractProducts = (html, grupoOferta) => {
  const source = String(html || '');
  const starts = [];
  const divMatcher = /<div\b[^>]*>/gi;
  let match;
  while ((match = divMatcher.exec(source))) {
    if (hasClass(match[0], 'poly-card')) starts.push(match.index);
  }

  const products = [];
  const seen = new Set();
  for (let index = 0; index < starts.length; index += 1) {
    const card = source.slice(starts[index], starts[index + 1] || source.length);
    const titleAnchor = (card.match(/<a\b[^>]*class=["'][^"']*\bpoly-component__title\b[^"']*["'][^>]*>[\s\S]*?<\/a>/i) || [])[0] || '';
    const openAnchor = (titleAnchor.match(/^<a\b[^>]*>/i) || [])[0] || '';
    const title = clean(titleAnchor);
    const originalUrl = attr(openAnchor, 'href');
    const productId = getProductId(originalUrl);
    const currentBlock = findElementByClass(card, 'div', 'poly-price__current');
    const currentAmount = findElementByClass(currentBlock, 'span', 'poly-price__amount') || currentBlock;
    const current = extractMoney(currentAmount);
    const previousBlock = findElementByClass(card, 's', 'andes-money-amount--previous');
    const previous = extractMoney(previousBlock);
    const discountMatch = clean(currentBlock).match(/(\d+(?:[.,]\d+)?)\s*%\s*OFF/i);
    const calculatedDiscount = previous.valor && current.valor && previous.valor > current.valor
      ? Math.floor((1 - current.valor / previous.valor) * 100)
      : null;
    const discount = discountMatch ? `${discountMatch[1].replace(',', '.')}% OFF` : (calculatedDiscount ? `${calculatedDiscount}% OFF` : null);
    const cardText = clean(card);
    const ratingMatch = cardText.match(/(?:classifica[cç][aã]o\s*)?([0-5][.,]\d)\s*(?:de\s*5\s*estrelas|\|)/i) || cardText.match(/\b([0-5][.,]\d)\b(?=\s*(?:\||\+|mais\s+de))/i);
    const ratingNumber = ratingMatch ? Number(ratingMatch[1].replace(',', '.')) : null;
    const sold = parseSold(cardText);
    const coupon = parseCoupon(card);
    const imageUrl = extractImage(card);

    if (!title || !originalUrl || !productId || !imageUrl || !current.valor) continue;
    if (seen.has(productId)) continue;
    seen.add(productId);

    products.push({
      nomeProduto: title,
      imagemProduto: imageUrl,
      urlOriginal: normalizeProductUrl(originalUrl, productId),
      precoAtual: current.texto,
      preco_atual_numero: current.valor,
      precoOriginal: previous.valor && previous.valor > current.valor ? previous.texto : null,
      preco_original_numero: previous.valor && previous.valor > current.valor ? previous.valor : null,
      desconto: discount,
      nota: ratingNumber === null ? null : String(ratingNumber).replace('.', ','),
      notaNumero: ratingNumber,
      quantidadeVendidas: sold.texto,
      quantidadeVendidasNumero: sold.numero,
      cupom: coupon.cupom,
      cupomTipo: coupon.cupomTipo,
      cupomValor: coupon.cupomValor,
      grupoOferta,
      idProduto: productId,
      parserVersion: 'busca-ml-v2.1-polycard',
    });
  }
  return products;
};

const grupoOferta = $('DEFINE GRUPO').item.json.grupoOferta;
const output = [];
for (const [itemIndex, item] of $input.all().entries()) {
  const json = item.json || {};
  const html = json.data || json.body || json.html || '';
  for (const product of extractProducts(html, grupoOferta)) {
    output.push({ json: product, pairedItem: { item: itemIndex } });
  }
}
if (output.length === 0) {
  return [{
    json: {
      _semProdutos: true,
      grupoOferta,
      motivoCaptura: 'Nenhum poly-card válido encontrado nesta categoria',
      parserVersion: 'busca-ml-v2.1-polycard',
    },
  }];
}
return output;

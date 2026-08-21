// PROCESSA RESPOSTA (v8) — preço PDP confirmado + cupom informativo.
// O cupom nunca substitui o preço atual. Valores mínimos de cupom são tratados
// como condição de elegibilidade, não como preço do produto.

const PARSER_VERSION = 'n8n-v8-pdp-preco-cupom-informativo';
const original = $('LOOP PRODUTOS').item.json;
const http = $input.first().json;
const stats = $getWorkflowStaticData('global');

const clean = (value) => String(value || '')
  .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const normalize = (value) => clean(value).toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const similarity = (a, b) => {
  const left = new Set(normalize(a).split(' ').filter((word) => word.length > 2));
  const right = new Set(normalize(b).split(' ').filter((word) => word.length > 2));
  if (!left.size || !right.size) return 0;
  let same = 0;
  left.forEach((word) => { if (right.has(word)) same += 1; });
  return same / new Set([...left, ...right]).size;
};

const attr = (tag, name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(tag || '').match(new RegExp(`\\b${escaped}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? match[1] : null;
};

const parseNumber = (value) => {
  if (value === null || value === undefined) return null;
  let text = String(value).trim().replace(/[^\d.,]/g, '');
  if (!text) return null;
  if (text.includes(',') && text.includes('.')) text = text.replace(/\./g, '').replace(',', '.');
  else if (text.includes(',')) text = text.replace(',', '.');
  const number = Number.parseFloat(text);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const parseDisplayMoney = (value) => {
  let text = String(value || '').replace(/[^\d.,]/g, '');
  if (!text) return null;
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(text)) text = text.replace(/\./g, '');
  const number = Number.parseFloat(text);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const parseAriaMoney = (value) => {
  const text = String(value || '').toLowerCase();
  const reais = text.match(/(\d[\d.]*)\s*reais?/i);
  if (!reais) return parseNumber(text);
  const cents = text.match(/(\d{1,2})\s*centavos?/i);
  const whole = reais[1].replace(/\./g, '');
  return Number(`${whole}.${cents ? cents[1].padStart(2, '0') : '00'}`);
};

const parseAndesMoney = (fragment) => {
  const fraction = String(fragment || '').match(/andes-money-amount__fraction[^>]*>([^<]+)</i);
  if (!fraction) return null;
  const cents = String(fragment).match(/andes-money-amount__cents[^>]*>([^<]+)</i);
  const whole = String(fraction[1]).replace(/\D/g, '');
  const decimal = cents ? String(cents[1]).replace(/\D/g, '').padEnd(2, '0').slice(0, 2) : '00';
  return whole ? Number(`${whole}.${decimal}`) : null;
};

const money = (value) => Number(value).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL',
});

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
  return source.slice(startIndex, Math.min(source.length, startIndex + 16000));
};

const findElementBy = (html, pattern) => {
  const match = String(html || '').match(pattern);
  return match && Number.isInteger(match.index) ? extractElement(html, match.index) : '';
};

const findElementsBy = (html, pattern) => {
  const output = [];
  const matcher = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
  let match;
  while ((match = matcher.exec(String(html || '')))) {
    const element = extractElement(html, match.index);
    if (element) output.push(element);
  }
  return output;
};

const getMetaPrice = (block) => {
  const tags = String(block || '').match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (String(attr(tag, 'itemprop')).toLowerCase() === 'price') {
      const value = parseNumber(attr(tag, 'content'));
      if (value) return value;
    }
  }
  return null;
};

const getOfferAriaPrice = (block) => {
  const tags = String(block || '').match(/<span\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (String(attr(tag, 'itemprop')).toLowerCase() === 'offers') {
      const value = parseAriaMoney(attr(tag, 'aria-label'));
      if (value) return value;
    }
  }
  return null;
};

// Captura somente regras explícitas de cupom. "Ver cupons disponíveis" por si
// só não é suficiente para registrar nada e nunca é usado no preço principal.
const extractCoupon = (html, priceBlock) => {
  const windows = [
    ...findElementsBy(html, /<span\b[^>]*class=["'][^"']*ui-vpp-coupons-awareness__checkbox-label[^"']*["'][^>]*>/i),
    ...findElementsBy(priceBlock, /<(?:div|button)\b[^>]*class=["'][^"']*ui-pdp-price-breakdown[^"']*["'][^>]*>/i),
  ];
  const seen = new Set();
  for (const window of windows) {
    const text = clean(window);
    if (!text || seen.has(text)) continue;
    seen.add(text);

    let found = text.match(/compre\s*(R\$\s*[\d.,]+)\s*e\s*ganhe\s*(\d+(?:[.,]\d+)?)\s*%\s*off/i);
    if (found) {
      const minimum = parseDisplayMoney(found[1]);
      if (minimum) return {
        detected: true,
        text: `Cupom: ${found[2].replace(',', '.')}% OFF em compras a partir de ${money(minimum)}`,
        kind: 'desconto_percentual_com_minimo', source: 'pdp_coupon_awareness',
      };
    }

    found = text.match(/compre\s*(R\$\s*[\d.,]+)\s*e\s*ganhe\s*(R\$\s*[\d.,]+)\s*off/i);
    if (found) {
      const minimum = parseDisplayMoney(found[1]);
      const discount = parseDisplayMoney(found[2]);
      if (minimum && discount) return {
        detected: true,
        text: `Cupom: ${money(discount)} OFF em compras a partir de ${money(minimum)}`,
        kind: 'desconto_valor_com_minimo', source: 'pdp_coupon_awareness',
      };
    }

    found = text.match(/(R\$\s*[\d.,]+)\s*(?:off|de desconto)\s*(?:com\s+)?cupom/i);
    if (found) {
      const discount = parseDisplayMoney(found[1]);
      if (discount) return {
        detected: true, text: `Cupom: ${money(discount)} OFF`,
        kind: 'desconto_valor', source: 'pdp_coupon_awareness',
      };
    }

    found = text.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:off|de desconto)\s*(?:com\s+)?cupom/i);
    if (found) return {
      detected: true, text: `Cupom: ${found[1].replace(',', '.')}% OFF`,
      kind: 'desconto_percentual', source: 'pdp_coupon_awareness',
    };

    found = text.match(/(R\$\s*[\d.,]+)\s+com\s+cupom/i);
    if (found) {
      const price = parseDisplayMoney(found[1]);
      if (price) return {
        detected: true, text: `Preço com cupom: ${money(price)}`,
        kind: 'preco_com_cupom', source: 'pdp_price_breakdown',
      };
    }
  }
  return { detected: false, text: null, kind: null, source: null };
};

const route = (fields) => {
  const result = {
    offer_id: original.offer_id, product_id: original.product_id,
    external_product_id: original.external_product_id, product_title: original.product_title,
    public_url: original.public_url,
    precoAntigo: original.current_price == null ? null : Number(original.current_price),
    precoOriginalAntigo: original.original_price == null ? null : Number(original.original_price),
    parserVersion: PARSER_VERSION, ...fields,
  };
  stats.totalVerificado = (stats.totalVerificado || 0) + 1;
  stats.detalhes = stats.detalhes || [];
  stats.detalhes.push({
    produto: result.product_title, url: result.public_url, precoSalvo: result.precoAntigo,
    precoDetectado: result.detectedCurrentPrice ?? null,
    precoOriginalDetectado: result.detectedOriginalPrice ?? null,
    cupom: result.couponText ?? null, fonte: result.priceSource ?? null,
    rota: result.rota, motivo: result.motivo ?? null,
  });
  return [{ json: result }];
};

const statusCode = Number(http.statusCode || 200);
const html = typeof (http.body ?? http.data) === 'string' ? (http.body ?? http.data) : '';
if (http.error || !html || html.length < 500) return route({ rota: 'falha_temporaria', outcome: 'error', httpStatus: statusCode, motivo: 'HTML vazio, incompleto ou erro de rede' });
if (statusCode === 404) return route({ rota: 'indisponivel', outcome: 'unavailable', httpStatus: statusCode, motivo: 'Página retornou HTTP 404' });
if (statusCode < 200 || statusCode >= 300 || /captcha|perimeterx|g-recaptcha|verificação de segurança|just a moment/i.test(html)) return route({ rota: 'falha_temporaria', outcome: 'error', httpStatus: statusCode, motivo: statusCode === 403 ? 'HTTP 403/CAPTCHA' : 'Resposta HTTP inesperada ou desafio de segurança' });

const h1 = String(html).match(/<h1\b[^>]*class=["'][^"']*ui-pdp-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
const og = String(html).match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i) || String(html).match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["'][^>]*>/i);
const pageTitle = h1 ? clean(h1[1]) : (og ? clean(og[1]) : null);
const titleScore = similarity(pageTitle, original.product_title);
const urlMlb = (String(original.public_url || '').match(/MLB-?(\d+)/i) || [])[1] || null;
const pageMlb = (String(html).match(/(?:\/p\/|catalog\/reviews\/|bookmark\/add\/)(MLB\d+)/i) || [])[1] || null;
const sameMlb = Boolean(urlMlb && pageMlb && normalize(`MLB${urlMlb}`) === normalize(pageMlb));
if (!pageTitle || (titleScore < 0.60 && !sameMlb)) return route({ rota: 'revisao_manual', outcome: 'review', httpStatus: statusCode, pageTitle, motivo: 'Título/ID do PDP não corresponde com segurança ao produto cadastrado' });

const priceBlock = findElementBy(html, /<div\b[^>]*\bid=["']price["'][^>]*>/i);
const unavailableText = /publica[cç][aã]o (est[aá] )?pausada|an[uú]ncio (foi )?(finalizado|encerrado|removido)|este produto est[aá] indispon[ií]vel|produto est[aá] indispon[ií]vel|n[aã]o encontramos essa p[aá]gina/i;
if (!priceBlock) {
  if (unavailableText.test(html)) return route({ rota: 'indisponivel', outcome: 'unavailable', httpStatus: statusCode, pageTitle, motivo: 'Indisponibilidade explícita e ausência do bloco principal de preço' });
  return route({ rota: 'revisao_manual', outcome: 'review', httpStatus: statusCode, pageTitle, motivo: 'Bloco #price do PDP não foi encontrado; preço não será adivinhado' });
}

const secondLineBlocks = findElementsBy(priceBlock, /<div\b[^>]*class=["'][^"']*ui-pdp-price__second-line[^"']*["'][^>]*>/i);
const actualBlock = secondLineBlocks.find((block) => /itemprop=["']offers["']/i.test(block)) || '';
if (!actualBlock || /R\$\s*\d[\d.,]*\s*(?:-|a|até)\s*R\$/i.test(clean(actualBlock))) return route({ rota: 'revisao_manual', outcome: 'review', httpStatus: statusCode, pageTitle, motivo: 'Preço principal ausente ou apresentado como faixa/variação' });

const metaPrice = getMetaPrice(actualBlock);
const ariaPrice = getOfferAriaPrice(actualBlock);
if (!metaPrice && !ariaPrice) return route({ rota: 'revisao_manual', outcome: 'review', httpStatus: statusCode, pageTitle, motivo: 'Preço principal sem meta itemprop=price e sem aria-label confirmável' });
if (metaPrice && ariaPrice && Math.abs(metaPrice - ariaPrice) > 0.01) return route({ rota: 'revisao_manual', outcome: 'review', httpStatus: statusCode, pageTitle, detectedCurrentPrice: metaPrice, priceSource: 'pdp_meta_vs_aria_divergente', motivo: 'Meta de preço e rótulo visual do preço principal divergem' });

const precoNovo = metaPrice || ariaPrice;
let priceSource = metaPrice && ariaPrice ? 'pdp_meta_itemprop_price+aria_label_confirmados' : metaPrice ? 'pdp_meta_itemprop_price_confirmado' : 'pdp_aria_label_confirmado';
const coupon = extractCoupon(html, priceBlock);
if (coupon.detected) priceSource += '+cupom_informativo';

const oldTag = (priceBlock.match(/<s\b[^>]*class=["'][^"']*ui-pdp-price__original-value[^"']*["'][^>]*>[\s\S]*?<\/s>/i) || [])[0] || '';
let precoOriginalNovo = parseAriaMoney(attr(oldTag, 'aria-label')) || parseAndesMoney(oldTag);
if (!precoOriginalNovo || precoOriginalNovo <= precoNovo) precoOriginalNovo = null;

const precoAntigo = Number(original.current_price);
const highVariation = Number.isFinite(precoAntigo) && precoAntigo > 0 && (precoNovo > precoAntigo * 3 || precoNovo < precoAntigo / 3);
const strongPriceConfirmation = Boolean(metaPrice && ariaPrice);
if (highVariation && !strongPriceConfirmation) return route({ rota: 'revisao_manual', outcome: 'review', httpStatus: statusCode, pageTitle, detectedCurrentPrice: precoNovo, detectedOriginalPrice: precoOriginalNovo, couponDetected: coupon.detected, couponText: coupon.text, couponKind: coupon.kind, couponSource: coupon.source, priceSource, motivo: 'Variação superior a 3x sem dupla confirmação no bloco principal' });
if (highVariation) priceSource += '+variacao_alta_confirmada';

const discountPercentNovo = precoOriginalNovo ? Math.floor((1 - precoNovo / precoOriginalNovo) * 100) : 0;
const precoAtualMudou = !Number.isFinite(precoAntigo) || Math.abs(precoNovo - precoAntigo) > 0.001;
const originalAntigo = original.original_price == null ? null : Number(original.original_price);
const precoOriginalMudou = (precoOriginalNovo == null && originalAntigo != null) || (precoOriginalNovo != null && (!Number.isFinite(originalAntigo) || Math.abs(precoOriginalNovo - originalAntigo) > 0.001));
const descontoAntigo = original.discount_percent == null ? 0 : Number(original.discount_percent);
const descontoMudou = !Number.isFinite(descontoAntigo) || Math.abs(discountPercentNovo - descontoAntigo) > 0.001;
const changed = precoAtualMudou || precoOriginalMudou || descontoMudou;
const motivos = [];
if (precoAtualMudou) motivos.push(Number.isFinite(precoAntigo) ? `Preço atual: ${money(precoAntigo)} → ${money(precoNovo)}` : `Preço atual registrado: ${money(precoNovo)}`);
if (precoOriginalMudou) {
  if (precoOriginalNovo == null) motivos.push(`Preço de referência removido (era ${money(originalAntigo)})`);
  else if (Number.isFinite(originalAntigo)) motivos.push(`Preço de referência: ${money(originalAntigo)} → ${money(precoOriginalNovo)}`);
  else motivos.push(`Preço de referência registrado: ${money(precoOriginalNovo)}`);
}
if (descontoMudou) motivos.push(`Desconto recalculado: ${Math.round(descontoAntigo)}% → ${Math.round(discountPercentNovo)}%`);
if (coupon.detected) motivos.push(`Cupom confirmado: ${coupon.text}`);

return route({
  rota: changed ? 'atualizar_preco' : 'sem_alteracao', outcome: changed ? 'updated' : 'unchanged',
  httpStatus: statusCode, pageTitle, precoNovo, precoOriginalNovo, discountPercentNovo,
  detectedCurrentPrice: precoNovo, detectedOriginalPrice: precoOriginalNovo,
  couponDetected: coupon.detected, couponText: coupon.text, couponKind: coupon.kind, couponSource: coupon.source,
  priceSource, motivo: changed ? motivos.join(' · ') : (coupon.detected ? `Sem alteração de preço · ${motivos[motivos.length - 1]}` : 'Sem alteração: preço atual, referência e desconto confirmados'),
});

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const folder = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(folder, 'MONITORAMENTO-DE-PRECO-V8-CUPONS.json');
const parserPath = join(folder, 'PROCESSA-RESPOSTA-V8-CUPONS.js');
const targetPath = join(folder, 'MONITORAMENTO-DE-PRECO-V8.1-CUPONS-AMPLIADOS.json');

const workflow = JSON.parse(await readFile(sourcePath, 'utf8'));
const parserOriginal = await readFile(parserPath, 'utf8');

const couponExtractor = String.raw`const extractCoupon = (html, priceBlock) => {
  const rawHtml = String(html || '');
  const componentPattern = /<(?:div|span|button|a|p)\b[^>]*class=["'][^"']*(?:ui-vpp-coupons-awareness|coupon|coupons|price-breakdown)[^"']*["'][^>]*>/i;
  const windows = [
    ...findElementsBy(rawHtml, componentPattern),
    ...findElementsBy(String(priceBlock || ''), componentPattern),
  ];

  // Algumas ofertas trazem "Compre R$ X e ganhe Y" dentro do componente de cupom,
  // porém sem escrever a palavra "cupom" no texto visível. Por isso, "compre"
  // também abre uma janela local de análise.
  for (const match of rawHtml.matchAll(/(?:cupom|coupon|compre)/gi)) {
    const index = match.index || 0;
    windows.push(rawHtml.slice(Math.max(0, index - 900), Math.min(rawHtml.length, index + 1500)));
  }

  const seen = new Set();
  const foundCoupon = (text, kind, source) => ({ detected: true, text, kind, source });

  for (const window of windows) {
    const text = clean(window);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    // "Compre R$ X e ganhe Y" é uma condição de cupom mesmo quando a palavra
    // "cupom" não aparece no trecho de HTML capturado.
    if (!/(cupom|coupon|compre\s*R\$)/i.test(text)) continue;

    let found = text.match(/compre\s*(R\$\s*[\d.,]+)\s*e\s*ganhe\s*(R\$\s*[\d.,]+)\s*off/i);
    if (found) {
      const minimum = parseDisplayMoney(found[1]);
      const discount = parseDisplayMoney(found[2]);
      if (minimum && discount) {
        return foundCoupon(
          'Cupom: ' + money(discount) + ' OFF em compras a partir de ' + money(minimum),
          'valor_minimo_valor_off',
          'texto_cupom',
        );
      }
    }

    found = text.match(/compre\s*(R\$\s*[\d.,]+)\s*e\s*ganhe\s*(\d+(?:[.,]\d+)?)\s*%\s*off/i);
    if (found) {
      const minimum = parseDisplayMoney(found[1]);
      const percent = Number(found[2].replace(',', '.'));
      if (minimum && percent > 0) {
        return foundCoupon(
          'Cupom: ' + percent + '% OFF em compras a partir de ' + money(minimum),
          'valor_minimo_percentual_off',
          'texto_cupom',
        );
      }
    }

    found = text.match(/(R\$\s*[\d.,]+)\s*(\d+(?:[.,]\d+)?)\s*%\s*(?:off|de desconto)\s*com\s+cupom/i);
    if (found) {
      const price = parseDisplayMoney(found[1]);
      const percent = Number(found[2].replace(',', '.'));
      if (price && percent > 0) {
        return foundCoupon(
          'Preço com cupom: ' + money(price) + ' · Oferta com cupom: ' + percent + '% OFF',
          'preco_com_percentual',
          'bloco_preco_cupom',
        );
      }
    }

    found = text.match(/(R\$\s*[\d.,]+)\s+com\s+cupom\s+por\s+seguir\s+a\s+loja/i);
    if (found) {
      const price = parseDisplayMoney(found[1]);
      if (price) {
        return foundCoupon(
          'Preço com cupom: ' + money(price) + ' · Condição: seguir a loja',
          'preco_por_seguir_loja',
          'bloco_preco_cupom',
        );
      }
    }

    found = text.match(/(R\$\s*[\d.,]+)\s*(?:off|de desconto)\s*(?:com\s+)?cupom/i);
    if (found) {
      const discount = parseDisplayMoney(found[1]);
      if (discount) return foundCoupon('Cupom: ' + money(discount) + ' OFF', 'valor_off', 'texto_cupom');
    }

    found = text.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:off|de desconto)\s*(?:com\s+)?cupom/i);
    if (found) {
      const percent = Number(found[1].replace(',', '.'));
      if (percent > 0) return foundCoupon('Cupom: ' + percent + '% OFF', 'percentual_off', 'texto_cupom');
    }

    found = text.match(/(R\$\s*[\d.,]+)\s+com\s+cupom/i);
    if (found) {
      const price = parseDisplayMoney(found[1]);
      if (price) return foundCoupon('Preço com cupom: ' + money(price), 'preco_com_cupom', 'bloco_preco_cupom');
    }
  }

  return { detected: false, text: '', kind: null, source: null };
};`;

// A função original contém blocos internos terminados em `};`. Por isso, o
// recorte usa o próximo helper de nível superior como limite, evitando sobras
// de código antigo no parser gerado.
const couponStart = parserOriginal.indexOf('const extractCoupon = (html, priceBlock) => {');
const couponEnd = parserOriginal.indexOf('const route = (fields) => {', couponStart);

if (couponStart < 0 || couponEnd < 0) {
  throw new Error('Não foi possível localizar os limites da função extractCoupon no parser V8.');
}

const parser = (
  parserOriginal.slice(0, couponStart) +
  couponExtractor + '\n\n' +
  parserOriginal.slice(couponEnd)
).replace(
  'n8n-v8-pdp-preco-cupom-informativo',
  'n8n-v8.1-pdp-preco-cupons-ampliados',
);

const node = (name) => {
  const found = workflow.nodes.find((item) => item.name === name);
  if (!found) throw new Error('Nó não encontrado no V8: ' + name);
  return found;
};

const replaceQuery = (name, query) => {
  const target = node(name);
  if (!target.parameters || typeof target.parameters.query !== 'string') {
    throw new Error('O nó ' + name + ' não possui parameters.query em formato de texto.');
  }
  target.parameters.query = query;
};

workflow.name = 'MONITORAMENTO DE PREÇO — V8.1 CUPONS AMPLIADOS';
workflow.active = false;
node('PROCESSA RESPOSTA').parameters.jsCode = parser;

const couponSyncUpdate = `=WITH oferta_atualizada AS (
  UPDATE public.offers
  SET current_price = {{ $('PROCESSA RESPOSTA').item.json.precoNovo }},
      original_price = {{ $('PROCESSA RESPOSTA').item.json.precoOriginalNovo !== null && $('PROCESSA RESPOSTA').item.json.precoOriginalNovo !== undefined ? $('PROCESSA RESPOSTA').item.json.precoOriginalNovo : 'NULL' }},
      discount_percent = {{ $('PROCESSA RESPOSTA').item.json.discountPercentNovo !== null && $('PROCESSA RESPOSTA').item.json.discountPercentNovo !== undefined ? $('PROCESSA RESPOSTA').item.json.discountPercentNovo : 0 }},
      availability_status = 'available',
      last_checked_at = now(),
      last_check_status = 'ok',
      last_check_error = NULL,
      consecutive_check_failures = 0
  WHERE id = '{{ $('PROCESSA RESPOSTA').item.json.offer_id }}'
  RETURNING product_id, id
),
cupom_atualizado AS (
  UPDATE public.products p
  SET coupon_text = NULLIF('{{ String($('PROCESSA RESPOSTA').item.json.couponText || '').replace(/'/g, "''") }}', '')
  FROM oferta_atualizada o
  WHERE p.id = o.product_id
  RETURNING p.id
)
SELECT id FROM oferta_atualizada`;

const couponSyncVerified = `=WITH oferta_verificada AS (
  UPDATE public.offers
  SET availability_status = 'available',
      last_checked_at = now(),
      last_check_status = 'ok',
      last_check_error = NULL,
      consecutive_check_failures = 0
  WHERE id = '{{ $('PROCESSA RESPOSTA').item.json.offer_id }}'
  RETURNING product_id, id
),
cupom_atualizado AS (
  UPDATE public.products p
  SET coupon_text = NULLIF('{{ String($('PROCESSA RESPOSTA').item.json.couponText || '').replace(/'/g, "''") }}', '')
  FROM oferta_verificada o
  WHERE p.id = o.product_id
  RETURNING p.id
)
SELECT id FROM oferta_verificada`;

replaceQuery('ATUALIZA OFERTA (preco mudou)', couponSyncUpdate);
replaceQuery('MARCA COMO VERIFICADO', couponSyncVerified);

workflow.meta = {
  ...(workflow.meta || {}),
  economizaiVersion: 'v8.1-cupons-ampliados',
  generatedFrom: 'MONITORAMENTO-DE-PRECO-V8-CUPONS.json',
  notes: 'Mantém o parser V8 de preços. Amplia apenas leitura/sincronização de cupons e limpa cupom expirado.',
};

await writeFile(targetPath, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log('Fluxo V8.1 criado: ' + targetPath);

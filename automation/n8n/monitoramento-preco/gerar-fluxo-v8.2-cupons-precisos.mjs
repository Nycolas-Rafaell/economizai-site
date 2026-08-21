import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const folder = path.dirname(fileURLToPath(import.meta.url));
const outputName = 'MONITORAMENTO-DE-PRECO-V8.2-CUPONS-PRECISOS.json';
const outputPath = path.join(folder, outputName);

const sourceName = fs.readdirSync(folder)
  .filter((name) => /\.json$/i.test(name) && name !== outputName)
  .find((name) => /MONITORAMENTO.*V8[._ -]?1/i.test(name));

if (!sourceName) {
  throw new Error('Não encontrei o JSON da V8.1 nesta pasta. Mantenha o arquivo V8.1 junto deste gerador.');
}

function findClosingBrace(source, openingIndex) {
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openingIndex; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }
    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '\'' || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error('Não foi possível localizar o fim da função extractCoupon.');
}

// Esta função não altera a leitura de preço/estoque da V8.1. Ela só normaliza
// as variações de texto de cupom encontradas no PDP do Mercado Livre.
const extractCoupon = (html, priceBlock) => {
  const rawHtml = `${String(html || '')}\n${String(priceBlock || '')}`;
  const clean = (value) => String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();

  const toMoney = (value) => {
    let text = String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[^\d,.-]/g, '')
      .trim();
    if (!text) return null;

    const hasComma = text.includes(',');
    const hasDot = text.includes('.');
    if (hasComma && hasDot) {
      text = text.lastIndexOf(',') > text.lastIndexOf('.')
        ? text.replace(/\./g, '').replace(',', '.')
        : text.replace(/,/g, '');
    } else if (hasComma) {
      text = text.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(?:\.\d{3})+$/.test(text)) {
      text = text.replace(/\./g, '');
    }

    const number = Number(text);
    return Number.isFinite(number) && number > 0 ? number : null;
  };

  const money = (value) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value).replace(/\u00a0/g, ' ');

  const snippets = [];
  const addSnippet = (value) => {
    const normalized = clean(value);
    if (normalized && !snippets.includes(normalized)) snippets.push(normalized);
  };

  // Blocos específicos do PDP, inclusive o novo ui-vpp-coupons-awareness.
  const blockPattern = /<(?:div|span|button|a|p)\b[^>]*class=["'][^"']*(?:ui-vpp-coupons-awareness|coupon|coupons|price-breakdown)[^"']*["'][^>]*>[\s\S]{0,3000}/gi;
  for (const match of rawHtml.matchAll(blockPattern)) addSnippet(match[0]);

  // Fallback textual para páginas cuja marcação muda, mas o aviso continua visível.
  const textPattern = /(?:compre\s+R\$\s*[\d.,]+\s+e\s+ganhe[\s\S]{0,120}|R\$\s*[\d.,]+\s+com\s+cupom(?:\s+por\s+seguir\s+a\s+loja)?|\d+(?:[.,]\d+)?\s*%\s*(?:off|de\s+desconto)\s+com\s+cupom)/gi;
  for (const match of rawHtml.matchAll(textPattern)) addSnippet(match[0]);
  if (!snippets.length) addSnippet(rawHtml);

  for (const text of snippets) {
    const minimumMatch = text.match(/compre\s+(R\$\s*[\d.,]+)\s+e\s+ganhe\s+(R\$\s*[\d.,]+|\d+(?:[.,]\d+)?\s*%\s*(?:off|de\s+desconto)?)/i);
    if (minimumMatch) {
      const minimum = toMoney(minimumMatch[1]);
      const benefitText = minimumMatch[2].trim();
      const benefitMoney = toMoney(benefitText);
      const benefitPercent = benefitText.match(/(\d+(?:[.,]\d+)?)\s*%/);
      if (minimum && benefitPercent) {
        return `Cupom: ${benefitPercent[1].replace(',', '.')}% OFF em compras a partir de ${money(minimum)}`;
      }
      if (minimum && benefitMoney) {
        return `Cupom: ${money(benefitMoney)} OFF em compras a partir de ${money(minimum)}`;
      }
    }

    const directPrice = text.match(/(R\$\s*[\d.,]+)\s+com\s+cupom(?:\s+por\s+(seguir\s+a\s+loja))?/i);
    if (directPrice) {
      const price = toMoney(directPrice[1]);
      if (price) {
        const condition = directPrice[2] ? ` · Condição: ${directPrice[2].toLowerCase()}` : '';
        return `Preço com cupom: ${money(price)}${condition}`;
      }
    }

    const percentMatch = text.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:off|de\s+desconto)\s+com\s+cupom/i);
    if (percentMatch) {
      const percent = percentMatch[1].replace(',', '.');
      const priceMeta = String(priceBlock || rawHtml).match(/<meta\b[^>]*itemprop=["']price["'][^>]*content=["']([\d.,]+)["']/i)
        || String(priceBlock || rawHtml).match(/<meta\b[^>]*content=["']([\d.,]+)["'][^>]*itemprop=["']price["']/i);
      const currentPrice = priceMeta ? toMoney(priceMeta[1]) : null;
      if (currentPrice) return `Preço com cupom: ${money(currentPrice)} · Oferta com cupom: ${percent}% OFF`;
      return `Cupom: ${percent}% OFF`;
    }
  }

  return '';
};

function validateCouponParser() {
  const fixtures = [
    ['Compre R$ 99 e ganhe 10% OFF', '', 'Cupom: 10% OFF em compras a partir de R$ 99,00'],
    ['Compre R$ 240 e ganhe R$ 12 OFF', '', 'Cupom: R$ 12,00 OFF em compras a partir de R$ 240,00'],
    ['R$ 44,99 com Cupom', '', 'Preço com cupom: R$ 44,99'],
    ['R$ 54,14 com Cupom por seguir a loja', '', 'Preço com cupom: R$ 54,14 · Condição: seguir a loja'],
    ['50% OFF com Cupom', '<meta itemprop="price" content="58.90">', 'Preço com cupom: R$ 58,90 · Oferta com cupom: 50% OFF'],
  ];
  for (const [html, priceBlock, expected] of fixtures) {
    const actual = extractCoupon(html, priceBlock);
    if (actual !== expected) throw new Error(`Autoteste de cupom falhou. Esperado: ${expected}; recebido: ${actual}`);
  }
}

validateCouponParser();

const workflow = JSON.parse(fs.readFileSync(path.join(folder, sourceName), 'utf8'));
const processor = workflow.nodes?.find((node) => node.name === 'PROCESSA RESPOSTA');
const originalCode = processor?.parameters?.jsCode;
if (!processor || typeof originalCode !== 'string') {
  throw new Error('Não encontrei o nó PROCESSA RESPOSTA com código JavaScript na V8.1.');
}

const functionStart = originalCode.indexOf('const extractCoupon =');
if (functionStart < 0) {
  throw new Error('A V8.1 não possui a função extractCoupon esperada. Nenhum arquivo foi gerado.');
}
const braceStart = originalCode.indexOf('{', functionStart);
const braceEnd = findClosingBrace(originalCode, braceStart);
let replaceEnd = braceEnd + 1;
if (originalCode[replaceEnd] === ';') replaceEnd += 1;

processor.parameters.jsCode = `${originalCode.slice(0, functionStart)}const extractCoupon = ${extractCoupon.toString()};${originalCode.slice(replaceEnd)}`;
workflow.name = 'MONITORAMENTO DE PREÇO — V8.2 CUPONS PRECISOS';
workflow.active = false;
workflow.meta = {
  ...(workflow.meta || {}),
  economizaiVersion: 'v8.2-coupons-precisos',
  sourceWorkflow: sourceName,
  generatedAt: new Date().toISOString(),
};

const tempPath = `${outputPath}.tmp`;
fs.writeFileSync(tempPath, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');
fs.renameSync(tempPath, outputPath);
console.log(`Gerado com sucesso: ${outputPath}`);

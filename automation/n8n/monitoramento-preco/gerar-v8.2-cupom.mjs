import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const folder = resolve('automation/n8n/monitoramento-preco');
const sourceFile = resolve(folder, 'MONITORAMENTO-DE-PRECO-V8.1-CUPONS-AMPLIADOS.json');
const targetFile = resolve(folder, 'MONITORAMENTO-DE-PRECO-V8.2-CUPONS-PRECISOS.json');

const flow = JSON.parse(await readFile(sourceFile, 'utf8'));
const byName = (name) => flow.nodes.find((node) => node.name === name);
const clone = (value) => JSON.parse(JSON.stringify(value));

const processa = byName('PROCESSA RESPOSTA');
const postgresTemplate = byName('ATUALIZA OFERTA (preco mudou)') || byName('MARCA COMO VERIFICADO');
if (!processa || !postgresTemplate) {
  throw new Error('O fluxo V8.1 não contém os nós-base esperados.');
}

const couponCode = String.raw`// NORMALIZA CUPOM V8.2
// Mantém o resultado de preço do PROCESSA RESPOSTA intacto.
// O cupom é somente informativo: ele nunca altera precoNovo.
const result = { ...$input.first().json };
const request = $('REQUISITA PAGINA PRODUTO').item?.json ?? {};
const html = String(request.data ?? request.body ?? request.html ?? request.response ?? '');

function plainText(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;|&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBrl(value) {
  const match = String(value || '').replace(/\u00a0/g, ' ').match(/R\$\s*([\d.]+)(?:,(\d{1,2}))?/i);
  if (!match) return null;
  const integer = Number(match[1].replace(/\./g, ''));
  if (!Number.isFinite(integer)) return null;
  const cents = match[2] ? Number(match[2].padEnd(2, '0').slice(0, 2)) : 0;
  return Number((integer + cents / 100).toFixed(2));
}

function brl(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function couponInfo() {
  const text = plainText(html);
  if (!text) return null;

  // Ex.: "Compre R$ 240 e ganhe R$ 12 OFF" ou "Compre R$ 99 e ganhe 10% OFF".
  // O primeiro valor é condição mínima e nunca é usado como preço do produto.
  const threshold = text.match(/\bCompre\s+(R\$\s*[\d.]+(?:,\d{1,2})?)\s+e\s+ganhe\s+((?:R\$\s*[\d.]+(?:,\d{1,2})?|\d+(?:[.,]\d+)?\s*%)\s*OFF)\b/i);
  if (threshold) {
    const minimum = parseBrl(threshold[1]);
    const rewardMoney = parseBrl(threshold[2]);
    const reward = rewardMoney !== null
      ? brl(rewardMoney) + ' OFF'
      : threshold[2].replace(/\s+/g, ' ').trim().replace(/\s*OFF$/i, '% OFF');
    if (minimum !== null) return 'Cupom: ' + reward + ' em compras a partir de ' + brl(minimum);
  }

  // Ex.: "R$ 54,14 com Cupom por seguir a loja".
  // A vírgula dos centavos é preservada por parseBrl().
  const directPrice = text.match(/(?:Preço\s+com\s+cupom[:\s]*)?(R\$\s*[\d.]+(?:,\d{1,2})?)\s+com\s+Cupom(?:\s+por\s+seguir\s+a\s+loja)?/i);
  if (directPrice) {
    const discounted = parseBrl(directPrice[1]);
    if (discounted !== null) {
      const followsStore = /com\s+Cupom\s+por\s+seguir\s+a\s+loja/i.test(directPrice[0]);
      return 'Preço com cupom: ' + brl(discounted) + (followsStore ? ' · Condição: seguir a loja' : '');
    }
  }

  const hasCoupon = /\bcom\s+cupom\b|\bcupons?\s+dispon[ií]veis\b/i.test(text);
  if (!hasCoupon) return null;

  // Ex.: "R$ 58,90 50% OFF com Cupom". O preço é o já confirmado pelo parser principal.
  const currentPrice = Number(result.precoNovo ?? result.detectedCurrentPrice ?? result.precoDetectado ?? result.precoSalvo);
  const percent = text.match(/(\d+(?:[.,]\d+)?\s*%\s*(?:OFF|de desconto))\s+com\s+Cupom/i)
    || text.match(/com\s+Cupom\s*[·–-]?\s*(\d+(?:[.,]\d+)?\s*%\s*(?:OFF|de desconto))/i);
  const parts = [];
  if (Number.isFinite(currentPrice) && currentPrice > 0) parts.push('Preço com cupom: ' + brl(currentPrice));
  if (percent) parts.push('Oferta com cupom: ' + percent[1].replace(/de desconto/i, 'OFF').replace(/\s+/g, ' ').trim());
  return parts.join(' · ') || 'Cupom disponível';
}

const coupon = couponInfo();
result.cupom = coupon;
result.coupon_text = coupon;

if (coupon) {
  const source = String(result.fonte || result.priceSource || '');
  const taggedSource = source.includes('cupom_informativo') ? source : (source ? source + '+cupom_informativo' : 'cupom_informativo');
  result.fonte = taggedSource;
  result.priceSource = taggedSource;
  if (result.rota === 'sem_alteracao') {
    result.motivo = 'Sem alteração de preço · Cupom confirmado: ' + coupon;
  } else if (result.rota === 'atualizar_preco') {
    result.motivo = result.motivo ? result.motivo + ' · Cupom confirmado: ' + coupon : 'Preço atualizado · Cupom confirmado: ' + coupon;
  }
} else if (result.rota === 'sem_alteracao' && /Cupom confirmado/i.test(String(result.motivo || ''))) {
  result.motivo = 'Sem alteração: preço atual, referência e desconto confirmados';
}

return [{ json: result }];`;

const restoreCode = String.raw`// Restaura o resultado normalizado após o UPDATE do cupom.
// O nó PostgreSQL retorna apenas a linha atualizada; o roteamento precisa
// receber novamente todos os campos calculados por NORMALIZA CUPOM V8.2.
return $('NORMALIZA CUPOM V8.2').all();`;

const normalize = clone(processa);
normalize.name = 'NORMALIZA CUPOM V8.2';
normalize.position = [processa.position[0] + 250, processa.position[1] - 90];
normalize.parameters = { ...normalize.parameters, jsCode: couponCode };

const updateCoupon = clone(postgresTemplate);
updateCoupon.name = 'ATUALIZA CUPOM DO PRODUTO V8.2';
updateCoupon.position = [processa.position[0] + 510, processa.position[1] - 90];
updateCoupon.parameters = {
  ...updateCoupon.parameters,
  query: String.raw`UPDATE public.products
SET coupon_text = NULLIF('{{ String($json.coupon_text || '').replace(/'/g, "''") }}', '')
WHERE id = '{{ $json.product_id }}'::uuid
RETURNING id;`,
};

const restore = clone(processa);
restore.name = 'RESTAURA RESULTADO V8.2';
restore.position = [processa.position[0] + 760, processa.position[1] - 90];
restore.parameters = { ...restore.parameters, jsCode: restoreCode };

for (const node of [normalize, updateCoupon, restore]) {
  const index = flow.nodes.findIndex((existing) => existing.name === node.name);
  if (index >= 0) flow.nodes.splice(index, 1);
  flow.nodes.push(node);
}

const originalTargets = clone(flow.connections['PROCESSA RESPOSTA']?.main || []);
if (!originalTargets.length) throw new Error('PROCESSA RESPOSTA não possui uma conexão de saída.');
flow.connections['PROCESSA RESPOSTA'] = {
  ...(flow.connections['PROCESSA RESPOSTA'] || {}),
  main: [[{ node: normalize.name, type: 'main', index: 0 }]],
};
flow.connections[normalize.name] = { main: [[{ node: updateCoupon.name, type: 'main', index: 0 }]] };
flow.connections[updateCoupon.name] = { main: [[{ node: restore.name, type: 'main', index: 0 }]] };
flow.connections[restore.name] = { main: originalTargets };

flow.name = 'MONITORAMENTO DE PREÇO — BANCO DO SITE V8.2 (Cupom preciso)';
flow.active = false;
flow.updatedAt = new Date().toISOString();
await writeFile(targetFile, JSON.stringify(flow, null, 2) + '\n', 'utf8');
console.log(targetFile);

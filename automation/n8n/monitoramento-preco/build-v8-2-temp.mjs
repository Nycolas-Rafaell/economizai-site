import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const outputFile = path.join(directory, 'MONITORAMENTO-DE-PRECO-V8.2-CUPONS-PRECISOS.json');
const preferredSources = [
  'MONITORAMENTO-DE-PRECO-V8.1-CUPONS-AMPLIADOS.json',
  'MONITORAMENTO-DE-PRECO-V8-CUPONS.json',
  'MONITORAMENTO-DE-PRECO-V7-MOTIVOS-DE-ATUALIZACAO.json',
];
const sourceFile = preferredSources
  .map((name) => path.join(directory, name))
  .find((candidate) => fs.existsSync(candidate));

if (!sourceFile) {
  throw new Error('Não encontrei uma versão-base V7/V8 do monitoramento nesta pasta.');
}

const flow = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
const nodes = flow.nodes || [];
const connections = flow.connections || {};
const byName = (name) => nodes.find((node) => node.name === name);
const clone = (node) => JSON.parse(JSON.stringify(node));
const codeField = (node) => Object.prototype.hasOwnProperty.call(node.parameters || {}, 'jsCode') ? 'jsCode' : 'code';
const setCode = (node, source) => {
  node.parameters ||= {};
  node.parameters[codeField(node)] = source;
};

const parser = byName('PROCESSA RESPOSTA');
const offerUpdate = byName('ATUALIZA OFERTA (preco mudou)');
const counter = byName('CONTA: sem alteracao');
if (!parser || !offerUpdate || !counter) {
  throw new Error('A versão-base não contém os nós esperados: PROCESSA RESPOSTA, ATUALIZA OFERTA (preco mudou), CONTA: sem alteracao.');
}

for (const name of ['NORMALIZA CUPOM V8.2', 'ATUALIZA CUPOM DO PRODUTO V8.2', 'RESTAURA RESULTADO V8.2']) {
  const index = nodes.findIndex((node) => node.name === name);
  if (index >= 0) nodes.splice(index, 1);
  delete connections[name];
}

const normalizer = clone(parser);
normalizer.id = `${parser.id || 'processa'}-coupon-v82`;
normalizer.name = 'NORMALIZA CUPOM V8.2';
normalizer.position = [(parser.position?.[0] || 0) + 250, (parser.position?.[1] || 0) - 150];
setCode(normalizer, String.raw`// NORMALIZA CUPOM V8.2 — informativo; nunca altera o preço principal.
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
  return Number.isFinite(number)
    ? number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null;
}

function readCoupon() {
  const text = plainText(html);
  if (!text) return null;

  // Ex.: "Compre R$ 240 e ganhe R$ 12 OFF". R$ 240 é condição, não preço do produto.
  const threshold = text.match(/\bCompre\s+(R\$\s*[\d.]+(?:,\d{1,2})?)\s+e\s+ganhe\s+((?:R\$\s*[\d.]+(?:,\d{1,2})?|\d+(?:[.,]\d+)?\s*%)\s*OFF)\b/i);
  if (threshold) {
    const minimum = parseBrl(threshold[1]);
    const money = parseBrl(threshold[2]);
    const reward = money !== null ? `${brl(money)} OFF` : threshold[2].replace(/\s+/g, ' ').trim();
    if (minimum !== null) return `Cupom: ${reward} em compras a partir de ${brl(minimum)}`;
  }

  // Ex.: "R$ 54,14 com Cupom por seguir a loja".
  const direct = text.match(/(R\$\s*[\d.]+(?:,\d{1,2})?)\s+com\s+Cupom(?:\s+por\s+seguir\s+a\s+loja)?/i);
  if (direct) {
    const price = parseBrl(direct[1]);
    if (price !== null) {
      const followStore = /por\s+seguir\s+a\s+loja/i.test(direct[0]);
      return `Preço com cupom: ${brl(price)}${followStore ? ' · Condição: seguir a loja' : ''}`;
    }
  }

  // Ex.: preço normal acompanhado por "50% OFF com Cupom".
  const percent = text.match(/(\d+(?:[.,]\d+)?\s*%\s*(?:OFF|de desconto))\s+com\s+Cupom/i)
    || text.match(/com\s+Cupom\s*[·–-]?\s*(\d+(?:[.,]\d+)?\s*%\s*(?:OFF|de desconto))/i);
  if (percent) {
    const current = Number(result.precoNovo ?? result.detectedCurrentPrice ?? result.precoDetectado ?? result.precoSalvo);
    const formatted = Number.isFinite(current) && current > 0 ? `Preço com cupom: ${brl(current)} · ` : '';
    return `${formatted}Oferta com cupom: ${percent[1].replace(/de desconto/i, 'OFF').replace(/\s+/g, ' ').trim()}`;
  }

  return null;
}

const coupon = readCoupon();
result.cupom = coupon;
result.coupon_text = coupon;

if (coupon) {
  const source = String(result.fonte || result.priceSource || '');
  const tagged = source.includes('cupom_informativo') ? source : (source ? `${source}+cupom_informativo` : 'cupom_informativo');
  result.fonte = tagged;
  result.priceSource = tagged;
  if (result.rota === 'sem_alteracao') result.motivo = `Sem alteração de preço · Cupom confirmado: ${coupon}`;
  if (result.rota === 'atualizar_preco') result.motivo = result.motivo ? `${result.motivo} · Cupom confirmado: ${coupon}` : `Preço atualizado · Cupom confirmado: ${coupon}`;
}

return [{ json: result }];`);

const couponUpdate = clone(offerUpdate);
couponUpdate.id = `${offerUpdate.id || 'atualiza'}-coupon-v82`;
couponUpdate.name = 'ATUALIZA CUPOM DO PRODUTO V8.2';
couponUpdate.position = [(parser.position?.[0] || 0) + 500, (parser.position?.[1] || 0) - 150];
couponUpdate.parameters ||= {};
couponUpdate.parameters.operation = 'executeQuery';
couponUpdate.parameters.query = String.raw`UPDATE public.products
SET coupon_text = NULLIF('{{ String($json.coupon_text || '').replace(/'/g, "''") }}', '')
WHERE id = '{{ $json.product_id }}'::uuid
RETURNING id;`;

const restore = clone(counter);
restore.id = `${counter.id || 'restaura'}-coupon-v82`;
restore.name = 'RESTAURA RESULTADO V8.2';
restore.position = [(parser.position?.[0] || 0) + 750, (parser.position?.[1] || 0) - 150];
setCode(restore, "return $('NORMALIZA CUPOM V8.2').all();");

const originalTargets = JSON.parse(JSON.stringify(connections[parser.name]?.main || []));
connections[parser.name] = { main: [[{ node: normalizer.name, type: 'main', index: 0 }]] };
connections[normalizer.name] = { main: [[{ node: couponUpdate.name, type: 'main', index: 0 }]] };
connections[couponUpdate.name] = { main: [[{ node: restore.name, type: 'main', index: 0 }]] };
connections[restore.name] = { main: originalTargets.length ? originalTargets : [[{ node: 'ROTEIA RESULTADO', type: 'main', index: 0 }]] };

nodes.push(normalizer, couponUpdate, restore);
flow.name = 'MONITORAMENTO DE PREÇO — BANCO DO SITE (V8.2 · cupons precisos)';
flow.active = false;
flow.updatedAt = new Date().toISOString();
fs.writeFileSync(outputFile, JSON.stringify(flow, null, 2) + '\n', 'utf8');

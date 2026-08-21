import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const folder = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(folder, 'MONITORAMENTO-DE-PRECO-V7-MOTIVOS-DE-ATUALIZACAO.json');
const parserPath = join(folder, 'PROCESSA-RESPOSTA-V8-CUPONS.js');
const targetPath = join(folder, 'MONITORAMENTO-DE-PRECO-V8-CUPONS.json');

const workflow = JSON.parse(await readFile(sourcePath, 'utf8'));
const parser = await readFile(parserPath, 'utf8');

const node = (name) => {
  const found = workflow.nodes.find((item) => item.name === name);
  if (!found) throw new Error(`Nó não encontrado no V7: ${name}`);
  return found;
};

const replaceQuery = (name, query) => {
  const target = node(name);
  if (!target.parameters || typeof target.parameters.query !== 'string') {
    throw new Error(`O nó ${name} não possui parameters.query em formato de texto.`);
  }
  target.parameters.query = query;
};

workflow.name = 'MONITORAMENTO DE PREÇO — V8 CUPONS INFORMATIVOS';
workflow.active = false;
node('PROCESSA RESPOSTA').parameters.jsCode = parser;

const eligible = node('BUSCA OFERTAS ELEGIVEIS');
if (!eligible.parameters?.query?.includes('p.title AS product_title')) {
  throw new Error('Não foi possível localizar p.title AS product_title na consulta de ofertas elegíveis.');
}
eligible.parameters.query = eligible.parameters.query.replace(
  'p.title AS product_title',
  'p.title AS product_title,\n  p.coupon_text AS coupon_text',
);

replaceQuery('ATUALIZA OFERTA (preco mudou)', `=WITH oferta_atualizada AS (
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
  SET coupon_text = '{{ String($('PROCESSA RESPOSTA').item.json.couponText || '').replace(/'/g, "''") }}'
  FROM oferta_atualizada o
  WHERE p.id = o.product_id
    AND {{ $('PROCESSA RESPOSTA').item.json.couponDetected ? 'true' : 'false' }}
    AND '{{ String($('PROCESSA RESPOSTA').item.json.couponText || '').replace(/'/g, "''") }}' <> ''
  RETURNING p.id
)
SELECT id FROM oferta_atualizada`);

replaceQuery('MARCA COMO VERIFICADO', `=WITH oferta_verificada AS (
  UPDATE public.offers
  SET last_checked_at = now(),
      last_check_status = 'ok',
      last_check_error = NULL,
      consecutive_check_failures = 0
  WHERE id = '{{ $('PROCESSA RESPOSTA').item.json.offer_id }}'
  RETURNING product_id, id
),
cupom_atualizado AS (
  UPDATE public.products p
  SET coupon_text = '{{ String($('PROCESSA RESPOSTA').item.json.couponText || '').replace(/'/g, "''") }}'
  FROM oferta_verificada o
  WHERE p.id = o.product_id
    AND {{ $('PROCESSA RESPOSTA').item.json.couponDetected ? 'true' : 'false' }}
    AND '{{ String($('PROCESSA RESPOSTA').item.json.couponText || '').replace(/'/g, "''") }}' <> ''
  RETURNING p.id
)
SELECT id FROM oferta_verificada`);

workflow.meta = {
  ...(workflow.meta || {}),
  templateCredsSetupCompleted: true,
  economizaiVersion: 'v8-coupons-informativos',
  economizaiNotes: 'Cupom é atualizado em public.products.coupon_text apenas quando o PDP o confirma; valores de cupom não substituem current_price.',
};

await writeFile(targetPath, `${JSON.stringify(workflow, null, 2)}\n`, 'utf8');
console.log(`Fluxo V8 gerado: ${targetPath}`);

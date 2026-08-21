import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(here, 'MONITORAMENTO-DE-PRECO-V8.1-CUPONS-AMPLIADOS.json');
const target = path.join(here, 'MONITORAMENTO-DE-PRECO-V8.2-CUPONS-PRECISOS.json');

const workflow = JSON.parse(fs.readFileSync(source, 'utf8'));
const processor = workflow.nodes.find((node) => node.name === 'PROCESSA RESPOSTA');

if (!processor?.parameters?.jsCode) {
  throw new Error('Nó PROCESSA RESPOSTA não encontrado no fluxo V8.1.');
}

const helper = `

// V8.2 — cupons informativos com valores e condições exatos.
// Nunca use o resultado desta função para alterar precoNovo/precoOriginalNovo.
function extractCouponV82(html) {
  const source = String(html || '');
  if (!source) return '';

  const decode = (value) => String(value || '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/<[^>]*>/g, ' ')
    .replace(/\\s*([,.])\\s*/g, '$1')
    .replace(/\\s+/g, ' ')
    .trim();

  const toNumber = (whole, cents = '') => {
    const integer = String(whole || '').replace(/[^\\d]/g, '');
    if (!integer) return null;
    const decimal = String(cents || '').replace(/[^\\d]/g, '').slice(0, 2);
    const value = Number(\`\${integer}\${decimal ? \`.\${decimal.padEnd(2, '0')}\` : ''}\`);
    return Number.isFinite(value) ? value : null;
  };

  const brl = (value) => Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const blocks = [];
  const lower = source.toLowerCase();
  let position = 0;
  while ((position = lower.indexOf('cupom', position)) !== -1 && blocks.length < 80) {
    blocks.push(source.slice(Math.max(0, position - 1200), Math.min(source.length, position + 2400)));
    position += 5;
  }

  for (const rawBlock of blocks) {
    const text = decode(rawBlock);
    if (!/cupom/i.test(text)) continue;

    // Ex.: "Compre R$ 240 e ganhe R$ 12 OFF".
    let match = text.match(/compre\\s+r?\\$?\\s*([\\d.]+)\\s*(?:,\\s*(\\d{1,2}))?\\s+e\\s+ganhe\\s+r?\\$?\\s*([\\d.]+)\\s*(?:,\\s*(\\d{1,2}))?\\s*(?:de\\s*)?off/i);
    if (match) {
      const min = toNumber(match[1], match[2]);
      const off = toNumber(match[3], match[4]);
      if (min !== null && off !== null) {
        return \`Cupom: \${brl(off)} OFF em compras a partir de \${brl(min)}\`;
      }
    }

    // Ex.: "Compre R$ 99 e ganhe 10% OFF".
    match = text.match(/compre\\s+r?\\$?\\s*([\\d.]+)\\s*(?:,\\s*(\\d{1,2}))?\\s+e\\s+ganhe\\s+(\\d+(?:[,.]\\d+)?)\\s*%\\s*(?:de\\s*)?off/i);
    if (match) {
      const min = toNumber(match[1], match[2]);
      if (min !== null) {
        return \`Cupom: \${String(match[3]).replace(',', '.')}% OFF em compras a partir de \${brl(min)}\`;
      }
    }

    // Ex.: "R$ 54,14 com Cupom por seguir a loja". Mantém os centavos reais.
    match = text.match(/r\\$\\s*([\\d.]+)\\s*(?:,\\s*(\\d{1,2}))?\\s+(?:com\\s+)?cupom\\b/i);
    if (match) {
      const price = toNumber(match[1], match[2]);
      if (price !== null) {
        const condition = /seguir\\s+a\\s+loja/i.test(text) ? ' · Condição: seguir a loja' : '';
        return \`Preço com cupom: \${brl(price)}\${condition}\`;
      }
    }

    // Ex.: "50% OFF com Cupom". É desconto/condição, não preço do produto.
    match = text.match(/(\\d+(?:[,.]\\d+)?)\\s*%\\s*off\\s*(?:com\\s+)?cupom\\b/i)
      || text.match(/(?:com\\s+)?cupom\\b[\\s:·-]*(\\d+(?:[,.]\\d+)?)\\s*%\\s*off/i);
    if (match) return \`Cupom: \${String(match[1]).replace(',', '.')}% OFF\`;
  }

  return '';
}
`;

const assignment = /((?:const|let)\\s+[A-Za-z_$][\\w$]*(?:coupon|cupom)[\\w$]*\\s*=\\s*)extractCoupon\\(([^)]*)\\)/i;
if (!assignment.test(processor.parameters.jsCode)) {
  throw new Error('Não foi possível localizar a chamada extractCoupon(...) no PROCESSA RESPOSTA V8.1.');
}

processor.parameters.jsCode = processor.parameters.jsCode.replace(
  assignment,
  '$1(extractCouponV82($2) || extractCoupon($2))',
) + helper;

workflow.name = 'MONITORAMENTO DE PREÇO — BANCO DO SITE V8.2 (Cupons precisos)';
workflow.active = false;
workflow.meta = {
  ...(workflow.meta || {}),
  version: '8.2',
  description: 'V8.1 preservada; leitura de cupons com centavos e condições exatos.',
};

// Valida a sintaxe do código antes de gerar o JSON importável.
new Function(processor.parameters.jsCode);
fs.writeFileSync(target, `${JSON.stringify(workflow, null, 2)}\\n`, 'utf8');
console.log(`Gerado: ${target} (${workflow.nodes.length} nós)`);

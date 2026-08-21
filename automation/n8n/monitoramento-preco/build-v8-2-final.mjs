import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(directory, 'MONITORAMENTO-DE-PRECO-V8.1-CUPONS-AMPLIADOS.json');
const targetPath = path.join(directory, 'MONITORAMENTO-DE-PRECO-V8.2-CUPONS-PRECISOS.json');

const workflow = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const processor = workflow.nodes.find((node) => node.name === 'PROCESSA RESPOSTA');

if (!processor?.parameters?.jsCode) {
  throw new Error('Nó PROCESSA RESPOSTA não encontrado no fluxo V8.1.');
}

let code = processor.parameters.jsCode;
const assignmentPattern = /((?:const|let)\s+[A-Za-z_$][\w$]*\s*=\s*)extractCoupon\(([^)]*)\)/i;
if (!assignmentPattern.test(code)) {
  throw new Error('Não foi possível localizar a chamada extractCoupon() do fluxo V8.1.');
}

code = code.replace(
  assignmentPattern,
  '$1(extractCouponV82($2) || extractCoupon($2))',
);

code += `

// V8.2 — leitura complementar e exclusivamente informativa de cupons.
// Nunca altera precoNovo, precoOriginalNovo nem a rota de preço.
function extractCouponV82(html) {
  const raw = String(html || '');
  if (!raw) return '';

  const text = raw
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim();

  const normalizeMoney = (integerPart, centsPart) => {
    const integer = String(integerPart || '').replace(/\\D/g, '');
    const cents = centsPart == null ? '00' : String(centsPart).replace(/\\D/g, '').padEnd(2, '0').slice(0, 2);
    if (!integer) return '';
    return 'R$ ' + Number(integer).toLocaleString('pt-BR') + ',' + cents;
  };

  // Ex.: “Compre R$ 240 e ganhe R$ 12 OFF”.
  let match = text.match(/compre\\s*r\\$\\s*([\\d.]+)(?:\\s*[,\\.]\\s*(\\d{1,2}))?\\s*e\\s*ganhe\\s*r\\$\\s*([\\d.]+)(?:\\s*[,\\.]\\s*(\\d{1,2}))?\\s*(?:off|de\\s+desconto)/i);
  if (match) {
    return 'Cupom: ' + normalizeMoney(match[3], match[4]) + ' OFF em compras a partir de ' + normalizeMoney(match[1], match[2]);
  }

  // Ex.: “Compre R$ 99 e ganhe 10% OFF”.
  match = text.match(/compre\\s*r\\$\\s*([\\d.]+)(?:\\s*[,\\.]\\s*(\\d{1,2}))?\\s*e\\s*ganhe\\s*(\\d{1,3})\\s*%\\s*(?:off|de\\s+desconto)/i);
  if (match) {
    return 'Cupom: ' + match[3] + '% OFF em compras a partir de ' + normalizeMoney(match[1], match[2]);
  }

  // Ex.: “R$ 54,14 com Cupom por seguir a loja”.
  match = text.match(/r\\$\\s*([\\d.]+)(?:\\s*[,\\.]\\s*(\\d{1,2}))?\\s+com\\s+cupom(?:\\s+por\\s+seguir\\s+(?:a\\s+)?loja)?/i);
  if (match) {
    const followsStore = /com\\s+cupom\\s+por\\s+seguir\\s+(?:a\\s+)?loja/i.test(text);
    return 'Preço com cupom: ' + normalizeMoney(match[1], match[2]) + (followsStore ? ' · Condição: seguir a loja' : '');
  }

  // Ex.: “50% OFF com Cupom”. Não confunde com o preço principal.
  match = text.match(/(\\d{1,3})\\s*%\\s*(?:off|de\\s+desconto)\\s+com\\s+cupom/i);
  if (match) {
    return 'Cupom: ' + match[1] + '% OFF';
  }

  return '';
}
`;

// Validação sintática antes de salvar o JSON importável.
new Function(code);
processor.parameters.jsCode = code;
workflow.name = 'MONITORAMENTO DE PREÇO — BANCO DO SITE V8.2 (CUPONS PRECISOS)';
workflow.active = false;
workflow.meta = {
  ...(workflow.meta || {}),
  version: '8.2',
  description: 'Derivado do V8.1. Mantém preço e rotas intactos; melhora apenas a descrição de cupons.',
};

fs.writeFileSync(targetPath, JSON.stringify(workflow, null, 2) + '\n', 'utf8');
console.log(targetPath);

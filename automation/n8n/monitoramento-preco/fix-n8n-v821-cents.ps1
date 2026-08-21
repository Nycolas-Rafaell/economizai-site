$ErrorActionPreference = 'Stop'

$sourcePath = 'C:\Users\Rafae\Documents\Codex\2026-08-20\leia\outputs\MONITORAMENTO-DE-PRECO-V8.2-CUPONS-PRECISOS-CORRIGIDO.json'
$targetPath = 'C:\Users\Rafae\Documents\Codex\2026-08-20\leia\outputs\MONITORAMENTO-DE-PRECO-V8.2.1-CUPONS-COM-CENTAVOS.json'
$workflow = Get-Content -LiteralPath $sourcePath -Raw | ConvertFrom-Json
$processor = $workflow.nodes | Where-Object { $_.name -eq 'PROCESSA RESPOSTA' }

if ($null -eq $processor) {
  throw 'Nó PROCESSA RESPOSTA não encontrado.'
}

$marker = 'function extractCouponV82(html) {'
$start = $processor.parameters.jsCode.IndexOf($marker)
if ($start -lt 0) {
  throw 'Função extractCouponV82 original não encontrada.'
}

$newFunction = @'
function extractCouponV82(html, priceBlock) {
  const raw = String(html || '');
  if (!raw) return '';

  const couponPattern = /<(?:div|span|button)\b[^>]*class=["'][^"']*ui-vpp-coupons-awareness(?:__checkbox-label)?[^"']*["'][^>]*>/i;
  const windows = [
    ...findElementsBy(raw, couponPattern),
    ...findElementsBy(String(priceBlock || ''), couponPattern),
  ];

  // Fallback local para layouts em que o contêiner muda de classe.
  for (const match of raw.matchAll(/(?:com\s+cupom|ganhe[\s\S]{0,80}(?:off|desconto))/gi)) {
    const index = match.index || 0;
    windows.push(raw.slice(Math.max(0, index - 1800), Math.min(raw.length, index + 1800)));
  }

  const normalizeMoney = (integerPart, centsPart) => {
    const integer = String(integerPart || '').replace(/\D/g, '');
    const cents = centsPart == null ? '00' : String(centsPart).replace(/\D/g, '').padEnd(2, '0').slice(0, 2);
    if (!integer) return '';
    return 'R$ ' + Number(integer).toLocaleString('pt-BR') + ',' + cents;
  };

  const moneyFromAria = (block) => {
    const labels = [...String(block || '').matchAll(/aria-label=["']([^"']+)["']/gi)].map((entry) => entry[1]);
    const detailed = labels.find((label) => /\d[\d.]*\s*reais?\s+com\s+\d{1,2}\s*centavos?/i.test(label));
    const simple = labels.find((label) => /\d[\d.]*\s*reais?/i.test(label));
    const label = detailed || simple;
    if (!label) return '';
    const match = label.match(/(\d[\d.]*)\s*reais?(?:\s+com\s+(\d{1,2})\s*centavos?)?/i);
    return match ? normalizeMoney(match[1], match[2]) : '';
  };

  const visibleText = (block) => String(block || '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const seen = new Set();
  for (const block of windows) {
    if (!block || seen.has(block)) continue;
    seen.add(block);
    const text = visibleText(block);
    if (!/(cupom|compre\s*r\$)/i.test(text)) continue;

    let match = text.match(/compre\s*r\$\s*([\d.]+)(?:\s*[,\.]\s*(\d{1,2}))?\s*e\s*ganhe\s*r\$\s*([\d.]+)(?:\s*[,\.]\s*(\d{1,2}))?\s*(?:off|de\s+desconto)/i);
    if (match) {
      return 'Cupom: ' + normalizeMoney(match[3], match[4]) + ' OFF em compras a partir de ' + normalizeMoney(match[1], match[2]);
    }

    match = text.match(/compre\s*r\$\s*([\d.]+)(?:\s*[,\.]\s*(\d{1,2}))?\s*e\s*ganhe\s*(\d{1,3})\s*%\s*(?:off|de\s+desconto)/i);
    if (match) {
      return 'Cupom: ' + match[3] + '% OFF em compras a partir de ' + normalizeMoney(match[1], match[2]);
    }

    if (/com\s+cupom/i.test(text)) {
      // O aria-label do componente monetário é a fonte prioritária porque mantém
      // centavos que o texto acessível resumido do botão pode omitir.
      const ariaMoney = moneyFromAria(block);
      const visibleMatch = text.match(/r\$\s*([\d.]+)(?:\s*[,\.]\s*(\d{1,2}))?\s+com\s+cupom/i);
      const couponPrice = ariaMoney || (visibleMatch ? normalizeMoney(visibleMatch[1], visibleMatch[2]) : '');
      if (couponPrice) {
        const followsStore = /com\s+cupom\s+por\s+seguir\s+(?:a\s+)?loja/i.test(text);
        return 'Preço com cupom: ' + couponPrice + (followsStore ? ' · Condição: seguir a loja' : '');
      }
    }

    match = text.match(/(\d{1,3})\s*%\s*(?:off|de\s+desconto)\s+com\s+cupom/i);
    if (match) return 'Cupom: ' + match[1] + '% OFF';
  }

  return '';
}
'@

$processor.parameters.jsCode = $processor.parameters.jsCode.Substring(0, $start) + $newFunction
$processor.parameters.jsCode = $processor.parameters.jsCode.Replace(
  "const PARSER_VERSION = 'n8n-v8.2-pdp-preco-cupons-precisos';",
  "const PARSER_VERSION = 'n8n-v8.2.1-pdp-cupons-com-centavos';"
)

$workflow.name = 'MONITORAMENTO DE PREÇO — BANCO DO SITE V8.2.1 (CUPONS COM CENTAVOS)'
$workflow.meta.version = '8.2.1'
$workflow.meta.economizaiVersion = 'v8.2.1-cupons-com-centavos'
$workflow.meta.description = 'Mantém preço e rotas intactos; prioriza aria-label monetário dentro do componente de cupom para preservar centavos.'
$workflow.meta.notes = 'Cupom continua informativo e separado de current_price. Corrige R$ 44,99 e R$ 35,14 quando o texto acessível resumido omite centavos.'

$historyNode = $workflow.nodes | Where-Object { $_.name -eq 'GRAVA HISTORICO DE PRECO' }
if ($null -ne $historyNode) {
  $historyNode.parameters.columns.value.source = 'automacao-n8n-v8.2.1-cupons-centavos'
}

$json = $workflow | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($targetPath, $json, [System.Text.UTF8Encoding]::new($false))

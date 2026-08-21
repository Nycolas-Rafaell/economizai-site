$ErrorActionPreference = 'Stop'

$workflowPath = 'C:\Users\Rafae\Desktop\MONITORAMENTO-DE-PRECO-V8.2-CUPONS-PRECISOS.json'
$workflow = Get-Content -LiteralPath $workflowPath -Raw | ConvertFrom-Json
$processor = $workflow.nodes | Where-Object { $_.name -eq 'PROCESSA RESPOSTA' }

if ($null -eq $processor) {
  throw 'Nó PROCESSA RESPOSTA não encontrado.'
}

$oldCouponLine = "const coupon = (extractCouponV82(html, priceBlock) || extractCoupon(html, priceBlock));"
$newCouponBlock = @"
const couponV82Text = extractCouponV82(html, priceBlock);
const coupon = couponV82Text
  ? {
      detected: true,
      text: couponV82Text,
      kind: 'v8_2_texto_confirmado',
      source: 'texto_cupom_v8_2',
    }
  : extractCoupon(html, priceBlock);
"@.TrimEnd()

if (-not $processor.parameters.jsCode.Contains($oldCouponLine)) {
  throw 'Trecho original de integração do cupom não encontrado.'
}

$processor.parameters.jsCode = $processor.parameters.jsCode.Replace($oldCouponLine, $newCouponBlock)
$processor.parameters.jsCode = $processor.parameters.jsCode.Replace(
  "const PARSER_VERSION = 'n8n-v8.1-pdp-preco-cupons-ampliados';",
  "const PARSER_VERSION = 'n8n-v8.2-pdp-preco-cupons-precisos';"
)

$historyNode = $workflow.nodes | Where-Object { $_.name -eq 'GRAVA HISTORICO DE PRECO' }
if ($null -ne $historyNode -and $historyNode.parameters.columns.value.source -eq 'automacao-n8n-v7-motivos') {
  $historyNode.parameters.columns.value.source = 'automacao-n8n-v8.2-cupons-precisos'
}

$workflow.meta.economizaiVersion = 'v8.2-cupons-precisos'
$workflow.meta.notes = 'Mantém o parser de preços e normaliza o retorno do detector V8.2 para persistir cupons confirmados sem substituir current_price.'

$json = $workflow | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($workflowPath, $json, [System.Text.UTF8Encoding]::new($false))

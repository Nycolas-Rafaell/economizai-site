$ErrorActionPreference = 'Stop'

$sourcePath = 'C:\Users\Rafae\Downloads\Procurar produtos mercado livre.json'
$parserPath = 'C:\Users\Rafae\Documents\Codex\2026-08-20\leia\work\polycard-parser-v2.js'
$targetPath = 'C:\Users\Rafae\Documents\Codex\2026-08-20\leia\outputs\PROCURAR-PRODUTOS-MERCADO-LIVRE-V2.1-IDS-SEGUROS.json'

$workflow = Get-Content -LiteralPath $sourcePath -Raw | ConvertFrom-Json
$parserCode = Get-Content -LiteralPath $parserPath -Raw
$polyNode = $workflow.nodes | Where-Object { $_.name -eq 'PAGINA COM POLYCARD' }
$ifNode = $workflow.nodes | Where-Object { $_.name -eq 'If' }
$urlNode = $workflow.nodes | Where-Object { $_.name -eq 'LIMPAR URL PRODUTO' }

if ($null -eq $polyNode -or $null -eq $ifNode -or $null -eq $urlNode) {
  throw 'Um ou mais nós esperados não foram encontrados.'
}

$polyNode.parameters.jsCode = $parserCode

$idNode = $workflow.nodes | Where-Object { $_.name -eq 'EXTRAIR PRODUCTID' }
if ($null -eq $idNode) {
  throw 'Nó EXTRAIR PRODUCTID não encontrado.'
}
$idNode.parameters.jsCode = $idNode.parameters.jsCode.Replace(
  "dados.idProduto = obterIdProduto(dados.urlOriginal) || 'SEM_ID';",
  "dados.idProduto = dados.idProduto || obterIdProduto(dados.urlOriginal) || 'SEM_ID';"
)

$ifNode.parameters.conditions.conditions = @(
  [pscustomobject]@{
    id = 'e68e93cd-084c-45fe-bcf4-9aa1583e4287'
    leftValue = '={{ $json.data }}'
    rightValue = 'dynamic-carousel__item-container'
    operator = [pscustomobject]@{ type = 'string'; operation = 'contains' }
  },
  [pscustomobject]@{
    id = 'busca-ml-v2-prioriza-polycard'
    leftValue = '={{ $json.data }}'
    rightValue = 'poly-card'
    operator = [pscustomobject]@{ type = 'string'; operation = 'notContains' }
  }
)
$ifNode.parameters.conditions.combinator = 'and'

$urlNode.parameters.jsCode = @'
for (const item of $input.all()) {
  const data = item.json || {};
  const original = String(data.urlOriginal || '');
  try {
    const parsed = new URL(original);
    const base = `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '');
    const searchable = `${parsed.search}&${parsed.hash.replace(/^#/, '')}`;
    const actualWid = searchable.match(/(?:^|[?&#])wid=(MLB\d+)/i)?.[1]?.toUpperCase();
    data.urlOriginal = /\/p\/MLB\d+/i.test(parsed.pathname) && actualWid
      ? `${base}?wid=${actualWid}`
      : base;
  } catch (error) {
    data.urlOriginal = original.split('#')[0].split('?')[0];
  }
}
return $input.all();
'@

$validOutput = $workflow.connections.'FILTRA INVALIDOS'.main[0]
$workflow.connections.'FILTRA INVALIDOS'.main = @(
  @($validOutput),
  @([pscustomobject]@{ node = 'Wait1'; type = 'main'; index = 0 })
)

$workflow.name = 'PROCURAR PRODUTOS MERCADO LIVRE — V2.1 (IDS SEGUROS)'
$workflow.active = $false
$workflow.psobject.Properties.Remove('id')
$workflow.psobject.Properties.Remove('versionId')

if ($null -eq $workflow.meta) {
  $workflow | Add-Member -NotePropertyName meta -NotePropertyValue ([pscustomobject]@{})
}
$workflow.meta | Add-Member -Force -NotePropertyName economizaiVersion -NotePropertyValue 'busca-ml-v2.1-ids-seguros'
$workflow.meta | Add-Member -Force -NotePropertyName description -NotePropertyValue 'Mantém a captura V2 e corrige apenas IDs: wid primeiro, MLB direto, MLBU de /up/ e catálogo como fallback; nunca inventa wid.'

$json = $workflow | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($targetPath, $json, [System.Text.UTF8Encoding]::new($false))

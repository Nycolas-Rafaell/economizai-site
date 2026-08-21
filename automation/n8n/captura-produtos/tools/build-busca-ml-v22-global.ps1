$ErrorActionPreference = 'Stop'

$sourcePath = 'C:\Users\Rafae\Documents\Codex\2026-08-20\leia\outputs\PROCURAR-PRODUTOS-MERCADO-LIVRE-V2.1-IDS-SEGUROS.json'
$targetPath = 'C:\Users\Rafae\Documents\Codex\2026-08-20\leia\outputs\PROCURAR-PRODUTOS-MERCADO-LIVRE-V2.2.1-EMBARALHAMENTO-GLOBAL.json'
$workflow = Get-Content -LiteralPath $sourcePath -Raw | ConvertFrom-Json

$resetNode = [pscustomobject]@{
  parameters = [pscustomobject]@{
    jsCode = @'
const collector = $getWorkflowStaticData('global');
collector.produtosCapturados = [];
collector.categoriasProcessadas = 0;
collector.iniciadoEm = new Date().toISOString();
return $input.all();
'@
  }
  id = [guid]::NewGuid().ToString()
  name = 'RESET COLETOR GLOBAL'
  type = 'n8n-nodes-base.code'
  typeVersion = 2
  position = @(1440, 1500)
}

$collectNode = [pscustomobject]@{
  parameters = [pscustomobject]@{
    jsCode = @'
const collector = $getWorkflowStaticData('global');
collector.produtosCapturados = Array.isArray(collector.produtosCapturados)
  ? collector.produtosCapturados
  : [];

for (const item of $input.all()) {
  const product = item.json || {};
  if (!product.idProduto || product.idProduto === 'SEM_ID') continue;
  collector.produtosCapturados.push(JSON.parse(JSON.stringify(product)));
}

collector.categoriasProcessadas = (collector.categoriasProcessadas || 0) + 1;
return [{
  json: {
    categoriaColetada: true,
    categoriasProcessadas: collector.categoriasProcessadas,
    produtosAcumulados: collector.produtosCapturados.length,
  },
}];
'@
  }
  id = [guid]::NewGuid().ToString()
  name = 'COLETA PRODUTOS GLOBAL'
  type = 'n8n-nodes-base.code'
  typeVersion = 2
  position = @(3520, 1280)
}

$emitNode = [pscustomobject]@{
  parameters = [pscustomobject]@{
    jsCode = @'
const collector = $getWorkflowStaticData('global');
const captured = Array.isArray(collector.produtosCapturados)
  ? collector.produtosCapturados
  : [];

// Deduplicação final pelo identificador real antes de gravar na planilha.
const unique = new Map();
for (const product of captured) {
  const id = String(product.idProduto || '').trim().toUpperCase();
  if (!id || id === 'SEM_ID') continue;
  if (!unique.has(id)) unique.set(id, { ...product, idProduto: id });
}

// Fisher–Yates: todos os produtos de todas as categorias são misturados juntos.
const products = [...unique.values()];
for (let index = products.length - 1; index > 0; index -= 1) {
  const randomIndex = Math.floor(Math.random() * (index + 1));
  [products[index], products[randomIndex]] = [products[randomIndex], products[index]];
}

collector.totalAntesDeduplicacao = captured.length;
collector.totalDepoisDeduplicacao = products.length;
collector.produtosCapturados = [];

return products.map((product) => ({ json: product }));
'@
  }
  id = [guid]::NewGuid().ToString()
  name = 'EMBARALHA TODOS OS PRODUTOS'
  type = 'n8n-nodes-base.code'
  typeVersion = 2
  position = @(1980, 1080)
}

$workflow.nodes = @($workflow.nodes | Where-Object { $_.name -ne 'MISTURAR PRODUTOS' }) + @($resetNode, $collectNode, $emitNode)
$workflow.connections.psobject.Properties.Remove('MISTURAR PRODUTOS')

$workflow.connections.'MISTURAR'.main = ,@(
  [pscustomobject]@{ node = 'RESET COLETOR GLOBAL'; type = 'main'; index = 0 }
)
$workflow.connections | Add-Member -Force -NotePropertyName 'RESET COLETOR GLOBAL' -NotePropertyValue ([pscustomobject]@{
  main = ,@([pscustomobject]@{ node = 'PERCORRE CATEGORIAS'; type = 'main'; index = 0 })
})

$loopContinue = $workflow.connections.'PERCORRE CATEGORIAS'.main[1]
$workflow.connections.'PERCORRE CATEGORIAS'.main = @(
  @([pscustomobject]@{ node = 'EMBARALHA TODOS OS PRODUTOS'; type = 'main'; index = 0 }),
  @($loopContinue)
)

$workflow.connections.'EXTRAIR PRODUCTID'.main = ,@(
  [pscustomobject]@{ node = 'LIMPAR URL PRODUTO'; type = 'main'; index = 0 }
)
$workflow.connections.'LIMPAR URL PRODUTO'.main = ,@(
  [pscustomobject]@{ node = 'COLETA PRODUTOS GLOBAL'; type = 'main'; index = 0 }
)
$workflow.connections | Add-Member -Force -NotePropertyName 'COLETA PRODUTOS GLOBAL' -NotePropertyValue ([pscustomobject]@{
  main = ,@([pscustomobject]@{ node = 'Wait1'; type = 'main'; index = 0 })
})
$workflow.connections | Add-Member -Force -NotePropertyName 'EMBARALHA TODOS OS PRODUTOS' -NotePropertyValue ([pscustomobject]@{
  main = ,@([pscustomobject]@{ node = 'ARMAZENA PRODUTOS NA PLANILHA DE PRODUTOS'; type = 'main'; index = 0 })
})
$workflow.connections.'ARMAZENA PRODUTOS NA PLANILHA DE PRODUTOS'.main = ,@(
  [pscustomobject]@{ node = 'No Operation, do nothing'; type = 'main'; index = 0 }
)

$workflow.name = 'PROCURAR PRODUTOS MERCADO LIVRE — V2.2.1 (EMBARALHAMENTO GLOBAL)'
$workflow.active = $false
$workflow.meta.economizaiVersion = 'busca-ml-v2.2.1-embaralhamento-global'
$workflow.meta.description = 'Acumula produtos de todas as categorias, deduplica e aplica Fisher–Yates uma única vez antes de gravar o lote no Google Sheets.'
$workflow.meta | Add-Member -Force -NotePropertyName observacaoOrdemPlanilha -NotePropertyValue 'Em uma aba vazia, a ordem gravada será globalmente aleatória. appendOrUpdate não reposiciona linhas que já existiam.'

$json = $workflow | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText($targetPath, $json, [System.Text.UTF8Encoding]::new($false))

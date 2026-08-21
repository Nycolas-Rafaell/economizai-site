# Monitoramento de preço V5 — PDP confirmado

Arquivo para importar no n8n:

`MONITORAMENTO-DE-PRECO-V5-PRECO-PDP-CONFIRMADO.json`

## O que mudou em relação à V4

- Lê o preço atual somente dentro do bloco principal `#price` da página de produto.
- Prioriza `meta[itemprop="price"]` dentro de `.ui-pdp-price__second-line`.
- Confirma o valor pelo `aria-label` do mesmo elemento `itemprop="offers"` quando ambos existem.
- Lê o preço antigo somente da tag riscada `s.ui-pdp-price__original-value`.
- Ignora parcelas, recomendações, preços de outros vendedores e valores fora do bloco principal.
- Preço em faixa, variação ambígua, título divergente ou preço sem confirmação seguem para `revisao_manual`; não atualizam a oferta.
- Variações superiores a 3x também ficam em revisão, evitando atualizações extremas acidentais.

## Teste controlado

1. Importe a V5 e mantenha-a desativada.
2. Configure as mesmas credenciais Postgres já usadas na V4.
3. No nó `BUSCA OFERTAS ELEGIVEIS`, limite temporariamente a uma oferta conhecida.
4. Execute manualmente e compare `precoNovo` do nó `PROCESSA RESPOSTA` com o preço grande mostrado no PDP.
5. Só então ative o agendamento.

## Resultado esperado no HTML enviado

Para o bloco de preço da torneira, a V5 lê `R$ 54,00` como preço atual, `R$ 64,49` como preço antigo e `16%` de desconto. A parcela `12x R$ 5,32` é ignorada.

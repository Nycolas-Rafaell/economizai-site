# Monitoramento de preço — V6

Arquivo para importar: `MONITORAMENTO-DE-PRECO-V6-PDP-VARIACOES-CONFIRMADAS.json`.

## O que a V6 corrige

- Reconhece o título tanto no PDP de catálogo quanto nas páginas de variação (`produto.mercadolivre.com.br/..._JM`).
- Confirma a página pelo ID MLB encontrado na URL e no HTML, quando o título possuir pequenas variações.
- Lê o preço principal apenas dentro do bloco `#price`, exigindo a confirmação pelo `meta itemprop="price"` e pelo `aria-label` do mesmo valor.
- Reconhece o indicador `com Cupom` no bloco principal sem confundir parcelas com o preço do produto.
- Aceita variações acima de 3x somente quando o preço estiver confirmado pelas duas fontes do bloco principal. Caso contrário, continua mandando para revisão manual.
- Atualiza também preço antigo e desconto. Se a página não apresentar preço antigo, salva `original_price = NULL` e desconto `0`, removendo valores antigos que ficaram incorretos no banco.

## Teste recomendado

Importe a V6 sem apagar a V5. Depois atribua as mesmas credenciais de Postgres e HTTP usadas na V5 e teste primeiro cinco ofertas controladas:

- `e7efcccf-da27-43c8-92e8-b0f0a4c9ce51` — Garrafa térmica: esperado R$ 58,90 / R$ 119,90 / 50%.
- `f3f527a5-5268-4977-af5f-3e12fe869b86` — Tênis Salomon: esperado sem alteração em R$ 698,39 / R$ 1.199,00.
- `9e77990c-3d93-4bca-b654-f9e3bd0849e9` — Papel depilatório: o preço confirmado pode atualizar mesmo que a diferença em relação ao valor salvo seja grande.
- `59e4674c-335c-43d4-96ca-15e882c42843` — Sachê Gran Plus: idem.
- `6ce844eb-bbbd-4efd-b512-66c9ecc46fa3` — Glutamina: deve limpar o preço antigo se ele não estiver mais no PDP.

Mantenha o agendamento desligado até revisar o relatório final e os registros `last_check_status` dessas ofertas.

# Modelo oficial — Mercado Livre v3

Arquivo de referência para importação de ofertas no Economizaí:

`Modelo - Mercado Livre - v3 - Produtos.csv`

## Colunas reconhecidas

| Coluna | Uso |
| --- | --- |
| `Grupo` | Categoria principal do Economizaí. |
| `idProduto` | Identificador informado pela automação. A URL do produto ainda é priorizada para evitar IDs de campanha repetidos. |
| `nomeProduto` | Título da oferta. |
| `imagemProduto` | URL da imagem principal. |
| `precoAtual` | Preço atual numérico, com ponto ou vírgula decimal. |
| `precoOriginal` | Preço anterior. Pode ficar vazio quando indisponível. |
| `desconto` | Desconto textual opcional; se vazio, o site calcula a partir dos preços. |
| `precoFormatado` | Informação de origem; não é usada para calcular preço. |
| `urlOriginal` | URL pública do anúncio. |
| `urlAfiliado` | URL de afiliado usada pelo botão de oferta. |
| `status` | Use `PRONTO` para permitir a importação. |
| `notaNumero` | Nota numérica do anúncio. |
| `quantidadeVendidasNumero` | Quantidade numérica para análises futuras. |
| `quantidadeVendidas` | Texto exibido ao visitante, como `10 mil vendidos`. |
| `cupomTipo` | Tipo do cupom: `percentual` ou `valor`. |
| `cupomValor` | Valor do cupom. |
| `cupom` | Texto pronto do cupom. Tem prioridade sobre tipo e valor. |
| `data` | Data da coleta, reservada para rastreabilidade. |
| `success` | Resultado da automação, reservado para rastreabilidade. |
| `nota` | Campo legado opcional. |

## Regras

1. Uma linha somente é importada quando `status` for `PRONTO` e `urlAfiliado` for uma URL válida.
2. `precoOriginal` vazio é aceito.
3. O preço atual deve ser maior que zero.
4. Duplicação é identificada principalmente pela URL/ID real do anúncio, não apenas por `idProduto`, pois alguns fluxos do Mercado Livre repetem IDs de campanha.
5. Os nomes antigos de colunas continuam compatíveis, mas todo novo fluxo deve gerar este modelo v3.

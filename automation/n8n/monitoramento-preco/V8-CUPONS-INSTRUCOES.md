# V8 — cupom informativo no monitoramento de preço

Esta atualização mantém toda a validação de preço da V7. Ela apenas lê um cupom concreto do PDP e atualiza `products.coupon_text`; nenhum valor de cupom passa a ser o preço normal da oferta.

## O que o código reconhece

- `Compre R$ 99 e ganhe 10% OFF` → `Cupom: 10% OFF em compras a partir de R$ 99,00`.
- `Compre R$ 99 e ganhe R$ 10 OFF` → `Cupom: R$ 10,00 OFF em compras a partir de R$ 99,00`.
- `R$ 6.199 com Cupom` → `Preço com cupom: R$ 6.199,00`.
- `R$ 30 OFF com Cupom` e `10% OFF com Cupom`.

O texto `Ver cupons disponíveis` sozinho não atualiza nada. Se um cupom não estiver visível naquela consulta, um cupom que já esteja salvo não é apagado.

## Aplicação no n8n

1. Duplique o workflow V7 e renomeie a cópia para `MONITORAMENTO DE PREÇO V8 — CUPONS`.
2. No nó **PROCESSA RESPOSTA**, substitua todo o código pelo arquivo `PROCESSA-RESPOSTA-V8-CUPONS.js`.
3. No nó **BUSCA OFERTAS ELEGÍVEIS**, inclua `p.coupon_text AS coupon_text` no `SELECT`. Isto é apenas para o relatório do fluxo; não altera preços.
4. Substitua as queries dos dois nós abaixo pelas queries desta página. Não altere os demais nós nem as conexões.

### ATUALIZA OFERTA (preço mudou)

```sql
=WITH oferta_atualizada AS (
  UPDATE public.offers
  SET current_price = {{ $('PROCESSA RESPOSTA').item.json.precoNovo }},
      original_price = {{ $('PROCESSA RESPOSTA').item.json.precoOriginalNovo === null ? 'NULL' : $('PROCESSA RESPOSTA').item.json.precoOriginalNovo }},
      discount_percent = {{ $('PROCESSA RESPOSTA').item.json.discountPercentNovo }},
      availability_status = 'available',
      last_checked_at = now(),
      last_check_status = 'ok',
      last_check_error = NULL,
      consecutive_check_failures = 0
  WHERE id = '{{ $('PROCESSA RESPOSTA').item.json.offer_id }}'
  RETURNING product_id, id
), cupom_atualizado AS (
  UPDATE public.products p
  SET coupon_text = '{{ String($('PROCESSA RESPOSTA').item.json.couponText || '').replace(/'/g, "''") }}'
  FROM oferta_atualizada o
  WHERE p.id = o.product_id
    AND {{ $('PROCESSA RESPOSTA').item.json.couponDetected ? 'true' : 'false' }}
    AND '{{ String($('PROCESSA RESPOSTA').item.json.couponText || '').replace(/'/g, "''") }}' <> ''
  RETURNING p.id
)
SELECT id FROM oferta_atualizada;
```

### MARCA COMO VERIFICADO

```sql
=WITH oferta_verificada AS (
  UPDATE public.offers
  SET last_checked_at = now(),
      last_check_status = 'ok',
      last_check_error = NULL,
      consecutive_check_failures = 0
  WHERE id = '{{ $('PROCESSA RESPOSTA').item.json.offer_id }}'
  RETURNING product_id, id
), cupom_atualizado AS (
  UPDATE public.products p
  SET coupon_text = '{{ String($('PROCESSA RESPOSTA').item.json.couponText || '').replace(/'/g, "''") }}'
  FROM oferta_verificada o
  WHERE p.id = o.product_id
    AND {{ $('PROCESSA RESPOSTA').item.json.couponDetected ? 'true' : 'false' }}
    AND '{{ String($('PROCESSA RESPOSTA').item.json.couponText || '').replace(/'/g, "''") }}' <> ''
  RETURNING p.id
)
SELECT id FROM oferta_verificada;
```

## Teste curto

Use dois produtos: um com o selo `Compre R$ 99 e ganhe 10% OFF` e um sem cupom. Ao final, execute:

```sql
SELECT p.title, p.coupon_text, o.current_price, o.original_price
FROM public.offers o
JOIN public.products p ON p.id = o.product_id
WHERE o.id IN ('COLE-O-ID-COM-CUPOM', 'COLE-O-ID-SEM-CUPOM');
```

O produto com cupom deve ter `coupon_text` preenchido e os preços devem continuar sendo os preços principais do PDP. O outro não deve perder nem ganhar texto de cupom por engano.

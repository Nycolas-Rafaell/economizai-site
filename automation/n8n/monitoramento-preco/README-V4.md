# Monitoramento de Preço — V4 seguro

Arquivo para importar: `MONITORAMENTO-DE-PRECO-V4-SEGURO.json`.

Esta versão permanece desativada após a importação. Ela foi criada separadamente e não altera o fluxo que já está aberto no n8n.

## O que foi corrigido

- `PROCESSA RESPOSTA` agora envia o mesmo resultado diretamente para `ROTEIA RESULTADO` e, em paralelo, para `REGISTRA LOG`.
- `REGISTRA LOG` não fica mais no meio do caminho entre parser e Switch; portanto, seu `RETURNING id` não apaga o campo `rota` antes da decisão.
- As únicas rotas aceitas são `atualizar_preco`, `sem_alteracao`, `revisao_manual`, `indisponivel` e `falha_temporaria`.
- O Switch usa `String($json.rota ?? '').trim()` e possui uma saída para cada rota.
- JSON-LD só é usado quando o título dele tem similaridade mínima de 0,60 com o produto cadastrado.
- Preço de carrossel, recomendação, cupom, parcela ou produto diferente nunca é usado como preço principal.
- Indisponibilidade só pode despublicar uma oferta em HTTP 404, mensagem explícita dentro do bloco principal do PDP já validado, ou JSON-LD correspondente com `OutOfStock` e sem preço válido.
- Dúvida de preço, faixa de valores, divergência entre fontes e título diferente seguem para `revisao_manual`, sem alterar preço ou publicação.

## Conexões relevantes

```text
PROCESSA RESPOSTA ──→ ROTEIA RESULTADO ──→ ação da rota ──→ PAUSA ENTRE PRODUTOS ──→ LOOP PRODUTOS
        └──────────→ REGISTRA LOG
```

`REGISTRA LOG` é somente auditoria: ele não retorna ao Switch nem controla o loop.

## Antes de importar

1. No n8n, exporte o fluxo atual como cópia de segurança.
2. Execute a migration `migration-monitoramento-preco-v4.sql` no SQL Editor do Supabase somente se a tabela `offer_monitoring_logs` ainda não existir.
3. Importe o arquivo V4 como **novo** workflow. Não substitua o anterior ainda.
4. Mantenha o novo workflow desativado.
5. Nos nós Postgres do banco do site, selecione a credencial do Supabase Economizaí. No nó `BUSCA COOKIE`, mantenha a credencial do banco onde o cookie está salvo.

## Teste de uma única oferta

No nó `BUSCA OFERTAS ELEGIVEIS`, acrescente temporariamente antes do `ORDER BY`:

```sql
AND o.id = 'UUID-DA-OFERTA-QUE-VOCE-QUER-TESTAR'
```

Execute o workflow manualmente. Confira `RELATORIO FINAL` e, no Supabase:

```sql
SELECT
  checked_at,
  outcome,
  product_title,
  page_title,
  stored_current_price,
  detected_current_price,
  detected_original_price,
  price_source,
  reason,
  http_status
FROM public.offer_monitoring_logs
ORDER BY checked_at DESC
LIMIT 10;
```

Quando a validação estiver correta, remova o filtro temporário. O workflow original deve permanecer como backup até os testes terminarem.

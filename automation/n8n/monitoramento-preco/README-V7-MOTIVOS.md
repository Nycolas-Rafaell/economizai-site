# Monitoramento de preço V7 — motivos das alterações

Esta versão mantém a mesma validação de preços da V6. A única melhoria é registrar de forma legível o que mudou em cada atualização.

## Antes de importar o fluxo

1. No Supabase, abra **SQL Editor**.
2. Execute o arquivo `database/migrations/SUPABASE-PRECO-HISTORICO-MOTIVO.sql`.
3. No n8n, importe `MONITORAMENTO-DE-PRECO-V7-MOTIVOS-DE-ATUALIZACAO.json`.
4. Selecione a mesma credencial Postgres do banco do Economizaí em todos os nós Postgres.
5. Mantenha o workflow desativado até concluir um teste manual.

## Motivos gerados

- `Preço atual: R$ 180,00 → R$ 169,00`
- `Preço de referência: R$ 299,90 → R$ 269,90`
- `Preço de referência removido`
- `Desconto recalculado: 0% → 37%`
- Quando não houver alteração: `Sem alteração: preço atual, referência e desconto confirmados`

O motivo aparece no `RELATORIO FINAL`, em `offer_monitoring_logs.reason` e em `price_history.change_reason` para alterações de preço.

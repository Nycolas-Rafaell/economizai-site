# Monitoramento de preço V3 seguro

Arquivo importável: `MONITORAMENTO-DE-PRECO-V3-SEGURO.json`.

Esta versão foi feita para impedir o erro observado no Sabão Brilhante: o fluxo anterior encontrava o primeiro preço que parecesse válido no HTML e podia usar preço de recomendação, parcela ou cupom. A V3 **não altera uma oferta quando tiver dúvida**.

## O que mudou

- Confirma o título da página contra o título salvo no banco.
- Aceita o preço atual somente quando duas fontes independentes concordam: JSON-LD, metadados de produto ou bloco principal de preço da página.
- Ignora intervalos de preço, parcelas, mensalidades, cupom e blocos sem vínculo com o produto principal.
- Quando não houver confirmação, registra `review` / `revisao_manual` e mantém o preço que já está no site.
- Salva um log detalhado por tentativa em `offer_monitoring_logs`.
- O relatório final lista produto, ID da oferta, resultado, preço salvo/detectado, fonte ou motivo.

## Instalação

1. No Supabase do Economizaí, abra **SQL Editor** e execute todo o conteúdo de `migration-monitoramento-preco-v3.sql`.
2. No n8n, importe `MONITORAMENTO-DE-PRECO-V3-SEGURO.json` como **novo fluxo**. Não substitua o fluxo atual antes do teste.
3. Em todos os nós Postgres, selecione a credencial do banco real do Economizaí já criada por você.
4. No nó `REQUISITA PAGINA PRODUTO`, mantenha o cabeçalho `Cookie` vindo de `BUSCA COOKIE` e não exponha esse valor em relatórios ou planilhas.
5. O fluxo vem desativado. Primeiro use execução manual com uma oferta conhecida; só ative depois de validar.

## Teste controlado

1. No nó `BUSCA OFERTAS ELEGIVEIS`, troque temporariamente o `LIMIT 15` por `LIMIT 1` e acrescente um filtro para uma única oferta pelo UUID.
2. Execute o fluxo inteiro manualmente.
3. Abra a saída de `RELATORIO FINAL`. O resultado esperado é um destes:
   - `Preço atualizado`: compare `salvo` e `detectado` com a página aberta no navegador.
   - `Sem alteração`: o valor confirmado era o mesmo do banco.
   - `Revisão manual`: comportamento seguro; o site não foi alterado porque o HTML não confirmou o preço.
   - `Indisponível`: confira a página antes de aceitar esse resultado.
4. Confirme o registro do teste com:

```sql
select
  checked_at, outcome, product_title, page_title,
  stored_current_price, detected_current_price,
  detected_original_price, price_source, reason
from public.offer_monitoring_logs
order by checked_at desc
limit 20;
```

5. Só depois retire o filtro de UUID e volte o limite gradualmente: 3, depois 10 e por fim 15 produtos a cada 3 horas.

## Segurança operacional

- O fluxo não envia alertas de usuário. Ele apenas atualiza o banco e marca os alertas que já atingiram a meta. O envio de e-mail/WhatsApp continua fora deste fluxo.
- Não use `preço encontrado em qualquer parte do HTML` como fallback. Isso foi removido deliberadamente.
- Se uma loja modificar o layout, espere mais itens em revisão manual; isso é preferível a escrever um preço errado no site.

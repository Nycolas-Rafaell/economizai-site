# Envio de ofertas para canal do WhatsApp

Versão atual: `ENVIAR-PRODUTOS-PARA-O-CANAL-V4.1-SEGURO.json`.

O workflow versionado está desativado e sanitizado. Após importar no n8n:

1. selecione a credencial Google Sheets;
2. selecione a planilha Mercado Livre v3 e a aba `Produtos`;
3. configure o Header Auth com nome do cabeçalho `token` e token da instância WuzAPI;
4. troque `SEU_IP_TAILSCALE_WUZAPI` pelo IP Tailscale da VPS;
5. troque `SEU_ID_DO_CANAL@newsletter` pelo JID do canal;
6. mantenha o filtro `status = PRONTO` e `returnFirstMatch = true`;
7. confirme que a atualização escreve `status = ENVIADO` e `success = TRUE` somente após o envio.

O fluxo não depende de Gemini ou outra LLM. A legenda é montada pelo nó `criador de legendas`.

Para imagens nítidas em canais, a instalação do WuzAPI precisa conter o patch `UploadNewsletter` + `MediaHandle`, documentado em `docs/HANDOFF-COMPLETO-ECONOMIZAI-2026-08-21.md`.

Não salve tokens, cookies ou chaves dentro do JSON exportado.

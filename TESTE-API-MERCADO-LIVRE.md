# Teste local da API do Mercado Livre

Este teste conecta sua conta Mercado Livre usando OAuth com PKCE. Ele e separado do site publico e a chave secreta nunca vai para o HTML ou JavaScript do navegador.

## 1. Criar a configuracao local

No Explorador de Arquivos, abra esta pasta e faca uma copia de `.env.example`. Renomeie a copia para `.env`.

Abra o `.env` no Bloco de Notas e preencha apenas no seu computador:

```ini
ML_CLIENT_ID=seu_id_do_aplicativo
ML_CLIENT_SECRET=sua_nova_chave_secreta
ML_REDIRECT_URI=https://SUA-URL-DO-TUNEL/api/ml/callback
PORT=3000
```

Nao envie o arquivo `.env`, a chave secreta ou o arquivo `.ml_tokens.json` por mensagem, e-mail ou GitHub. Eles ja estao no `.gitignore`.

## 2. Iniciar o servidor local

Abra o PowerShell nesta pasta e execute:

```powershell
node .\ml-test-server.mjs
```

Deixe essa janela aberta. A pagina de teste ficara em `http://localhost:3000`.

## 3. Criar uma URL HTTPS temporaria

O Mercado Livre exige que a URL de retorno cadastrada use HTTPS. Use um tunel temporario para expor somente esse servidor local. Quando tiver uma URL parecida com `https://exemplo.trycloudflare.com`, complete o `ML_REDIRECT_URI` com:

```text
https://exemplo.trycloudflare.com/api/ml/callback
```

Cadastre exatamente a mesma URL no DevCenter do Mercado Livre, em **URLs de redirecionamento**. Salve e reinicie o servidor Node depois de alterar o `.env`.

## 4. Autorizar

Abra `http://localhost:3000` no navegador e clique em **Conectar minha conta de teste**. Entre no Mercado Livre e aceite a autorizacao. O teste mostrara a conta conectada ao retornar.

O arquivo `.ml_tokens.json` e criado somente no seu computador para este teste. Apague-o quando quiser encerrar o teste e revogue o acesso no Mercado Livre se nao for mais usar a integracao.

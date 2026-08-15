# Nova autorização OAuth do Mercado Livre

Use este guia somente depois de salvar as permissões no DevCenter.

## 1. Inicie o site

No terminal do VS Code, dentro da pasta do projeto:

```powershell
npm run dev
```

Deixe esse terminal aberto.

## 2. Abra um segundo terminal e crie a URL HTTPS temporária

```powershell
cloudflared tunnel --url http://localhost:3000
```

Copie a URL `https://...trycloudflare.com` que aparecer. Deixe também este terminal aberto.

## 3. Atualize o arquivo `.env`

Abra `.env` e altere apenas esta linha:

```ini
ML_REDIRECT_URI=https://SUA-URL.trycloudflare.com/api/ml/callback
```

## 4. Atualize o DevCenter

No DevCenter do Mercado Livre, em **URIs de redirect**, coloque exatamente a mesma URL acima e salve.

## 5. Reinicie o servidor

No primeiro terminal, pressione `Ctrl + C` e execute novamente `npm run dev`.

## 6. Autorize

Abra `http://localhost:3000/admin.html` e clique em **Autorizar novamente (OAuth)**. Entre na conta Mercado Livre e aceite as permissões.

Ao concluir, volte ao painel e clique em **Verificar conexão com Mercado Livre**.

Não compartilhe o arquivo `.env` nem `.ml_tokens.json`.

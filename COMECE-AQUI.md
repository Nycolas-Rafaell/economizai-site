# Comece aqui — testes locais do Economizaí

## O que voce ja tem

- Site: arquivos HTML, CSS, JavaScript e imagens nesta pasta.
- Backend de teste: `ml-test-server.mjs`.
- Node.js: ja instalado no computador.
- VS Code: ja instalado.
- Conta Cloudflare: ja criada.

## O que ainda precisa instalar

1. **cloudflared**: programa que cria uma URL HTTPS temporaria para o Mercado Livre conseguir falar com o seu computador durante o teste.
   - Download oficial para Windows: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/
   - Depois da instalacao, feche e abra o PowerShell novamente e confirme com `cloudflared --version`.
2. Um navegador (Chrome ja serve).

Nao instale banco de dados, GitHub, hospedagem ou extensoes do VS Code agora. Eles nao sao necessarios para este primeiro teste.

## 1. Abrir o projeto no VS Code

1. Abra o VS Code.
2. Clique em **File > Open Folder...**.
3. Selecione esta pasta:

   `C:\Users\Rafae\Documents\Codex\2026-08-12\te\outputs\economizai-site`

4. No painel esquerdo, voce vera todos os arquivos do site. O backend e o arquivo `ml-test-server.mjs`.

## 2. Criar o arquivo secreto de configuracao

1. No VS Code, abra `.env.example`.
2. Copie todo o conteudo.
3. Crie um arquivo chamado exatamente `.env` na mesma pasta.
4. Cole o conteudo e preencha somente estas duas linhas:

   ```ini
   ML_CLIENT_ID=seu_id_do_aplicativo
   ML_CLIENT_SECRET=sua_nova_chave_secreta
   ```

5. Deixe a linha `ML_REDIRECT_URI` para o proximo passo. Nunca mostre, envie ou publique o arquivo `.env`.

## 3. Iniciar o backend local

No VS Code, clique em **Terminal > New Terminal**. Digite:

```powershell
npm run ml:test
```

Se aparecer `Servidor de teste: http://localhost:3000`, deu certo. Deixe esse terminal aberto.

Alternativa: abra a aba **Run and Debug** (icone com um triangulo e inseto), escolha `Iniciar backend Mercado Livre` e aperte F5.

## 4. Criar a URL HTTPS temporaria

Abra um **segundo terminal** no VS Code (botao `+` no painel Terminal) e execute:

```powershell
cloudflared tunnel --url http://localhost:3000
```

Copie a URL HTTPS exibida, parecida com `https://palavras-aleatorias.trycloudflare.com`.

No `.env`, complete a linha assim:

```ini
ML_REDIRECT_URI=https://palavras-aleatorias.trycloudflare.com/api/ml/callback
```

Salve o `.env`. Pare o primeiro terminal com `Ctrl + C` e rode `npm run ml:test` novamente.

## 5. Configurar o Mercado Livre

1. Abra o painel da sua aplicacao no DevCenter do Mercado Livre.
2. Procure por **URLs de redirecionamento**.
3. Cole exatamente a mesma URL da linha `ML_REDIRECT_URI`.
4. Salve.

## 6. Fazer o teste

1. Com os dois terminais abertos, abra `http://localhost:3000` no Chrome.
2. Clique em **Conectar minha conta de teste**.
3. Entre no Mercado Livre e aceite a autorizacao.
4. Ao voltar, a pagina mostrara que a conta foi conectada.

O backend cria `.ml_tokens.json` somente depois de dar certo. Esse arquivo tambem e secreto e nao deve ser enviado a ninguem.

## Quando terminar

Pressione `Ctrl + C` nos dois terminais. A URL do Cloudflare deixa de funcionar. Em um novo teste, execute os dois comandos novamente. Se a URL temporaria mudar, atualize tanto o `.env` quanto o painel do Mercado Livre.

## Para que serve cada arquivo

| Arquivo | Funcao |
| --- | --- |
| `index.html` | Pagina inicial do seu site. |
| `produto*.html` | Paginas dos produtos. |
| `site.js` | Filtros, pesquisa e interacoes do site. |
| `ml-test-server.mjs` | Backend local que conversa com o Mercado Livre. |
| `.env` | Suas chaves e URL de retorno. Privado. |
| `.ml_tokens.json` | Tokens criados apos conectar a conta. Privado. |
| `package.json` | Atalhos de comando do backend. |

# Painel local de ofertas

## Iniciar

No VS Code, abra esta pasta e execute no terminal:

```powershell
npm run dev
```

Abra no navegador:

- Site: `http://localhost:3000`
- Painel de cadastro: `http://localhost:3000/admin.html`

## Escolher o modo de cadastro

O painel possui dois botões no topo:

- **Adicionar automaticamente:** tenta consultar título, imagem, preço e desconto pela API do Mercado Livre. Use quando a API autorizar o anúncio.
- **Adicionar manualmente:** cria o card com os dados preenchidos por você. Use quando o modo automático mostrar bloqueio de permissão.

## Cadastrar um produto automaticamente

1. No Mercado Livre, abra a página pública do anúncio.
2. Copie a URL completa. Ela deve conter um código como `MLB123456789` — em links de catálogo, esse código costuma aparecer no trecho `wid=MLB...`.
3. Cole a URL no primeiro campo.
4. Cole o seu link de afiliado `https://meli.la/...` no segundo campo.
5. Escolha uma categoria e clique em **Criar ou atualizar card**.

O backend consulta a API pública de itens do Mercado Livre e salva o card em `data/ofertas.json`. Abra a página inicial novamente para vê-lo.

## Cadastrar um produto manualmente

Preencha título, preço atual, link público e link afiliado. A imagem e o preço antigo são opcionais. Quando há preço antigo maior que o atual, o painel calcula o desconto automaticamente.

## Limite desta etapa

O painel não tem login e o arquivo JSON é um armazenamento local de teste. Use somente em `localhost`. Antes de publicar na internet, faremos autenticação e migraremos as ofertas para um banco de dados.

# Handoff técnico — Economizaí

Data: 13/08/2026

## Objetivo atual

O Economizaí é um site local de ofertas. Ele exibe cards de produtos, permite filtrar e ordenar as ofertas e possui um painel local para cadastrar ou editar produtos. Cada card abre uma página detalhada própria e o botão de compra usa o link de afiliado informado.

## Local do projeto

`C:\Users\Rafae\Documents\Codex\2026-08-12\te\outputs\economizai-site`

## Como executar localmente

No PowerShell, dentro da pasta acima:

```powershell
npm run dev
```

Endereços locais:

- Site: `http://127.0.0.1:3000`
- Painel de ofertas: `http://127.0.0.1:3000/admin.html`

Para encerrar o servidor, use `Ctrl + C`. Se aparecer `EADDRINUSE`, já existe um servidor usando a porta 3000; use o servidor já aberto ou finalize o processo anterior antes de iniciar outro.

## Arquitetura

O projeto usa Node.js sem framework e arquivos HTML/CSS/JS estáticos:

| Arquivo | Responsabilidade |
|---|---|
| `server.mjs` | Servidor HTTP, APIs locais, persistência das ofertas e integração OAuth/API do Mercado Livre. |
| `index.html` | Página inicial, filtros, busca, ordenação e montagem dinâmica dos cards. |
| `produto-dinamico.html` | Página detalhada única; carrega uma oferta pelo parâmetro `?id=...`. |
| `admin.html` | Painel local de criação e edição dos cards. |
| `admin.js` | Lógica do painel administrativo. |
| `data/ofertas.json` | Dados persistidos de ofertas criadas ou editadas. Não apagar. |
| `page-shell.js` / `institutional.css` | Rodapé e estilos institucionais compartilhados. |
| `produto.html`, `produto-lencos.html`, `produto-microfone.html` | Páginas antigas de referência. Os cards atuais usam `produto-dinamico.html`. |

## Dados de produtos

Os cards iniciais estão definidos em `initialOffers` dentro de `server.mjs`. Há produtos de exemplo, incluindo Redragon, lenços e microfone. Produtos criados/alterados no painel são salvos em `data/ofertas.json` e substituem o card inicial com o mesmo ID.

Cada oferta possui, quando disponível:

- loja (`mercado_livre` ou `shopee`);
- título, imagem, categoria e preços;
- link público e link de afiliado;
- descrição e resumo das avaliações;
- nota, contagem de avaliações e comentários;
- frete grátis;
- histórico de preços (`priceHistory`).

## Página inicial

- Os cards são carregados por `GET /api/ofertas`.
- Clicar em qualquer card ou em “Ver oferta” abre `produto-dinamico.html?id=<id>`.
- O botão “Ver oferta” dentro da página do produto abre o link de afiliado em nova aba.
- Os cards têm área de imagem fixa com `object-fit: contain`, para reduzir diferenças de tamanho entre produtos.
- Busca, filtros de desconto, categorias e ordenação são controlados no JavaScript de `index.html`.

## Página de produto

`produto-dinamico.html` contém:

- imagem centralizada e ajustada por `object-fit: contain`;
- preço atual, preço anterior e desconto;
- botão de compra com link de afiliado;
- botão de compartilhar;
- “Sobre este produto”;
- “Resumo das avaliações” e métricas;
- três cards de histórico: preço atual (amarelo), menor valor (verde) e maior valor (vermelho);
- gráfico de variação: linha/pontos/amplitude amarelos e uma referência pontilhada verde, conforme a referência visual solicitada;
- rodapé compartilhado.

O histórico recebe um novo ponto quando o preço é alterado e salvo pelo painel. O primeiro registro de um produto novo é salvo na criação. Para produtos antigos que ainda não foram editados, haverá poucos pontos no gráfico; isto é esperado.

## Painel de administração

No modo manual, é possível criar ou editar qualquer card. Os campos disponíveis são:

- Loja do produto: Mercado Livre ou Shopee;
- título;
- imagem;
- descrição;
- resumo das avaliações;
- nota, número de avaliações e comentários;
- preço atual e preço anterior;
- link público e link de afiliado;
- categoria e frete grátis.

O selo do card e o texto da página detalhada são derivados do campo de loja. Por enquanto o painel **não tem login**: ele é somente para testes locais e não deve ser publicado assim.

## Mercado Livre: estado da integração

Existe integração OAuth no `server.mjs` para criação automática via Mercado Livre:

- `GET /api/admin/connect` inicia a autorização OAuth;
- `GET /api/ml/callback` recebe o retorno;
- `GET /api/admin/status` verifica a conexão;
- `POST /api/admin/ofertas` tenta consultar e criar uma oferta automaticamente.

Em testes anteriores, anúncios de outros vendedores retornaram erros de permissão/`403` pela API do Mercado Livre. Isso é uma limitação de escopo/autorização da aplicação do Mercado Livre, não um problema do layout. O modo manual foi mantido como alternativa funcional.

Arquivos secretos existentes (não expor, não publicar, não versionar):

- `.env` — configuração, ID e segredo da aplicação;
- `.ml_tokens.json` — token OAuth/refresh token.

Caso seja necessário alterar permissões no DevCenter, faça uma nova autorização OAuth pelo botão “Autorizar novamente (OAuth)” do painel.

## Endpoints principais

| Método e rota | Uso |
|---|---|
| `GET /api/ofertas` | Lista ofertas disponíveis. |
| `GET /api/ofertas/:id` | Dados de uma oferta para a página detalhada. |
| `GET /api/admin/ofertas` | Lista todos os cards no painel. |
| `POST /api/admin/ofertas/manual` | Cria card manual. |
| `PUT /api/admin/ofertas/:id` | Edita um card existente. |
| `POST /api/admin/ofertas` | Tentativa de criação automática via API do Mercado Livre. |

## Verificação rápida

Depois de alterar arquivos do servidor, reinicie `npm run dev`. Para alterações somente de HTML/CSS/JS no navegador, basta `Ctrl + F5`.

Verificações usadas:

```powershell
node --check server.mjs
node --check admin.js
```

## Próximos passos recomendados

1. Adicionar login real antes de publicar o painel, de preferência com banco de dados e hash de senha.
2. Mover `data/ofertas.json` para banco de dados antes de publicar em ambiente sem disco persistente.
3. Criar coleta periódica de preços apenas por APIs autorizadas, respeitando regras das lojas.
4. Resolver escopos/permissões da aplicação Mercado Livre se a criação automática for indispensável.
5. Usar a página dinâmica como padrão e, quando desejado, remover gradualmente as páginas antigas de produto após conferir que não há links apontando para elas.

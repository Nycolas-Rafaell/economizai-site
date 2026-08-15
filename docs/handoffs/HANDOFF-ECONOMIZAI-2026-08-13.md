# Handoff — Economizaí

**Data:** 13/08/2026  
**Estado:** site local funcional, com cadastro manual/semi-automático de cards e integração experimental com Mercado Livre.

## Onde está o projeto

`C:\Users\Rafae\Documents\Codex\2026-08-12\te\outputs\economizai-site`

## Como iniciar localmente

1. Abra o PowerShell na pasta do projeto.
2. Execute `npm run dev`.
3. Acesse:
   - Site: `http://localhost:3000/index.html`
   - Painel de cards: `http://localhost:3000/admin.html`

Se aparecer `EADDRINUSE` na porta 3000, já existe um servidor do site aberto. Use o navegador normalmente ou encerre o processo Node que está usando essa porta antes de rodar o comando outra vez.

## Arquivos principais

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Página inicial, menu de categorias, filtros, busca e cards de ofertas. |
| `produto-dinamico.html` | Página completa de cada card cadastrado. |
| `admin.html` e `admin.js` | Painel local para cadastrar e editar cards. |
| `server.mjs` | Servidor local, API de cards, integração Supabase, OAuth e rotinas experimentais do Mercado Livre. |
| `supabase-store.mjs` | Camada de dados que converte cards do site para as tabelas do Supabase. |
| `data/ofertas.json` | Backup/fallback local dos cards anteriores à migração. |
| `page-shell.js` | Rodapé compartilhado e menu de categorias em páginas que usam o componente. |
| `README-NOVA-PAGINA.md` | Modelo para manter o rodapé nas novas páginas. |
| `.env` | Credenciais locais do Mercado Livre. Não publicar nem enviar este arquivo. |
| `.env.example` | Modelo sem credenciais reais. |

## Recursos implementados

### Página inicial

- Cards clicáveis: clicar no card inteiro ou em **Ver oferta** abre a página interna do produto.
- Filtros por desconto: todos, até 30%, 30% a 50% e acima de 50%.
- Ordenação por menor e maior valor.
- Busca por título, categoria e tipo/subcategoria.
- Imagens dos cards com área padronizada para que produtos com formatos diferentes não deixem o grid desalinhado.
- Efeito amarelo de passagem removido dos cards.
- Faixa superior com repetição contínua.

### Categorias

Categorias disponíveis:

- Periféricos
- Hardware
- Informática
- Celulares e Tablets
- TVs e Áudio
- Games
- Casa e Cozinha
- Bebês e Crianças
- Saúde e Beleza
- Ferramentas e Auto
- Moda e Acessórios
- Outros

O menu lateral começa recolhido. Clicar em uma categoria que possui subcategorias abre apenas aquele grupo. Dentro de cada grupo existe **Ver tudo em…** para filtrar a categoria completa e links para filtrar o tipo específico, por exemplo Headset, Microfone, Teclado, SSD, Console, Notebook e TV.

### Página de produto

Cada card criado no painel usa `produto-dinamico.html?id=...` e apresenta:

- imagem padronizada e adaptada ao espaço disponível;
- preço atual, preço anterior e desconto;
- link de compra usando o link de afiliado;
- frete;
- descrição;
- resumo de avaliações, nota, quantidade de avaliações e comentários;
- botão de compartilhamento;
- histórico de preço com menor, maior e preço atual;
- gráfico de variação de preço;
- categoria e tipo do produto preenchidos no painel.

Ao editar um card e alterar o preço, o novo valor é acrescentado ao histórico local do produto.

### Painel local (`admin.html`)

- Criação manual de cards para Mercado Livre ou Shopee.
- Edição de qualquer card salvo, mantendo o mesmo identificador e histórico de preço.
- Campos de título, imagem, links público e de afiliado, preço atual e antigo, avaliações, comentários, frete, descrição e resumo de avaliações.
- Seleção de categoria e tipo/subcategoria que se adapta à categoria escolhida, sem campos extras de especificações técnicas.
- Leitura local de imagem/print ou PDF para tentar preencher campos; a leitura é uma ajuda e os resultados precisam ser revisados antes de salvar.
- Preços preservam sempre duas casas decimais, inclusive `44,00`.
- Botão para testar a atualização de preços de ofertas já salvas.

**Importante:** o painel não tem autenticação. Ele é adequado somente para testes locais. Não publicar `admin.html` antes de implementar login, senha, proteção de rotas e banco de dados.

### Rodapé e páginas institucionais

- Rodapé comum com aviso de afiliado, navegação, páginas institucionais e redes oficiais do ReiWO.
- Redes configuradas: YouTube, Instagram, Twitch e TikTok.
- As páginas que usam `page-shell.js` recebem esse rodapé e o menu compartilhado.
- Para novas páginas, seguir `README-NOVA-PAGINA.md`.

## Mercado Livre: situação atual e limitação

Há OAuth e rotas de integração no servidor, porém a API do Mercado Livre está respondendo **HTTP 403 (forbidden)** para consultas de anúncios/catálogo de terceiros e buscas. Isso foi testado com token autorizado e não é corrigível apenas alterando o HTML, criando outro produto público ou habilitando permissões comuns no DevCenter.

Consequências atuais:

- O modo automático e a busca oficial podem funcionar somente se o Mercado Livre liberar a rota para a aplicação/conta.
- Quando a API bloquear a consulta, o fluxo recomendado é o **semi-manual/manual**: manter link público e de afiliado, preencher os dados manualmente e salvar.
- A rotina de atualização automática a cada 3 horas permanece ativa, mas ignora itens que a API bloquear. O resultado "verificados / atualizados / ignorados" é esperado enquanto o 403 continuar.

Rotas existentes para referência:

- `GET /api/ofertas`
- `GET /api/ofertas/:id`
- `GET /api/admin/ofertas`
- `POST /api/admin/ofertas/manual`
- `PUT /api/admin/ofertas/:id`
- `POST /api/admin/ofertas` (automático; sujeito ao 403)
- `POST /api/admin/atualizar-ofertas`
- `GET /api/admin/connect`
- `GET /api/admin/status`

## Credenciais e segurança

- Credenciais reais ficam apenas em `.env`.
- Nunca colocar `ML_CLIENT_SECRET`, token OAuth ou chave de API em HTML, JavaScript enviado ao navegador, GitHub ou prints públicos.
- Como uma chave secreta já foi exibida anteriormente em imagem, a chave deve permanecer revogada/trocada no DevCenter do Mercado Livre.
- Os tokens OAuth são armazenados localmente para teste. Antes de publicar, trocar por armazenamento seguro no servidor e autenticação de administrador.

## Próximos passos recomendados ao retomar

1. Continuar cadastrando ofertas no modo manual/semi-manual e revisar todas as informações antes de publicar.
2. Confirmar, no primeiro `npm run dev` após configurar o `.env`, a mensagem `Supabase conectado: ... cards migrados.`; o arquivo `data/ofertas.json` permanece como backup local.
3. Publicar somente o site público inicialmente; não expor o painel e o arquivo `.env`.
4. Solicitar ao suporte do Mercado Livre confirmação formal sobre quais endpoints de itens, catálogo e busca a aplicação pode acessar. Só retomar automação de catálogo após uma resposta que elimine o 403.
5. Caso queira automação sem depender desses endpoints, criar um fluxo de importação próprio com revisão humana, respeitando os termos das lojas e dos programas de afiliados.

## Verificações feitas nesta pausa

- `node --check server.mjs` sem erro.
- `node --check admin.js` sem erro.
- `node --check page-shell.js` sem erro.
- Servidor local respondeu com HTTP 200 em `http://127.0.0.1:3000/index.html`.
- Menu recolhível de categorias presente na página local.

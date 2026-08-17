# Handoff completo — Economizaí

Atualizado em **16/08/2026**. Este documento descreve o estado real do site, da extensão e do banco de dados neste ponto do desenvolvimento.

## Localização e estado do Git

- Projeto: `C:\Users\Rafae\Documents\Codex\2026-08-12\te\outputs\economizai-site`
- Branch atual: `main`
- Último commit: `2746111 perf: otimiza carregamento e estabiliza páginas`
- Árvore de trabalho: limpa no momento deste handoff.
- Repositório remoto já foi usado anteriormente: GitHub `Nycolas-Rafaell/economizai-site`.

Nunca versionar ou compartilhar:

- `.env` — contém configurações reais e chaves locais.
- `.ml_tokens.json` — tokens locais do Mercado Livre.
- `node_modules/` — dependências regeneráveis.

Esses arquivos já constam no `.gitignore`.

## Como iniciar o projeto

Pré-requisito: Node.js instalado e dependências já instaladas com `npm install`.

No PowerShell, dentro da pasta do projeto:

```powershell
npm run dev
```

Endereços locais principais:

- Ofertas: `http://localhost:3000/index.html`
- Login: `http://localhost:3000/login.html`
- Painel administrativo: `http://localhost:3000/admin.html`
- Análises: `http://localhost:3000/analytics.html`

Usar sempre o servidor local; não abrir as páginas diretamente com `file:///`, pois login, banco de dados, APIs e persistência dependem do servidor.

Quando `server.mjs` ou `supabase-store.mjs` for alterado, reiniciar `npm run dev`. Para mudanças somente de HTML/CSS/JS, atualizar o navegador com `Ctrl + F5`.

O projeto pode ser exposto temporariamente por Cloudflare Tunnel para testes externos. A URL de tunnel costuma mudar; não existe configuração de hospedagem definitiva registrada no repositório neste momento.

## Arquitetura

O Economizaí é uma aplicação sem framework de front-end, formada por páginas HTML, CSS e JavaScript puro, com um servidor HTTP Node.js.

- `server.mjs`: servidor, APIs internas, autenticação, SEO dinâmico, Supabase, alertas, relatórios, contatos, administração, mercado livre e arquivos estáticos.
- `supabase-store.mjs`: adaptação entre o modelo de ofertas do site e as tabelas normalizadas do Supabase.
- `index.html`: catálogo público, busca, filtros, paginação e cards.
- `produto-dinamico.html`: página completa usada por todo card novo salvo no banco.
- `page-shell.js`: cabeçalho compartilhado, menu de categorias, perfil e rodapé de páginas internas.
- `site.js`: recursos institucionais e suporte às páginas legadas.
- `data/ofertas.json`: fallback local e dados iniciais; quando o Supabase está configurado, o banco é a fonte principal.

Os arquivos públicos ficam na raiz para manter URLs diretas como `/index.html`, `/login.html` e `/produto-dinamico.html`.

## Configuração por ambiente

O modelo de variáveis está em `.env.example`. O arquivo real é `.env` e não deve ser exposto.

Variáveis usadas:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` — apenas no servidor.
- `ADMIN_EMAIL`
- `SITE_URL` — preencher somente quando houver domínio público definitivo; usado para SEO e prévias de compartilhamento.
- `ML_CLIENT_ID`, `ML_CLIENT_SECRET`, `ML_REDIRECT_URI` — integração OAuth do Mercado Livre, atualmente limitada por respostas 403 da API.
- `RESEND_API_KEY` e `RESEND_FROM_EMAIL` — reservadas para alertas por e-mail; não configuradas como recurso ativo.

## Banco de dados — Supabase/PostgreSQL

O Supabase é o banco principal e também fornece autenticação de usuários e armazenamento de avatares.

### Entidades principais usadas pelo servidor

- `marketplaces`: lojas, por exemplo Mercado Livre, Shopee, Amazon e AliExpress.
- `categories`: categorias e subcategorias oficiais do Economizaí.
- `products`: dados gerais do produto, categoria, descrição, avaliações e especificações.
- `offers`: links público/afiliado, preço atual/anterior, desconto, disponibilidade e publicação.
- `images`: imagem associada à oferta/produto.
- histórico de preço vinculado às ofertas, lido e salvo por `supabase-store.mjs`.
- `user_favorites`: favoritos por usuário.
- `user_price_alerts`: alertas de preço por usuário.
- `user_recent_views`: itens vistos recentemente.
- `contact_messages`: mensagens enviadas pelo formulário de contato.
- `offer_reports`: denúncias/reportes de ofertas.
- `admin_action_logs`: auditoria de mudanças em reportes e contatos.
- `site_events`: eventos de navegação para as análises administrativas.

### Migrações existentes

Executar no SQL Editor do Supabase somente quando uma migração ainda não tiver sido aplicada:

- `database/migrations/SUPABASE-RECURSOS-ECONOMIZAI.sql`
- `database/migrations/SUPABASE-FAVORITOS.sql`
- `database/migrations/SUPABASE-STATUS-CONTATOS.sql`
- `database/migrations/SUPABASE-AUDITORIA-ADMIN.sql`
- `database/migrations/SUPABASE-AUDITORIA-NOME-ADMIN.sql`
- `database/migrations/SUPABASE-ANALYTICS.sql`
- `database/migrations/SUPABASE-CATEGORIAS-CATALOGO.sql`
- `database/migrations/SUPABASE-ALERTAS-CANAIS.sql`

`SUPABASE-CATEGORIAS-CATALOGO.sql` é importante: ela cadastra no banco categorias usadas pelo site, inclusive categorias como `pet-shop` e `supermercado`, evitando erros de categoria inexistente ao salvar cards.

O servidor migra ofertas do arquivo local para o Supabase apenas quando o banco ainda não possui ofertas.

## Autenticação, perfis e permissões

- Cadastro, login, confirmação de e-mail, recuperação e alteração de senha usam Supabase Auth.
- Usuário novo recebe permissão comum por padrão.
- O administrador principal é definido por `ADMIN_EMAIL`.
- Administradores adicionais são geridos em `admin-users.html` e têm a função armazenada nos metadados do usuário.
- O botão **Painel admin** só aparece a administrador autenticado.
- Contas podem ser promovidas/rebaixadas, suspensas, banidas ou excluídas pelo painel de usuários.
- A conta possui nome, e-mail, apelido social, telefone opcional, avatares padrão ou foto personalizada.
- Fotos personalizadas vão para o bucket público `avatars` do Supabase Storage, criado pelo servidor se necessário.
- A senha exige: mínimo de 8 caracteres, letra maiúscula, minúscula, número e caractere especial. A interface mostra o cumprimento em tempo real e inclui botão de olho nos campos de senha.
- Ao criar uma conta com e-mail já existente, a interface deve exibir erro próprio; conta sem confirmação de e-mail também recebe mensagem específica.

## Site público

### Navegação comum

- A faixa amarela superior possui animação contínua.
- O logotipo leva ao início da página de ofertas.
- O botão de voltar ao topo aparece ao rolar a listagem.
- Categorias usam menu lateral expansível: a categoria fica fechada e as subcategorias abrem ao clique.
- Categorias e subcategorias são compartilhadas por páginas atuais e futuras via `page-shell.js`.
- O rodapé é compartilhado e inclui logo completa, “Um projeto ReiWO”, contato, links institucionais, redes sociais e aviso de afiliados.
- Links ReiWO: YouTube, Instagram, Twitch e TikTok estão no rodapé/menu comum.
- O favicon está em `assets/logo-economizai.png`.

### Categorias atualmente suportadas

Games, Hardware, Informática, Periféricos, Celulares e Tablets, TVs e Áudio, Casa e Cozinha, Bebês e Crianças, Saúde e Beleza, Ferramentas e Auto, Moda e Acessórios, Pet Shop, Supermercado e Outros, com subcategorias associadas no menu e no formulário administrativo.

### Página de ofertas

- Filtros por desconto, ordenação por preço, busca textual, loja, categoria, tipo, preço mínimo/máximo e avaliação.
- Busca e filtros consultam a API própria `GET /api/ofertas?paginated=1`.
- Paginação: 12 cards por página em desktop e 9 no celular.
- Cards com imagem padronizada, estrela de favorito, nota/avaliações, preço anterior, preço atual, desconto e botão de oferta.
- O card inteiro abre a página interna; “Ver oferta” também abre a página da oferta dentro do Economizaí.
- Ofertas `pending` não aparecem publicamente.
- Ofertas `unavailable` não aparecem na lista pública; permanecem disponíveis para administração e preservação do histórico.
- A página `lojas.html` filtra por Mercado Livre, Shopee, Amazon e AliExpress.

### Página dinâmica de produto

`produto-dinamico.html?id=ID_DA_OFERTA` mostra:

- imagem, loja, título, preço, desconto e botão de afiliado;
- descrição geral, resumo de avaliações, nota, contagens e especificações;
- botão de compartilhar, alerta de preço e reporte;
- histórico real de preços com pontos, legenda, mínimo, máximo e preço atual;
- cabeçalho, categorias, perfil e rodapé compartilhados.

Durante o carregamento usa um skeleton visual em vez de exibir textos provisórios e substituí-los depois. Isso elimina o “piscar” de conteúdo genérico em páginas de produtos criadas futuramente.

Páginas legadas estáticas ainda existem para os produtos iniciais: `produto.html`, `produto-lencos.html` e `produto-microfone.html`.

## Favoritos, alertas, contatos e reportes

- Favoritos: estrela em todos os cards; página `favoritos.html`.
- Alertas: criados na página do produto e listados em `alertas.html`; por enquanto são notificações dentro do site/banco. E-mail e WhatsApp estão apenas preparados, não ativos.
- Itens recentes: `vistos-recentemente.html`.
- Contato: `contato.html`, com nome, e-mail, telefone, assunto e mensagem.
- Reporte: preço incorreto, indisponibilidade, link quebrado ou outro problema. Ao escolher “outro”, é necessária uma descrição.
- Central administrativa: `reportes.html` trata contatos e reportes.
- Cores de status:
  - Reportes: novo amarelo, em análise vermelho, resolvido verde, arquivado branco.
  - Contatos: novo amarelo, recusado vermelho, respondido verde, arquivado branco.
- Toda mudança de status exige confirmação e registra auditoria em português com o nome do administrador.

## Administração

Páginas administrativas:

- `analytics.html`: primeira página do painel; métricas, acessos, cliques, categorias, lojas e cards mais acessados.
- `admin.html`: cadastro e edição manual/semi-manual de ofertas.
- `admin-cards.html`: gerenciamento, busca e status dos cards.
- `admin-users.html`: permissões e controle de usuários.
- `reportes.html`: atendimento de contatos e reportes.

### Cadastro de oferta

Ordem atual do formulário:

1. Dados do produto.
2. Classificação e publicação.
3. Links da oferta.
4. Preço e avaliações.
5. Conteúdo da página do produto.
6. Botão centralizado para criar card manualmente.

Campos suportados: loja, título, imagem, descrição, resumo de avaliações, nota, avaliações, comentários, preço atual, preço antigo opcional, links público/afiliado, categoria, subcategoria, especificações e status.

Status:

- `available`: publicado/publicamente visível.
- `pending`: aguardando publicação, salvo mas invisível ao público.
- `unavailable`: indisponível, salvo para gestão mas removido da listagem pública.

Em Cards cadastrados há métricas clicáveis de disponíveis, aguardando publicação e indisponíveis, busca textual, atalhos de status e botões de editar/excluir. A exclusão exige digitar `EXCLUIR`.

O formulário preserva o rascunho local caso ocorra erro. O botão “Limpar campos”, cancelamento ou criação bem-sucedida pode remover esse rascunho.

## Extensão Chrome — Capturar para Economizaí 1.0.0

Local: `extensao-capturador/`.

- Manifest V3, versão `1.0.0`.
- Compatível no momento com páginas de produto do Mercado Livre.
- Ícones do Economizaí em `extensao-capturador/icons/`.
- Captura informações visíveis: título, imagem, preços quando disponíveis, nota, avaliações, comentários, categoria, descrição resumida e resumo de opiniões gerado por IA.
- Pode abrir a interface visível da Barra de Afiliados para tentar obter o link `meli.la`; se falhar, permite informar o link manualmente.
- Encaminha os dados ao painel e cria card automaticamente como `pending` quando os campos obrigatórios estiverem presentes.
- Possui opção persistente de captura automática para a sessão de trabalho e evita reenvio da mesma URL.
- O usuário deve estar logado como administrador no Economizaí e no Mercado Livre para o fluxo assistido funcionar.
- Após alterar a extensão, abrir `chrome://extensions` e clicar em recarregar.

Não existe uma integração estável de Shopee na versão 1.0.0. Tentativas de leitura de Shopee foram deixadas de lado; não declarar versão 2.0.0 antes de uma captura realmente confiável.

## Mercado Livre, Shopee e automações

- A API do Mercado Livre retornou 403 para várias rotas de produto/pesquisa, inclusive após OAuth e alterações no DevCenter.
- O servidor mantém tentativas de OAuth e uma rotina de atualização de cards já existentes a cada 3 horas. Itens bloqueados são ignorados; ela não descobre produtos novos.
- O fluxo confiável atual é extensão + revisão/cadastro manual ou semi-manual.
- O antigo caminho de PDF/imagem/OCR pode ajudar a preencher campos, mas requer revisão humana; não é fonte confiável de preços ou dados completos.
- Shopee, Amazon e AliExpress existem como lojas/categorias no modelo do site, mas não possuem automação/API ativa.
- Discussões sobre n8n e coleta em massa foram explicitamente pausadas nesta retomada. Não há n8n instalado, configurado ou integrado ao projeto.

## SEO, compartilhamento e desempenho

### SEO e compartilhamento

- `server.mjs` injeta favicon, cabeçalho comum e metadados SEO em páginas HTML.
- Para ofertas dinâmicas, gera metadados de título, descrição, imagem e Schema.org, sitemap e `robots.txt`.
- Compartilhamento abre um painel próprio com copiar link e opções de redes; compartilha a página do Economizaí, não apenas o link de afiliado.

### Otimizações implementadas

1. API de ofertas paginada e filtrada no servidor: de 78 ofertas totais para 12 por resposta desktop. Medição: 157,3 KB para 24,3 KB, redução de 84,5% no payload de ofertas.
2. Cache temporário no `sessionStorage` por 30 segundos para cada combinação de página/filtros, evitando consultas repetidas na mesma aba.
3. Imagens de cards usam carregamento preguiçoso e recursos estáticos usam cache do navegador por 10 minutos com ETag.
4. A logo completa deixou de ser enviada embutida no HTML servido; HTML inicial caiu de 192,4 KB para 76,8 KB, redução de 60,1%. A logo é servida separadamente e cacheável.
5. Compressão automática no servidor: Brotli para navegadores compatíveis e gzip como alternativa. Medições: HTML otimizado de 76,8 KB para aproximadamente 17,9 KB com Brotli; API de ofertas de 24,3 KB para 6,1 KB com gzip.
6. Skeleton de carregamento na grade de ofertas e nas páginas dinâmicas de produto, evitando cards/dados errados durante a busca.

As otimizações 3, 4 e 5 exigem reiniciar `npm run dev` após este commit para serem aplicadas pelo processo do servidor ativo.

## Estrutura de pastas

- `assets/avatars/`: avatares padrão.
- `assets/products/`: imagens locais de produtos.
- `data/`: fallback local de ofertas.
- `database/migrations/`: scripts SQL do Supabase.
- `docs/guides/`: guias locais e OAuth.
- `docs/handoffs/`: histórico de handoffs.
- `extensao-capturador/`: extensão Chrome do projeto.

Convenções:

- Imagem de produto nova: `assets/products/` quando for local.
- Migração nova: `database/migrations/`.
- Documento novo: `docs/`.
- Nova página pública: incluir rodapé `data-site-footer` e `page-shell.js` conforme `README-NOVA-PAGINA.md`.

## Verificação recomendada antes de continuar

```powershell
npm run dev
```

Depois testar:

1. Abrir a página principal, buscar e trocar a página de ofertas.
2. Abrir um produto dinâmico e confirmar que o skeleton aparece sem conteúdo piscando.
3. Entrar com conta comum e confirmar ausência do botão Painel admin.
4. Entrar com administrador, criar/editar um card pendente e publicar.
5. Favoritar, criar alerta, enviar reporte e contato.
6. Abrir extensão em produto do Mercado Livre e verificar a criação como aguardando publicação.

## Próximos passos sugeridos

1. Publicação estável em hospedagem com processo Node persistente e domínio próprio.
2. Configurar e testar alertas por e-mail somente quando houver domínio/remetente válido.
3. Revisar periodicamente a extensão caso o layout do Mercado Livre mude.
4. Criar integração oficial para Shopee/Amazon/AliExpress apenas com acesso autorizado às APIs.
5. Se n8n for retomado, criar uma rota de automação separada, autenticada por segredo próprio; não reutilizar sessão de administrador do navegador nem chaves do Supabase no cliente.


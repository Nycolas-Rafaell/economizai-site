# Handoff — Economizaí

Atualizado em 14/08/2026. Projeto local de ofertas com Node.js, Supabase e páginas HTML estáticas.

## Local do projeto

`C:\Users\Rafae\Documents\Codex\2026-08-12\te\outputs\economizai-site`

## Como iniciar localmente

No PowerShell, dentro da pasta do projeto:

```powershell
npm run dev
```

Abrir sempre pelo servidor local, e não por `file:///`:

- Página principal: `http://localhost:3000/index.html`
- Login: `http://localhost:3000/login.html`
- Painel administrativo: `http://localhost:3000/admin.html`

Se o PowerShell informar que a porta 3000 já está em uso, já existe um servidor ativo. Basta abrir o endereço acima no navegador.

## Arquitetura atual

- `server.mjs`: servidor HTTP, rotas internas, autenticação, cards, alertas, reportes e conexão com Supabase.
- `supabase-store.mjs`: persistência de ofertas, produtos, preços e categorias no Supabase.
- `index.html`: página de ofertas, filtros, categorias, cards, favoritos e selos automáticos.
- `produto-dinamico.html`: modelo de página completa para qualquer card criado pelo painel.
- `admin.html` e `admin.js`: criação, edição, publicação/pausa, exclusão e lista de cards.
- `page-shell.js`: cabeçalho, menu de conta e rodapé das páginas internas.
- `.env`: configurações locais reais. Nunca publicar nem compartilhar as chaves.
- `.env.example`: modelo sem dados secretos; deve permanecer no projeto.

## Banco de dados

O projeto usa Supabase/PostgreSQL. O servidor indicou conexão bem-sucedida e migração dos cards locais.

Arquivos SQL já existentes:

- `SUPABASE-FAVORITOS.sql`
- `SUPABASE-RECURSOS-ECONOMIZAI.sql`
- `SUPABASE-STATUS-CONTATOS.sql`
- `SUPABASE-AUDITORIA-ADMIN.sql`
- `SUPABASE-AUDITORIA-NOME-ADMIN.sql`

Recursos persistidos no banco incluem: ofertas, produtos, imagens, histórico de preços, usuários/autenticação, perfil, favoritos, alertas, itens vistos recentemente, contatos, reportes e auditoria de ações administrativas.

## Autenticação e perfil

- Cadastro e login via Supabase Auth.
- Usuários novos são comuns por padrão; administradores dependem da permissão configurada no banco.
- O botão **Painel admin** só aparece para administrador autenticado.
- Perfil possui nome, e-mail, apelido social, avatar padrão ou foto própria, alteração de e-mail e senha.
- A senha mostra os requisitos em tempo real: mínimo de 8 caracteres, maiúscula, minúscula, número e caractere especial.
- Há avatar no menu, submenu com Minha conta, Meus favoritos, Meus alertas e Sair.
- Confirmação de e-mail é tratada com mensagem própria, em vez de informar senha incorreta.

## Página principal e navegação

- Faixa superior amarela com animação contínua.
- Botão **Categorias** mantém menu lateral com categorias e subcategorias expansíveis.
- Categorias disponíveis incluem games, hardware, informática, periféricos, celulares/tablets, TVs/áudio, casa/cozinha, bebês, saúde/beleza, ferramentas/auto e moda/acessórios.
- Filtros de desconto e ordenação por menor/maior preço.
- Busca de produto sem o título redundante “Pesquisar”.
- Filtros avançados em barra lateral à esquerda: loja, categoria, tipo, preço mínimo, preço máximo e nota.
- Campo de preço vazio é tratado como “sem limite”; apagar mínimo ou máximo não oculta as ofertas.
- A barra lateral não acompanha mais a rolagem; permanece na posição inicial da seção.
- Rodapé institucional e redes ReiWO em páginas atuais e futuras via estrutura compartilhada.
- Favicon com o logo do Economizaí em `assets/logo-economizai.png`.

## Cards de oferta

- Card inteiro abre a página interna de detalhes; botão “Ver oferta” também funciona.
- Imagens usam área fixa com `object-fit: contain` para manter cards padronizados.
- Favorito com estrela vazada/preenchida, disponível para todos os cards futuros.
- Nota abaixo do título: estrela amarela, nota e número de avaliações; quando não há dado, aparece “Avaliação não informada”.
- Desconto aparece ao lado do preço atual como selo verde proporcional, no formato `-XX% OFF`.
- Selos automáticos:
  - **Maior desconto** para a maior porcentagem da listagem.
  - **Melhor preço registrado** quando o preço atual é o menor de um histórico com mais de um registro e existe preço anterior maior.
- Cards indisponíveis não são apagados: imagem escurecida, X vermelho, texto **OFERTA NÃO DISPONÍVEL**, selo de desconto oculto e botão alterado para “Ver detalhes”.

## Página de produto dinâmica

- Título, imagem, preço atual/antigo, percentual de desconto e botão de oferta com link de afiliado.
- Descrição, resumo de avaliações, nota, quantidade de avaliações, comentários e especificações.
- Compartilhamento de oferta.
- Histórico de preço com mínimo, máximo, preço atual e gráfico.
- Alertas de preço e reporte de oferta.
- Frete não é prometido: o texto orienta verificar frete, prazo e condições diretamente na loja, pois dependem da localidade.
- Cabeçalho completo, categorias, contato, perfil e rodapé seguem o padrão do site.

## Administração de ofertas

No formulário manual há campos para:

- Loja (Mercado Livre ou Shopee), título, imagem, descrição e resumo de avaliações.
- Nota, avaliações, comentários, preço atual e preço antigo.
- Links público e de afiliado.
- Categoria, tipo/subcategoria e especificações técnicas.
- Importação semi-manual por print ou PDF, com OCR/leitura local e revisão obrigatória.
- Status da oferta:
  - **Disponível no site**: borda verde e aparece publicamente.
  - **Oferta não disponível**: borda vermelha e aparece no site com o aviso de indisponibilidade.
  - **Aguardando publicação**: borda amarela, fica salva no banco e aparece somente na lista administrativa “Aguardando publicação”.

A área “Cards cadastrados” é separada em:

- Cards publicados (disponíveis e indisponíveis).
- Aguardando publicação.

Cada card tem botões alinhados de **Editar** e **Excluir**. A exclusão exige digitar `EXCLUIR` exatamente, para reduzir exclusões acidentais. Ela remove o card e cópias com o mesmo identificador.

### Correção de duplicidade

Houve uma duplicação ao alterar status. A persistência foi reforçada para localizar as ofertas pelo marketplace + identificador externo e usar atualização (`PATCH`) em vez de criar outro registro. A listagem também consolida registros duplicados antigos para evitar repetição visual. Reiniciar o servidor após estas alterações.

## Alertas, favoritos, contatos e reportes

- Alertas de preço ficam em `alertas.html` e podem ser criados na página do produto.
- Favoritos ficam em `favoritos.html` e são acessados pelo menu do perfil.
- Itens vistos recentemente têm página própria.
- Contato possui formulário com nome, e-mail/telefone, assunto e descrição.
- Reporte permite preço alterado, indisponibilidade, link quebrado e “Outro problema”; nesse último caso é exigida descrição.
- `reportes.html` é a central administrativa para reportes e contatos.
- Status e cores:
  - Reportes: novo amarelo, em análise vermelho, resolvido verde, arquivado branco.
  - Contatos: novo amarelo, recusado vermelho, respondido verde, arquivado branco.
- Ação de status exige confirmação e gera histórico de auditoria em português, com nome do administrador.

## Mercado Livre e Shopee

- A aplicação do Mercado Livre recebeu respostas `403` para leitura de produtos e pesquisa, mesmo após OAuth/permissões. Por isso, não há automação confiável de leitura de preços ou disponibilidade no momento.
- O botão de teste de atualização a cada 3 horas permanece, mas anúncios bloqueados são ignorados sem alterar dados.
- Se a API do Mercado Livre for liberada no futuro, o código já interpreta anúncio inativo/estoque zero como indisponível.
- O fluxo recomendado agora é manual/semi-manual: preencher pelo formulário e revisar dados de print/PDF antes de salvar.
- Shopee possui seleção visual de marketplace no card/formulário, mas ainda não possui API integrada.
- Não usar scraping de lojas como base do projeto: além de instável, pode violar regras das plataformas.

## Arquivos de apoio

- `GUIA-PAINEL-LOCAL.md`: instruções do ambiente local.
- `GUIA-NOVA-AUTORIZACAO-ML.md`: tentativa/guia de OAuth do Mercado Livre.
- `README-NOVA-PAGINA.md`: referência para novas páginas.
- `HANDOFF-Economizai.md` e `HANDOFF-ECONOMIZAI-2026-08-13.md`: handoffs anteriores, mantidos como histórico.

## Cuidados na retomada

1. Não remover `.env`; ele contém a configuração local real. Não enviar esse arquivo ao GitHub.
2. Não usar `file:///`; autenticação, APIs e banco exigem `http://localhost:3000`.
3. Sempre reiniciar `npm run dev` quando `server.mjs` ou `supabase-store.mjs` mudar.
4. Atualizar o navegador com `Ctrl + F5` após alterações de HTML/CSS/JS.
5. Não inventar preços, avaliações ou descrição: usar apenas dados fornecidos/revisados pelo administrador.
6. Preservar o cabeçalho/rodapé compartilhados e o menu de Categorias ao criar novas páginas.

## Próximas melhorias sugeridas

1. Produtos parecidos/alternativas dentro da página de produto.
2. Comparação entre duas ou três ofertas.
3. Páginas públicas específicas por categoria para SEO e navegação.
4. Melhorias de acessibilidade e refinamento mobile.
5. Integração oficial com Shopee, Amazon e AliExpress apenas quando houver acesso a APIs permitidas.


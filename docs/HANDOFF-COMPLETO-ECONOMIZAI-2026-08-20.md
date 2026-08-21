# Handoff completo — Economizaí

Atualizado em: 20/08/2026
Projeto: `C:\Users\Rafae\Documents\Codex\2026-08-12\te\outputs\economizai-site`

## 1. Visão geral

O Economizaí é um site de curadoria de ofertas. Ele possui:

- site público responsivo, com tema preto/amarelo;
- cards de ofertas com preço, desconto, avaliação, quantidade vendida, cupom, favoritos, compartilhamento, alertas e reporte;
- painel administrativo para cadastrar, editar, importar, publicar, pausar, indisponibilizar e excluir cards;
- autenticação e perfis de usuários pelo Supabase;
- banco PostgreSQL do Supabase;
- extensão Chrome estável para captura de produtos do Mercado Livre;
- fluxos n8n para buscar produtos, gerar links de afiliado e monitorar preços.

O projeto foi desenvolvido localmente e ainda não foi publicado permanentemente. Para iniciar localmente:

```powershell
cd C:\Users\Rafae\Documents\Codex\2026-08-12\te\outputs\economizai-site
npm run dev
```

O endereço local padrão é `http://localhost:3000`.

## 2. Repositório e estado atual

Repositório GitHub: `https://github.com/Nycolas-Rafaell/economizai-site.git`

Último commit registrado antes das alterações ainda locais: `c3eb7c0 feat: importar ofertas e consolidar catalogo`.

No momento deste handoff há alterações locais ainda não enviadas ao GitHub:

- modificados: `admin-import.html`, `admin-import.js`, `server.mjs`, `supabase-store.mjs`;
- novos/não rastreados: pasta `automation/`, `database/migrations/SUPABASE-PRECO-HISTORICO-MOTIVO.sql`, `docs/guides/MODELO-PLANILHA-MERCADO-LIVRE-V3.md`.

Antes de qualquer novo trabalho, verificar com:

```powershell
git status
```

Não apagar `.env`, `.ml_tokens.json`, `node_modules` ou migrações sem confirmar o impacto.

## 3. Estrutura importante

### Aplicação

- `server.mjs`: servidor Node, rotas HTTP/API, importação de planilha e regras administrativas.
- `supabase-store.mjs`: persistência e leitura de ofertas/produtos no Supabase.
- `site.js`: listagem pública, filtros, paginação, cards e interações gerais.
- `page-shell.js`: cabeçalho/menu reutilizável nas páginas.
- `category-catalog.js`: catálogo de categorias e subcategorias.
- `produto-dinamico.html` e `produto-detalhe.css`: página dinâmica do produto.

### Administração

- `admin.html` / `admin.js`: hub do painel administrativo e análises.
- `admin-cards.html` / `admin-cards.js`: gerenciamento de cards já cadastrados.
- `admin-import.html` / `admin-import.js`: importação de produtos da planilha.
- `admin-users.html` / `admin-users.js`: gestão de usuários e permissões.
- `analytics.html` / `analytics.js`: métricas do site.
- `reportes.html` / `reportes.js`: reportes e contatos.

### Recursos de usuário

- `login.html` / `login.js`: entrar, criar conta, recuperação de senha e confirmação de e-mail.
- `conta.html` / `conta.js`: perfil, avatar, foto própria, senha, e-mail e telefone.
- `favoritos.html` / `favoritos.js`: ofertas favoritas.
- `alertas.html` / `alertas.js`: alertas de preço.
- `vistos-recentemente.html` / `vistos-recentemente.js`: itens recentemente vistos.

### Estilos e componentes transversais

- `header-ui.css`: cabeçalho/menu em todas as páginas.
- `ui-feedback.css` / `ui-feedback.js`: mensagens personalizadas de sucesso, erro e confirmação.
- `share-tools.css`, `share-tools-mobile.css`, `share-tools.js`: menu de compartilhamento.
- `password-visibility.css` / `password-visibility.js`: botão de olho nos campos de senha.
- `assets/`: logos, avatares e imagens organizadas.

### Extensão Chrome

Pasta: `extensao-capturador/`.

Versão estável declarada: **1.0.0**, focada em Mercado Livre.

Ela captura, quando disponível na página:

- título;
- imagem;
- URL pública;
- preço atual e antigo;
- desconto;
- avaliação;
- quantidade de avaliações/comentários;
- resumo de opiniões gerado por IA;
- descrição/resumo;
- categoria, quando o DOM permite;
- link de afiliado digitado previamente pelo operador.

O comportamento atual desejado é: inserir manualmente o link de afiliado no campo da extensão e clicar uma vez para capturar/enviar. A tentativa de capturar automaticamente o link da Barra de Afiliados foi abandonada/revertida por instabilidade e risco de logout.

## 4. Funcionalidades implementadas no site

### Navegação e visual

- cabeçalho padronizado e responsivo em todas as páginas;
- logo clicável retorna ao início;
- botão de voltar ao topo aparece durante a rolagem;
- menu de categorias com subcategorias expansíveis e o mesmo comportamento em todas as páginas;
- categorias/lojas/filtros e busca;
- paginação no feed de ofertas para não renderizar cards demais ao mesmo tempo;
- rodapé com logo completa, “Um projeto ReiWO”, texto de contato e botão de contato;
- favicon com a logo do Economizaí;
- ajustes específicos de mobile/tablet: cards em coluna adequada, preços sem corte e menu de compartilhamento responsivo;
- barras de rolagem com tema do site;
- feedback visual verde para sucesso, vermelho para erro e confirmações personalizadas em vez de `alert()`/`prompt()` nativos.

### Cards e ofertas

- botão de favorito em cards atuais e futuros;
- card de favoritos reutiliza o card da página de ofertas;
- nota/avaliação e quantidade vendida em cards;
- desconto ao lado do preço, incluindo cálculo de desconto quando o dado não veio pronto;
- preço formatado com centavos; por exemplo, `44,00` permanece `44,00`;
- cupom informativo quando existir;
- opção de alerta de preço e de reportar oferta;
- compartilhamento por menu: copiar link do Economizaí, WhatsApp, Facebook, Telegram e navegador quando suportado;
- produtos indisponíveis são retirados das páginas públicas, mas preservados no painel administrativo;
- histórico real de preços com pontos/valores no gráfico;
- tela de produto com dados, preço, histórico, alerta, reporte e compartilhamento.

### Categorias e lojas

O catálogo foi ampliado e padronizado. Há categorias novas e categorias antigas preservadas, sem a marca “legado” na interface. Entre as áreas abrangidas estão tecnologia, casa e móveis, eletrodomésticos, esportes, ferramentas, construção, indústria e comércio, negócio, pet shop, saúde, acessórios para veículos, beleza, moda, bebês, brinquedos, imóveis, internacional, produtos sustentáveis, supermercados, veículos e outras.

Também existem páginas/filtros por loja: Mercado Livre, Shopee, Amazon e AliExpress. Atualmente a maior parte real das ofertas é do Mercado Livre.

### Área de usuário e autenticação

- cadastro via Supabase Auth;
- usuário novo é comum por padrão;
- confirmação de e-mail é exigida e recebe mensagem específica quando falta confirmação;
- login volta para a página inicial, não para o perfil;
- “Esqueci minha senha!” funcionando via e-mail do Supabase;
- requisitos de senha em tempo real: minúscula, maiúscula, número, caractere especial e mínimo de 8 caracteres;
- perfil com nome, e-mail, apelido social, telefone opcional, avatar pré-definido e upload de foto;
- troca de senha exige senha atual;
- troca de e-mail exige senha atual;
- menu de perfil aparece apenas para usuário autenticado, com Minha conta, Meus favoritos, Meus alertas e Sair;
- botão Painel admin só aparece para usuário autenticado com permissão administrativa.

### Administração

- painel administrativo abre primeiro em Análises;
- cards cadastrados em página separada do cadastro;
- formulário reorganizado nesta ordem:
  1. Dados do produto;
  2. Classificação e publicação;
  3. Links da oferta;
  4. Preço e avaliações;
  5. Conteúdo da página do produto;
  6. botão de criar card centralizado no final.
- estados de publicação: disponível/publicado, aguardando publicação e indisponível;
- borda de cards no painel: verde disponível, amarelo aguardando, vermelho indisponível;
- filtros clicáveis pelos três estados;
- ações rápidas individuais e em lote, com limite/quantidade configurável para não sobrecarregar;
- confirmação adicional ao excluir card;
- cards administrativos visualmente próximos dos cards públicos;
- importação de planilha, lista de resultados por linha e tooltip de motivo de falha;
- deduplicação por `external_product_id`/ID de produto e URL, com consolidação de dados quando aplicável;
- painel de usuários: permissões, suspensão, banimento e exclusão;
- reportes e contatos com status e cores, histórico de ações com nomes em português;
- analytics: acessos, visitantes, cliques, itens e categorias mais acessados.

## 5. Banco de dados / Supabase

O banco principal é um projeto Supabase PostgreSQL. O site usa URL e chaves presentes no `.env`. Não expor nem versionar as chaves.

Tabelas/áreas utilizadas ao longo do projeto:

- `products`: dados permanentes do produto, título e conteúdo; o campo de cupom fica associado ao produto (a referência correta é normalmente `p.coupon_text`, não `o.coupon_text`);
- `offers`: preço, URL pública/afiliada, disponibilidade/publicação e dados de monitoramento;
- `categories` e tabelas de catálogo/atributos;
- favoritos, alertas, reportes/contatos, perfis/permissões e eventos/analytics;
- histórico de preço (`price_history` ou estrutura equivalente definida pelas migrações).

Migrações relevantes estão em `database/migrations/`:

- `SUPABASE-CATEGORIAS-CATALOGO.sql`;
- `SUPABASE-CATEGORIAS-PDF.sql`;
- `SUPABASE-FAVORITOS.sql`;
- `SUPABASE-ALERTAS-CANAIS.sql`;
- `SUPABASE-ANALYTICS.sql`;
- `SUPABASE-AUDITORIA-ADMIN.sql`;
- `SUPABASE-AUDITORIA-NOME-ADMIN.sql`;
- `SUPABASE-STATUS-CONTATOS.sql`;
- `SUPABASE-RECURSOS-ECONOMIZAI.sql`;
- `SUPABASE-DADOS-OFERTA-AUTOMACAO.sql`;
- `SUPABASE-PRECO-HISTORICO-MOTIVO.sql`.

Para o monitoramento há também:

- `automation/n8n/monitoramento-preco/migration-monitoramento-preco-v3.sql`;
- `automation/n8n/monitoramento-preco/migration-monitoramento-preco-v4.sql`.

Se uma categoria existir na interface mas não no banco, a importação falhará com algo como `categories não contém o registro ...`. Executar a migração de catálogo apropriada no SQL Editor do Supabase antes de importar produtos daquela categoria.

## 6. Importação de planilha

O modelo atual oficial é o CSV “Modelo - Mercado Livre - v3 - Produtos”. O guia local é:

`docs/guides/MODELO-PLANILHA-MERCADO-LIVRE-V3.md`

O importador foi adaptado para ler a estrutura desse modelo e criar/atualizar cards no Supabase. Ele aceita até **250 itens por envio**.

Regras desejadas da importação:

- rejeitar duplicados por ID externo/ID do produto e URL;
- consolidar registros duplicados quando um trouxer campos melhores;
- permitir ausência de preço antigo;
- preencher/calcular desconto quando possível;
- criar itens importados inicialmente conforme o status informado;
- mostrar resultado por linha: criado ou não criado;
- em itens não criados, o motivo aparece ao passar o mouse sobre o indicador vermelho.

Há alteração local recente nesta área. Antes de continuar, testar importação com uma pequena planilha de 2–5 linhas antes de lote grande.

## 7. n8n — fluxo 1: captura de produtos do Mercado Livre

Há dois workflows n8n, originalmente guardados/exportados separadamente. O primeiro busca ofertas por categorias do Mercado Livre e grava em uma Google Sheet.

Fluxo conceitual atual:

1. Gatilho agendado;
2. busca cookie do Mercado Livre no PostgreSQL/Supabase;
3. busca categorias ativas na planilha;
4. embaralha categorias;
5. busca a página da categoria via HTTP com cookie;
6. extrai cards do HTML;
7. separa itens;
8. filtra produtos válidos;
9. formata preços e ID;
10. embaralha produtos;
11. anexa categoria correta;
12. gera campos finais (`url_limpa`, categoria, status `novo`, link afiliado vazio);
13. limpa e reinsere as linhas na planilha de produtos.

Pontos já corrigidos:

- extração de título, imagem, URL, preço original, atual e desconto;
- nota, vendidos e cupom extraídos dos cards quando presentes;
- correção de centavos e preço formatado;
- correção da propagação de categoria por item, evitando aplicar a primeira categoria a todos;
- restauração dos itens após o nó que limpa a planilha, porque `Clear` devolve somente item vazio;
- Google Sheets configurado para `Append Row`/mapeamento adequado;
- quantidade vendida deve ser armazenada como texto para evitar `#ERROR!` no Sheets.

Os nomes dos nós no n8n são sensíveis. Quando um código usa `$('<nome>').item`, o nome deve ser exatamente igual ao nó existente no fluxo.

## 8. n8n — fluxo 2: geração de link de afiliado

O fluxo busca produtos com `status = novo` e sem link afiliado na planilha, usa cookie do Mercado Livre, acessa o Linkbuilder/Barra de Afiliados, obtém CSRF, envia a geração de link, extrai a resposta e atualiza a planilha com link/status.

Ele exige:

- cookie do Mercado Livre válido salvo na tabela/configuração usada pelo n8n;
- credenciais corretas do banco;
- credencial Google Sheets válida;
- os status corretos nas linhas da planilha (`novo`, conforme a regra do fluxo);
- sessão do Mercado Livre ainda válida.

O fluxo já funcionou para alguns produtos, mas depende da sessão/cookie do Mercado Livre. Se o Mercado Livre deslogar a conta, atualizar manualmente o cookie no fluxo/tabela antes de executar.

## 9. n8n — monitoramento de preço

### Arquivo mais recente

O arquivo **real e importável** mais atual é:

`automation/n8n/monitoramento-preco/MONITORAMENTO-DE-PRECO-V8.2-CUPONS-PRECISOS.json`

Ele foi gerado e validado localmente, possui **27 nós** e está com `active: false` para importação/teste seguro. Não é apenas um gerador: é o workflow JSON pronto para importar.

Versões anteriores permanecem na mesma pasta, como backup:

- V3 seguro;
- V4 seguro;
- V5 preço PDP confirmado;
- V6 variações confirmadas;
- V7 motivos de atualização;
- V8 cupons;
- V8.1 cupons ampliados;
- V8.2 cupons precisos.

### O que o fluxo monitora

Para ofertas elegíveis e disponíveis do Mercado Livre, o fluxo:

1. obtém o cookie válido;
2. seleciona ofertas elegíveis no Supabase;
3. consulta cada página de produto;
4. confirma título e preço principal do PDP;
5. interpreta preço atual, referência/preço antigo e desconto;
6. atualiza a oferta somente quando o resultado é confiável;
7. grava histórico de preço e motivo;
8. atualiza alertas de preço atingidos no banco;
9. marca indisponível apenas em casos definidos de indisponibilidade;
10. marca revisão manual/falha temporária quando não há certeza;
11. registra relatório final detalhado.

O agendamento padrão é “a cada 3 horas”; o limite pode ser ajustado para rodadas controladas.

### Proteções existentes

- confirmação por fontes independentes do preço do PDP;
- validação de título;
- bloqueio de variações absurdas (ex.: acima de 3x) para revisão manual;
- distinção entre produto realmente indisponível e layout/preço não encontrado;
- caminho de falha temporária não deve derrubar o loop inteiro;
- `last_check_status`, `last_check_error`, `last_checked_at` e histórico de preços para auditoria;
- motivos legíveis no histórico, por exemplo preço atual, referência e desconto alterados.

### Preços e páginas já conferidos manualmente

O parser foi validado com vários PDPs, incluindo:

- Fonte Taicon: R$ 169,00;
- Fralda Baby M: R$ 42,99 com referência R$ 50,05;
- Cadeira esteirinha: R$ 99,99 com referência R$ 329,30;
- Tênis Salomon: R$ 698,39 com referência R$ 1.199,99;
- Garrafa térmica: R$ 58,90 com referência R$ 119,90;
- Papel depilatório: R$ 37,10 com referência R$ 95,00;
- Tênis Kappa: R$ 161,49 com referência R$ 169,99;
- Blusa, vestido e outros itens de variação.

O monitoramento está em bom estado, mas deve continuar com lotes pequenos antes de ativar execução geral.

### Cupons no V8.2

O cupom é **informativo**. Ele não substitui nem altera o preço principal da oferta.

O V8.2 reconhece, além das formas anteriores:

- `Compre R$ 240 e ganhe R$ 12 OFF`;
- `Compre R$ 99 e ganhe 10% OFF`;
- `R$ 54,14 com Cupom por seguir a loja`;
- `50% OFF com Cupom`;
- `R$ 6.199 com Cupom`.

O texto é salvo como descrição do cupom (por exemplo, `Cupom: R$ 12,00 OFF em compras a partir de R$ 240,00`), não como desconto direto do item quando a condição não permite afirmar isso.

Resultados recentes mostraram que o V8.2 identificou corretamente os cupons de:

- Vestido: `Preço com cupom: R$ 44,00`;
- Blusa: `Preço com cupom: R$ 54,00 · Condição: seguir a loja`;
- Garrafa: `Cupom: 50% OFF`;
- Tênis Kappa: `Cupom: R$ 12,00 OFF em compras a partir de R$ 240,00`.

Observação: o valor exibido no Mercado Livre pode mudar entre consultas por variante, Pix, condição, estoque, região, sessão ou cupom. O fluxo deve sempre preferir o preço principal confirmado do PDP, registrando cupom separadamente.

### Como importar/testar V8.2

1. No n8n, importar `MONITORAMENTO-DE-PRECO-V8.2-CUPONS-PRECISOS.json`.
2. Manter o workflow desativado.
3. Revisar/selecionar as mesmas credenciais PostgreSQL e Google Sheets já usadas no V8.1.
4. No nó `BUSCA OFERTAS ELEGÍVEIS`, trocar temporariamente a consulta por uma com `WHERE o.id IN (...)` contendo 3–5 IDs conhecidos.
5. Executar manualmente pelo gatilho.
6. Conferir `RELATÓRIO FINAL` e o campo `cupom` nos detalhes.
7. Conferir no Supabase:

```sql
SELECT
  p.title,
  p.coupon_text,
  o.current_price,
  o.original_price,
  o.discount_percent,
  o.last_checked_at,
  o.last_check_status,
  o.last_check_error
FROM public.offers o
JOIN public.products p ON p.id = o.product_id
WHERE o.id IN ('COLE_OS_IDS_AQUI');
```

8. Somente após várias rodadas corretas, restaurar a consulta geral e ativar o agendamento.

### Credenciais do n8n para o Supabase principal

O n8n foi conectado ao banco principal através do Shared Pooler do Supabase:

- host: `aws-0-sa-east-1.pooler.supabase.com`;
- porta: `5432`;
- database: `postgres`;
- usuário: `postgres.<PROJECT_REF>` — deve usar o valor exato exibido no Supabase;
- SSL ativado/aceito; túnel SSH desligado;
- máximo de conexões configurado em 30.

O teste de conexão foi bem-sucedido. Não registrar senha em arquivos nem conversar sobre ela em texto.

O problema `public.config não existe` ocorreu porque o workflow de monitoramento procurava uma tabela `config` que só existia no banco de teste. Para o banco principal, é necessário usar a tabela/estrutura de cookie existente ou criar explicitamente uma tabela compatível. Não trocar o cookie por uma solução que prejudique os demais workflows: o usuário usa o mesmo cookie do Mercado Livre para todos os fluxos.

## 10. Regras de segurança e manutenção

- `.env` é o arquivo real de configuração local; `.env.example` é apenas modelo. Os dois devem existir.
- nunca versionar `.env`, `.ml_tokens.json`, senhas do Supabase, cookies Mercado Livre, tokens ou chaves.
- usar a conta/credenciais já existentes do Google Sheets no n8n; a conexão OAuth não é necessariamente “eterna”, pode exigir novo login se o token for revogado ou expirar sem renovação.
- não alterar migrações já aplicadas sem avaliar o estado do banco;
- antes de lote grande/importação/ativação, testar com 3–5 itens;
- preservar as versões anteriores dos workflows n8n como ponto de restauração.

## 11. Pendências e próximos passos recomendados

1. Importar e testar o workflow V8.2 de monitoramento com 4–5 produtos que possuem cupom;
2. verificar se `coupon_text` está persistindo corretamente em `products` e se o site exibe isso onde desejado;
3. após testes, decidir ativar o agendamento de 3 horas com lote controlado;
4. testar a importação usando o modelo oficial CSV V3 com 2–5 registros;
5. revisar quais alterações locais devem entrar em um commit e subir ao GitHub;
6. limpar apenas arquivos temporários de geração n8n quando houver uma cópia segura no GitHub;
7. futuramente integrar Shopee/Amazon/AliExpress de modo oficial, preferencialmente com APIs permitidas;
8. alertas por e-mail/WhatsApp permanecem apenas preparados conceitualmente. O telefone opcional já foi adicionado ao perfil; WhatsApp não foi implementado.

## 12. Problemas conhecidos / limitações

- APIs do Mercado Livre retornaram 403 em endpoints de itens/catálogo; a estratégia confiável atual para automação é extensão + n8n/HTML/cookie, não as rotas privadas/não documentadas.
- Shopee foi avaliada, mas a captura é instável sem API oficial; não integrar como versão estável até obter acesso/API.
- páginas do Mercado Livre variam por tipo de anúncio, variante, região e login. O monitoramento prefere revisão manual a atualizar um preço sem confirmação.
- algumas páginas de catálogo exibem “Ver opções de compra” em vez de preço único. Elas devem cair em revisão manual ou ficar indisponíveis conforme as regras específicas do fluxo, sem sobrescrever preço com valor incerto.
- os dados capturados nos cards de categoria podem não refletir a variante específica. O monitoramento no PDP é a fonte mais confiável para preço atualizado.

## 13. Checklist de retomada para outro agente/chat

1. Ler este handoff inteiro.
2. Abrir o projeto em `C:\Users\Rafae\Documents\Codex\2026-08-12\te\outputs\economizai-site`.
3. Executar `git status` e não sobrescrever as mudanças locais.
4. Não tocar em `.env` nem solicitar/exibir segredos.
5. Para trabalho no site, iniciar com `npm run dev` e testar no navegador.
6. Para banco, usar o Supabase principal e confirmar migrações antes de escrever.
7. Para n8n, sempre preservar/exportar o workflow anterior antes de editar.
8. Para o monitoramento, o ponto de partida atual é `MONITORAMENTO-DE-PRECO-V8.2-CUPONS-PRECISOS.json`.
9. Explicar instruções n8n passo a passo, com nomes de nós exatamente como aparecem no fluxo do usuário.
10. Após alterações materiais, testar e só então fazer commit/push quando o usuário pedir.

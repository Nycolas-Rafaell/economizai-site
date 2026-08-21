# Handoff completo — Economizaí

**Atualizado em:** 20/08/2026
**Projeto:** Economizaí — agregador de ofertas com links de afiliado
**Repositório:** https://github.com/Nycolas-Rafaell/economizai-site.git
**Pasta local:** `C:\Users\Rafae\Documents\Codex\2026-08-12\te\outputs\economizai-site`

> Este documento consolida o estado do site, banco Supabase, extensão de captura e automações n8n. Não contém senhas, tokens, cookies, chaves de API ou URLs privadas.

---

## 1. Objetivo do projeto

O Economizaí é um site brasileiro de ofertas e descontos. Os cards levam o usuário à loja de origem usando links de afiliado, mas o compartilhamento público deve apontar para a página do próprio Economizaí.

O foco atual é Mercado Livre. A estrutura foi pensada para acomodar Shopee, Amazon, AliExpress e outras lojas no futuro, sem necessidade de refazer o site.

O fluxo de trabalho desejado é:

1. Encontrar ofertas no Mercado Livre.
2. Coletar título, imagem, preços, desconto, nota, vendas, cupom e categoria.
3. Gerar/colar link de afiliado.
4. Importar ofertas para o banco inicialmente como aguardando publicação ou conforme definido.
5. Publicar e administrar os cards.
6. Monitorar preços/cupom/indisponibilidade periodicamente pelo n8n.

---

## 2. Como iniciar o site localmente

No PowerShell ou terminal do VS Code:

```powershell
cd C:\Users\Rafae\Documents\Codex\2026-08-12\te\outputs\economizai-site
npm run dev
```

Endereço local:

```
http://localhost:3000
```

O backend é Node.js, iniciado por `server.mjs`. O projeto utiliza HTML, CSS e JavaScript sem framework pesado no front-end.

Há suporte para abrir o site pelo celular usando um túnel Cloudflare durante desenvolvimento. Ainda não há uma publicação permanente oficialmente estabelecida neste handoff.

---

## 3. Estrutura técnica principal

### Backend e dados

- `server.mjs`: servidor HTTP, APIs internas, autenticação de rotas administrativas, importação e recursos do site.
- `supabase-store.mjs`: acesso e persistência no Supabase.
- `.env`: configuração real local, com valores secretos. **Não enviar ao GitHub.**
- `.env.example`: modelo sem segredos; deve permanecer no repositório.
- `.ml_tokens.json`: dados sensíveis de Mercado Livre; **não publicar nem compartilhar.**

### Diretórios importantes

- `assets/`: imagens, logotipos e recursos visuais.
- `database/migrations/`: SQLs versionados para mudanças no Supabase.
- `automation/`: scripts e materiais de automação.
- `automation/n8n/monitoramento-preco/`: versões do fluxo de monitoramento de preço.
- `extensao-capturador/`: extensão do navegador de captura do Mercado Livre.
- `docs/`: guias e handoffs.

### Páginas relevantes

- `index.html` / `site.js`: página principal de ofertas.
- `produto-dinamico.html`: detalhe de oferta.
- `login.html` / `login.js`: entrar, cadastro, recuperação de senha.
- `conta.html` / `conta.js`: perfil.
- `favoritos.html`, `alertas.html`, `vistos-recentemente.html`.
- `admin.html`, `admin-cards.html`, `admin-import.html`, `admin-users.html`, `analytics.html`.
- `reportes.html`, `contato.html`, `lojas.html`.
- `page-shell.js`: elementos comuns de cabeçalho/menu.
- `category-catalog.js`: catálogo hierárquico de categorias.

---

## 4. Funcionalidades públicas já implementadas

### Visual e navegação

- Tema escuro com amarelo como cor principal.
- Responsividade trabalhada para desktop, tablet e celular.
- Cabeçalho consistente em páginas existentes e futuras.
- Logo clicável volta ao início das ofertas.
- Botão de voltar ao topo aparece durante a rolagem.
- Rodapé centralizado com logo completa, “Um projeto ReiWO”, texto de dúvidas/divulgações e contato.
- Scrollbars com tema do site.

### Categorias, lojas e filtros

- Menu de categorias expansível, com subcategorias.
- Estrutura aplicada às páginas públicas, detalhes de produto e páginas de loja.
- Catálogo ampliado com categorias comuns de marketplace: tecnologia, celulares, casa, ferramentas, veículos, supermercado, pet shop, saúde, beleza, moda, bebês, brinquedos, construção, esportes, indústria, imóveis, internacional, produtos sustentáveis e outras.
- Algumas categorias antigas apareceram como “legado” para preservar compatibilidade; a intenção foi manter dados antigos sem quebrar filtros.
- Páginas/filtros por loja: Mercado Livre, Shopee, Amazon e AliExpress.
- Busca, filtros de preço, categoria, tipo, loja e avaliação.
- Paginação para evitar que muitos cards deixem a página lenta; normalmente exibe cerca de 9–12 itens por página.

### Cards públicos

Todos os cards existentes e novos devem seguir a mesma estrutura:

- loja de origem;
- imagem;
- estrela de favorito;
- título;
- nota, quando disponível;
- indicador simples de vendas, com ícone positivo, por exemplo “Mais de 5 mil vendidos”;
- preço antigo riscado;
- preço atual com dois centavos sempre preservados, por exemplo `R$ 44,00`;
- selo de desconto próximo do preço;
- desconto calculado automaticamente quando necessário;
- botão “Ver oferta”;
- botão de compartilhamento compacto.

Quando uma oferta é marcada indisponível, ela deixa de aparecer nas páginas públicas, mas não é apagada do banco nem do painel administrativo.

### Página de produto

- Informações detalhadas, preço, desconto, avaliações, descrição/resumo e imagem.
- Histórico de preço com gráfico e rótulo/valor próximo aos pontos.
- Criar alerta de preço.
- Reportar oferta.
- Compartilhamento.
- Itens visualizados recentemente.
- Aviso de que frete/prazo/condições dependem da loja e da localidade.

### Compartilhamento

O botão de compartilhar abre um pequeno painel, adaptado também ao mobile, com opções de:

- copiar link;
- WhatsApp;
- Facebook;
- Telegram.

Ele compartilha a página do Economizaí, e não somente o link afiliado da loja.

---

## 5. Login, perfil e usuários

O site usa Supabase Auth.

### Cadastro e acesso

- Cadastro cria usuário comum por padrão.
- Confirmação de e-mail é exigida.
- Quando e-mail/senha estão certos mas falta confirmação, o sistema deve informar isso claramente, em vez de dizer apenas que a senha está errada.
- Mensagem específica para tentativa de cadastro com e-mail já utilizado.
- Login bem-sucedido redireciona à página de ofertas.
- Recuperação de senha por e-mail foi adicionada.

### Requisitos de senha

A tela de cadastro mostra e valida em tempo real:

- pelo menos uma minúscula;
- uma maiúscula;
- um número;
- um caractere especial;
- mínimo de 8 caracteres.

Os requisitos mudam de cor conforme forem atendidos. Todos os campos de senha têm botão de olho para mostrar/ocultar.

### Perfil

O perfil permite:

- nome;
- e-mail;
- apelido social;
- telefone opcional;
- avatar padrão entre seis modelos;
- envio de foto própria com ajuste/corte para caber na área de avatar;
- troca de senha, exigindo senha atual;
- troca de e-mail, exigindo senha atual.

O menu de perfil aparece somente para usuário logado e contém:

- Minha conta;
- Meus favoritos;
- Meus alertas;
- Sair.

O botão “Painel admin” aparece apenas quando o usuário logado possui permissão administrativa, ao lado do perfil.

### Administração de usuários

Foi criada uma área administrativa de usuários com capacidade de:

- conceder/remover papel de administrador;
- suspender;
- banir;
- excluir usuário.

Antes de mexer nas permissões, confirmar sempre as regras atuais no banco e nunca promover usuário pelo front-end sem validação do servidor.

---

## 6. Painel administrativo

### Organização

O painel foi reorganizado para ficar mais visual e intuitivo:

- a tela inicial do painel deve ser `analytics.html`;
- criação de card e cards cadastrados ficam em páginas separadas;
- atalhos para oferta, cards, atendimento e site;
- visual com padrão do restante do Economizaí.

### Cadastro de cards

Ordem definida do formulário:

1. Dados do produto
2. Classificação e publicação
3. Links da oferta
4. Preço e avaliações
5. Conteúdo da página do produto

O botão “Criar card manualmente” fica no final, centralizado.

Status disponíveis:

- Disponível/publicado;
- Aguardando publicação;
- Indisponível.

### Gerenciamento de cards

- Cards administrativos visualmente semelhantes aos públicos.
- Borda verde: disponível.
- Borda amarela: aguardando publicação.
- Borda vermelha: indisponível.
- Editar e excluir com layout organizado; exclusão pede confirmação extra.
- Contadores clicáveis para filtrar os três estados.
- Se nenhum filtro estiver selecionado, todos aparecem.
- Ações em lote conforme filtro ativo:
  - publicados: mover para aguardando publicação ou indisponível;
  - aguardando: disponibilizar ou indisponibilizar;
  - indisponíveis: disponibilizar ou aguardar publicação.
- Campo para limitar quantidade por ação em lote, evitando sobrecarga.

### Importação

Há uma página de importação de planilha:

- suporta o modelo Mercado Livre v3;
- mostra resultados por linha;
- item criado aparece como sucesso;
- item recusado aparece com indicador vermelho;
- motivo deve aparecer ao passar o mouse no resultado;
- limite de importação configurado para até 250 itens por envio;
- deduplicação deve usar prioritariamente identificador externo/ML, URL normalizada e dados já existentes.

Houve uma tentativa anterior de reforçar a deduplicação que afetou temporariamente o menu de perfil/painel admin da página inicial. Isso foi corrigido/revertido. Qualquer nova alteração em importação/deduplicação deve ser testada em login, perfil e menu da página principal.

### Atendimento

Foram implementados:

- reportes de oferta;
- contatos;
- histórico das mudanças de status;
- nomes de administradores em vez de e-mail no histórico;
- histórico em português.

Status dos reportes:

- Novo: amarelo;
- Em análise: vermelho;
- Resolvido: verde;
- Arquivado: branco.

Status dos contatos:

- Novo: amarelo;
- Respondido: verde;
- Recusado: vermelho;
- Arquivado: branco.

Quando o usuário escolhe “Outro problema” no reporte, aparece campo adicional para explicar.

### Analytics

A página de análises acompanha:

- acessos ao site;
- visitantes/sessões;
- aberturas de ofertas;
- cliques em lojas;
- acessos por dia;
- ofertas mais acessadas;
- categorias mais acessadas.

Os dados só passam a existir a partir do momento em que o rastreamento foi ativado; não há histórico retroativo.

---

## 7. Banco Supabase

O Supabase do site é o banco central atual.

Entidades usadas pelo projeto incluem, entre outras:

- `products`;
- `offers`;
- `categories`;
- perfis/roles de usuários;
- favoritos;
- alertas;
- histórico de preços;
- reportes;
- contatos;
- auditoria administrativa;
- analytics.

### Migrations importantes

Em `database/migrations/`:

- `SUPABASE-ALERTAS-CANAIS.sql`
- `SUPABASE-ANALYTICS.sql`
- `SUPABASE-AUDITORIA-ADMIN.sql`
- `SUPABASE-AUDITORIA-NOME-ADMIN.sql`
- `SUPABASE-CATEGORIAS-CATALOGO.sql`
- `SUPABASE-CATEGORIAS-PDF.sql`
- `SUPABASE-DADOS-OFERTA-AUTOMACAO.sql`
- `SUPABASE-FAVORITOS.sql`
- `SUPABASE-PRECO-HISTORICO-MOTIVO.sql`
- `SUPABASE-RECURSOS-ECONOMIZAI.sql`
- `SUPABASE-STATUS-CONTATOS.sql`

Não executar todas cegamente: algumas podem já ter sido aplicadas. Antes, verificar a estrutura/tabelas e aplicar somente a migration pendente.

### Atenção a categorias

Quando há erro como:

```
Supabase: categories não contém o registro “brinquedos”
```

o problema é que a categoria existe no front/n8n mas não na tabela `categories`. A correção correta é aplicar/atualizar a migration de catálogo, e não ignorar o erro no importador.

### Cupom no banco

O texto de cupom pertence ao produto:

```
products.coupon_text
```

Não usar `offers.coupon_text`, pois essa coluna não existe.

---

## 8. Extensão de captura

Pasta:

```
extensao-capturador/
```

### Estado

- Versão estável declarada: **1.0.0** para Mercado Livre.
- A extensão já consegue capturar, dependendo do layout da página:
  - título;
  - imagem;
  - URL pública;
  - preço atual;
  - preço antigo;
  - desconto;
  - nota;
  - número de avaliações/vendas quando visível;
  - categoria;
  - resumo de avaliações por IA quando exibido;
  - descrição/resumo do produto.
- Há campo manual para colar o link de afiliado antes de enviar.
- O objetivo é que, após captura, os dados preencham/criem o rascunho no site sem exigir reescrever os campos.

### Observações

- Tentativas de gerar automaticamente o link de afiliado pela Barra de Afiliados do Mercado Livre foram instáveis por login, CAPTCHA, sessão e mudanças no site. A automação direta por barra não deve ser reintroduzida sem novo teste controlado.
- Shopee foi explorada, mas a captura ainda é instável/incompleta. Versão 2.0.0 da extensão só deve ser considerada após integração robusta, preferencialmente pela API oficial.

---

## 9. n8n — Workflow 1: descoberta/coleta de produtos

Objetivo: buscar páginas de categoria/oferta do Mercado Livre e preencher uma planilha de produtos.

Fluxo conceitual:

1. Gatilho agendado.
2. Busca cookie do Mercado Livre.
3. Busca categorias ativas.
4. Embaralha categorias.
5. Busca página de categoria por HTTP.
6. Extrai campos dos cards em HTML.
7. Separa os itens em cards.
8. Filtra itens válidos.
9. Formata preço e gera ID.
10. Embaralha produtos.
11. Anexa a categoria correta de cada página de origem.
12. Prepara produtos.
13. Limpa planilha.
14. Restaura itens após a limpeza.
15. Insere produtos na planilha.

Campos usados:

```
nome
imagem
url_original
preco_original
preco_atual
desconto
nota
quantidade_vendidas
cupom
categoria
preco_formatado
id_produto
url_limpa
status
link_afiliado
```

### Lições importantes do workflow 1

- Não renomear nós sem corrigir expressões `$('NOME DO NÓ')`; vários erros antigos vieram disso.
- O nó de limpar a planilha geralmente não devolve os itens; por isso existe/restaura-se um nó de recuperação antes da inserção.
- A categoria precisa acompanhar os itens da página de origem. Usar uma única categoria global fez itens de outras categorias virarem “ferramentas”.
- Valores de vendidos/cupom devem ser texto simples, não fórmulas de Sheets, para evitar `#ERROR!`.
- O parser de preço precisou de ajustes para não converter `149,00` em `14.900,00`.
- Links devem ser normalizados, removendo parâmetros de rastreio quando necessário, mas sem invalidar identificação do item.

Guia do modelo de planilha:

```
docs/guides/MODELO-PLANILHA-MERCADO-LIVRE-V3.md
```

---

## 10. n8n — Workflow 2: geração de link afiliado

Objetivo: ler produtos novos sem `link_afiliado`, usar a sessão/cookie do Mercado Livre e gerar link `meli.la`, atualizando a planilha.

Dependências:

- cookie válido do Mercado Livre;
- sessão autenticada;
- página de linkbuilder/CSRF funcionando;
- planilha com status apropriado, normalmente `novo`.

Limitação crítica: se a conta Mercado Livre deslogar, houver CAPTCHA ou mudança no layout, o fluxo pode falhar. Isso é esperado e precisa de intervenção manual.

---

## 11. Monitoramento de preços pelo n8n

Pasta:

```
automation/n8n/monitoramento-preco/
```

Arquivos disponíveis incluem versões V3 a V8.2:

- `MONITORAMENTO-DE-PRECO-V3-SEGURO.json`
- `MONITORAMENTO-DE-PRECO-V4-SEGURO.json`
- `MONITORAMENTO-DE-PRECO-V5-PRECO-PDP-CONFIRMADO.json`
- `MONITORAMENTO-DE-PRECO-V6-PDP-VARIACOES-CONFIRMADAS.json`
- `MONITORAMENTO-DE-PRECO-V7-MOTIVOS-DE-ATUALIZACAO.json`
- `MONITORAMENTO-DE-PRECO-V8-CUPONS.json`
- `MONITORAMENTO-DE-PRECO-V8.1-CUPONS-AMPLIADOS.json`
- `MONITORAMENTO-DE-PRECO-V8.2-CUPONS-PRECISOS.json`

Também existem README/instruções e scripts geradores. Manter as versões anteriores como ponto de restauração.

### Fluxo lógico

1. Gatilho a cada 3 horas.
2. Busca/verifica cookie.
3. Reseta contadores.
4. Busca ofertas elegíveis no banco.
5. Loop de produtos.
6. Requisita página pública do produto.
7. Processa resposta.
8. Roteia para:
   - atualizar preço;
   - sem alteração;
   - indisponível;
   - falha temporária/revisão.
9. Pausa entre produtos.
10. Relatório final.

### Critérios de segurança

- Atualizar preço apenas se título e preço forem confirmados no bloco principal do PDP.
- Fonte preferida observada:

```
pdp_meta_itemprop_price+aria_label_confirmados
```

- Preço não encontrado **não significa** automaticamente indisponibilidade.
- Diferença extrema (por exemplo, superior a 3x), divergência de título ou página suspeita devem ir para revisão manual.
- Apenas sinais fortes/específicos de indisponibilidade devem levar a marcar uma oferta como indisponível.
- Páginas de variação ou páginas de “ver opções de compra” podem não trazer preço direto; tratá-las com cuidado.

### Histórico e motivos

O monitor registra preço/histórico e motivos como:

- preço atual alterado;
- preço de referência alterado;
- preço de referência removido;
- desconto recalculado;
- cupom confirmado;
- sem alteração após confirmação.

Exemplo de `change_reason`:

```
Preço atual: R$ 132,00 → R$ 132,99 ·
Preço de referência: R$ 292,00 → R$ 292,30 ·
Desconto recalculado: 55% → 54%
```

### Estado atual do monitor

A versão mais avançada pretendida é a **V8.2 — cupons precisos**.

Ela foi testada de forma controlada em quatro produtos e identificou corretamente exemplos de cupom:

- Vestido: “Preço com cupom: R$ 44,00”.
- Blusa: “Preço com cupom: R$ 54,00 · Condição: seguir a loja”.
- Garrafa térmica: “Cupom: 50% OFF”.
- Tênis Kappa: “Cupom: R$ 12,00 OFF em compras a partir de R$ 240,00”.

Outros formatos possíveis detectáveis:

- “Compre R$ 99 e ganhe 10% OFF”;
- “R$ 6.199 com Cupom”;
- descontos percentuais;
- valor fixo OFF;
- condição de seguir loja;
- mínimo de compra.

**Cupom é informativo.** Ele não deve substituir `current_price`, pois o preço com cupom pode depender de condição, loja, valor mínimo, Pix, quantidade ou outra regra.

### Casos já verificados visualmente

Em testes recentes, os valores detectados bateram com screenshots dos PDPs, por exemplo:

- Fonte Taicon: R$ 169,00;
- Fralda Baby M: R$ 42,99 com referência R$ 50,05;
- Cadeira esteirinha: R$ 99,99 com referência R$ 329,30;
- Tênis Salomon: R$ 698,39 com referência R$ 1.199,99;
- Garrafa térmica: R$ 58,90 com referência R$ 119,90;
- Papel depilatório: R$ 37,10 com referência R$ 95,00;
- Glutamina: R$ 53,99 sem referência;
- Tênis Kappa: R$ 161,49 com referência R$ 169,99.

Ainda é recomendado continuar com grupos pequenos antes de ativar permanentemente todo o catálogo, pois Mercado Livre pode apresentar preço por variação, região, conta, frete, cupom e condições de pagamento.

### Credencial n8n ↔ Supabase

O n8n foi configurado com conexão PostgreSQL via Supabase pooler e testou conexão com sucesso. Configuração segura de referência:

- host: pooler do projeto Supabase;
- banco: `postgres`;
- usuário: `postgres.<project-ref>`;
- senha: senha do banco;
- SSL: habilitado;
- túnel SSH: desligado;
- máximo de conexões: 30 é adequado para alguns fluxos leves.

Não salvar host privado, senha, cookies ou project reference dentro deste documento.

### Observação sobre cookie/config

Workflows mais antigos usam uma tabela/registro como `public.config` com chave `mercadolivre_cookie`. O banco principal do site pode não ter essa tabela com a mesma estrutura. Se for integrar **todos** os fluxos ao banco do site, adaptar/criar essa estrutura de forma controlada; não basta ajustar só o monitor de preço.

---

## 12. Consultas úteis no Supabase

### Verificar oferta específica

```sql
SELECT
  o.id AS offer_id,
  o.external_product_id,
  o.public_url,
  o.current_price,
  o.original_price,
  o.discount_percent,
  o.last_checked_at,
  o.last_check_status,
  o.last_check_error,
  p.title,
  p.coupon_text
FROM public.offers o
JOIN public.products p ON p.id = o.product_id
WHERE o.id = 'COLE_O_ID_AQUI';
```

### Ver histórico de preço e motivo

```sql
SELECT
  ph.recorded_at,
  ph.price,
  ph.original_price,
  ph.source,
  ph.change_reason
FROM public.price_history ph
WHERE ph.offer_id = 'COLE_O_ID_AQUI'
ORDER BY ph.recorded_at DESC;
```

### Ver ofertas com cupom registrado

```sql
SELECT
  p.title,
  p.coupon_text,
  o.current_price,
  o.original_price,
  o.last_checked_at,
  o.last_check_status
FROM public.offers o
JOIN public.products p ON p.id = o.product_id
WHERE NULLIF(TRIM(p.coupon_text), '') IS NOT NULL
ORDER BY o.last_checked_at DESC NULLS LAST;
```

### Teste controlado no monitor

No nó que busca ofertas elegíveis, restringir temporariamente:

```sql
AND o.id IN (
  'UUID_1',
  'UUID_2',
  'UUID_3'
)
```

Executar manualmente, validar relatório final, comparar com página pública aberta e só depois remover a restrição.

---

## 13. Regras de manutenção e segurança

1. Nunca commitar:
   - `.env`;
   - `.ml_tokens.json`;
   - cookies do Mercado Livre;
   - senha do Supabase;
   - chaves service role;
   - tokens OAuth.
2. Antes de qualquer migration, confirmar se ela já foi aplicada.
3. Antes de alterar importação/deduplicação, testar:
   - página inicial;
   - menu de perfil;
   - botão Painel admin;
   - login;
   - importação pequena.
4. Não renomear nós n8n sem atualizar as expressões que dependem do nome.
5. Não considerar “preço não encontrado” como indisponibilidade.
6. Manter cada versão do workflow n8n exportada antes de alterações.
7. Sempre testar monitor em 3–5 ofertas antes de ativar globalmente.
8. Após mudanças relevantes, usar:

```powershell
git status
git add .
git commit -m "descrição objetiva"
git push origin main
```

Revise `git status` antes do `git add .` para não incluir segredos ou arquivos temporários.

---

## 14. Estado conhecido do Git

Últimos commits relevantes vistos:

- `c3eb7c0` — importar ofertas e consolidar catálogo;
- `2746111` — otimização de carregamento e estabilidade;
- `8868686` — captura e criação de cards;
- `33b2cb6` — captura afiliada e gestão de ofertas;
- `c86b813` — painel, lojas e recursos.

Na última inspeção, havia mudanças locais ainda não necessariamente enviadas:

- `admin-import.html`
- `admin-import.js`
- `server.mjs`
- `supabase-store.mjs`
- `automation/`
- `database/migrations/SUPABASE-PRECO-HISTORICO-MOTIVO.sql`
- `docs/guides/MODELO-PLANILHA-MERCADO-LIVRE-V3.md`

Antes de um novo commit, confirmar o status real com `git status`.

---

## 15. Próximos passos recomendados

Prioridade alta:

1. Confirmar que o fluxo V8.2 realmente persiste `products.coupon_text` no banco e que o site exibe o cupom de forma informativa no card/detalhe.
2. Rodar mais 2–3 testes controlados de monitoramento com 4–10 produtos cada.
3. Depois de validar preços/cupom e indisponibilidade, ativar o monitor de 3 em 3 horas com limite inicial pequeno.
4. Verificar se as migrations de categoria estão aplicadas para impedir falhas de importação.
5. Validar importação v3 com poucos itens antes de importar lotes grandes.

Prioridade média:

1. Integrar plenamente os workflows 1 e 2 do n8n ao banco central, incluindo o armazenamento de cookie/config de forma segura.
2. Melhorar importação para consolidar duplicatas complementares sem perder os melhores campos.
3. Criar uma visão de auditoria de importações e monitoramentos no admin.
4. Configurar backup/exportação regular das planilhas e fluxos n8n.
5. Fazer publicação de teste estável e só depois pensar em domínio.

Futuro:

1. Notificações reais por e-mail quando alertas de preço forem atingidos; WhatsApp ficou apenas preparado conceitualmente e não foi implementado.
2. Integrações oficiais Shopee/Amazon/AliExpress.
3. Extensão 2.0 após captura Shopee estável.
4. Monitoramento/cupom em escala somente com limites e observabilidade.

---

## 16. Situação final deste handoff

O site possui uma base funcional e ampla: catálogo, cards, autenticação, perfil, favoritos, alertas, reportes, contato, administração, analytics, importação, histórico de preços e integração Supabase.

O fluxo de captura/planilha/n8n está funcional, mas depende de cookie/sessão Mercado Livre e deve ser mantido com testes controlados. O monitor de preço evoluiu até V8.2, incluindo leitura informativa de cupons, e vem mostrando boa precisão nos exemplos testados. Ainda não é recomendado tratar qualquer leitura automática como verdade absoluta sem as proteções já criadas para divergência, variação e revisão manual.

Use este arquivo como contexto inicial no próximo chat e peça primeiro uma inspeção do estado real do repositório e do n8n antes de alterar algo grande.

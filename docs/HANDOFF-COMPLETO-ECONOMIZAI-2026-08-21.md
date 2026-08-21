# Handoff completo — Economizaí

**Atualizado em:** 21/08/2026
**Projeto:** Economizaí — site de ofertas, automações Mercado Livre e publicação em canal do WhatsApp
**Repositório:** https://github.com/Nycolas-Rafaell/economizai-site
**Pasta local:** `C:\Users\Rafae\Documents\Codex\2026-08-12\te\outputs\economizai-site`

> Documento consolidado a partir dos handoffs de 20/08/2026 e do trabalho realizado em 21/08/2026. Não contém senhas, cookies, tokens, chaves SSH ou o conteúdo de arquivos `.env`.

## 1. Estado geral

O Economizaí possui quatro partes integradas:

1. site e painel administrativo em Node.js, HTML, CSS e JavaScript;
2. Supabase como banco principal e autenticação;
3. n8n local para captura, monitoramento e publicação;
4. WuzAPI em uma VPS Oracle para publicar ofertas em canal do WhatsApp.

O site aceita a planilha Mercado Livre v3, consolida duplicados, cria ou atualiza produtos e possui paginação no painel de cards. Os workflows finais desta etapa estão em `automation/n8n/`.

## 2. Site

### Execução local

```powershell
cd C:\Users\Rafae\Documents\Codex\2026-08-12\te\outputs\economizai-site
npm install
npm run dev
```

Abrir `http://localhost:3000`.

### Componentes principais

- `server.mjs`: servidor, APIs e importação;
- `supabase-store.mjs`: persistência no Supabase;
- `admin-import.html` / `admin-import.js`: importação de planilha;
- `admin-cards.html` / `admin-cards.js`: cards administrativos paginados;
- `site.js`: ofertas públicas;
- `produto-dinamico.html`: página do produto;
- `category-catalog.js`: catálogo de categorias;
- `database/migrations/`: mudanças versionadas do banco.

### Funcionalidades preservadas dos handoffs anteriores

- cards públicos e administrativos consistentes;
- preços com centavos, desconto, nota, vendas e cupom informativo;
- filtros por categoria, loja, preço e avaliação;
- favoritos, alertas, histórico de preço e vistos recentemente;
- login e perfis via Supabase Auth;
- painel de usuários, reportes, contatos e analytics;
- produtos indisponíveis ocultos no público, mas preservados no admin;
- importação em lotes de até 250 linhas;
- deduplicação por ID externo e URL normalizada;
- catálogo preparado para outras lojas, embora o foco atual seja Mercado Livre.

### Planilha Mercado Livre v3

O importador reconhece os campos atuais, inclusive:

`Grupo`, `idProduto`, `nomeProduto`, `imagemProduto`, `precoAtual`, `precoOriginal`, `desconto`, `precoFormatado`, `urlOriginal`, `urlAfiliado`, `status`, `success`, `data`, `notaNumero`, `quantidadeVendidasNumero`, `cupomTipo`, `cupomValor`, `nota`, `quantidadeVendidas` e `cupom`.

O status usado pelo publicador é:

- `PRONTO`: disponível para envio;
- `ENVIADO`: já publicado;
- `success = TRUE`: publicação confirmada.

## 3. Banco Supabase

O banco central mantém produtos, ofertas, categorias, usuários, favoritos, alertas, histórico de preços, reportes, contatos e analytics.

Regras importantes:

- texto do cupom pertence a `products.coupon_text`;
- não usar `offers.coupon_text`;
- não executar todas as migrations cegamente;
- conferir a estrutura existente antes de aplicar uma migration;
- categoria ausente deve ser criada no catálogo/banco, não ignorada no importador.

Nunca versionar `.env`, `.ml_tokens.json`, senha do banco, cookie do Mercado Livre ou chaves de API.

## 4. Captura de produtos — V2.2.1

Arquivo:

`automation/n8n/captura-produtos/PROCURAR-PRODUTOS-MERCADO-LIVRE-V2.2.1-EMBARALHAMENTO-GLOBAL.json`

Melhorias consolidadas:

- parser compatível com cards `poly-card` e carrossel dinâmico;
- captura de ID pelo anúncio (`wid`) quando necessário;
- imagens Mercado Livre com variante de maior resolução;
- nota e quantidade vendida normalizadas;
- preços e centavos preservados;
- cupons/rebates capturados separadamente;
- categoria carregada junto ao produto correto;
- acumulação de todas as categorias antes do embaralhamento;
- embaralhamento global único antes de gravar no Google Sheets;
- restauração dos itens após o nó que limpa a planilha.

Não renomear nós utilizados em expressões como `$('NOME DO NÓ')` sem atualizar todas as referências.

## 5. Monitoramento de preço — V8.2.1

Arquivo atual:

`automation/n8n/monitoramento-preco/MONITORAMENTO-DE-PRECO-V8.2.1-CUPONS-COM-CENTAVOS.json`

Essa versão sucede a V8.2 e mantém:

- confirmação do preço principal no PDP;
- preço de referência e desconto;
- centavos preservados;
- cupom informativo sem substituir o preço principal;
- histórico e motivo da alteração;
- revisão manual para divergências;
- falha temporária quando não há evidência de indisponibilidade;
- relatório final da execução.

Formatos de cupom já tratados incluem preço com cupom, percentual, valor fixo, mínimo de compra e condição de seguir a loja.

O workflow deve ser testado com poucos IDs antes de liberar o catálogo completo. Para execução horária, use um gatilho Schedule/Cron com `0 * * * *`. Para teste a cada dois minutos, `*/2 * * * *`.

## 6. Publicação no canal do WhatsApp — V4.1

Arquivo seguro para importação:

`automation/n8n/envio-canal-whatsapp/ENVIAR-PRODUTOS-PARA-O-CANAL-V4.1-SEGURO.json`

Fluxo final:

1. gatilho de entrada;
2. lê somente a primeira linha com `status = PRONTO`;
3. mapeia os dados do produto;
4. rejeita produto sem nome, preço, link ou imagem;
5. cria uma legenda chamativa em Code, sem IA;
6. carrega a imagem de maior resolução;
7. aplica borda/edição opcional;
8. comprime e converte para Base64;
9. envia pelo WuzAPI ao JID `@newsletter`;
10. após resposta `success = true`, atualiza a mesma linha para `ENVIADO` e `TRUE`.

A seleção usa `returnFirstMatch`, evitando processar toda a planilha. A atualização deve usar `row_number` ou `idProduto` válido como coluna de correspondência. O filtro inicial em `PRONTO` impede reenvio de itens marcados `ENVIADO`.

Após importar a versão segura:

- selecione a credencial do Google Sheets;
- selecione a planilha e a aba `Produtos`;
- selecione a credencial Header Auth com cabeçalho `token` e o token da instância WuzAPI;
- substitua `SEU_IP_TAILSCALE_WUZAPI`;
- substitua `SEU_ID_DO_CANAL@newsletter`;
- mantenha o workflow separado dos fluxos que o chamam;
- adicione um Schedule Trigger se desejar execução autônoma.

O export versionado não contém tokens nem identificadores privados reais.

## 7. WuzAPI e infraestrutura

### Arquitetura atual

- VPS Oracle Cloud Always Free;
- Ubuntu 24.04;
- shape `VM.Standard.E2.1.Micro`;
- WuzAPI compilado em `/home/ubuntu/wuzapi`;
- serviço systemd `wuzapi.service` habilitado;
- banco SQLite do WuzAPI;
- swap de 2 GB;
- Tailscale entre a VPS e o computador Windows;
- n8n permanece local no computador.

Comandos úteis na VPS:

```bash
sudo systemctl status wuzapi --no-pager
sudo systemctl restart wuzapi
sudo journalctl -u wuzapi -n 50 --no-pager
tailscale status
tailscale ip -4
```

O guia operacional está em `docs/guides/GUIA-ACESSO-WUZAPI-ECONOMIZAI.txt`.

### Correção de imagem borrada em canais

Sintoma: a imagem estava nítida dentro do n8n, mas chegava ao canal como uma miniatura 72×72 ampliada.

Causa: o handler `SendImage` usava `Upload` e enviava sem `MediaHandle`, mesmo quando o destino era um newsletter/channel.

Correção aplicada em `handlers.go`:

```go
if recipient.Server == types.NewsletterServer {
	uploaded, err = clientManager.GetWhatsmeowClient(txtid).UploadNewsletter(context.Background(), filedata, whatsmeow.MediaImage)
} else {
	uploaded, err = clientManager.GetWhatsmeowClient(txtid).Upload(context.Background(), filedata, whatsmeow.MediaImage)
}
```

E no envio:

```go
sendExtra := whatsmeow.SendRequestExtra{ID: msgid}
if recipient.Server == types.NewsletterServer {
	sendExtra.MediaHandle = uploaded.Handle
}
resp, err = clientManager.GetWhatsmeowClient(txtid).SendMessage(context.Background(), recipient, msg, sendExtra)
```

Depois foi executado:

```bash
gofmt -w handlers.go
go build -o wuzapi.new .
```

O novo binário foi instalado e o serviço iniciou como `active (running)`. Um envio real confirmou imagem nítida no canal.

Backups existentes na VPS:

- `handlers.go.backup-antes-newsletter`;
- `wuzapi.backup-antes-newsletter`;
- `wuzapi.old-working`.

Uma atualização futura do WuzAPI pode sobrescrever o patch. Sempre verificar `UploadNewsletter` e `MediaHandle` após atualizar/recompilar.

### Restauração do binário anterior

Se uma versão futura falhar:

```bash
cd ~/wuzapi
sudo systemctl stop wuzapi
mv wuzapi wuzapi.com-problema
cp wuzapi.old-working wuzapi
chmod +x wuzapi
sudo systemctl start wuzapi
sudo systemctl status wuzapi --no-pager
```

## 8. Segurança

- WuzAPI não está exposto diretamente para a internet; o acesso operacional é pelo Tailscale;
- token administrativo só é usado no WuzAPI Manager;
- n8n usa o token específico da instância, nunca o token administrativo;
- chave SSH privada permanece apenas no computador autorizado;
- não publicar IP público, IP Tailscale, JID real do canal, tokens, cookies ou `.env`;
- exports do n8n devem ser inspecionados antes de cada commit.

## 9. Testes confirmados

- WuzAPI systemd ativo e reconectado ao WhatsApp;
- listagem de newsletters funcionando;
- publicação de mensagem simples funcionando;
- publicação de imagem e legenda no canal funcionando;
- imagem nítida após `UploadNewsletter` + `MediaHandle`;
- produto atualizado para `ENVIADO`/`TRUE` após sucesso;
- nova execução ignora item já enviado quando o filtro está em `PRONTO`;
- fluxo sem dependência do Gemini;
- imagem Mercado Livre `-B.webp` usada no lugar da miniatura `-E.webp` quando disponível.

## 10. Próximos passos

1. adicionar Schedule Trigger ao publicador e escolher intervalo seguro;
2. manter somente uma execução concorrente do publicador;
3. criar tratamento de erro para não marcar `ENVIADO` quando a API falhar;
4. acompanhar logs do WuzAPI e espaço em disco;
5. testar importação com 2–5 linhas antes de lotes grandes;
6. testar monitor V8.2.1 com poucos IDs antes de ativar geral;
7. documentar qualquer nova alteração de schema ou nome de nó;
8. reaplicar/verificar o patch de newsletter em futuras atualizações do WuzAPI.

## 11. Checklist para retomada

1. ler este documento inteiro;
2. executar `git status` antes de alterar arquivos;
3. preservar mudanças locais e backups;
4. não solicitar nem imprimir segredos;
5. usar os workflows indicados neste handoff como versões atuais;
6. importar workflows inicialmente desativados;
7. selecionar credenciais manualmente no n8n;
8. testar com um produto `PRONTO`;
9. confirmar publicação e atualização para `ENVIADO`;
10. somente depois ativar o agendamento.

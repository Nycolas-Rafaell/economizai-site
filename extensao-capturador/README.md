# Capturar para Economizaí

Extensão local gratuita para capturar os dados visíveis de páginas do Mercado Livre e abrir um rascunho no painel do Economizaí. Quando o Mercado Livre exibir o aviso **"Resumo de opiniões gerado por IA"**, a extensão transfere somente o texto desse resumo e a quantidade de comentários para o formulário. Ela também resume localmente a seção visível de descrição do produto.

## Instalação de teste no Chrome

1. Abra `chrome://extensions`.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação**.
4. Selecione esta pasta: `extensao-capturador`.
5. Fixe a extensão na barra do Chrome.

## Uso

1. Deixe o Economizaí rodando em `http://localhost:3000` e entre como administrador.
2. Abra uma página de produto do Mercado Livre.
3. Clique no ícone da extensão e pressione **Gerar link e adicionar produto**. No mesmo clique ela abre o compartilhamento oficial da Barra de Afiliados, localiza o link `meli.la` e captura os dados visíveis do produto.
4. Se o Mercado Livre não mostrar o link em alguns segundos, gere-o na janela oficial e use o campo manual como alternativa.
5. O Economizaí cria o card automaticamente como **Aguardando publicação**. Você pode revisar, editar e publicar depois em **Cards cadastrados**.

## Captura automática (opcional)

Ative **Captura automática** no popup da extensão apenas quando quiser cadastrar vários produtos. A escolha fica salva até você desligá-la. Ao abrir uma página de produto do Mercado Livre, a extensão tenta gerar o link de afiliado, captura os dados e cria o card como **Aguardando publicação**. Cada URL é enviada uma única vez, evitando duplicação durante a navegação.

## Limites da primeira versão

- Compatível com Mercado Livre.
- O teste assistido usa apenas a interface visível da Barra de Afiliados: não acessa cookies, credenciais, CAPTCHA nem APIs privadas. A geração continua dependente de você estar logado e de o Mercado Livre exibir a janela oficial.
- Lê somente dados já visíveis na página aberta; não consulta API, não faz varredura em segundo plano e não publica automaticamente.
- Os seletores podem precisar de ajustes se o Mercado Livre mudar o layout. Sempre revise preço, disponibilidade e link antes de salvar.

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
3. Clique no ícone da extensão e use **Gerar link na Barra de Afiliados**. Ela abre o compartilhamento oficial e tenta localizar o link `meli.la` que a própria página exibe.
4. Se o Mercado Livre ainda não tiver mostrado o link, gere-o na janela oficial, abra a extensão novamente e repita o botão. Você também pode colar o link manualmente no campo de reserva.
5. Pressione **Capturar e abrir rascunho**. Revise os campos e salve. A oferta entra como **Aguardando publicação** por segurança.

## Limites da primeira versão

- Compatível com Mercado Livre.
- O teste assistido usa apenas a interface visível da Barra de Afiliados: não acessa cookies, credenciais, CAPTCHA nem APIs privadas. A geração continua dependente de você estar logado e de o Mercado Livre exibir a janela oficial.
- Lê somente dados já visíveis na página aberta; não consulta API, não faz varredura em segundo plano e não publica automaticamente.
- Os seletores podem precisar de ajustes se o Mercado Livre mudar o layout. Sempre revise preço, disponibilidade e link antes de salvar.

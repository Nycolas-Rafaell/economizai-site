# Captura de produtos do Mercado Livre

Versão recomendada: `PROCURAR-PRODUTOS-MERCADO-LIVRE-V2.2.1-EMBARALHAMENTO-GLOBAL.json`.

Evolução preservada:

- V2: parser ampliado para os cards atuais do Mercado Livre;
- V2.1: IDs mais seguros usando dados do anúncio;
- V2.2: coleta global antes do embaralhamento;
- V2.2.1: ajustes finais de compatibilidade e saída da planilha v3.

A V2.2.1 acumula produtos de todas as categorias, embaralha uma única vez e somente depois grava no Google Sheets. Isso evita blocos consecutivos da mesma categoria.

Os scripts de geração e validação ficam em `tools/`. Os exports não contêm o valor do cookie; eles apenas consultam a configuração definida no ambiente do n8n.

Importe inicialmente com o workflow desativado, selecione as credenciais locais e teste com poucas categorias.

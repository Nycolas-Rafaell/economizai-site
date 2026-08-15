# Estrutura do projeto Economizaí

## Raiz

- `server.mjs` e `supabase-store.mjs`: servidor local, API e integração com Supabase.
- `package.json`: comandos e dependências do projeto.
- `*.html`, `*.js`, `*.css`: páginas e recursos públicos do site. Permanecem na raiz para manter URLs simples, como `/index.html` e `/produto-dinamico.html`.
- `.env`: credenciais locais. Não deve ser enviado ao GitHub.
- `.env.example`: modelo seguro das variáveis necessárias.

## Pastas

- `assets/avatars/`: avatares padrão de usuários.
- `assets/products/`: imagens locais dos produtos e ofertas.
- `data/`: dados locais de apoio e fallback de ofertas.
- `database/migrations/`: scripts SQL que devem ser executados no SQL Editor do Supabase.
- `docs/guides/`: guias de configuração e uso local.
- `docs/handoffs/`: histórico de handoffs do desenvolvimento.
- `node_modules/`: dependências instaladas pelo npm; não editar manualmente.

## Convenções para novos arquivos

- Imagens de produtos: `assets/products/`.
- Avatares e imagens institucionais: `assets/avatars/` ou uma subpasta adequada de `assets/`.
- Novas migrações do Supabase: `database/migrations/`.
- Documentação e guias: `docs/`.
- Páginas, scripts e estilos que precisam ser carregados diretamente no navegador permanecem na raiz até uma futura etapa de build/empacotamento.

As antigas URLs das três imagens iniciais continuam sendo atendidas pelo servidor, evitando que cards já salvos no banco quebrem após a organização.

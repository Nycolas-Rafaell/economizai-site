const fs = require('fs');

const workflow = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const node of workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.code')) {
  new Function(node.parameters.jsCode);
}

const code = workflow.nodes.find((node) => node.name === 'PAGINA COM POLYCARD').parameters.jsCode;
const execute = new Function('$input', '$', code);
const group = () => ({ item: { json: { grupoOferta: 'Teste' } } });
const card = (url) => `<div class="andes-card poly-card">
  <img class="poly-component__picture" src="https://img.test/x.webp">
  <a href="${url.replace(/&/g, '&amp;')}" class="poly-component__title">Produto de teste</a>
  <div class="poly-price__current">
    <span class="poly-price__amount" data-andes-money-amount="true" aria-label="199 reais com 90 centavos">
      <span data-andes-money-amount-fraction="true">199</span>
      <span data-andes-money-amount-cents="true">90</span>
    </span>
  </div>
</div>`;
const run = (url) => execute({ all: () => [{ json: { data: card(url) } }] }, group)[0].json;

const tests = [
  run('https://www.mercadolivre.com.br/x/p/MLB58927765#x=1&wid=MLB5769944586'),
  run('https://www.mercadolivre.com.br/x/up/MLBU767944712'),
  run('https://www.mercadolivre.com.br/x/p/MLB27309563'),
  run('https://produto.mercadolivre.com.br/MLB-5275567226-x-_JM'),
];

console.log(JSON.stringify(tests.map((item) => ({
  id: item.idProduto,
  url: item.urlOriginal,
  parser: item.parserVersion,
})), null, 2));

const fs = require('fs');

const workflow = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const codeNodes = workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.code');
for (const node of codeNodes) new Function('$input', '$getWorkflowStaticData', node.parameters.jsCode);

const staticData = {};
const staticFn = () => staticData;
const execute = (name, items) => {
  const code = workflow.nodes.find((node) => node.name === name).parameters.jsCode;
  return new Function('$input', '$getWorkflowStaticData', code)(
    { all: () => items.map((json) => ({ json })) },
    staticFn,
  );
};

execute('RESET COLETOR GLOBAL', [{ Grupo: 'A' }, { Grupo: 'B' }]);
execute('COLETA PRODUTOS GLOBAL', [
  { idProduto: 'MLB1', Grupo: 'A' },
  { idProduto: 'MLB2', Grupo: 'A' },
]);
execute('COLETA PRODUTOS GLOBAL', [
  { idProduto: 'MLB3', Grupo: 'B' },
  { idProduto: 'MLB2', Grupo: 'B' },
]);
const emitted = execute('EMBARALHA TODOS OS PRODUTOS', []).map((item) => item.json);

console.log(JSON.stringify({
  emitted,
  uniqueCount: emitted.length,
  categories: [...new Set(emitted.map((item) => item.Grupo))].sort(),
  totalBefore: staticData.totalAntesDeduplicacao,
  totalAfter: staticData.totalDepoisDeduplicacao,
}, null, 2));

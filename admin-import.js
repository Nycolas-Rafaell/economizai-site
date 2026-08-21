let validRows = [];
let importResults = new Map();
const fileInput = document.getElementById('csvFile');
const importButton = document.getElementById('importButton');
const status = document.getElementById('status');
const preview = document.getElementById('preview');
const count = document.getElementById('count');

function parseCsv(text) {
  const rows = []; let row = []; let value = ''; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]; const next = text[index + 1];
    if (char === '"' && quoted && next === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && (char === ',' || char === ';')) { row.push(value.trim()); value = ''; }
    else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value.trim()); if (row.some(Boolean)) rows.push(row); row = []; value = '';
    } else value += char;
  }
  row.push(value.trim()); if (row.some(Boolean)) rows.push(row);
  const headers = (rows.shift() || []).map((header) => header.replace(/^\uFEFF/, '').trim());
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

function value(row, ...keys) {
  for (const key of keys) {
    const candidate = row[key];
    if (candidate != null && String(candidate).trim() !== '') return String(candidate).trim();
  }
  return '';
}

function couponText(row) {
  const direct = value(row, 'cupom', 'coupon');
  if (direct) return direct;
  const couponValue = value(row, 'cupomValor');
  const couponType = value(row, 'cupomTipo').toLowerCase();
  if (!couponValue) return '';
  if (['percentual', 'percentage', 'percentual_off'].includes(couponType)) return `${couponValue}% OFF com Cupom`;
  if (['valor', 'valor-fixo', 'fixed', 'valor_off'].includes(couponType)) return `R$ ${couponValue.replace('.', ',')} OFF com Cupom`;
  if (couponType === 'preco_com_cupom') return `R$ ${couponValue.replace('.', ',')} com Cupom`;
  return `${couponValue} com Cupom`;
}

function soldText(row) {
  const direct = value(row, 'quantidadeVendidas', 'quantidade_vendidas', 'quantitySold');
  if (direct) return direct;
  const numeric = Number(value(row, 'quantidadeVendidasNumero'));
  return Number.isFinite(numeric) && numeric > 0 ? `${Math.trunc(numeric).toLocaleString('pt-BR')} vendidos` : '';
}

function normalizeOfficialRow(row) {
  return {
    ...row,
    nome: value(row, 'nomeProduto', 'nome', 'title'),
    imagem: value(row, 'imagemProduto', 'imagem', 'image'),
    url_original: value(row, 'urlOriginal', 'url_original', 'publicUrl'),
    link_afiliado: value(row, 'urlAfiliado', 'link_afiliado', 'affiliateUrl'),
    preco_atual: value(row, 'precoAtual', 'preco_atual', 'currentPrice'),
    preco_original: value(row, 'precoOriginal', 'preco_original', 'originalPrice'),
    categoria: value(row, 'Grupo', 'grupo', 'categoria', 'category') || 'outros',
    nota: value(row, 'notaNumero', 'nota', 'rating'),
    quantidade_vendidas: soldText(row),
    cupom: couponText(row),
    id_produto: value(row, 'idProduto', 'id_produto'),
    status: value(row, 'status').toLowerCase(),
  };
}

function setStatus(message, type = '') { status.textContent = message; status.className = `import-status ${type}`; }
function safe(value) { const span = document.createElement('span'); span.textContent = String(value || ''); return span.innerHTML; }
function isImportableStatus(value) { return ['pronto', 'enviado'].includes(String(value || '').trim().toLowerCase()); }

function renderPreview() {
  preview.hidden = !validRows.length;
  if (!validRows.length) return;
  preview.innerHTML = `<table><thead><tr><th>Produto</th><th>Preço</th><th>Categoria</th><th>Link de afiliado</th><th>Resultado</th></tr></thead><tbody>${validRows.map((row, index) => {
    const result = importResults.get(index + 2);
    const state = result?.status || 'waiting';
    const label = state === 'created' ? 'Criado' : state === 'merged' ? 'Unificado' : state === 'rejected' ? 'Não criado' : 'Aguardando';
    const reason = result?.message ? `Motivo: ${result.message}` : '';
    const tooltip = reason ? ` title="${safe(reason)}" aria-label="${safe(reason)}" tabindex="0"` : '';
    return `<tr class="import-row-${state}"><td>${safe(row.nome)}</td><td>R$ ${safe(row.preco_atual)}</td><td>${safe(row.categoria || 'outros')}</td><td>${safe(row.link_afiliado)}</td><td><span class="import-result ${state}"${tooltip}>${label}</span></td></tr>`;
  }).join('')}</tbody></table>`;
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0]; validRows = []; importResults = new Map(); importButton.disabled = true; preview.hidden = true;
  if (!file) return setStatus('Escolha o arquivo CSV para validar os produtos.');
  const rows = parseCsv(await file.text()).map(normalizeOfficialRow);
  validRows = rows.filter((row) => isImportableStatus(row.status) && /^https?:\/\//i.test(row.link_afiliado));
  count.textContent = `${validRows.length} linha(s) válida(s) para importar`;
  if (!validRows.length) return setStatus('Nenhuma linha válida foi encontrada. O CSV precisa ter status “PRONTO” ou “ENVIADO” e link_afiliado preenchido.', 'error');
  importButton.disabled = false; setStatus('Revise a prévia e confirme a importação. Linhas do mesmo anúncio serão unificadas antes de criar o card.'); renderPreview();
});

importButton.addEventListener('click', async () => {
  importButton.disabled = true; setStatus('Criando cards no banco de dados…');
  try {
    const response = await fetch('/api/admin/importar-planilha', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: validRows, publishNow: document.getElementById('publishNow').checked }) });
    const result = await response.json();
    if (!response.ok && response.status !== 207) throw new Error(result.message || 'Não foi possível importar os cards.');
    importResults = new Map((Array.isArray(result.results) ? result.results : []).map((item) => [Number(item.index), item]));
    renderPreview();
    const rejectedCount = Array.isArray(result.rejected) ? result.rejected.length : 0;
    const createdCount = Number(result.imported || 0);
    const mergedCount = [...importResults.values()].filter((item) => item.status === 'merged').length;
    const successCount = createdCount + mergedCount;
    const parts = [];
    if (createdCount) parts.push(`${createdCount} card(s) criado(s)`);
    if (mergedCount) parts.push(`${mergedCount} card(s) unificado(s)`);
    if (rejectedCount) parts.push(`${rejectedCount} não criado(s)`);
    const summary = parts.length
      ? `${parts.join('. ')}. Consulte a coluna Resultado na lista.`
      : 'Nenhum card foi processado. Consulte a coluna Resultado na lista.';
    setStatus(summary, successCount ? 'success' : 'error');
  } catch (error) { setStatus(error.message || 'Não foi possível importar os cards.', 'error'); }
  finally { importButton.disabled = false; }
});

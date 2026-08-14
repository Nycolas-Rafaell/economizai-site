(() => {
  const ui = {}; let stack;
  function root() { if (!stack) { stack = document.createElement('div'); stack.className = 'eco-toast-stack'; document.body.append(stack); } return stack; }
  ui.toast = (message, type = 'info') => { const item = document.createElement('div'); item.className = `eco-toast ${type}`; item.textContent = message; root().append(item); setTimeout(() => item.remove(), 4200); };
  ui.ask = ({ title, text, label, value = '', type = 'text', options = [] }) => new Promise((resolve) => {
    const backdrop = document.createElement('div'); backdrop.className = 'eco-modal-backdrop';
    const modal = document.createElement('section'); modal.className = 'eco-modal';
    const heading = document.createElement('h2'); heading.textContent = title;
    const description = document.createElement('p'); description.textContent = text;
    const fieldLabel = document.createElement('label'); fieldLabel.textContent = label;
    const field = type === 'select' ? document.createElement('select') : type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
    if (type === 'select') options.forEach((option) => { const item = document.createElement('option'); item.value = option.value; item.textContent = option.label; field.append(item); });
    else { if (type !== 'textarea') field.type = type; field.value = value; field.inputMode = type === 'number' ? 'decimal' : 'text'; if (type === 'textarea') field.rows = 4; }
    const actions = document.createElement('div'); actions.className = 'eco-modal-actions';
    const cancel = document.createElement('button'); cancel.textContent = 'Cancelar';
    const confirm = document.createElement('button'); confirm.className = 'confirm'; confirm.textContent = 'Confirmar';
    const close = (answer) => { backdrop.remove(); resolve(answer); };
    cancel.onclick = () => close(null); confirm.onclick = () => close(field.value);
    backdrop.onclick = (event) => { if (event.target === backdrop) close(null); };
    field.addEventListener('keydown', (event) => { if (event.key === 'Enter') confirm.click(); if (event.key === 'Escape') cancel.click(); });
    actions.append(cancel, confirm); modal.append(heading, description, fieldLabel, field, actions); backdrop.append(modal); document.body.append(backdrop); setTimeout(() => field.focus(), 0);
  });
  window.EconomizaiUI = ui;

  document.addEventListener('click', async (event) => {
    const button = event.target.closest?.('#alertButton,#reportButton');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const id = new URLSearchParams(location.search).get('id'); if (!id) return;
    const status = document.getElementById('shareStatus');
    if (button.id === 'alertButton') {
      const price = String(document.getElementById('price')?.textContent || '').replace(/[^\d,.-]/g, '').replace(',', '.');
      const target = await ui.ask({ title: 'Alerta de preço', text: 'Quando a oferta atingir este valor, ela será destacada na sua área de alertas.', label: 'Preço desejado (R$)', value: price, type: 'number' });
      if (target === null) return;
      const response = await fetch(`/api/alerts/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetPrice: target }) });
      const result = await response.json().catch(() => ({})); if (status) status.textContent = result.message || '';
      ui.toast(response.ok ? 'Alerta criado com sucesso.' : 'Não foi possível criar o alerta.', response.ok ? 'success' : 'error'); return;
    }
    const type = await ui.ask({ title: 'Reportar oferta', text: 'Seu aviso ajuda a manter as ofertas corretas para toda a comunidade.', label: 'Qual é o problema?', type: 'select', options: [{ value: 'price_changed', label: 'O preço mudou' }, { value: 'unavailable', label: 'Produto indisponível' }, { value: 'broken_link', label: 'Link não funciona' }, { value: 'other', label: 'Outro problema' }] });
    if (type === null) return;
    let message = '';
    if (type === 'other') {
      message = await ui.ask({ title: 'Descreva o problema', text: 'Conte para nós o que aconteceu com esta oferta.', label: 'Qual é o problema?', type: 'textarea' });
      if (message === null) return;
      if (!message.trim()) { ui.toast('Descreva o problema antes de enviar o reporte.', 'error'); return; }
    }
    const response = await fetch(`/api/reports/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, message }) });
    const result = await response.json().catch(() => ({})); if (status) status.textContent = result.message || '';
    ui.toast(response.ok ? 'Obrigado pelo aviso.' : 'Não foi possível enviar o aviso.', response.ok ? 'success' : 'error');
  }, true);
})();

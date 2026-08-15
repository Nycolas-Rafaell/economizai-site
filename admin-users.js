const usersContainer = document.getElementById('users');
const usersSearch = document.getElementById('search');
const usersStatus = document.getElementById('status');
const usersCounter = document.getElementById('usersCounter');
let users = [];

const escapeHtml = (value) => String(value || '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
const formatDate = (value, withTime = false) => value ? new Intl.DateTimeFormat('pt-BR', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(value)) : 'data não informada';
const accountLabels = { active: 'Ativa', suspended: 'Suspensa', banned: 'Banida' };
const moderationLabels = { active: 'Reativar conta', suspend_24h: 'Suspender por 24 horas', suspend_7d: 'Suspender por 7 dias', suspend_30d: 'Suspender por 30 dias', ban: 'Banir permanentemente', delete: 'Excluir conta definitivamente' };

function avatarFor(user) { return user.avatarUrl || `assets/avatars/${user.avatarId || 'avatar-1'}.png`; }
function visibleUsers() {
  const term = usersSearch.value.trim().toLocaleLowerCase('pt-BR');
  return users.filter((user) => !term || `${user.name} ${user.displayName} ${user.email}`.toLocaleLowerCase('pt-BR').includes(term));
}
function replaceUser(nextUser) { users = users.map((user) => user.id === nextUser.id ? nextUser : user); }
function setStatus(message, tone = '') { usersStatus.className = `users-status ${tone}`; usersStatus.textContent = message; }

async function saveRole(user, select, button) {
  const nextRole = select.value;
  if (nextRole === user.role) return;
  const roleLabel = nextRole === 'admin' ? 'administrador' : 'usuário comum';
  const confirmation = window.EconomizaiUI?.ask
    ? await window.EconomizaiUI.ask({ title: 'Confirmar permissão', text: `Deseja definir ${user.email} como ${roleLabel}? Esta alteração libera ou remove o acesso ao Painel admin.`, label: 'Digite CONFIRMAR para continuar.' })
    : window.prompt(`Digite CONFIRMAR para definir esta conta como ${roleLabel}.`);
  if (confirmation !== 'CONFIRMAR') { select.value = user.role; return; }
  button.disabled = true; select.disabled = true; setStatus('Salvando permissão…');
  try {
    const response = await fetch(`/api/admin/usuarios/${encodeURIComponent(user.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: nextRole }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Não foi possível atualizar a permissão.');
    replaceUser(payload.user); setStatus(`Permissão atualizada: ${user.email} agora é ${roleLabel}.`, 'success'); render();
  } catch (error) { setStatus(error.message, 'error'); select.value = user.role; }
  finally { button.disabled = false; select.disabled = false; }
}

async function moderateUser(user, select, note, button) {
  const action = select.value;
  const actionLabel = moderationLabels[action];
  const confirmationWord = action === 'delete' ? 'EXCLUIR' : action === 'ban' ? 'BANIR' : 'CONFIRMAR';
  const confirmation = window.EconomizaiUI?.ask
    ? await window.EconomizaiUI.ask({ title: `${actionLabel}?`, text: action === 'delete' ? `A conta ${user.email} e seus dados vinculados serão removidos de forma definitiva.` : `Confirme a ação “${actionLabel}” para ${user.email}.`, label: `Digite ${confirmationWord} para continuar.` })
    : window.prompt(`Digite ${confirmationWord} para ${actionLabel.toLowerCase()}.`);
  if (confirmation !== confirmationWord) return;
  button.disabled = true; select.disabled = true; setStatus('Aplicando ação de segurança…');
  try {
    const response = await fetch(`/api/admin/usuarios/${encodeURIComponent(user.id)}/moderacao`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note: note.value }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Não foi possível atualizar a conta.');
    if (payload.deleted) { users = users.filter((item) => item.id !== user.id); setStatus(`Conta de ${user.email} excluída.`, 'success'); }
    else { replaceUser(payload.user); setStatus(`Ação concluída: ${actionLabel.toLowerCase()}.`, 'success'); }
    render();
  } catch (error) { setStatus(error.message, 'error'); }
  finally { button.disabled = false; select.disabled = false; }
}

function statusDetail(user) {
  if (user.accountStatus === 'suspended') return `Suspensa até ${formatDate(user.suspendedUntil, true)}`;
  if (user.accountStatus === 'banned') return 'Acesso bloqueado permanentemente';
  return 'Acesso liberado';
}

function render() {
  const visible = visibleUsers();
  const summary = { active: users.filter((user) => user.accountStatus === 'active').length, suspended: users.filter((user) => user.accountStatus === 'suspended').length, banned: users.filter((user) => user.accountStatus === 'banned').length };
  usersCounter.textContent = `${users.length} usuários · ${summary.active} ativos · ${summary.suspended} suspensos · ${summary.banned} banidos`;
  usersContainer.replaceChildren(...visible.map((user) => {
    const record = document.createElement('article');
    record.className = `user-record status-${user.accountStatus || 'active'}${user.role === 'admin' ? ' is-admin' : ''}`;
    const confirmation = user.confirmedAt ? '<span class="confirmed">E-mail confirmado</span>' : '<span class="unconfirmed">E-mail pendente</span>';
    const controls = user.primary
      ? '<div class="primary-role">Administrador principal protegido</div>'
      : `<div class="management-controls"><div class="role-control"><label>Permissão<select aria-label="Permissão do usuário"><option value="user">Usuário comum</option><option value="admin">Administrador</option></select></label><button class="role-save" type="button">Salvar permissão</button></div><div class="moderation-control"><label>Status da conta<select aria-label="Ação de moderação"><option value="active">Reativar conta</option><option value="suspend_24h">Suspender por 24 horas</option><option value="suspend_7d">Suspender por 7 dias</option><option value="suspend_30d">Suspender por 30 dias</option><option value="ban">Banir permanentemente</option><option value="delete">Excluir conta definitivamente</option></select></label><label class="moderation-note">Motivo interno (opcional)<input type="text" maxlength="500" placeholder="Ex.: atividade suspeita"></label><button class="moderation-save" type="button">Confirmar ação</button></div></div>`;
    record.innerHTML = `<img class="user-avatar" src="${escapeHtml(avatarFor(user))}" alt=""><div class="user-content"><p class="user-name">${escapeHtml(user.displayName || user.name || 'Usuário sem nome')}</p><p class="user-email">${escapeHtml(user.email)}</p><div class="user-meta"><span>${user.role === 'admin' ? 'Administrador' : 'Usuário comum'}</span>${confirmation}<span class="account-status">${accountLabels[user.accountStatus] || 'Ativa'}</span><span>${statusDetail(user)}</span><span>Criado em ${formatDate(user.createdAt)}</span></div>${user.moderationNote ? `<p class="moderation-history">Última observação: ${escapeHtml(user.moderationNote)}</p>` : ''}</div>${controls}`;
    const image = record.querySelector('img'); image.addEventListener('error', () => { image.src = 'assets/avatars/avatar-1.png'; }, { once: true });
    const roleSelect = record.querySelector('.role-control select');
    if (roleSelect) {
      roleSelect.value = user.role;
      record.querySelector('.role-save').addEventListener('click', () => saveRole(user, roleSelect, record.querySelector('.role-save')));
      const moderationSelect = record.querySelector('.moderation-control select');
      moderationSelect.value = user.accountStatus === 'active' ? 'suspend_7d' : 'active';
      record.querySelector('.moderation-save').addEventListener('click', () => moderateUser(user, moderationSelect, record.querySelector('.moderation-note input'), record.querySelector('.moderation-save')));
    }
    return record;
  }));
  if (!visible.length) usersContainer.innerHTML = '<p class="users-empty">Nenhum usuário encontrado.</p>';
}

async function loadUsers() {
  try {
    const response = await fetch('/api/admin/usuarios', { cache: 'no-store' }); const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Não foi possível carregar os usuários.');
    users = Array.isArray(payload.users) ? payload.users : []; setStatus(users.length ? '' : 'Ainda não há usuários cadastrados.'); render();
  } catch (error) { setStatus(error.message, 'error'); }
}

usersSearch.addEventListener('input', render);
loadUsers();

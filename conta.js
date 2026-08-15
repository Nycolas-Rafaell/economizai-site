const avatarOptions = document.getElementById('avatarOptions');
const avatarPreview = document.getElementById('avatarPreview');
const status = document.getElementById('status');
const avatarPaths = Array.from({ length: 6 }, (_, index) => `assets/avatars/avatar-${index + 1}.png`);
let selectedAvatarId = 'avatar-1';
let session = null;

async function readJson(response) { const text = await response.text(); try { return JSON.parse(text); } catch { return {}; } }
function notify(message, error = false) { status.className = `status${error ? ' error' : ''}`; status.textContent = message; }
function avatarSource() { return session?.avatarUrl || `assets/avatars/${selectedAvatarId}.png`; }
function clearInputs(...ids) { ids.forEach((id) => { document.getElementById(id).value = ''; }); }
function renderAvatars() {
  avatarOptions.replaceChildren(...avatarPaths.map((path, index) => {
    const id = `avatar-${index + 1}`;
    const button = document.createElement('button');
    button.type = 'button'; button.className = `avatar-option${id === selectedAvatarId ? ' selected' : ''}`;
    button.setAttribute('aria-label', `Escolher avatar ${index + 1}`);
    const image = document.createElement('img'); image.src = path; image.alt = ''; button.append(image);
    button.addEventListener('click', () => { selectedAvatarId = id; session.avatarUrl = ''; avatarPreview.src = avatarSource(); renderAvatars(); });
    return button;
  }));
}

async function loadProfile() {
  const response = await fetch('/api/auth/session', { cache: 'no-store' }); session = await readJson(response);
  if (!response.ok) return window.location.replace('/login.html');
  document.getElementById('email').textContent = session.email;
  document.getElementById('accountEmail').value = session.email;
  document.getElementById('name').value = session.name || '';
  document.getElementById('displayName').value = session.displayName || '';
  document.getElementById('phone').value = session.phone || '';
  selectedAvatarId = session.avatarId || 'avatar-1';
  avatarPreview.src = avatarSource();
  document.getElementById('adminLink').hidden = !session.isAdmin;
  renderAvatars();
}

document.getElementById('profileForm').addEventListener('submit', async (event) => {
  event.preventDefault(); notify('Salvando…');
  const response = await fetch('/api/auth/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: document.getElementById('name').value, displayName: document.getElementById('displayName').value, phone: document.getElementById('phone').value, avatarId: selectedAvatarId, useCustomAvatar: Boolean(session.avatarUrl) }) });
  const result = await readJson(response);
  if (!response.ok) return notify(result.message || 'Não foi possível salvar.', true);
  session = { ...session, ...result, avatarId: result.avatarId, avatarUrl: session.avatarUrl };
  avatarPreview.src = avatarSource(); notify('Perfil atualizado.');
});

document.getElementById('avatarUpload').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 2_000_000) return notify('A foto deve ter no máximo 2 MB.', true);
  const base64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
  notify('Enviando foto…');
  const response = await fetch('/api/auth/avatar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base64, mimeType: file.type }) });
  const result = await readJson(response);
  if (!response.ok) return notify(result.message || 'Não foi possível enviar a foto.', true);
  session.avatarUrl = result.avatarUrl; avatarPreview.src = result.avatarUrl; notify('Foto de perfil atualizada.');
});

document.getElementById('changeEmail').addEventListener('click', () => {
  document.getElementById('emailDialog').hidden = false; document.getElementById('passwordDialog').hidden = true;
  clearInputs('newEmail', 'emailCurrentPassword'); document.getElementById('newEmail').focus();
});
document.getElementById('changePassword').addEventListener('click', () => {
  document.getElementById('passwordDialog').hidden = false; document.getElementById('emailDialog').hidden = true;
  clearInputs('currentPassword', 'newPassword', 'confirmPassword'); document.getElementById('currentPassword').focus();
});
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => {
  document.getElementById(button.dataset.close).hidden = true;
  if (button.dataset.close === 'emailDialog') clearInputs('newEmail', 'emailCurrentPassword');
  if (button.dataset.close === 'passwordDialog') clearInputs('currentPassword', 'newPassword', 'confirmPassword');
}));

document.getElementById('saveEmail').addEventListener('click', async () => {
  const email = document.getElementById('newEmail').value;
  const currentPassword = document.getElementById('emailCurrentPassword').value;
  if (!email || !currentPassword) return notify('Informe o novo e-mail e confirme sua senha atual.', true);
  const response = await fetch('/api/auth/email', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, currentPassword }) });
  const result = await readJson(response);
  notify(result.message || (response.ok ? 'E-mail alterado.' : 'Não foi possível trocar o e-mail.'), !response.ok);
  if (response.ok) { session.email = result.email || email; document.getElementById('email').textContent = session.email; document.getElementById('accountEmail').value = session.email; document.getElementById('emailDialog').hidden = true; clearInputs('newEmail', 'emailCurrentPassword'); }
});

document.getElementById('savePassword').addEventListener('click', async () => {
  const currentPassword = document.getElementById('currentPassword').value;
  const password = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  if (!currentPassword) return notify('Informe sua senha atual.', true);
  if (password !== confirmPassword) return notify('As senhas novas não coincidem.', true);
  const response = await fetch('/api/auth/password', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, currentPassword }) });
  const result = await readJson(response);
  notify(result.message || (response.ok ? 'Senha alterada.' : 'Não foi possível trocar a senha.'), !response.ok);
  if (response.ok) { document.getElementById('passwordDialog').hidden = true; clearInputs('currentPassword', 'newPassword', 'confirmPassword'); }
});

document.getElementById('logout').addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.replace('/index.html'); });
loadProfile();

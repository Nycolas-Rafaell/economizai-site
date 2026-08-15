const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const recoveryForm = document.getElementById('recoveryForm');
const resetForm = document.getElementById('resetForm');
const authTabs = document.getElementById('authTabs');
const status = document.getElementById('status');
const hashParams = new URLSearchParams(window.location.hash.slice(1));
let recoveryToken = hashParams.get('type') === 'recovery' ? hashParams.get('access_token') : null;

async function parse(response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return {}; }
}

function setStatus(message = '', tone = 'error') {
  const type = tone === '#86e9b2' || tone === 'success' ? 'success' : (tone === '#aaa' || tone === 'info' ? 'info' : 'error');
  status.className = `status ${type}`;
  status.textContent = message;
}

function selectMode(mode, clearMessage = true) {
  loginForm.hidden = mode !== 'login';
  signupForm.hidden = mode !== 'signup';
  recoveryForm.hidden = mode !== 'recovery';
  resetForm.hidden = mode !== 'reset';
  authTabs.hidden = mode === 'recovery' || mode === 'reset';
  document.querySelectorAll('[data-mode]').forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
  if (clearMessage) setStatus('');
}

function passwordMeetsRequirements(value) {
  return value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}

function bindPasswordGuidance(inputId, prefix = '') {
  const input = document.getElementById(inputId);
  input.addEventListener('input', () => {
    const value = input.value;
    const checks = { lower: /[a-z]/.test(value), upper: /[A-Z]/.test(value), number: /\d/.test(value), special: /[^A-Za-z0-9]/.test(value), length: value.length >= 8 };
    const selector = prefix ? '[data-reset-rule]' : '[data-rule]';
    Object.entries(checks).forEach(([rule, passed]) => document.querySelector(`${selector}[${prefix ? 'data-reset-rule' : 'data-rule'}="${rule}"]`)?.classList.toggle('ok', passed));
    const completed = Object.values(checks).filter(Boolean).length;
    const progressId = prefix ? 'resetPasswordProgress' : 'passwordProgress';
    const guidanceId = prefix ? 'resetPasswordGuidance' : 'passwordGuidance';
    document.getElementById(progressId).style.width = `${completed * 20}%`;
    document.getElementById(guidanceId).classList.toggle('complete', completed === 5);
  });
}

bindPasswordGuidance('signupPassword');
bindPasswordGuidance('resetPassword', 'reset');

document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => selectMode(button.dataset.mode)));
document.getElementById('forgotPassword').addEventListener('click', () => {
  document.getElementById('recoveryEmail').value = document.getElementById('email').value;
  selectMode('recovery');
});

async function sendAuth(endpoint, data, button) {
  button.disabled = true;
  setStatus('Aguarde…', 'info');
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await parse(response);
    if (!response.ok) throw new Error(result.message || 'Não foi possível concluir.');
    if (result.confirmationRequired) {
      selectMode('login');
      setStatus(result.message, 'success');
      return;
    }
    window.location.assign('/index.html');
  } catch (error) {
    setStatus(error.message);
  } finally { button.disabled = false; }
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  sendAuth('/api/auth/login', { email: document.getElementById('email').value, password: document.getElementById('password').value }, loginForm.querySelector('button.submit'));
});

signupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!passwordMeetsRequirements(document.getElementById('signupPassword').value)) {
    setStatus('A senha ainda não atende a todos os requisitos.');
    return;
  }
  sendAuth('/api/auth/signup', { name: document.getElementById('signupName').value, email: document.getElementById('signupEmail').value, password: document.getElementById('signupPassword').value }, signupForm.querySelector('button.submit'));
});

recoveryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = recoveryForm.querySelector('button.submit');
  button.disabled = true;
  setStatus('Enviando link…', 'info');
  try {
    const response = await fetch('/api/auth/recover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: document.getElementById('recoveryEmail').value }) });
    const result = await parse(response);
    if (!response.ok) throw new Error(result.message || 'Não foi possível enviar o link agora.');
    setStatus(result.message, 'success');
  } catch (error) {
    setStatus(error.message);
  } finally { button.disabled = false; }
});

resetForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = document.getElementById('resetPassword').value;
  const confirmation = document.getElementById('resetPasswordConfirm').value;
  if (!passwordMeetsRequirements(password)) return setStatus('A nova senha ainda não atende a todos os requisitos.');
  if (password !== confirmation) return setStatus('As senhas não são iguais.');
  const button = resetForm.querySelector('button.submit');
  button.disabled = true;
  setStatus('Salvando nova senha…', 'info');
  try {
    const response = await fetch('/api/auth/recover/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessToken: recoveryToken, password }) });
    const result = await parse(response);
    if (!response.ok) throw new Error(result.message || 'Não foi possível alterar a senha. Solicite um novo link.');
    recoveryToken = null;
    selectMode('login', false);
    setStatus('Senha alterada com sucesso. Entre com sua nova senha.', 'success');
  } catch (error) {
    setStatus(error.message);
  } finally { button.disabled = false; }
});

if (recoveryToken) {
  window.history.replaceState({}, document.title, `${window.location.pathname}?recuperar=1`);
  selectMode('reset');
} else {
  fetch('/api/auth/session', { cache: 'no-store' }).then((response) => { if (response.ok) window.location.replace('/index.html'); }).catch(() => {});
}

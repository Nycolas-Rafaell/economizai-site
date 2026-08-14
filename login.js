const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const status = document.getElementById('status');

async function parse(response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return {}; }
}

function selectMode(mode) {
  loginForm.hidden = mode !== 'login';
  signupForm.hidden = mode !== 'signup';
  document.querySelectorAll('[data-mode]').forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
  status.textContent = '';
}

function passwordMeetsRequirements(value) {
  return value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}

const signupPassword = document.getElementById('signupPassword');
signupPassword.addEventListener('input', () => {
  const value = signupPassword.value;
  const checks = { lower: /[a-z]/.test(value), upper: /[A-Z]/.test(value), number: /\d/.test(value), special: /[^A-Za-z0-9]/.test(value), length: value.length >= 8 };
  Object.entries(checks).forEach(([rule, passed]) => document.querySelector(`[data-rule="${rule}"]`)?.classList.toggle('ok', passed));
  const completed = Object.values(checks).filter(Boolean).length;
  document.getElementById('passwordProgress').style.width = `${completed * 20}%`;
  document.getElementById('passwordGuidance').classList.toggle('complete', completed === 5);
});

document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => selectMode(button.dataset.mode)));

async function sendAuth(endpoint, data, button) {
  button.disabled = true;
  status.style.color = '#aaa';
  status.textContent = 'Aguarde…';
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await parse(response);
    if (!response.ok) throw new Error(result.message || 'Não foi possível concluir.');
    if (result.confirmationRequired) {
      selectMode('login');
      status.style.color = '#86e9b2';
      status.textContent = result.message;
      return;
    }
    window.location.assign('/index.html');
  } catch (error) {
    status.style.color = '#ffb0b0';
    status.textContent = error.message;
  } finally { button.disabled = false; }
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  sendAuth('/api/auth/login', { email: document.getElementById('email').value, password: document.getElementById('password').value }, loginForm.querySelector('button'));
});

signupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!passwordMeetsRequirements(document.getElementById('signupPassword').value)) {
    status.style.color = '#ffb0b0';
    status.textContent = 'A senha ainda não atende a todos os requisitos.';
    return;
  }
  sendAuth('/api/auth/signup', { name: document.getElementById('signupName').value, email: document.getElementById('signupEmail').value, password: document.getElementById('signupPassword').value }, signupForm.querySelector('button'));
});

fetch('/api/auth/session', { cache: 'no-store' }).then((response) => { if (response.ok) window.location.replace('/index.html'); }).catch(() => {});

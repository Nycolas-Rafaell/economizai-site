function addPasswordVisibilityControls() {
  document.querySelectorAll('input[type="password"]').forEach((input) => {
    if (input.dataset.visibilityControl) return;
    input.dataset.visibilityControl = 'true';
    const wrapper = document.createElement('div');
    wrapper.className = 'password-field';
    input.before(wrapper); wrapper.append(input);
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'password-toggle';
    button.setAttribute('aria-label', 'Mostrar senha'); button.setAttribute('aria-pressed', 'false');
    button.title = 'Mostrar senha';
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
    button.addEventListener('click', () => {
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      button.setAttribute('aria-pressed', String(!visible));
      button.setAttribute('aria-label', visible ? 'Mostrar senha' : 'Ocultar senha');
      button.title = visible ? 'Mostrar senha' : 'Ocultar senha';
    });
    wrapper.append(button);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addPasswordVisibilityControls);
else addPasswordVisibilityControls();

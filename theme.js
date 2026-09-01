(() => {
  const STORAGE_KEY = 'economizai:theme';
  const root = document.documentElement;
  const sun = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg>';
  const moon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.4A8.8 8.8 0 0 1 8.6 3.8 8.8 8.8 0 1 0 20.2 15.4Z"/></svg>';

  const currentTheme = () => root.dataset.theme === 'light' ? 'light' : 'dark';

  function render() {
    const light = currentTheme() === 'light';
    root.style.colorScheme = light ? 'light' : 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      const label = light ? 'Tema escuro' : 'Tema claro';
      button.setAttribute('aria-label', `Ativar ${label.toLowerCase()}`);
      button.title = `Ativar ${label.toLowerCase()}`;
      button.setAttribute('aria-pressed', String(light));
      const icon = button.querySelector('.theme-toggle-icon');
      const text = button.querySelector('.theme-toggle-label');
      if (icon) icon.innerHTML = light ? moon : sun;
      if (text) text.textContent = label;
    });
  }

  function setTheme(theme) {
    root.dataset.theme = theme === 'light' ? 'light' : 'dark';
    try { localStorage.setItem(STORAGE_KEY, root.dataset.theme); } catch (_) {}
    render();
    window.dispatchEvent(new CustomEvent('economizai:theme-changed', { detail: { theme: root.dataset.theme } }));
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-theme-toggle]')) return;
    setTheme(currentTheme() === 'light' ? 'dark' : 'light');
  });

  render();
  window.EconomizaiTheme = { get: currentTheme, set: setTheme };
})();

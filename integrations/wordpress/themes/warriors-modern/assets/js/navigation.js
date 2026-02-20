(() => {
  const header = document.querySelector('.wm-header');
  const toggle = document.querySelector('.wm-menu-toggle');
  const themeToggle = document.querySelector('.wm-theme-toggle');
  if (!header || !toggle) return;

  const closeMenu = () => {
    header.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const open = header.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 980) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  });

  document.querySelectorAll('.wm-sub-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.closest('.wm-has-submenu');
      if (!item) return;
      const open = item.classList.toggle('sub-open');
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      button.textContent = open ? '-' : '+';
    });
  });

  const applyThemeState = (dark) => {
    document.body.classList.toggle('wm-dark', dark);
    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
      themeToggle.textContent = dark ? 'Light' : 'Dark';
    }
  };

  let saved = null;
  try {
    saved = window.localStorage.getItem('wm-theme');
  } catch (e) {}
  if (saved === 'dark') {
    applyThemeState(true);
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const dark = !document.body.classList.contains('wm-dark');
      applyThemeState(dark);
      try {
        window.localStorage.setItem('wm-theme', dark ? 'dark' : 'light');
      } catch (e) {}
    });
  }
})();

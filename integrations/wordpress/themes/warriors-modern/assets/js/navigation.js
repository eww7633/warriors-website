(() => {
  const header = document.querySelector('.wm-header');
  const toggle = document.querySelector('.wm-menu-toggle');
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
})();

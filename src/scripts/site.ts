/** Homepage navigation and showroom clock behavior. */
let disposeSite: (() => void) | undefined;

function initializeSite() {
  disposeSite?.();
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const toggle = document.querySelector<HTMLButtonElement>('.mobile-menu-toggle');
  const menuId = toggle?.getAttribute('aria-controls');
  const menu = menuId ? document.getElementById(menuId) : null;
  const setMenu = (open: boolean) => {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  };
  toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'), options);
  menu?.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('a')) setMenu(false);
  }, options);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      toggle.focus();
    }
  }, options);
  window.addEventListener('resize', () => { if (window.innerWidth > 820) setMenu(false); }, options);

  // Show the local time only; opening hours are never inferred from placeholders.
  const clock = document.getElementById('clock');
  const updateClock = () => {
    if (!clock || document.hidden) return;
    try {
      const time = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Africa/Casablanca', hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(new Date());
      clock.textContent = `${clock.dataset.city || ''} ${time}`.trim();
    } catch { /* Keep the server-rendered city label. */ }
  };
  updateClock();
  const clockTimer = clock ? window.setInterval(updateClock, 30_000) : undefined;
  document.addEventListener('visibilitychange', updateClock, options);
  disposeSite = () => {
    controller.abort();
    if (clockTimer !== undefined) clearInterval(clockTimer);
  };
}

initializeSite();
document.addEventListener('astro:page-load', initializeSite);
document.addEventListener('astro:before-swap', () => disposeSite?.());

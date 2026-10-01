/** Homepage navigation behavior. */
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
  // Matches the width at which the header menu folds into its panel (site.css).
  window.addEventListener('resize', () => { if (window.innerWidth > 1240) setMenu(false); }, options);

  disposeSite = () => controller.abort();
}

initializeSite();
document.addEventListener('astro:page-load', initializeSite);
document.addEventListener('astro:before-swap', () => disposeSite?.());

/** Original version B scroll choreography, measured against live CMS content. */
let disposeHome: (() => void) | undefined;

function initializeHome() {
  disposeHome?.();
  const home = document.querySelector<HTMLElement>('.home');
  if (!home) return;
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const passive = { ...options, passive: true };
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = () => window.innerWidth > 820;
  const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const setInert = (element: HTMLElement, selector: string, inert: boolean) => {
    element.querySelectorAll<HTMLElement>(selector).forEach(target => { target.inert = inert; });
  };
  const ease = (t: number) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const header = document.getElementById('hd');
  const hero = home.querySelector<HTMLElement>('#accueil');
  const heroWords = hero?.querySelector<HTMLElement>('.words');
  const heroOver = hero?.querySelector<HTMLElement>('.over');
  const brand = home.querySelector<HTMLElement>('#italie');
  const collections = home.querySelector<HTMLElement>('#collections');
  const track = collections?.querySelector<HTMLElement>('.track');
  const scenes = [...home.querySelectorAll<HTMLElement>('[data-scene]')];
  const mobileImages = [...home.querySelectorAll<HTMLImageElement>('.m .mimg img')];
  const frames: Record<string, (element: HTMLElement, progress: number, entering: number) => void> = {
    hero(element, progress) {
      const grow = ease(clamp(progress / .55));
      const text = ease(clamp((progress - .58) / .22));
      element.style.setProperty('--g', grow.toFixed(4));
      element.style.setProperty('--t', text.toFixed(4));
      element.style.setProperty('--w', clamp(progress).toFixed(4));
      heroOver?.classList.toggle('on', text > .5);
      // The overlay cannot receive keyboard focus while it is visually hidden.
      if (heroOver) setInert(heroOver, 'a', text <= .5);
    },
    italie(element, progress, entering) {
      const reveal = ease(clamp((entering - .15) / .85));
      element.style.setProperty('--a', reveal.toFixed(4));
      setInert(element, '.col a', reveal < .2);
      element.style.setProperty('--o', clamp(progress).toFixed(4));
    },
    collections(element, progress) {
      element.style.setProperty('--h', clamp((progress - .04) / .92).toFixed(4));
    },
    showroom(element, progress) {
      element.style.setProperty('--s', ease(clamp(progress / .5)).toFixed(4));
      const reveal = ease(clamp((progress - .26) / .3));
      element.style.setProperty('--r', reveal.toFixed(4));
      setInert(element, '.info a', reveal < .2);
    },
    catalogue(element, progress, entering) {
      element.style.setProperty('--c', ease(clamp((entering - .1) / .9)).toFixed(4));
      element.style.setProperty('--d', clamp(progress).toFixed(4));
    },
  };
  let current = window.scrollY;
  let target = current;
  let animation: number | undefined;
  let resizeFrame: number | undefined;

  const setMotionPreference = () => {
    document.documentElement.classList.toggle('motion-ready', !motion.matches);
    if (motion.matches) home.querySelectorAll<HTMLElement>('[inert]').forEach(element => { element.inert = false; });
    mobileImages.forEach(image => { if (motion.matches) image.style.removeProperty('transform'); });
  };
  function measure() {
    if (!desktop() || motion.matches) return;
    if (hero && heroWords) {
      const textBottom = heroWords.offsetTop + heroWords.offsetHeight + window.innerHeight * .04;
      hero.style.setProperty('--hero-bottom', `${textBottom}px`);
    }
    if (collections && track) {
      const travel = Math.max(0, track.scrollWidth - window.innerWidth);
      collections.style.setProperty('--shift', String(travel));
      collections.style.height = `${Math.max(window.innerHeight * 4.2, travel + window.innerHeight * 1.5)}px`;
    }
  }
  function render(y: number) {
    const viewport = window.innerHeight;
    header?.classList.toggle('solid', !desktop() || !brand || y > brand.offsetTop - viewport * .2);
    if (motion.matches) return;
    if (!desktop()) {
      mobileImages.forEach(image => {
        const rect = image.parentElement?.getBoundingClientRect();
        if (!rect || rect.bottom < 0 || rect.top > viewport) return;
        const drift = (((rect.top + rect.height / 2) - viewport / 2) / viewport * -28).toFixed(1);
        image.style.transform = `translateY(${drift}px)`;
      });
      return;
    }
    const offset = y - window.scrollY;
    for (const element of scenes) {
      const rect = element.getBoundingClientRect();
      const top = rect.top - offset;
      const length = rect.height - viewport;
      const progress = length > 0 ? -top / length : 0;
      const entering = clamp(1 - top / viewport);
      frames[element.dataset.scene || '']?.(element, progress, entering);
    }
  }
  function tick() {
    current += (target - current) * .16;
    if (Math.abs(target - current) < .4) {
      current = target;
      render(current);
      animation = undefined;
      return;
    }
    render(current);
    animation = requestAnimationFrame(tick);
  }
  function refresh() {
    if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      measure();
      current = target = window.scrollY;
      render(current);
      resizeFrame = undefined;
    });
  }
  window.addEventListener('scroll', () => {
    target = window.scrollY;
    if (motion.matches) { current = target; render(current); return; }
    if (animation === undefined) animation = requestAnimationFrame(tick);
  }, passive);
  window.addEventListener('resize', refresh, options);
  motion.addEventListener('change', () => { setMotionPreference(); refresh(); }, options);

  // Bring a keyboard-focused collection card into the visible horizontal frame.
  collections?.addEventListener('focusin', event => {
    if (!desktop() || motion.matches || !track) return;
    const card = event.target instanceof Element ? event.target.closest<HTMLElement>('.cc') : null;
    if (!card) return;
    const bounds = card.getBoundingClientRect();
    if (bounds.left >= 0 && bounds.right <= window.innerWidth) return;
    const travel = Math.max(1, track.scrollWidth - window.innerWidth);
    const progress = clamp((card.offsetLeft - window.innerWidth * .2) / travel) * .92 + .04;
    const destination = collections.offsetTop + (collections.offsetHeight - window.innerHeight) * progress;
    window.scrollTo({ top: destination, behavior: 'instant' });
    current = target = window.scrollY;
    render(current);
  }, options);

  // Keep the original scene offsets for any CMS-authored in-page navigation.
  const stops: Record<string, number> = { accueil: 0, italie: .1, collections: .02, showroom: .62, plan: 0, catalogue: .62, journal: 0 };
  document.addEventListener('click', event => {
    const anchor = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-go]') : null;
    const id = anchor?.dataset.go;
    if (!id) return;
    const element = document.getElementById(desktop() ? id : `m-${id}`) || document.getElementById(id);
    if (!element) return;
    event.preventDefault();
    let y = element.getBoundingClientRect().top + window.scrollY;
    if (desktop() && !motion.matches && element.dataset.scene) y += (element.offsetHeight - window.innerHeight) * (stops[id] || 0);
    window.scrollTo({ top: y - (desktop() ? 0 : 60), behavior: motion.matches ? 'auto' : 'smooth' });
  }, options);

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('in'); observer?.unobserve(entry.target); }
    });
  }, { threshold: .12 }) : null;
  home.querySelectorAll('.rv').forEach(element => observer ? observer.observe(element) : element.classList.add('in'));
  const resizeObserver = new ResizeObserver(refresh);
  if (heroWords) resizeObserver.observe(heroWords);
  setMotionPreference();
  measure();
  render(current);
  document.fonts.ready.then(() => { if (!controller.signal.aborted) refresh(); });
  disposeHome = () => {
    controller.abort();
    observer?.disconnect();
    resizeObserver.disconnect();
    if (animation !== undefined) cancelAnimationFrame(animation);
    if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
    document.documentElement.classList.remove('motion-ready');
  };
}

initializeHome();
document.addEventListener('astro:page-load', initializeHome);
document.addEventListener('astro:before-swap', () => disposeHome?.());

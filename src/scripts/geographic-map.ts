/** Enhance the local SVG map without intercepting normal page scrolling. */
type MapRectangle = { x: number; y: number; width: number; height: number };
type MapDrag = { pointerId: number; x: number; y: number; centerX: number; centerY: number };
const minimumZoom = 1;
const maximumZoom = 6;
const zoomStep = 1.25;
let disposeGeographicMaps: (() => void) | undefined;

function parseRectangle(value: string | undefined): MapRectangle | null {
  const numbers = value?.trim().split(/[\s,]+/).map(Number);
  if (!numbers || numbers.length !== 4 || !numbers.every(Number.isFinite) || numbers[2] <= 0 || numbers[3] <= 0) return null;
  return { x: numbers[0], y: numbers[1], width: numbers[2], height: numbers[3] };
}

function initializeGeographicMaps() {
  disposeGeographicMaps?.();
  const disposers: (() => void)[] = [];

  document.querySelectorAll<HTMLElement>('[data-geographic-map]').forEach(wrapper => {
    const viewport = wrapper.querySelector<HTMLElement>('[data-map-viewport]');
    const svg = wrapper.querySelector<SVGSVGElement>('svg[data-map-svg]');
    const controls = wrapper.querySelector<HTMLElement>('[data-map-controls]');
    const zoomIn = wrapper.querySelector<HTMLButtonElement>('[data-map-zoom-in]');
    const zoomOut = wrapper.querySelector<HTMLButtonElement>('[data-map-zoom-out]');
    const reset = wrapper.querySelector<HTMLButtonElement>('[data-map-reset]');
    const pan = wrapper.querySelector<HTMLButtonElement>('[data-map-pan]');
    const initial = parseRectangle(wrapper.dataset.initialView);
    const bounds = parseRectangle(wrapper.dataset.bounds);
    const marker = wrapper.dataset.pin?.trim().split(/\s+/).map(Number);
    if (!viewport || !svg || !controls || !zoomIn || !zoomOut || !reset || !pan || !initial || !bounds) return;

    const controller = new AbortController();
    const options = { signal: controller.signal };
    let zoom = minimumZoom;
    let centerX = initial.x + initial.width / 2;
    let centerY = initial.y + initial.height / 2;
    let view = { ...initial };
    let ready = false;
    let panning = false;
    let drag: MapDrag | undefined;
    const clamp = (value: number, lower: number, upper: number) => Math.max(lower, Math.min(upper, value));

    const finishDrag = () => {
      const pointerId = drag?.pointerId;
      drag = undefined;
      if (pointerId !== undefined && viewport.hasPointerCapture(pointerId)) viewport.releasePointerCapture(pointerId);
      delete wrapper.dataset.dragging;
    };

    const setPanning = (enabled: boolean) => {
      panning = enabled && ready;
      wrapper.dataset.panning = String(panning);
      pan.setAttribute('aria-pressed', String(panning));
      if (!panning) finishDrag();
    };

    const render = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      ready = width > 0 && height > 0;
      controls.hidden = !ready;
      if (!ready) { setPanning(false); return; }

      // Match the actual viewport aspect before applying zoom. Keep the entire
      // view inside the downloaded geography even on unusually narrow screens.
      const aspect = width / height;
      const fittedWidth = Math.max(initial.width, initial.height * aspect);
      const fittedHeight = fittedWidth / aspect;
      const fit = Math.min(1, bounds.width / fittedWidth, bounds.height / fittedHeight);
      const viewWidth = fittedWidth * fit / zoom;
      const viewHeight = fittedHeight * fit / zoom;
      centerX = clamp(centerX, bounds.x + viewWidth / 2, bounds.x + bounds.width - viewWidth / 2);
      centerY = clamp(centerY, bounds.y + viewHeight / 2, bounds.y + bounds.height - viewHeight / 2);
      view = { x: centerX - viewWidth / 2, y: centerY - viewHeight / 2, width: viewWidth, height: viewHeight };
      svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
      wrapper.style.setProperty('--map-unit', String(view.width / width));
      wrapper.dataset.zoom = String(zoom);
      wrapper.dataset.zoomDetail = String(zoom >= 1.6);
      zoomIn.disabled = zoom >= maximumZoom;
      zoomOut.disabled = zoom <= minimumZoom;
    };

    const changeZoom = (factor: number) => {
      if (!ready) return;
      finishDrag();
      // The initial city-wide composition gives the showroom room beside its
      // information card. Start a closer look at the actual pin, unless the
      // visitor has already moved the map to another area.
      if (factor > 1 && zoom === minimumZoom && marker?.length === 2 && marker.every(Number.isFinite) &&
          Math.abs(centerX - initial.x - initial.width / 2) < 1 && Math.abs(centerY - initial.y - initial.height / 2) < 1) {
        [centerX, centerY] = marker;
      }
      zoom = clamp(zoom * factor, minimumZoom, maximumZoom);
      render();
    };

    const recenter = () => {
      finishDrag();
      zoom = minimumZoom;
      centerX = initial.x + initial.width / 2;
      centerY = initial.y + initial.height / 2;
      render();
    };

    zoomIn.addEventListener('click', () => changeZoom(zoomStep), options);
    zoomOut.addEventListener('click', () => changeZoom(1 / zoomStep), options);
    reset.addEventListener('click', recenter, options);
    pan.addEventListener('click', () => setPanning(!panning), options);

    wrapper.addEventListener('keydown', event => {
      if (event.key === 'Escape' && panning) {
        event.preventDefault();
        setPanning(false);
        return;
      }
      // Links and buttons keep their native keyboard behavior, including the pin.
      if (event.target !== viewport || !ready || event.altKey || event.ctrlKey || event.metaKey) return;
      const distance = event.shiftKey ? .25 : .1;
      switch (event.key) {
        case 'ArrowLeft': centerX -= view.width * distance; break;
        case 'ArrowRight': centerX += view.width * distance; break;
        case 'ArrowUp': centerY -= view.height * distance; break;
        case 'ArrowDown': centerY += view.height * distance; break;
        case '+': case '=': changeZoom(zoomStep); break;
        case '-': case '−': changeZoom(1 / zoomStep); break;
        case 'Home': recenter(); break;
        default: return;
      }
      event.preventDefault();
      render();
    }, options);

    viewport.addEventListener('pointerdown', event => {
      if (!ready || !panning || !event.isPrimary || event.button !== 0 || drag) return;
      if (event.target instanceof Element && event.target.closest('a, button, input, select, textarea, [role="button"], [role="link"], [contenteditable="true"]')) return;
      drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, centerX, centerY };
      viewport.setPointerCapture(event.pointerId);
      viewport.focus({ preventScroll: true });
      wrapper.dataset.dragging = 'true';
      event.preventDefault();
    }, options);

    viewport.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      centerX = drag.centerX - (event.clientX - drag.x) * view.width / viewport.clientWidth;
      centerY = drag.centerY - (event.clientY - drag.y) * view.height / viewport.clientHeight;
      render();
      event.preventDefault();
    }, options);

    const endPointer = (event: PointerEvent) => {
      if (event.pointerId === drag?.pointerId) finishDrag();
    };
    viewport.addEventListener('pointerup', endPointer, options);
    viewport.addEventListener('pointercancel', endPointer, options);
    viewport.addEventListener('lostpointercapture', endPointer, options);
    window.addEventListener('blur', finishDrag, options);

    const resized = () => { finishDrag(); render(); };
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(resized);
    if (observer) observer.observe(viewport);
    else window.addEventListener('resize', resized, options);
    setPanning(false);
    render();
    disposers.push(() => {
      setPanning(false);
      controller.abort();
      observer?.disconnect();
      controls.hidden = true;
      delete wrapper.dataset.zoom;
      delete wrapper.dataset.zoomDetail;
    });
  });

  disposeGeographicMaps = () => { disposers.forEach(dispose => dispose()); };
}

initializeGeographicMaps();
document.addEventListener('astro:page-load', initializeGeographicMaps);
document.addEventListener('astro:before-swap', () => disposeGeographicMaps?.());

export {};

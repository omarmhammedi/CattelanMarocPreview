/** Local map controls, trackpad navigation and opt-in pointer dragging. */
import { selectStreetLabels, type StreetLabelCandidate } from '../lib/map-labels';
type MapRectangle = { x: number; y: number; width: number; height: number };
type MapDrag = { pointerId: number; x: number; y: number; centerX: number; centerY: number };
type MapGesture = Event & { scale?: number; clientX?: number; clientY?: number };
const initialZoom = 1;
const maximumZoom = 16;
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
  const labelData = document.getElementById('casablanca-label-data')?.textContent;
  const candidates: StreetLabelCandidate[] = labelData ? JSON.parse(labelData) : [];
  const header = document.querySelector('header');

  document.querySelectorAll<HTMLElement>('[data-geographic-map]').forEach(wrapper => {
    const viewport = wrapper.querySelector<HTMLElement>('[data-map-viewport]');
    const svg = wrapper.querySelector<SVGSVGElement>('svg[data-map-svg]');
    const controls = wrapper.querySelector<HTMLElement>('[data-map-controls]');
    const zoomIn = wrapper.querySelector<HTMLButtonElement>('[data-map-zoom-in]');
    const zoomOut = wrapper.querySelector<HTMLButtonElement>('[data-map-zoom-out]');
    const reset = wrapper.querySelector<HTMLButtonElement>('[data-map-reset]');
    const pan = wrapper.querySelector<HTMLButtonElement>('[data-map-pan]');
    const streetLayer = wrapper.querySelector<SVGGElement>('[data-map-street-labels]');
    const markerElement = wrapper.querySelector<SVGGElement>('[data-showroom-marker]');
    const initial = parseRectangle(wrapper.dataset.initialView);
    const bounds = parseRectangle(wrapper.dataset.bounds);
    const marker = wrapper.dataset.pin?.trim().split(/\s+/).map(Number);
    if (!viewport || !svg || !controls || !zoomIn || !zoomOut || !reset || !pan || !initial || !bounds) return;

    const controller = new AbortController();
    const options = { signal: controller.signal };
    let zoom = initialZoom;
    let minimumZoom = initialZoom;
    let centerX = initial.x + initial.width / 2;
    let centerY = initial.y + initial.height / 2;
    let view = { ...initial };
    let ready = false;
    let panning = false;
    let drag: MapDrag | undefined;
    let scrollFrame: number | undefined;
    let gestureScale: number | undefined;
    let gestureEndedAt = -Infinity;
    let pointer: { x: number; y: number } | undefined;
    let touching = false;
    const trackpadAvailable = matchMedia('(any-hover: hover) and (any-pointer: fine)');
    let lastLabels = '';
    const measureContext = document.createElement('canvas').getContext('2d');
    const widths = new Map<string, number>();
    if (measureContext) measureContext.font = `13px ${getComputedStyle(viewport).fontFamily}`;
    const measureText = (name: string) => {
      if (!widths.has(name)) widths.set(name, (measureContext?.measureText(name).width ?? name.length * 7) + name.length * .3);
      return widths.get(name)!;
    };
    const clamp = (value: number, lower: number, upper: number) => Math.max(lower, Math.min(upper, value));

    const positionControls = () => {
      if (!ready) return;
      const rect = viewport.getBoundingClientRect();
      const visibleTop = Math.max(12, (header?.getBoundingClientRect().bottom ?? 0) - rect.top + 12);
      // Stay below the fixed header while the map passes through the viewport.
      // The lower bound keeps the stack inside the map, above its attribution.
      const attributionTop = wrapper.querySelector('.geographic-map-attribution')?.getBoundingClientRect().top ?? rect.bottom;
      const bottomLimit = Math.max(12, attributionTop - rect.top - controls.offsetHeight - 6);
      controls.style.top = `${Math.min(visibleTop, bottomLimit)}px`;
    };

    const renderStreetLabels = () => {
      if (!streetLayer || !candidates.length || !ready) return;
      const frame = viewport.getBoundingClientRect();
      const obstacles: MapRectangle[] = [];
      const markerParts = markerElement ? [...markerElement.querySelectorAll('text, .m-pin, .map-pin-link')] : [];
      for (const element of [controls, ...markerParts, wrapper.closest('#plan')?.querySelector('.panel'), wrapper.querySelector('.geographic-map-attribution')]) {
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        if (rect.width && rect.height) obstacles.push({ x: rect.x - frame.x - 5, y: rect.y - frame.y - 5, width: rect.width + 10, height: rect.height + 10 });
      }
      // Reserve neighborhood names too; their real geographic positions do not move.
      document.querySelectorAll<SVGGElement>('#casablanca-place-labels > g[transform]').forEach(group => {
        const point = group.transform.baseVal.consolidate()?.matrix;
        const text = group.querySelector('text')?.textContent || '';
        if (!point) return;
        const scale = frame.width / view.width;
        const width = measureText(text) + text.length * 1.7;
        obstacles.push({ x: (point.e - view.x) * scale - width / 2, y: (point.f - view.y) * scale - 16, width, height: 20 });
      });
      const selected = selectStreetLabels(candidates, view, { width: frame.width, height: frame.height }, measureText, obstacles);
      const signature = JSON.stringify(selected);
      if (signature === lastLabels) return;
      lastLabels = signature;
      const namespace = 'http://www.w3.org/2000/svg';
      const elements = selected.map(label => {
        const outer = document.createElementNS(namespace, 'g');
        outer.setAttribute('transform', `translate(${label.x} ${label.y}) rotate(${label.angle})`);
        const glyph = document.createElementNS(namespace, 'g');
        glyph.setAttribute('class', 'map-glyph');
        const text = document.createElementNS(namespace, 'text');
        text.setAttribute('class', 'm-lbl map-street-label');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('y', '-5');
        text.textContent = label.name;
        glyph.appendChild(text); outer.appendChild(glyph);
        return outer;
      });
      streetLayer.replaceChildren(...elements);
    };

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
      const widestView = Math.min(bounds.width, bounds.height * aspect);
      const startingWidth = Math.min(fittedWidth, widestView);
      minimumZoom = startingWidth / widestView;
      zoom = clamp(zoom, minimumZoom, maximumZoom);
      const viewWidth = startingWidth / zoom;
      const viewHeight = viewWidth / aspect;
      centerX = clamp(centerX, bounds.x + viewWidth / 2, bounds.x + bounds.width - viewWidth / 2);
      centerY = clamp(centerY, bounds.y + viewHeight / 2, bounds.y + bounds.height - viewHeight / 2);
      view = { x: centerX - viewWidth / 2, y: centerY - viewHeight / 2, width: viewWidth, height: viewHeight };
      svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
      wrapper.style.setProperty('--map-unit', String(view.width / width));
      wrapper.dataset.zoom = String(zoom);
      wrapper.dataset.zoomDetail = 'true';
      zoomIn.disabled = zoom >= maximumZoom;
      zoomOut.disabled = zoom <= minimumZoom + 1e-8;
      positionControls();
      renderStreetLabels();
    };

    const renderCamera = () => {
      const left = window.scrollX, top = window.scrollY;
      render();
      // WebKit can scroll the document when a focused map's SVG viewBox changes.
      // A camera action should move the geography, never the surrounding page.
      window.scrollTo({ left, top, behavior: 'instant' });
      positionControls();
    };

    const changeZoom = (factor: number) => {
      if (!ready) return;
      finishDrag();
      // The initial city-wide composition gives the showroom room beside its
      // information card. Start a closer look at the actual pin, unless the
      // visitor has already moved the map to another area.
      if (factor > 1 && zoom === initialZoom && marker?.length === 2 && marker.every(Number.isFinite) &&
          Math.abs(centerX - initial.x - initial.width / 2) < 1 && Math.abs(centerY - initial.y - initial.height / 2) < 1) {
        [centerX, centerY] = marker;
      }
      zoom = clamp(zoom * factor, minimumZoom, maximumZoom);
      renderCamera();
    };

    const zoomAt = (factor: number, x: number, y: number) => {
      if (!ready || !Number.isFinite(factor) || factor <= 0) return;
      finishDrag();
      const rect = viewport.getBoundingClientRect();
      const offsetX = (clamp((x - rect.left) / rect.width, 0, 1) - .5) * view.width;
      const offsetY = (clamp((y - rect.top) / rect.height, 0, 1) - .5) * view.height;
      const nextZoom = clamp(zoom * factor, minimumZoom, maximumZoom);
      // Keep the geographic point under the cursor still as the scale changes.
      centerX += offsetX * (1 - zoom / nextZoom);
      centerY += offsetY * (1 - zoom / nextZoom);
      zoom = nextZoom;
      renderCamera();
    };

    viewport.addEventListener('wheel', event => {
      if (!ready || !trackpadAvailable.matches || touching || !event.cancelable || event.altKey || event.metaKey) return;
      const unitX = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientWidth : 1;
      const unitY = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
      const dx = event.deltaX * unitX, dy = event.deltaY * unitY;
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
      if (event.ctrlKey) {
        event.preventDefault();
        // Some Safari versions also dispatch wheel during native gestures.
        if (gestureScale === undefined && performance.now() - gestureEndedAt > 200) {
          zoomAt(Math.exp(-clamp(dy, -200, 200) * .01), event.clientX, event.clientY);
        }
        return;
      }
      if (gestureScale !== undefined) { event.preventDefault(); return; }
      const nextX = clamp(centerX + dx * view.width / viewport.clientWidth,
        bounds.x + view.width / 2, bounds.x + bounds.width - view.width / 2);
      const nextY = clamp(centerY + dy * view.height / viewport.clientHeight,
        bounds.y + view.height / 2, bounds.y + bounds.height - view.height / 2);
      // At the edge of the local geography, let scrolling continue on the page.
      if (Math.abs(nextX - centerX) < 1e-8 && Math.abs(nextY - centerY) < 1e-8) return;
      event.preventDefault();
      finishDrag();
      centerX = nextX; centerY = nextY;
      renderCamera();
    }, { ...options, passive: false });

    const gesturePoint = (event: MapGesture) => {
      const rect = viewport.getBoundingClientRect();
      const x = event.clientX, y = event.clientY;
      if (x !== undefined && y !== undefined && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return { x, y };
      return pointer ?? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };
    // Desktop Safari exposes trackpad pinch through its native GestureEvents.
    // Touchscreen gestures keep the browser's accessible page zoom.
    viewport.addEventListener('gesturestart', (event: MapGesture) => {
      if (!ready || !trackpadAvailable.matches || touching || !event.cancelable) return;
      event.preventDefault();
      finishDrag();
      gestureScale = event.scale && Number.isFinite(event.scale) && event.scale > 0 ? event.scale : 1;
    }, { ...options, passive: false });
    viewport.addEventListener('gesturechange', (event: MapGesture) => {
      if (gestureScale === undefined) return;
      event.preventDefault();
      if (!event.scale || !Number.isFinite(event.scale) || event.scale <= 0) return;
      const point = gesturePoint(event);
      zoomAt(event.scale / gestureScale, point.x, point.y);
      gestureScale = event.scale;
    }, { ...options, passive: false });
    const endGesture = () => {
      if (gestureScale !== undefined) gestureEndedAt = performance.now();
      gestureScale = undefined;
    };
    window.addEventListener('gestureend', event => {
      if (gestureScale === undefined) return;
      event.preventDefault();
      endGesture();
    }, { ...options, passive: false });
    viewport.addEventListener('touchstart', () => { touching = true; endGesture(); }, { ...options, passive: true });
    const endTouch = (event: TouchEvent) => { touching = event.touches.length > 0; };
    window.addEventListener('touchend', endTouch, { ...options, passive: true });
    window.addEventListener('touchcancel', endTouch, { ...options, passive: true });

    const recenter = () => {
      finishDrag();
      zoom = initialZoom;
      centerX = initial.x + initial.width / 2;
      centerY = initial.y + initial.height / 2;
      renderCamera();
    };

    zoomIn.addEventListener('click', () => changeZoom(zoomStep), options);
    zoomOut.addEventListener('click', () => changeZoom(1 / zoomStep), options);
    reset.addEventListener('click', recenter, options);
    pan.addEventListener('click', () => setPanning(!panning), options);
    // Safari otherwise scrolls the page when a tapped map button takes focus,
    // moving the next button beneath the fixed header.
    controls.addEventListener('pointerdown', event => {
      const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
      button?.focus({ preventScroll: true });
    }, options);

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
      renderCamera();
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
      if (event.pointerType !== 'touch') pointer = { x: event.clientX, y: event.clientY };
      if (!drag || event.pointerId !== drag.pointerId) return;
      centerX = drag.centerX - (event.clientX - drag.x) * view.width / viewport.clientWidth;
      centerY = drag.centerY - (event.clientY - drag.y) * view.height / viewport.clientHeight;
      renderCamera();
      event.preventDefault();
    }, options);

    const endPointer = (event: PointerEvent) => {
      if (event.pointerId === drag?.pointerId) finishDrag();
    };
    viewport.addEventListener('pointerup', endPointer, options);
    viewport.addEventListener('pointercancel', endPointer, options);
    viewport.addEventListener('lostpointercapture', endPointer, options);
    window.addEventListener('blur', () => { finishDrag(); endGesture(); touching = false; }, options);

    const resized = () => { finishDrag(); render(); };
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(resized);
    if (observer) observer.observe(viewport);
    else window.addEventListener('resize', resized, options);
    window.addEventListener('scroll', () => {
      if (scrollFrame !== undefined || !ready) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = undefined;
        const rect = viewport.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= innerHeight) return;
        positionControls();
        renderStreetLabels();
      });
    }, { ...options, passive: true });
    document.fonts.ready.then(() => {
      if (controller.signal.aborted) return;
      if (measureContext) measureContext.font = `13px ${getComputedStyle(viewport).fontFamily}`;
      widths.clear();
      render();
    });
    setPanning(false);
    render();
    disposers.push(() => {
      setPanning(false);
      controller.abort();
      observer?.disconnect();
      if (scrollFrame !== undefined) cancelAnimationFrame(scrollFrame);
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

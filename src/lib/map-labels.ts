import { projectCoordinate, roadLabel } from './geography.ts';

export interface StreetLabelCandidate {
  name: string;
  kind: string;
  x: number;
  y: number;
  angle: number;
  length: number;
}

interface Rectangle { x: number; y: number; width: number; height: number }
interface Road { name: string; kind: string; coordinates: number[][] }
const storeStreet = 'Avenue du Docteur Mohamed Sijelmassi';
const roadPriority: Record<string, number> = { trunk: 1, primary: 1, secondary: 2, tertiary: 3, residential: 4, unclassified: 4, pedestrian: 5 };
const finite = (value: number) => Number.isFinite(value);
const round = (value: number) => Math.round(value * 10) / 10;

/** Small, geographic candidates only: no source data is imported into the client. */
export function buildStreetLabels(roads: Road[]): StreetLabelCandidate[] {
  return roads.flatMap(road => {
    if (!road.name?.trim() || road.coordinates.length < 2 || road.coordinates.some(point => point.length < 2 || !point.slice(0, 2).every(finite))) return [];
    const position = roadLabel(road.coordinates);
    if (!Object.values(position).every(finite) || position.length <= 0) return [];
    const midpoint = { name: road.name, kind: road.kind, x: round(position.x), y: round(position.y), angle: round(position.angle), length: round(position.length) };
    // A single midpoint can leave a visible street unnamed when it is hidden by
    // the marker or an edge. Alternative anchors stay ON the source polyline.
    // The store street gets closer-spaced candidates; long main roads get two.
    const divisions = road.name === storeStreet ? Math.min(6, Math.ceil(position.length / 15)) : (position.length > 200 && (roadPriority[road.kind] ?? 4) < 4 ? 4 : 1);
    if (divisions < 3) return [midpoint];
    const points = road.coordinates.map(projectCoordinate);
    const lengths = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index][0], point[1] - points[index][1]));
    const alternatives: StreetLabelCandidate[] = [];
    for (let part = 1; part < divisions; part++) {
      if (part * 2 === divisions) continue;
      const target = position.length * part / divisions;
      let remaining = target;
      for (let index = 0; index < lengths.length; index++) {
        if (remaining > lengths[index]) { remaining -= lengths[index]; continue; }
        const start = points[index], end = points[index + 1];
        const ratio = lengths[index] ? remaining / lengths[index] : 0;
        let angle = Math.atan2(end[1] - start[1], end[0] - start[0]) * 180 / Math.PI;
        if (angle > 90) angle -= 180;
        if (angle < -90) angle += 180;
        alternatives.push({ name: road.name, kind: road.kind, x: round(start[0] + (end[0] - start[0]) * ratio), y: round(start[1] + (end[1] - start[1]) * ratio), angle: round(angle), length: round(2 * Math.min(target, position.length - target)) });
        break;
      }
    }
    return [midpoint, ...alternatives];
  });
}

const intersects = (a: Rectangle, b: Rectangle) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

/**
 * Pick labels in screen pixels, so a narrow mobile view and desktop view use the
 * same readability criteria. Text is centred horizontally, 13px, baseline y=-5;
 * the conservative local box includes the text's halo and spacing to other names.
 * The renderer supplies measured text widths, including any letter spacing.
 */
export function selectStreetLabels(
  candidates: StreetLabelCandidate[],
  view: Rectangle,
  viewport: { width: number; height: number },
  measureText: (name: string) => number,
  obstacles: Rectangle[] = [],
): StreetLabelCandidate[] {
  if (![view.x, view.y, view.width, view.height, viewport.width, viewport.height].every(finite) || view.width <= 0 || view.height <= 0 || viewport.width <= 0 || viewport.height <= 0) return [];
  const scaleX = viewport.width / view.width, scaleY = viewport.height / view.height;
  const maximum = viewport.width < 700 ? 15 : 30;
  const occupied = obstacles.filter(rect => Object.values(rect).every(finite) && rect.width > 0 && rect.height > 0).map(rect => ({ ...rect }));
  const measured = new Map<string, number>();
  const eligible = candidates.flatMap(candidate => {
    if (!candidate.name || ![candidate.x, candidate.y, candidate.angle, candidate.length].every(finite) || candidate.length <= 0) return [];
    const x = (candidate.x - view.x) * scaleX, y = (candidate.y - view.y) * scaleY;
    if (x < 0 || x > viewport.width || y < 0 || y > viewport.height) return [];
    if (!measured.has(candidate.name)) measured.set(candidate.name, measureText(candidate.name));
    const textWidth = measured.get(candidate.name)!;
    if (!finite(textWidth) || textWidth <= 0) return [];
    const angle = candidate.angle * Math.PI / 180;
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    const roadScale = Math.hypot(cosine * scaleX, sine * scaleY);
    // OSM ways often end at an intersection even when the named street continues.
    // Allow modest text overhang there; viewport and collision checks still keep
    // the complete name legible, without moving its geographic anchor.
    if (candidate.length * roadScale < textWidth * .75 + 8) return [];

    // Rotated AABB of a padded text box: x±(width+8)/2 and local y[-22,5].
    const width = Math.abs(cosine) * (textWidth + 8) + Math.abs(sine) * 27;
    const height = Math.abs(sine) * (textWidth + 8) + Math.abs(cosine) * 27;
    const rectangle = { x: x + sine * 8.5 - width / 2, y: y - cosine * 8.5 - height / 2, width, height };
    if (rectangle.x < 5 || rectangle.y < 5 || rectangle.x + rectangle.width > viewport.width - 5 || rectangle.y + rectangle.height > viewport.height - 5) return [];
    const priority = candidate.name === storeStreet ? 0 : (roadPriority[candidate.kind] ?? 4);
    const distance = Math.hypot((x - viewport.width / 2) / viewport.width, (y - viewport.height / 2) / viewport.height);
    return [{ candidate, rectangle, priority, distance }];
  }).sort((a, b) => a.priority - b.priority || a.distance - b.distance || b.candidate.length - a.candidate.length || a.candidate.name.localeCompare(b.candidate.name));

  const selected: StreetLabelCandidate[] = [], names = new Set<string>();
  for (const { candidate, rectangle } of eligible) {
    if (names.has(candidate.name) || occupied.some(obstacle => intersects(rectangle, obstacle))) continue;
    selected.push(candidate);
    names.add(candidate.name);
    occupied.push(rectangle);
    if (selected.length === maximum) break;
  }
  return selected;
}

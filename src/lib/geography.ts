/** Local, isotropic Web Mercator coordinates. North is up; no decorative relocation. */
export type Coordinate = readonly number[];
export type ViewBox = readonly [number, number, number, number];
const radians = Math.PI / 180;
const west = -7.71;
const north = 33.6295;
const scale = 1440 / (.12 * radians);
const mercator = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + latitude * radians / 2));
const northMercator = mercator(north);

export function projectCoordinate([longitude, latitude]: Coordinate): [number, number] {
  return [(longitude - west) * radians * scale, (northMercator - mercator(latitude)) * scale];
}

export function unprojectCoordinate([x, y]: Coordinate): [number, number] {
  return [west + x / scale / radians, (2 * Math.atan(Math.exp(northMercator - y / scale)) - Math.PI / 2) / radians];
}

export function projectedBounds([w, s, e, n]: Coordinate): ViewBox {
  const [x, y] = projectCoordinate([w, n]);
  const [right, bottom] = projectCoordinate([e, s]);
  return [x, y, right - x, bottom - y];
}

export function showroomCoordinate(latitude: unknown, longitude: unknown, bounds: Coordinate): [number, number] | null {
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const [w, s, e, n] = bounds;
  return longitude >= w && longitude <= e && latitude >= s && latitude <= n ? [longitude, latitude] : null;
}

export function geographicPath(coordinates: Coordinate[], closed = false): string {
  return coordinates.map((point, i) => `${i ? 'L' : 'M'}${projectCoordinate(point).map(value => Number(value.toFixed(2))).join(' ')}`).join('') + (closed ? 'Z' : '');
}

/** Label at the halfway point along a real road, following its local tangent. */
export function roadLabel(coordinates: Coordinate[]) {
  const points = coordinates.map(projectCoordinate);
  const lengths = points.slice(1).map((point, i) => Math.hypot(point[0] - points[i][0], point[1] - points[i][1]));
  const length = lengths.reduce((sum, value) => sum + value, 0);
  let remaining = length / 2;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining > lengths[i]) { remaining -= lengths[i]; continue; }
    const ratio = lengths[i] ? remaining / lengths[i] : 0;
    const start = points[i], end = points[i + 1];
    let angle = Math.atan2(end[1] - start[1], end[0] - start[0]) / radians;
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    return { x: start[0] + (end[0] - start[0]) * ratio, y: start[1] + (end[1] - start[1]) * ratio, angle, length };
  }
  return { x: points[0]?.[0] || 0, y: points[0]?.[1] || 0, angle: 0, length: 0 };
}

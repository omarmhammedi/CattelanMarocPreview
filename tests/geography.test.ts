import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { projectCoordinate, unprojectCoordinate, projectedBounds, showroomCoordinate, roadLabel } from '../src/lib/geography.ts';
const data = JSON.parse(readFileSync(new URL('../src/data/casablanca-map.json', import.meta.url), 'utf8'));
const pin = [-7.6426741, 33.5927007];

test('Web Mercator preserves true showroom location and north-up geography', () => {
  assert.deepEqual(projectCoordinate([-7.71, 33.6295]), [0, 0]);
  assert(Math.abs(projectCoordinate([-7.59, 33.6295])[0] - 1440) < 1e-8);
  for (const coordinate of [pin, [-7.72, 33.555], [-7.575, 33.635]]) {
    const restored = unprojectCoordinate(projectCoordinate(coordinate));
    coordinate.forEach((value, i) => assert(Math.abs(value - restored[i]) < 1e-10));
  }
  assert(projectCoordinate([pin[0], pin[1] + .01])[1] < projectCoordinate(pin)[1]);
  const [x, y, w, h] = projectedBounds(data.bounds);
  const [px, py] = projectCoordinate(pin);
  assert(px > x && px < x + w && py > y && py < y + h);
});

test('cleared, malformed and out-of-coverage coordinates never produce a false marker', () => {
  assert.deepEqual(showroomCoordinate(pin[1], pin[0], data.bounds), pin);
  for (const [lat, lon] of [[null, pin[0]], [pin[1], null], ['', pin[0]], [String(pin[1]), pin[0]], [NaN, pin[0]], [Infinity, pin[0]], [0, 0], [43.65, -79.38]]) {
    assert.equal(showroomCoordinate(lat, lon, data.bounds), null);
  }
});

test('OSM geometry keeps the showroom on land and the Atlantic in water', () => {
  const inside = (point: number[], ring: number[][]) => {
    let result = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x, y] = ring[i], [previousX, previousY] = ring[j];
      if ((y > point[1]) !== (previousY > point[1]) && point[0] < (previousX - x) * (point[1] - y) / (previousY - y) + x) result = !result;
    }
    return result;
  };
  assert(data.seaPolygons.every((ring: number[][]) => !inside(pin, ring)));
  assert(data.seaPolygons.some((ring: number[][]) => inside([-7.65, 33.623], ring)));
  assert.equal(data.source.license, 'ODbL-1.0');
  assert(data.coastline.length && data.roads.length > 1000);
  assert(data.roads.some((road: any) => road.name === 'Avenue du Docteur Mohamed Sijelmassi'));
  const identifiers = data.roads.flatMap((road: any) => road.osmIds);
  assert.equal(new Set(identifiers).size, identifiers.length);
});

test('street label follows the actual halfway point and readable road tangent', () => {
  const label = roadLabel([[-7.66, 33.59], [-7.64, 33.59]]);
  const midpoint = projectCoordinate([-7.65, 33.59]);
  assert(Math.abs(label.x - midpoint[0]) < 1e-8);
  assert(Math.abs(label.y - midpoint[1]) < 1e-8);
  assert.equal(label.angle, 0);
});

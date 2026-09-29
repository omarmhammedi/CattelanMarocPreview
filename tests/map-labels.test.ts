import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildStreetLabels, selectStreetLabels, type StreetLabelCandidate } from '../src/lib/map-labels.ts';
import { projectCoordinate } from '../src/lib/geography.ts';

const label = (name: string, x: number, y: number, length = 100, kind = 'residential', angle = 0): StreetLabelCandidate => ({ name, x, y, length, kind, angle });
const viewport = { width: 400, height: 400 };
const view = { x: 0, y: 0, ...viewport };
const measure = (name: string) => name.length * 7;

test('nearby short street labels become readable at actual screen scale, independently of device zoom state', () => {
  const candidates = [label('Rue locale', 200, 200, 30)];
  assert.equal(selectStreetLabels(candidates, view, viewport, measure).length, 0);
  const zoomed = { x: 150, y: 150, width: 100, height: 100 };
  assert.deepEqual(selectStreetLabels(candidates, zoomed, viewport, measure), candidates);
  // Same pixels-per-map-unit and visible road on a different viewport size.
  assert.deepEqual(selectStreetLabels(candidates, { x: 100, y: 100, width: 200, height: 200 }, { width: 800, height: 800 }, measure), candidates);
});

test('the showroom street wins a collision, and names remain unique across multiple segments', () => {
  const store = label('Avenue du Docteur Mohamed Sijelmassi', 200, 200, 350, 'secondary');
  const candidates = [label('Rue voisine', 210, 200), store, { ...store, y: 300 }, label('Rue visible', 200, 100)];
  const selected = selectStreetLabels(candidates, view, viewport, measure);
  assert(selected.includes(store));
  assert(!selected.some(item => item.name === 'Rue voisine'));
  assert.equal(selected.filter(item => item.name === store.name).length, 1);
  assert(selected.some(item => item.name === 'Rue visible'));
});

test('offscreen segments do not suppress an alternative visible segment of the same street', () => {
  const outside = label('Rue traversante', 1200, 200, 800, 'primary');
  const inside = label('Rue traversante', 200, 200, 150, 'primary');
  assert.deepEqual(selectStreetLabels([outside, inside], view, viewport, measure), [inside]);
});

test('rotated labels avoid supplied controls, the marker and viewport edges', () => {
  const candidates = [label('Rue verticale', 200, 200, 200, 'secondary', 90), label('Rue libre', 300, 300), label('Rue coupée', 3, 70)];
  const selected = selectStreetLabels(candidates, view, viewport, measure, [{ x: 190, y: 150, width: 30, height: 100 }]);
  assert.deepEqual(selected.map(item => item.name), ['Rue libre']);
});

test('label density is bounded for mobile and desktop without changing source candidates', () => {
  const candidates = Array.from({ length: 40 }, (_, index) => label(`R${index}`, 50 + index % 5 * 120, 45 + Math.floor(index / 5) * 65, 150));
  const mobile = { width: 650, height: 600 };
  const desktop = { width: 1300, height: 1200 };
  assert.equal(selectStreetLabels(candidates, { x: 0, y: 0, ...mobile }, mobile, measure).length, 15);
  assert.equal(selectStreetLabels(candidates, { x: 0, y: 0, ...mobile }, desktop, measure).length, 30);
  assert.equal(candidates.length, 40);
});

test('malformed candidates and empty layout are ignored safely', () => {
  assert.deepEqual(selectStreetLabels([label('Rue', NaN, 20)], view, viewport, measure), []);
  assert.deepEqual(selectStreetLabels([label('Rue', 200, 200)], view, { width: 0, height: 400 }, measure), []);
  assert.deepEqual(buildStreetLabels([{ name: 'Invalide', kind: 'primary', coordinates: [[0, NaN], [0, 0]] }]), []);
});

test('the actual OSM extract supplies compact candidates and local names at close scale', () => {
  const data = JSON.parse(readFileSync(new URL('../src/data/casablanca-map.json', import.meta.url), 'utf8'));
  const candidates = buildStreetLabels(data.roads);
  assert(candidates.length > 1000);
  assert(Buffer.byteLength(JSON.stringify(candidates)) < 140_000);
  assert(candidates.some(candidate => candidate.name === 'Rue Abou Al Kacem Kotbari'));
  const [x, y] = projectCoordinate([-7.6426741, 33.5927007]);
  const selected = selectStreetLabels(candidates, { x: x - 60, y: y - 60, width: 120, height: 120 }, { width: 720, height: 720 }, measure);
  assert(selected.some(candidate => candidate.kind === 'residential'));
  assert(selected.some(candidate => candidate.name === 'Avenue du Docteur Mohamed Sijelmassi'));
});

test('the store street stays named when its midpoint is hidden by the showroom marker', () => {
  const data = JSON.parse(readFileSync(new URL('../src/data/casablanca-map.json', import.meta.url), 'utf8'));
  const roads = data.roads.filter((road: { name: string }) => road.name === 'Avenue du Docteur Mohamed Sijelmassi');
  const candidates = buildStreetLabels(roads);
  const [x, y] = projectCoordinate([-7.6426741, 33.5927007]);
  const width = 1442.3076923 / 7.4505806, height = width * 1248 / 2000;
  const selected = selectStreetLabels(candidates, { x: x - width / 2, y: y - height / 2, width, height }, { width: 2000, height: 1248 }, () => 230, [
    { x: 960, y: 550, width: 275, height: 115 },
    { x: 88, y: 311, width: 430, height: 626 },
    { x: 0, y: 0, width: 2000, height: 124 },
  ]);
  assert.equal(selected.length, 1);
  // A usable alternative on the real, straight section north-west of the pin.
  assert(selected[0].x > 790 && selected[0].x < 798);
  assert(selected[0].y > 515 && selected[0].y < 523);
});

test('alternative anchors follow source geometry and retain only the road length available on both sides', () => {
  const [start, end] = [[-7.65, 33.59], [-7.63, 33.59]].map(projectCoordinate);
  const candidates = buildStreetLabels([{ name: 'Longue avenue', kind: 'primary', coordinates: [[-7.65, 33.59], [-7.63, 33.59]] }]);
  assert.equal(candidates.length, 3);
  for (const candidate of candidates) {
    assert(Math.abs(candidate.y - start[1]) < .1);
    assert(candidate.x > start[0] && candidate.x < end[0]);
    assert(Math.abs(candidate.length - 2 * Math.min(candidate.x - start[0], end[0] - candidate.x)) < .2);
  }
});

#!/usr/bin/env node
/**
 * Build the small, self-hosted Casablanca map from OpenStreetMap data (ODbL).
 * This is an occasional build-time download, never a browser/runtime API call.
 *
 * node scripts/generate-casablanca-map.mjs
 * node scripts/generate-casablanca-map.mjs --input /tmp/overpass.json
 * node scripts/generate-casablanca-map.mjs --date 2026-09-29T01:17:01Z
 *
 * The optional --date pins Overpass's historical snapshot. --input reuses an
 * already fetched Overpass JSON response without any network requests.
 * Keep the visible map attribution and the ODbL data download when reusing it.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export const BOUNDS = [-7.72, 33.555, -7.575, 33.635];
const COAST_BOUNDS = [-7.74, 33.54, -7.55, 33.67];
const ENDPOINT = 'https://overpass-api.de/api/interpreter';
const TOLERANCE_METRES = 3;
const LOCAL_ROAD_CENTRE = [-7.6426741, 33.5927007];
const LOCAL_ROAD_RADIUS_METRES = 1500;
const RADIUS = 6378137;
const radians = Math.PI / 180;
const round = value => Number(value.toFixed(7));
const pointKey = point => point.join(',');
const nameOf = tags => tags['name:fr'] || tags['name:latin'] || tags.name || '';
const mercator = ([lon, lat]) => [RADIUS * lon * radians, RADIUS * Math.log(Math.tan(Math.PI / 4 + lat * radians / 2))];
const unproject = ([x, y]) => [round(x / RADIUS / radians), round((2 * Math.atan(Math.exp(y / RADIUS)) - Math.PI / 2) / radians)];

export function queryFor(date) {
  if (date && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(date)) throw new Error('Invalid snapshot date');
  const box = ([w, s, e, n]) => `${s},${w},${n},${e}`;
  return `[out:json][timeout:40][maxsize:33554432]${date ? `[date:"${date}"]` : ''};(way["natural"="coastline"](${box(COAST_BOUNDS)});way["highway"~"^(trunk|primary|secondary|tertiary|unclassified|residential|pedestrian)$"](${box(BOUNDS)});node["place"~"^(suburb|quarter|neighbourhood)$"](${box(BOUNDS)}););out geom;`;
}

function distanceSquared(point, start, end) {
  const dx = end[0] - start[0], dy = end[1] - start[1];
  const t = dx || dy ? Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy))) : 0;
  return (point[0] - start[0] - t * dx) ** 2 + (point[1] - start[1] - t * dy) ** 2;
}

/** Douglas–Peucker measured in Web Mercator metres, retaining original vertices. */
export function simplify(coordinates, tolerance = TOLERANCE_METRES) {
  if (coordinates.length < 3) return coordinates;
  const points = coordinates.map(mercator), keep = new Set([0, points.length - 1]);
  const pending = [[0, points.length - 1]];
  while (pending.length) {
    const [first, last] = pending.pop();
    let greatest = tolerance ** 2, candidate = -1;
    for (let i = first + 1; i < last; i++) {
      const distance = distanceSquared(points[i], points[first], points[last]);
      if (distance > greatest) { greatest = distance; candidate = i; }
    }
    if (candidate > -1) { keep.add(candidate); pending.push([first, candidate], [candidate, last]); }
  }
  return [...keep].sort((a, b) => a - b).map(index => coordinates[index]);
}

function clipPolygon(points) {
  const [west, south] = mercator(BOUNDS.slice(0, 2));
  const [east, north] = mercator(BOUNDS.slice(2));
  let clipped = points.map(mercator);
  for (const [axis, value, sign] of [[0, west, 1], [0, east, -1], [1, south, 1], [1, north, -1]]) {
    const output = [];
    for (let i = 0; i < clipped.length; i++) {
      const start = clipped[(i + clipped.length - 1) % clipped.length], end = clipped[i];
      const startInside = sign * (start[axis] - value) >= 0, endInside = sign * (end[axis] - value) >= 0;
      if (startInside !== endInside) {
        const t = (value - start[axis]) / (end[axis] - start[axis]);
        output.push(start.map((coordinate, j) => coordinate + t * (end[j] - coordinate)));
      }
      if (endInside) output.push(end);
    }
    clipped = output;
  }
  const result = clipped.map(unproject);
  if (pointKey(result[0]) !== pointKey(result.at(-1))) result.push(result[0]);
  return result;
}

/** Follow OSM direction exactly: land left, sea right. Never reverse coast ways. */
export function coastlineGeometry(elements) {
  const ways = elements.filter(element => element.tags?.natural === 'coastline');
  const starts = new Map(ways.map(way => [way.nodes[0], way]));
  const ends = new Set(ways.map(way => way.nodes.at(-1)));
  const first = ways.filter(way => !ends.has(way.nodes[0]));
  if (first.length !== 1 || starts.size !== ways.length) throw new Error('Expected one continuous, unbranched coastline');
  const osmIds = [], coordinates = [];
  let way = first[0];
  while (way) {
    if (osmIds.includes(way.id)) throw new Error('Unexpected coastline loop');
    osmIds.push(way.id);
    coordinates.push(...way.geometry.slice(coordinates.length ? 1 : 0).map(({ lon, lat }) => [lon, lat]));
    way = starts.get(way.nodes.at(-1));
  }
  if (osmIds.length !== ways.length) throw new Error('Disconnected coastline; update the bounded query before drawing');
  const simplified = simplify(coordinates);
  const firstPoint = simplified[0], lastPoint = simplified.at(-1);
  // This Casablanca extract starts east of the viewport and ends west of it.
  // Closing north of every real coastal vertex puts ALL synthetic edges outside
  // the viewport. Rectangle clipping then leaves only real coast + map boundary.
  if (firstPoint[0] <= BOUNDS[2] || lastPoint[0] >= BOUNDS[0]) throw new Error('Coastline endpoints must extend beyond both longitude bounds');
  const outsideNorth = Math.max(BOUNDS[3], ...simplified.map(point => point[1])) + 0.01;
  const sea = clipPolygon([...simplified, [lastPoint[0], outsideNorth], [firstPoint[0], outsideNorth]]);
  return { coastline: [{ osmIds, coordinates: simplified }], seaPolygons: [sea] };
}

/** Merge only degree-two endpoints of the same road class and same source name. */
function mergedRoads(elements) {
  const groups = new Map();
  for (const way of elements) {
    if (!way.tags?.highway || !way.geometry || way.tags.area === 'yes') continue;
    const kind = way.tags.highway, name = nameOf(way.tags), key = JSON.stringify([kind, name]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ osmIds: [way.id], kind, name, coordinates: way.geometry.map(({ lon, lat }) => [lon, lat]) });
  }
  const result = [];
  for (const roads of groups.values()) {
    const endpoints = new Map();
    const connect = (point, index) => { const key = pointKey(point); if (!endpoints.has(key)) endpoints.set(key, []); endpoints.get(key).push(index); };
    roads.forEach((road, index) => { connect(road.coordinates[0], index); connect(road.coordinates.at(-1), index); });
    const seen = new Set();
    roads.forEach((road, index) => {
      if (seen.has(index)) return;
      seen.add(index);
      const joined = { ...road, osmIds: [...road.osmIds], coordinates: [...road.coordinates] };
      for (const side of ['start', 'end']) {
        while (true) {
          const end = side === 'start' ? joined.coordinates[0] : joined.coordinates.at(-1);
          const incident = endpoints.get(pointKey(end));
          if (incident.length !== 2) break;
          const nextIndex = incident.find(candidate => !seen.has(candidate));
          if (nextIndex === undefined) break;
          seen.add(nextIndex);
          const next = roads[nextIndex], coordinates = [...next.coordinates];
          if (side === 'start') {
            if (pointKey(coordinates.at(-1)) !== pointKey(end)) coordinates.reverse();
            joined.coordinates.unshift(...coordinates.slice(0, -1));
          } else {
            if (pointKey(coordinates[0]) !== pointKey(end)) coordinates.reverse();
            joined.coordinates.push(...coordinates.slice(1));
          }
          joined.osmIds.push(...next.osmIds);
        }
      }
      joined.osmIds.sort((a, b) => a - b);
      joined.coordinates = simplify(joined.coordinates);
      result.push(joined);
    });
  }
  return result.sort((a, b) => a.osmIds[0] - b.osmIds[0]);
}

function selectedRoads(elements) {
  const centre = mercator(LOCAL_ROAD_CENTRE);
  // Convert Mercator distances back to ground metres at the store latitude.
  const scale = Math.cos(LOCAL_ROAD_CENTRE[1] * radians);
  const radiusSquared = (LOCAL_ROAD_RADIUS_METRES / scale) ** 2;
  return mergedRoads(elements).filter(road => {
    if (['trunk', 'primary', 'secondary', 'tertiary'].includes(road.kind)) return true;
    const points = road.coordinates.map(mercator);
    return points.some((point, index) => index > 0 && distanceSquared(centre, points[index - 1], point) <= radiusSquared);
  });
}

export function buildMap(response, query, fetchedAt) {
  if (response.remark || !response.elements?.length) throw new Error(`Incomplete Overpass result: ${response.remark || 'no elements'}`);
  const geometry = coastlineGeometry(response.elements);
  return {
    schemaVersion: 1,
    source: {
      name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/', endpoint: ENDPOINT,
      attribution: '© OpenStreetMap contributors', attributionUrl: 'https://www.openstreetmap.org/copyright',
      license: 'ODbL-1.0', licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
      osmTimestamp: response.osm3s.timestamp_osm_base, fetchedAt, query,
      simplificationMetres: TOLERANCE_METRES,
      selection: { mainRoadClasses: ['trunk', 'primary', 'secondary', 'tertiary'], localRoadCentre: LOCAL_ROAD_CENTRE, localRoadRadiusMetres: LOCAL_ROAD_RADIUS_METRES },
      notes: 'Geographic coordinates are longitude/latitude (WGS84). Line simplification is bounded in Web Mercator metres. Sea polygons follow the source coastline; their closing edges lie on the data bounds. Road segments are joined only at degree-two endpoints of the same class and name. No third-party tiles or Google map geometry are used.',
    },
    bounds: BOUNDS,
    ...geometry,
    roads: selectedRoads(response.elements),
    places: response.elements.filter(element => element.type === 'node' && element.tags?.place).map(element => ({
      osmId: element.id, kind: element.tags.place, name: nameOf(element.tags), coordinates: [element.lon, element.lat],
    })),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const value = flag => { const index = args.indexOf(flag); if (index < 0) return undefined; if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing value for ${flag}`); return args[index + 1]; };
  for (let i = 0; i < args.length; i += 2) if (!['--input', '--date', '--output'].includes(args[i])) throw new Error(`Unknown argument: ${args[i]}`);
  const input = value('--input'), date = value('--date'), output = value('--output') || fileURLToPath(new URL('../src/data/casablanca-map.json', import.meta.url));
  const query = queryFor(date);
  let response;
  if (input) response = JSON.parse(await readFile(input, 'utf8'));
  else {
    const download = await fetch(ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'CattelanMarocPreview map build (+https://github.com/omarmhammedi/CattelanMarocPreview)' },
      body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(55000),
    });
    if (!download.ok) throw new Error(`Overpass returned HTTP ${download.status}; retry manually later, never in a loop`);
    response = await download.json();
  }
  const data = buildMap(response, query, new Date().toISOString());
  await mkdir(dirname(output), { recursive: true });
  // One feature per line keeps the checked-in geographic source inspectable.
  const json = JSON.stringify(data).replace(/\},\{/g, '},\n{') + '\n';
  await writeFile(output, json);
  console.log(JSON.stringify({ output, bytes: Buffer.byteLength(json), roadPaths: data.roads.length, sourceRoadWays: data.roads.reduce((n, road) => n + road.osmIds.length, 0), coastlineWays: data.coastline.flatMap(coast => coast.osmIds).length, places: data.places.length, osmTimestamp: data.source.osmTimestamp }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

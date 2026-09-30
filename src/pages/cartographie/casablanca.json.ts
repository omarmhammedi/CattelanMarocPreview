import type { APIRoute } from 'astro';
import data from '../../data/casablanca-map.json';

/** Public source data for the rendered OSM-derived map, redistributed under ODbL. */
export const GET: APIRoute = () => new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': 'attachment; filename="casablanca.json"',
    'X-Robots-Tag': 'noindex',
    'Cache-Control': 'public, max-age=3600',
  },
});

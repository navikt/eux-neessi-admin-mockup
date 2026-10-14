import "server-only";

import { geoAzimuthalEqualArea, geoPath } from "d3-geo";
import type { Feature, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-50m.json";
import { COUNTRY_BY_NUMERIC } from "@/lib/mock/reference";

export interface MapShape {
  id: string;
  /** Alpha-2 code when the country is an EESSI partner, "NO" for Norway, otherwise null */
  code: string | null;
  d: string;
}

export interface EuropeMapData {
  width: number;
  height: number;
  shapes: MapShape[];
  /** Projected capital positions keyed by alpha-2 code */
  points: Record<string, [number, number]>;
}

const CAPITALS: Record<string, [number, number]> = {
  NO: [10.75, 59.91], SE: [18.07, 59.33], DK: [12.57, 55.68], FI: [24.94, 60.17], IS: [-21.9, 64.15],
  DE: [13.4, 52.52], PL: [21.01, 52.23], LT: [25.28, 54.69], LV: [24.1, 56.95], EE: [24.75, 59.44],
  GB: [-0.13, 51.51], IE: [-6.26, 53.35], NL: [4.9, 52.37], BE: [4.35, 50.85], LU: [6.13, 49.61],
  FR: [2.35, 48.86], ES: [-3.7, 40.42], PT: [-9.14, 38.72], IT: [12.5, 41.9], MT: [14.51, 35.9],
  CH: [7.45, 46.95], LI: [9.52, 47.14], AT: [16.37, 48.21], CZ: [14.42, 50.08], SK: [17.11, 48.15],
  HU: [19.04, 47.5], SI: [14.51, 46.06], HR: [15.98, 45.81], RO: [26.1, 44.43], BG: [23.32, 42.7],
  GR: [23.73, 37.98], CY: [33.38, 35.17],
};

const WIDTH = 800;
const HEIGHT = 660;

let cached: EuropeMapData | null = null;

export function getEuropeMap(): EuropeMapData {
  if (cached) return cached;
  const topo = world as unknown as Topology<{ countries: GeometryCollection }>;
  const collection = feature(topo, topo.objects.countries) as unknown as { features: Feature<Geometry, { name: string }>[] };

  const projection = geoAzimuthalEqualArea()
    .rotate([-12, -53])
    .fitExtent(
      [
        [10, 10],
        [WIDTH - 10, HEIGHT - 10],
      ],
      { type: "MultiPoint", coordinates: [[-22, 36], [36, 36], [-14, 70.5], [32, 70.5], [-24, 64]] },
    )
    .clipExtent([
      [0, 0],
      [WIDTH, HEIGHT],
    ]);
  const path = geoPath(projection).digits(1);

  const shapes: MapShape[] = [];
  for (const [i, f] of collection.features.entries()) {
    // A few disputed territories in world-atlas have no numeric id.
    const id = f.id != null && f.id !== "" ? String(f.id) : `x${i}`;
    const d = path(f);
    if (!d || d.length < 10) continue;
    const partner = COUNTRY_BY_NUMERIC[id];
    shapes.push({ id, code: partner ? partner.code : id === "578" ? "NO" : null, d });
  }

  const points: Record<string, [number, number]> = {};
  for (const [code, lonLat] of Object.entries(CAPITALS)) {
    const p = projection(lonLat);
    if (p) points[code] = [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
  }

  cached = { width: WIDTH, height: HEIGHT, shapes, points };
  return cached;
}

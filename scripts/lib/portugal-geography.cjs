/**
 * Shared Portugal geography helpers for CAOP2025 freguesias and geoBoundaries ADM1/ADM2.
 * Used by generate-portugal-* scripts and audit-portugal-adm3.mjs.
 */
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '..', '.cache');
const ADM1_CACHE = path.join(CACHE_DIR, 'pt-adm1.json');
const ADM2_CACHE = path.join(CACHE_DIR, 'pt-adm2.json');
const ADM3_CACHE = path.join(CACHE_DIR, 'pt-adm3.json');
const ADM2_NAME_FIXES = require('./portugal-adm2-name-fixes.cjs');
const { CAOP_FREGUESIAS_ITEMS, caopDistrictToState, ensureCaopFreguesiasCache } = require('./portugal-caop.cjs');

/** Districts already seeded via dedicated Lisbon/Porto migrations — skip in other-districts generator. */
const SKIP_DISTRICTS = new Set(['Lisbon', 'Porto']);
const SKIP_STATE_CODES = new Set(['11', '13']);

const ISO_TO_STATE = {
  'PT-01': 'Aveiro',
  'PT-02': 'Beja',
  'PT-03': 'Braga',
  'PT-04': 'Bragança',
  'PT-05': 'Castelo Branco',
  'PT-06': 'Coimbra',
  'PT-07': 'Évora',
  'PT-08': 'Faro',
  'PT-09': 'Guarda',
  'PT-10': 'Leiria',
  'PT-11': 'Lisbon',
  'PT-12': 'Portalegre',
  'PT-13': 'Porto',
  'PT-14': 'Santarém',
  'PT-15': 'Setúbal',
  'PT-16': 'Viana do Castelo',
  'PT-17': 'Vila Real',
  'PT-18': 'Viseu',
  'PT-20': 'Azores',
  'PT-30': 'Madeira',
};

function ringCentroid(ring) {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const [x, y] of ring) {
    sx += x;
    sy += y;
    n += 1;
  }
  return [sx / n, sy / n];
}

function geomCentroid(geom) {
  if (geom.type === 'Polygon') return ringCentroid(geom.coordinates[0]);
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const poly of geom.coordinates) {
    for (const [x, y] of poly[0]) {
      sx += x;
      sy += y;
      n += 1;
    }
  }
  return [sx / n, sy / n];
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInGeom(pt, geom) {
  if (geom.type === 'Polygon') return pointInRing(pt, geom.coordinates[0]);
  return geom.coordinates.some((poly) => pointInRing(pt, poly[0]));
}

function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1];
  }
  return Math.abs(a) / 2;
}

function geomArea(geom) {
  if (geom.type === 'Polygon') return ringArea(geom.coordinates[0]);
  return geom.coordinates.reduce((sum, poly) => sum + ringArea(poly[0]), 0);
}

function dist2(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

function haversineKm(lng1, lat1, lng2, lat2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function asciiFold(s) {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}


function outerRings(geom) {
  if (geom.type === 'Polygon') return [geom.coordinates[0]];
  return geom.coordinates.map((poly) => poly[0]);
}

function assignDistrict(geom, districts) {
  const centroid = geomCentroid(geom);
  for (const d of districts) {
    if (pointInGeom(centroid, d.geom)) return d.name;
  }
  const scores = districts.map((d) => {
    let count = 0;
    for (const ring of outerRings(geom)) {
      for (const pt of ring) {
        if (pointInGeom(pt, d.geom)) count += 1;
      }
    }
    return { name: d.name, count };
  });
  scores.sort((a, b) => b.count - a.count);
  if (scores[0].count > 0) return scores[0].name;
  return null;
}

function geoDistrict(lng, lat, districts) {
  const pt = [lng, lat];
  for (const d of districts) {
    if (pointInGeom(pt, d.geom)) return d.name;
  }
  return null;
}

function loadDistricts(adm1 = readJson(ADM1_CACHE)) {
  return adm1.features.map((f) => ({
    name: ISO_TO_STATE[f.properties.shapeISO],
    geom: f.geometry,
  }));
}

/** ADM1 districts with iso, centroid — for geoBoundaries seed generators. */
function loadAdm1Districts(adm1 = readJson(ADM1_CACHE)) {
  return adm1.features.map((f) => ({
    iso: f.properties.shapeISO,
    name: ISO_TO_STATE[f.properties.shapeISO],
    geom: f.geometry,
    centroid: geomCentroid(f.geometry),
  }));
}

function assignDistrictOrThrow(geom, districts) {
  const name = assignDistrict(geom, districts);
  if (!name) {
    const centroid = geomCentroid(geom);
    throw new Error(`Could not assign district for geometry centroid ${centroid}`);
  }
  return name;
}

function formatAdm2CityName(shapeName) {
  const titled = titleCaseName(shapeName);
  return ADM2_NAME_FIXES[titled] || ADM2_NAME_FIXES[shapeName] || titled;
}

function geomToSql(geom) {
  const json = JSON.stringify(geom).replace(/'/g, "''");
  return `ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON('${json}'::text), 4326)))`;
}

function geomJsonLiteral(geom) {
  return JSON.stringify(geom).replace(/'/g, "''");
}

/**
 * Load geoBoundaries ADM2 concelhos with district assignment.
 * @param {{ skipLisbonPorto?: boolean }} [opts]
 */
function loadAdm2Concelhos({ skipLisbonPorto = false } = {}) {
  const districts = loadAdm1Districts();
  const adm2 = readJson(ADM2_CACHE);
  const concelhos = [];
  const seen = new Set();
  for (const f of adm2.features) {
    const district = assignDistrictOrThrow(f.geometry, districts);
    if (skipLisbonPorto && SKIP_DISTRICTS.has(district)) continue;
    const name = formatAdm2CityName(f.properties.shapeName);
    const key = `${district}|${name}`;
    if (seen.has(key)) {
      console.warn('duplicate', key);
      continue;
    }
    seen.add(key);
    const [lng, lat] = geomCentroid(f.geometry);
    concelhos.push({ district, name, lat, lng, geom: f.geometry });
  }
  return { districts, concelhos };
}

function loadFreguesias(adm3, districts) {
  return adm3.features.map((f) => {
    const geom = f.geometry;
    const props = f.properties ?? {};
    const name = props.name ?? props.shapeName;
    const district =
      props.district ??
      (props.distrito_ilha ? caopDistrictToState(props.distrito_ilha) : assignDistrict(geom, districts));
    return {
      name,
      geom,
      area: geomArea(geom),
      district,
      dtmnfr: props.dtmnfr ?? null,
      municipio: props.municipio ?? null,
    };
  });
}

/** CAOP municipio label → concelho row name in public.cities (geoBoundaries spelling). */
function resolveMunicipioName(freguesia, concelhos) {
  const byFold = new Map();
  for (const c of concelhos) {
    byFold.set(`${c.district}|${asciiFold(c.name)}`, c.name);
  }
  if (freguesia.municipio) {
    const fromLabel = byFold.get(`${freguesia.district}|${asciiFold(freguesia.municipio)}`);
    if (fromLabel) return fromLabel;
  }
  const pt = geomCentroid(freguesia.geom);
  const containing = concelhos.filter(
    (c) => c.district === freguesia.district && pointInGeom(pt, c.geom)
  );
  if (!containing.length) return null;
  containing.sort((a, b) => geomArea(a.geom) - geomArea(b.geom));
  return containing[0].name;
}

/** All CAOP2025 freguesias with centroid and parent municipality name. */
function loadAllCaopLocalities(adm3 = readJson(ADM3_CACHE)) {
  const districts = loadDistricts();
  const freguesias = loadFreguesias(adm3, districts);
  const { concelhos } = loadAdm2Concelhos();
  return freguesias.map((f) => {
    const [lng, lat] = geomCentroid(f.geom);
    return {
      ...f,
      lat,
      lng,
      municipalityName: resolveMunicipioName(f, concelhos),
    };
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/** Download CAOP2025 freguesias into scripts/.cache/pt-adm3.json when missing or stale. */
async function ensureAdm3Cache() {
  let needsCaop = !fs.existsSync(ADM3_CACHE);
  if (!needsCaop) {
    try {
      needsCaop = readJson(ADM3_CACHE).meta?.source !== 'CAOP2025';
    } catch {
      needsCaop = true;
    }
  }
  if (needsCaop) await ensureCaopFreguesiasCache(ADM3_CACHE);
  await mergeIslandFreguesiasFromGeoBoundaries();
}

const GEOBOUNDARIES_ADM3_API = 'https://www.geoboundaries.org/api/current/gbOpen/PRT/ADM3/';
const ISLAND_DISTRICTS = new Set(['Azores', 'Madeira']);

/** CAOP OGC API is continental only; append Azores/Madeira from geoBoundaries ADM3. */
async function mergeIslandFreguesiasFromGeoBoundaries() {
  const fc = readJson(ADM3_CACHE);
  if (fc.features.some((f) => ISLAND_DISTRICTS.has(f.properties?.district))) return;

  if (!fs.existsSync(ADM1_CACHE)) {
    console.warn('Skipping island ADM3 merge: missing pt-adm1.json (needed for district assignment)');
    return;
  }

  const metaRes = await fetch(GEOBOUNDARIES_ADM3_API);
  if (!metaRes.ok) throw new Error(`geoBoundaries ADM3 meta failed: ${metaRes.status}`);
  const meta = await metaRes.json();
  const gjRes = await fetch(meta.gjDownloadURL);
  if (!gjRes.ok) throw new Error(`geoBoundaries ADM3 GeoJSON failed: ${gjRes.status}`);
  const gb = await gjRes.json();
  const districts = loadDistricts();

  const islandFeatures = gb.features
    .map((f) => {
      const district = assignDistrict(f.geometry, districts);
      if (!ISLAND_DISTRICTS.has(district)) return null;
      return {
        type: 'Feature',
        properties: {
          name: f.properties.shapeName,
          district,
          source: 'geoBoundaries',
        },
        geometry: f.geometry,
      };
    })
    .filter(Boolean);

  fc.features.push(...islandFeatures);
  fc.meta.islands = 'geoBoundaries gbOpen PRT/ADM3';
  fs.writeFileSync(ADM3_CACHE, JSON.stringify(fc));
  process.stderr.write(`Merged ${islandFeatures.length} Azores/Madeira freguesias from geoBoundaries\n`);
}

function escSql(s) {
  return s.replace(/'/g, "''");
}

function titleCaseName(raw) {
  const LOWER_WORDS = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
  const words = raw.trim().split(/\s+/);
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && LOWER_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

module.exports = {
  ADM1_CACHE,
  ADM2_CACHE,
  ADM3_CACHE,
  CAOP_FREGUESIAS_ITEMS,
  CACHE_DIR,
  ISO_TO_STATE,
  SKIP_DISTRICTS,
  SKIP_STATE_CODES,
  assignDistrict,
  assignDistrictOrThrow,
  dist2,
  ensureAdm3Cache,
  escSql,
  formatAdm2CityName,
  geomArea,
  geomCentroid,
  geomJsonLiteral,
  geomToSql,
  geoDistrict,
  haversineKm,
  loadAdm1Districts,
  loadAdm2Concelhos,
  loadAllCaopLocalities,
  loadDistricts,
  loadFreguesias,
  resolveMunicipioName,
  pointInGeom,
  readJson,
  titleCaseName,
};

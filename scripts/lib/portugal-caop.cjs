/**
 * CAOP2025 (Carta Administrativa Oficial de Portugal) fetch helpers.
 * OGC API: https://ogcapi.dgterritorio.gov.pt/ — CC-BY 4.0, attribute DGT.
 */
const fs = require('fs');
const path = require('path');

const CAOP_OGC_BASE = 'https://ogcapi.dgterritorio.gov.pt';
const CAOP_FREGUESIAS_ITEMS = `${CAOP_OGC_BASE}/collections/freguesias/items`;
const CAOP_SOURCE = 'CAOP2025';
const CAOP_PAGE_LIMIT = 500;

/** CAOP distrito_ilha → public.states.name */
const CAOP_DISTRICT_TO_STATE = {
  Lisboa: 'Lisbon',
};

function caopDistrictToState(distritoIlha) {
  return CAOP_DISTRICT_TO_STATE[distritoIlha] ?? distritoIlha;
}

/** @deprecated Use caopDistrictToState */
const caopDistrictToCsc = caopDistrictToState;

async function fetchCaopJson(url, { retries = 5 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`CAOP request failed (${res.status}): ${url}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const waitMs = attempt * 2000;
        process.stderr.write(`  CAOP retry ${attempt}/${retries} in ${waitMs}ms...\n`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }
  throw lastErr;
}

/** Paginate an OGC Features collection into a flat feature array. */
async function fetchAllCaopFeatures(itemsUrl, { onProgress } = {}) {
  const features = [];
  let url = `${itemsUrl}?f=json&limit=${CAOP_PAGE_LIMIT}`;

  while (url) {
    const page = await fetchCaopJson(url);
    if (!Array.isArray(page.features)) {
      throw new Error(`CAOP response missing features: ${url}`);
    }
    features.push(...page.features);
    if (onProgress) onProgress(features.length);
    url = page.links?.find((link) => link.rel === 'next')?.href ?? null;
  }

  return features;
}

function normalizeCaopFreguesiaFeature(feature) {
  const props = feature.properties ?? {};
  return {
    type: 'Feature',
    id: feature.id,
    properties: {
      name: props.freguesia,
      district: caopDistrictToCsc(props.distrito_ilha),
      dtmnfr: props.dtmnfr,
      municipio: props.municipio,
    },
    geometry: feature.geometry,
  };
}

/**
 * Download CAOP2025 freguesias into cachePath when missing or stale (non-CAOP source).
 * @param {string} cachePath
 */
async function ensureCaopFreguesiasCache(cachePath) {
  if (fs.existsSync(cachePath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      if (existing?.meta?.source === CAOP_SOURCE) return;
    } catch {
      /* re-fetch below */
    }
  }

  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  process.stderr.write('Downloading CAOP2025 freguesias from DGT OGC API...\n');

  const raw = await fetchAllCaopFeatures(CAOP_FREGUESIAS_ITEMS, {
    onProgress: (count) => process.stderr.write(`  ${count} freguesias...\n`),
  });

  const fc = {
    type: 'FeatureCollection',
    meta: {
      source: CAOP_SOURCE,
      fetchedAt: new Date().toISOString(),
      attribution: 'https://www.dgterritorio.gov.pt/',
    },
    features: raw.map(normalizeCaopFreguesiaFeature),
  };

  fs.writeFileSync(cachePath, JSON.stringify(fc));
  process.stderr.write(`Wrote ${fc.features.length} freguesias to ${cachePath}\n`);
}

module.exports = {
  CAOP_DISTRICT_TO_STATE,
  CAOP_FREGUESIAS_ITEMS,
  CAOP_OGC_BASE,
  CAOP_SOURCE,
  caopDistrictToState,
  caopDistrictToCsc,
  ensureCaopFreguesiasCache,
  fetchAllCaopFeatures,
  normalizeCaopFreguesiaFeature,
};

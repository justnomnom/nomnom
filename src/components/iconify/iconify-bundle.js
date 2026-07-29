'use client';

import { addCollection } from '@iconify/react';

import iconData from './iconify-bundle-data.json';

// Pre-registers only the eva and solar icons actually used in this codebase so
// @iconify/react never fetches from api.iconify.design at runtime.
// ~21KB gzipped vs ~1MB for the full collections.
// Regenerate iconify-bundle-data.json when new icons are added:
//   node -e "require('./scripts/build-iconify-bundle')"
addCollection(iconData.eva);
addCollection(iconData.solar);

const BASE = '/assets/icons';

/** Static SVG assets under `public/assets/icons` — single place to adjust paths/layout. */
export const svgIcon = {
  navbar: (basename) => `${BASE}/navbar/${basename}.svg`,
  /** Full filename under `setting/`, e.g. `ic_full_screen`. */
  settingFile: (filename) => `${BASE}/setting/${filename}.svg`,
  setting: (name) => `${BASE}/setting/ic_${name}.svg`,
  files: (basename) => `${BASE}/files/${basename}.svg`,
  emptyContent: `/assets/content-placeholder.svg`,
  platforms: {
    js: `${BASE}/platforms/ic_js.svg`,
    ts: `${BASE}/platforms/ic_ts.svg`,
    figma: `${BASE}/platforms/ic_figma.svg`,
  },
  app: (filename) => `${BASE}/app/${filename}.svg`,
};

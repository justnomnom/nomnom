/**
 * Persists UI light/dark for SSR + first paint. Synced from `ThemeProvider` on change;
 * bootstrap script reads this cookie or falls back to longest `settings-*` localStorage key.
 */
export const THEME_COOKIE_NAME = 'jn_theme';

export function parseThemeCookie(value) {
  return value === 'dark' ? 'dark' : 'light';
}

/** Minified IIFE: sets `document.documentElement` dataset + color-scheme before paint. */
export const themeDatasetBootstrapScript = `!function(){try{var d=document.documentElement;var m=document.cookie.match(/(?:^|; )${THEME_COOKIE_NAME}=(dark|light)(?:;|$)/);if(m){d.dataset.theme=m[1];d.style.colorScheme=m[1];return;}var best=null,bestLen=-1;for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(!k||k.indexOf("settings-")!==0)continue;var raw=localStorage.getItem(k);if(!raw)continue;var o=JSON.parse(raw);if(!o||!o.themeMode)continue;if(k.length>bestLen){bestLen=k.length;best=o.themeMode;}}if(best==="dark"||best==="light"){d.dataset.theme=best;d.style.colorScheme=best;}}catch(e){}}();`;

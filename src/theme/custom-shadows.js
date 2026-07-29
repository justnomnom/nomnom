import { alpha } from '@mui/material/styles';

import { grey, info, error, common, primary, success, warning, secondary } from './palette';

// ----------------------------------------------------------------------

export function customShadows(mode) {
  const slate = mode === 'light' ? grey[900] : common.black;
  const s = (opacity) => alpha(slate, opacity);
  const p = (opacity) => alpha(primary.main, opacity);

  return {
    z1: `0 1px 2px 0 ${s(mode === 'light' ? 0.05 : 0.16)}`,
    z4: `0 4px 6px -1px ${s(0.07)}, 0 2px 4px -2px ${s(0.05)}`,
    z8: `0 10px 15px -3px ${s(0.08)}, 0 4px 6px -4px ${s(0.05)}`,
    z12: `0 12px 20px -6px ${s(0.1)}, 0 6px 8px -6px ${s(0.06)}`,
    z16: `0 16px 28px -8px ${s(0.12)}, 0 8px 12px -6px ${s(0.06)}`,
    z20: `0 20px 36px -10px ${s(0.14)}, 0 10px 16px -8px ${s(0.07)}`,
    z24: `0 25px 50px -12px ${s(mode === 'light' ? 0.18 : 0.35)}`,
    card: `0 0 0 1px ${alpha(grey[300], 0.95)}, 0 1px 2px 0 ${s(0.045)}`,
    dropdown: `0 0 0 1px ${alpha(grey[300], 0.85)}, 0 20px 25px -5px ${s(0.08)}, 0 8px 10px -6px ${s(0.05)}`,
    dialog: `0 25px 50px -12px ${s(mode === 'light' ? 0.22 : 0.4)}`,
    primary: `0 10px 15px -3px ${p(0.18)}, 0 4px 6px -4px ${p(0.12)}`,
    primaryHover: `0 20px 25px -5px ${p(0.25)}, 0 8px 10px -6px ${p(0.18)}`,
    // Selected/active filter chips and pill toggles — terracotta glow.
    chipGlow: `0 4px 14px -4px ${p(0.45)}`,
    secondary: `0 10px 15px -3px ${alpha(secondary.darker, 0.14)}, 0 4px 6px -4px ${s(0.06)}`,
    info: `0 10px 15px -3px ${alpha(info.main, 0.2)}, 0 4px 6px -4px ${alpha(info.main, 0.12)}`,
    success: `0 10px 15px -3px ${alpha(success.main, 0.2)}, 0 4px 6px -4px ${alpha(success.main, 0.12)}`,
    warning: `0 10px 15px -3px ${alpha(warning.main, 0.22)}, 0 4px 6px -4px ${alpha(warning.main, 0.12)}`,
    error: `0 10px 15px -3px ${alpha(error.main, 0.2)}, 0 4px 6px -4px ${alpha(error.main, 0.12)}`,
  };
}

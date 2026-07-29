import { alpha } from '@mui/material/styles';

import { grey, common } from './palette';

// ----------------------------------------------------------------------

export function shadows(mode) {
  const base = mode === 'light' ? grey[900] : common.black;

  const t1 = alpha(base, mode === 'light' ? 0.07 : 0.2);
  const t2 = alpha(base, mode === 'light' ? 0.05 : 0.14);

  return [
    'none',
    `0px 1px 2px 0px ${alpha(base, mode === 'light' ? 0.05 : 0.2)}`,
    `0px 2px 4px -1px ${t1},0px 1px 2px 0px ${t2}`,
    `0px 4px 6px -1px ${t1},0px 2px 4px -2px ${t2}`,
    `0px 6px 8px -2px ${t1},0px 2px 6px -2px ${t2}`,
    `0px 8px 10px -3px ${t1},0px 3px 8px -3px ${t2}`,
    `0px 10px 12px -3px ${t1},0px 4px 10px -4px ${t2}`,
    `0px 12px 14px -4px ${t1},0px 4px 12px -4px ${t2}`,
    `0px 14px 16px -4px ${t1},0px 5px 14px -4px ${t2}`,
    `0px 16px 18px -5px ${t1},0px 6px 16px -5px ${t2}`,
    `0px 18px 20px -5px ${t1},0px 7px 18px -5px ${t2}`,
    `0px 20px 22px -6px ${t1},0px 8px 20px -6px ${t2}`,
    `0px 22px 24px -6px ${t1},0px 9px 22px -6px ${t2}`,
    `0px 24px 26px -7px ${t1},0px 10px 24px -7px ${t2}`,
    `0px 26px 28px -7px ${t1},0px 11px 26px -7px ${t2}`,
    `0px 28px 30px -8px ${t1},0px 12px 28px -8px ${t2}`,
    `0px 30px 32px -8px ${t1},0px 13px 30px -8px ${t2}`,
    `0px 32px 34px -9px ${t1},0px 14px 32px -9px ${t2}`,
    `0px 34px 36px -9px ${t1},0px 15px 34px -9px ${t2}`,
    `0px 36px 38px -10px ${t1},0px 16px 36px -10px ${t2}`,
    `0px 38px 40px -10px ${t1},0px 17px 38px -10px ${t2}`,
    `0px 40px 42px -11px ${t1},0px 18px 40px -11px ${t2}`,
    `0px 42px 44px -11px ${t1},0px 19px 42px -11px ${t2}`,
    `0px 44px 46px -12px ${t1},0px 20px 44px -12px ${t2}`,
    `0px 46px 48px -12px ${t1},0px 21px 46px -12px ${t2}`,
  ];
}

'use client';

// date fns
import { pt as ptAdapter, enUS as enUSAdapter } from 'date-fns/locale';

// core (MUI)
import { ptPT as ptPTCore, enUS as enUSCore } from '@mui/material/locale';

import { ic } from 'src/assets/icons';

// PLEASE REMOVE `LOCAL STORAGE` WHEN YOU CHANGE SETTINGS.
// ----------------------------------------------------------------------

export const allLangs = [
  {
    label: 'English',
    value: 'en',
    systemValue: enUSCore,
    adapterLocale: enUSAdapter,
    icon: ic.flagGbNir,
    numberFormat: {
      code: 'en-US',
      currency: 'USD',
    },
  },
  {
    label: 'Portuguese',
    value: 'pt',
    systemValue: ptPTCore,
    adapterLocale: ptAdapter,
    icon: ic.flagPt,
    numberFormat: {
      code: 'pt-PT',
      currency: 'EUR',
    },
  },
];

export const defaultLang = allLangs[0]; // English

// GET MORE COUNTRY FLAGS
// https://icon-sets.iconify.design/flagpack/
// https://www.dropbox.com/sh/nec1vwswr9lqbh9/AAB9ufC8iccxvtWi3rzZvndLa?dl=0

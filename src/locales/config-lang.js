'use client';

import merge from 'lodash/merge';
// date fns
import { pt as ptAdapter, enUS as enUSAdapter } from 'date-fns/locale';

// core (MUI)
import { ptPT as ptPTCore, enUS as enUSCore } from '@mui/material/locale';
// data grid (MUI) - Note: Locales are now handled differently in v8+
// The DataGrid component handles localization internally based on the MUI core locale
// import { enUS as enUSDataGrid, ptBR as ptBRDataGrid } from '@mui/x-data-grid';
// date pickers (MUI)
import { ptBR as ptBRDate, enUS as enUSDate } from '@mui/x-date-pickers/locales';

import { ic } from 'src/assets/icons';

// PLEASE REMOVE `LOCAL STORAGE` WHEN YOU CHANGE SETTINGS.
// ----------------------------------------------------------------------

export const allLangs = [
  {
    label: 'English',
    value: 'en',
    systemValue: merge(enUSDate, enUSCore),
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
    systemValue: merge(ptBRDate, ptPTCore),
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

import { alpha } from '@mui/material/styles';
import { dividerClasses } from '@mui/material/Divider';
import { checkboxClasses } from '@mui/material/Checkbox';
import { menuItemClasses } from '@mui/material/MenuItem';
import { autocompleteClasses } from '@mui/material/Autocomplete';

import { RADIUS } from './spacing';
import { hoverable } from './overrides/hoverable';
import { readableAccent } from './readable-accent';

// ----------------------------------------------------------------------

export const paper = ({ theme, bgcolor, dropdown }) => {
  if (dropdown) {
    return {
      backgroundColor: bgcolor || theme.palette.background.paper,
      backgroundImage: 'none',
      border: `1px solid ${alpha(theme.palette.grey[300], 0.9)}`,
      padding: theme.spacing(0.5),
      boxShadow: theme.customShadows.dropdown,
      borderRadius: RADIUS.loose,
    };
  }

  return {
    backgroundColor: bgcolor || theme.palette.background.paper,
    backgroundImage: 'none',
  };
};

// ----------------------------------------------------------------------

export const menuItem = (theme) => ({
  ...theme.typography.body2,
  padding: theme.spacing(0.75, 1),
  borderRadius: RADIUS.loose,
  '&:not(:last-of-type)': {
    marginBottom: 4,
  },
  [`&.${menuItemClasses.selected}`]: {
    fontWeight: theme.typography.fontWeightSemiBold,
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    color: readableAccent(theme),
    ...hoverable({
      backgroundColor: alpha(theme.palette.primary.main, 0.16),
    }),
  },
  [`& .${checkboxClasses.root}`]: {
    padding: theme.spacing(0.5),
    marginLeft: theme.spacing(-0.5),
    marginRight: theme.spacing(0.5),
  },
  [`&.${autocompleteClasses.option}[aria-selected='true']`]: {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    color: readableAccent(theme),
    ...hoverable({
      backgroundColor: alpha(theme.palette.primary.main, 0.16),
    }),
  },
  [`&+.${dividerClasses.root}`]: {
    margin: theme.spacing(0.5, 0),
  },
});

// ----------------------------------------------------------------------

export function bgBlur(props) {
  const color = props?.color || '#121110';
  const blur = props?.blur || 6;
  const opacity = props?.opacity || 0.8;
  const imgUrl = props?.imgUrl;

  if (imgUrl) {
    return {
      position: 'relative',
      backgroundImage: `url(${imgUrl})`,
      '&:before': {
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 9,
        content: '""',
        width: '100%',
        height: '100%',
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        backgroundColor: alpha(color, opacity),
      },
    };
  }

  return {
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    backgroundColor: alpha(color, opacity),
  };
}

// ----------------------------------------------------------------------

export function bgGradient(props) {
  const direction = props?.direction || 'to bottom';
  const startColor = props?.startColor;
  const endColor = props?.endColor;
  const imgUrl = props?.imgUrl;
  const color = props?.color;

  if (imgUrl) {
    return {
      background: `linear-gradient(${direction}, ${startColor || color}, ${
        endColor || color
      }), url(${imgUrl})`,
      backgroundSize: 'cover, cover',
      backgroundRepeat: 'no-repeat, no-repeat',
      backgroundPosition: 'center center, center center',
    };
  }

  return {
    background: `linear-gradient(${direction}, ${startColor}, ${endColor})`,
  };
}

// ----------------------------------------------------------------------

export const hideScroll = {
  x: {
    msOverflowStyle: 'none',
    scrollbarWidth: 'none',
    overflowX: 'scroll',
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  },
  y: {
    msOverflowStyle: 'none',
    scrollbarWidth: 'none',
    overflowY: 'scroll',
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  },
};

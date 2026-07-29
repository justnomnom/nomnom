import { accordionClasses } from '@mui/material/Accordion';
import { typographyClasses } from '@mui/material/Typography';
import { accordionSummaryClasses } from '@mui/material/AccordionSummary';

// ----------------------------------------------------------------------

export function accordion(theme) {
  return {
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          [`&.${accordionClasses.expanded}`]: {
            boxShadow: theme.customShadows.z8,
            borderRadius: theme.shape.borderRadius,
            backgroundColor: theme.palette.background.paper,
          },
          [`&.${accordionClasses.disabled}`]: {
            backgroundColor: 'transparent',
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          paddingLeft: theme.spacing(2),
          paddingRight: theme.spacing(1),
          WebkitTapHighlightColor: 'transparent',
          [`&.${accordionSummaryClasses.disabled}`]: {
            opacity: 1,
            color: theme.palette.action.disabled,
            [`& .${typographyClasses.root}`]: {
              color: 'inherit',
            },
          },
        },
        expandIconWrapper: {
          color: 'inherit',
          /** Comfortable tap target when summary focus is on the chevron side */
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 44,
          minHeight: 44,
        },
      },
    },
  };
}

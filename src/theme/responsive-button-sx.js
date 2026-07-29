// Shared responsive button layout — full-width on xs, natural width from sm up.

/** Card/form CTAs in stacks or alerts. */
export const mobileStretchButtonSx = {
  alignSelf: { xs: 'stretch', sm: 'flex-start' },
  width: { xs: '100%', sm: 'auto' },
  // Guarantee a 44px touch target on mobile; natural height from sm up.
  minHeight: { xs: 44, sm: 'auto' },
};

/** Dialog footers: stacked full-width buttons on xs. */
export const dialogActionsMobileSx = {
  px: 3,
  pb: 2,
  pt: 0,
  flexDirection: { xs: 'column', sm: 'row' },
  alignItems: { xs: 'stretch', sm: 'center' },
  justifyContent: { xs: 'stretch', sm: 'flex-end' },
  gap: 1,
  '& .MuiButton-root': {
    width: { xs: '100%', sm: 'auto' },
    m: 0,
  },
};

/** Centered error/maintenance pages with one or two primary actions. */
export const compactPageActionsStackSx = {
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  alignItems: 'stretch',
  justifyContent: 'center',
  gap: 2,
  width: '100%',
  maxWidth: 400,
  mx: 'auto',
  mt: { xs: 4, sm: 5 },
  '& .MuiButton-root': {
    width: { xs: '100%', sm: 'auto' },
    m: 0,
  },
};
